import vscode from 'vscode';
import { t } from '../../../i18n';
import {
	normalizeAudioProxyConfig,
	type AudioProxyConfigStore,
} from '../sources/endpoint/config';
import type { AudioProxyApiType } from '../types';
import { isAudioProxyError } from '../protocols/errors';

export async function openAudioProxyQuickSetup(
	store: AudioProxyConfigStore,
	onDidChange: () => void,
): Promise<void> {
	const source = await vscode.window.showQuickPick(
		[
			{ label: t('audio.panel.source.apiEndpoint'), value: 'api-endpoint' as const },
			{ label: t('audio.panel.source.vscodeLm'), value: 'vscode-lm' as const },
		],
		{
			title: t('audio.panel.title'),
			placeHolder: t('audio.panel.field.source'),
		},
	);
	if (!source) {
		return;
	}

	if (source.value === 'vscode-lm') {
		await store.saveSource('vscode-lm');
		onDidChange();
		void vscode.window.showInformationMessage(t('audio.panel.status.vscodeLmSelected'));
		return;
	}

	const endpoint = await vscode.window.showInputBox({
		title: t('audio.panel.title'),
		prompt: t('audio.panel.field.endpointUrl'),
		placeHolder: 'https://api.example.com/v1/audio/transcriptions',
		ignoreFocusOut: true,
	});
	if (!endpoint?.trim()) {
		return;
	}

	const apiTypePick = await vscode.window.showQuickPick(
		[
			{ label: t('audio.panel.endpointType.openaiTranscriptions'), value: 'transcriptions' as const },
			{ label: t('audio.panel.endpointType.openaiResponsesAudio'), value: 'responses' as const },
		],
		{
			title: t('audio.panel.title'),
			placeHolder: t('audio.panel.field.endpointType'),
		},
	);
	if (!apiTypePick) {
		return;
	}
	const apiType: AudioProxyApiType = apiTypePick.value;

	const modelId = await vscode.window.showInputBox({
		title: t('audio.panel.title'),
		prompt: t('audio.panel.field.modelId'),
		ignoreFocusOut: true,
	});
	if (!modelId?.trim()) {
		return;
	}

	const apiKey = await vscode.window.showInputBox({
		title: t('audio.panel.title'),
		prompt: t('audio.panel.field.apiKey'),
		password: true,
		ignoreFocusOut: true,
	});

	try {
		const config = normalizeAudioProxyConfig({
			providerFamily: 'openai-compatible',
			apiType,
			url: endpoint.trim(),
			modelId: modelId.trim(),
			updatedAt: Date.now(),
		});
		await store.saveConfig(config);
		await store.saveSource('api-endpoint');
		if (apiKey?.trim()) {
			await store.setApiKey(apiKey);
		}
		onDidChange();
		void vscode.window.showInformationMessage(
			apiKey?.trim()
				? t('audio.panel.status.endpointSavedWithKey')
				: t('audio.panel.status.endpointSaved'),
		);
	} catch (error) {
		const message = isAudioProxyError(error)
			? error.message
			: error instanceof Error
				? error.message
				: String(error);
		void vscode.window.showErrorMessage(message);
	}
}
