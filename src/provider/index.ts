import vscode from 'vscode';
import { AuthManager } from '../auth';
import { getDebugLoggingEnabled, getStabilizeToolListEnabled } from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import type { LlmUsage, ProviderDefinition, ProviderId } from '../types';
import { runConnectionTest } from './connection';
import { createCacheDiagnosticsRecorder, dumpProviderInput } from './debug';
import { toChatInfo } from './models';
import { BalanceCurrencyResolver } from './pricing/currency';
import { formatSessionCost, SessionCostTracker, type SessionCostSummary } from './pricing/session';
import { prepareChatRequest } from './request';
import {
	ClassificationStats,
	classifyProviderRequestDetailed,
	formatRequestLogLine,
	isUtilityRequestKind,
	type RequestCostTier,
	type RequestKind,
} from './routing';
import { resolveConversationSegment } from './segment';
import { streamChatCompletion } from './stream';
import { estimateTokenCount } from './tokens';
import { processToolFlow } from './tools/flow';
import { createVisionService } from './vision';
import type { VisionDescriber } from './vision';

/**
 * CLLMs Chat Provider — implements vscode.LanguageModelChatProvider so
 * CLLMs models appear directly in the Copilot Chat model picker.
 */
export class LlmChatProvider implements vscode.LanguageModelChatProvider {
	private readonly authManager: AuthManager;
	private readonly globalStorageUri: vscode.Uri;
	private readonly onDidChangeLanguageModelChatInformationEmitter = new vscode.EventEmitter<void>();
	private isActive = true;

	readonly onDidChangeLanguageModelChatInformation =
		this.onDidChangeLanguageModelChatInformationEmitter.event;

	private readonly cacheDiagnostics = createCacheDiagnosticsRecorder();

	/** Session-scoped classifier outcome stats for prompt-drift visibility. */
	private readonly classificationStats = new ClassificationStats();

	/** Vision proxy: internal bridge + VS Code LM fallback. */
	private readonly vision: ReturnType<typeof createVisionService>;
	private readonly balanceCurrencyResolver: BalanceCurrencyResolver;

	/** Approximate spend accrued from streamed usage during this session. */
	private readonly sessionCost = new SessionCostTracker();
	private readonly sessionCostStatusBar: vscode.StatusBarItem;

	/**
	 * Adaptive chars-per-token ratio, calibrated from actual usage data.
	 * Updated via exponential moving average each time the API reports real token counts.
	 */
	private charsPerToken = 4.0;

	constructor(context: vscode.ExtensionContext) {
		this.authManager = new AuthManager(context);
		this.globalStorageUri = context.globalStorageUri;
		this.vision = createVisionService(context);
		this.balanceCurrencyResolver = new BalanceCurrencyResolver(context, this.authManager, () =>
			this.onDidChangeLanguageModelChatInformationEmitter.fire(),
		);

		this.sessionCostStatusBar = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100,
		);
		this.sessionCostStatusBar.command = 'cllms.showSessionCost';
		this.sessionCostStatusBar.tooltip = t('sessionCost.statusBarTooltip');

		const providerSecretKeys = new Set(
			Object.values(PROVIDERS).map((provider) => provider.apiKeySecret),
		);

