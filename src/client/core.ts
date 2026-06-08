import type { CancellationToken } from 'vscode';
import { safeStringify } from '../json';
import { logger } from '../logger';
import type {
	LlmRequest,
	LlmStreamChunk,
	LlmToolCall,
	ProviderId,
	StreamCallbacks,
} from '../types';
import { DEFAULT_IDLE_TIMEOUT_MS, DEFAULT_MAX_RETRIES } from './consts';
import { createHttpError, formatRequestError, normalizeRequestError } from './error';
import { getRetryDelayMs, isRetryableError } from './retry';
import { SseParser } from './sse';

export interface LlmClientOptions {
	/** Provider that owns this client, threaded into error action links. */
	providerId?: ProviderId;
	/** Maximum automatic retries before the first byte is delivered. */
	maxRetries?: number;
	/** Abort an attempt if no chunk arrives within this many ms. */
	idleTimeoutMs?: number;
}

/**
 * Lightweight SSE-streaming API client.
 * No external dependencies — uses Node's built-in fetch.
 */
export class LlmClient {
	private readonly providerId?: ProviderId;
	private readonly maxRetries: number;
	private readonly idleTimeoutMs: number;

	constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string,
		options: LlmClientOptions = {},
	) {
		this.providerId = options.providerId;
		this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
		this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
	}

	/**
	 * Stream a chat completion from the API.
	 *
	 * Parses SSE chunks and dispatches callbacks for content, thinking, and tool
	 * calls. Transient failures (429, 5xx, network blips, idle timeouts) are
	 * retried with exponential backoff + jitter — but only while no output has
	 * been delivered yet, so a mid-stream failure never duplicates output.
	 */
	async streamChatCompletion(
		request: LlmRequest,
		callbacks: StreamCallbacks,
		cancellationToken?: CancellationToken,
	): Promise<void> {
		// Shared across attempts: once any visible output is delivered we must
		// never retry (a fresh response would duplicate what the user has seen).
		const output = { delivered: false };
		const guardedCallbacks = wrapWithOutputGuard(callbacks, output);

		let attempt = 0;
		while (true) {
			try {
				await this.runAttempt(request, guardedCallbacks, cancellationToken);
				return;
			} catch (error) {
				if (isCancellation(error, cancellationToken)) {
					return;
				}

				const normalizedError = normalizeRequestError(error, {
					baseUrl: this.baseUrl,
					request,
					providerId: this.providerId,
				});

				const canRetry =
					!output.delivered && attempt < this.maxRetries && isRetryableError(normalizedError);
				if (canRetry) {
					attempt += 1;
					const delayMs = getRetryDelayMs(normalizedError, attempt);
					logger.warn(
						`Retrying request (attempt ${attempt}/${this.maxRetries}) after ${delayMs}ms: ${formatRequestError(normalizedError)}`,
					);
					await delay(delayMs, cancellationToken);
					if (cancellationToken?.isCancellationRequested) {
						return;
					}
					continue;
				}

				logger.error('Request failed:', formatRequestError(normalizedError));
				callbacks.onError(normalizedError);
				return;
			}
		}
	}

	/**
	 * Fetch the provider's advertised model list via `GET {baseUrl}/models`.
	 *
	 * Used by the connection test / model-discovery command for a fast key +
	 * endpoint validation. Errors are normalized like streaming requests so the
	 * caller can surface provider-aware action links. Returns the model IDs the
	 * endpoint reports (empty array when the endpoint omits a usable list).
	 */
	async listModels(cancellationToken?: CancellationToken): Promise<string[]> {
		const controller = new AbortController();
		const cancelListener = cancellationToken?.onCancellationRequested(() => controller.abort());
		if (cancellationToken?.isCancellationRequested) {
			controller.abort();
		}

		const timer =
			this.idleTimeoutMs > 0
				? setTimeout(() => controller.abort(), this.idleTimeoutMs)
				: undefined;

		try {
			const response = await fetch(`${this.baseUrl}/models`, {
				method: 'GET',
				headers: { Authorization: `Bearer ${this.apiKey}` },
				signal: controller.signal,
			});

			if (!response.ok) {
				throw await createHttpError(response, {
					baseUrl: this.baseUrl,
					request: { model: '', messages: [], stream: false },
					providerId: this.providerId,
				});
			}

			const payload: unknown = await response.json();
			return extractModelIds(payload);
		} catch (error) {
			throw normalizeRequestError(error, {
				baseUrl: this.baseUrl,
				request: { model: '', messages: [], stream: false },
				providerId: this.providerId,
			});
		} finally {
			clearTimeout(timer);
			cancelListener?.dispose();
		}
	}

	/** Run a single fetch + stream attempt. Throws on any failure. */
	private async runAttempt(
		request: LlmRequest,
		callbacks: StreamCallbacks,
		cancellationToken?: CancellationToken,
	): Promise<void> {
		const controller = new AbortController();
		// Reasons the controller may abort, so the catch block can tell user
		// cancellation apart from an idle timeout (which is retryable).
		const abortState = { timedOut: false };

		const cancelListener = cancellationToken?.onCancellationRequested(() => controller.abort());
		if (cancellationToken?.isCancellationRequested) {
			controller.abort();
		}

		let idleTimer: ReturnType<typeof setTimeout> | undefined;
		const armIdleTimer = () => {
			if (this.idleTimeoutMs <= 0) {
				return;
			}
			clearTimeout(idleTimer);
			idleTimer = setTimeout(() => {
				abortState.timedOut = true;
				controller.abort();
			}, this.idleTimeoutMs);
		};

		try {
			const requestBody = {
				...request,
				// Request usage stats in streaming responses for token calibration.
				stream_options: { include_usage: true },
			};

			armIdleTimer();
			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: safeStringify(requestBody),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw await createHttpError(response, {
					baseUrl: this.baseUrl,
					request,
					providerId: this.providerId,
				});
			}

			if (!response.body) {
				throw new Error('No response body received');
			}

			await this.consumeStream(response.body, callbacks, cancellationToken, controller, armIdleTimer);
		} catch (error) {
			if (abortState.timedOut && isAbortError(error)) {
				throw createIdleTimeoutError(this.idleTimeoutMs);
			}
			throw error;
		} finally {
			clearTimeout(idleTimer);
			cancelListener?.dispose();
		}
	}

	private async consumeStream(
		body: ReadableStream<Uint8Array>,
		callbacks: StreamCallbacks,
		cancellationToken: CancellationToken | undefined,
		controller: AbortController,
		armIdleTimer: () => void,
	): Promise<void> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		const parser = new SseParser();

		// Accumulate tool call deltas by index, then emit on finish.
		const pendingToolCalls = new Map<number, LlmToolCall>();

		while (true) {
			if (cancellationToken?.isCancellationRequested) {
				controller.abort();
				return;
			}

			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			armIdleTimer();

			const events = parser.push(decoder.decode(value, { stream: true }));
			for (const event of events) {
				if (event.type === 'done') {
					flushToolCalls(pendingToolCalls, callbacks);
					callbacks.onDone();
					return;
				}
				if (event.type === 'parse-error') {
					logger.error('Failed to parse SSE chunk:', event.raw.slice(0, 200), event.error);
					continue;
				}
				dispatchChunk(event.data, pendingToolCalls, callbacks);
			}
		}

		callbacks.onDone();
	}
}

