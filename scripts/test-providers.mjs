#!/usr/bin/env node

/**
 * Real provider smoke tests for cllms-for-copilot.
 *
 * Sends genuine end-to-end requests to any configured OpenAI-compatible
 * provider, mirroring the exact wire format the extension uses, so a pass means
 * the extension should work against that provider/key.
 *
 * Usage:
 *   node scripts/test-providers.mjs                 # every provider with an env key
 *   node scripts/test-providers.mjs glm             # one provider (alias glm -> zai)
 *   node scripts/test-providers.mjs qwen zai        # several providers
 *
 * Flags:
 *   --model <id>          override the chat/thinking/tools model
 *   --vision-model <id>   override the vision model
 *   --image <path|url>    image for the vision check (default: small embedded PNG)
 *   --base-url <url>      override base URL (proxy / GLM coding-plan endpoint)
 *   --only a,b,c          run a subset of: connectivity,chat,thinking,tools,vision
 *   --timeout <seconds>   per-request timeout (default: 60)
 *   --json                machine-readable JSON output
 *   --help                show this help
 *
 * API keys (read from environment, never printed):
 *   DASHSCOPE_API_KEY        — Qwen / DashScope            (DASHSCOPE_BASE_URL override)
 *   DASHSCOPE_INTL_API_KEY   — Qwen International
 *   ZAI_API_KEY              — z.ai (Zhipu GLM)            (ZAI_BASE_URL override)
 *   MINIMAX_API_KEY          — MiniMax
 *   MINIMAX_INTL_API_KEY     — MiniMax International
 *   MIMO_API_KEY             — Xiaomi MiMo
 *   MOONSHOT_API_KEY         — Moonshot (Kimi)
 *   MOONSHOT_INTL_API_KEY    — Moonshot International
 *   HUNYUAN_API_KEY          — Tencent Hunyuan
 *   DEEPSEEK_API_KEY         — DeepSeek
 *
 *   Example:
 *     ZAI_API_KEY=xxx node scripts/test-providers.mjs glm
 *
 * Note: this script intentionally MIRRORS (does not import) the request/SSE
 * logic in src/client/core.ts + src/client/sse.ts and the thinking-field
 * serialization in src/provider/thinking.ts. Keep them in sync when those
 * change. Exit code is non-zero if any hard check fails (CI-usable).
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Provider table — verified against PROVIDERS in src/consts.ts.
// Keyed by ProviderId so the parsed MODELS (which carry `provider`) map directly.
// ---------------------------------------------------------------------------

const PROVIDERS = {
	qwen: {
		name: 'Qwen (DashScope)',
		envKey: 'DASHSCOPE_API_KEY',
		baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		thinkingStyle: 'qwen',
	},
	'qwen-intl': {
		name: 'Qwen International',
		envKey: 'DASHSCOPE_INTL_API_KEY',
		baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		thinkingStyle: 'qwen',
	},
	deepseek: {
		name: 'DeepSeek',
		envKey: 'DEEPSEEK_API_KEY',
		baseUrl: 'https://api.deepseek.com/v1',
		thinkingStyle: 'deepseek',
	},
	zai: {
		name: 'z.ai (Zhipu GLM)',
		envKey: 'ZAI_API_KEY',
		baseUrl: 'https://api.z.ai/api/paas/v4',
		thinkingStyle: 'glm',
	},
	minimax: {
		name: 'MiniMax',
		envKey: 'MINIMAX_API_KEY',
		baseUrl: 'https://api.minimaxi.com/v1',
		thinkingStyle: 'minimax',
	},
	'minimax-intl': {
		name: 'MiniMax International',
		envKey: 'MINIMAX_INTL_API_KEY',
		baseUrl: 'https://api.minimax.io/v1',
		thinkingStyle: 'minimax',
	},
	xiaomi: {
		name: 'Xiaomi MiMo',
		envKey: 'MIMO_API_KEY',
		baseUrl: 'https://api.xiaomimimo.com/v1',
		thinkingStyle: 'glm',
	},
	moonshot: {
		name: 'Moonshot (Kimi)',
		envKey: 'MOONSHOT_API_KEY',
		baseUrl: 'https://api.moonshot.cn/v1',
		thinkingStyle: 'glm',
	},
	'moonshot-intl': {
		name: 'Moonshot International',
		envKey: 'MOONSHOT_INTL_API_KEY',
		baseUrl: 'https://api.moonshot.ai/v1',
		thinkingStyle: 'glm',
	},
	hunyuan: {
		name: 'Tencent Hunyuan',
		envKey: 'HUNYUAN_API_KEY',
		baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
		thinkingStyle: 'glm',
	},
};

/** User-friendly aliases mapping to the canonical ProviderId. */
const ALIASES = {
	glm: 'zai',
	'z.ai': 'zai',
	zhipu: 'zai',
	dashscope: 'qwen',
	tongyi: 'qwen',
	'qwen-international': 'qwen-intl',
	deepseek: 'deepseek',
	mimo: 'xiaomi',
	kimi: 'moonshot',
	'kimi-intl': 'moonshot-intl',
	tencent: 'hunyuan',
};

