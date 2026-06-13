import vscode from 'vscode';
import { t } from '../i18n';
import { logger } from '../logger';
import { LlmChatProvider } from '../provider';
import { registerActionUrls } from './actions';
import { registerCommands } from './commands';
import { initializeDiagnostics } from './diagnostics';
import { getVisionDescriberGetter, registerProvider } from './provider';
import { createImageReadTool } from './tools';
import { showWelcomeIfNeeded } from './welcome';

let activeProvider: LlmChatProvider | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	await initializeDiagnostics(context);
	registerCommands(context);
	registerActionUrls(context);

	try {
		const provider = await registerProvider(context);
		activeProvider = provider;

		// Register the image-read language model tool.
		// Wrapped in try-catch because the tool contribution may not be
		// available yet on first activation in some VS Code versions.
		try {
			context.subscriptions.push(
				vscode.lm.registerTool(
					'cllms_readImage',
					createImageReadTool(getVisionDescriberGetter(provider)),
				),
			);
		} catch (error) {
			logger.warn('Failed to register cllms_readImage tool', error);
		}

		void showWelcomeIfNeeded(context, provider).catch((error) => {
			logger.warn(t('extension.welcomeFailed'), error);
		});

		logger.info(`Extension activated version=${context.extension.packageJSON.version}`);
	} catch (error) {
		activeProvider = undefined;
		logger.error('Failed to activate CLLMs extension', error);
		void vscode.window.showErrorMessage(t('extension.activateFailed'));
		throw error;
	}
}

export async function deactivate(): Promise<void> {
	try {
		await activeProvider?.prepareForDeactivate();
	} catch (error) {
		logger.warn(t('extension.deactivateFailed'), error);
	} finally {
		activeProvider = undefined;
		logger.info('Extension deactivated');
		logger.dispose();
	}
}
