import vscode from 'vscode';
import { getAudioProxyTimeoutMs, getMaxRetries } from '../../config';
import { t } from '../../i18n';
import { logger } from '../../logger';
import { createCachingAudioTranscriber, AudioTranscriptionCache } from './cache';
import { createEndpointAudioTranscriber } from './sources/endpoint';
import {
	AUDIO_PROXY_API_KEY_SECRET,
	AudioProxyConfigStore,
} from './sources/endpoint/config';
import type { AudioProxyConfig, AudioTranscriber } from './types';
import { AudioProxyError, isAudioProxyError } from './protocols/errors';

interface ApiEndpointConfigResult {
	config?: AudioProxyConfig;
	error?: unknown;
}

export function createAudioService(context: vscode.ExtensionContext): {
	get: () => Promise<AudioTranscriber | undefined>;
	reset: () => void;
	openConfiguration: () => Promise<void>;
} {
	const store = new AudioProxyConfigStore(context);
	const transcriptionCache = new AudioTranscriptionCache();
	const withCache = (transcriber: AudioTranscriber | undefined): AudioTranscriber | undefined =>
		transcriber ? createCachingAudioTranscriber(transcriber, transcriptionCache) : undefined;
	const reset = (): void => {
		transcriptionCache.clear();
	};
	context.subscriptions.push(
		context.secrets.onDidChange((event) => {
			if (event.key === AUDIO_PROXY_API_KEY_SECRET) {
				reset();
			}
		}),
	);

	return {
		async get() {
			const source = store.getSource();
			if (source === 'vscode-lm') {
				return undefined;
			}
			const result = getApiEndpointConfig(store);
			if (!result.config) {
				if (!result.error) {
					return undefined;
				}
				return withCache(createInvalidApiEndpointTranscriber(result.error));
			}
			const apiKey = await store.getApiKey();
			return withCache(createEndpointAudioTranscriber(result.config, apiKey, {
				timeoutMs: getAudioProxyTimeoutMs(),
				maxRetries: getMaxRetries(),
			}));
		},
		reset,
		async openConfiguration() {
			const { openAudioProxyPanel } = await import('./ui/panel');
			openAudioProxyPanel(context, { onDidChange: reset });
		},
	};
}

function getApiEndpointConfig(store: AudioProxyConfigStore): ApiEndpointConfigResult {
	try {
		return { config: store.getConfig() };
	} catch (error) {
		logger.warn(`Invalid audio proxy API endpoint configuration; source=${store.getSource() ?? 'unset'}`);
		return { error };
	}
}

function createInvalidApiEndpointTranscriber(error: unknown): AudioTranscriber {
	return {
		id: 'api-endpoint:invalid-configuration',
		source: 'api-endpoint',
		async transcribe(): Promise<string> {
			if (isAudioProxyError(error)) {
				throw error;
			}
			throw new AudioProxyError(
				'missing-configuration',
				t('audio.proxy.error.configurationInvalid'),
				undefined,
				error,
			);
		},
	};
}
