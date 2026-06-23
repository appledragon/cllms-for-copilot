import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AudioTranscriptionCache,
	computeAudioTranscriptionCacheKey,
	createCachingAudioTranscriber,
} from "../src/provider/audio/cache";
import type { AudioTranscriber } from "../src/provider/audio/types";

describe("audio transcription cache", () => {
	it("caches repeated transcriptions by request fingerprint", async () => {
		let calls = 0;
		const inner: AudioTranscriber = {
			id: "audio-test",
			source: "api-endpoint",
			transcribe: async () => {
				calls += 1;
				return "hello";
			},
		};
		const cached = createCachingAudioTranscriber(inner, new AudioTranscriptionCache());
		const request = {
			prompt: "p",
			audios: [{ mimeType: "audio/wav", data: new Uint8Array([1, 2, 3]) }],
			token: { isCancellationRequested: false } as any,
		};

		assert.equal(await cached.transcribe(request), "hello");
		assert.equal(await cached.transcribe(request), "hello");
		assert.equal(calls, 1);
	});

	it("changes key when audio bytes differ", () => {
		const requestA = {
			prompt: "p",
			audios: [{ mimeType: "audio/wav", data: new Uint8Array([1]) }],
			token: {} as any,
		};
		const requestB = {
			prompt: "p",
			audios: [{ mimeType: "audio/wav", data: new Uint8Array([2]) }],
			token: {} as any,
		};
		assert.notEqual(
			computeAudioTranscriptionCacheKey("id", requestA),
			computeAudioTranscriptionCacheKey("id", requestB),
		);
	});
});