/** Extract model IDs from an OpenAI-compatible `GET /models` response body. */
function extractModelIds(payload: unknown): string[] {
	const data = (payload as { data?: unknown })?.data;
	if (!Array.isArray(data)) {
		return [];
	}
	return data
		.map((entry) => (entry as { id?: unknown })?.id)
		.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function dispatchChunk(
	chunk: LlmStreamChunk,
	pendingToolCalls: Map<number, LlmToolCall>,
	callbacks: StreamCallbacks,
): void {
	const choice = chunk.choices?.[0];

	// Usage stats for token-count calibration arrive on their own chunk.
	if (chunk.usage && callbacks.onUsage) {
		callbacks.onUsage(chunk.usage);
	}

	if (!choice) {
		return;
	}

	// Thinking content → correct field name so VS Code renders collapsible blocks.
	const reasoning = choice.delta.reasoning_content;
	if (reasoning) {
		callbacks.onThinking(reasoning);
	}

	if (choice.delta.content) {
		callbacks.onContent(choice.delta.content);
	}

	if (choice.delta.tool_calls) {
		for (const tc of choice.delta.tool_calls) {
			let pending = pendingToolCalls.get(tc.index);
			if (!pending && tc.id) {
				pending = {
					id: tc.id,
					type: 'function',
					function: { name: '', arguments: '' },
				};
				pendingToolCalls.set(tc.index, pending);
			}
			if (pending) {
				if (tc.function?.name) {
					pending.function.name += tc.function.name;
				}
				if (tc.function?.arguments) {
					pending.function.arguments += tc.function.arguments;
				}
			}
		}
	}

	if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
		flushToolCalls(pendingToolCalls, callbacks);
	}
}

function flushToolCalls(
	pendingToolCalls: Map<number, LlmToolCall>,
	callbacks: StreamCallbacks,
): void {
	for (const tc of pendingToolCalls.values()) {
		callbacks.onToolCall(tc);
	}
	pendingToolCalls.clear();
}

/**
 * Wrap callbacks so that any visible output flips a shared flag. Used to gate
 * retries: once content/thinking/tool output is delivered, retrying would
 * duplicate it.
 */
function wrapWithOutputGuard(
	callbacks: StreamCallbacks,
	output: { delivered: boolean },
): StreamCallbacks {
	return {
		...callbacks,
		onContent: (content) => {
			output.delivered = true;
			callbacks.onContent(content);
		},
		onThinking: (text) => {
			output.delivered = true;
			callbacks.onThinking(text);
		},
		onToolCall: (toolCall) => {
			output.delivered = true;
			callbacks.onToolCall(toolCall);
		},
	};
}

function delay(ms: number, cancellationToken?: CancellationToken): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			listener?.dispose();
			resolve();
		}, ms);
		const listener = cancellationToken?.onCancellationRequested(() => {
			clearTimeout(timer);
			resolve();
		});
	});
}

function createIdleTimeoutError(idleTimeoutMs: number): Error {
	// Shaped so normalizeRequestError classifies it as a retryable timeout.
	const error = new Error(`No response received within ${idleTimeoutMs}ms`);
	(error as Error & { cause?: unknown }).cause = { code: 'ETIMEDOUT' };
	return error;
}

function isCancellation(error: unknown, cancellationToken?: CancellationToken): boolean {
	return isAbortError(error) && (cancellationToken?.isCancellationRequested ?? false);
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}
