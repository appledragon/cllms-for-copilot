import { t } from '../../../../i18n';
import type { VisionProxyApiType, VisionProxyProviderFamily } from '../../types';
import {
	createDiagnosticMessage,
	createHttpDiagnosticMessage,
	extractServerMessage,
	formatDiagnosticValue,
	joinDiagnosticParts,
} from './diagnostics';

export type VisionProxyErrorCode =
	| 'missing-configuration'
	| 'invalid-custom-headers'
	| 'invalid-url'
	| 'http-auth'
	| 'http-not-found'
	| 'http-payload-too-large'
	| 'http-rate-limited'
	| 'http-provider'
	| 'timeout'
	| 'cancelled'
	| 'empty-response'
	| 'unsupported-response'
	| 'network';

export interface VisionProxyRequestDiagnostics {
	phase: 'describe';
	providerFamily: VisionProxyProviderFamily;
	apiType: VisionProxyApiType;
	modelId: string;
	endpoint?: URL;
	timeoutMs?: number;
	hasApiKey?: boolean;
	headerNames?: readonly string[];
	imageCount?: number;
	imageBytes?: number;
	promptChars?: number;
	bodyBytes?: number;
}

export class VisionProxyError extends Error {
	constructor(
		readonly code: VisionProxyErrorCode,
		message: string,
		readonly status?: number,
		readonly cause?: unknown,
		readonly diagnosticMessage: string = joinDiagnosticParts(
			status !== undefined ? `kind=http` : `kind=vision`,
			status === undefined ? `code=${code}` : undefined,
			status !== undefined ? `status=${status}` : undefined,
			cause ? `cause=${formatDiagnosticValue(cause)}` : undefined,
		),
	) {
		super(message);
		this.name = 'VisionProxyError';
	}
}

export function isVisionProxyError(error: unknown): error is VisionProxyError {
	return error instanceof VisionProxyError;
}

const HTTP_ERROR_RULES: ReadonlyArray<{
	test: (status: number) => boolean;
	code: VisionProxyErrorCode;
	message: (status: number, target: string) => string;
}> = [
	{
		test: (status) => status === 401 || status === 403,
		code: 'http-auth',
		message: (status) => t('vision.proxy.error.auth', status),
	},
	{
		test: (status) => status === 404,
		code: 'http-not-found',
		message: (_status, target) => t('vision.proxy.error.notFound', target),
	},
	{
		test: (status) => status === 413,
		code: 'http-payload-too-large',
		message: (status) => t('vision.proxy.error.payloadTooLarge', status),
	},
	{
		test: (status) => status === 429,
		code: 'http-rate-limited',
		message: (status) => t('vision.proxy.error.rateLimited', status),
	},
	{
		test: (status) => status >= 500,
		code: 'http-provider',
		message: (status) => t('vision.proxy.error.providerUnavailable', status),
	},
];

export async function createHttpVisionProxyError(
	response: Response,
	context: VisionProxyRequestDiagnostics,
): Promise<VisionProxyError> {
	const responseText = await response.text();
	const serverMessage = extractServerMessage(responseText);
	const target = context.endpoint
		? `${context.endpoint.host}${context.endpoint.pathname}`
		: 'unknown';
	const status = response.status;
	const rule = HTTP_ERROR_RULES.find((candidate) => candidate.test(status));
	const code = rule?.code ?? 'http-provider';
	const message = rule
		? rule.message(status, target)
		: t('vision.proxy.error.requestFailed', status);

	return new VisionProxyError(
		code,
		message,
		status,
		undefined,
		createHttpDiagnosticMessage(code, response, context, serverMessage, responseText),
	);
}

export function createVisionProxyRequestError(
	code: VisionProxyErrorCode,
	message: string,
	context: VisionProxyRequestDiagnostics,
	cause?: unknown,
): VisionProxyError {
	return new VisionProxyError(
		code,
		message,
		undefined,
		cause,
		createDiagnosticMessage(code, context, cause),
	);
}

export function addVisionProxyDiagnostics(
	error: VisionProxyError,
	context: VisionProxyRequestDiagnostics,
): VisionProxyError {
	const enhanced = new VisionProxyError(
		error.code,
		error.message,
		error.status,
		error.cause,
		createDiagnosticMessage(error.code, context, error.cause, error.status),
	);
	enhanced.stack = error.stack;
	return enhanced;
}
