import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeVisionProxyConfig,
  normalizeVisionProxySource,
} from "../src/provider/vision/sources/endpoint/config";
import { normalizeCustomHeaders } from "../src/provider/vision/protocols/headers";
import { validateVisionEndpointUrl } from "../src/provider/vision/protocols/url";
import {
  VisionProxyError,
  type VisionProxyErrorCode,
} from "../src/provider/vision/protocols/errors";

function expectVisionError(fn: () => unknown, code: VisionProxyErrorCode): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof VisionProxyError, `expected VisionProxyError, got ${String(error)}`);
    assert.equal(error.code, code);
    return true;
  });
}

const baseConfig = {
  providerFamily: "openai-compatible",
  apiType: "chat-completions",
  url: "https://api.example.com/v1/chat/completions",
  modelId: "gpt-4o-mini",
  updatedAt: 1700000000000,
};

describe("normalizeVisionProxyConfig success", () => {
  it("normalizes a full OpenAI chat-completions config and trims string fields", () => {
    const result = normalizeVisionProxyConfig({
      providerFamily: "openai-compatible",
      apiType: "chat-completions",
      url: "  https://api.example.com/v1/chat/completions  ",
      modelId: "  gpt-4o-mini  ",
      headers: { "X-Test": " value " },
      extraBody: { temperature: 0 },
      updatedAt: 1700000000000,
    });

    assert.deepStrictEqual(result, {
      providerFamily: "openai-compatible",
      apiType: "chat-completions",
      url: "https://api.example.com/v1/chat/completions",
      modelId: "gpt-4o-mini",
      headers: { "X-Test": "value" },
      extraBody: { temperature: 0 },
      updatedAt: 1700000000000,
    });
  });

  it("accepts the OpenAI responses api type", () => {
    const result = normalizeVisionProxyConfig({ ...baseConfig, apiType: "responses" });
    assert.equal(result.apiType, "responses");
  });

  it("forces apiType to messages for the anthropic-compatible family", () => {
    const result = normalizeVisionProxyConfig({
      ...baseConfig,
      providerFamily: "anthropic-compatible",
      apiType: "chat-completions",
    });
    assert.equal(result.providerFamily, "anthropic-compatible");
    assert.equal(result.apiType, "messages");
  });

  it("defaults updatedAt to a number when missing", () => {
    const result = normalizeVisionProxyConfig({
      providerFamily: "openai-compatible",
      apiType: "chat-completions",
      url: "https://api.example.com/v1/chat/completions",
      modelId: "gpt-4o-mini",
    });
    assert.equal(typeof result.updatedAt, "number");
  });

  it("drops empty header values and an empty extraBody object", () => {
    const result = normalizeVisionProxyConfig({
      ...baseConfig,
      headers: { "X-Empty": "   " },
      extraBody: {},
    });
    assert.equal(result.headers, undefined);
    assert.equal(result.extraBody, undefined);
  });
});

describe("normalizeVisionProxyConfig failures", () => {
  it("rejects a non-object payload", () => {
    expectVisionError(() => normalizeVisionProxyConfig("nope"), "missing-configuration");
    expectVisionError(() => normalizeVisionProxyConfig(null), "missing-configuration");
    expectVisionError(() => normalizeVisionProxyConfig([baseConfig]), "missing-configuration");
  });

  it("rejects an invalid provider family", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, providerFamily: "gemini" }),
      "missing-configuration",
    );
  });

  it("rejects an invalid OpenAI api type", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, apiType: "completions" }),
      "missing-configuration",
    );
  });

  it("rejects a missing url and a missing modelId", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, url: "   " }),
      "missing-configuration",
    );
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, modelId: "" }),
      "missing-configuration",
    );
  });

  it("surfaces an invalid url", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, url: "ftp://example.com" }),
      "invalid-url",
    );
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, url: "not a url" }),
      "invalid-url",
    );
  });

  it("surfaces an invalid custom header from the config", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, headers: { "Bad Name": "v" } }),
      "invalid-custom-headers",
    );
  });

  it("rejects a non-object extraBody", () => {
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, extraBody: [1, 2, 3] }),
      "missing-configuration",
    );
    expectVisionError(
      () => normalizeVisionProxyConfig({ ...baseConfig, extraBody: 42 }),
      "missing-configuration",
    );
  });

  it("rejects extraBody entries that override protected request fields", () => {
    for (const key of ["model", "messages", "input", "stream"]) {
      expectVisionError(
        () => normalizeVisionProxyConfig({ ...baseConfig, extraBody: { [key]: "x" } }),
        "missing-configuration",
      );
    }
  });
});

