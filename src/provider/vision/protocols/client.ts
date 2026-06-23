import type { CancellationToken } from 'vscode';
import {
	getNetworkErrorCategory,
	getNetworkErrorCauseInfo,
	getNetworkErrorCode,
} from '../../../client/error/network';
import { t } from '../../../i18n';
import { postJsonWithTimeout, runRetriableProxyTask } from '../../proxy/client';
import type { VisionDescriptionRequest, VisionProxyConfig } from '../types';
import {
	addVisionProxyDiagnostics,
	createHttpVisionProxyError,
	createVisionProxyRequestError,
	isVisionProxyError,
	VisionProxyError,
	type VisionProxyRequestDiagnostics,
} from './errors';
import { createProviderHeaders } from './headers';
import { getVisionProviderAdapter } from './providers';
import { resolveVisionEndpoint } from './url';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface VisionProxyRequestOptions {
	/** Per-attempt request timeout (ms). Falls back to the built-in default. */
	timeoutMs?: number;
	/** Extra attempts after the first for transient (429 / 5xx / network) failures. */
	maxRetries?: number;
}

export class VisionProxyClient {
	async describe(
		config: VisionProxyConfig,
		apiKey: string | undefined,
		request: VisionDescriptionRequest,
		options: VisionProxyRequestOptions = {},
	): Promise<string> {
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const maxRetries = Math.max(0, options.maxRetries ?? 0);
		return runRetriableProxyTask({
			token: request.token,
			maxRetries,
			task: () => this.describeOnce(config, apiKey, request, timeoutMs),
			isTypedError: isVisionProxyError,
			isRetryable: isRetryableVisionProxyError,
		});
	}

	private async describeOnce(
		config: VisionProxyConfig,
		apiKey: string | undefined,
		request: VisionDescriptionRequest,
		timeoutMs: number,
	): Promise<string> {
		if (request.token.isCancellationRequested) {
			throw new VisionProxyError('cancelled', t('vision.proxy.error.cancelled'));
		}

		const endpoint = resolveVisionEndpoint(config);
		const adapter = getVisionProviderAdapter(config);
		const body = adapter.createBody(config, request);
		const headers = createProviderHeaders(config, apiKey?.trim() || undefined);
		const context = createVisionProxyRequestDiagnostics(
			'describe',
			config,
			endpoint,
			headers,
			request,
			apiKey,
			timeoutMs,
		);
		const responseValue = await postJsonWithTimeout(endpoint, {
			headers,
			body,
			timeoutMs,
			token: request.token,
			onBodySerialized: (bodyText) => {
				context.bodyBytes = Buffer.byteLength(bodyText, 'utf8');
			},
			readResponse: async (response) => {
				const responseText = await response.text();
				try {
					return JSON.parse(responseText) as unknown;
				} catch (error) {
					throw createVisionProxyRequestError(
						'unsupported-response',
						getUnsupportedResponseMessage(context),
						context,
						error,
					);
				}
			},
			createHttpError: (response) => createHttpVisionProxyError(response, context),
			isTypedError: isVisionProxyError,
			createCancelledError: (error) =>
				createVisionProxyRequestError('cancelled', t('vision.proxy.error.cancelled'), context, error),
			createTimeoutError: (error) =>
				createVisionProxyRequestError('timeout', t('vision.proxy.error.timeout'), context, error),
			createAbortError: (error) => createVisionProxyNetworkError(error, context, 'aborted'),
			createUnknownError: (error) => createVisionProxyNetworkError(error, context),
		});

		try {
			return adapter.parseResponse(responseValue);
		} catch (error) {
			if (error instanceof VisionProxyError) {
				throw addVisionProxyDiagnostics(error, context);
			}
			throw error;
		}
	}
}

/**
 * Mirrors the main client's retry policy: retry HTTP 429 / 5xx, our own request
 * timeout, and transient transport failures (interrupted/timeout/unreachable).
 * Auth, not-found, payload-too-large, DNS, TLS, cancellation, and malformed
 * responses are treated as permanent.
 */
function isRetryableVisionProxyError(error: VisionProxyError): boolean {
	if (error.status !== undefined) {
		return error.status === 429 || error.status >= 500;
	}
	if (error.code === 'timeout') {
		return true;
	}
	if (error.code === 'network') {
		const causeInfo =
			error.cause instanceof Error ? getNetworkErrorCauseInfo(error.cause) : undefined;
		const category = getNetworkErrorCategory(getNetworkErrorCode(causeInfo));
		return category === 'interrupted' || category === 'timeout' || category === 'unreachable';
	}
	return false;
}


function createVisionProxyNetworkError(
	error: unknown,
	context: VisionProxyRequestDiagnostics,
	forcedCategory?: ReturnType<typeof getNetworkErrorCategory>,
): VisionProxyError {
	const causeInfo = error instanceof Error ? getNetworkErrorCauseInfo(error) : undefined;
	const code = getNetworkErrorCode(causeInfo);
	const category = forcedCategory ?? getNetworkErrorCategory(code);
	const displayCode = code ?? 'UNKNOWN';
	if (category === 'timeout') {
		return createVisionProxyRequestError(
			'timeout',
			t('vision.proxy.error.network.timeout', displayCode),
			context,
			error,
		);
	}
	return createVisionProxyRequestError(
		'network',
		t(`vision.proxy.error.network.${category}`, displayCode),
		context,
		error,
	);
}

function createVisionProxyRequestDiagnostics(
	phase: VisionProxyRequestDiagnostics['phase'],
	config: VisionProxyConfig,
	endpoint: URL,
	headers: Record<string, string>,
	request: VisionDescriptionRequest,
	apiKey: string | undefined,
	timeoutMs: number = DEFAULT_TIMEOUT_MS,
): VisionProxyRequestDiagnostics {
	return {
		phase,
		providerFamily: config.providerFamily,
		apiType: config.apiType,
		modelId: config.modelId,
		endpoint,
		timeoutMs,
		hasApiKey: Boolean(apiKey?.trim()),
		headerNames: Object.keys(headers).sort(),
		imageCount: request.images.length,
		imageBytes: request.images.reduce((total, image) => total + image.data.byteLength, 0),
		promptChars: request.prompt.length,
	};
}

function getUnsupportedResponseMessage(context: VisionProxyRequestDiagnostics): string {
	return context.providerFamily === 'anthropic-compatible'
		? t('vision.proxy.error.unsupportedAnthropicResponse')
		: t('vision.proxy.error.unsupportedOpenAIResponse');
}

