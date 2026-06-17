/**
 * End-to-end tests for LlmClient.streamChatCompletion().
 *
 * Covers: successful stream, HTTP errors (401/429/5xx), network exceptions,
 * cancellation, "no retry after first output" invariant, tool call delta
 * aggregation, usage chunk reporting, and [DONE] boundary cases.
 *
 * Retry tests use Math.random=0 for deterministic zero-delay backoff.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { LlmClient } from "../src/client/core";
import { LlmRequestError } from "../src/client/error";
import type { LlmRequest, LlmStreamChunk, LlmToolCall, StreamCallbacks } from "../src/types";

const { CancellationTokenSource } = require("vscode");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.example.com/v1";
const API_KEY = "sk-test-key";

function makeRequest(overrides: Partial<LlmRequest> = {}): LlmRequest {
  return {
    model: "test-model",
    messages: [{ role: "user", content: "hello" }],
    stream: true,
    ...overrides,
  };
}

function contentChunk(content: string): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
}

function thinkingChunk(text: string): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: { reasoning_content: text }, finish_reason: null }],
  };
}

function usageChunk(u: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [],
    usage: u,
  };
}

function toolCallChunk(index: number, id: string, name: string, args: string): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [{ index, id, type: "function", function: { name, arguments: args } }],
        },
        finish_reason: null,
      },
    ],
  };
}

function finishChunk(reason: "stop" | "tool_calls" = "stop"): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: {}, finish_reason: reason }],
  };
}

function sseFrame(chunk: LlmStreamChunk | string): string {
  return typeof chunk === "string" ? `data: ${chunk}\n\n` : `data: ${JSON.stringify(chunk)}\n\n`;
}

/** Build a ReadableStream from SSE frames, each frame delivered as one chunk. */
function buildStreamBody(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = frames.map((f) => encoder.encode(f));
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else {
        controller.close();
      }
    },
  });
}

function mockHttpErrorResponse(status: number, retryAfter?: string): Response {
  return {
    status,
    ok: false,
    statusText:
      status === 401 ? "Unauthorized" : status === 429 ? "Too Many Requests" : "Server Error",
    headers: {
      get: (name: string) => (name.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null),
    },
    body: null,
    text: async () => JSON.stringify({ error: { message: "mock error" } }),
  } as unknown as Response;
}

function recordingCallbacks() {
  const contents: string[] = [];
  const thinkings: string[] = [];
  const toolCalls: LlmToolCall[] = [];
  const usages: Array<{ prompt_tokens: number; completion_tokens: number; total_tokens: number }> =
    [];
  const errorCalls: string[] = [];
  const doneCount = { value: 0 };
  const lastError = { value: undefined as Error | undefined };

  const cbs: StreamCallbacks = {
    onContent: (t) => {
      contents.push(t);
    },
    onThinking: (t) => {
      thinkings.push(t);
    },
    onToolCall: (tc) => {
      toolCalls.push(tc);
    },
    onDone: () => {
      doneCount.value++;
    },
    onError: (e) => {
      errorCalls.push(e instanceof LlmRequestError ? `${e.kind}:${e.status ?? e.code}` : e.message);
      lastError.value = e;
    },
    onUsage: (u) => {
      usages.push(u);
    },
  };
  return { contents, thinkings, toolCalls, usages, errorCalls, doneCount, lastError, cbs };
}

