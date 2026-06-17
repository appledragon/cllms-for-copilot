import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import { resolveImageMessages } from "../src/provider/vision/resolve";
import { createReplayMarkerPart } from "../src/provider/replay";
import { isImageDataPart } from "../src/provider/imageParts";
import { VisionProxyError } from "../src/provider/vision/protocols/errors";
import type { VisionDescriber } from "../src/provider/vision/types";

const { User, Assistant } = vscode.LanguageModelChatMessageRole;
const token = new vscode.CancellationTokenSource().token;

function message(role: number, content: unknown[]): vscode.LanguageModelChatRequestMessage {
  return { role, content } as unknown as vscode.LanguageModelChatRequestMessage;
}

function text(value: string): vscode.LanguageModelTextPart {
  return new vscode.LanguageModelTextPart(value);
}

function image(bytes: number[] = [1, 2, 3], mime = "image/png"): vscode.LanguageModelDataPart {
  return new vscode.LanguageModelDataPart(new Uint8Array(bytes), mime);
}

function describer(
  result: string,
  source: "api-endpoint" | "vscode-lm" = "api-endpoint",
): VisionDescriber {
  return { id: "vision-test", source, describe: async () => result };
}

function collectText(message: vscode.LanguageModelChatRequestMessage): string {
  return (message.content as readonly unknown[])
    .filter(
      (part): part is vscode.LanguageModelTextPart => part instanceof vscode.LanguageModelTextPart,
    )
    .map((part) => part.value)
    .join("");
}

function hasImagePart(messages: readonly vscode.LanguageModelChatRequestMessage[]): boolean {
  return messages.some((message) =>
    (message.content as readonly unknown[]).some((part) => isImageDataPart(part)),
  );
}

describe("resolveImageMessages", () => {
  it("returns the original messages when there are no images", async () => {
    const messages = [message(User, [text("hello")])];
    const result = await resolveImageMessages(messages, token, async () => describer("desc"));

    assert.equal(result.messages, messages);
    assert.equal(result.stats.inputImageParts, 0);
    assert.deepStrictEqual(result.replayMarkerMetadata, {});
  });

  it("leaves image parts untouched for native vision models", async () => {
    const messages = [message(User, [text("look"), image()])];
    const result = await resolveImageMessages(messages, token, async () => describer("desc"), {
      nativeVision: true,
    });

    assert.equal(result.messages, messages);
    assert.equal(hasImagePart(result.messages), true);
    assert.equal(result.stats.inputImageParts, 1);
  });

  it("describes the current image message and strips the image bytes", async () => {
    const messages = [message(User, [text("what is this"), image()])];
    const result = await resolveImageMessages(messages, token, async () => describer("A cat"));

    assert.equal(hasImagePart(result.messages), false);
    assert.match(collectText(result.messages[0]), /\[Image Description: A cat\]/);
    assert.equal(result.stats.currentImageMessages, 1);
    assert.equal(result.stats.generatedImageMessages, 1);
    assert.equal(result.stats.droppedImageParts, 1);
    assert.equal(result.visionModelId, "vision-test");
    assert.equal(result.visionProxySource, "api-endpoint");
    assert.ok(result.replayMarkerMetadata.visionText?.includes("A cat"));
    assert.equal(result.initialResponseNotice, undefined);
  });

  it("falls back to an unavailable marker when no vision proxy is configured", async () => {
    const messages = [message(User, [text("what"), image()])];
    const result = await resolveImageMessages(messages, token, async () => undefined);

    assert.equal(hasImagePart(result.messages), false);
    assert.match(collectText(result.messages[0]), /\[Image Description unavailable\]/);
    assert.equal(result.stats.unavailableImageMessages, 1);
    assert.match(result.initialResponseNotice ?? "", /command:cllms\.setVisionModel/);
  });

  it("records a failure notice when the vision proxy throws", async () => {
    const failing: VisionDescriber = {
      id: "vision-test",
      source: "api-endpoint",
      describe: async () => {
        throw new VisionProxyError("http-provider", "boom", 500);
      },
    };
    const messages = [message(User, [text("what"), image()])];
    const result = await resolveImageMessages(messages, token, async () => failing);

    assert.equal(hasImagePart(result.messages), false);
    assert.match(collectText(result.messages[0]), /\[Image Description unavailable\]/);
    assert.equal(result.stats.failedImageMessages, 1);
    assert.match(result.initialResponseNotice ?? "", /boom/);
  });

  it("replays marker vision text for historical images and describes the latest", async () => {
    const replayMarker = createReplayMarkerPart({ visionText: "REPLAYED CAT" });
    const messages = [
      message(User, [text("first image"), image([1, 2, 3])]),
      message(Assistant, [text("it is a cat"), replayMarker]),
      message(User, [text("second image"), image([9])]),
    ];
    const result = await resolveImageMessages(messages, token, async () => describer("NEW DOG"));

    assert.equal(hasImagePart(result.messages), false);
    assert.match(collectText(result.messages[0]), /REPLAYED CAT/);
    assert.match(collectText(result.messages[2]), /NEW DOG/);
    assert.equal(result.stats.replayedImageMessages, 1);
    assert.equal(result.stats.generatedImageMessages, 1);
    assert.equal(result.stats.currentImageMessages, 1);
    assert.equal(result.stats.inputImageMessages, 2);
    assert.ok(result.replayMarkerMetadata.visionText?.includes("NEW DOG"));
  });

  it("omits historical images without markers and keeps their text", async () => {
    const messages = [
      message(User, [text("old screenshot"), image([1, 2, 3])]),
      message(Assistant, [text("a reply")]),
      message(User, [text("new screenshot"), image([9])]),
    ];
    const result = await resolveImageMessages(messages, token, async () => describer("NEW DESC"));

    assert.equal(hasImagePart(result.messages), false);
    assert.equal(collectText(result.messages[0]), "old screenshot");
    assert.match(collectText(result.messages[2]), /NEW DESC/);
    assert.equal(result.stats.omittedImageMessages, 1);
    assert.equal(result.stats.generatedImageMessages, 1);
    assert.equal(result.stats.droppedImageParts, 2);
  });
});
