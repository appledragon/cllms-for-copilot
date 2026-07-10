import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MODELS, PROVIDERS, getModelProvider } from "../src/consts";

describe("provider registry", () => {
  it("keys every provider under its own id", () => {
    for (const [key, provider] of Object.entries(PROVIDERS)) {
      assert.equal(provider.id, key);
    }
  });

  it("ships the built-in providers", () => {
    assert.deepEqual(Object.keys(PROVIDERS).sort(), [
      "deepseek",
      "hunyuan",
      "minimax",
      "minimax-intl",
      "moonshot",
      "moonshot-intl",
      "qwen",
      "qwen-intl",
      "xiaomi",
      "zai",
    ]);
  });

  it("gives each provider a unique secret key, host, and override setting", () => {
    const secrets = new Set<string>();
    const hosts = new Set<string>();
    const overrides = new Set<string>();
    for (const provider of Object.values(PROVIDERS)) {
      assert.equal(
        secrets.has(provider.apiKeySecret),
        false,
        `duplicate secret ${provider.apiKeySecret}`,
      );
      assert.equal(
        hosts.has(provider.officialHost),
        false,
        `duplicate host ${provider.officialHost}`,
      );
      assert.equal(
        overrides.has(provider.modelIdOverridesSetting),
        false,
        `duplicate override setting ${provider.modelIdOverridesSetting}`,
      );
      secrets.add(provider.apiKeySecret);
      hosts.add(provider.officialHost);
      overrides.add(provider.modelIdOverridesSetting);
    }
  });

  it("uses https endpoints and namespaced secret keys", () => {
    for (const provider of Object.values(PROVIDERS)) {
      assert.ok(provider.defaultBaseUrl.startsWith("https://"), provider.id);
      assert.ok(provider.apiKeySecret.startsWith("cllms."), provider.id);
      assert.ok(provider.externalUrls.apiKeys.startsWith("https://"), provider.id);
    }
  });

  it("maps each provider to its expected thinking style", () => {
    assert.equal(PROVIDERS.qwen.thinkingStyle, "qwen");
    assert.equal(PROVIDERS.deepseek.thinkingStyle, "glm");
    assert.equal(PROVIDERS.zai.thinkingStyle, "glm");
    assert.equal(PROVIDERS.minimax.thinkingStyle, "minimax");
    // MiMo and Kimi share GLM's `thinking: { type }` wire format.
    assert.equal(PROVIDERS.xiaomi.thinkingStyle, "glm");
    assert.equal(PROVIDERS.moonshot.thinkingStyle, "glm");
  });
});

