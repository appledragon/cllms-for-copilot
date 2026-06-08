import { LLM_TOOLS_LIMIT } from './provider/tools/consts';
import type { ModelDefinition, ProviderDefinition, ProviderId } from './types';

/**
 * Compile-time constants shared across the extension.
 *
 * These do NOT depend on the VS Code runtime (no workspace configuration,
 * no secrets API). For run-time settings reads see `config.ts`.
 */

/** VS Code configuration section prefix for all extension settings. */
export const CONFIG_SECTION = 'cllms';

export const EXTERNAL_URLS = {
	qwen: {
		// Mainland-China (Bailian) endpoint — domestic API keys from
		// the Alibaba Cloud Bailian console.
		apiKeys: 'https://bailian.console.aliyun.com/cn-beijing?tab=api#/api',
		usage: 'https://bailian.console.aliyun.com/cn-beijing?tab=usage#/usage',
		status: 'https://status.aliyun.com',
	},
	qwenIntl: {
		// International (Singapore) endpoint — API keys from
		// Alibaba Cloud Model Studio.
		apiKeys: 'https://modelstudio.console.alibabacloud.com/?tab=model#/api-key',
		usage: 'https://modelstudio.console.alibabacloud.com',
		status: 'https://status.aliyun.com',
	},
	zai: {
		apiKeys: 'https://z.ai/manage-apikey/apikey-list',
		usage: 'https://docs.z.ai/guides/overview/pricing',
		status: 'https://status.z.ai',
	},
	minimax: {
		// Mainland-China endpoint — domestic API keys from
		// platform.minimaxi.com.
		apiKeys: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
		usage: 'https://platform.minimaxi.com/user-center/basic-information',
		status: 'https://platform.minimaxi.com',
	},
	minimaxIntl: {
		// International endpoint — API keys from platform.minimax.io.
		apiKeys: 'https://platform.minimax.io/user-center/basic-information/interface-key',
		usage: 'https://platform.minimax.io/user-center/basic-information',
		status: 'https://platform.minimax.io',
	},
	xiaomi: {
		// The MiMo console (API Keys + Balance) lives at the platform root; the
		// pricing doc is the most stable billing reference.
		apiKeys: 'https://platform.xiaomimimo.com',
		usage: 'https://platform.xiaomimimo.com/docs/en-US/price/pay-as-you-go',
		status: 'https://platform.xiaomimimo.com',
	},
	moonshot: {
		// Mainland-China endpoint — domestic API keys from
		// platform.moonshot.cn.
		apiKeys: 'https://platform.moonshot.cn/console/api-keys',
		usage: 'https://platform.moonshot.cn/console',
		status: 'https://status.moonshot.cn',
	},
	moonshotIntl: {
		// International endpoint — API keys from platform.moonshot.ai.
		apiKeys: 'https://platform.moonshot.ai/console/api-keys',
		usage: 'https://platform.moonshot.ai/console',
		status: 'https://status.moonshot.ai',
	},
	hunyuan: {
		// Tencent Hunyuan OpenAI-compatible endpoint — API keys from
		// the Tencent Cloud console.
		apiKeys: 'https://console.cloud.tencent.com/hunyuan',
		usage: 'https://console.cloud.tencent.com/hunyuan',
		status: 'https://cloud.tencent.com',
	},
} as const;

// ---- Provider registry ----

/**
 * Supported OpenAI-compatible providers. The `qwen` provider keeps the legacy
 * (unprefixed) settings keys for backward compatibility; additional providers
 * namespace their settings under `<id>.`.
 */
