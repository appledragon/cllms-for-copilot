import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildThinkingFields, MAX_THINKING_BUDGET } from "../src/provider/thinking";

describe("buildThinkingFields", () => {
  describe("qwen style (flat enable_thinking)", () => {
    it('disables thinking for "none"', () => {
      assert.deepEqual(buildThinkingFields("qwen", "none"), { enable_thinking: false });
    });

    it('enables thinking for "high" without a budget', () => {
      assert.deepEqual(buildThinkingFields("qwen", "high"), { enable_thinking: true });
    });

    it('enables thinking and raises the budget for "max"', () => {
      assert.deepEqual(buildThinkingFields("qwen", "max"), {
        enable_thinking: true,
        thinking_budget: MAX_THINKING_BUDGET,
      });
    });

    it("never emits nested thinking / reasoning_split fields", () => {
      for (const effort of ["none", "high", "max"] as const) {
        const fields = buildThinkingFields("qwen", effort);
        assert.equal("thinking" in fields, false);
        assert.equal("reasoning_split" in fields, false);
      }
    });
  });

  describe("glm style (nested thinking.type enabled/disabled)", () => {
    it('maps "none" to disabled', () => {
      assert.deepEqual(buildThinkingFields("glm", "none"), { thinking: { type: "disabled" } });
    });

    for (const effort of ["high", "max"] as const) {
      it(`maps "${effort}" to enabled`, () => {
        assert.deepEqual(buildThinkingFields("glm", effort), { thinking: { type: "enabled" } });
      });
    }

    it("never emits qwen/minimax-only fields", () => {
      const fields = buildThinkingFields("glm", "high");
      assert.equal("enable_thinking" in fields, false);
      assert.equal("thinking_budget" in fields, false);
      assert.equal("reasoning_split" in fields, false);
    });
  });

  describe("deepseek style (thinking.type + reasoning_effort)", () => {
    it('maps "none" to disabled without reasoning_effort', () => {
      assert.deepEqual(buildThinkingFields("deepseek", "none"), { thinking: { type: "disabled" } });
    });

    it('maps "high" to enabled + reasoning_effort high', () => {
      assert.deepEqual(buildThinkingFields("deepseek", "high"), {
        thinking: { type: "enabled" },
        reasoning_effort: "high",
      });
    });

    it('maps "max" to enabled + reasoning_effort max', () => {
      assert.deepEqual(buildThinkingFields("deepseek", "max"), {
        thinking: { type: "enabled" },
        reasoning_effort: "max",
      });
    });

    it("never emits qwen/minimax-only fields", () => {
      const fields = buildThinkingFields("deepseek", "high");
      assert.equal("enable_thinking" in fields, false);
      assert.equal("thinking_budget" in fields, false);
      assert.equal("reasoning_split" in fields, false);
    });
  });

  describe("minimax style (nested thinking.type adaptive + reasoning_split)", () => {
    it('maps "none" to disabled but still sets reasoning_split', () => {
      assert.deepEqual(buildThinkingFields("minimax", "none"), {
        thinking: { type: "disabled" },
        reasoning_split: true,
      });
    });

    for (const effort of ["high", "max"] as const) {
      it(`maps "${effort}" to adaptive with reasoning_split`, () => {
        assert.deepEqual(buildThinkingFields("minimax", effort), {
          thinking: { type: "adaptive" },
          reasoning_split: true,
        });
      });
    }

    it("always requests reasoning_split regardless of effort", () => {
      for (const effort of ["none", "high", "max"] as const) {
        assert.equal(buildThinkingFields("minimax", effort).reasoning_split, true);
      }
    });
  });

  describe("reasoning_effort style (top-level reasoning_effort for Kimi K3)", () => {
    it('maps "none" to "low" (K3 cannot disable thinking)', () => {
      assert.deepEqual(buildThinkingFields("reasoning_effort", "none"), { reasoning_effort: "low" });
    });

    it('maps "high" to "high"', () => {
      assert.deepEqual(buildThinkingFields("reasoning_effort", "high"), { reasoning_effort: "high" });
    });

    it('maps "max" to "max"', () => {
      assert.deepEqual(buildThinkingFields("reasoning_effort", "max"), { reasoning_effort: "max" });
    });

    it("never emits enable_thinking / thinking / reasoning_split", () => {
      for (const effort of ["none", "high", "max"] as const) {
        const fields = buildThinkingFields("reasoning_effort", effort);
        assert.equal("enable_thinking" in fields, false);
        assert.equal("thinking" in fields, false);
        assert.equal("thinking_budget" in fields, false);
        assert.equal("reasoning_split" in fields, false);
      }
    });
  });

  describe("qwen_effort style (enable_thinking + reasoning_effort xhigh)", () => {
    it('maps "none" to enable_thinking false', () => {
      assert.deepEqual(buildThinkingFields("qwen_effort", "none"), { enable_thinking: false });
    });

    it('maps "high" to enable_thinking without a budget or effort', () => {
      assert.deepEqual(buildThinkingFields("qwen_effort", "high"), { enable_thinking: true });
    });

    it('maps "max" to enable_thinking + reasoning_effort xhigh', () => {
      assert.deepEqual(buildThinkingFields("qwen_effort", "max"), {
        enable_thinking: true,
        reasoning_effort: "xhigh",
      });
    });

    it("never emits thinking_budget (API rejects it together with reasoning_effort)", () => {
      for (const effort of ["none", "high", "max"] as const) {
        const fields = buildThinkingFields("qwen_effort", effort);
        assert.equal("thinking_budget" in fields, false);
        assert.equal("thinking" in fields, false);
        assert.equal("reasoning_split" in fields, false);
      }
    });
  });
});
