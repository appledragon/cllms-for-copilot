import vscode from 'vscode';
import { AuthManager } from '../auth';
import { getStabilizeToolListEnabled } from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import type { LlmUsage, ProviderDefinition, ProviderId } from '../types';
import { runConnectionTest } from './connection';
import { createCacheDiagnosticsRecorder, dumpProviderInput } from './debug';
import { toChatInfo } from './models';
import { BalanceCurrencyResolver } from './pricing/currency';
import { formatSessionCost, SessionCostTracker } from './pricing/session';
import { prepareChatRequest } from './request';
import { classifyProviderRequest } from './routing';
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
					this.invalidateCurrencyAndRefreshModels();
				}
			}),
			// Multi-window: SecretStorage changes don't fire onDidChangeConfiguration.
			// When another window sets/clears any provider's API key, refresh this
			// window's model picker so the warning state stays in sync.
			context.secrets.onDidChange((e) => {
				if (providerSecretKeys.has(e.key)) {
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

	/** True when at least one provider has an API key configured. */
	async hasApiKey(): Promise<boolean> {
		const results = await Promise.all(
			Object.values(PROVIDERS).map((provider) => this.authManager.hasApiKey(provider)),
		);
		return results.some(Boolean);
	}

	/**
	 * Resolve the provider to act on. When an ID is supplied (e.g. from a
	 * provider-scoped command) it is used directly; otherwise the user picks
	 * from a quick pick that shows each provider's current key status.
	 */
	private async resolveProvider(
		providerId: ProviderId | undefined,
		intent: 'set' | 'clear',
	): Promise<ProviderDefinition | undefined> {
		if (providerId && PROVIDERS[providerId]) {
			return PROVIDERS[providerId];
		}

		const providers = Object.values(PROVIDERS);
		const configured = await Promise.all(
			providers.map((provider) => this.authManager.hasApiKey(provider)),
		);
		const items = providers.map((provider, index) => ({
			label: provider.name,
			description: configured[index] ? t('auth.providerConfigured') : t('auth.providerNotConfigured'),
			provider,
		}));

		const picked = await vscode.window.showQuickPick(items, {
			title: intent === 'set' ? t('auth.selectProviderSet') : t('auth.selectProviderClear'),
			placeHolder: t('auth.selectProviderPlaceholder'),
			ignoreFocusOut: true,
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

		// Force the host to re-pull `provideLanguageModelChatInformation` synchronously
		// before the extension unloads. With `isActive = false` we now return [],
		// which makes Copilot Chat drop CLLMs models from the picker immediately
		// instead of leaving stale entries behind after deactivate. The returned
		// model list itself is unused — we only call this for its side effect.
		try {
			await vscode.lm.selectChatModels({ vendor: 'cllms' });
		} catch (error) {
			logger.warn('Failed to refresh CLLMs models during deactivate', error);
		}
	}

	async setVisionModel(): Promise<void> {
		await this.vision.openConfiguration();
	}

	/** Expose the vision describer getter for tool use (e.g. image reading). */
	async getVisionDescriber(): Promise<VisionDescriber | undefined> {
		return this.vision.get();
	}

	/** Validate a provider's key + endpoint and discover its model list. */
	async testConnection(): Promise<void> {
		await runConnectionTest(this.authManager);
	}

	/** Show the accumulated session cost breakdown with a reset action. */
	async showSessionCost(): Promise<void> {
		const summary = this.sessionCost.getSummary();
		if (!summary) {
			void vscode.window.showInformationMessage(t('sessionCost.empty'));
			return;
		}

		const detail = summary.items
			.map((item) =>
				t(
					'sessionCost.lineItem',
					item.modelName,
					formatSessionCost(item.cost, summary.currency),
					item.requests,
					item.promptTokens,
					item.completionTokens,
				),
			)
			.join('\n');

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

	private recordSessionUsage(modelId: string, usage: LlmUsage): void {
		const model = MODELS.find((m) => m.id === modelId);
		if (!model) {
			return;
		}
		this.sessionCost.record(model, usage, this.balanceCurrencyResolver.getDisplayCurrency());
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
		const requestKind = classifyProviderRequest({
			messages,
			tools: options.tools,
		});

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
			recordUsage: (usage) => this.recordSessionUsage(modelInfo.id, usage),
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
