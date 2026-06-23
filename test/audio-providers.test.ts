import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAudioProviderAdapter } from "../src/provider/audio/protocols/providers";
import { AudioProxyError } from "../src/provider/audio/protocols/errors";

const baseConfig = {
	providerFamily: "openai-compatible" as const,
	url: "https://api.example.com",
	modelId: "gpt-4o-mini-transcribe",
	updatedAt: Date.now(),
};

describe("getAudioProviderAdapter", () => {
	it("selects transcriptions adapter by default apiType", () => {
		const adapter = getAudioProviderAdapter({ ...baseConfig, apiType: "transcriptions" });
		const body = adapter.createBody(
			{ ...baseConfig, apiType: "transcriptions" },
			{
				prompt: "transcribe",
				audios: [{ mimeType: "audio/wav", data: new Uint8Array([1, 2, 3]) }],
				token: {} as any,
			},
		) as any;
		assert.equal(Array.isArray(body.audio), true);
	});

	it("selects responses-audio adapter for responses apiType", () => {
		const adapter = getAudioProviderAdapter({ ...baseConfig, apiType: "responses" });
		const body = adapter.createBody(
			{ ...baseConfig, apiType: "responses" },
			{
				prompt: "transcribe",
				audios: [{ mimeType: "audio/wav", data: new Uint8Array([1, 2, 3]) }],
				token: {} as any,
			},
		) as any;
		assert.equal(Array.isArray(body.input), true);
	});
});

describe("audio responses parser", () => {
	it("parses output_text shortcut", () => {
		const adapter = getAudioProviderAdapter({ ...baseConfig, apiType: "responses" });
		assert.equal(adapter.parseResponse({ output_text: " hello " }), "hello");
	});

	it("throws on unsupported responses payload", () => {
		const adapter = getAudioProviderAdapter({ ...baseConfig, apiType: "responses" });
		assert.throws(() => adapter.parseResponse({ output: null }), (error: unknown) => {
			assert.ok(error instanceof AudioProxyError);
			assert.equal(error.code, "unsupported-response");
			return true;
		});
	});
});
