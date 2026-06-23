import vscode from 'vscode';
import { t } from '../../../i18n';
import { logger } from '../../../logger';
import {
	AudioProxyConfigStore,
	normalizeAudioProxyConfig,
} from '../sources/endpoint/config';
import type { AudioProxyConfig, AudioProxySource } from '../types';
import { isAudioProxyError } from '../protocols/errors';
import { getAudioProxyPanelHtml, type AudioProxyPanelState } from './html';

let currentPanel: vscode.WebviewPanel | undefined;

export function openAudioProxyPanel(
	context: vscode.ExtensionContext,
	options: { onDidChange: () => void },
): void {
	if (currentPanel) {
		currentPanel.reveal();
		return;
	}
	const store = new AudioProxyConfigStore(context);
	const panel = vscode.window.createWebviewPanel(
		'qwenAudioProxy',
		t('audio.panel.title'),
		vscode.ViewColumn.Active,
		{ enableScripts: true, retainContextWhenHidden: false },
	);
	currentPanel = panel;
	panel.onDidDispose(() => {
		currentPanel = undefined;
	});
	panel.webview.onDidReceiveMessage((message: unknown) => {
		void handleMessage(panel, store, options, message);
	});
	void renderPanel(panel, store);
}

async function renderPanel(
	panel: vscode.WebviewPanel,
	store: AudioProxyConfigStore,
): Promise<void> {
	panel.webview.html = getAudioProxyPanelHtml(panel.webview, await getState(store));
}

async function postState(panel: vscode.WebviewPanel, store: AudioProxyConfigStore): Promise<void> {
	await panel.webview.postMessage({ type: 'state', value: await getState(store) });
}

async function getState(store: AudioProxyConfigStore): Promise<AudioProxyPanelState> {
	return {
		source: getPanelSource(store, getConfigForPanel(store)),
		config: getConfigForPanel(store),
		hasApiKey: await store.hasApiKey(),
	};
}

function getPanelSource(
	store: AudioProxyConfigStore,
	config: AudioProxyConfig | undefined,
): AudioProxySource {
	return store.getSource() ?? (config ? 'api-endpoint' : 'api-endpoint');
}

function getConfigForPanel(store: AudioProxyConfigStore): AudioProxyConfig | undefined {
	try {
		return store.getConfig();
	} catch {
		return undefined;
	}
}

async function handleMessage(
	panel: vscode.WebviewPanel,
	store: AudioProxyConfigStore,
	options: { onDidChange: () => void },
	message: unknown,
): Promise<void> {
	if (!isWebviewMessage(message)) {
		return;
	}
	if (message.type === 'showLogs') {
		logger.show();
		return;
	}
	try {
		if (message.type === 'clearApiKey') {
			await store.deleteApiKey();
			options.onDidChange();
			await panel.webview.postMessage({
				type: 'apiKeyCleared',
				value: { message: t('audio.panel.status.apiKeyCleared') },
			});
			return;
		}
		if (message.type === 'saveConfig') {
			const payload = getWebviewPayload(message.value);
			if (payload.source === 'vscode-lm') {
				await store.saveSource('vscode-lm');
			} else {
				const config = normalizeAudioProxyConfig({
					...payload.config,
					updatedAt: Date.now(),
				});
				await store.saveConfig(config);
				await store.saveSource('api-endpoint');
				if (payload.apiKey) {
					await store.setApiKey(payload.apiKey);
				}
			}
			options.onDidChange();
			await postState(panel, store);
			postStatus(panel, createSavedMessage(payload));
		}
	} catch (error) {
		postStatus(panel, getErrorMessage(error), true);
	}
}

function postStatus(panel: vscode.WebviewPanel, message: string, error = false): void {
	void panel.webview.postMessage({ type: 'status', value: { message, error } });
}

function getErrorMessage(error: unknown): string {
	if (isAudioProxyError(error)) {
		return error.message;
	}
	return error instanceof Error ? error.message : String(error);
}

function isWebviewMessage(value: unknown): value is { type: string; value?: unknown } {
	return typeof value === 'object' && value !== null && 'type' in value;
}

type WebviewPayload = {
	source: AudioProxySource;
	config: Record<string, unknown>;
	apiKey: string | undefined;
};

function getWebviewPayload(value: unknown): WebviewPayload {
	const payload = asRecord(value);
	return {
		source: payload.source === 'vscode-lm' ? 'vscode-lm' : 'api-endpoint',
		config: asRecord(payload.config),
		apiKey: typeof payload.apiKey === 'string' && payload.apiKey.trim() ? payload.apiKey.trim() : undefined,
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function createSavedMessage(payload: WebviewPayload): string {
	if (payload.source === 'vscode-lm') {
		return t('audio.panel.status.vscodeLmSelected');
	}
	return payload.apiKey ? t('audio.panel.status.endpointSavedWithKey') : t('audio.panel.status.endpointSaved');
}
