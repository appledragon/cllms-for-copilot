import { RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from './consts';
import { LlmRequestError } from './error';
import { getNetworkErrorCategory } from './error/network';

export function isRetryableError(error: Error): boolean {
	if (!(error instanceof LlmRequestError)) {
		return false;
	}

	if (error.kind === 'http') {
		if (error.code === 'HTTP_429_QUOTA') {
			return false;
		}
		return error.status === 429 || (error.status !== undefined && error.status >= 500);
	}

	if (error.kind === 'network') {
		// Transient transport failures are worth retrying; DNS/TLS/config errors
		// almost never recover within a few hundred ms.
		const category = getNetworkErrorCategory(error.code);
		return category === 'interrupted' || category === 'timeout' || category === 'unreachable';
	}

	return false;
}

export function getRetryDelayMs(error: Error, attempt: number): number {
	if (error instanceof LlmRequestError && error.retryAfterMs !== undefined) {
		return Math.min(error.retryAfterMs, RETRY_MAX_DELAY_MS);
	}

	// Exponential backoff with full jitter.
	const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
	return Math.round(Math.random() * exponential);
}
