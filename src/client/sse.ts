import type { LlmStreamChunk } from '../types';

/**
 * Typed events emitted by the SSE parser.
 *
 *  - `chunk`        — a successfully parsed streaming completion chunk
 *  - `done`         — the terminal `data: [DONE]` sentinel was received
 *  - `parse-error`  — a `data:` frame could not be parsed as JSON (the caller
 *                     decides whether to log and continue)
 */
export type SseEvent =
	| { readonly type: 'chunk'; readonly data: LlmStreamChunk }
	| { readonly type: 'done' }
	| { readonly type: 'parse-error'; readonly raw: string; readonly error: unknown };

const DATA_FIELD_PREFIX = 'data:';
const DONE_SENTINEL = '[DONE]';

/**
 * Incremental Server-Sent Events parser for OpenAI-compatible chat completion
 * streams.
 *
 * This is a pure, runtime-agnostic helper: it owns only the partial-line buffer
 * and turns decoded text into typed {@link SseEvent}s. Network concerns (fetch,
 * retries, timeouts) and event interpretation (tool-call accumulation, callback
 * dispatch) live in the client core.
 *
 * Handling notes:
 *  - Frames may be split across `push` calls; a trailing partial line is held in
 *    the buffer until the next `push`/`flush`.
 *  - CRLF line endings are supported (the `\r` is trimmed per line).
 *  - SSE comment lines (starting with `:`) and blank lines are ignored.
 *  - Both `data: {…}` and `data:{…}` (no space) field forms are accepted.
 */
export class SseParser {
	private buffer = '';

	/** Feed a decoded text chunk, returning any complete events it produced. */
	push(text: string): SseEvent[] {
		this.buffer += text;

		const events: SseEvent[] = [];
		const lines = this.buffer.split('\n');
		// The final element is an incomplete line (or '' when text ended on '\n');
		// hold it back until more bytes arrive.
		this.buffer = lines.pop() ?? '';

		for (const line of lines) {
			const event = parseLine(line);
			if (event) {
				events.push(event);
			}
		}
		return events;
	}

	/**
	 * Parse any remaining buffered line. Call after the stream ends to handle a
	 * final frame that was not terminated by a newline.
	 */
	flush(): SseEvent[] {
		if (!this.buffer) {
			return [];
		}
		const line = this.buffer;
		this.buffer = '';
		const event = parseLine(line);
		return event ? [event] : [];
	}
}

function parseLine(line: string): SseEvent | undefined {
	// `trim` also strips the trailing '\r' from CRLF streams.
	const trimmed = line.trim();

	if (!trimmed || trimmed.startsWith(':')) {
		return undefined;
	}

	if (!trimmed.startsWith(DATA_FIELD_PREFIX)) {
		// Non-`data:` SSE fields (event:, id:, retry:) are not used by the API.
		return undefined;
	}

	const payload = trimmed.slice(DATA_FIELD_PREFIX.length).trim();
	if (payload === DONE_SENTINEL) {
		return { type: 'done' };
	}

	try {
		const data = JSON.parse(payload) as LlmStreamChunk;
		return { type: 'chunk', data };
	} catch (error) {
		return { type: 'parse-error', raw: payload, error };
	}
}