const CHECK_ORDER = ['connectivity', 'chat', 'thinking', 'tools', 'vision'];

const WEATHER_TOOL = {
	type: 'function',
	function: {
		name: 'get_weather',
		description: 'Get the current weather for a city.',
		parameters: {
			type: 'object',
			properties: {
				city: { type: 'string', description: 'City name, e.g. "Paris".' },
			},
			required: ['city'],
		},
	},
};

// ---------------------------------------------------------------------------
// consts.ts MODELS parse — slice from the MODELS declaration so the PROVIDERS
// table above it never contaminates the match, then pull {id, provider,
// imageInput, thinking} per entry (field order is stable in consts.ts).
// ---------------------------------------------------------------------------

function parseModels() {
	const source = readFileSync(join(ROOT, 'src', 'consts.ts'), 'utf-8');
	const start = source.indexOf('export const MODELS');
	const slice = start >= 0 ? source.slice(start) : source;

	const re =
		/\{\s*id:\s*'([^']+)'[\s\S]*?provider:\s*'([^']+)'[\s\S]*?imageInput:\s*(true|false)[\s\S]*?thinking:\s*(true|false)/g;
	const byProvider = {};
	let m;
	while ((m = re.exec(slice)) !== null) {
		const [block, id, provider, imageInput, thinking] = m;
		const styleMatch = /thinkingStyle:\s*'([^']+)'/.exec(block);
		(byProvider[provider] ??= []).push({
			id,
			provider,
			imageInput: imageInput === 'true',
			thinking: thinking === 'true',
			thinkingStyle: styleMatch?.[1],
		});
	}
	return byProvider;
}

function pickChatModel(models) {
	return (models.find((m) => m.thinking) ?? models[0])?.id;
}

function pickThinkingModel(models) {
	return models.find((m) => m.thinking)?.id;
}

function pickVisionModel(models) {
	return models.find((m) => m.imageInput)?.id;
}

function isThinkingModel(models, id) {
	return models.find((m) => m.id === id)?.thinking ?? false;
}

// ---------------------------------------------------------------------------
// Thinking-field serialization — mirrors buildThinkingFields in
// src/provider/thinking.ts (always the "enabled" path here).
// ---------------------------------------------------------------------------

function buildThinkingFields(style) {
	if (style === 'glm') {
		return { thinking: { type: 'enabled' } };
	}
	if (style === 'deepseek') {
		return { thinking: { type: 'enabled' }, reasoning_effort: 'high' };
	}
	if (style === 'minimax') {
		return { thinking: { type: 'adaptive' }, reasoning_split: true };
	}
	if (style === 'reasoning_effort') {
		return { reasoning_effort: 'high' };
	}
	if (style === 'qwen_effort') {
		return { enable_thinking: true, reasoning_effort: 'xhigh' };
	}
	return { enable_thinking: true };
}

// ---------------------------------------------------------------------------
// HTTP core — mirrors the body shape from src/provider/request.ts and the
// SSE handling from src/client/core.ts + src/client/sse.ts.
// ---------------------------------------------------------------------------

class ApiError extends Error {
	constructor(status, body) {
		super(`HTTP ${status}`);
		this.name = 'ApiError';
		this.status = status;
		this.body = body;
	}
}

function redact(text) {
	return String(text ?? '').replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***');
}

function truncate(text, max) {
	const s = String(text ?? '');
	return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function errMessage(error) {
	if (error instanceof ApiError) {
		return `HTTP ${error.status}: ${truncate(redact(error.body), 200)}`;
	}
	if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
		return 'request timed out';
	}
	return redact(error?.message ?? String(error));
}

async function safeText(res) {
	try {
		return (await res.text()).slice(0, 500);
	} catch {
		return '';
	}
}

