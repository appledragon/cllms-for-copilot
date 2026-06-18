import vscode from 'vscode';
import { AuthManager } from '../auth';
import {
	getDebugLoggingEnabled,
	getReplayReasoningScope,
	getSortToolsForCacheEnabled,
	getStabilizeToolListEnabled,
} from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import type { LlmUsage, ProviderConnectivity, ProviderDefinition, ProviderId } from '../types';
import { type ConnectionTestOutcome, runConnectionTest } from './connection';
import { createCacheDiagnosticsRecorder, dumpProviderInput } from './debug';
import { hashString, stableStringify } from './debug/trace-utils';
import { toChatInfo } from './models';
import {
	selectSessionOptimizationHints,
	type SessionOptimizationHintId,
	type SessionOptimizationSignals,
} from './pricing/cache-hints';
import { BalanceCurrencyResolver } from './pricing/currency';
import { formatSessionCost, SessionCostTracker, type SessionCostSummary } from './pricing/session';
import { prepareChatRequest, type PreparedChatRequest } from './request';
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

	/**
	 * Latest connection-test result per provider, surfaced by the providers view.
	 * In-memory only (resets on reload) and cleared whenever a key changes so the
	 * status dot never shows stale reachability.
	 */
	private readonly connectivity = new Map<ProviderId, ProviderConnectivity>();

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
	private readonly previousToolHashesByScope = new Map<string, string>();
	private lastOptimizationSignals: SessionOptimizationSignals | undefined;

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

		const providerIdBySecret = new Map(
			Object.values(PROVIDERS).map((provider) => [provider.apiKeySecret, provider.id]),
		);

		context.subscriptions.push(
			this.sessionCostStatusBar,
			this.onDidChangeLanguageModelChatInformationEmitter,
			// Settings-based fallback API key + base URL changes (any provider).
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('cllms')) {
					// A settings-fallback API key or base URL may have changed; drop all
					// cached key-presence and connectivity so both are re-derived.
					this.authManager.invalidatePresence();
					this.connectivity.clear();
					this.invalidateCurrencyAndRefreshModels();
				}
			}),
			// Multi-window: SecretStorage changes don't fire onDidChangeConfiguration.
			// When another window sets/clears any provider's API key, refresh this
			// window's model picker so the warning state stays in sync.
			context.secrets.onDidChange((e) => {
				const providerId = providerIdBySecret.get(e.key);
				if (providerId) {
					this.authManager.invalidatePresence(e.key);
					this.connectivity.delete(providerId);
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
			// A new key is unverified until the next connection test.
			this.connectivity.delete(provider.id);
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
		this.connectivity.delete(provider.id);
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
	 * Snapshot of the latest connection-test result per provider for the
	 * providers view. Pairs with {@link onDidChangeLanguageModelChatInformation},
	 * which fires after each test so the view can re-render the status dot.
	 */
	getProviderConnectivity(): ReadonlyMap<ProviderId, ProviderConnectivity> {
		return this.connectivity;
	}

	private recordConnectivity(providerId: ProviderId, outcome: ConnectionTestOutcome): void {
		switch (outcome) {
			case 'success':
			case 'empty-model-list':
			case 'stale-overrides':
				this.connectivity.set(providerId, 'ok');
				break;
			case 'failed':
				this.connectivity.set(providerId, 'error');
				break;
			case 'no-key':
				this.connectivity.delete(providerId);
				break;
			case 'cancelled':
				// Leave the previous result intact; still refresh so the view can
				// clear any transient "testing…" indicator.
				break;
		}
		this.onDidChangeLanguageModelChatInformationEmitter.fire();
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
		await runConnectionTest(this.authManager, provider, (id, outcome) =>
			this.recordConnectivity(id, outcome),
		);
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
				formatPercent(item.cacheHitRate),
				formatSessionCost(item.cacheSavings, summary.currency),
				formatSessionCost(item.averageCost, summary.currency),
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
		if (summary.totalCacheSavings > 0) {
			notes.push(
				t(
					'sessionCost.cacheSavingsNote',
					formatSessionCost(summary.totalCacheSavings, summary.currency),
				),
			);
		}
		if (summary.unbilledRequests > 0) {
			notes.push(
				t('sessionCost.unbilledNote', summary.unbilledRequests, summary.unbilledModelCount),
			);
		}
		const hints = selectSessionOptimizationHints(summary, this.lastOptimizationSignals).map(
			(hint) => t(getSessionOptimizationHintKey(hint)),
		);

		const detail = [
			lineItems.join('\n'),
			notes.join('\n'),
			hints.length > 0 ? [t('sessionCost.hintsTitle'), ...hints].join('\n') : '',
		]
			.filter((section) => section.length > 0)
			.join('\n\n');

		const resetAction = t('sessionCost.reset');
		const advancedSettingsAction = t('sessionCost.action.openAdvancedSettings');
		const utilityModelAction = t('sessionCost.action.configureUtilityModel');
		const usagePageAction = t('sessionCost.action.openUsagePage');
		const primaryProvider = getPrimaryBilledProvider(summary);
		const actions = [
			advancedSettingsAction,
			utilityModelAction,
			...(primaryProvider ? [usagePageAction] : []),
			resetAction,
		];
		const choice = await vscode.window.showInformationMessage(
			t('sessionCost.summaryTitle', formatSessionCost(summary.totalCost, summary.currency)),
			{ modal: true, detail },
			...actions,
		);
		if (choice === resetAction) {
			this.sessionCost.reset();
			this.updateSessionCostStatusBar();
			void vscode.window.showInformationMessage(t('sessionCost.resetDone'));
		} else if (choice === advancedSettingsAction) {
			await vscode.commands.executeCommand('cllms.openSettings');
		} else if (choice === utilityModelAction) {
			await vscode.commands.executeCommand('cllms.configureUtilityModel');
		} else if (choice === usagePageAction && primaryProvider) {
			await vscode.env.openExternal(vscode.Uri.parse(primaryProvider.externalUrls.usage));
		}
	}

	private recordSessionUsage(
		billableModelId: string,
		usage: LlmUsage,
		requestKind: RequestKind,
	): void {
		const model = MODELS.find((m) => m.id === billableModelId);
		const costTier: RequestCostTier = isUtilityRequestKind(requestKind) ? 'utility' : 'agent';
		this.sessionCost.record(
			model,
			usage,
			this.balanceCurrencyResolver.getDisplayCurrency(),
			costTier,
			billableModelId,
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
		this.rememberSessionOptimizationSignals(prepared, toolFlow.initialResponseNotice !== undefined);

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
			recordUsage: (usage) =>
				this.recordSessionUsage(prepared.billableModelId, usage, prepared.requestKind),
		});
	}

	private rememberSessionOptimizationSignals(
		prepared: PreparedChatRequest,
		hasUnexpandedActivateTools: boolean,
	): void {
		const toolsHash = hashString(stableStringify(prepared.request.tools ?? []));
		const scopeKey = `${prepared.requestKind}:${prepared.request.model}`;
		const previousToolsHash = this.previousToolHashesByScope.get(scopeKey);
		this.previousToolHashesByScope.delete(scopeKey);
		this.previousToolHashesByScope.set(scopeKey, toolsHash);
		while (this.previousToolHashesByScope.size > 50) {
			const oldestKey = this.previousToolHashesByScope.keys().next().value;
			if (oldestKey === undefined) {
				break;
			}
			this.previousToolHashesByScope.delete(oldestKey);
		}

		this.lastOptimizationSignals = {
			requestKind: prepared.requestKind,
			toolCount: prepared.request.tools?.length ?? 0,
			toolsChanged: previousToolsHash !== undefined && previousToolsHash !== toolsHash,
			hasUnexpandedActivateTools,
			sortToolsForCacheEnabled: getSortToolsForCacheEnabled(),
			stabilizeToolListEnabled: getStabilizeToolListEnabled(),
			replayReasoningScope: getReplayReasoningScope(),
		};
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

function formatPercent(value: number | undefined): string {
	return value === undefined ? t('sessionCost.notAvailable') : value.toFixed(0);
}

/** Session-wide context-cache hit rate (0-100), or undefined when no prompt tokens. */
function getSessionCacheHitRate(summary: SessionCostSummary): number | undefined {
	if (summary.totalPromptTokens <= 0) {
		return undefined;
	}
	const rate = (summary.totalCachedPromptTokens / summary.totalPromptTokens) * 100;
	return Math.min(100, Math.max(0, rate));
}

function getSessionOptimizationHintKey(hint: SessionOptimizationHintId): string {
	switch (hint) {
		case 'sort-tools-for-cache':
			return 'sessionCost.hint.sortToolsForCache';
		case 'stabilize-tool-list':
			return 'sessionCost.hint.stabilizeToolList';
		case 'latest-tool-loop':
			return 'sessionCost.hint.latestToolLoop';
		case 'utility-cost-control':
			return 'sessionCost.hint.utilityCostControl';
	}
}

function getPrimaryBilledProvider(summary: SessionCostSummary): ProviderDefinition | undefined {
	const primaryModelId = summary.items[0]?.modelId;
	if (!primaryModelId) {
		return undefined;
	}
	const model = MODELS.find((candidate) => candidate.id === primaryModelId);
	return model ? PROVIDERS[model.provider] : undefined;
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