		context.subscriptions.push(
			this.sessionCostStatusBar,
			this.onDidChangeLanguageModelChatInformationEmitter,
			// Settings-based fallback API key + base URL changes (any provider).
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('cllms')) {
					// A settings-fallback API key may have changed; drop all cached
					// key-presence so the picker re-reads the latest state.
					this.authManager.invalidatePresence();
					this.invalidateCurrencyAndRefreshModels();
				}
			}),
			// Multi-window: SecretStorage changes don't fire onDidChangeConfiguration.
			// When another window sets/clears any provider's API key, refresh this
			// window's model picker so the warning state stays in sync.
			context.secrets.onDidChange((e) => {
				if (providerSecretKeys.has(e.key)) {
					this.authManager.invalidatePresence(e.key);
					this.invalidateCurrencyAndRefreshModels();
				}
			}),
		);
	}

	// ---- Public commands ----

	async configureApiKey(providerId?: ProviderId): Promise<void> {
		const provider = await this.resolveProvider(providerId, 'set');
		if (!provider) {
			return;
		}
		const saved = await this.authManager.promptForApiKey(provider);
		if (saved) {
			this.invalidateCurrencyAndRefreshModels();
			void this.notifyApiKeySaved(provider).catch((error) =>
				logger.warn('Failed to present API key follow-up actions', error),
			);
		}
	}

	/** Guided setup: open the provider console, store a key, verify, then open chat. */
	async setupProvider(providerId?: ProviderId): Promise<void> {
		const provider = await this.resolveProvider(providerId, 'setup');
		if (!provider) {
			return;
		}

		const openKeyPageAction = t('setup.action.openApiKeyPage');
		const enterKeyAction = t('setup.action.enterApiKey');
		const firstChoice = await vscode.window.showInformationMessage(
			t('setup.start', provider.name),
			openKeyPageAction,
			enterKeyAction,
		);
		if (!firstChoice) {
			return;
		}
		if (firstChoice === openKeyPageAction) {
			await vscode.env.openExternal(vscode.Uri.parse(provider.externalUrls.apiKeys));
		}

		const saved = await this.authManager.promptForApiKey(provider);
		if (!saved) {
			return;
		}

		this.invalidateCurrencyAndRefreshModels();
		await this.testConnection(provider.id);

		const openChatAction = t('auth.savedAction.openChat');
		const openSettingsAction = t('connection.action.openSettings');
		const finalChoice = await vscode.window.showInformationMessage(
			t('setup.done', provider.name),
			openChatAction,
			openSettingsAction,
		);
		if (finalChoice === openChatAction) {
			await openCopilotChat();
		} else if (finalChoice === openSettingsAction) {
			await openProviderSettings(provider);
		}
	}

	/**
	 * After a key is saved, offer the next useful step instead of a dead-end toast:
	 * verify the key with a connection test, or jump straight into chat.
	 */
	private async notifyApiKeySaved(provider: ProviderDefinition): Promise<void> {
		const testAction = t('auth.savedAction.testConnection');
		const openChatAction = t('auth.savedAction.openChat');
		const choice = await vscode.window.showInformationMessage(
			t('auth.savedFor', provider.name),
			testAction,
			openChatAction,
		);
		if (choice === testAction) {
			await this.testConnection(provider.id);
		} else if (choice === openChatAction) {
			await openCopilotChat();
		}
	}

	async clearApiKey(providerId?: ProviderId): Promise<void> {
		const provider = await this.resolveProvider(providerId, 'clear');
		if (!provider) {
			return;
		}
		await this.authManager.deleteApiKey(provider);
		this.invalidateCurrencyAndRefreshModels();
		vscode.window.showInformationMessage(t('auth.removedFor', provider.name));
	}

	async openProviderSettings(providerId?: ProviderId): Promise<void> {
		const provider = await this.resolveProvider(providerId, 'settings');
		if (!provider) {
			return;
		}
		await openProviderSettings(provider);
	}

	/** True when at least one provider has an API key configured. */
	async hasApiKey(): Promise<boolean> {
		const results = await Promise.all(
			Object.values(PROVIDERS).map((provider) => this.authManager.hasApiKey(provider)),
		);
		return results.some(Boolean);
	}

	/**
	 * Snapshot of per-provider API-key presence for the providers view. Returns
	 * booleans only — the secret value is never exposed. Pairs with
	 * {@link onDidChangeLanguageModelChatInformation}, which fires whenever a key
	 * or relevant setting changes so the view can re-query this state.
	 */
	async getProviderKeyStates(): Promise<Map<ProviderId, boolean>> {
		const providers = Object.values(PROVIDERS);
		const states = await Promise.all(
			providers.map((provider) => this.authManager.hasApiKey(provider)),
		);
		return new Map(providers.map((provider, index) => [provider.id, states[index]]));
	}

	/**
	 * Resolve the provider to act on. When an ID is supplied (e.g. from a
	 * provider-scoped command) it is used directly; otherwise the user picks
	 * from a quick pick that shows each provider's current key status.
	 */
	private async resolveProvider(
		providerId: ProviderId | undefined,
		intent: 'set' | 'clear' | 'setup' | 'settings',
	): Promise<ProviderDefinition | undefined> {
		if (providerId && PROVIDERS[providerId]) {
			return PROVIDERS[providerId];
		}

		const providers = Object.values(PROVIDERS);
		const configured = await Promise.all(
			providers.map((provider) => this.authManager.hasApiKey(provider)),
		);
		const items: ProviderQuickPickItem[] = providers.map((provider, index) => ({
			label: `$(${configured[index] ? 'check' : 'warning'}) ${provider.name}`,
			description: configured[index]
				? t('auth.providerConfigured')
				: t('auth.providerNotConfigured'),
			provider,
			buttons: [
				{
					iconPath: new vscode.ThemeIcon('link-external'),
					tooltip: t('auth.openApiKeyPage', provider.name),
				},
			],
		}));

		const picked = await pickProviderQuickPick(items, {
			title:
				intent === 'set'
					? t('auth.selectProviderSet')
					: intent === 'setup'
						? t('setup.selectProvider')
						: intent === 'settings'
							? t('settings.selectProvider')
							: t('auth.selectProviderClear'),
			placeHolder: t('auth.selectProviderPlaceholder'),
		});
		return picked?.provider;
	}

	/** Force Copilot Chat to re-query model information (including configurationSchema). */
	refreshModelPicker(): void {
		this.onDidChangeLanguageModelChatInformationEmitter.fire();
	}

	private invalidateCurrencyAndRefreshModels(): void {
		void this.balanceCurrencyResolver
			.invalidate()
			.catch((error) => logger.warn('Failed to invalidate balance currency', error))
			.finally(() => this.onDidChangeLanguageModelChatInformationEmitter.fire());
	}

	async prepareForDeactivate(): Promise<void> {
		this.isActive = false;
		this.onDidChangeLanguageModelChatInformationEmitter.fire();
	}

	async setVisionModel(): Promise<void> {
		await this.vision.openConfiguration();
	}

	/** Expose the vision describer getter for tool use (e.g. image reading). */
	async getVisionDescriber(): Promise<VisionDescriber | undefined> {
		return this.vision.get();
	}

	/** Validate a provider's key + endpoint and discover its model list. */
	async testConnection(providerId?: ProviderId): Promise<void> {
		const provider = providerId ? PROVIDERS[providerId] : undefined;
		await runConnectionTest(this.authManager, provider);
	}

	/** Show the accumulated session cost breakdown with a reset action. */
	async showSessionCost(): Promise<void> {
		const summary = this.sessionCost.getSummary();
		if (!summary) {
			void vscode.window.showInformationMessage(t('sessionCost.empty'));
			return;
		}

		const lineItems = summary.items.map((item) =>
			t(
				'sessionCost.lineItem',
				item.modelName,
				formatSessionCost(item.cost, summary.currency),
				item.requests,
				item.promptTokens,
				item.completionTokens,
				item.cachedPromptTokens,
			),
		);

		const notes = [t('sessionCost.approximateNote')];
		const cacheHitRate = getSessionCacheHitRate(summary);
		if (cacheHitRate !== undefined) {
			notes.push(t('sessionCost.cacheHealthNote', cacheHitRate.toFixed(0)));
		}
		if (summary.utilityCost > 0) {
			notes.push(
				t(
					'sessionCost.tierSplitNote',
					formatSessionCost(summary.utilityCost, summary.currency),
					formatSessionCost(summary.agentCost, summary.currency),
				),
			);
		}
		if (summary.unbilledRequests > 0) {
			notes.push(
				t('sessionCost.unbilledNote', summary.unbilledRequests, summary.unbilledModelCount),
			);
		}

		const detail = [lineItems.join('\n'), notes.join('\n')]
			.filter((section) => section.length > 0)
			.join('\n\n');

		const choice = await vscode.window.showInformationMessage(
			t('sessionCost.summaryTitle', formatSessionCost(summary.totalCost, summary.currency)),
			{ modal: true, detail },
			t('sessionCost.reset'),
		);
		if (choice === t('sessionCost.reset')) {
			this.sessionCost.reset();
			this.updateSessionCostStatusBar();
			void vscode.window.showInformationMessage(t('sessionCost.resetDone'));
		}
	}

	private recordSessionUsage(modelId: string, usage: LlmUsage, requestKind: RequestKind): void {
		const model = MODELS.find((m) => m.id === modelId);
		if (!model) {
			return;
		}
		const costTier: RequestCostTier = isUtilityRequestKind(requestKind) ? 'utility' : 'agent';
		this.sessionCost.record(
			model,
			usage,
			this.balanceCurrencyResolver.getDisplayCurrency(),
			costTier,
		);
		this.updateSessionCostStatusBar();
	}

	private updateSessionCostStatusBar(): void {
		const summary = this.sessionCost.getSummary();
		if (!summary || summary.totalCost <= 0) {
			this.sessionCostStatusBar.hide();
			return;
		}
		this.sessionCostStatusBar.text = `$(credit-card) ${formatSessionCost(summary.totalCost, summary.currency)}`;
		this.sessionCostStatusBar.show();
	}

	// ---- LanguageModelChatProvider ----

	async provideLanguageModelChatInformation(
		_options: vscode.PrepareLanguageModelChatModelOptions,
		_token: vscode.CancellationToken,
	): Promise<vscode.LanguageModelChatInformation[]> {
		if (!this.isActive) {
			return [];
		}

		const providers = Object.values(PROVIDERS);
		const keyStates = await Promise.all(
			providers.map((provider) => this.authManager.hasApiKey(provider)),
		);
		const hasKeyByProvider = new Map<ProviderId, boolean>(
			providers.map((provider, index) => [provider.id, keyStates[index]]),
		);
		const pricingCurrency = this.balanceCurrencyResolver.getDisplayCurrency();
		if (keyStates.some(Boolean)) {
			this.balanceCurrencyResolver.refreshInBackground();
		}
		return MODELS.map((model) =>
			toChatInfo(model, hasKeyByProvider.get(model.provider) ?? false, pricingCurrency),
		);
	}

	async provideLanguageModelChatResponse(
		modelInfo: vscode.LanguageModelChatInformation,
		messages: readonly vscode.LanguageModelChatRequestMessage[],
		options: vscode.ProvideLanguageModelChatResponseOptions,
		progress: vscode.Progress<vscode.LanguageModelResponsePart>,
		token: vscode.CancellationToken,
	): Promise<void> {
		const segment = resolveConversationSegment(messages);
		const classification = classifyProviderRequestDetailed({
			messages,
			tools: options.tools,
		});
		const requestKind = classification.kind;
		this.classificationStats.record(classification);
		if (getDebugLoggingEnabled()) {
			logger.info(
				formatRequestLogLine(requestKind, this.classificationStats.format(classification)),
			);
		}

		dumpProviderInput({
			globalStorageUri: this.globalStorageUri,
			segment,
			modelInfo,
			messages,
			requestOptions: options,
			requestKind,
		});

		const toolFlow = processToolFlow({
			stabilizeToolList: getStabilizeToolListEnabled(),
			messages,
			tools: options.tools,
			progress,
			requestKind,
		});
		if (toolFlow.preflightHandled) {
			return;
		}

		const prepared = await prepareChatRequest({
			authManager: this.authManager,
			globalStorageUri: this.globalStorageUri,
			modelInfo,
			segment,
			messages: toolFlow.messages,
			options,
			token,
			cacheDiagnostics: this.cacheDiagnostics,
			getVisionDescriber: () => this.vision.get(),
		});

		return streamChatCompletion({
			prepared,
			progress,
			token,
			initialResponseNotice: joinInitialResponseNotices(
				toolFlow.initialResponseNotice,
				prepared.initialResponseNotice,
			),
			getCharsPerToken: () => this.charsPerToken,
			setCharsPerToken: (charsPerToken) => {
				this.charsPerToken = charsPerToken;
			},
			recordUsage: (usage) => this.recordSessionUsage(modelInfo.id, usage, prepared.requestKind),
		});
	}

	async provideTokenCount(
		_modelInfo: vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatRequestMessage,
		_token: vscode.CancellationToken,
	): Promise<number> {
		return estimateTokenCount(text, this.charsPerToken);
	}
}

