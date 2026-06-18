import vscode from 'vscode';
import { PROVIDERS } from '../../consts';
import { t } from '../../i18n';
import { logger } from '../../logger';
import type { ProviderConnectivity, ProviderId } from '../../types';
import { getProvidersViewHtml } from './html';
import { buildProvidersViewState, type ProvidersViewState } from './state';

/** Resolves per-provider API-key presence (boolean only, never the value). */
export type ProviderKeyStateProvider = () => Promise<Map<ProviderId, boolean>>;

/** Resolves the latest connection-test result per provider (synchronous snapshot). */
export type ProviderConnectivityProvider = () => ReadonlyMap<ProviderId, ProviderConnectivity>;

/**
 * Provider-scoped webview actions, mapped to the existing `cllms.providers.*`
 * commands. Each is invoked with a synthetic `{ kind: 'provider', providerId }`
 * node so the command's existing `getProviderId(node)` logic applies unchanged.
 */
const PROVIDER_COMMANDS: Readonly<Record<string, string>> = {
	setupProvider: 'cllms.providers.setupProvider',
	setApiKey: 'cllms.providers.setApiKey',
	clearApiKey: 'cllms.providers.clearApiKey',
	testConnection: 'cllms.providers.testConnection',
	openApiKeyPage: 'cllms.providers.openApiKeyPage',
	openUsagePage: 'cllms.providers.openUsagePage',
	openStatusPage: 'cllms.providers.openStatusPage',
	openProviderSettings: 'cllms.providers.openSettings',
};

/** Global webview actions, mapped to the extension-wide commands. */
const GLOBAL_COMMANDS: Readonly<Record<string, string>> = {
	setVisionModel: 'cllms.setVisionModel',
	openSettings: 'cllms.openSettings',
	showLogs: 'cllms.showLogs',
	copyDiagnosticReport: 'cllms.copyDiagnosticReport',
	openWalkthrough: 'cllms.openWalkthrough',
};

/**
 * Backs the CLLMs "Providers" Activity Bar view as a custom webview. Renders the
 * provider/model list with key status and exposes every action as an in-webview
 * control whose clicks delegate to the existing commands (so native secure flows
 * — the API-key input box, quick picks, toasts — are reused unchanged).
 *
 * Only key *presence* (a boolean) is ever read; the secret value is never read
 * or rendered here.
 */
export class ProvidersWebviewViewProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'cllms.providers';

	private view: vscode.WebviewView | undefined;

	constructor(
		private readonly getKeyStates: ProviderKeyStateProvider,
		private readonly onRefresh: vscode.Event<void>,
		private readonly getConnectivity: ProviderConnectivityProvider = () => new Map(),
	) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;
		webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
		// Paint a loading shell synchronously so the view never flashes blank while
		// key presence resolves; the real state is posted right after.
		webviewView.webview.html = getProvidersViewHtml(webviewView.webview, {
			phase: 'loading',
			providers: [],
		});

		const refreshSub = this.onRefresh(() => this.refresh());
		const messageSub = webviewView.webview.onDidReceiveMessage((message: unknown) => {
			void this.handleMessage(message);
		});
		const visibilitySub = webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this.refresh();
			}
		});
		webviewView.onDidDispose(() => {
			refreshSub.dispose();
			messageSub.dispose();
			visibilitySub.dispose();
			if (this.view === webviewView) {
				this.view = undefined;
			}
		});

		this.refresh();
	}

	/** Re-post the latest state to the live view (used by `cllms.providers.refresh`). */
	refresh(): void {
		void this.postState().catch((error) =>
			logger.warn('Failed to refresh providers webview', error),
		);
	}

	private async postState(): Promise<void> {
		const view = this.view;
		if (!view) {
			return;
		}
		let state: ProvidersViewState;
		try {
			state = buildProvidersViewState(await this.getKeyStates(), this.getConnectivity());
		} catch (error) {
			logger.warn('Failed to build providers view state', error);
			state = { phase: 'error', providers: [], errorMessage: t('providers.error') };
		}
		await view.webview.postMessage({ type: 'state', value: state });
	}

	private async handleMessage(message: unknown): Promise<void> {
		if (!isRecord(message) || typeof message.type !== 'string') {
			return;
		}
		const type = message.type;

		if (type === 'refresh') {
			this.refresh();
			return;
		}

		const globalCommand = GLOBAL_COMMANDS[type];
		if (globalCommand) {
			await runCommand(globalCommand);
			return;
		}

		const providerCommand = PROVIDER_COMMANDS[type];
		if (providerCommand) {
			const providerId = message.providerId;
			if (!isProviderId(providerId)) {
				logger.warn(
					`Ignoring providers webview action with invalid provider id: ${String(providerId)}`,
				);
				return;
			}
			await runCommand(providerCommand, { kind: 'provider', providerId });
			return;
		}

		logger.warn(`Unknown providers webview message type: ${type}`);
	}
}

async function runCommand(command: string, ...args: unknown[]): Promise<void> {
	try {
		await vscode.commands.executeCommand(command, ...args);
	} catch (error) {
		logger.warn(`Failed to execute command from providers webview: ${command}`, error);
	}
}

function isProviderId(value: unknown): value is ProviderId {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