describe("model registry", () => {
  it("has no duplicate model ids", () => {
    const ids = MODELS.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("points every model at a registered provider", () => {
    for (const model of MODELS) {
      assert.ok(PROVIDERS[model.provider], `unknown provider ${model.provider} for ${model.id}`);
      assert.equal(getModelProvider(model), PROVIDERS[model.provider]);
    }
  });

  it("declares sane token limits and boolean-ish capabilities", () => {
    for (const model of MODELS) {
      assert.ok(model.maxInputTokens > 0, `${model.id} maxInputTokens`);
      assert.ok(model.maxOutputTokens > 0, `${model.id} maxOutputTokens`);
      assert.equal(typeof model.capabilities.imageInput, "boolean");
      assert.equal(typeof model.capabilities.thinking, "boolean");
      assert.ok(
        typeof model.capabilities.toolCalling === "boolean" ||
          typeof model.capabilities.toolCalling === "number",
      );
    }
  });

  it("keeps pricing positive with cache-hit input no costlier than cache-miss", () => {
    for (const model of MODELS) {
      if (!model.pricing) continue;
      for (const currency of ["USD", "CNY"] as const) {
        const price = model.pricing[currency];
        const isFree =
          price.cacheHitInput === 0 && price.cacheMissInput === 0 && price.output === 0;
        if (isFree) continue; // free models have all-zero pricing
        assert.ok(price.cacheHitInput >= 0, `${model.id} ${currency} cacheHitInput`);
        assert.ok(price.cacheMissInput > 0, `${model.id} ${currency} cacheMissInput`);
        assert.ok(price.output > 0, `${model.id} ${currency} output`);
        assert.ok(
          price.cacheHitInput <= price.cacheMissInput,
          `${model.id} ${currency}: cacheHit should not exceed cacheMiss`,
        );
      }
    }
  });

  it("exposes the DeepSeek models on the deepseek provider", () => {
    const deepseekIds = MODELS.filter((m) => m.provider === "deepseek")
      .map((m) => m.id)
      .sort();
    assert.deepEqual(deepseekIds, ["deepseek-v4-flash", "deepseek-v4-pro"]);
    for (const model of MODELS.filter((m) => m.provider === "deepseek")) {
      assert.equal(model.capabilities.thinking, true, `${model.id} should be a thinking model`);
      assert.equal(model.capabilities.imageInput, false, `${model.id} is text-only`);
    }
  });

  it("exposes the MiniMax models on the minimax provider; only M3 has native vision", () => {
    const minimaxIds = MODELS.filter((m) => m.provider === "minimax")
      .map((m) => m.id)
      .sort();
    assert.deepEqual(minimaxIds, ["MiniMax-M2.5", "MiniMax-M2.7", "MiniMax-M3"]);
    for (const id of ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5"]) {
      const model = MODELS.find((m) => m.id === id);
      assert.ok(model, `missing ${id}`);
      assert.equal(model.capabilities.thinking, true, `${id} should be a thinking model`);
    }
    // M3 is natively multimodal; M2.x are text-only and use the vision proxy.
    assert.equal(MODELS.find((m) => m.id === "MiniMax-M3")?.capabilities.imageInput, true);
    assert.equal(MODELS.find((m) => m.id === "MiniMax-M2.7")?.capabilities.imageInput, false);
    assert.equal(MODELS.find((m) => m.id === "MiniMax-M2.5")?.capabilities.imageInput, false);
  });

  it("exposes the Xiaomi MiMo models on the xiaomi provider", () => {
    const xiaomiIds = MODELS.filter((m) => m.provider === "xiaomi")
      .map((m) => m.id)
      .sort();
    assert.deepEqual(xiaomiIds, ["mimo-v2-flash", "mimo-v2.5", "mimo-v2.5-pro"]);
    for (const model of MODELS.filter((m) => m.provider === "xiaomi")) {
      assert.equal(model.capabilities.thinking, true, `${model.id} should be a thinking model`);
    }
    // The omni model carries native vision; the others fall back to the proxy.
    assert.equal(MODELS.find((m) => m.id === "mimo-v2.5")?.capabilities.imageInput, true);
    assert.equal(MODELS.find((m) => m.id === "mimo-v2.5-pro")?.capabilities.imageInput, false);
    assert.equal(MODELS.find((m) => m.id === "mimo-v2-flash")?.capabilities.imageInput, false);
  });

  it("exposes the Moonshot Kimi models on the moonshot provider with native vision", () => {
    const moonshotIds = MODELS.filter((m) => m.provider === "moonshot")
      .map((m) => m.id)
      .sort();
    assert.deepEqual(moonshotIds, ["kimi-k2.5", "kimi-k2.6", "kimi-k2.7", "kimi-k2.7-code-highspeed"]);
    for (const model of MODELS.filter((m) => m.provider === "moonshot")) {
      assert.equal(model.capabilities.thinking, true, `${model.id} should be a thinking model`);
      assert.equal(model.capabilities.imageInput, true, `${model.id} is natively multimodal`);
    }
  });

  it("marks only the known native-vision models", () => {
    const visionIds = MODELS.filter((m) => m.capabilities.imageInput)
      .map((m) => m.id)
      .sort();
    assert.deepEqual(visionIds, [
      "MiniMax-M3",
      "MiniMax-M3-intl",
      "glm-5v-turbo",
      "kimi-k2.5",
      "kimi-k2.5-intl",
      "kimi-k2.6",
      "kimi-k2.6-intl",
      "kimi-k2.7",
      "kimi-k2.7-code-highspeed",
      "kimi-k2.7-code-highspeed-intl",
      "kimi-k2.7-intl",
      "mimo-v2.5",
      "qwen3-vl-plus",
      "qwen3-vl-plus-intl",
    ]);
  });
});
