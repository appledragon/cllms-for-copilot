import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import { REPLAY_MARKER_MIME, REPLAY_MARKER_WRITER_ID } from "../src/provider/replay/consts";
import {
  createReplayMarkerPart,
  hasReplayMarkerMetadata,
  parseFirstReplayMarker,
  parseReplayMarkerData,
} from "../src/provider/replay";

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe("replay marker round-trip", () => {
  it("encodes and decodes reasoning + vision metadata", () => {
    const part = createReplayMarkerPart({
      reasoningText: "thought",
      visionText: "a picture",
      audioText: "an audio",
    });
    assert.equal(part.mimeType, REPLAY_MARKER_MIME);

    const parsed = parseReplayMarkerData(part.data);
    assert.equal(parsed.valid, true);
    assert.equal(parsed.reasoningText, "thought");
    assert.equal(parsed.visionText, "a picture");
    assert.equal(parsed.audioText, "an audio");
    assert.equal(parsed.payloadFormat, "json-base64url");
    assert.equal(parsed.legacySegmentOnly, false);
  });

  it("finds the marker inside a chat message", () => {
    const part = createReplayMarkerPart({ reasoningText: "why" });
    const message = {
      role: vscode.LanguageModelChatMessageRole.Assistant,
      content: [new vscode.LanguageModelTextPart("answer"), part],
    } as unknown as vscode.LanguageModelChatRequestMessage;

    const marker = parseFirstReplayMarker(message);
    assert.ok(marker?.valid);
    assert.equal(marker?.reasoningText, "why");
  });
});

describe("parseReplayMarkerData error handling", () => {
  it("rejects data without a separator", () => {
    assert.deepEqual(parseReplayMarkerData(encode("cllms")), {
      valid: false,
      error: "marker-prefix-missing",
    });
  });

  it("rejects an unknown writer prefix", () => {
    assert.deepEqual(parseReplayMarkerData(encode("badwriter\\json:abc")), {
      valid: false,
      error: "marker-prefix-mismatch",
    });
  });

  it("accepts a raw legacy uuid payload and lowercases it", () => {
    const parsed = parseReplayMarkerData(
      encode(`${REPLAY_MARKER_WRITER_ID}\\AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE`),
    );
    assert.equal(parsed.valid, true);
    assert.equal(parsed.segmentId, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    assert.equal(parsed.legacySegmentOnly, true);
    assert.equal(parsed.payloadFormat, "raw-uuid");
  });
});

describe("hasReplayMarkerMetadata", () => {
  it("is true when any payload text exists", () => {
    assert.equal(hasReplayMarkerMetadata({ reasoningText: "x" }), true);
    assert.equal(hasReplayMarkerMetadata({ visionText: "y" }), true);
    assert.equal(hasReplayMarkerMetadata({ audioText: "z" }), true);
  });

  it("is false for empty metadata", () => {
    assert.equal(hasReplayMarkerMetadata({}), false);
  });
});
