import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vscode from "vscode";
import { MODELS, PROVIDERS } from "../src/consts";
import type { ProviderId } from "../src/types";
import { t } from "../src/i18n";

// ---- helpers ----

/** All model IDs from the MODELS registry. */
const allModelIds = MODELS.map((m) => m.id);

/**
 * Read and parse package.json (TypeScript-friendly).
 * We use a simple JSON parse of the dev file rather than relying on the
 * compiled output so tests catch stale source-level issues.
 */
function loadPackageJson(): Record<string, unknown> {
  const raw = readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8");
  return JSON.parse(raw);
}

// ---- i18n model details / tooltips ----

describe("i18n model coverage", () => {
  for (const modelId of allModelIds) {
    it(`has zh detail for ${modelId}`, () => {
      (vscode.env as { language: string }).language = "zh-cn";
      const result = t(`model.${modelId}.detail`);
      assert.notEqual(result, `model.${modelId}.detail`, `missing zh detail for ${modelId}`);
      assert.ok(result.length > 0, `empty zh detail for ${modelId}`);
      // Keep picker details short so model names stay visible.
      assert.ok(
        [...result].length <= 10,
        `zh detail for ${modelId} is too long for the model picker (${[...result].length} > 10): ${result}`,
      );
    });

    it(`has zh tooltip for ${modelId}`, () => {
      (vscode.env as { language: string }).language = "zh-cn";
      const result = t(`model.${modelId}.tooltip`);
      assert.notEqual(result, `model.${modelId}.tooltip`, `missing zh tooltip for ${modelId}`);
      assert.ok(result.length > 0, `empty zh tooltip for ${modelId}`);
    });

    it(`has en detail for ${modelId}`, () => {
      (vscode.env as { language: string }).language = "en";
      const result = t(`model.${modelId}.detail`);
      assert.notEqual(result, `model.${modelId}.detail`, `missing en detail for ${modelId}`);
      assert.ok(result.length > 0, `empty en detail for ${modelId}`);
      // Copilot model picker truncates the name when detail is too long.
      assert.ok(
        result.length <= 24,
        `en detail for ${modelId} is too long for the model picker (${result.length} > 24): ${result}`,
      );
    });

    it(`has en tooltip for ${modelId}`, () => {
      (vscode.env as { language: string }).language = "en";
      const result = t(`model.${modelId}.tooltip`);
      assert.notEqual(result, `model.${modelId}.tooltip`, `missing en tooltip for ${modelId}`);
      assert.ok(result.length > 0, `empty en tooltip for ${modelId}`);
    });
  }
});

// ---- package.json provider settings ----

