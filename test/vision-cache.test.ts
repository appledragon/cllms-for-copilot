import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VisionDescriptionCache,
  computeVisionDescriptionCacheKey,
  createCachingVisionDescriber,
} from "../src/provider/vision/cache";
import type { VisionDescriber, VisionDescriptionRequest } from "../src/provider/vision/types";

const { CancellationTokenSource } = require("vscode");

function request(prompt: string, bytes: number[]): VisionDescriptionRequest {
  return {
    prompt,
    images: [{ mimeType: "image/png", data: new Uint8Array(bytes) }],
    token: new CancellationTokenSource().token,
  };
}

function describer(describe: VisionDescriber["describe"]): VisionDescriber {
  return { id: "test:model", source: "api-endpoint", describe };
}

describe("VisionDescriptionCache", () => {
  it("stores and returns values", () => {
    const cache = new VisionDescriptionCache();
    cache.set("k", "v");
    assert.equal(cache.get("k"), "v");
    assert.equal(cache.get("missing"), undefined);
  });

  it("evicts the least-recently-used entry past the bound", () => {
    const cache = new VisionDescriptionCache(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // bump "a" to most-recently-used
    cache.set("c", "3"); // evicts "b" (the LRU entry)
    assert.equal(cache.get("b"), undefined);
    assert.equal(cache.get("a"), "1");
    assert.equal(cache.get("c"), "3");
  });

  it("clear empties the cache", () => {
    const cache = new VisionDescriptionCache();
    cache.set("k", "v");
    cache.clear();
    assert.equal(cache.size, 0);
    assert.equal(cache.get("k"), undefined);
  });
});

describe("computeVisionDescriptionCacheKey", () => {
  it("is stable for identical inputs", () => {
    assert.equal(
      computeVisionDescriptionCacheKey("id", request("describe", [1, 2, 3])),
      computeVisionDescriptionCacheKey("id", request("describe", [1, 2, 3])),
    );
  });

  it("differs by describer id, prompt, and image bytes", () => {
    const base = computeVisionDescriptionCacheKey("id", request("describe", [1, 2, 3]));
    assert.notEqual(base, computeVisionDescriptionCacheKey("id2", request("describe", [1, 2, 3])));
    assert.notEqual(base, computeVisionDescriptionCacheKey("id", request("other", [1, 2, 3])));
    assert.notEqual(base, computeVisionDescriptionCacheKey("id", request("describe", [9, 9, 9])));
  });
});

describe("createCachingVisionDescriber", () => {
  it("calls the inner describer once for repeated identical requests", async () => {
    let calls = 0;
    const cached = createCachingVisionDescriber(
      describer(async () => {
        calls += 1;
        return `desc-${calls}`;
      }),
      new VisionDescriptionCache(),
    );
    const first = await cached.describe(request("p", [1]));
    const second = await cached.describe(request("p", [1]));
    assert.equal(first, "desc-1");
    assert.equal(second, "desc-1");
    assert.equal(calls, 1);
  });

  it("does not cache empty descriptions (upstream failure sentinel)", async () => {
    let calls = 0;
    const cached = createCachingVisionDescriber(
      describer(async () => {
        calls += 1;
        return "";
      }),
      new VisionDescriptionCache(),
    );
    await cached.describe(request("p", [1]));
    await cached.describe(request("p", [1]));
    assert.equal(calls, 2);
  });

  it("does not cache thrown errors", async () => {
    let calls = 0;
    const cached = createCachingVisionDescriber(
      describer(async () => {
        calls += 1;
        throw new Error("boom");
      }),
      new VisionDescriptionCache(),
    );
    await assert.rejects(() => cached.describe(request("p", [1])));
    await assert.rejects(() => cached.describe(request("p", [1])));
    assert.equal(calls, 2);
  });
});
