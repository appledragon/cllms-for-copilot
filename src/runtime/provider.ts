import vscode from 'vscode';
import { logger } from '../logger';
import { LlmChatProvider } from '../provider';
import type { VisionDescriber } from '../provider/vision';

export async function registerProvider(
	context: vscode.ExtensionContext,
): Promise<LlmChatProvider> {
	const provider = new LlmChatProvider(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('cllms.setApiKey', () => provider.configureApiKey()),
		vscode.commands.registerCommand('cllms.clearApiKey', () => provider.clearApiKey()),
		vscode.commands.registerCommand('cllms.setVisionModel', () =>
			provider.setVisionModel(),
		),
		vscode.commands.registerCommand('cllms.testConnection', () => provider.testConnection()),
		vscode.commands.registerCommand('cllms.showSessionCost', () => provider.showSessionCost()),
		vscode.lm.registerLanguageModelChatProvider('cllms', provider),
	);

	// Copilot Chat can serve cached model info without configurationSchema.
	// Activate it first so this refresh reaches a live listener and re-queries the provider.
	await activateCopilotChat();
	provider.refreshModelPicker();

	return provider;
}

/** Expose the vision describer getter for the image read tool. */
export function getVisionDescriberGetter(
	provider: LlmChatProvider,
): () => Promise<VisionDescriber | undefined> {
	return () => provider.getVisionDescriber();
}

async function activateCopilotChat(): Promise<void> {
	try {
		await vscode.extensions.getExtension('github.copilot-chat')?.activate();
	} catch (error) {
		logger.warn('Copilot Chat activation unavailable; model picker refresh may be delayed', error);
	}
}