async function listModels({ baseUrl, apiKey, timeoutMs }) {
	const res = await fetch(`${baseUrl}/models`, {
		method: 'GET',
		headers: { Authorization: `Bearer ${apiKey}` },
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!res.ok) {
		throw new ApiError(res.status, await safeText(res));
	}
	const json = await res.json().catch(() => ({}));
	const data = json?.data;
	if (!Array.isArray(data)) {
		return [];
	}
	return data.map((m) => m?.id).filter((id) => typeof id === 'string' && id.length > 0);
}

async function streamChat({ baseUrl, apiKey, model, messages, tools, toolChoice, thinking, timeoutMs }) {
	const body = { model, messages, stream: true, stream_options: { include_usage: true } };
	if (tools && tools.length > 0) {
		body.tools = tools;
		body.tool_choice = toolChoice ?? 'auto';
	}
	if (thinking) {
		Object.assign(body, thinking);
	}

	const res = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!res.ok || !res.body) {
		throw new ApiError(res.status, await safeText(res));
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let content = '';
	let reasoning = '';
	let usage;
	let streamError;
	const toolCalls = new Map();

	const handlePayload = (payload) => {
		if (payload === '[DONE]') {
			return true;
		}
		let chunk;
		try {
			chunk = JSON.parse(payload);
		} catch {
			return false;
		}
		if (chunk.error) {
			streamError = chunk.error;
			return true;
		}
		if (chunk.usage) {
			usage = chunk.usage;
		}
		const choice = chunk.choices?.[0];
		if (!choice) {
			return false;
		}
		const delta = choice.delta ?? {};
		if (delta.reasoning_content) {
			reasoning += delta.reasoning_content;
		}
		if (delta.content) {
			content += delta.content;
		}
		if (Array.isArray(delta.tool_calls)) {
			for (const tc of delta.tool_calls) {
				const idx = tc.index ?? 0;
				let pending = toolCalls.get(idx);
				if (!pending) {
					pending = { id: tc.id ?? '', name: '', arguments: '' };
					toolCalls.set(idx, pending);
				}
				if (tc.id && !pending.id) {
					pending.id = tc.id;
				}
				if (tc.function?.name) {
					pending.name += tc.function.name;
				}
				if (tc.function?.arguments) {
					pending.arguments += tc.function.arguments;
				}
			}
		}
		return false;
	};

	let done = false;
	while (!done) {
		const { done: streamDone, value } = await reader.read();
		if (streamDone) {
			break;
		}
		buffer += decoder.decode(value, { stream: true });
		let nl;
		while ((nl = buffer.indexOf('\n')) >= 0) {
			const line = buffer.slice(0, nl).trim();
			buffer = buffer.slice(nl + 1);
			if (!line || line.startsWith(':') || !line.startsWith('data:')) {
				continue;
			}
			if (handlePayload(line.slice('data:'.length).trim())) {
				done = true;
				break;
			}
		}
	}

	if (streamError) {
		const detail = typeof streamError === 'string' ? streamError : JSON.stringify(streamError);
		throw new Error(`stream error: ${truncate(redact(detail), 200)}`);
	}

	return { content, reasoning, usage, toolCalls: [...toolCalls.values()] };
}

// ---------------------------------------------------------------------------
// Default offline-safe vision image: a small PNG split diagonally into two
// colors, generated at runtime (no external file / network needed).
// ---------------------------------------------------------------------------

function makeCrcTable() {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeBuf = Buffer.from(type, 'ascii');
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([length, typeBuf, data, crc]);
}

function makeDefaultImageDataUrl() {
	const w = 48;
	const h = 48;
	const raw = Buffer.alloc(h * (1 + w * 4));
	let o = 0;
	for (let y = 0; y < h; y++) {
		raw[o++] = 0; // PNG filter type "none" per scanline.
		for (let x = 0; x < w; x++) {
			const top = x + y < w;
			const [r, g, b] = top ? [37, 99, 235] : [250, 204, 21]; // blue / yellow
			raw[o++] = r;
			raw[o++] = g;
			raw[o++] = b;
			raw[o++] = 255;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const png = Buffer.concat([
		signature,
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', deflateSync(raw)),
		pngChunk('IEND', Buffer.alloc(0)),
	]);
	return `data:image/png;base64,${png.toString('base64')}`;
}

function resolveImage(input) {
	if (!input) {
		return makeDefaultImageDataUrl();
	}
	if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:')) {
		return input;
	}
	const buf = readFileSync(input);
	const ext = input.slice(input.lastIndexOf('.') + 1).toLowerCase();
	const mime =
		{ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[ext] ??
		'image/png';
	return `data:${mime};base64,${buf.toString('base64')}`;
}

// ---------------------------------------------------------------------------
// The 5 checks. Each returns { status, detail, metrics? } and may throw (the
// timed() wrapper converts a throw into a FAIL with a redacted message).
// ---------------------------------------------------------------------------

async function runConnectivity(ctx) {
	try {
		const ids = await listModels(ctx);
		if (ids.length > 0) {
			return { status: 'pass', detail: `${ids.length} models advertised` };
		}
		return { status: 'warn', detail: 'endpoint returned no model list (chat may still work)' };
	} catch (error) {
		if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
			ctx.authFailed = true;
			return { status: 'fail', detail: `auth rejected (HTTP ${error.status})` };
		}
		return { status: 'warn', detail: `/models unavailable: ${errMessage(error)}` };
	}
}

async function runChat(ctx, model) {
	const r = await streamChat({
		...ctx,
		model,
		messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
	});
	if (!r.content.trim()) {
		return { status: 'fail', detail: 'no content streamed' };
	}
	const u = r.usage;
	const cached = u?.prompt_tokens_details?.cached_tokens ?? 0;
	const detail = u
		? `in=${u.prompt_tokens ?? '?'} out=${u.completion_tokens ?? '?'} cached=${cached}`
		: 'streamed (provider reported no usage)';
	return { status: 'pass', detail, metrics: { usage: u ?? null, contentChars: r.content.length } };
}

async function runThinking(ctx, model, style) {
	const r = await streamChat({
		...ctx,
		model,
		messages: [{ role: 'user', content: 'What is 17 * 24? Think briefly, then give the final number.' }],
		thinking: buildThinkingFields(style),
	});
	const chars = r.reasoning.length;
	if (chars > 0) {
		return { status: 'pass', detail: `reasoning_content: ${chars} chars`, metrics: { reasoningChars: chars } };
	}
	return {
		status: 'warn',
		detail: 'no reasoning_content received (model emitted no separate thinking)',
		metrics: { reasoningChars: 0 },
	};
}

async function runTools(ctx, model) {
	const r = await streamChat({
		...ctx,
		model,
		tools: [WEATHER_TOOL],
		toolChoice: 'auto',
		messages: [
			{ role: 'user', content: 'What is the weather in Paris right now? Use the get_weather tool to find out.' },
		],
	});
	const call = r.toolCalls.find((t) => t.name === 'get_weather') ?? r.toolCalls.find((t) => t.name);
	if (call?.name) {
		return {
			status: 'pass',
			detail: `tool_call: ${call.name}(${truncate(call.arguments, 60)})`,
			metrics: { toolName: call.name },
		};
	}
	if (r.content.trim()) {
		return { status: 'warn', detail: 'model answered inline (no tool_call)', metrics: { toolName: null } };
	}
	return { status: 'fail', detail: 'no tool_call and no content' };
}

async function runVision(ctx, model, imageUrl) {
	const r = await streamChat({
		...ctx,
		model,
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'Describe this image in one sentence.' },
					{ type: 'image_url', image_url: { url: imageUrl } },
				],
			},
		],
	});
	const text = r.content.trim().replace(/\s+/g, ' ');
	if (text) {
		return { status: 'pass', detail: `description: ${truncate(text, 80)}` };
	}
	return { status: 'fail', detail: 'no description returned' };
}

