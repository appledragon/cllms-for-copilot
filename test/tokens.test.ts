import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import { estimateTokenCount } from "../src/provider/tokens";

function message(content: unknown): vscode.LanguageModelChatRequestMessage {
  return {
    role: vscode.LanguageModelChatMessageRole.User,
    content,
  } as unknown as vscode.LanguageModelChatRequestMessage;
}

describe("estimateTokenCount", () => {
  it("estimates from string length divided by charsPerToken", () => {
    assert.equal(estimateTokenCount("abcdefghij", 4), 3); // ceil(10/4)
    assert.equal(estimateTokenCount("abcd", 4), 1); // ceil(4/4)
  });

  it("returns at least one token for empty or tiny strings", () => {
    assert.equal(estimateTokenCount("", 4), 1);
    assert.equal(estimateTokenCount("a", 100), 1);
  });

  it("sums text parts across a message", () => {
    const msg = message([
      new vscode.LanguageModelTextPart("hello"),
      new vscode.LanguageModelTextPart("world"),
    ]);
    assert.equal(estimateTokenCount(msg, 5), 2); // ceil(10/5)
  });

  it("counts tool-call parts as callId + name + serialized input", () => {
    const msg = message([new vscode.LanguageModelToolCallPart("c1", "read", { path: "a" })]);
    // 'c1'(2) + 'read'(4) + JSON.stringify({path:'a'}) = 2 + 4 + 12 = 18
    assert.equal(estimateTokenCount(msg, 1), 18);
  });

  it("applies a stable heuristic for image data parts", () => {
    const msg = message([new vscode.LanguageModelDataPart(new Uint8Array([1, 2, 3]), "image/png")]);
    assert.equal(estimateTokenCount(msg, 1), 1020);
  });

  it("returns one token when content is missing or not an array", () => {
    assert.equal(estimateTokenCount(message(undefined), 4), 1);
    assert.equal(estimateTokenCount(message("not-an-array"), 4), 1);
  });

  it("reuses the cached character total for the same message object", () => {
    const content = [new vscode.LanguageModelTextPart("abcd")]; // 4 chars
    const msg = message(content);
    assert.equal(estimateTokenCount(msg, 1), 4); // computes + caches 4 chars

    // Mutate the underlying content after the first call. Because the total is
    // cached by message identity, the result must stay 4 (no recompute).
    content.push(new vscode.LanguageModelTextPart("efghij")); // 10 if recomputed
    assert.equal(estimateTokenCount(msg, 1), 4);
  });

  it("divides the cached character total by the current charsPerToken ratio", () => {
    const msg = message([
      new vscode.LanguageModelTextPart("abcd"),
      new vscode.LanguageModelTextPart("efgh"),
    ]); // 8 chars total
    assert.equal(estimateTokenCount(msg, 4), 2); // ceil(8/4)
    assert.equal(estimateTokenCount(msg, 4), 2); // served from cache, same result
    assert.equal(estimateTokenCount(msg, 2), 4); // ceil(8/2): ratio applied to cached chars
    assert.equal(estimateTokenCount(msg, 8), 1); // ceil(8/8)
  });

  it("counts distinct message objects independently", () => {
    const longMsg = message([new vscode.LanguageModelTextPart("abcdef")]); // 6 chars
    const shortMsg = message([new vscode.LanguageModelTextPart("abc")]); // 3 chars
    assert.equal(estimateTokenCount(longMsg, 3), 2); // ceil(6/3)
    assert.equal(estimateTokenCount(shortMsg, 3), 1); // ceil(3/3)
  });
});