export const PROVIDERS: Readonly<Record<ProviderId, ProviderDefinition>> = {
	qwen: {
		id: 'qwen',
		name: 'Qwen (DashScope 国内)',
		// Mainland-China (Bailian) endpoint — domestic API keys only.
		defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		baseUrlSetting: 'baseUrl',
		apiKeySecret: 'cllms.apiKey',
		apiKeySetting: 'apiKey',
		modelIdOverridesSetting: 'modelIdOverrides',
		officialHost: 'dashscope.aliyuncs.com',
		thinkingStyle: 'qwen',
		externalUrls: EXTERNAL_URLS.qwen,
	},
	'qwen-intl': {
		id: 'qwen-intl',
		name: 'Qwen (DashScope International)',
		// International (Singapore) endpoint — international API keys only.
		defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		baseUrlSetting: 'qwenIntl.baseUrl',
		apiKeySecret: 'cllms.qwenIntl.apiKey',
		apiKeySetting: 'qwenIntl.apiKey',
		modelIdOverridesSetting: 'qwenIntl.modelIdOverrides',
		officialHost: 'dashscope-intl.aliyuncs.com',
		thinkingStyle: 'qwen',
		externalUrls: EXTERNAL_URLS.qwenIntl,
	},
	zai: {
		id: 'zai',
		name: 'z.ai (Zhipu GLM)',
		defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
		baseUrlSetting: 'zai.baseUrl',
		apiKeySecret: 'cllms.zai.apiKey',
		apiKeySetting: 'zai.apiKey',
		modelIdOverridesSetting: 'zai.modelIdOverrides',
		officialHost: 'api.z.ai',
		thinkingStyle: 'glm',
		externalUrls: EXTERNAL_URLS.zai,
	},
	minimax: {
		id: 'minimax',
		name: 'MiniMax (国内)',
		// Mainland-China endpoint — domestic API keys only.
		defaultBaseUrl: 'https://api.minimaxi.com/v1',
		baseUrlSetting: 'minimax.baseUrl',
		apiKeySecret: 'cllms.minimax.apiKey',
		apiKeySetting: 'minimax.apiKey',
		modelIdOverridesSetting: 'minimax.modelIdOverrides',
		officialHost: 'api.minimaxi.com',
		thinkingStyle: 'minimax',
		externalUrls: EXTERNAL_URLS.minimax,
	},
	'minimax-intl': {
		id: 'minimax-intl',
		name: 'MiniMax (International)',
		// International endpoint — international API keys only.
		defaultBaseUrl: 'https://api.minimax.io/v1',
		baseUrlSetting: 'minimaxIntl.baseUrl',
		apiKeySecret: 'cllms.minimaxIntl.apiKey',
		apiKeySetting: 'minimaxIntl.apiKey',
		modelIdOverridesSetting: 'minimaxIntl.modelIdOverrides',
		officialHost: 'api.minimax.io',
		thinkingStyle: 'minimax',
		externalUrls: EXTERNAL_URLS.minimaxIntl,
	},
	xiaomi: {
		id: 'xiaomi',
		name: 'Xiaomi MiMo',
		defaultBaseUrl: 'https://api.xiaomimimo.com/v1',
		baseUrlSetting: 'xiaomi.baseUrl',
		apiKeySecret: 'cllms.xiaomi.apiKey',
		apiKeySetting: 'xiaomi.apiKey',
		modelIdOverridesSetting: 'xiaomi.modelIdOverrides',
		officialHost: 'api.xiaomimimo.com',
		// MiMo uses the same `thinking: { type: 'enabled' | 'disabled' }` wire
		// format as GLM (no thinking_budget / reasoning_effort support).
		thinkingStyle: 'glm',
		externalUrls: EXTERNAL_URLS.xiaomi,
	},
	moonshot: {
		id: 'moonshot',
		name: 'Moonshot (Kimi 国内)',
		// Mainland-China endpoint — domestic API keys only.
		defaultBaseUrl: 'https://api.moonshot.cn/v1',
		baseUrlSetting: 'moonshot.baseUrl',
		apiKeySecret: 'cllms.moonshot.apiKey',
		apiKeySetting: 'moonshot.apiKey',
		modelIdOverridesSetting: 'moonshot.modelIdOverrides',
		officialHost: 'api.moonshot.cn',
		// Kimi K2.6/K2.5 use the same `thinking: { type: 'enabled' | 'disabled' }`
		// wire format as GLM (thinking on by default); reasoning streams in
		// `reasoning_content`.
		thinkingStyle: 'glm',
		externalUrls: EXTERNAL_URLS.moonshot,
	},
	'moonshot-intl': {
		id: 'moonshot-intl',
		name: 'Moonshot (Kimi International)',
		// International endpoint — international API keys only.
		defaultBaseUrl: 'https://api.moonshot.ai/v1',
		baseUrlSetting: 'moonshotIntl.baseUrl',
		apiKeySecret: 'cllms.moonshotIntl.apiKey',
		apiKeySetting: 'moonshotIntl.apiKey',
		modelIdOverridesSetting: 'moonshotIntl.modelIdOverrides',
		officialHost: 'api.moonshot.ai',
		thinkingStyle: 'glm',
		externalUrls: EXTERNAL_URLS.moonshotIntl,
	},
	hunyuan: {
		id: 'hunyuan',
		name: 'Tencent Hunyuan (混元)',
		defaultBaseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
		baseUrlSetting: 'hunyuan.baseUrl',
		apiKeySecret: 'cllms.hunyuan.apiKey',
		apiKeySetting: 'hunyuan.apiKey',
		modelIdOverridesSetting: 'hunyuan.modelIdOverrides',
		officialHost: 'api.hunyuan.cloud.tencent.com',
		// Hunyuan T1 / HY 2.0 Think use deep thinking natively; toggle via
		// GLM-style `thinking: { type: 'enabled' | 'disabled' }`.
		thinkingStyle: 'glm',
		externalUrls: EXTERNAL_URLS.hunyuan,
	},
};

