import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSessionCost, SessionCostTracker } from "../src/provider/pricing/session";
import type { LlmUsage, ModelDefinition } from "../src/types";

function model(id: string, overrides: Partial<ModelDefinition> = {}): ModelDefinition {
  return {
    id,
    name: id.toUpperCase(),
    provider: "qwen",
    family: "test",
    version: "1",
    detail: "",
    maxInputTokens: 1000,
    maxOutputTokens: 1000,
    capabilities: { toolCalling: true, imageInput: false, thinking: false },
    requiresThinkingParam: false,
    pricing: {
      USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
      CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
    },
    ...overrides,
  };
}

function usage(overrides: Partial<LlmUsage> = {}): LlmUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    ...overrides,
  };
}

describe("SessionCostTracker", () => {
  it("starts empty", () => {
    const tracker = new SessionCostTracker();
    assert.equal(tracker.isEmpty(), true);
    assert.equal(tracker.getTotalCost(), 0);
    assert.equal(tracker.getSummary(), undefined);
  });

  it("computes cost from cache-miss input, cached input, and output prices", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("qwen3-coder-plus"),
      usage({
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
        total_tokens: 2_000_000,
        prompt_tokens_details: { cached_tokens: 400_000 },
      }),
      "USD",
    );

    // 600k non-cached @ $1 + 400k cached @ $0.1 + 1M output @ $5
    // = 0.6 + 0.04 + 5 = 5.64 per 1M unit
    assert.ok(Math.abs(tracker.getTotalCost() - 5.64) < 1e-9);
    const summary = tracker.getSummary();
    assert.equal(summary?.currency, "USD");
    assert.equal(summary?.items.length, 1);
    assert.equal(summary?.items[0].requests, 1);
    // The cached portion of the prompt is surfaced for cache hit/miss insight.
    assert.equal(summary?.items[0].cachedPromptTokens, 400_000);
    assert.equal(summary?.items[0].cacheHitRate, 40);
    assert.ok(Math.abs((summary?.items[0].cacheSavings ?? 0) - 0.36) < 1e-9);
    assert.ok(Math.abs((summary?.items[0].averageCost ?? 0) - 5.64) < 1e-9);
    assert.ok(Math.abs((summary?.totalCacheSavings ?? 0) - 0.36) < 1e-9);
    assert.equal(summary?.billedRequests, 1);
    assert.equal(summary?.unbilledRequests, 0);
    assert.equal(summary?.unbilledModelCount, 0);
  });

  it("aggregates cached prompt tokens across requests for the same model", () => {
    const tracker = new SessionCostTracker();
    const m = model("qwen3-coder-plus");
    tracker.record(
      m,
      usage({
        prompt_tokens: 1000,
        prompt_tokens_details: { cached_tokens: 600 },
        total_tokens: 1000,
      }),
      "USD",
    );
    tracker.record(
      m,
      usage({
        prompt_tokens: 1000,
        prompt_tokens_details: { cached_tokens: 400 },
        total_tokens: 1000,
      }),
      "USD",
    );
    const summary = tracker.getSummary();
    assert.equal(summary?.items[0].promptTokens, 2000);
    assert.equal(summary?.items[0].cachedPromptTokens, 1000);
  });

  it("distinguishes billed from unbilled (no-pricing) requests", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("priced"),
      usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
    );
    tracker.record(model("free-1", { pricing: undefined }), usage({ prompt_tokens: 500 }), "USD");
    tracker.record(model("free-2", { pricing: undefined }), usage({ prompt_tokens: 500 }), "USD");
    tracker.record(model("free-1", { pricing: undefined }), usage({ prompt_tokens: 500 }), "USD");

    const summary = tracker.getSummary();
    assert.equal(summary?.billedRequests, 1);
    assert.equal(summary?.unbilledRequests, 3);
    // Two distinct unpriced models, even though one was seen twice.
    assert.equal(summary?.unbilledModelCount, 2);
    // Unbilled usage must never inflate the priced total ($1M input @ $1).
    assert.ok(Math.abs((summary?.totalCost ?? 0) - 1) < 1e-9);
  });

  it("summarizes unbilled-only usage instead of silently dropping it", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("free", { pricing: undefined }), usage({ prompt_tokens: 1000 }), "USD");
    // No priced usage → still "empty" for status-bar / total purposes ...
    assert.equal(tracker.isEmpty(), true);
    assert.equal(tracker.getTotalCost(), 0);
    // ... but the summary still surfaces the excluded requests.
    const summary = tracker.getSummary();
    assert.equal(summary?.items.length, 0);
    assert.equal(summary?.billedRequests, 0);
    assert.equal(summary?.unbilledRequests, 1);
    assert.equal(summary?.unbilledModelCount, 1);
    assert.equal(summary?.currency, "USD");
  });

  it("tracks unknown actual API models as unbilled usage", () => {
    const tracker = new SessionCostTracker();
    tracker.record(undefined, usage({ prompt_tokens: 1000 }), "USD", "utility", "custom-fast");
    const summary = tracker.getSummary();
    assert.equal(tracker.isEmpty(), true);
    assert.equal(summary?.unbilledRequests, 1);
    assert.equal(summary?.unbilledModelCount, 1);
    assert.equal(summary?.totalPromptTokens, 1000);
  });

  it("clears unbilled counters when the display currency changes", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("free", { pricing: undefined }), usage({ prompt_tokens: 1000 }), "USD");
    tracker.record(model("m"), usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }), "CNY");
    const summary = tracker.getSummary();
    assert.equal(summary?.currency, "CNY");
    assert.equal(summary?.unbilledRequests, 0);
    assert.equal(summary?.unbilledModelCount, 0);
    assert.equal(summary?.billedRequests, 1);
  });

  it("aggregates repeated usage for the same model", () => {
    const tracker = new SessionCostTracker();
    const m = model("qwen3-coder-plus");
    tracker.record(m, usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }), "USD");
    tracker.record(m, usage({ completion_tokens: 1_000_000, total_tokens: 1_000_000 }), "USD");

    const summary = tracker.getSummary();
    assert.equal(summary?.items.length, 1);
    assert.equal(summary?.items[0].requests, 2);
    assert.equal(summary?.items[0].promptTokens, 1_000_000);
    assert.equal(summary?.items[0].completionTokens, 1_000_000);
    // $1 input + $5 output = $6
    assert.ok(Math.abs(tracker.getTotalCost() - 6) < 1e-9);
  });

  it("sorts the breakdown by descending cost", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("cheap"), usage({ prompt_tokens: 1000, total_tokens: 1000 }), "USD");
    tracker.record(
      model("pricey"),
      usage({ completion_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
    );
    const summary = tracker.getSummary();
    assert.deepEqual(
      summary?.items.map((i) => i.modelId),
      ["pricey", "cheap"],
    );
  });

  it("ignores models without pricing in the active currency", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("no-price", { pricing: undefined }),
      usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
    );
    assert.equal(tracker.isEmpty(), true);
    assert.equal(tracker.getTotalCost(), 0);
  });

  it("ignores usage when no display currency is resolved", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("qwen3-coder-plus"), usage({ prompt_tokens: 1000 }), undefined);
    assert.equal(tracker.isEmpty(), true);
  });

  it("resets the tally when the display currency changes mid-session", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("m"), usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }), "USD");
    assert.ok(tracker.getTotalCost() > 0);

    tracker.record(model("m"), usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }), "CNY");
    const summary = tracker.getSummary();
    assert.equal(summary?.currency, "CNY");
    assert.equal(summary?.items.length, 1);
    assert.equal(summary?.items[0].requests, 1);
    // Only the CNY request remains: 1M input @ ¥4
    assert.ok(Math.abs(tracker.getTotalCost() - 4) < 1e-9);
  });

  it("reset clears all accumulated state", () => {
    const tracker = new SessionCostTracker();
    tracker.record(model("m"), usage({ prompt_tokens: 1_000_000, total_tokens: 1_000_000 }), "USD");
    tracker.reset();
    assert.equal(tracker.isEmpty(), true);
    assert.equal(tracker.getTotalCost(), 0);
    assert.equal(tracker.getSummary(), undefined);
  });

  it("tracks session-wide prompt/cached tokens for cache health (billed + unbilled)", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("m"),
      usage({
        prompt_tokens: 1000,
        prompt_tokens_details: { cached_tokens: 600 },
        total_tokens: 1000,
      }),
      "USD",
    );
    tracker.record(
      model("free", { pricing: undefined }),
      usage({ prompt_tokens: 1000, prompt_tokens_details: { cached_tokens: 200 } }),
      "USD",
    );
    const summary = tracker.getSummary();
    assert.equal(summary?.totalPromptTokens, 2000);
    assert.equal(summary?.totalCachedPromptTokens, 800);
  });

  it("clamps cached tokens to prompt tokens for cache health", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("m"),
      usage({
        prompt_tokens: 100,
        prompt_tokens_details: { cached_tokens: 999 },
        total_tokens: 100,
      }),
      "USD",
    );
    const summary = tracker.getSummary();
    assert.equal(summary?.totalPromptTokens, 100);
    assert.equal(summary?.totalCachedPromptTokens, 100);
  });

  it("attributes billed cost to utility vs agent tiers", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("m"),
      usage({ completion_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
      "agent",
    );
    tracker.record(
      model("m"),
      usage({ completion_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
      "utility",
    );
    const summary = tracker.getSummary();
    // Each request: 1M output @ $5.
    assert.ok(Math.abs((summary?.agentCost ?? 0) - 5) < 1e-9);
    assert.ok(Math.abs((summary?.utilityCost ?? 0) - 5) < 1e-9);
  });

  it("defaults cost attribution to the agent tier", () => {
    const tracker = new SessionCostTracker();
    tracker.record(
      model("m"),
      usage({ completion_tokens: 1_000_000, total_tokens: 1_000_000 }),
      "USD",
    );
    const summary = tracker.getSummary();
    assert.ok(Math.abs((summary?.agentCost ?? 0) - 5) < 1e-9);
    assert.equal(summary?.utilityCost, 0);
  });
});

describe("formatSessionCost", () => {
  it("formats USD with a dollar sign and 4 decimals", () => {
    assert.equal(formatSessionCost(1.5, "USD"), "$1.5000");
  });

  it("formats CNY with a yuan sign", () => {
    assert.equal(formatSessionCost(0.1234, "CNY"), "¥0.1234");
  });
});
