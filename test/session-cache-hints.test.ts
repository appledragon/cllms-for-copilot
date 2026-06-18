import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  selectSessionOptimizationHints,
  type SessionOptimizationSignals,
} from "../src/provider/pricing/cache-hints";
import type { SessionCostSummary } from "../src/provider/pricing/session";

function summary(overrides: Partial<SessionCostSummary> = {}): SessionCostSummary {
  return {
    currency: "USD",
    totalCost: 10,
    items: [],
    billedRequests: 1,
    unbilledRequests: 0,
    unbilledModelCount: 0,
    totalPromptTokens: 10_000,
    totalCachedPromptTokens: 1_000,
    utilityCost: 0,
    agentCost: 10,
    totalCacheSavings: 0,
    ...overrides,
  };
}

function signals(overrides: Partial<SessionOptimizationSignals> = {}): SessionOptimizationSignals {
  return {
    requestKind: "main-agent",
    toolCount: 10,
    toolsChanged: false,
    hasUnexpandedActivateTools: false,
    sortToolsForCacheEnabled: false,
    stabilizeToolListEnabled: false,
    replayReasoningScope: "all",
    ...overrides,
  };
}

describe("selectSessionOptimizationHints", () => {
  it("suggests sorting tools when tool schema drift coincides with low cache hit rate", () => {
    assert.deepEqual(selectSessionOptimizationHints(summary(), signals({ toolsChanged: true })), [
      "sort-tools-for-cache",
    ]);
  });

  it("does not suggest sorting tools when the setting is already enabled", () => {
    assert.deepEqual(
      selectSessionOptimizationHints(
        summary(),
        signals({ toolsChanged: true, sortToolsForCacheEnabled: true }),
      ),
      [],
    );
  });

  it("suggests stabilizing a large or unexpanded tool list with poor cache health", () => {
    assert.deepEqual(selectSessionOptimizationHints(summary(), signals({ toolCount: 80 })), [
      "stabilize-tool-list",
    ]);
    assert.deepEqual(
      selectSessionOptimizationHints(summary(), signals({ hasUnexpandedActivateTools: true })),
      ["stabilize-tool-list"],
    );
  });

  it("suggests latest-tool-loop for long high-cache sessions still replaying all reasoning", () => {
    assert.deepEqual(
      selectSessionOptimizationHints(
        summary({ totalPromptTokens: 250_000, totalCachedPromptTokens: 200_000 }),
        signals(),
      ),
      ["latest-tool-loop"],
    );
  });

  it("suggests utility cost control when helper requests dominate billed cost", () => {
    assert.deepEqual(
      selectSessionOptimizationHints(
        summary({ totalCost: 10, utilityCost: 3, agentCost: 7 }),
        signals({ requestKind: "chat-title" }),
      ),
      ["utility-cost-control"],
    );
  });
});
