import { t } from '../../../i18n';
import { postJsonWithTimeout, runRetriableProxyTask } from '../../proxy/client';
import { createProviderHeaders } from './headers';
import { AudioProxyError, mapAudioProxyHttpError } from './errors';
import { getAudioProviderAdapter } from './providers';
import { resolveAudioEndpoint } from './url';
import type { AudioProxyConfig, AudioTranscriptionRequest } from '../types';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface AudioProxyRequestOptions {
	timeoutMs?: number;
	maxRetries?: number;
}

export class AudioProxyClient {
	async transcribe(
		config: AudioProxyConfig,
		apiKey: string | undefined,
		request: AudioTranscriptionRequest,
		options: AudioProxyRequestOptions = {},
	): Promise<string> {
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const maxRetries = Math.max(0, options.maxRetries ?? 0);
		return runRetriableProxyTask({
			token: request.token,
			maxRetries,
			task: () => this.transcribeOnce(config, apiKey, request, timeoutMs),
			isTypedError: isAudioProxyError,
			isRetryable,
		});
	}

	private async transcribeOnce(
		config: AudioProxyConfig,
		apiKey: string | undefined,
		request: AudioTranscriptionRequest,
		timeoutMs: number,
	): Promise<string> {
		if (request.token.isCancellationRequested) {
			throw new AudioProxyError('cancelled', t('audio.proxy.error.cancelled'));
		}
		const endpoint = resolveAudioEndpoint(config.url);
		const adapter = getAudioProviderAdapter(config);
		const body = adapter.createBody(config, request);
		const headers = createProviderHeaders(config, apiKey?.trim() || undefined);
		const value = await postJsonWithTimeout(endpoint, {
			headers,
			body,
			timeoutMs,
			token: request.token,
			readResponse: (response) => response.json() as Promise<unknown>,
			createHttpError: (response) =>
				mapAudioProxyHttpError(response.status, `${endpoint.host}${endpoint.pathname}`),
			isTypedError: isAudioProxyError,
			createCancelledError: (error) =>
				new AudioProxyError('cancelled', t('audio.proxy.error.cancelled'), undefined, error),
			createTimeoutError: (error) =>
				new AudioProxyError('timeout', t('audio.proxy.error.timeout'), undefined, error),
			createAbortError: (error) =>
				new AudioProxyError('network', t('audio.proxy.error.network.generic', 'ABORTED'), undefined, error),
			createUnknownError: (error) =>
				new AudioProxyError('network', t('audio.proxy.error.network.generic', 'UNKNOWN'), undefined, error),
		});
		return adapter.parseResponse(value);
	}
}

function isRetryable(error: AudioProxyError): boolean {
	return error.code === 'timeout' || error.code === 'network' || error.status === 429 || (error.status ?? 0) >= 500;
}

function isAudioProxyError(error: unknown): error is AudioProxyError {
	return error instanceof AudioProxyError;
}