function joinInitialResponseNotices(...notices: (string | undefined)[]): string | undefined {
	const joined = notices.filter((notice) => notice && notice.trim().length > 0).join('\n');
	return joined || undefined;
}

/** Session-wide context-cache hit rate (0-100), or undefined when no prompt tokens. */
function getSessionCacheHitRate(summary: SessionCostSummary): number | undefined {
	if (summary.totalPromptTokens <= 0) {
		return undefined;
	}
	const rate = (summary.totalCachedPromptTokens / summary.totalPromptTokens) * 100;
	return Math.min(100, Math.max(0, rate));
}

interface ProviderQuickPickItem extends vscode.QuickPickItem {
	readonly provider: ProviderDefinition;
}

/**
 * Provider picker with a per-item "open API key page" button. Uses the
 * `createQuickPick` API (rather than `showQuickPick`) so item buttons can be
 * handled without dismissing the picker.
 */
function pickProviderQuickPick(
	items: readonly ProviderQuickPickItem[],
	options: { title: string; placeHolder: string },
): Promise<ProviderQuickPickItem | undefined> {
	return new Promise<ProviderQuickPickItem | undefined>((resolve) => {
		const quickPick = vscode.window.createQuickPick<ProviderQuickPickItem>();
		quickPick.title = options.title;
		quickPick.placeholder = options.placeHolder;
		quickPick.ignoreFocusOut = true;
		quickPick.items = items as ProviderQuickPickItem[];

		let settled = false;
		const settle = (value: ProviderQuickPickItem | undefined): void => {
			if (settled) {
				return;
			}
			settled = true;
			resolve(value);
			quickPick.dispose();
		};

		quickPick.onDidTriggerItemButton((event) => {
			void vscode.env.openExternal(vscode.Uri.parse(event.item.provider.externalUrls.apiKeys));
		});
		quickPick.onDidAccept(() => settle(quickPick.selectedItems[0]));
		quickPick.onDidHide(() => settle(undefined));
		quickPick.show();
	});
}

/**
 * Best-effort "open the chat view" used as a post-setup next step. The exact
 * command id has varied across VS Code / Copilot Chat versions, so try the
 * known ones in order and stop at the first that resolves.
 */
async function openCopilotChat(): Promise<void> {
	const candidates = [
		'workbench.action.chat.open',
		'workbench.panel.chat.view.copilot.focus',
		'workbench.action.chat.openInSidebar',
	];
	for (const command of candidates) {
		try {
			await vscode.commands.executeCommand(command);
			return;
		} catch {
			// Command unavailable in this host; try the next candidate.
		}
	}
	logger.warn('Could not open Copilot Chat: no known chat command is available');
}

export async function openProviderSettings(provider: ProviderDefinition): Promise<void> {
	await vscode.commands.executeCommand(
		'workbench.action.openSettings',
		`@ext:cuilian.cllms-for-copilot ${provider.baseUrlSetting} ${provider.modelIdOverridesSetting}`,
	);
}