function createNetworkError(code: string, message: string): Error {
  const err = new Error(message);
  (err as Error & { cause?: unknown }).cause = { code };
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LlmClient.streamChatCompletion", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalRandom: typeof Math.random;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalRandom = Math.random;
    Math.random = () => 0;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Math.random = originalRandom;
  });

  // -----------------------------------------------------------------------
  // Successful streams
  // -----------------------------------------------------------------------

  it("streams content chunks and calls onDone on [DONE]", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(contentChunk("Hello")),
          sseFrame(contentChunk(" world")),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, contents, doneCount } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(contents, ["Hello", " world"]);
    assert.equal(doneCount.value, 1);
  });

  it("streams thinking then content", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(thinkingChunk("reason…")),
          sseFrame(contentChunk("answer")),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, contents, thinkings } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(thinkings, ["reason…"]);
    assert.deepEqual(contents, ["answer"]);
  });

  it("reports usage via onUsage", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(usageChunk({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 })),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, usages } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(usages.length, 1);
    assert.equal(usages[0].prompt_tokens, 10);
    assert.equal(usages[0].completion_tokens, 5);
    assert.equal(usages[0].total_tokens, 15);
  });

  it("aggregates tool call deltas", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(toolCallChunk(0, "c1", "search", '{"q":')),
          sseFrame(toolCallChunk(0, "", "", '"hi"}')),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, toolCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(toolCalls.length, 1);
    assert.equal(toolCalls[0].id, "c1");
    assert.equal(toolCalls[0].function.name, "search");
    assert.equal(toolCalls[0].function.arguments, '{"q":"hi"}');
  });

  it("calls onDone when stream ends without [DONE]", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("end"))]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, doneCount } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(doneCount.value, 1);
  });

  // -----------------------------------------------------------------------
  // HTTP errors
  // -----------------------------------------------------------------------

  it("calls onError for HTTP 401 (non-retryable)", async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve(mockHttpErrorResponse(401)));
    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, lastError, errorCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.ok(lastError.value instanceof LlmRequestError);
    assert.equal((lastError.value as LlmRequestError).kind, "http");
    assert.equal((lastError.value as LlmRequestError).status, 401);
    assert.ok(errorCalls.length > 0);
  });

  it("retries HTTP 429 and succeeds", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.resolve(mockHttpErrorResponse(429));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("ok")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, contents, doneCount } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 2);
    assert.deepEqual(contents, ["ok"]);
    assert.equal(doneCount.value, 1);
  });

  it("retries HTTP 503 and succeeds", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.resolve(mockHttpErrorResponse(503));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("ok")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 1, idleTimeoutMs: 0 });
    const { cbs, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(contents, ["ok"]);
  });

  it("calls onError when maxRetries exhausted", async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve(mockHttpErrorResponse(500)));
    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, lastError } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.ok(lastError.value instanceof LlmRequestError);
    assert.equal((lastError.value as LlmRequestError).status, 500);
  });

  it("honours Retry-After header", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.resolve(mockHttpErrorResponse(429, "3"));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("ok")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 1, idleTimeoutMs: 0 });
    const { cbs, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 2);
    assert.deepEqual(contents, ["ok"]);
  });

  // -----------------------------------------------------------------------
  // Network errors
  // -----------------------------------------------------------------------

  it("retries on transient ECONNRESET", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.reject(createNetworkError("ECONNRESET", "reset"));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("ok")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 1, idleTimeoutMs: 0 });
    const { cbs, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(contents, ["ok"]);
  });

  it("does NOT retry DNS error (ENOTFOUND)", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      return Promise.reject(createNetworkError("ENOTFOUND", "dns"));
    });
    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, lastError, errorCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 1);
    assert.ok(lastError.value instanceof LlmRequestError);
    assert.equal((lastError.value as LlmRequestError).kind, "network");
    assert.ok(errorCalls.length > 0);
  });

  it("does NOT retry TLS error (CERT_HAS_EXPIRED)", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      return Promise.reject(createNetworkError("CERT_HAS_EXPIRED", "tls"));
    });
    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, lastError } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 1);
    assert.ok(lastError.value instanceof LlmRequestError);
  });

  // -----------------------------------------------------------------------
  // Cancellation
  // -----------------------------------------------------------------------

  it("cancellation during stream returns without onError", async () => {
    const cts = new CancellationTokenSource();

    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(contentChunk("first")),
          sseFrame(contentChunk("second")),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, contents, errorCalls } = recordingCallbacks();
    const origOnContent = cbs.onContent;
    cbs.onContent = (t) => {
      origOnContent(t);
      cts.cancel();
    };

    await client.streamChatCompletion(makeRequest(), cbs, cts.token);

    assert.deepEqual(contents, ["first"]);
    assert.equal(errorCalls.length, 0);
  });

  it("cancellation between retries aborts", async () => {
    const cts = new CancellationTokenSource();
    let attempts = 0;

    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.resolve(mockHttpErrorResponse(500));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 3, idleTimeoutMs: 0 });
    const { cbs, errorCalls } = recordingCallbacks();
    const promise = client.streamChatCompletion(makeRequest(), cbs, cts.token);

    await new Promise((r) => setTimeout(r, 10));
    cts.cancel();
    await promise;

    assert.equal(errorCalls.length, 0);
  });

  // -----------------------------------------------------------------------
  // "No retry after first output" invariant
  // -----------------------------------------------------------------------

  it("does not retry after onContent delivered", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1)
        return Promise.resolve({
          status: 200,
          ok: true,
          statusText: "OK",
          headers: { get: () => null },
          body: buildStreamBody([sseFrame(contentChunk("visible"))]),
          text: async () => "",
        } as unknown as Response);
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("should not appear")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 1);
    assert.deepEqual(contents, ["visible"]);
  });

  it("does not retry after onThinking then mid-stream error", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) {
        const encoder = new TextEncoder();
        const frame = encoder.encode(sseFrame(thinkingChunk("think")));
        let enqueued = false;
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (!enqueued) {
              controller.enqueue(frame);
              enqueued = true;
            } else {
              controller.error(createNetworkError("ECONNRESET", "reset"));
            }
          },
        });
        return Promise.resolve({
          status: 200,
          ok: true,
          statusText: "OK",
          headers: { get: () => null },
          body,
          text: async () => "",
        } as unknown as Response);
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("nope")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, thinkings, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 1);
    assert.deepEqual(thinkings, ["think"]);
    assert.deepEqual(contents, []);
  });

  it("does not retry after onToolCall delivered", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1)
        return Promise.resolve({
          status: 200,
          ok: true,
          statusText: "OK",
          headers: { get: () => null },
          body: buildStreamBody([sseFrame(toolCallChunk(0, "c1", "fn", "{}")), sseFrame("[DONE]")]),
          text: async () => "",
        } as unknown as Response);
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("nope")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, toolCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 1);
    assert.equal(toolCalls.length, 1);
  });

  it("DOES retry when only onUsage delivered (not visible output)", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) {
        const encoder = new TextEncoder();
        const frame = encoder.encode(
          sseFrame(usageChunk({ prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 })),
        );
        let enqueued = false;
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (!enqueued) {
              controller.enqueue(frame);
              enqueued = true;
            } else {
              controller.error(createNetworkError("ECONNRESET", "reset"));
            }
          },
        });
        return Promise.resolve({
          status: 200,
          ok: true,
          statusText: "OK",
          headers: { get: () => null },
          body,
          text: async () => "",
        } as unknown as Response);
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("recovered")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 2, idleTimeoutMs: 0 });
    const { cbs, contents, usages } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(attempts, 2);
    assert.equal(usages.length, 1);
    assert.deepEqual(contents, ["recovered"]);
  });

  // -----------------------------------------------------------------------
  // Callback non-duplication
  // -----------------------------------------------------------------------

  it("does not duplicate callbacks on successful retry", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.reject(createNetworkError("ECONNRESET", "reset"));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(contentChunk("once")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 1, idleTimeoutMs: 0 });
    const { cbs, contents, doneCount } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(contents, ["once"]);
    assert.equal(doneCount.value, 1);
  });

  it("does not duplicate thinking/toolCall on retry", async () => {
    let attempts = 0;
    globalThis.fetch = mock.fn(() => {
      attempts++;
      if (attempts === 1) return Promise.reject(createNetworkError("ETIMEDOUT", "timeout"));
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(thinkingChunk("think")),
          sseFrame(toolCallChunk(0, "t1", "fn", "{}")),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 1, idleTimeoutMs: 0 });
    const { cbs, thinkings, toolCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(thinkings, ["think"]);
    assert.equal(toolCalls.length, 1);
  });

  // -----------------------------------------------------------------------
  // [DONE] boundary cases
  // -----------------------------------------------------------------------

  it("handles [DONE] without preceding content", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, doneCount, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(doneCount.value, 1);
    assert.deepEqual(contents, []);
  });

  it("handles data:[DONE] without space", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody(["data:[DONE]\n\n"]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, doneCount } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(doneCount.value, 1);
  });

  it("ignores data after [DONE]", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(contentChunk("before")),
          sseFrame("[DONE]"),
          sseFrame(contentChunk("after")),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, contents } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.deepEqual(contents, ["before"]);
  });

  // -----------------------------------------------------------------------
  // Tool call edge cases
  // -----------------------------------------------------------------------

  it("aggregates multi-index tool calls", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([
          sseFrame(toolCallChunk(0, "ca", "fa", '{"x":')),
          sseFrame(toolCallChunk(1, "cb", "fb", '{"y":')),
          sseFrame(toolCallChunk(0, "", "", "1}")),
          sseFrame(toolCallChunk(1, "", "", "2}")),
          sseFrame("[DONE]"),
        ]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, toolCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(toolCalls.length, 2);
    const c0 = toolCalls.find((tc) => tc.id === "ca")!;
    const c1 = toolCalls.find((tc) => tc.id === "cb")!;
    assert.equal(c0.function.name, "fa");
    assert.equal(c0.function.arguments, '{"x":1}');
    assert.equal(c1.function.name, "fb");
    assert.equal(c1.function.arguments, '{"y":2}');
  });

  it("flushes tool calls on [DONE] without finish_reason", async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame(toolCallChunk(0, "cz", "fz", "{}")), sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response),
    );

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs, toolCalls } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(toolCalls.length, 1);
    assert.equal(toolCalls[0].id, "cz");
  });

  // -----------------------------------------------------------------------
  // Request construction
  // -----------------------------------------------------------------------

  it("sends stream_options.include_usage", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = mock.fn((_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    const parsed = JSON.parse(capturedBody!);
    assert.deepEqual(parsed.stream_options, { include_usage: true });
  });

  it("sends Authorization and Content-Type headers", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    globalThis.fetch = mock.fn((_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: { get: () => null },
        body: buildStreamBody([sseFrame("[DONE]")]),
        text: async () => "",
      } as unknown as Response);
    });

    const client = new LlmClient(BASE_URL, API_KEY, { maxRetries: 0, idleTimeoutMs: 0 });
    const { cbs } = recordingCallbacks();
    await client.streamChatCompletion(makeRequest(), cbs);

    assert.equal(capturedHeaders!["Authorization"], `Bearer ${API_KEY}`);
    assert.equal(capturedHeaders!["Content-Type"], "application/json");
  });
});
