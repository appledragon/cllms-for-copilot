import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import { resolveAudioMessages } from "../src/provider/audio/resolve";
import { createReplayMarkerPart } from "../src/provider/replay";
import { isAudioDataPart } from "../src/provider/imageParts";
import { AudioProxyError } from "../src/provider/audio/protocols/errors";
import type { AudioTranscriber } from "../src/provider/audio/types";

const { User, Assistant } = vscode.LanguageModelChatMessageRole;
const token = new vscode.CancellationTokenSource().token;

function message(role: number, content: unknown[]): vscode.LanguageModelChatRequestMessage {
	return { role, content } as unknown as vscode.LanguageModelChatRequestMessage;
}

function text(value: string): vscode.LanguageModelTextPart {
	return new vscode.LanguageModelTextPart(value);
}

function audio(bytes: number[] = [1, 2, 3], mime = "audio/wav"): vscode.LanguageModelDataPart {
	return new vscode.LanguageModelDataPart(new Uint8Array(bytes), mime);
}

function transcriber(result: string): AudioTranscriber {
	return { id: "audio-test", source: "api-endpoint", transcribe: async () => result };
}

function collectText(message: vscode.LanguageModelChatRequestMessage): string {
	return (message.content as readonly unknown[])
		.filter((part): part is vscode.LanguageModelTextPart => part instanceof vscode.LanguageModelTextPart)
		.map((part) => part.value)
		.join("");
}

function hasAudioPart(messages: readonly vscode.LanguageModelChatRequestMessage[]): boolean {
	return messages.some((message) =>
		(message.content as readonly unknown[]).some((part) => isAudioDataPart(part)),
	);
}

describe("resolveAudioMessages", () => {
	it("transcribes latest audio message and strips bytes", async () => {
		const messages = [message(User, [text("what"), audio()])];
		const result = await resolveAudioMessages(messages, token, async () => transcriber("hello world"));
		assert.equal(hasAudioPart(result.messages), false);
		assert.match(collectText(result.messages[0]), /\[Audio Transcription: hello world\]/);
		assert.equal(result.stats.generatedAudioMessages, 1);
	});

	it("replays marker audio text for historical attachments", async () => {
		const marker = createReplayMarkerPart({ audioText: "REPLAY AUDIO" });
		const messages = [
			message(User, [text("old"), audio([1])]),
			message(Assistant, [text("done"), marker]),
			message(User, [text("new"), audio([2])]),
		];
		const result = await resolveAudioMessages(messages, token, async () => transcriber("LATEST"));
		assert.equal(hasAudioPart(result.messages), false);
		assert.match(collectText(result.messages[0]), /REPLAY AUDIO/);
		assert.match(collectText(result.messages[2]), /LATEST/);
	});

	it("adds failure notice on transcriber error", async () => {
		const failing: AudioTranscriber = {
			id: "audio-test",
			source: "api-endpoint",
			transcribe: async () => {
				throw new AudioProxyError("http-provider", "boom", 500);
			},
		};
		const messages = [message(User, [text("what"), audio()])];
		const result = await resolveAudioMessages(messages, token, async () => failing);
		assert.equal(result.stats.failedAudioMessages, 1);
		assert.match(result.initialResponseNotice ?? "", /boom/);
	});
});
