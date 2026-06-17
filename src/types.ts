/**
 * Shared types for the CLLMs Copilot extension.
 */

// ---- API request/response types ----

/**
 * Multimodal content parts (OpenAI-compatible). Used for native Qwen-VL vision
 * requests where image attachments are sent directly to a vision-capable model.
 */
export interface LlmTextContentPart {
	type: 'text';
	text: string;
}

export interface LlmImageContentPart {
	type: 'image_url';
	image_url: { url: string };
}

export type LlmContentPart = LlmTextContentPart | LlmImageContentPart;

export interface LlmMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | LlmContentPart[];
	tool_call_id?: string;
	tool_calls?: LlmToolCall[];
	reasoning_content?: string;
}

export interface LlmToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface LlmTool {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters?: Record<string, unknown>;
	};
}

export interface LlmUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	/** DashScope (OpenAI-compatible) reports cache hits here. */
	prompt_tokens_details?: { cached_tokens?: number };
}

export interface LlmRequest {
	model: string;
	messages: LlmMessage[];
	stream: boolean;
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	tools?: LlmTool[];
	tool_choice?: 'none' | 'auto' | 'required';
	/**
	 * Qwen-specific thinking control (non-standard OpenAI field). DashScope's
	 * Node SDK / HTTP API accepts it as a top-level body parameter. Reasoning is
	 * streamed back in `delta.reasoning_content`.
	 */
	enable_thinking?: boolean;
	/** Optional reasoning depth budget (tokens) for thinking-capable models. */
	thinking_budget?: number;
	/**
	 * Nested thinking control used by GLM (z.ai) and MiniMax. GLM accepts
	 * `enabled`/`disabled`; MiniMax accepts `adaptive`/`disabled`. Qwen instead
	 * uses the flat `enable_thinking` boolean. Which field is emitted is decided
	 * per provider (see thinking style).
	 */
	thinking?: { type: 'enabled' | 'disabled' | 'adaptive' };
	/**
	 * MiniMax output-format switch. When `true`, reasoning is returned in
	 * `reasoning_content` (matching our stream parser) instead of being embedded
	 * in `content` wrapped in `<think>` tags.
	 */
	reasoning_split?: boolean;
	stream_options?: {
		include_usage: boolean;
	};
}

export interface LlmStreamChunk {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: string;
			content?: string;
			reasoning_content?: string;
			tool_calls?: Array<{
				index: number;
				id?: string;
				type?: string;
				function?: {
					name?: string;
					arguments?: string;
				};
			}>;
		};
		finish_reason: string | null;
	}>;
	usage?: LlmUsage;
}

// ---- Stream callbacks ----

export interface StreamCallbacks {
	onContent: (content: string) => void;
	onThinking: (text: string) => void;
	onToolCall: (toolCall: LlmToolCall) => void;
	onError: (error: Error) => void;
	onDone: () => void;
	onUsage?: (usage: LlmUsage) => void;
}

// ---- Provider definitions ----

/** Identifies an upstream API provider. */
export type ProviderId =
	| 'qwen'
	| 'qwen-intl'
	| 'zai'
	| 'minimax'
	| 'minimax-intl'
	| 'xiaomi'
	| 'moonshot'
	| 'moonshot-intl'
	| 'hunyuan';

/**
 * How a provider serializes "thinking" / reasoning control on the request:
 *  - `qwen`:    flat `enable_thinking` boolean (+ optional `thinking_budget`)
 *  - `glm`:     nested `thinking: { type: 'enabled' | 'disabled' }` — used by
 *               z.ai / Zhipu GLM, Xiaomi MiMo, and Moonshot Kimi (identical
 *               wire format)
 *  - `minimax`: nested `thinking: { type: 'adaptive' | 'disabled' }` plus
 *               `reasoning_split: true` so reasoning streams in `reasoning_content`
 */
export type ThinkingStyle = 'qwen' | 'glm' | 'minimax';

export interface ProviderExternalUrls {
	apiKeys: string;
	usage: string;
	status: string;
}

/**
 * Runtime description of an OpenAI-compatible provider. Each model belongs to
 * exactly one provider, which supplies its endpoint, credentials, and the
 * provider-specific quirks (thinking serialization, error links).
 */
export interface ProviderDefinition {
	id: ProviderId;
	/** Human-readable name shown in pickers and prompts. */
	name: string;
	/** Endpoint used when the user has not overridden the base URL. */
	defaultBaseUrl: string;
	/** Settings key (under the extension section) for the base URL override. */
	baseUrlSetting: string;
	/** SecretStorage key for this provider's API key. */
	apiKeySecret: string;
	/** Settings key (under the extension section) for the API key fallback. */
	apiKeySetting: string;
	/** Settings key (under the extension section) for model ID overrides. */
	modelIdOverridesSetting: string;
	/** Canonical API hostname, used to attach provider-specific error links. */
	officialHost: string;
	/** Thinking-parameter serialization style. */
	thinkingStyle: ThinkingStyle;
	externalUrls: ProviderExternalUrls;
}

// ---- Model definitions ----

export type PricingCurrency = 'USD' | 'CNY';

export type PriceCategory = 'low' | 'medium' | 'high' | 'very_high';

export interface ModelPricing {
	cacheHitInput: number;
	cacheMissInput: number;
	output: number;
}

export interface ModelDefinition {
	id: string;
	name: string;
	/** Owning provider; selects endpoint, credentials, and thinking style. */
	provider: ProviderId;
	family: string;
	version: string;
	detail: string;
	maxInputTokens: number;
	maxOutputTokens: number;
	capabilities: {
		toolCalling: boolean | number;
		imageInput: boolean;
		thinking: boolean;
	};
	requiresThinkingParam: boolean;
	pricing?: Readonly<Record<PricingCurrency, ModelPricing>>;
	priceCategory?: PriceCategory;
}
