import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactSensitiveJsonValue } from "../src/provider/debug/dump-utils";

describe("debug dump privacy helpers", () => {
  it("redacts credential-like keys without removing prompt content", () => {
    const redacted = redactSensitiveJsonValue({
      Authorization: "Bearer sk-secret",
      apiKey: "sk-secret",
      customHeaders: {
        "X-Api-Key": "sk-secret",
        "X-Trace-Id": "trace-123",
      },
      messages: [{ role: "user", content: "keep prompt text in verbose dumps" }],
    }) as {
      Authorization: string;
      apiKey: string;
      customHeaders: Record<string, string>;
      messages: Array<{ content: string }>;
    };

    assert.equal(redacted.Authorization, "[REDACTED]");
    assert.equal(redacted.apiKey, "[REDACTED]");
    assert.equal(redacted.customHeaders["X-Api-Key"], "[REDACTED]");
    assert.equal(redacted.customHeaders["X-Trace-Id"], "trace-123");
    assert.equal(redacted.messages[0].content, "keep prompt text in verbose dumps");
  });
});
