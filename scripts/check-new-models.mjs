#!/usr/bin/env node

/**
 * Check for new models from each provider.
 *
 * Usage:
 *   node scripts/check-new-models.mjs          # Check all providers
 *   node scripts/check-new-models.mjs qwen     # Check only Qwen
 *   node scripts/check-new-models.mjs glm      # Check only GLM
 *
 * API Keys (set environment variables to enable API-based checks):
 *   DASHSCOPE_API_KEY    — Qwen / DashScope
 *   ZAI_API_KEY          — z.ai (Zhipu GLM)
 *   MINIMAX_API_KEY      — MiniMax
 *   MIMO_API_KEY         — Xiaomi MiMo
 *   MOONSHOT_API_KEY     — Moonshot (Kimi)
 *   HUNYUAN_API_KEY      — Tencent Hunyuan
 *
 *   Example:
 *     DASHSCOPE_API_KEY=sk-xxx ZAI_API_KEY=xxx node scripts/check-new-models.mjs
 *
 * Without API keys, the script prints manual check URLs for each provider.
 *
 * This script:
 * 1. Reads the current model IDs from src/consts.ts
 * 2. Fetches the latest model lists from each provider's /v1/models API
 * 3. Reports any new models not yet in consts.ts
 * 4. Reports any current models no longer in the remote list
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Parse current model IDs from consts.ts
// ---------------------------------------------------------------------------

function getCurrentModelIds() {
	const constsPath = join(ROOT, 'src', 'consts.ts');
	const source = readFileSync(constsPath, 'utf-8');

	// Extract all `id: '...'` values from the MODELS array
	const idRegex = /id:\s*'([^']+)'/g;
	const ids = [];
	let match;
	while ((match = idRegex.exec(source)) !== null) {
		ids.push(match[1]);
	}

	// Group by provider
	const byProvider = {};
	for (const id of ids) {
		const providerRegex = new RegExp(
			`id:\\s*'${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*?provider:\\s*'([^']+)'`,
			's',
		);
		const providerMatch = source.match(providerRegex);
		if (providerMatch) {
			const provider = providerMatch[1];
			if (!byProvider[provider]) byProvider[provider] = [];
			byProvider[provider].push(id);
		}
	}

	return { ids, byProvider };
}

// ---------------------------------------------------------------------------
// 2. Fetch helper
// ---------------------------------------------------------------------------

async function fetchJSON(url, options = {}) {
	try {
		const headers = {
			'User-Agent': 'cllms-model-checker/1.0',
			...(options.headers || {}),
		};
		if (options.apiKey) {
			headers['Authorization'] = `Bearer ${options.apiKey}`;
		}
		const res = await fetch(url, {
			...options,
			headers,
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) {
			console.error(`  ❌ HTTP ${res.status} for ${url}`);
			return null;
		}
		return await res.json();
	} catch (err) {
		console.error(`  ❌ Fetch error: ${err.message}`);
		return null;
	}
}

// ---------------------------------------------------------------------------
// 3. Generic model comparison logic
// ---------------------------------------------------------------------------

function compareModels(currentIds, remoteModels) {
	const newModels = remoteModels.filter((id) => !currentIds.includes(id));
	const deprecated = currentIds.filter((id) => !remoteModels.includes(id));

	if (newModels.length === 0) {
		console.log('  ✅ No new models found');
	} else {
		console.log(`  🆕 New models found (${newModels.length}):`);
		for (const id of newModels) {
			console.log(`    - ${id}`);
		}
	}

	if (deprecated.length > 0) {
		console.log(`  ⚠️  Current models not in remote list (${deprecated.length}):`);
		for (const id of deprecated) {
			console.log(`    - ${id}`);
		}
	}
}

// ---------------------------------------------------------------------------
// 4. Provider config
// ---------------------------------------------------------------------------

const PROVIDERS = {
	qwen: {
		label: '🔵 Qwen (DashScope)',
		envKey: 'DASHSCOPE_API_KEY',
		apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
		docUrl: 'https://help.aliyun.com/zh/model-studio/text-generation-model/',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('qwen') && !id.endsWith('-intl')),
		filterRemote: (ids) =>
			ids
				.filter(
					(id) =>
						/^qwen[\d.]*-(max|plus|flash|coder|vl)/.test(id) ||
						/^qwq/.test(id),
				)
				.filter((id) => !/-\d{4}-\d{2}-\d{2}$/.test(id))
				.filter((id) => !/-preview$/.test(id) && !/-thinking$/.test(id)),
	},
	glm: {
		label: '🟢 z.ai (Zhipu GLM)',
		envKey: 'ZAI_API_KEY',
		apiUrl: 'https://api.z.ai/api/paas/v4/models',
		docUrl: 'https://docs.bigmodel.cn/cn/guide/start/model-overview',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('glm-')),
		filterRemote: (ids) =>
			ids
				.filter((id) => /^glm-[\d.]+/.test(id))
				.filter((id) => !/-\d{6}$/.test(id) && !/-\d{4}-\d{2}-\d{2}$/.test(id)),
	},
	minimax: {
		label: '🟡 MiniMax',
		envKey: 'MINIMAX_API_KEY',
		apiUrl: 'https://api.minimax.io/v1/models',
		docUrl: 'https://www.minimaxi.com/',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('MiniMax-') && !id.endsWith('-intl')),
		filterRemote: (ids) => ids.filter((id) => /^MiniMax-M/i.test(id)),
	},
	mimo: {
		label: '🟠 Xiaomi MiMo',
		envKey: 'MIMO_API_KEY',
		apiUrl: 'https://api.xiaomimimo.com/v1/models',
		docUrl: 'https://platform.xiaomimimo.com/docs/en-US/price/pay-as-you-go',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('mimo-')),
		filterRemote: (ids) => ids.filter((id) => /^mimo-/.test(id)),
	},
	moonshot: {
		label: '🔴 Moonshot (Kimi)',
		envKey: 'MOONSHOT_API_KEY',
		apiUrl: 'https://api.moonshot.ai/v1/models',
		docUrl: 'https://platform.kimi.com/docs/overview',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('kimi-') && !id.endsWith('-intl')),
		filterRemote: (ids) => ids.filter((id) => /^kimi-/.test(id) || /^moonshot-/.test(id)),
	},
	hunyuan: {
		label: '🟣 Tencent Hunyuan',
		envKey: 'HUNYUAN_API_KEY',
		apiUrl: 'https://api.hunyuan.cloud.tencent.com/v1/models',
		docUrl: 'https://cloud.tencent.com/document/product/1729/104753',
		filterCurrent: (ids) => ids.filter((id) => id.startsWith('hunyuan-')),
		filterRemote: (ids) => ids.filter((id) => /^hunyuan/.test(id) && id.length > 6),
	},
};

// ---------------------------------------------------------------------------
// 5. Provider checker
// ---------------------------------------------------------------------------

async function checkProvider(key, allCurrentIds) {
	const provider = PROVIDERS[key];
	if (!provider) {
		console.error(`\n❌ Unknown provider: ${key}`);
		console.error(`   Available: ${Object.keys(PROVIDERS).join(', ')}`);
		return;
	}

	console.log(`\n${provider.label}`);

	const apiKey = process.env[provider.envKey];
	const currentIds = provider.filterCurrent(allCurrentIds);

	if (!apiKey) {
		console.log('  ⚠️  No API key set — skipping API check');
		console.log(`  💡 Set ${provider.envKey} env var to enable`);
		console.log(`  📄 Manual check: ${provider.docUrl}`);
		return;
	}

	const data = await fetchJSON(provider.apiUrl, { apiKey });
	if (!data?.data) {
		console.log('  ⚠️  Could not fetch model list');
		console.log(`  📄 Manual check: ${provider.docUrl}`);
		return;
	}

	const remoteModels = provider.filterRemote(data.data.map((m) => m.id));
	compareModels(currentIds, remoteModels);
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

async function main() {
	const filter = process.argv[2]?.toLowerCase();

	console.log('🔍 CLLMs New Model Checker');
	console.log('='.repeat(40));

	const { ids, byProvider } = getCurrentModelIds();
	console.log(`\n📋 Current models in consts.ts: ${ids.length} total`);
	for (const [provider, modelIds] of Object.entries(byProvider)) {
		console.log(`   ${provider}: ${modelIds.join(', ')}`);
	}

	// Check which API keys are available
	const keysAvailable = Object.entries(PROVIDERS).filter(
		([, p]) => process.env[p.envKey],
	);
	if (keysAvailable.length === 0) {
		console.log('\n⚠️  No API keys detected. Set environment variables to enable API checks:');
		for (const [, p] of Object.entries(PROVIDERS)) {
			console.log(`   ${p.envKey}`);
		}
		console.log('\n   Example:');
		console.log('   DASHSCOPE_API_KEY=sk-xxx node scripts/check-new-models.mjs');
	} else {
		console.log(`\n🔑 API keys detected for: ${keysAvailable.map(([k]) => k).join(', ')}`);
	}

	if (filter) {
		await checkProvider(filter, ids);
	} else {
		for (const key of Object.keys(PROVIDERS)) {
			await checkProvider(key, ids);
		}
	}

	console.log('\n' + '='.repeat(40));
	console.log('✨ Done! Review any 🆕 models above and add them to src/consts.ts');
	console.log('   See docs/adding-a-model.md for the step-by-step guide.');
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
