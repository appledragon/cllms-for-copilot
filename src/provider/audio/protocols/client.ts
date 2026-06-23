import type { CancellationToken } from 'vscode';
import { RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from '../../../client/consts';
import { t } from '../../../i18n';
import { safeStringify } from '../../../json';
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
		let attempt = 0;

		for (;;) {
			try {
				return await this.transcribeOnce(config, apiKey, request, timeoutMs);
			} catch (error) {
				attempt += 1;
				if (
					attempt > maxRetries ||
					request.token.isCancellationRequested ||
					!(error instanceof AudioProxyError) ||
					!isRetryable(error)
				) {
					throw error;
				}
				await delay(getRetryDelayMs(attempt), request.token);
			}
		}
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
		const value = await postJson(endpoint, {
			headers,
			body,
			timeoutMs,
			token: request.token,
		});
		return adapter.parseResponse(value);
	}
}

function isRetryable(error: AudioProxyError): boolean {
	return error.code === 'timeout' || error.code === 'network' || error.status === 429 || (error.status ?? 0) >= 500;
}

async function postJson(
	endpoint: URL,
	options: {
		headers: Record<string, string>;
		body: object;
		timeoutMs: number;
		token: CancellationToken;
	},
): Promise<unknown> {
	const controller = new AbortController();
	let timeoutReached = false;
	const timeout = setTimeout(() => {
		timeoutReached = true;
		controller.abort();
	}, options.timeoutMs);
	const cancelListener = options.token.onCancellationRequested(() => controller.abort());
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: options.headers,
			body: safeStringify(options.body),
			signal: controller.signal,
		});
		if (!response.ok) {
			throw mapAudioProxyHttpError(response.status, `${endpoint.host}${endpoint.pathname}`);
		}
		return (await response.json()) as unknown;
	} catch (error) {
		if (options.token.isCancellationRequested) {
			throw new AudioProxyError('cancelled', t('audio.proxy.error.cancelled'), undefined, error);
		}
		if (timeoutReached) {
			throw new AudioProxyError('timeout', t('audio.proxy.error.timeout'), undefined, error);
		}
		if (error instanceof AudioProxyError) {
			throw error;
		}
		throw new AudioProxyError('network', t('audio.proxy.error.network.generic', 'UNKNOWN'), undefined, error);
	} finally {
		clearTimeout(timeout);
		cancelListener.dispose();
	}
}

function getRetryDelayMs(attempt: number): number {
	const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
	return Math.round(Math.random() * exponential);
}

function delay(ms: number, token: CancellationToken): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			listener.dispose();
			resolve();
		}, ms);
		const listener = token.onCancellationRequested(() => {
			clearTimeout(timer);
			listener.dispose();
			resolve();
		});
	});
}