describe("package.json provider settings", () => {
  const pkg = loadPackageJson();
  const configProps =
    (pkg as { contributes?: { configuration?: { properties?: Record<string, unknown> } } })
      .contributes?.configuration?.properties ?? {};

  for (const [providerId, provider] of Object.entries(PROVIDERS)) {
    const modelsForProvider = MODELS.filter((m) => m.provider === providerId).map((m) => m.id);

    it(`defines baseUrl setting for provider "${providerId}"`, () => {
      const configKey = `cllms.${provider.baseUrlSetting}`;
      const prop = configProps[configKey];
      assert.ok(prop, `missing configuration property "${configKey}"`);
      assert.equal(
        typeof (prop as Record<string, unknown>).type,
        "string",
        `${configKey} should have "type"`,
      );
    });

    it(`defines modelIdOverrides setting for provider "${providerId}"`, () => {
      const configKey = `cllms.${provider.modelIdOverridesSetting}`;
      const prop = configProps[configKey];
      assert.ok(prop, `missing configuration property "${configKey}"`);
      const propObj = prop as Record<string, unknown>;
      assert.equal(propObj.type, "object", `${configKey} should be type "object"`);

      const props = propObj.properties as Record<string, unknown> | undefined;
      assert.ok(props, `${configKey} should have "properties"`);
    });

    it(`modelIdOverrides entries cover every model for provider "${providerId}"`, () => {
      const configKey = `cllms.${provider.modelIdOverridesSetting}`;
      const prop = configProps[configKey] as Record<string, unknown>;
      const props = (prop?.properties ?? {}) as Record<string, unknown>;

      for (const modelId of modelsForProvider) {
        assert.ok(
          props[modelId],
          `model "${modelId}" is missing from package.json "${configKey}.properties"`,
        );
      }
    });

    it(`modelIdOverrides defaults cover every model for provider "${providerId}"`, () => {
      const configKey = `cllms.${provider.modelIdOverridesSetting}`;
      const prop = configProps[configKey] as Record<string, unknown>;
      const defaults = (prop?.default ?? {}) as Record<string, unknown>;

      for (const modelId of modelsForProvider) {
        const defaultModelId = defaults[modelId];
        if (typeof defaultModelId !== "string") {
          assert.fail(`model "${modelId}" is missing from package.json "${configKey}.default"`);
        }
        assert.ok(
          defaultModelId.length > 0,
          `${configKey}.default["${modelId}"] should be non-empty`,
        );
      }
    });
  }

  it("defines modelIdOverrides properties and defaults only for models that exist in MODELS", () => {
    // Gather all model IDs that appear in any provider's modelIdOverrides schema/default map.
    const packageModelIds = new Set<string>();
    for (const provider of Object.values(PROVIDERS)) {
      const configKey = `cllms.${provider.modelIdOverridesSetting}`;
      const prop = configProps[configKey] as Record<string, unknown> | undefined;
      for (const modelId of Object.keys((prop?.properties ?? {}) as Record<string, unknown>)) {
        packageModelIds.add(modelId);
      }
      for (const modelId of Object.keys((prop?.default ?? {}) as Record<string, unknown>)) {
        packageModelIds.add(modelId);
      }
    }

    for (const packageModelId of packageModelIds) {
      assert.ok(
        allModelIds.includes(packageModelId),
        `package.json modelIdOverrides references "${packageModelId}" which is not in MODELS`,
      );
    }
  });
});

// ---- package.nls coverage (English) ----

describe("package.nls modelIdOverrides descriptions (English)", () => {
  const nlsRaw = readFileSync(join(__dirname, "..", "..", "package.nls.json"), "utf-8");
  const nls: Record<string, string> = JSON.parse(nlsRaw);

  for (const provider of Object.values(PROVIDERS)) {
    const modelsForProvider = MODELS.filter((m) => m.provider === provider.id).map((m) => m.id);

    for (const modelId of modelsForProvider) {
      // Only providers whose settings are namespaced for modelIdOverrides
      // need nls descriptions. The setting keys follow the pattern:
      //   cllms.config.<providerConfigPath>.modelIdOverrides.<modelId>.description
      //
      // The <providerConfigPath> is derived from the modelIdOverridesSetting, e.g.
      //   "modelIdOverrides"          → "config.modelIdOverrides"
      //   "qwenIntl.modelIdOverrides"  → "config.qwenIntl.modelIdOverrides"
      //   "zai.modelIdOverrides"       → "config.zai.modelIdOverrides"
      const settingKey = `cllms.config.${provider.modelIdOverridesSetting}.${modelId}.description`;
      it(`has en nls entry for ${settingKey}`, () => {
        const value = nls[settingKey];
        assert.ok(value, `missing ${settingKey} in package.nls.json`);
        assert.ok(value.length > 0, `empty ${settingKey} in package.nls.json`);
      });
    }
  }
});

// ---- package.nls.zh-cn coverage ----

describe("package.nls modelIdOverrides descriptions (Chinese)", () => {
  const nlsRaw = readFileSync(join(__dirname, "..", "..", "package.nls.zh-cn.json"), "utf-8");
  const nls: Record<string, string> = JSON.parse(nlsRaw);

  for (const provider of Object.values(PROVIDERS)) {
    const modelsForProvider = MODELS.filter((m) => m.provider === provider.id).map((m) => m.id);

    for (const modelId of modelsForProvider) {
      const settingKey = `cllms.config.${provider.modelIdOverridesSetting}.${modelId}.description`;
      it(`has zh-cn nls entry for ${settingKey}`, () => {
        const value = nls[settingKey];
        assert.ok(value, `missing ${settingKey} in package.nls.zh-cn.json`);
        assert.ok(value.length > 0, `empty ${settingKey} in package.nls.zh-cn.json`);
      });
    }
  }
});

