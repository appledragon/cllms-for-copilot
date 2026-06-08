import { MAX_DIAGNOSTIC_FIELD_LENGTH } from '../../../../client/consts';
import { getNetworkErrorCauseInfo, getNetworkErrorCode } from '../../../../client/error/network';
import { safeStringify } from '../../../../json';
import { isRecord } from '../../shared';
import type { VisionProxyErrorCode, VisionProxyRequestDiagnostics } from './error';

export function createHttpDiagnosticMessage(
	code: VisionProxyErrorCode,
	response: Response,
	context: VisionProxyRequestDiagnostics,
	serverMessage: string | undefined,
	responseText: string,
): string {
	return joinDiagnosticParts(
		createDiagnosticMessage(code, context, undefined, response.status),
		`statusText=${safeDiagnosticString(response.statusText || 'unknown')}`,
		serverMessage ? `serverMessage=${safeDiagnosticString(serverMessage)}` : undefined,
		responseText && responseText !== serverMessage
			? `body=${safeDiagnosticString(responseText)}`
			: undefined,
	);
}

export function createDiagnosticMessage(
	code: VisionProxyErrorCode,
	context: VisionProxyRequestDiagnostics,
	cause?: unknown,
	status?: number,
): string {
	const kind = getDiagnosticKind(code, status);
	const causeInfo = cause instanceof Error ? getNetworkErrorCauseInfo(cause) : undefined;
	const networkCode = getNetworkErrorCode(causeInfo);
	return joinDiagnosticParts(
		`kind=${kind}`,
		kind === 'network' ? `code=${networkCode ?? getFallbackNetworkCode(code)}` : undefined,
		status !== undefined ? `status=${status}` : undefined,
		`phase=${context.phase}`,
		`providerFamily=${safeDiagnosticString(context.providerFamily)}`,
		`apiType=${safeDiagnosticString(context.apiType)}`,
		`model=${safeDiagnosticString(context.modelId)}`,
		context.endpoint ? `endpoint=${safeDiagnosticString(context.endpoint.toString())}` : undefined,
		context.timeoutMs !== undefined ? `timeoutMs=${context.timeoutMs}` : undefined,
		context.hasApiKey !== undefined ? `hasApiKey=${context.hasApiKey}` : undefined,
		context.headerNames ? `headerNames=${formatDiagnosticValue(context.headerNames)}` : undefined,
		context.imageCount !== undefined ? `imageCount=${context.imageCount}` : undefined,
		context.imageBytes !== undefined ? `imageBytes=${context.imageBytes}` : undefined,
		context.promptChars !== undefined ? `promptChars=${context.promptChars}` : undefined,
		context.bodyBytes !== undefined ? `bodyBytes=${context.bodyBytes}` : undefined,
		cause instanceof Error ? `message=${safeDiagnosticString(cause.message)}` : undefined,
		cause ? `cause=${formatDiagnosticCause(cause)}` : undefined,
	);
}

function getDiagnosticKind(
	code: VisionProxyErrorCode,
	status: number | undefined,
): 'http' | 'network' | 'cancelled' | 'vision' {
	if (status !== undefined || code.startsWith('http-')) {
		return 'http';
	}
	if (code === 'network' || code === 'timeout') {
		return 'network';
	}
	if (code === 'cancelled') {
		return 'cancelled';
	}
	return 'vision';
}

export function getFallbackNetworkCode(code: VisionProxyErrorCode): string {
	return code === 'timeout' ? 'TIMEOUT' : 'UNKNOWN';
}

export function extractServerMessage(responseText: string): string | undefined {
	if (!responseText) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(responseText) as unknown;
		return findServerMessage(parsed);
	} catch {
		return truncateSingleLine(responseText);
	}
}

function findServerMessage(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return truncateSingleLine(value);
	}
	if (!isRecord(value)) {
		return undefined;
	}

	const direct = getStringProperty(value, 'message') ?? getStringProperty(value, 'detail');
	if (direct) {
		return truncateSingleLine(direct);
	}

	const error = value.error;
	if (isRecord(error)) {
		const nested = getStringProperty(error, 'message') ?? getStringProperty(error, 'detail');
		if (nested) {
			return truncateSingleLine(nested);
		}
	}

	return undefined;
}

export function formatDiagnosticCause(cause: unknown): string {
	if (cause instanceof Error) {
		return (
			getNetworkErrorCauseInfo(cause)?.value ??
			formatDiagnosticValue({
				name: cause.name,
				message: cause.message,
				...Object.fromEntries(Object.entries(cause)),
			})
		);
	}
	return formatDiagnosticValue(cause);
}

export function formatDiagnosticValue(value: unknown): string {
	try {
		return truncateSingleLine(safeStringify(value));
	} catch {
		return safeDiagnosticString(String(value));
	}
}

export function safeDiagnosticString(value: string): string {
	return safeStringify(truncateSingleLine(value));
}

function truncateSingleLine(value: string): string {
	const singleLine = value.replace(/\s+/gu, ' ').trim();
	return singleLine.length > MAX_DIAGNOSTIC_FIELD_LENGTH
		? `${singleLine.slice(0, MAX_DIAGNOSTIC_FIELD_LENGTH)}...`
		: singleLine;
}

function getStringProperty(value: Record<string, unknown>, key: string): string | undefined {
	const property = value[key];
	return typeof property === 'string' && property.length > 0 ? property : undefined;
}

export function joinDiagnosticParts(...parts: (string | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}
