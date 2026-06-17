import vscode from 'vscode';
import { PROVIDERS, WALKTHROUGH_ID } from '../consts';
import { logger } from '../logger';
import { LlmChatProvider } from '../provider';
import type { ProviderId } from '../types';
import { ProvidersTreeDataProvider, type ProvidersNode } from '../view/providersTree';

/**
 * Register the CLLMs "Providers" Activity Bar view and its provider-scoped
 * commands. The view reuses the provider's auth + change event so its status
 * icons stay in sync with the model picker.
 */
export function registerProvidersView(
	context: vscode.ExtensionContext,
	provider: LlmChatProvider,
): void {
	const treeDataProvider = new ProvidersTreeDataProvider(
		() => provider.getProviderKeyStates(),
		provider.onDidChangeLanguageModelChatInformation,
	);

	const treeView = vscode.window.createTreeView('cllms.providers', {
		treeDataProvider,
		showCollapseAll: true,
	});

	context.subscriptions.push(
		treeDataProvider,
		treeView,
		vscode.commands.registerCommand('cllms.providers.refresh', () => treeDataProvider.refresh()),
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
	return node?.kind === 'provider' ? node.providerId : undefined;
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
