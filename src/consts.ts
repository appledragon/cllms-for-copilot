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
	deepseek: {
		apiKeys: 'https://platform.deepseek.com/api_keys',
		usage: 'https://api-docs.deepseek.com/quick_start/pricing',
		status: 'https://status.deepseek.com',
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
	deepseek: {
		id: 'deepseek',
		name: 'DeepSeek',
		defaultBaseUrl: 'https://api.deepseek.com/v1',
		baseUrlSetting: 'deepseek.baseUrl',
		apiKeySecret: 'cllms.deepseek.apiKey',
		apiKeySetting: 'deepseek.apiKey',
		modelIdOverridesSetting: 'deepseek.modelIdOverrides',
		officialHost: 'api.deepseek.com',
		// DeepSeek: `thinking: { type }` plus `reasoning_effort` (`high` / `max`).
		thinkingStyle: 'deepseek',
		externalUrls: EXTERNAL_URLS.deepseek,
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
		// Kimi K2.7/K2.6/K2.5 use the same `thinking: { type: 'enabled' | 'disabled' }`
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
		// HY 2.0 Think uses deep thinking natively; toggle via
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
/** URI path handled by this extension to open audio model configuration. */
export const SET_AUDIO_MODEL_URI_PATH = '/setAudioModel';

// VS Code's internal LanguageModelChatMessageRole.System is not exposed in @types/vscode.
export const LANGUAGE_MODEL_CHAT_SYSTEM_ROLE = 3;

// ---- Secret keys ----

/** SecretStorage key for the Qwen API key. */
export const API_KEY_SECRET = 'cllms.apiKey';

/** memento key tracking whether the welcome walkthrough has been shown. */
export const WELCOME_SHOWN_KEY = 'cllms.welcomeShown';

/** memento key tracking whether the verbose dump privacy warning has been shown. */
export const REQUEST_DUMP_WARNING_SHOWN_KEY = 'cllms.requestDumpWarningShown';

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
		detail: 'Agentic coding',
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
		id: 'qwen3-coder-flash',
		name: 'Qwen3 Coder Flash',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Fast coding',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.05, cacheMissInput: 0.5, output: 2.5 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2, output: 8 },
		},
		priceCategory: 'low',
	},
	{
		id: 'qwen3.8-max',
		name: 'Qwen3.8 Max',
		provider: 'qwen',
		// Official Max is `reasoning_effort: "xhigh"`; do not send thinking_budget.
		thinkingStyle: 'qwen_effort',
		family: 'qwen',
		version: 'qwen3.8',
		detail: 'Latest flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.25, cacheMissInput: 2, output: 6 },
			CNY: { cacheHitInput: 2.4, cacheMissInput: 12, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'qwen3.7-max',
		name: 'Qwen3.7 Max',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3.7',
		detail: 'Flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 1, cacheMissInput: 2.4, output: 7.2 },
			CNY: { cacheHitInput: 4.8, cacheMissInput: 12, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'qwen3.7-plus',
		name: 'Qwen3.7 Plus',
		provider: 'qwen',
		family: 'qwen',
		version: 'qwen3.7',
		detail: 'Balanced flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.4, cacheMissInput: 1, output: 4 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 2, output: 8 },
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
		detail: 'Agentic coding',
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
		id: 'qwen3-coder-flash-intl',
		name: 'Qwen3 Coder Flash (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3',
		detail: 'Fast coding',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.05, cacheMissInput: 0.5, output: 2.5 },
			CNY: { cacheHitInput: 0.4, cacheMissInput: 2, output: 8 },
		},
		priceCategory: 'low',
	},
	{
		id: 'qwen3.8-max-intl',
		name: 'Qwen3.8 Max (Intl)',
		provider: 'qwen-intl',
		thinkingStyle: 'qwen_effort',
		family: 'qwen',
		version: 'qwen3.8',
		detail: 'Latest flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.25, cacheMissInput: 2, output: 6 },
			CNY: { cacheHitInput: 2.4, cacheMissInput: 12, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'qwen3.7-max-intl',
		name: 'Qwen3.7 Max (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3.7',
		detail: 'Flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 1, cacheMissInput: 2.4, output: 7.2 },
			CNY: { cacheHitInput: 4.8, cacheMissInput: 12, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'qwen3.7-plus-intl',
		name: 'Qwen3.7 Plus (Intl)',
		provider: 'qwen-intl',
		family: 'qwen',
		version: 'qwen3.7',
		detail: 'Balanced flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 65536,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: true,
		pricing: {
			USD: { cacheHitInput: 0.4, cacheMissInput: 1, output: 4 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 2, output: 8 },
		},
		priceCategory: 'medium',
	},

	// ---- DeepSeek ----
	// Both V4 models default to thinking on and accept `thinking: { type }` plus
	// `reasoning_effort` (`high` / `max`). Pricing per 1M tokens is the official
	// off-peak (idle) rate effective 2026-08-16 16:00 UTC; peak is 2× during
	// 09:00–12:00 and 14:00–18:00 Beijing time (01:00–04:00 and 06:00–10:00 UTC).
	// https://api-docs.deepseek.com/quick_start/pricing
	{
		id: 'deepseek-v4-flash',
		name: 'DeepSeek-V4-Flash',
		provider: 'deepseek',
		family: 'deepseek',
		version: 'deepseek-v4',
		detail: 'Fast flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 384000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.007, cacheMissInput: 0.22, output: 0.66 },
			CNY: { cacheHitInput: 0.05, cacheMissInput: 1.5, output: 4.5 },
		},
		priceCategory: 'low',
	},
	{
		id: 'deepseek-v4-pro',
		name: 'DeepSeek-V4-Pro',
		provider: 'deepseek',
		family: 'deepseek',
		version: 'deepseek-v4',
		detail: 'Pro flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 384000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.022, cacheMissInput: 0.66, output: 1.98 },
			CNY: { cacheHitInput: 0.15, cacheMissInput: 4.5, output: 13.5 },
		},
		priceCategory: 'high',
	},

	// ---- z.ai (Zhipu GLM) ----
	// Pricing is z.ai's public USD pricing per 1M tokens; CNY values are
	// approximate conversions and only drive the picker's cost hints. GLM-5.1 uses
	// `thinking: { type }` only. GLM-5.2 also accepts
	// `reasoning_effort` (`high` / `max`) via the DeepSeek thinking style.
	{
		id: 'glm-5.3',
		name: 'GLM-5.3',
		provider: 'zai',
		family: 'glm',
		version: 'glm-5.3',
		detail: 'Latest flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.26, cacheMissInput: 1.4, output: 4.4 },
			CNY: { cacheHitInput: 1.9, cacheMissInput: 10, output: 32 },
		},
		priceCategory: 'high',
	},
	{
		id: 'glm-5.2',
		name: 'GLM-5.2',
		provider: 'zai',
		thinkingStyle: 'deepseek',
		family: 'glm',
		version: 'glm-5.2',
		detail: 'Latest flagship',
		maxInputTokens: 1000000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.28, cacheMissInput: 1.1, output: 3.9 },
			CNY: { cacheHitInput: 2, cacheMissInput: 8, output: 28 },
		},
		priceCategory: 'high',
	},
	{
		id: 'glm-5.1',
		name: 'GLM-5.1',
		provider: 'zai',
		family: 'glm',
		version: 'glm-5.1',
		detail: 'Long-horizon coding',
		maxInputTokens: 200000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.26, cacheMissInput: 1.4, output: 4.4 },
			CNY: { cacheHitInput: 1.9, cacheMissInput: 10, output: 32 },
		},
		priceCategory: 'high',
	},
	{
		id: 'glm-5',
		name: 'GLM-5',
		provider: 'zai',
		family: 'glm',
		version: 'glm-5',
		detail: 'High-intelligence',
		maxInputTokens: 200000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.15, cacheMissInput: 0.6, output: 2.6 },
			CNY: { cacheHitInput: 1, cacheMissInput: 4, output: 18 },
		},
		priceCategory: 'high',
	},
	{
		id: 'glm-5-turbo',
		name: 'GLM-5-Turbo',
		provider: 'zai',
		family: 'glm',
		version: 'glm-5-turbo',
		detail: 'Long-task optimized',
		maxInputTokens: 200000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.2, cacheMissInput: 0.7, output: 3.1 },
			CNY: { cacheHitInput: 1.25, cacheMissInput: 5, output: 22 },
		},
		priceCategory: 'high',
	},
	{
		id: 'glm-5v-turbo',
		name: 'GLM-5V-Turbo',
		provider: 'zai',
		family: 'glm',
		version: 'glm-5v-turbo',
		detail: 'Vision + thinking',
		maxInputTokens: 200000,
		maxOutputTokens: 128000,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.13, cacheMissInput: 0.5, output: 2 },
			CNY: { cacheHitInput: 0.9, cacheMissInput: 3.5, output: 14 },
		},
		priceCategory: 'high',
	},

	// ---- MiniMax ----
	// MiniMax reasoning is on-by-default for M3; we send `reasoning_split: true`
	// so reasoning streams in `reasoning_content`. M3 is natively multimodal
	// (text/image/video in) and accepts images directly.
	// USD pricing per 1M tokens (M3 figures approximate); CNY is an approximate
	// conversion and only drives the picker cost hints.
	{
		id: 'MiniMax-M3',
		name: 'MiniMax-M3',
		provider: 'minimax',
		family: 'minimax',
		version: 'minimax-m3',
		detail: 'Flagship agentic',
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

	// ---- MiniMax (International) ----
	// Models are identical to the domestic MiniMax lineup but connect to the
	// international endpoint with a separate API key.
	{
		id: 'MiniMax-M3-intl',
		name: 'MiniMax-M3 (Intl)',
		provider: 'minimax-intl',
		family: 'minimax',
		version: 'minimax-m3',
		detail: 'Flagship agentic',
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
		detail: 'Flagship coding',
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
		detail: 'Multimodal',
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

	// ---- Moonshot (Kimi) ----
	// Kimi K3 is the flagship 2.8T-param model with 1M-token context, native
	// vision, and always-on thinking controlled via top-level `reasoning_effort`
	// (`low` / `high` / `max`; UI None maps to `low`).  K2.7 / K2.6 / K2.5 are
	// native-multimodal hybrid-reasoning models that use the GLM-style
	// `thinking: { type: 'enabled' | 'disabled' }` wire format.
	// International endpoint: `api.moonshot.ai`; mainland China: `api.moonshot.cn`.
	// USD = official per-1M-token pricing; CNY is approximate (picker cost hints).
	{
		id: 'kimi-k3',
		name: 'Kimi K3',
		provider: 'moonshot',
		thinkingStyle: 'reasoning_effort',
		family: 'kimi',
		version: 'kimi-k3',
		detail: 'Flagship 2.8T',
		maxInputTokens: 1048576,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.3, cacheMissInput: 3, output: 15 },
			CNY: { cacheHitInput: 2.1, cacheMissInput: 21, output: 105 },
		},
		priceCategory: 'very_high',
	},
	{
		id: 'kimi-k2.7',
		name: 'Kimi K2.7',
		provider: 'moonshot',
		family: 'kimi',
		version: 'kimi-k2.7-code',
		detail: 'Latest flagship',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.2, cacheMissInput: 1.2, output: 5 },
			CNY: { cacheHitInput: 1.5, cacheMissInput: 8.5, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'kimi-k2.7-code-highspeed',
		name: 'Kimi K2.7 Code HighSpeed',
		provider: 'moonshot',
		family: 'kimi',
		version: 'kimi-k2.7-code',
		detail: 'High-speed coding',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.25, cacheMissInput: 1.5, output: 6 },
			CNY: { cacheHitInput: 1.8, cacheMissInput: 10.5, output: 43 },
		},
		priceCategory: 'high',
	},
	{
		id: 'kimi-k2.6',
		name: 'Kimi K2.6',
		provider: 'moonshot',
		family: 'kimi',
		version: 'kimi-k2.6',
		detail: 'Flagship multimodal',
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
		detail: 'Multimodal',
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
		id: 'kimi-k3-intl',
		name: 'Kimi K3 (Intl)',
		provider: 'moonshot-intl',
		thinkingStyle: 'reasoning_effort',
		family: 'kimi',
		version: 'kimi-k3',
		detail: 'Flagship 2.8T',
		maxInputTokens: 1048576,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.3, cacheMissInput: 3, output: 15 },
			CNY: { cacheHitInput: 2.1, cacheMissInput: 21, output: 105 },
		},
		priceCategory: 'very_high',
	},
	{
		id: 'kimi-k2.7-intl',
		name: 'Kimi K2.7 (Intl)',
		provider: 'moonshot-intl',
		family: 'kimi',
		version: 'kimi-k2.7-code',
		detail: 'Latest flagship',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.2, cacheMissInput: 1.2, output: 5 },
			CNY: { cacheHitInput: 1.5, cacheMissInput: 8.5, output: 36 },
		},
		priceCategory: 'high',
	},
	{
		id: 'kimi-k2.7-code-highspeed-intl',
		name: 'Kimi K2.7 Code HighSpeed (Intl)',
		provider: 'moonshot-intl',
		family: 'kimi',
		version: 'kimi-k2.7-code',
		detail: 'High-speed coding',
		maxInputTokens: 262144,
		maxOutputTokens: 131072,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.25, cacheMissInput: 1.5, output: 6 },
			CNY: { cacheHitInput: 1.8, cacheMissInput: 10.5, output: 43 },
		},
		priceCategory: 'high',
	},
	{
		id: 'kimi-k2.6-intl',
		name: 'Kimi K2.6 (Intl)',
		provider: 'moonshot-intl',
		family: 'kimi',
		version: 'kimi-k2.6',
		detail: 'Flagship multimodal',
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
		detail: 'Multimodal',
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
	// Hunyuan provides an OpenAI-compatible endpoint. HY 2.0 Think is the
	// deep-thinking model; HY 2.0 Instruct is the fast instruction-following
	// model. Thinking uses GLM-style
	// `thinking: { type: 'enabled' | 'disabled' }`. No native vision models
	// yet for coding, so images fall back to the vision proxy.
	{
		id: 'hunyuan-2.0-think',
		name: 'Tencent HY 2.0 Think',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-2.0',
		detail: 'Deep thinking',
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
		id: 'hunyuan-2.0-instruct',
		name: 'Tencent HY 2.0 Instruct',
		provider: 'hunyuan',
		family: 'hunyuan',
		version: 'hunyuan-2.0',
		detail: 'Instruction-following',
		maxInputTokens: 131072,
		maxOutputTokens: 16384,
		capabilities: {
			toolCalling: LLM_TOOLS_LIMIT,
			imageInput: false,
			thinking: false,
		},
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0, cacheMissInput: 0.46, output: 1.14 },
			CNY: { cacheHitInput: 0, cacheMissInput: 3.18, output: 7.95 },
		},
		priceCategory: 'medium',
	},
];
