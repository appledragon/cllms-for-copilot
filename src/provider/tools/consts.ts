// Conservative upper bound on the number of functions sent in one `tools`
// request. DashScope's OpenAI-compatible API does not document a hard limit
// as low as some providers, but we cap defensively to keep the tool list and
// context-cache stable. Raise via model capability overrides if needed.
export const LLM_TOOLS_LIMIT = 128;

export const ACTIVATE_TOOL_PREFIX = 'activate_';
export const PREFLIGHT_ACTIVATE_CALL_ID_PREFIX = 'qwen_preflight_activate_';
export const MAX_PREFLIGHT_ROUNDS_PER_USER_REQUEST = 3;

export const TOOL_DRIFT_NOTICE_START = '[cllms-tool-drift-notice-start]: #';
export const TOOL_DRIFT_NOTICE_END = '[cllms-tool-drift-notice-end]: #';
export const VISION_PROXY_NOTICE_START = '[cllms-vision-proxy-notice-start]: #';
export const VISION_PROXY_NOTICE_END = '[cllms-vision-proxy-notice-end]: #';
export const AUDIO_PROXY_NOTICE_START = '[cllms-audio-proxy-notice-start]: #';
export const AUDIO_PROXY_NOTICE_END = '[cllms-audio-proxy-notice-end]: #';