/** Resolve the provider definition that owns a given model. */
export function getModelProvider(model: ModelDefinition): ProviderDefinition {
	return PROVIDERS[model.provider];
}

/** URI path handled by this extension to reveal the output log. */
export const SHOW_LOGS_URI_PATH = '/showLogs';

/** URI path handled by this extension to open API key configuration. */
export const CONFIGURE_API_KEY_URI_PATH = '/setApiKey';

/** URI path handled by this extension to open vision model configuration. */
export const SET_VISION_MODEL_URI_PATH = '/setVisionModel';

// VS Code's internal LanguageModelChatMessageRole.System is not exposed in @types/vscode.
export const LANGUAGE_MODEL_CHAT_SYSTEM_ROLE = 3;

// ---- Secret keys ----

/** SecretStorage key for the Qwen API key. */
export const API_KEY_SECRET = 'cllms.apiKey';

/** memento key tracking whether the welcome walkthrough has been shown. */
export const WELCOME_SHOWN_KEY = 'cllms.welcomeShown';

// ---- Walkthrough ----

/** Walkthrough contribution ID. */
export const WALKTHROUGH_ID = 'cuilian.cllms-for-copilot#cllmsGettingStarted';

// ---- Model registry ----

/**
 * Available CLLMs models exposed through the language model provider.
 *
 * IDs are the DashScope model names sent to the API and can be overridden via
 * the `cllms.modelIdOverrides` setting for third-party / self-hosted
 * OpenAI-compatible providers. Pricing is approximate DashScope public pricing
 * (per 1M tokens) and only drives the model picker's cost hints.
 */