async function timed(fn) {
	const t = Date.now();
	try {
		const r = await fn();
		return { ...r, ms: Date.now() - t };
	} catch (error) {
		return { status: 'fail', detail: errMessage(error), ms: Date.now() - t };
	}
}

// ---------------------------------------------------------------------------
// Per-provider runner.
// ---------------------------------------------------------------------------

function baseUrlEnv(envKey) {
	return envKey.replace(/_API_KEY$/, '_BASE_URL');
}

async function runProvider(pid, opts, modelsByProvider) {
	const p = PROVIDERS[pid];
	const apiKey = process.env[p.envKey];
	const baseUrl = opts.baseUrl ?? process.env[baseUrlEnv(p.envKey)] ?? p.baseUrl;
	const models = modelsByProvider[pid] ?? [];
	const chatModel = opts.model ?? pickChatModel(models);
	const visionModel = opts.visionModel ?? pickVisionModel(models);
	const thinkingModel = opts.model
		? chatModel
		: isThinkingModel(models, chatModel)
			? chatModel
			: pickThinkingModel(models);

	const result = {
		provider: pid,
		name: p.name,
		baseUrl,
		chatModel: chatModel ?? null,
		thinkingModel: thinkingModel ?? null,
		visionModel: visionModel ?? null,
		checks: {},
	};

	if (!apiKey) {
		result.skipped = true;
		result.reason = `no ${p.envKey} set`;
		return result;
	}
	if (!chatModel) {
		result.skipped = true;
		result.reason = `no model for "${pid}" found in consts.ts (use --model)`;
		return result;
	}

	const ctx = { baseUrl, apiKey, timeoutMs: opts.timeoutMs, authFailed: false };
	const wanted = (id) => !opts.only || opts.only.includes(id);
	const skipAuth = { status: 'skip', detail: 'skipped after auth failure', ms: 0 };

	if (wanted('connectivity')) {
		result.checks.connectivity = await timed(() => runConnectivity(ctx));
	}
	if (wanted('chat')) {
		result.checks.chat = ctx.authFailed ? skipAuth : await timed(() => runChat(ctx, chatModel));
	}
	if (wanted('thinking')) {
		if (ctx.authFailed) {
			result.checks.thinking = skipAuth;
		} else if (!thinkingModel) {
			result.checks.thinking = {
				status: 'skip',
				detail: 'no thinking-capable model registered (use --model)',
				ms: 0,
			};
		} else {
			const modelStyle = models.find((m) => m.id === thinkingModel)?.thinkingStyle;
			result.checks.thinking = await timed(() =>
				runThinking(ctx, thinkingModel, modelStyle ?? p.thinkingStyle),
			);
		}
	}
	if (wanted('tools')) {
		result.checks.tools = ctx.authFailed ? skipAuth : await timed(() => runTools(ctx, chatModel));
	}
	if (wanted('vision')) {
		if (ctx.authFailed) {
			result.checks.vision = skipAuth;
		} else if (!visionModel) {
			result.checks.vision = {
				status: 'skip',
				detail: 'no vision-capable model registered (use --vision-model)',
				ms: 0,
			};
		} else {
			result.checks.vision = await timed(() => runVision(ctx, visionModel, opts.imageUrl));
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Reporting.
// ---------------------------------------------------------------------------

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const color = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => color('1', s);
const STATUS_STYLE = {
	pass: (s) => color('32', s),
	fail: (s) => color('31', s),
	warn: (s) => color('33', s),
	skip: (s) => color('90', s),
};

function statusLabel(status) {
	const style = STATUS_STYLE[status] ?? ((s) => s);
	return style(status.toUpperCase().padEnd(4));
}

function fmtMs(ms) {
	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function printProviderResult(r) {
	console.log('');
	console.log(bold(`=== ${r.name} [${r.provider}] ===`));
	if (r.skipped) {
		console.log(`  ${statusLabel('skip')} ${r.reason}`);
		return;
	}
	console.log(`  baseUrl: ${r.baseUrl}`);
	console.log(
		`  models:  chat=${r.chatModel}  thinking=${r.thinkingModel ?? '—'}  vision=${r.visionModel ?? '—'}`,
	);
	for (const id of CHECK_ORDER) {
		const c = r.checks[id];
		if (!c) {
			continue;
		}
		console.log(`  ${statusLabel(c.status)} ${id.padEnd(12)} ${fmtMs(c.ms).padStart(6)}  ${c.detail}`);
	}
}

function summarize(results) {
	const totals = { pass: 0, fail: 0, warn: 0, skip: 0 };
	for (const r of results) {
		if (r.skipped) {
			continue;
		}
		for (const id of CHECK_ORDER) {
			const c = r.checks[id];
			if (c && c.status in totals) {
				totals[c.status] += 1;
			}
		}
	}
	return totals;
}

function printSummary(summary, results) {
	console.log('');
	console.log(bold('=== Summary ==='));
	for (const r of results) {
		if (r.skipped) {
			console.log(`  ${r.name} [${r.provider}]: ${statusLabel('skip')} ${r.reason}`);
			continue;
		}
		const counts = {};
		for (const id of CHECK_ORDER) {
			const c = r.checks[id];
			if (c) {
				counts[c.status] = (counts[c.status] ?? 0) + 1;
			}
		}
		const parts = ['pass', 'warn', 'fail', 'skip'].filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`);
		console.log(`  ${r.name} [${r.provider}]: ${parts.join(', ') || 'no checks run'}`);
	}

	const overall =
		summary.fail > 0
			? STATUS_STYLE.fail('FAIL')
			: summary.warn > 0
				? STATUS_STYLE.warn('PASS (with warnings)')
				: STATUS_STYLE.pass('PASS');
	console.log('');
	console.log(
		`  Overall: ${overall}  (${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail, ${summary.skip} skip)`,
	);
}

function printNoKeys() {
	console.log('No provider API keys detected. Set one or more environment variables, e.g.:');
	console.log('');
	for (const p of Object.values(PROVIDERS)) {
		console.log(`  ${p.envKey.padEnd(24)} ${p.name}`);
	}
	console.log('');
	console.log('  Example:  ZAI_API_KEY=xxx node scripts/test-providers.mjs glm');
	console.log('  Help:     node scripts/test-providers.mjs --help');
}

function printHelp() {
	// The file header is the authoritative usage doc; surface it for --help.
	const header = readFileSync(fileURLToPath(import.meta.url), 'utf-8');
	const match = header.match(/\/\*\*([\s\S]*?)\*\//);
	const body = match
		? match[1]
				.split('\n')
				.map((line) => line.replace(/^\s*\*?\s?/, ''))
				.join('\n')
				.trim()
		: 'See scripts/test-providers.mjs header for usage.';
	console.log(body);
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const opts = {
		providers: [],
		only: null,
		json: false,
		model: null,
		visionModel: null,
		image: null,
		baseUrl: null,
		timeoutMs: 60_000,
		help: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--help' || a === '-h') {
			opts.help = true;
		} else if (a === '--json') {
			opts.json = true;
		} else if (a === '--model') {
			opts.model = argv[++i];
		} else if (a === '--vision-model') {
			opts.visionModel = argv[++i];
		} else if (a === '--image') {
			opts.image = argv[++i];
		} else if (a === '--base-url') {
			opts.baseUrl = argv[++i];
		} else if (a === '--only') {
			opts.only = (argv[++i] ?? '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (a === '--timeout') {
			const v = Number(argv[++i]);
			if (Number.isFinite(v) && v > 0) {
				opts.timeoutMs = v * 1000;
			}
		} else if (a.startsWith('-')) {
			console.error(`Unknown flag: ${a}`);
			opts.help = true;
		} else {
			opts.providers.push(a.toLowerCase());
		}
	}
	return opts;
}

function resolveProviderId(name) {
	if (PROVIDERS[name]) {
		return name;
	}
	return ALIASES[name];
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	if (opts.help) {
		printHelp();
		return 0;
	}

	if (opts.only) {
		const unknown = opts.only.filter((id) => !CHECK_ORDER.includes(id));
		if (unknown.length > 0) {
			console.error(`Unknown check(s) in --only: ${unknown.join(', ')}. Known: ${CHECK_ORDER.join(', ')}`);
			return 2;
		}
	}

	const modelsByProvider = parseModels();

	let pids;
	if (opts.providers.length > 0) {
		pids = [];
		for (const name of opts.providers) {
			const pid = resolveProviderId(name);
			if (!pid) {
				console.error(
					`Unknown provider: ${name}\n  Known: ${Object.keys(PROVIDERS).join(', ')}\n  Aliases: ${Object.keys(ALIASES).join(', ')}`,
				);
				return 2;
			}
			if (!pids.includes(pid)) {
				pids.push(pid);
			}
		}
	} else {
		pids = Object.keys(PROVIDERS).filter((pid) => process.env[PROVIDERS[pid].envKey]);
		if (pids.length === 0) {
			printNoKeys();
			return 0;
		}
	}

	try {
		opts.imageUrl = resolveImage(opts.image);
	} catch (error) {
		console.error(`Failed to load --image: ${errMessage(error)}`);
		return 2;
	}

	if (!opts.json) {
		console.log(bold('cllms — real provider smoke tests'));
		console.log(`Providers: ${pids.join(', ')}`);
	}

	const results = [];
	for (const pid of pids) {
		const r = await runProvider(pid, opts, modelsByProvider);
		results.push(r);
		if (!opts.json) {
			printProviderResult(r);
		}
	}

	const summary = summarize(results);
	if (opts.json) {
		console.log(JSON.stringify({ summary, providers: results }, null, 2));
	} else {
		printSummary(summary, results);
	}

	return summary.fail > 0 ? 1 : 0;
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error('Fatal error:', errMessage(error));
		process.exit(1);
	});
