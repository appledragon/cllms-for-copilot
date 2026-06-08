import vscode from 'vscode';
import { PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import { ensureRequestDumpRoot } from '../provider/debug';

export function registerCommands(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('cllms.showLogs', () => logger.show()),
		vscode.commands.registerCommand('cllms.openRequestDumpsFolder', () =>
			openRequestDumpsFolder(context),
		),
		vscode.commands.registerCommand('cllms.getApiKey', () => openApiKeyPage()),
		vscode.commands.registerCommand('cllms.openSettings', () =>
			vscode.commands.executeCommand('workbench.action.openSettings', 'cllms'),
		),
	);
}

async function openApiKeyPage(): Promise<void> {
	const providers = Object.values(PROVIDERS);
	const provider =
		providers.length === 1
			? providers[0]
			: (
					await vscode.window.showQuickPick(
						providers.map((p) => ({ label: p.name, provider: p })),
						{ title: t('auth.selectProviderSet'), placeHolder: t('auth.selectProviderPlaceholder') },
					)
				)?.provider;
	if (provider) {
		await vscode.env.openExternal(vscode.Uri.parse(provider.externalUrls.apiKeys));
	}
}

async function openRequestDumpsFolder(context: vscode.ExtensionContext): Promise<void> {
	try {
		const root = await ensureRequestDumpRoot(context.globalStorageUri);
		logger.info(`Opening request dumps folder: ${root.toString(true)}`);
		await vscode.commands.executeCommand('revealFileInOS', root);
	} catch (error) {
		logger.warn('Failed to open request dumps folder', error);
		void vscode.window.showErrorMessage(t('extension.openRequestDumpsFolderFailed'));
	}
}