// ---- new cllms.* optimization settings ----

describe("package.json optimization settings", () => {
  const pkg = loadPackageJson();
  const configProps =
    (pkg as { contributes?: { configuration?: { properties?: Record<string, unknown> } } })
      .contributes?.configuration?.properties ?? {};
  const commands = ((pkg as { contributes?: { commands?: Array<{ command: string }> } }).contributes
    ?.commands ?? []) as Array<{ command: string }>;
  const nlsEn: Record<string, string> = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.nls.json"), "utf-8"),
  );
  const nlsZh: Record<string, string> = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.nls.zh-cn.json"), "utf-8"),
  );

  const settings: Array<{ key: string; type: string; nls: string[] }> = [
    {
      key: "cllms.experimental.sortToolsForCache",
      type: "boolean",
      nls: ["cllms.config.experimental.sortToolsForCache.description"],
    },
    {
      key: "cllms.experimental.replayReasoningScope",
      type: "string",
      nls: [
        "cllms.config.experimental.replayReasoningScope.description",
        "cllms.config.experimental.replayReasoningScope.all",
        "cllms.config.experimental.replayReasoningScope.latestToolLoop",
      ],
    },
    {
      key: "cllms.visionProxy.timeoutMs",
      type: "number",
      nls: ["cllms.config.visionProxy.timeoutMs.description"],
    },
    {
      key: "cllms.utility.maxOutputTokens",
      type: "number",
      nls: ["cllms.config.utility.maxOutputTokens.description"],
    },
    {
      key: "cllms.utility.modelIdByProvider",
      type: "object",
      nls: ["cllms.config.utility.modelIdByProvider.description"],
    },
  ];

  for (const setting of settings) {
    it(`defines configuration "${setting.key}"`, () => {
      const prop = configProps[setting.key] as Record<string, unknown> | undefined;
      assert.ok(prop, `missing configuration property "${setting.key}"`);
      assert.equal(prop.type, setting.type, `${setting.key} should be type "${setting.type}"`);
    });

    for (const nlsKey of setting.nls) {
      it(`has en + zh-cn nls for "${nlsKey}"`, () => {
        assert.ok(nlsEn[nlsKey]?.length, `missing en nls "${nlsKey}"`);
        assert.ok(nlsZh[nlsKey]?.length, `missing zh-cn nls "${nlsKey}"`);
      });
    }
  }

  it("registers the configureUtilityModel command with localized titles", () => {
    assert.ok(
      commands.some((command) => command.command === "cllms.configureUtilityModel"),
      "package.json should contribute cllms.configureUtilityModel",
    );
    assert.ok(
      nlsEn["cllms.command.configureUtilityModel"]?.length,
      "missing en title for cllms.configureUtilityModel",
    );
    assert.ok(
      nlsZh["cllms.command.configureUtilityModel"]?.length,
      "missing zh-cn title for cllms.configureUtilityModel",
    );
  });

  it("limits utility model overrides to known provider ids", () => {
    const prop = configProps["cllms.utility.modelIdByProvider"] as
      | Record<string, unknown>
      | undefined;
    const properties = (prop?.properties ?? {}) as Record<string, unknown>;

    assert.equal(prop?.additionalProperties, false);
    assert.deepEqual(Object.keys(properties).sort(), Object.keys(PROVIDERS).sort());
    for (const providerId of Object.keys(PROVIDERS)) {
      assert.equal(
        (properties[providerId] as Record<string, unknown> | undefined)?.type,
        "string",
        `utility model override for "${providerId}" should be a string`,
      );
    }
  });
});

// ---- docs/adding-a-model.md provider list ----

