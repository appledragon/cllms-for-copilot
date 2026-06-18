import vscode from 'vscode';
import { PROVIDERS, WALKTHROUGH_ID } from '../consts';
import { logger } from '../logger';
import { LlmChatProvider } from '../provider';
import type { ProviderId } from '../types';
import { ProvidersWebviewViewProvider } from '../view/providers/view';

/**
 * Argument passed to the provider-scoped commands. The providers webview sends a
 * synthetic node for the acted-on provider; invoking a command without one (e.g.
 * from the command palette) falls back to the interactive provider picker.
 */
type ProvidersNode = { readonly kind: 'provider'; readonly providerId: unknown };

/**
 * Register the CLLMs "Providers" Activity Bar view (a custom webview) and its
 * provider-scoped commands. The view reuses the provider's auth + change event
 * so its status stays in sync with the model picker.
 */
export function registerProvidersView(
	context: vscode.ExtensionContext,
	provider: LlmChatProvider,
): void {
	const viewProvider = new ProvidersWebviewViewProvider(
		() => provider.getProviderKeyStates(),
		provider.onDidChangeLanguageModelChatInformation,
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ProvidersWebviewViewProvider.viewId, viewProvider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
		vscode.commands.registerCommand('cllms.providers.refresh', () => viewProvider.refresh()),
		vscode.commands.registerCommand('cllms.providers.setupProvider', (node?: ProvidersNode) =>
			provider.setupProvider(getProviderId(node)),
		),
		vscode.commands.registerCommand('cllms.providers.setApiKey', (node?: ProvidersNode) =>
			provider.configureApiKey(getProviderId(node)),
		),
		vscode.commands.registerCommand('cllms.providers.clearApiKey', (node?: ProvidersNode) =>
			provider.clearApiKey(getProviderId(node)),
		),
		vscode.commands.registerCommand('cllms.providers.testConnection', (node?: ProvidersNode) =>
			provider.testConnection(getProviderId(node)),
		),
		vscode.commands.registerCommand('cllms.providers.openApiKeyPage', (node?: ProvidersNode) =>
			openProviderUrl(node, 'apiKeys'),
		),
		vscode.commands.registerCommand('cllms.providers.openUsagePage', (node?: ProvidersNode) =>
			openProviderUrl(node, 'usage'),
		),
		vscode.commands.registerCommand('cllms.providers.openStatusPage', (node?: ProvidersNode) =>
			openProviderUrl(node, 'status'),
		),
		vscode.commands.registerCommand('cllms.providers.openSettings', (node?: ProvidersNode) =>
			provider.openProviderSettings(getProviderId(node)),
		),
		vscode.commands.registerCommand('cllms.openWalkthrough', () =>
			vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID, false),
		),
	);
}

function getProviderId(node: ProvidersNode | undefined): ProviderId | undefined {
	if (node?.kind !== 'provider') {
		return undefined;
	}
	if (isProviderId(node.providerId)) {
		return node.providerId;
	}
	logger.warn(`Ignoring provider command with invalid provider id: ${String(node.providerId)}`);
	return undefined;
}

function openProviderUrl(
	node: ProvidersNode | undefined,
	key: 'apiKeys' | 'usage' | 'status',
): void {
	const providerId = getProviderId(node);
	if (!providerId) {
		return;
	}
	const url = PROVIDERS[providerId].externalUrls[key];
	void vscode.env
		.openExternal(vscode.Uri.parse(url))
		.then(undefined, (error) => logger.warn(`Failed to open provider URL: ${url}`, error));
}

function isProviderId(value: unknown): value is ProviderId {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}
