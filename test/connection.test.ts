import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LlmRequestError } from "../src/client";
import { MODELS, PROVIDERS } from "../src/consts";
import {
  createConnectionSuccessResult,
  findStaleOverrides,
  formatConnectionFailureDetail,
  formatStaleOverrides,
} from "../src/provider/connection";

describe("connection test feedback", () => {
  it("describes empty model lists with a lightweight chat completion hint", () => {
    const result = createConnectionSuccessResult(PROVIDERS.qwen, []);

    assert.equal(result.kind, "empty-model-list");
    assert.equal(result.staleOverrides.length, 0);
    assert.match(result.message, /did not return a model list/);
    assert.match(result.message, /lightweight chat completion/);
  });

  it("groups stale overrides by effective API model ID and de-duplicates them", () => {
    const qwenModels = MODELS.filter((model) => model.provider === "qwen");
    const duplicateMissingId = "shared-missing-model";
    const availableModelIds = qwenModels
      .map((model) => model.id)
      .filter((id) => id !== "qwen3-coder-plus" && id !== "qwen3-coder-flash");

    const stale = findStaleOverrides(PROVIDERS.qwen, availableModelIds, (_provider, modelId) =>
      modelId === "qwen3-coder-plus" || modelId === "qwen3-coder-flash"
        ? duplicateMissingId
        : modelId,
    );

    assert.deepEqual(stale, [
      {
        apiModelId: duplicateMissingId,
        modelNames: ["Qwen3 Coder Plus", "Qwen3 Coder Flash"],
      },
    ]);
    assert.equal(
      formatStaleOverrides(stale),
      "shared-missing-model (Qwen3 Coder Plus, Qwen3 Coder Flash)",
    );
  });

  it("includes grouped stale override details in the success result", () => {
    const result = createConnectionSuccessResult(
      PROVIDERS.qwen,
      ["qwen3-coder-plus"],
      (_provider, modelId) => modelId,
    );

    assert.equal(result.kind, "stale-overrides");
    assert.match(result.message, /configured model IDs were not found/);
    assert.match(result.message, /Qwen3 Coder Flash/);
    assert.match(result.message, /qwen3-coder-flash/);
  });

  it("formats connection failure summaries without leaking stacks", () => {
    const requestError = new LlmRequestError({
      message: "raw transport message",
      userSummary: "Friendly provider summary",
      kind: "http",
      status: 401,
    });

    assert.equal(formatConnectionFailureDetail(requestError), "Friendly provider summary");
    assert.equal(formatConnectionFailureDetail(new Error("plain failure")), "plain failure");
    assert.equal(formatConnectionFailureDetail("string failure"), "string failure");
  });
});
