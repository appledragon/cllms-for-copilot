import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeStringify, toWellFormedString } from "../src/json";

describe("toWellFormedString", () => {
  it("passes well-formed text through unchanged", () => {
    assert.equal(toWellFormedString("hello 世界 😀"), "hello 世界 😀");
  });

  it("replaces a lone high surrogate with U+FFFD", () => {
    assert.equal(toWellFormedString("a\uD800b"), "a\uFFFDb");
  });

  it("replaces a lone low surrogate with U+FFFD", () => {
    assert.equal(toWellFormedString("a\uDC00b"), "a\uFFFDb");
  });

  it("preserves a valid surrogate pair", () => {
    const emoji = "\uD83D\uDE00";
    assert.equal(toWellFormedString(emoji), emoji);
  });
});

describe("safeStringify", () => {
  it("serializes plain objects like JSON.stringify", () => {
    assert.equal(safeStringify({ a: 1, b: "x" }), '{"a":1,"b":"x"}');
  });

  it("sanitizes lone surrogates inside nested string values", () => {
    assert.equal(safeStringify({ s: "x\uDC00y" }), `{"s":"x\uFFFDy"}`);
  });

  it("throws a TypeError when the value cannot be serialized", () => {
    assert.throws(() => safeStringify(undefined), TypeError);
  });
});
