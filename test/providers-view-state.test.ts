import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import vscode from "vscode";
import { MODELS, PROVIDERS } from "../src/consts";
import { t } from "../src/i18n";
import type { ProviderId } from "../src/types";
import { buildProvidersViewState } from "../src/view/providers/state";

function keyStates(states: Partial<Record<ProviderId, boolean>> = {}): Map<ProviderId, boolean> {
  return new Map<ProviderId, boolean>(
    (Object.keys(PROVIDERS) as ProviderId[]).map((id) => [id, states[id] ?? false]),
  );
}

describe("buildProvidersViewState", () => {
  beforeEach(() => {
    (vscode.env as { language: string }).language = "en";
  });

  it("lists every provider with key status, endpoint, and status label", () => {
    const state = buildProvidersViewState(keyStates({ qwen: true }));

    assert.equal(state.providers.length, Object.keys(PROVIDERS).length);

    const qwen = state.providers.find((provider) => provider.id === "qwen");
    const zai = state.providers.find((provider) => provider.id === "zai");
    assert.ok(qwen && zai);

    assert.equal(qwen.configured, true);
    assert.equal(qwen.statusLabel, t("auth.providerConfigured"));
    assert.equal(qwen.endpoint, PROVIDERS.qwen.defaultBaseUrl);

    assert.equal(zai.configured, false);
    assert.equal(zai.statusLabel, t("auth.providerNotConfigured"));
  });

  it("groups models under each provider following MODELS order", () => {
    const state = buildProvidersViewState(keyStates());

    const qwen = state.providers.find((provider) => provider.id === "qwen");
    assert.ok(qwen);

    const expected = MODELS.filter((model) => model.provider === "qwen").map((model) => model.id);
    assert.deepEqual(
      qwen.models.map((model) => model.id),
      expected,
    );

    const total = state.providers.reduce((sum, provider) => sum + provider.models.length, 0);
    assert.equal(total, MODELS.length);
  });

  it("surfaces vision/thinking badges and localized detail from the model definition", () => {
    const state = buildProvidersViewState(keyStates());
    const byId = new Map(MODELS.map((model) => [model.id, model]));

    for (const provider of state.providers) {
      for (const model of provider.models) {
        const definition = byId.get(model.id);
        assert.ok(definition, `unknown model ${model.id}`);
        assert.equal(model.vision, definition.capabilities.imageInput);
        assert.equal(model.thinking, definition.capabilities.thinking);
        assert.equal(model.detail, t(`model.${model.id}.detail`));
        assert.equal(model.tooltip, t(`model.${model.id}.tooltip`));
      }
    }
  });
});