describe("normalizeCustomHeaders", () => {
  it("returns undefined for nullish input", () => {
    assert.equal(normalizeCustomHeaders(undefined), undefined);
    assert.equal(normalizeCustomHeaders(null), undefined);
  });

  it("rejects non-object header containers", () => {
    expectVisionError(() => normalizeCustomHeaders([]), "invalid-custom-headers");
    expectVisionError(() => normalizeCustomHeaders("x"), "invalid-custom-headers");
  });

  it("rejects empty and malformed header names", () => {
    expectVisionError(() => normalizeCustomHeaders({ "   ": "v" }), "invalid-custom-headers");
    expectVisionError(() => normalizeCustomHeaders({ "X Space": "v" }), "invalid-custom-headers");
    expectVisionError(() => normalizeCustomHeaders({ "X\tTab": "v" }), "invalid-custom-headers");
  });

  it("rejects non-string header values", () => {
    expectVisionError(() => normalizeCustomHeaders({ "X-Num": 5 }), "invalid-custom-headers");
    expectVisionError(() => normalizeCustomHeaders({ "X-Bool": true }), "invalid-custom-headers");
  });

  it("rejects header values that contain CR/LF (injection guard)", () => {
    expectVisionError(
      () => normalizeCustomHeaders({ "X-Inject": "a\r\nEvil: 1" }),
      "invalid-custom-headers",
    );
    expectVisionError(
      () => normalizeCustomHeaders({ "X-Inject": "a\nb" }),
      "invalid-custom-headers",
    );
  });

  it("trims names and values, skips blank values, and de-duplicates case-insensitively", () => {
    assert.deepStrictEqual(normalizeCustomHeaders({ " X-A ": " v ", "X-Blank": "  " }), {
      "X-A": "v",
    });
    assert.deepStrictEqual(normalizeCustomHeaders({ "X-A": "first", "x-a": "second" }), {
      "x-a": "second",
    });
  });

  it("returns undefined when every header value is blank", () => {
    assert.equal(normalizeCustomHeaders({ "X-A": "", "X-B": "   " }), undefined);
  });
});

describe("validateVisionEndpointUrl", () => {
  it("accepts http and https urls", () => {
    assert.doesNotThrow(() => validateVisionEndpointUrl("http://localhost:8080/v1"));
    assert.doesNotThrow(() => validateVisionEndpointUrl("https://api.example.com/v1"));
  });

  it("rejects non-http protocols and malformed urls", () => {
    expectVisionError(() => validateVisionEndpointUrl("ftp://example.com"), "invalid-url");
    expectVisionError(() => validateVisionEndpointUrl("file:///etc/passwd"), "invalid-url");
    expectVisionError(() => validateVisionEndpointUrl("://missing-scheme"), "invalid-url");
    expectVisionError(() => validateVisionEndpointUrl(""), "invalid-url");
  });
});

describe("normalizeVisionProxySource", () => {
  it("accepts the two known sources", () => {
    assert.equal(normalizeVisionProxySource("api-endpoint"), "api-endpoint");
    assert.equal(normalizeVisionProxySource("vscode-lm"), "vscode-lm");
  });

  it("returns undefined for anything else", () => {
    assert.equal(normalizeVisionProxySource("other"), undefined);
    assert.equal(normalizeVisionProxySource(undefined), undefined);
    assert.equal(normalizeVisionProxySource(123), undefined);
  });
});