describe("docs/adding-a-model.md provider coverage", () => {
  const docsPath = join(__dirname, "..", "..", "docs", "adding-a-model.md");
  const docsContent = readFileSync(docsPath, "utf-8");

  it("mentions every provider in the existing provider list", () => {
    // Check the first occurrence: "existing provider (Qwen, z.ai/GLM, MiniMax, ...)"
    // The text may have markdown bold: **existing provider** (list)
    const firstProviderList = docsContent.match(/existing provider\**\s*\(([^)]+)\)/i);
    assert.ok(firstProviderList, 'could not find the "existing provider" list in docs');
    const mentionedText = firstProviderList[1].toLowerCase();

    // The docs use abbreviated labels (e.g. "z.ai/GLM", "Xiaomi MiMo",
    // "Moonshot Kimi"), so match by the provider id or a key substring.
    const providerKeywords: Record<string, string> = {
      qwen: "qwen",
      zai: "z.ai",
      minimax: "minimax",
      xiaomi: "xiaomi",
      moonshot: "moonshot",
      hunyuan: "hunyuan",
    };
    for (const [pid, keyword] of Object.entries(providerKeywords)) {
      assert.ok(
        mentionedText.includes(keyword),
        `docs/adding-a-model.md "existing provider" list is missing provider "${pid}" (keyword: "${keyword}")`,
      );
    }
  });

  it("mentions all domestic providerIds in the code comment", () => {
    // The comment: ProviderId — MUST exist in PROVIDERS ('qwen' | 'zai' | 'minimax' | ...)
    const commentMatch = docsContent.match(/MUST exist in PROVIDERS\s*\(([^)]+)\)/);
    // Note: this test is a best-effort check; if the doc comment format
    // changes, we still check meaningful coverage.
    if (commentMatch) {
      const commentList = commentMatch[1];
      for (const pid of Object.keys(PROVIDERS)) {
        assert.ok(
          commentList.includes(`'${pid}'`),
          `docs/adding-a-model.md ProviderId comment is missing '${pid}'`,
        );
      }
    }
  });

  it("mentions all domestic modelIdOverrides setting paths", () => {
    for (const pid of Object.keys(PROVIDERS) as ProviderId[]) {
      const provider = PROVIDERS[pid];
      const settingPath = `cllms.${provider.modelIdOverridesSetting}`;
      assert.ok(
        docsContent.includes(settingPath),
        `docs/adding-a-model.md is missing modelIdOverrides path "${settingPath}"`,
      );
    }
  });

  it('does not say "five built-in providers" (outdated count)', () => {
    assert.ok(
      !docsContent.includes("five built-in providers"),
      'docs/adding-a-model.md still mentions "five built-in providers" — update to match actual count',
    );
  });

  it('does not say "内置五个服务商" in the Chinese version', () => {
    let zhContent: string;
    try {
      zhContent = readFileSync(
        join(__dirname, "..", "..", "docs", "adding-a-model.zh-cn.md"),
        "utf-8",
      );
    } catch {
      // Chinese doc may not exist; skip.
      return;
    }
    assert.ok(
      !zhContent.includes("内置五个服务商"),
      'docs/adding-a-model.zh-cn.md still mentions "内置五个服务商" — update to match actual count',
    );
  });
});

// ---- README utility cost-control section ----

describe("README utility cost-control docs", () => {
  const readme = readFileSync(join(__dirname, "..", "..", "README.md"), "utf-8");
  const readmeZh = readFileSync(join(__dirname, "..", "..", "README.zh-cn.md"), "utf-8");

  // Terms that must appear in both locales so the strategy doc cannot silently
  // drift or fall out of sync between English and Chinese.
  const sharedTerms = [
    "cllms.utility.maxOutputTokens",
    "cllms.utility.modelIdByProvider",
    "chat.utilityModel",
  ];

  it("documents the utility cost-control section in English", () => {
    assert.ok(
      readme.includes("Utility cost control"),
      'README.md is missing the "Utility cost control" section',
    );
    for (const term of sharedTerms) {
      assert.ok(readme.includes(term), `README.md is missing "${term}"`);
    }
  });

  it("documents the utility cost-control section in Chinese", () => {
    assert.ok(
      readmeZh.includes("辅助请求成本控制"),
      'README.zh-cn.md is missing the "辅助请求成本控制" section',
    );
    for (const term of sharedTerms) {
      assert.ok(readmeZh.includes(term), `README.zh-cn.md is missing "${term}"`);
    }
  });
});
