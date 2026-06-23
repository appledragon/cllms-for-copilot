import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAudioProxyConfig } from "../src/provider/audio/sources/endpoint/config";
import { validateAudioEndpointUrl } from "../src/provider/audio/protocols/url";
import { normalizeCustomHeaders } from "../src/provider/audio/protocols/headers";
import { AudioProxyError, type AudioProxyErrorCode } from "../src/provider/audio/protocols/errors";

function expectAudioError(fn: () => unknown, code: AudioProxyErrorCode): void {
	assert.throws(fn, (error: unknown) => {
		assert.ok(error instanceof AudioProxyError);
		assert.equal(error.code, code);
		return true;
	});
}

describe("audio config normalization", () => {
	it("normalizes and trims valid config", () => {
		const result = normalizeAudioProxyConfig({
			apiType: "transcriptions",
			url: " https://api.example.com/v1/audio/transcriptions ",
			modelId: " gpt-4o-mini-transcribe ",
			headers: { "X-Test": " v " },
			extraBody: { language: "en" },
		});
		assert.equal(result.url, "https://api.example.com/v1/audio/transcriptions");
		assert.equal(result.modelId, "gpt-4o-mini-transcribe");
		assert.deepStrictEqual(result.headers, { "X-Test": "v" });
	});

	it("rejects non-https url and protected extraBody keys", () => {
		expectAudioError(
			() => normalizeAudioProxyConfig({ apiType: "transcriptions", url: "http://x", modelId: "m" }),
			"invalid-url",
		);
		expectAudioError(
			() =>
				normalizeAudioProxyConfig({
					apiType: "transcriptions",
					url: "https://x",
					modelId: "m",
					extraBody: { audio: "x" },
				}),
			"missing-configuration",
		);
	});

	it("accepts responses apiType", () => {
		const result = normalizeAudioProxyConfig({
			apiType: "responses",
			url: "https://api.example.com/v1/responses",
			modelId: "gpt-4o-mini-transcribe",
		});
		assert.equal(result.apiType, "responses");
	});
});

describe("audio headers/url validation", () => {
	it("rejects malformed headers and accepts https endpoint", () => {
		expectAudioError(() => normalizeCustomHeaders({ "Bad Name": "x" }), "invalid-custom-headers");
		assert.doesNotThrow(() => validateAudioEndpointUrl("https://api.example.com/v1/audio"));
	});
});
