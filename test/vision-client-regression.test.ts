import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import vscode from "vscode";
import { VisionProxyClient } from "../src/provider/vision/protocols/client";
import { VisionProxyError } from "../src/provider/vision/protocols/errors";
import type { VisionProxyConfig } from "../src/provider/vision/types";

function createConfig(overrides: Partial<VisionProxyConfig> = {}): VisionProxyConfig {
	return {
		providerFamily: "openai-compatible",
		apiType: "chat-completions",
		url: "https://api.example.com/v1/chat/completions",
		modelId: "vision-model",
		updatedAt: Date.now(),
		...overrides,
	};
}

function createResponse(status: number, body: string, statusText = "ERR"): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		text: async () => body,
	} as unknown as Response;
}

function createRequest(token: vscode.CancellationToken) {
	return {
		prompt: "describe image",
		images: [{ mimeType: "image/png", data: new Uint8Array([1, 2, 3]) }],
		token,
	};
}

describe("VisionProxyClient regression", () => {
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

	it("retries once on HTTP 429 then succeeds", async () => {
		let attempts = 0;
		globalThis.fetch = (async () => {
			attempts += 1;
			if (attempts === 1) {
				return createResponse(429, JSON.stringify({ error: { message: "rate limited" } }));
			}
			return createResponse(
				200,
				JSON.stringify({ choices: [{ message: { content: "final description" } }] }),
				"OK",
			);
		}) as typeof globalThis.fetch;

		const client = new VisionProxyClient();
		const token = new vscode.CancellationTokenSource().token;
		const text = await client.describe(
			createConfig(),
			"KEY",
			createRequest(token),
			{ maxRetries: 1, timeoutMs: 50 },
		);

		assert.equal(text, "final description");
		assert.equal(attempts, 2);
	});

	it("does not retry on HTTP 401", async () => {
		let attempts = 0;
		globalThis.fetch = (async () => {
			attempts += 1;
			return createResponse(401, JSON.stringify({ error: { message: "unauthorized" } }));
		}) as typeof globalThis.fetch;

		const client = new VisionProxyClient();
		const token = new vscode.CancellationTokenSource().token;

		await assert.rejects(
			() =>
				client.describe(createConfig(), "BAD", createRequest(token), {
					maxRetries: 3,
					timeoutMs: 50,
				}),
			(error: unknown) => {
				assert.ok(error instanceof VisionProxyError);
				assert.equal(error.code, "http-auth");
				return true;
			},
		);
		assert.equal(attempts, 1);
	});

	it("maps timed out request to timeout error", async () => {
		globalThis.fetch = ((_: unknown, init?: RequestInit) =>
			new Promise((_resolve, reject) => {
				const signal = init?.signal as AbortSignal | undefined;
				signal?.addEventListener("abort", () => {
					const error = new Error("aborted");
					(error as Error & { name: string }).name = "AbortError";
					reject(error);
				});
			})) as typeof globalThis.fetch;

		const client = new VisionProxyClient();
		const token = new vscode.CancellationTokenSource().token;
		await assert.rejects(
			() =>
				client.describe(createConfig(), "KEY", createRequest(token), {
					maxRetries: 0,
					timeoutMs: 1,
				}),
			(error: unknown) => {
				assert.ok(error instanceof VisionProxyError);
				assert.equal(error.code, "timeout");
				return true;
			},
		);
	});

	it("returns cancelled when token is cancelled before request", async () => {
		const source = new vscode.CancellationTokenSource();
		source.cancel();
		const client = new VisionProxyClient();
		await assert.rejects(
			() =>
				client.describe(createConfig(), "KEY", createRequest(source.token), {
					maxRetries: 2,
					timeoutMs: 50,
				}),
			(error: unknown) => {
				assert.ok(error instanceof VisionProxyError);
				assert.equal(error.code, "cancelled");
				return true;
			},
		);
	});
});
