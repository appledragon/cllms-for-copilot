import { getNetworkErrorCauseInfo, getNetworkErrorCode } from '../../../../client/error/network';
import {
	formatDiagnosticCause,
	formatDiagnosticValue,
	getFallbackNetworkCode,
	joinDiagnosticParts,
	safeDiagnosticString,
} from './diagnostics';
import { VisionProxyError, type VisionProxyErrorCode } from './error';

export function formatVisionProxyError(error: unknown): string {
	if (error instanceof VisionProxyError) {
		return error.stack ? `${error.diagnosticMessage}\n${error.stack}` : error.diagnosticMessage;
	}
	if (error instanceof Error) {
		const message = joinDiagnosticParts(
			`kind=unknown`,
			`message=${safeDiagnosticString(error.message)}`,
			error.cause !== undefined ? `cause=${formatDiagnosticCause(error.cause)}` : undefined,
		);
		return error.stack ? `${message}\n${error.stack}` : message;
	}
	return joinDiagnosticParts(`kind=unknown`, `value=${formatDiagnosticValue(error)}`);
}

export function getVisionProxyErrorDisplayCode(error: unknown): string {
	if (error instanceof VisionProxyError) {
		if (error.status !== undefined) {
			return String(error.status);
		}

		const causeInfo =
			error.cause instanceof Error && !(error.cause instanceof VisionProxyError)
				? getNetworkErrorCauseInfo(error.cause)
				: undefined;
		return getNetworkErrorCode(causeInfo) ?? getFallbackVisionProxyErrorCode(error.code);
	}

	if (error instanceof Error) {
		return getNetworkErrorCode(getNetworkErrorCauseInfo(error)) ?? 'UNKNOWN';
	}

	return 'UNKNOWN';
}

export function formatVisionProxyDisplayMessage(errorCode: string, errorMessage: string): string {
	const normalizedErrorCode = normalizeVisionProxyDisplayCode(errorCode);
	return `[${normalizedErrorCode}] ${stripTrailingErrorCode(errorMessage, normalizedErrorCode)}`;
}

export function formatVisionProxyErrorCode(code: VisionProxyErrorCode): string {
	return code.toUpperCase().replaceAll('-', '_');
}

function getFallbackVisionProxyErrorCode(code: VisionProxyErrorCode): string {
	return code === 'network' || code === 'timeout'
		? getFallbackNetworkCode(code)
		: formatVisionProxyErrorCode(code);
}

function normalizeVisionProxyDisplayCode(errorCode: string): string {
	return errorCode.replace(/[\r\n[\]]/gu, '').trim() || 'UNKNOWN';
}

function stripTrailingErrorCode(errorMessage: string, errorCode: string): string {
	const escapedErrorCode = escapeRegExp(errorCode);
	return errorMessage.replace(new RegExp(`\\s*\\(${escapedErrorCode}\\)([。.]?)$`, 'u'), '$1');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
