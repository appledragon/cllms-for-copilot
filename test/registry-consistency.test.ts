import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vscode from 'vscode';
import { MODELS, PROVIDERS } from '../src/consts';
import type { ProviderId } from '../src/types';
import { t } from '../src/i18n';

// ---- helpers ----

/** All model IDs from the MODELS registry. */
const allModelIds = MODELS.map((m) => m.id);

/**
 * Read and parse package.json (TypeScript-friendly).
 * We use a simple JSON parse of the dev file rather than relying on the
 * compiled output so tests catch stale source-level issues.
 */
function loadPackageJson(): Record<string, unknown> {
	const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8');
	return JSON.parse(raw);
}

// ---- i18n model details / tooltips ----

describe('i18n model coverage', () => {
	for (const modelId of allModelIds) {
		it(`has zh detail for ${modelId}`, () => {
			(vscode.env as { language: string }).language = 'zh-cn';
			const result = t(`model.${modelId}.detail`);
			assert.notEqual(result, `model.${modelId}.detail`, `missing zh detail for ${modelId}`);
			assert.ok(result.length > 0, `empty zh detail for ${modelId}`);
		});

		it(`has zh tooltip for ${modelId}`, () => {
			(vscode.env as { language: string }).language = 'zh-cn';
			const result = t(`model.${modelId}.tooltip`);
			assert.notEqual(result, `model.${modelId}.tooltip`, `missing zh tooltip for ${modelId}`);
			assert.ok(result.length > 0, `empty zh tooltip for ${modelId}`);
		});

		it(`has en detail for ${modelId}`, () => {
			(vscode.env as { language: string }).language = 'en';
			const result = t(`model.${modelId}.detail`);
			assert.notEqual(result, `model.${modelId}.detail`, `missing en detail for ${modelId}`);
			assert.ok(result.length > 0, `empty en detail for ${modelId}`);
		});

		it(`has en tooltip for ${modelId}`, () => {
			(vscode.env as { language: string }).language = 'en';
			const result = t(`model.${modelId}.tooltip`);
			assert.notEqual(result, `model.${modelId}.tooltip`, `missing en tooltip for ${modelId}`);
			assert.ok(result.length > 0, `empty en tooltip for ${modelId}`);
		});
	}
});

// ---- package.json provider settings ----

describe('package.json provider settings', () => {
	const pkg = loadPackageJson();
	const configProps = (pkg as { contributes?: { configuration?: { properties?: Record<string, unknown> } } })
		.contributes?.configuration?.properties ?? {};

	for (const [providerId, provider] of Object.entries(PROVIDERS)) {
		const modelsForProvider = MODELS.filter((m) => m.provider === providerId).map((m) => m.id);

		it(`defines baseUrl setting for provider "${providerId}"`, () => {
			const configKey = `cllms.${provider.baseUrlSetting}`;
			const prop = configProps[configKey];
			assert.ok(prop, `missing configuration property "${configKey}"`);
			assert.equal(typeof (prop as Record<string, unknown>).type, 'string', `${configKey} should have "type"`);
		});

		it(`defines modelIdOverrides setting for provider "${providerId}"`, () => {
			const configKey = `cllms.${provider.modelIdOverridesSetting}`;
			const prop = configProps[configKey];
			assert.ok(prop, `missing configuration property "${configKey}"`);
			const propObj = prop as Record<string, unknown>;
			assert.equal(propObj.type, 'object', `${configKey} should be type "object"`);

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
	}

	it('defines modelIdOverrides only for models that exist in MODELS', () => {
		// Gather all model IDs that appear in any provider's modelIdOverrides.
		const packageModelIds = new Set<string>();
		for (const provider of Object.values(PROVIDERS)) {
			const configKey = `cllms.${provider.modelIdOverridesSetting}`;
			const prop = configProps[configKey] as Record<string, unknown> | undefined;
			if (!prop?.properties) continue;
			for (const modelId of Object.keys(prop.properties as Record<string, unknown>)) {
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

describe('package.nls modelIdOverrides descriptions (English)', () => {
	const nlsRaw = readFileSync(join(__dirname, '..', '..', 'package.nls.json'), 'utf-8');
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

describe('package.nls modelIdOverrides descriptions (Chinese)', () => {
	const nlsRaw = readFileSync(join(__dirname, '..', '..', 'package.nls.zh-cn.json'), 'utf-8');
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

// ---- docs/adding-a-model.md provider list ----

describe('docs/adding-a-model.md provider coverage', () => {
	const docsPath = join(__dirname, '..', '..', 'docs', 'adding-a-model.md');
	const docsContent = readFileSync(docsPath, 'utf-8');

	it('mentions every provider in the existing provider list', () => {
		// Check the first occurrence: "existing provider (Qwen, z.ai/GLM, MiniMax, ...)"
		// The text may have markdown bold: **existing provider** (list)
		const firstProviderList = docsContent.match(
			/existing provider\**\s*\(([^)]+)\)/i,
		);
		assert.ok(firstProviderList, 'could not find the "existing provider" list in docs');
		const mentionedText = firstProviderList[1].toLowerCase();

		// The docs use abbreviated labels (e.g. "z.ai/GLM", "Xiaomi MiMo",
		// "Moonshot Kimi"), so match by the provider id or a key substring.
		const providerKeywords: Record<string, string> = {
			qwen: 'qwen',
			zai: 'z.ai',
			minimax: 'minimax',
			xiaomi: 'xiaomi',
			moonshot: 'moonshot',
			hunyuan: 'hunyuan',
		};
		for (const [pid, keyword] of Object.entries(providerKeywords)) {
			assert.ok(
				mentionedText.includes(keyword),
				`docs/adding-a-model.md "existing provider" list is missing provider "${pid}" (keyword: "${keyword}")`,
			);
		}
	});

	it('mentions all domestic providerIds in the code comment', () => {
		// The comment: ProviderId — MUST exist in PROVIDERS ('qwen' | 'zai' | 'minimax' | ...)
		const commentMatch = docsContent.match(
			/MUST exist in PROVIDERS\s*\(([^)]+)\)/,
		);
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

	it('mentions all domestic modelIdOverrides setting paths', () => {
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
			!docsContent.includes('five built-in providers'),
			'docs/adding-a-model.md still mentions "five built-in providers" — update to match actual count',
		);
	});

	it('does not say "内置五个服务商" in the Chinese version', () => {
		let zhContent: string;
		try {
			zhContent = readFileSync(join(__dirname, '..', '..', 'docs', 'adding-a-model.zh-cn.md'), 'utf-8');
		} catch {
			// Chinese doc may not exist; skip.
			return;
		}
		assert.ok(
			!zhContent.includes('内置五个服务商'),
			'docs/adding-a-model.zh-cn.md still mentions "内置五个服务商" — update to match actual count',
		);
	});
});
