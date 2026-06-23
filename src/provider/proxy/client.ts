import type { CancellationToken } from 'vscode';
import { RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from '../../client/consts';
import { safeStringify } from '../../json';

export async function runRetriableProxyTask<T, E extends Error>(options: {
	token: CancellationToken;
	maxRetries: number;
	task: () => Promise<T>;
	isRetryable: (error: E) => boolean;
	isTypedError: (error: unknown) => error is E;
}): Promise<T> {
	let attempt = 0;
	for (;;) {
		try {
			return await options.task();
		} catch (error) {
			attempt += 1;
			if (
				attempt > options.maxRetries ||
				options.token.isCancellationRequested ||
				!options.isTypedError(error) ||
				!options.isRetryable(error)
			) {
				throw error;
			}
			await delayWithCancellation(getRetryDelayMs(attempt), options.token);
			if (options.token.isCancellationRequested) {
				throw error;
			}
		}
	}
}

export async function postJsonWithTimeout<T, E extends Error>(
	endpoint: URL,
	options: {
		headers: Record<string, string>;
		body: object;
		timeoutMs: number;
		token: CancellationToken;
		onBodySerialized?: (bodyText: string) => void;
		readResponse: (response: Response) => Promise<T>;
		createHttpError: (response: Response) => Promise<E> | E;
		isTypedError: (error: unknown) => error is E;
		createCancelledError: (cause: unknown) => E;
		createTimeoutError: (cause: unknown) => E;
		createAbortError: (cause: unknown) => E;
		createUnknownError: (cause: unknown) => E;
	},
): Promise<T> {
	const controller = new AbortController();
	let timeoutReached = false;
	const timeout = setTimeout(() => {
		timeoutReached = true;
		controller.abort();
	}, options.timeoutMs);
	const cancelListener = options.token.onCancellationRequested(() => controller.abort());

	try {
		const bodyText = safeStringify(options.body);
		options.onBodySerialized?.(bodyText);
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: options.headers,
			body: bodyText,
			signal: controller.signal,
		});
		if (!response.ok) {
			throw await options.createHttpError(response);
		}
		return await options.readResponse(response);
	} catch (error) {
		if (options.token.isCancellationRequested) {
			throw options.createCancelledError(error);
		}
		if (timeoutReached) {
			throw options.createTimeoutError(error);
		}
		if (options.isTypedError(error)) {
			throw error;
		}
		if (isAbortError(error)) {
			throw options.createAbortError(error);
		}
		throw options.createUnknownError(error);
	} finally {
		clearTimeout(timeout);
		cancelListener.dispose();
	}
}

function getRetryDelayMs(attempt: number): number {
	const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
	return Math.round(Math.random() * exponential);
}

function delayWithCancellation(ms: number, token: CancellationToken): Promise<void> {
	if (ms <= 0) {
		return Promise.resolve();
	}
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

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}