export const MODELS: ModelDefinition[] = [
	{
		id: 'qwen3-coder-plus',
		name: 'Qwen3 Coder Plus',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Agentic coding & tool use',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'qwen-plus',
		name: 'Qwen Plus',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen-plus',
		detail: 'Balanced, hybrid thinking',
		maxInputTokens: 1000000,
		maxOutputTokens: 32768,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.4, output: 1.2 },
			CNY: { cacheHitInput: 0.32, cacheMissInput: 0.8, output: 2 },
		},
		priceCategory: 'low',
	},
	{
		id: 'qwen3-max',
		name: 'Qwen3 Max',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Flagship model',
		maxInputTokens: 262144,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			// Stable `qwen3-max` is an instruct model and rejects `enable_thinking`.
			// For a thinking flagship, override the API id to `qwen3-max-preview`
			// (or `qwen3-max-thinking`) via `cllms.modelIdOverrides` and flip
			// this to true.
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.24, cacheMissInput: 1.2, output: 6 },
			CNY: { cacheHitInput: 1.2, cacheMissInput: 6, output: 30 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'qwen3-vl-plus',
		name: 'Qwen3-VL Plus',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3-vl',
		detail: 'Native vision model',
		maxInputTokens: 262144,
		maxOutputTokens: 32768,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.8, output: 3.2 },
			CNY: { cacheHitInput: 0.6, cacheMissInput: 1.5, output: 6 },
		},
		priceCategory: 'medium',
	},

	// ---- Qwen (DashScope International / Singapore) ----
	// Models are identical to the domestic Qwen lineup but connect to the
	// international DashScope endpoint with a separate API key.  VS Code model
	// IDs are suffixed with `-intl`; default modelIdOverrides strip the suffix
	// so the wire model name stays standard.
	{
		id: 'qwen3-coder-plus-intl',
		name: 'Qwen3 Coder Plus (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Agentic coding & tool use',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'qwen-plus-intl',
		name: 'Qwen Plus (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen-plus',
		detail: 'Balanced, hybrid thinking',
		maxInputTokens: 1000000,
		maxOutputTokens: 32768,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.4, output: 1.2 },
			CNY: { cacheHitInput: 0.32, cacheMissInput: 0.8, output: 2 },
		},
		priceCategory: 'low',
	},
	{
		id: 'qwen3-max-intl',
		name: 'Qwen3 Max (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Flagship model',
		maxInputTokens: 262144,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.24, cacheMissInput: 1.2, output: 6 },
			CNY: { cacheHitInput: 1.2, cacheMissInput: 6, output: 30 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'qwen3-vl-plus-intl',
		name: 'Qwen3-VL Plus (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3-vl',
		detail: 'Native vision model',
		maxInputTokens: 262144,
		maxOutputTokens: 32768,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.8, output: 3.2 },
			CNY: { cacheHitInput: 0.6, cacheMissInput: 1.5, output: 6 },
		},
		priceCategory: 'medium',
	},

	// ---- z.ai (Zhipu GLM) ----
	// Pricing is z.ai's public USD pricing per 1M tokens; CNY values are
	// approximate conversions and only drive the picker's cost hints. GLM uses
	// `thinking: { type: 'enabled' | 'disabled' }` (handled via provider style).
	{
		id: 'glm-4.6',
		name: 'GLM-4.6',
		provider: 'zai',
		family: 'glm',
		version: 'glm-4.6',
		detail: 'Flagship coding & agents',
		maxInputTokens: 200000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.11, cacheMissInput: 0.6, output: 2.2 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 4.3, output: 16 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'glm-4.5-air',
		name: 'GLM-4.5-Air',
		provider: 'zai',
		family: 'glm',
		version: 'glm-4.5',
		detail: 'Lightweight & fast',
		maxInputTokens: 128000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.03, cacheMissInput: 0.2, output: 1.1 },
			CNY: { cacheHitInput: 0.2, cacheMissInput: 1.5, output: 8 },
		},
		priceCategory: 'low',
	},
	{
		id: 'glm-4.5v',
		name: 'GLM-4.5V',
		provider: 'zai',
		family: 'glm',
		version: 'glm-4.5v',
		detail: 'Native vision model',
		maxInputTokens: 65536,
		maxOutputTokens: 16384,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.11, cacheMissInput: 0.6, output: 1.8 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 4.3, output: 13 },
		},
		priceCategory: 'medium',
	},

	// ---- MiniMax ----
	// MiniMax reasoning is always on for M2.x and on-by-default for M3; we send
	// `reasoning_split: true` so reasoning streams in `reasoning_content`. M3 is
	// natively multimodal (text/image/video in) and accepts images directly;
	// M2.7 is text-only and falls back to the vision proxy.
	// USD pricing per 1M tokens (M3 figures approximate); CNY is an approximate
	// conversion and only drives the picker cost hints.
	{
		id: 'MiniMax-M3',
		name: 'MiniMax-M3',
		provider: 'minimax',
		family: 'minimax',
		version: 'minimax-m3',
		detail: 'Flagship agentic, long context & vision',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.06, cacheMissInput: 0.3, output: 1.2 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2.2, output: 8.6 },
		},
		priceCategory: 'low',
	},
	{
		id: 'MiniMax-M2.7',
		name: 'MiniMax-M2.7',
		provider: 'minimax',
		family: 'minimax',
		version: 'minimax-m2.7',
		detail: 'Fast coding & agents',
		maxInputTokens: 204800,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.059, cacheMissInput: 0.299, output: 1.2 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2.2, output: 8.6 },
		},
		priceCategory: 'low',
	},

	// ---- MiniMax (International) ----
	// Models are identical to the domestic MiniMax lineup but connect to the
	// international endpoint with a separate API key.
	{
		id: 'MiniMax-M3-intl',
		name: 'MiniMax-M3 (Intl)',
		provider: 'minimax-intl',
		family: 'minimax',
		version: 'minimax-m3',
		detail: 'Flagship agentic, long context & vision',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.06, cacheMissInput: 0.3, output: 1.2 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2.2, output: 8.6 },
		},
		priceCategory: 'low',
	},
	{
		id: 'MiniMax-M2.7-intl',
		name: 'MiniMax-M2.7 (Intl)',
		provider: 'minimax-intl',
		family: 'minimax',
		version: 'minimax-m2.7',
		detail: 'Fast coding & agents',
		maxInputTokens: 204800,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.059, cacheMissInput: 0.299, output: 1.2 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2.2, output: 8.6 },
		},
		priceCategory: 'low',
	},

	// ---- Xiaomi MiMo ----
	// MiMo is a hybrid reasoning family on Xiaomi's official open platform
	// (api.xiaomimimo.com). Thinking is on by default and toggled with
	// `thinking: { type: 'enabled' | 'disabled' }` (GLM-style; no
	// thinking_budget / reasoning_effort), and reasoning streams in
	// `reasoning_content`. USD = MiMo overseas pay-as-you-go pricing per 1M
	// tokens; CNY = domestic pricing.
	{
		id: 'mimo-v2.5-pro',
		name: 'MiMo V2.5 Pro',
		provider: 'xiaomi',
		family: 'mimo',
		version: 'mimo-v2.5',
		detail: 'Flagship reasoning & coding',
		maxInputTokens: 1000000,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.0036, cacheMissInput: 0.435, output: 0.87 },
			CNY: { cacheHitInput: 0.025, cacheMissInput: 3, output: 6 },
		},
		priceCategory: 'low',
	},
	{
		id: 'mimo-v2.5',
		name: 'MiMo V2.5 (Omni)',
		provider: 'xiaomi',
		family: 'mimo',
		version: 'mimo-v2.5',
		detail: 'Native multimodal & thinking',
		maxInputTokens: 1000000,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.0028, cacheMissInput: 0.14, output: 0.28 },
			CNY: { cacheHitInput: 0.02, cacheMissInput: 1, output: 2 },
		},
		priceCategory: 'low',
	},
	{
		id: 'mimo-v2-flash',
		name: 'MiMo V2 Flash',
		provider: 'xiaomi',
		family: 'mimo',
		version: 'mimo-v2',
		detail: 'Fast & low cost',
		maxInputTokens: 262144,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.01, cacheMissInput: 0.1, output: 0.3 },
			CNY: { cacheHitInput: 0.07, cacheMissInput: 0.7, output: 2.1 },
		},
		priceCategory: 'low',
	},

	// ---- Moonshot (Kimi) ----
	// Kimi K2.6 / K2.5 are native-multimodal hybrid-reasoning models on the
	// official open platform (international `api.moonshot.ai`; mainland China
	// `api.moonshot.cn`). Thinking is on by default and toggled with the
	// GLM-style `thinking: { type: 'enabled' | 'disabled' }`, with reasoning in
	// `reasoning_content`. The deprecated `kimi-k2-*` series was retired on
	// 2026-05-25. USD = official per-1M-token pricing; CNY is an approximate
	// conversion that only drives the picker cost hints.
	{
		id: 'kimi-k2.6',
		name: 'Kimi K2.6',
		provider: 'moonshot',
		family: 'kimi',
		version: 'kimi-k2.6',
		detail: 'Flagship multimodal & agents',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.95, output: 4 },
			CNY: { cacheHitInput: 1.2, cacheMissInput: 6.8, output: 29 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'kimi-k2.5',
		name: 'Kimi K2.5',
		provider: 'moonshot',
		family: 'kimi',
		version: 'kimi-k2.5',
		detail: 'Multimodal, flexible thinking',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.1, cacheMissInput: 0.6, output: 3 },
			CNY: { cacheHitInput: 0.7, cacheMissInput: 4.3, output: 22 },
		},
		priceCategory: 'medium',
	},

	// ---- Moonshot (Kimi International) ----
	// Models are identical to the domestic Kimi lineup but connect to the
	// international endpoint with a separate API key.
	{
		id: 'kimi-k2.6-intl',
		name: 'Kimi K2.6 (Intl)',
		provider: 'moonshot-intl',
		family: 'kimi',
		version: 'kimi-k2.6',
		detail: 'Flagship multimodal & agents',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.16, cacheMissInput: 0.95, output: 4 },
			CNY: { cacheHitInput: 1.2, cacheMissInput: 6.8, output: 29 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'kimi-k2.5-intl',
		name: 'Kimi K2.5 (Intl)',
		provider: 'moonshot-intl',
		family: 'kimi',
		version: 'kimi-k2.5',
		detail: 'Multimodal, flexible thinking',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.1, cacheMissInput: 0.6, output: 3 },
			CNY: { cacheHitInput: 0.7, cacheMissInput: 4.3, output: 22 },
		},
		priceCategory: 'medium',
	},

	// ---- Tencent Hunyuan (混元) ----
	// Hunyuan provides an OpenAI-compatible endpoint. HY 2.0 Think and T1 are
	// deep-thinking models; TurboS is the fast everyday model; A13B is the
	// lightweight budget option. Thinking uses GLM-style
	// `thinking: { type: 'enabled' | 'disabled' }`. No native vision models
	// yet for coding, so images fall back to the vision proxy.
	{
		id: 'hunyuan-2.0-think',
		name: 'Tencent HY 2.0 Think',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-2.0',
		detail: 'Flagship deep-thinking & coding',
		maxInputTokens: 131072,
		maxOutputTokens: 16384,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0, cacheMissInput: 0.55, output: 2.2 },
			CNY: { cacheHitInput: 0, cacheMissInput: 3.975, output: 15.9 },
		},
		priceCategory: 'medium',
	},
	{
		id: 'hunyuan-turbos',
		name: 'Hunyuan TurboS',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-turbos',
		detail: 'Fast & balanced everyday',
		maxInputTokens: 32768,
		maxOutputTokens: 8192,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0, cacheMissInput: 0.11, output: 0.28 },
			CNY: { cacheHitInput: 0, cacheMissInput: 0.8, output: 2 },
		},
		priceCategory: 'low',
	},
	{
		id: 'hunyuan-t1',
		name: 'Hunyuan T1',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-t1',
		detail: 'Deep thinking, affordable',
		maxInputTokens: 32768,
		maxOutputTokens: 8192,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0, cacheMissInput: 0.14, output: 0.56 },
			CNY: { cacheHitInput: 0, cacheMissInput: 1, output: 4 },
		},
		priceCategory: 'low',
	},
	{
		id: 'hunyuan-a13b',
		name: 'Hunyuan A13B',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-a13b',
		detail: 'Lightweight, fast & low cost',
		maxInputTokens: 32768,
		maxOutputTokens: 8192,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0, cacheMissInput: 0.07, output: 0.28 },
			CNY: { cacheHitInput: 0, cacheMissInput: 0.5, output: 2 },
		},
		priceCategory: 'low',
	},
];
