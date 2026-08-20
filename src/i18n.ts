import vscode from 'vscode';

/**
 * Lightweight i18n module — zero dependencies, follows VS Code display language.
 *
 *  - en / en-US / en-*      → English (default)
 *  - zh-cn                  → Simplified Chinese
 *  - all other locales      → English until translated
 */

function isZh(): boolean {
	const lang = vscode.env.language.toLowerCase();
	return lang === 'zh-cn';
}

// ---- Translation dictionaries ----

type Translations = Record<string, string>;

const zh: Translations = {
	// Model descriptions
	'model.qwen3-coder-plus.detail': '智能编码',
	'model.qwen3-coder-plus.tooltip': '面向 Agent 编程与工具调用的 Qwen3 Coder 模型，擅长大型重构。',
	'model.qwen3-coder-flash.detail': '轻量快速',
	'model.qwen3-coder-flash.tooltip':
		'Qwen3 Coder Flash 轻量编码模型，响应更快、成本更低，支持工具调用。',
	'model.qwen3.8-max.detail': '最新旗舰',
	'model.qwen3.8-max.tooltip':
		'Qwen3.8 Max 最新旗舰模型，总参数 2.4T、激活 95B，最高 1M 上下文，原生视觉理解，面向高难度编码、专业办公与长程 Agent 任务，支持思考模式与工具调用。',
	'model.qwen3.7-max.detail': '旗舰模型',
	'model.qwen3.7-max.tooltip':
		'Qwen3.7 Max 旗舰模型，最高 1M 上下文，面向高难度编码、复杂推理与长程任务，支持思考模式与工具调用。',
	'model.qwen3.7-plus.detail': '均衡旗舰',
	'model.qwen3.7-plus.tooltip':
		'Qwen3.7 Plus 均衡旗舰模型，最高 1M 上下文，在质量、速度和成本之间取得平衡，支持思考模式与工具调用。',
	'model.qwen3-coder-plus-intl.detail': '智能编码',
	'model.qwen3-coder-plus-intl.tooltip':
		'面向 Agent 编程与工具调用的 Qwen3 Coder 模型（国际站），擅长大型重构。',
	'model.qwen3-coder-flash-intl.detail': '轻量快速',
	'model.qwen3-coder-flash-intl.tooltip':
		'Qwen3 Coder Flash 轻量编码模型（国际站），响应更快、成本更低，支持工具调用。',
	'model.qwen3.8-max-intl.detail': '最新旗舰',
	'model.qwen3.8-max-intl.tooltip':
		'Qwen3.8 Max 最新旗舰模型（国际站），总参数 2.4T、激活 95B，最高 1M 上下文，原生视觉理解，面向高难度编码、专业办公与长程 Agent 任务，支持思考模式与工具调用。',
	'model.qwen3.7-max-intl.detail': '旗舰模型',
	'model.qwen3.7-max-intl.tooltip':
		'Qwen3.7 Max 旗舰模型（国际站），最高 1M 上下文，面向高难度编码、复杂推理与长程任务，支持思考模式与工具调用。',
	'model.qwen3.7-plus-intl.detail': '均衡旗舰',
	'model.qwen3.7-plus-intl.tooltip':
		'Qwen3.7 Plus 均衡旗舰模型（国际站），最高 1M 上下文，在质量、速度和成本之间取得平衡，支持思考模式与工具调用。',
	'model.deepseek-v4-flash.detail': '旗舰极速',
	'model.deepseek-v4-flash.tooltip':
		'DeepSeek-V4-Flash 旗舰模型，1M 上下文，最高 384K 输出，支持思考与非思考两种模式、工具调用和 JSON 输出。',
	'model.deepseek-v4-pro.detail': '旗舰专业',
	'model.deepseek-v4-pro.tooltip':
		'DeepSeek-V4-Pro 旗舰专业模型，1M 上下文，最高 384K 输出，默认深度思考模式，适合复杂推理与编码任务，支持工具调用和 JSON 输出。',
	'model.glm-5.3.detail': '最新旗舰',
	'model.glm-5.3.tooltip':
		'z.ai GLM-5.3 最新旗舰模型，1M 上下文，编程与智能体能力更强，擅长长程任务与复杂环境下的开发，支持深度思考模式与工具调用。',
	'model.glm-5.2.detail': '最新旗舰',
	'model.glm-5.2.tooltip':
		'z.ai GLM-5.2 最新旗舰模型，1M 上下文，支撑项目级工程上下文与复杂长程任务，从需求到多端部署的完整开发链路，支持深度思考模式与工具调用。',
	'model.glm-5.1.detail': '长程编码',
	'model.glm-5.1.tooltip':
		'z.ai GLM-5.1 旗舰模型，200K 上下文，支持长达 8 小时的自主编码与 Agent，擅长复杂工程优化与长程任务，支持思考模式与工具调用。',
	'model.glm-5.detail': '高智能基座',
	'model.glm-5.tooltip':
		'z.ai GLM-5 高智能模型，200K 上下文，擅长编码、复杂推理与工具调用，支持思考模式。',
	'model.glm-5-turbo.detail': '长任务优化',
	'model.glm-5-turbo.tooltip':
		'z.ai GLM-5-Turbo 模型，200K 上下文，面向长任务连续编码与 Agent 场景优化，支持思考模式与工具调用。',
	'model.glm-5v-turbo.detail': '原生视觉',
	'model.glm-5v-turbo.tooltip':
		'z.ai GLM-5V-Turbo 多模态模型，200K 上下文，支持原生图片输入、深度思考和工具调用。',
	'model.MiniMax-M3.detail': '旗舰 Agent',
	'model.MiniMax-M3.tooltip':
		'MiniMax-M3 旗舰模型，最高 1M 上下文，擅长 Agent 推理、编码与长上下文，支持思考模式与工具调用。',
	'model.MiniMax-M3-intl.detail': '旗舰 Agent',
	'model.MiniMax-M3-intl.tooltip':
		'MiniMax-M3 旗舰模型（国际站），最高 1M 上下文，擅长 Agent 推理、编码与长上下文，支持思考模式与工具调用。',
	'model.mimo-v2.5-pro.detail': '旗舰编码',
	'model.mimo-v2.5-pro.tooltip':
		'小米 MiMo V2.5 Pro 旗舰混合推理模型，最高 1M 上下文，擅长复杂推理与编码，支持思考模式与工具调用。',
	'model.mimo-v2.5.detail': '原生多模态',
	'model.mimo-v2.5.tooltip':
		'小米 MiMo V2.5 全模态模型，支持原生图片输入，可直接理解图片，并支持思考模式与工具调用。',
	'model.kimi-k3.detail': '旗舰 2.8T',
	'model.kimi-k3.tooltip':
		'Moonshot Kimi K3 旗舰模型，2.8 万亿参数，1M token 上下文，原生视觉理解，始终开启思考模式（reasoning_effort），面向长程编程与知识工作。',
	'model.kimi-k2.7.detail': '最新旗舰',
	'model.kimi-k2.7.tooltip':
		'Moonshot Kimi K2.7 最新旗舰原生多模态混合推理模型，256K 上下文，支持原生图片输入、思考模式（默认开启）与工具调用。',
	'model.kimi-k2.6.detail': '旗舰多模态',
	'model.kimi-k2.6.tooltip':
		'Moonshot Kimi K2.6 旗舰原生多模态混合推理模型，256K 上下文，支持原生图片输入、思考模式（默认开启）与工具调用。',
	'model.kimi-k2.5.detail': '多模态',
	'model.kimi-k2.5.tooltip':
		'Moonshot Kimi K2.5 原生多模态模型，256K 上下文，支持原生图片输入、可开关的思考模式与工具调用。',
	'model.kimi-k2.7-code-highspeed.detail': '高速编码',
	'model.kimi-k2.7-code-highspeed.tooltip':
		'Moonshot Kimi K2.7 Code HighSpeed 高速变体，约 180 tok/s 输出速度，256K 上下文，支持原生图片输入、思考模式与工具调用。',
	'model.kimi-k3-intl.detail': '旗舰 2.8T',
	'model.kimi-k3-intl.tooltip':
		'Moonshot Kimi K3 旗舰模型（国际站），2.8 万亿参数，1M token 上下文，原生视觉理解，始终开启思考模式（reasoning_effort）。',
	'model.kimi-k2.7-intl.detail': '最新旗舰',
	'model.kimi-k2.7-intl.tooltip':
		'Moonshot Kimi K2.7 最新旗舰原生多模态混合推理模型（国际站），256K 上下文，支持原生图片输入、思考模式（默认开启）与工具调用。',
	'model.kimi-k2.7-code-highspeed-intl.detail': '高速编码',
	'model.kimi-k2.7-code-highspeed-intl.tooltip':
		'Moonshot Kimi K2.7 Code HighSpeed 高速变体（国际站），约 180 tok/s 输出速度，256K 上下文，支持原生图片输入、思考模式与工具调用。',
	'model.kimi-k2.6-intl.detail': '旗舰多模态',
	'model.kimi-k2.6-intl.tooltip':
		'Moonshot Kimi K2.6 旗舰原生多模态混合推理模型（国际站），256K 上下文，支持原生图片输入、思考模式（默认开启）与工具调用。',
	'model.kimi-k2.5-intl.detail': '多模态',
	'model.kimi-k2.5-intl.tooltip':
		'Moonshot Kimi K2.5 原生多模态模型（国际站），256K 上下文，支持原生图片输入、可开关的思考模式与工具调用。',
	'model.hunyuan-2.0-think.detail': '深度思考',
	'model.hunyuan-2.0-think.tooltip':
		'腾讯混元 HY 2.0 Think 旗舰模型，128K 上下文，擅长编码与深度推理，支持思考模式与工具调用。',
	'model.hunyuan-2.0-instruct.detail': '指令跟随',
	'model.hunyuan-2.0-instruct.tooltip':
		'腾讯混元 HY 2.0 Instruct 模型，128K 上下文，适合指令跟随、创作和知识准确性场景，支持工具调用。',

	// API Key
	'auth.apiKeyRequiredDetail': '请先配置 API Key',
	'auth.promptFor': '请输入 {0} 的 API Key 或兼容服务令牌。',
	'auth.placeholder': 'sk-... 或服务商令牌',
	'auth.emptyValidation': 'API Key 不能为空',
	'auth.savedFor': '{0} 的 API Key 已安全保存。',
	'auth.removedFor': '{0} 的 API Key 已移除。',
	'auth.notConfigured': 'API Key 未配置，请在命令面板运行 "CLLMs: 设置 API Key"。',
	'auth.selectProviderSet': '选择要设置 API Key 的服务商',
	'auth.selectProviderClear': '选择要移除 API Key 的服务商',
	'auth.selectProviderPlaceholder': '选择服务商',
	'auth.providerConfigured': '已配置',
	'auth.providerNotConfigured': '未配置',
	'auth.inputTitle': '设置 {0} API Key',
	'auth.openApiKeyPage': '打开 {0} 的 API Key 页面',
	'auth.savedAction.testConnection': '测试连接',
	'auth.savedAction.openChat': '打开聊天',

	// Setup flow
	'setup.selectProvider': '选择要设置的服务商',
	'setup.start': '设置 {0}：先打开服务商控制台创建 API Key，然后粘贴保存并测试连接。',
	'setup.done': '{0} 设置完成。连接测试结果已显示；你可以继续打开聊天，或检查该服务商设置。',
	'setup.action.openApiKeyPage': '打开 API Key 页面',
	'setup.action.enterApiKey': '输入 API Key',

	// Settings
	'settings.selectProvider': '选择要打开设置的服务商',

	// Providers view
	'providers.tooltip.status': '状态：{0}',
	'providers.tooltip.endpoint': '端点：{0}',
	'providers.tooltip.models': '模型：{0} 个',
	'providers.badge.vision': '视觉',
	'providers.badge.thinking': '思考',
	'providers.webview.title': 'CLLMs 服务商',
	'providers.webview.endpointLabel': '端点',
	'providers.section.models': '模型',
	'providers.action.setup': '设置向导',
	'providers.action.setApiKey': '设置 API Key',
	'providers.action.clearApiKey': '清除 API Key',
	'providers.action.test': '测试连接',
	'providers.action.apiKeyPage': 'API Key 页面',
	'providers.action.usagePage': '用量',
	'providers.action.statusPage': '状态',
	'providers.action.providerSettings': '设置',
	'providers.summary': '已配置 {0} / {1}',
	'providers.noneConfigured': '尚未配置任何服务商，点击任一服务商的“设置向导”即可开始。',
	'providers.loading': '正在加载…',
	'providers.error': '无法加载服务商状态。',
	'providers.retry': '重试',
	'providers.status.ok': '连接正常',
	'providers.status.error': '连接失败',
	'providers.status.testing': '测试中…',

	// Thinking Effort — short labels for model picker dropdown
	'status.thinking': '思考模式',
	'thinking.none': '停用',
	'thinking.none.desc': '停用思考，响应更快',
	'thinking.high': '标准',
	'thinking.high.desc': '推荐日常使用',
	'thinking.max': '深度',
	'thinking.max.desc': '深度推理，适合复杂任务',

	// Vision
	'vision.proxyUsing': '视觉代理：{0}',
	'vision.fallbackUsing': '视觉代理（回退）：{0}',
	'vision.notFound': '未找到视觉模型 "{0}"',
	'vision.unavailable': '无可用视觉模型，图片已忽略。',
	'vision.proxyError': '视觉代理异常：',
	'vision.action.configureProxy': '配置视觉代理',
	'vision.panel.title': 'CLLMs 视觉代理',
	'model.visionProxyNote': '（原生不支持图片，但贴图会自动路由到视觉代理模型描述后转交本模型。）',
	'vision.panel.description':
		'配置一个支持图片输入的模型，用来先把图片转换成文字描述，再把描述随消息发送给所选模型。图片本身不会发送给该模型。',
	'vision.panel.source.vscodeLm': 'VS Code 模型',
	'vision.panel.source.apiEndpoint': 'API 端点',
	'vision.panel.field.source': '视觉代理来源',
	'vision.panel.field.visionModel': '视觉模型',
	'vision.panel.field.endpointType': '端点类型',
	'vision.panel.field.endpointUrl': '端点 URL',
	'vision.panel.field.apiKey': 'API Key',
	'vision.panel.field.modelId': '模型 ID',
	'vision.panel.field.customHeaders': '自定义 headers JSON',
	'vision.panel.field.extraBody': '额外请求体 JSON',
	'vision.panel.advanced.title': '高级设置',
	'vision.panel.hint.customHeaders':
		'Header 会随配置保存。建议尽量把服务商 token 放在 API Key 输入框中。',
	'vision.panel.hint.extraBody': '会合并进请求体，不能覆盖 model、messages、input 或 stream。',
	'vision.panel.placeholder.openaiEndpoint': 'https://api.example.com/v1/chat/completions',
	'vision.panel.placeholder.openaiResponsesEndpoint': 'https://api.example.com/v1/responses',
	'vision.panel.placeholder.anthropicEndpoint': 'https://api.example.com/v1/messages',
	'vision.panel.placeholder.endpointType': '选择端点类型',
	'vision.panel.placeholder.enterApiKey': '输入 API Key',
	'vision.panel.endpointType.openaiChatCompletions': 'OpenAI 兼容 Chat Completions',
	'vision.panel.endpointType.openaiResponses': 'OpenAI 兼容 Responses',
	'vision.panel.endpointType.anthropicMessages': 'Anthropic 兼容 Messages',
	'vision.panel.hint.endpointTypeEmpty': '输入端点 URL 后会尝试自动识别端点类型。',
	'vision.panel.hint.endpointTypeInferred': '已根据 URL 自动识别为 {0}。',
	'vision.panel.hint.endpointTypeManual': '无法根据 URL 自动识别，请手动选择端点类型。',
	'vision.panel.hint.endpointTypeSelected': '使用手动选择的端点类型：{0}。',
	'vision.panel.hint.apiKeySet': '已保存 API Key。输入新 key 可替换当前 key。',
	'vision.panel.hint.apiKeyUnset': 'API Key 将保存在 VS Code SecretStorage 中。',
	'vision.panel.cost.tokenCost': '费用：{0} credits / 100 万 tokens',
	'vision.panel.cost.longContextTokenCost': '长上下文：{0} credits / 100 万 tokens',
	'vision.panel.cost.input': '输入 {0}',
	'vision.panel.cost.cachedInput': '缓存输入 {0}',
	'vision.panel.cost.output': '输出 {0}',
	'vision.panel.cost.pricing': '费用：{0}',
	'vision.panel.cost.category.low': '低费用',
	'vision.panel.cost.category.medium': '中等费用',
	'vision.panel.cost.category.high': '高费用',
	'vision.panel.cost.category.veryHigh': '很高费用',
	'vision.panel.cost.category.named': '{0} 费用',
	'vision.panel.status.vscodeLmSelected': '已选择 VS Code 语言模型。',
	'vision.panel.status.apiKeySet': '已设置 API Key。',
	'vision.panel.status.apiKeyNotSet': '未设置 API Key。',
	'vision.panel.status.testing': '正在测试视觉代理...',
	'vision.panel.status.vscodeLmNoHttpTest': 'VS Code 语言模型无需 HTTP 测试。',
	'vision.panel.status.testSucceeded': '已收到视觉代理响应，请查看下方样例。',
	'vision.panel.status.vscodeLmSaved': 'VS Code 语言模型已启用。',
	'vision.panel.status.endpointSavedWithKey': 'API 端点和 API Key 已保存，并已启用 API 端点。',
	'vision.panel.status.endpointSaved': 'API 端点已保存，并已启用 API 端点。',
	'vision.panel.status.apiKeyCleared': '已清除保存的 API Key。',
	'vision.panel.summary.noVSCodeVision.title': '当前：没有 VS Code 视觉模型',
	'vision.panel.summary.noVSCodeVision.detail': '请配置 API 端点，或安装支持图片输入的模型提供方。',
	'vision.panel.summary.vscodeLm.title': '当前：VS Code 语言模型',
	'vision.panel.summary.vscodeLm.detail': '{0} · {1} · 支持图片输入',
	'vision.panel.summary.apiNotConfigured.title': '当前：API 端点未配置',
	'vision.panel.summary.apiNotConfigured.detail': '填写端点 URL、端点类型和模型 ID 后保存。',
	'vision.panel.summary.apiEndpoint.title': '当前：API 端点',
	'vision.panel.summary.apiEndpoint.detail': '{0} · {1} · {2} · {3}',
	'vision.panel.summary.apiKeySet': '已设置 API Key',
	'vision.panel.summary.apiKeyNotSet': '未设置 API Key',
	'vision.panel.action.save': '保存',
	'vision.panel.action.test': '测试',
	'vision.panel.action.clearApiKey': '清除已保存的 API Key',
	'vision.panel.test.image': '测试图片',
	'vision.panel.test.response': '模型回答',
	'vision.panel.error.required': '{0} 必填',
	'vision.panel.error.invalidJson': '{0} 必须是有效的 JSON。',
	'vision.proxy.error.configurationInvalid': '视觉代理配置无效。',
	'vision.proxy.error.providerFamilyInvalid': '视觉代理提供方类型无效。',
	'vision.proxy.error.apiTypeInvalid': '视觉代理 API 类型无效。',
	'vision.proxy.error.fieldRequired': '{0} 必填。',
	'vision.proxy.error.extraBodyObject': '额外请求体 JSON 必须是一个对象。',
	'vision.proxy.error.extraBodyProtectedKey': '额外请求体不能覆盖 "{0}"。',
	'vision.proxy.error.customHeadersObject': '自定义 headers 必须是一个对象。',
	'vision.proxy.error.customHeaderNameEmpty': '自定义 header 名不能为空。',
	'vision.proxy.error.customHeaderNameInvalid': '自定义 header "{0}" 无效。',
	'vision.proxy.error.customHeaderValueString': '自定义 header "{0}" 的值必须是字符串。',
	'vision.proxy.error.customHeaderValueInvalid': '自定义 header "{0}" 的值无效。',
	'vision.proxy.error.invalidUrl': '视觉代理端点 URL 无效。',
	'vision.proxy.error.invalidUrlProtocol': '视觉代理端点 URL 必须使用 http:// 或 https://。',
	'vision.proxy.error.auth': '视觉代理认证失败 ({0})。',
	'vision.proxy.error.notFound': '视觉代理端点或模型不存在：{0}。',
	'vision.proxy.error.payloadTooLarge': '视觉代理图片请求体过大 ({0})。',
	'vision.proxy.error.rateLimited': '视觉代理触发速率限制 ({0})。',
	'vision.proxy.error.providerUnavailable': '视觉代理服务不可用 ({0})。',
	'vision.proxy.error.requestFailed': '视觉代理请求失败 ({0})。',
	'vision.proxy.error.cancelled': '视觉代理请求已取消。',
	'vision.proxy.error.timeout': '视觉代理请求超时。',
	'vision.proxy.error.network.dns': '视觉代理 DNS 解析失败 ({0})。',
	'vision.proxy.error.network.unreachable': '视觉代理端点不可达或拒绝连接 ({0})。',
	'vision.proxy.error.network.interrupted': '视觉代理连接被中断 ({0})。',
	'vision.proxy.error.network.timeout': '视觉代理网络连接超时 ({0})。',
	'vision.proxy.error.network.tls': '视觉代理 TLS/证书校验失败 ({0})。',
	'vision.proxy.error.network.aborted': '视觉代理请求已中止 ({0})。',
	'vision.proxy.error.network.protocol': '视觉代理 HTTP 连接或响应解析失败 ({0})。',
	'vision.proxy.error.network.configuration': '视觉代理请求配置无效 ({0})。',
	'vision.proxy.error.network.generic': '视觉代理网络请求失败 ({0})。',
	'vision.proxy.error.emptyResponse': '视觉代理返回了空响应。',
	'vision.proxy.error.unsupportedAnthropicResponse': 'Anthropic-compatible 视觉响应格式不受支持。',
	'vision.proxy.error.unsupportedOpenAIResponse': 'OpenAI-compatible 视觉响应格式不受支持。',
	'vision.proxy.error.unsupportedOpenAIContent': 'OpenAI-compatible 视觉响应内容格式不受支持。',
	'vision.proxy.error.testFailed': '视觉代理测试失败。',
	'vision.proxy.error.unknown': '未知错误',

	// Request
	'request.toolsLimitExceeded':
		'当前服务商单次 tools 请求最多支持 {0} 个 functions，当前请求包含 {1} 个。请先用 VS Code 的 Configure Tools 关闭不常用的工具；如果正在使用实验性稳定工具列表设置，请关闭它。',
	'request.preflightRoundLimitExceeded':
		'实验性稳定工具列表设置已尝试 {0} 轮，仍无法得到稳定的已启用工具列表。请关闭该实验性设置，或先用 VS Code 的 Configure Tools 关闭不常用的工具。',
	'notice.visionProxyMissing': '⚠️ 视觉代理不可用，所选模型无法看到图片。[配置视觉代理]({0})',
	'notice.visionProxyFailure': '**⚠️ {0}**\\\n\\\n**{1} · {2}**',
	'notice.audioProxyMissing': '⚠️ 音频代理不可用，音频附件将被忽略。[配置音频代理]({0})',
	'notice.audioProxyFailure': '**⚠️ {0}**\\\n\\\n**{1} · {2}**',
	'audio.action.configureProxy': '配置音频代理',
	'audio.proxyError': '音频代理异常：',
	'audio.panel.title': 'CLLMs 音频代理',
	'audio.panel.description':
		'配置音频转写代理，将音频附件先转成文本再发送给当前模型。模型会收到转写文本，而不是原始音频。',
	'audio.panel.field.source': '音频代理来源',
	'audio.panel.source.apiEndpoint': 'API 端点',
	'audio.panel.source.vscodeLm': 'VS Code 模型（暂不支持）',
	'audio.panel.field.endpointType': '端点类型',
	'audio.panel.field.endpointUrl': '端点 URL',
	'audio.panel.field.apiKey': 'API Key',
	'audio.panel.field.modelId': '模型 ID',
	'audio.panel.field.customHeaders': '自定义 Headers',
	'audio.panel.field.extraBody': '额外请求体 JSON',
	'audio.panel.advanced.title': '高级设置',
	'audio.panel.placeholder.openaiTranscriptionsEndpoint':
		'https://api.example.com/v1/audio/transcriptions',
	'audio.panel.placeholder.endpointType': '请选择端点类型',
	'audio.panel.placeholder.enterApiKey': '输入 API Key',
	'audio.panel.endpointType.openaiTranscriptions': 'OpenAI 兼容 Transcriptions',
	'audio.panel.endpointType.openaiResponsesAudio': 'OpenAI 兼容 Responses Audio',
	'audio.panel.action.save': '保存配置',
	'audio.panel.action.clearApiKey': '清空已保存 API Key',
	'audio.panel.status.apiKeySet': '已保存 API Key。',
	'audio.panel.status.apiKeyNotSet': '尚未保存 API Key。',
	'audio.panel.status.apiKeyCleared': '已清空保存的 API Key。',
	'audio.panel.status.vscodeLmSelected': '已选择 VS Code 音频模型来源（当前为占位）。',
	'audio.panel.status.endpointSavedWithKey': '音频代理端点和 API Key 已保存。',
	'audio.panel.status.endpointSaved': '音频代理端点已保存。',
	'audio.panel.summary.vscodeLm.title': '当前来源：VS Code 模型（占位）',
	'audio.panel.summary.vscodeLm.detail': '该来源暂不支持音频代理请求，请改用 API 端点。',
	'audio.panel.summary.apiNotConfigured.title': '当前：API 端点未完成配置',
	'audio.panel.summary.apiNotConfigured.detail': '请填写端点 URL、端点类型和模型 ID 后保存。',
	'audio.panel.summary.apiEndpoint.title': '当前：API 端点已配置',
	'audio.panel.summary.apiEndpoint.detail': '{0} · {1} · {2} · {3}',
	'audio.panel.summary.apiKeySet': 'API Key 已配置',
	'audio.panel.summary.apiKeyNotSet': 'API Key 未配置',
	'audio.panel.error.required': '{0} 为必填项。',
	'audio.panel.error.invalidJson': '{0} 必须是合法 JSON。',
	'audio.proxy.error.configurationInvalid': '音频代理配置无效。',
	'audio.proxy.error.apiTypeInvalid': '音频代理 API 类型无效。',
	'audio.proxy.error.fieldRequired': '{0} 必填。',
	'audio.proxy.error.extraBodyObject': '额外请求体 JSON 必须是一个对象。',
	'audio.proxy.error.extraBodyProtectedKey': '额外请求体不能覆盖 "{0}"。',
	'audio.proxy.error.customHeadersObject': '自定义 headers 必须是一个对象。',
	'audio.proxy.error.customHeaderNameEmpty': '自定义 header 名不能为空。',
	'audio.proxy.error.customHeaderNameInvalid': '自定义 header "{0}" 无效。',
	'audio.proxy.error.customHeaderValueString': '自定义 header "{0}" 的值必须是字符串。',
	'audio.proxy.error.customHeaderValueInvalid': '自定义 header "{0}" 的值无效。',
	'audio.proxy.error.invalidUrl': '音频代理端点 URL 无效。',
	'audio.proxy.error.invalidUrlProtocol': '音频代理端点 URL 必须使用 https://。',
	'audio.proxy.error.auth': '音频代理认证失败 ({0})。',
	'audio.proxy.error.notFound': '音频代理端点或模型不存在：{0}。',
	'audio.proxy.error.payloadTooLarge': '音频代理请求体过大 ({0})。',
	'audio.proxy.error.rateLimited': '音频代理触发速率限制 ({0})。',
	'audio.proxy.error.providerUnavailable': '音频代理服务不可用 ({0})。',
	'audio.proxy.error.requestFailed': '音频代理请求失败 ({0})。',
	'audio.proxy.error.cancelled': '音频代理请求已取消。',
	'audio.proxy.error.timeout': '音频代理请求超时。',
	'audio.proxy.error.network.generic': '音频代理网络请求失败 ({0})。',
	'audio.proxy.error.emptyResponse': '音频代理返回了空响应。',
	'audio.proxy.error.unsupportedOpenAIResponse': 'OpenAI-compatible 音频响应格式不受支持。',
	'audio.proxy.error.invalidAudioPart': '音频代理仅支持 audio/* 附件，当前 MIME: {0}。',
	'audio.proxy.error.audioTooLarge': '音频附件过大（{0} MB），已拒绝发送到音频代理。',
	'audio.proxy.error.unknown': '未知错误',
	'notice.toolDrift':
		'⚠️ 工具列表不稳定，缓存命中率可能下降。[了解更多](https://github.com/appledragon/cllms-for-copilot/blob/main/advanced-settings.nls.zh-cn.md)',

	// Errors
	'error.http.400': '[{0}] 请求体格式错误。请根据错误信息提示修改请求体。',
	'error.http.401':
		'[{0}] API Key 认证失败。请检查 API Key 是否正确，以及 baseUrl 是否与 Key 所属区域匹配（如 Moonshot 国内站用 api.moonshot.cn，国际站用 api.moonshot.ai；MiniMax 国内站用 api.minimaxi.com，国际站用 api.minimax.io）。如没有 API key，请先创建 API Key。',
	'error.http.401.withCreateApiKeyLink':
		'[{0}] API Key 认证失败。请检查 API Key 是否正确，以及 baseUrl 是否与 Key 所属区域匹配（如 Moonshot 国内站用 api.moonshot.cn，国际站用 api.moonshot.ai；MiniMax 国内站用 api.minimaxi.com，国际站用 api.minimax.io）。如没有 API key，请先[创建 API Key]({1})。',
	'error.http.402': '[{0}] 账号余额不足。请确认账户余额，并前往充值页面进行充值。',
	'error.http.422': '[{0}] 请求体参数错误。请根据错误信息提示修改相关参数。',
	'error.http.429': '[{0}] 请求速率（TPM 或 RPM）达到上限。请合理规划您的请求速率。',
	'error.http.quota':
		'[{0}] 账号余额或当前额度不足，服务商已拒绝请求。请检查用量/账单并充值或调整套餐。',
	'error.http.quota.withProviderMessage':
		'[{0}] 账号余额或当前额度不足，服务商已拒绝请求。服务商返回：{1} 请检查用量/账单并充值或调整套餐。',
	'error.http.500': '[{0}] 服务器内部故障。请等待后重试。',
	'error.http.503': '[{0}] 服务器负载过高。请稍后重试您的请求。',
	'error.http.generic': '[{0}] 服务返回错误响应。',
	'error.action.setApiKey': '设置 API Key',
	'error.action.createApiKey': '创建 API Key',
	'error.action.viewUsage': '用量',
	'error.action.checkQwenStatus': 'Qwen 状态',
	'error.action.checkProviderStatus': '服务状态',
	'error.action.viewDetails': '错误详情',
	'error.network.dns': '[{0}] DNS 解析失败。请检查网络连接、防火墙或代理设置，以及自定义 baseUrl。',
	'error.network.unreachable':
		'[{0}] 目标不可达或拒绝连接。请检查自定义 baseUrl、代理服务、网络连接或防火墙设置。',
	'error.network.interrupted': '[{0}] 连接被中断。请检查网络连接、防火墙或代理设置，或稍后重试。',
	'error.network.timeout': '[{0}] 连接超时。请稍后重试，或检查网络连接、防火墙或代理设置。',
	'error.network.tls': '[{0}] TLS/证书校验失败。请检查代理、证书配置或自定义 baseUrl。',
	'error.network.aborted':
		'[{0}] 请求已中止。如果不是主动取消，请检查网络连接或代理设置，或稍后重试。',
	'error.network.protocol':
		'[{0}] HTTP 连接或响应解析失败。请检查代理设置、自定义 baseUrl 或服务响应。',
	'error.network.configuration': '[{0}] 请求配置无效。请检查自定义 baseUrl 或扩展设置。',
	'error.network.generic':
		'[{0}] 网络请求失败。请检查网络连接、防火墙或代理设置，以及自定义 baseUrl。',
	'error.unknown': '请求失败：{0}',

	// Connection test
	'connection.pickTitle': '选择要测试连接的服务商',
	'connection.noKey': '{0} 尚未配置 API Key，请先运行 "CLLMs: 设置 API Key"。',
	'connection.testing': '正在测试与 {0} 的连接…',
	'connection.success': '{0}：连接正常，发现 {1} 个可用模型。',
	'connection.successNoList':
		'{0}：连接正常。该端点未返回模型列表；如果后续聊天失败，可用这个服务商发起一次轻量 chat completion 来进一步验证聊天端点。',
	'connection.successStale':
		'{0}：连接正常（{1} 个模型），但以下已配置的模型 ID 未在端点中找到：{2}。括号内为使用该 API 模型 ID 的内置模型；如端点使用不同的模型名称，请更新 modelIdOverrides。',
	'connection.failed': '{0}：连接失败。{1}',
	'connection.action.openSettings': '打开设置',
	'connection.action.openApiKeyPage': '打开 API Key 页面',
	'connection.action.showLogs': '显示日志',

	// Diagnostics
	'debug.dumpPrivacyWarning':
		'Verbose 请求 dump 可能包含提示词、工具参数、图片描述等敏感内容，仅用于本地调试。CLLMs 会清理 7 天前的旧 dump，并会对凭证字段做最小化脱敏。',
	'diagnosticReport.copied': '已复制 CLLMs 诊断报告（不包含 API Key、提示词或完整请求体）。',

	// Session cost
	'sessionCost.statusBarTooltip': 'CLLMs 本次会话费用（近似，点击查看明细）',
	'sessionCost.empty': '本次会话尚未记录任何 CLLMs 用量。',
	'sessionCost.summaryTitle': 'CLLMs 本次会话费用（近似）：{0}',
	'sessionCost.lineItem':
		'{0}：{1}（{2} 次请求，输入 {3} / 输出 {4} tokens，缓存 {5}，命中率 {6}%，省 {7}，均价 {8}/次）',
	'sessionCost.approximateNote':
		'仅为近似值，且只统计当前会话：基于服务商返回的 usage 估算，命中缓存的输入按缓存命中价计费。',
	'sessionCost.unbilledNote': '另有 {0} 次请求（{1} 个模型）因缺少定价未纳入估算。',
	'sessionCost.cacheHealthNote':
		'本次会话平均上下文缓存命中率：{0}%（命中缓存的输入按更低价计费；命中率越高越省钱）。',
	'sessionCost.tierSplitNote': '其中 utility/辅助请求约 {0}，主力/agent 请求约 {1}。',
	'sessionCost.cacheSavingsNote': '本次会话上下文缓存估算节省：{0}。',
	'sessionCost.hintsTitle': '优化建议：',
	'sessionCost.hint.sortToolsForCache':
		'- 检测到工具 schema 变化且缓存命中率偏低，可尝试开启 Sort Tools For Cache 稳定工具顺序。',
	'sessionCost.hint.stabilizeToolList':
		'- 工具列表较大或仍有未展开工具且缓存命中率偏低，可尝试 Stabilize Tool List，但请留意输入 tokens 增加。',
	'sessionCost.hint.latestToolLoop':
		'- 长会话已积累较多输入 tokens，可尝试 Reasoning Replay Scope = latest-tool-loop 降低后续输入成本。',
	'sessionCost.hint.utilityCostControl':
		'- utility/辅助请求费用占比较高，可配置辅助请求模型或设置 utility max output tokens。',
	'sessionCost.notAvailable': '不适用',
	'sessionCost.action.openAdvancedSettings': '打开高级设置',
	'sessionCost.action.configureUtilityModel': '配置辅助模型',
	'sessionCost.action.openUsagePage': '打开用量页',
	'sessionCost.reset': '清零',
	'sessionCost.resetDone': '已清零 CLLMs 会话费用。',

	// Configure Utility Model command
	'utilityModel.title': '配置辅助请求模型（chat.utilityModel）',
	'utilityModel.placeholder': '选择一个更便宜的模型用于标题、提交信息等辅助请求',
	'utilityModel.openSettings': '改为打开设置…',
	'utilityModel.openSettingsAction': '打开设置',
	'utilityModel.configured':
		'已将 chat.utilityModel 与 chat.utilitySmallModel 设为「{0}」。VS Code 会用它处理辅助请求。',
	'utilityModel.writeFailed':
		'无法写入 chat.utilityModel 设置（当前 VS Code 版本可能不支持），请在设置中手动配置。',

	// Image Read Tool
	'tool.readImage.error.missingPath': '必需参数 filePath 未提供或为空。',
	'tool.readImage.error.notFound': '未找到图片文件：{0}',
	'tool.readImage.error.readFailed': '无法读取图片文件：{0}',
	'tool.readImage.error.emptyFile': '图片文件为空：{0}',
	'tool.readImage.error.unsupportedFormat': '不支持的图片格式：{0}',
	'tool.readImage.error.noVisionProxy':
		'视觉代理未配置或不可用。请使用命令 "CLLMs: 配置视觉代理" 设置视觉代理。',
	'tool.readImage.error.emptyResponse': '视觉代理对 {0} 返回了空响应。',
	'tool.readImage.error.describeFailed': '无法描述图片 {0}：{1}',
	'tool.readImage.cancelled': '图片读取已取消。',

	// Extension
	'extension.activateFailed': 'CLLMs 激活失败，请运行 "CLLMs: 显示日志" 查看详情。',
	'extension.deactivateFailed': 'CLLMs 停用异常',
	'extension.welcomeFailed': '欢迎引导加载异常',
	'extension.openRequestDumpsFolderFailed':
		'打开请求 dump 目录失败，请运行 "CLLMs: 显示日志" 查看详情。',
};

const en: Translations = {
	// Model descriptions
	'model.qwen3-coder-plus.detail': 'Agentic coding',
	'model.qwen3-coder-plus.tooltip':
		'Qwen3 Coder model for agentic coding and tool calling, strong at large refactors.',
	'model.qwen3-coder-flash.detail': 'Fast coding',
	'model.qwen3-coder-flash.tooltip':
		'Qwen3 Coder Flash lightweight coding model with faster responses and lower cost, plus tool calling.',
	'model.qwen3.8-max.detail': 'Latest flagship',
	'model.qwen3.8-max.tooltip':
		'Qwen3.8 Max latest flagship (2.4T total / 95B active) with up to 1M context, native vision, built for demanding coding, professional work, and long-horizon agent tasks with thinking mode and tool calling.',
	'model.qwen3.7-max.detail': 'Flagship',
	'model.qwen3.7-max.tooltip':
		'Qwen3.7 Max flagship with up to 1M context, built for demanding coding, complex reasoning, and long-horizon tasks with thinking mode and tool calling.',
	'model.qwen3.7-plus.detail': 'Balanced flagship',
	'model.qwen3.7-plus.tooltip':
		'Qwen3.7 Plus balanced flagship with up to 1M context, balancing quality, speed, and cost for everyday coding and agent tasks with thinking mode and tool calling.',
	'model.qwen3-coder-plus-intl.detail': 'Agentic coding',
	'model.qwen3-coder-plus-intl.tooltip':
		'Qwen3 Coder model for agentic programming and tool calling (international). Excels at large-scale refactoring.',
	'model.qwen3-coder-flash-intl.detail': 'Fast coding',
	'model.qwen3-coder-flash-intl.tooltip':
		'Qwen3 Coder Flash lightweight coding model (international) with faster responses and lower cost, plus tool calling.',
	'model.qwen3.8-max-intl.detail': 'Latest flagship',
	'model.qwen3.8-max-intl.tooltip':
		'Qwen3.8 Max latest flagship (international, 2.4T total / 95B active) with up to 1M context, native vision, built for demanding coding, professional work, and long-horizon agent tasks with thinking mode and tool calling.',
	'model.qwen3.7-max-intl.detail': 'Flagship',
	'model.qwen3.7-max-intl.tooltip':
		'Qwen3.7 Max flagship (international) with up to 1M context, built for demanding coding, complex reasoning, and long-horizon tasks with thinking mode and tool calling.',
	'model.qwen3.7-plus-intl.detail': 'Balanced flagship',
	'model.qwen3.7-plus-intl.tooltip':
		'Qwen3.7 Plus balanced flagship (international) with up to 1M context, balancing quality, speed, and cost for everyday coding and agent tasks with thinking mode and tool calling.',
	'model.deepseek-v4-flash.detail': 'Fast flagship',
	'model.deepseek-v4-flash.tooltip':
		'DeepSeek-V4-Flash flagship with a 1M context and up to 384K output — supports both thinking and non-thinking modes, tool calling, and JSON output.',
	'model.deepseek-v4-pro.detail': 'Pro flagship',
	'model.deepseek-v4-pro.tooltip':
		'DeepSeek-V4-Pro flagship with a 1M context and up to 384K output — deep thinking by default, ideal for complex reasoning and coding, with tool calling and JSON output.',
	'model.glm-5.3.detail': 'Latest flagship',
	'model.glm-5.3.tooltip':
		'z.ai GLM-5.3 latest flagship with a 1M context — stronger coding and agentic capabilities for long-horizon tasks in complex environments, with deep thinking mode and tool calling.',
	'model.glm-5.2.detail': 'Latest flagship',
	'model.glm-5.2.tooltip':
		'z.ai GLM-5.2 latest flagship with a 1M context — supports project-scale engineering context and complex long-horizon tasks, from requirements to multi-platform deployment in a single session, with deep thinking mode and tool calling.',
	'model.glm-5.1.detail': 'Long-horizon coding',
	'model.glm-5.1.tooltip':
		'z.ai GLM-5.1 flagship with a 200K context — supports up to 8 hours of autonomous coding and agentic work, excels at complex engineering optimization and long-horizon tasks, with thinking mode and tool calling.',
	'model.glm-5.detail': 'High-intelligence',
	'model.glm-5.tooltip':
		'z.ai GLM-5 high-intelligence model with a 200K context, strong at coding, complex reasoning, and tool calling with thinking mode.',
	'model.glm-5-turbo.detail': 'Long-task optimized',
	'model.glm-5-turbo.tooltip':
		'z.ai GLM-5-Turbo model with a 200K context, optimized for long-running coding and agent tasks with thinking mode and tool calling.',
	'model.glm-5v-turbo.detail': 'Vision + thinking',
	'model.glm-5v-turbo.tooltip':
		'z.ai GLM-5V-Turbo multimodal model with a 200K context, native image input, deep thinking, and tool calling.',
	'model.MiniMax-M3.detail': 'Flagship agentic',
	'model.MiniMax-M3.tooltip':
		'MiniMax-M3 flagship with up to 1M context — strong at agentic reasoning, coding, and long-context tasks, with thinking mode and tool calling.',
	'model.MiniMax-M3-intl.detail': 'Flagship agentic',
	'model.MiniMax-M3-intl.tooltip':
		'MiniMax-M3 flagship (international) with up to 1M context — strong at agentic reasoning, coding, and long-context tasks, with thinking mode and tool calling.',
	'model.mimo-v2.5-pro.detail': 'Flagship coding',
	'model.mimo-v2.5-pro.tooltip':
		'Xiaomi MiMo V2.5 Pro flagship hybrid-reasoning model with up to 1M context — strong at complex reasoning and coding, with thinking mode and tool calling.',
	'model.mimo-v2.5.detail': 'Multimodal',
	'model.mimo-v2.5.tooltip':
		'Xiaomi MiMo V2.5 omni model with native image input — understands images directly, plus thinking mode and tool calling.',
	'model.kimi-k3.detail': 'Flagship 2.8T',
	'model.kimi-k3.tooltip':
		'Moonshot Kimi K3 flagship model with 2.8T parameters, 1M-token context, native vision, and always-on thinking (reasoning_effort) — built for long-range coding and knowledge work.',
	'model.kimi-k2.7.detail': 'Latest flagship',
	'model.kimi-k2.7.tooltip':
		'Moonshot Kimi K2.7 latest flagship native-multimodal hybrid-reasoning model with a 256K context — native image input, thinking mode (on by default), and tool calling.',
	'model.kimi-k2.6.detail': 'Flagship multimodal',
	'model.kimi-k2.6.tooltip':
		'Moonshot Kimi K2.6 flagship native-multimodal hybrid-reasoning model with a 256K context — native image input, thinking mode (on by default), and tool calling.',
	'model.kimi-k2.5.detail': 'Multimodal',
	'model.kimi-k2.5.tooltip':
		'Moonshot Kimi K2.5 native-multimodal model with a 256K context — native image input, toggleable thinking mode, and tool calling.',
	'model.kimi-k2.7-code-highspeed.detail': 'High-speed coding',
	'model.kimi-k2.7-code-highspeed.tooltip':
		'Moonshot Kimi K2.7 Code HighSpeed variant with ~180 tok/s output speed, 256K context — native image input, thinking mode, and tool calling.',
	'model.kimi-k3-intl.detail': 'Flagship 2.8T',
	'model.kimi-k3-intl.tooltip':
		'Moonshot Kimi K3 flagship model (international) with 2.8T parameters, 1M-token context, native vision, and always-on thinking (reasoning_effort).',
	'model.kimi-k2.7-intl.detail': 'Latest flagship',
	'model.kimi-k2.7-intl.tooltip':
		'Moonshot Kimi K2.7 latest flagship native-multimodal hybrid-reasoning model (international) with a 256K context — native image input, thinking mode (on by default), and tool calling.',
	'model.kimi-k2.7-code-highspeed-intl.detail': 'High-speed coding',
	'model.kimi-k2.7-code-highspeed-intl.tooltip':
		'Moonshot Kimi K2.7 Code HighSpeed variant (international) with ~180 tok/s output speed, 256K context — native image input, thinking mode, and tool calling.',
	'model.kimi-k2.6-intl.detail': 'Flagship multimodal',
	'model.kimi-k2.6-intl.tooltip':
		'Moonshot Kimi K2.6 flagship native-multimodal hybrid-reasoning model (international) with a 256K context — native image input, thinking mode (on by default), and tool calling.',
	'model.kimi-k2.5-intl.detail': 'Multimodal',
	'model.kimi-k2.5-intl.tooltip':
		'Moonshot Kimi K2.5 native-multimodal model (international) with a 256K context — native image input, toggleable thinking mode, and tool calling.',
	'model.hunyuan-2.0-think.detail': 'Deep thinking',
	'model.hunyuan-2.0-think.tooltip':
		'Tencent Hunyuan HY 2.0 Think flagship model with a 128K context — strong at coding and deep reasoning, with thinking mode and tool calling.',
	'model.hunyuan-2.0-instruct.detail': 'Instruction-following',
	'model.hunyuan-2.0-instruct.tooltip':
		'Tencent Hunyuan HY 2.0 Instruct model with a 128K context, suited for instruction following, creative work, and knowledge-accurate tasks, plus tool calling.',

	// API Key
	'auth.apiKeyRequiredDetail': 'Please run CLLMs: Set API Key to configure.',
	'auth.promptFor': 'Enter your {0} API key or compatible provider token.',
	'auth.placeholder': 'sk-... or provider token',
	'auth.emptyValidation': 'API key cannot be empty',
	'auth.savedFor': '{0} API key saved.',
	'auth.removedFor': '{0} API key removed.',
	'auth.notConfigured':
		'API key not configured. Run "CLLMs: Set API Key" from the Command Palette.',
	'auth.selectProviderSet': 'Select a provider to set its API key',
	'auth.selectProviderClear': 'Select a provider to remove its API key',
	'auth.selectProviderPlaceholder': 'Select a provider',
	'auth.providerConfigured': 'configured',
	'auth.providerNotConfigured': 'not configured',
	'auth.inputTitle': 'Set {0} API key',
	'auth.openApiKeyPage': 'Open {0} API key page',
	'auth.savedAction.testConnection': 'Test Connection',
	'auth.savedAction.openChat': 'Open Chat',

	// Setup flow
	'setup.selectProvider': 'Select a provider to set up',
	'setup.start':
		'Set up {0}: open the provider console to create an API key, then paste it here and test the connection.',
	'setup.done':
		'{0} setup is complete. The connection test result was shown; continue to chat or review this provider settings.',
	'setup.action.openApiKeyPage': 'Open API Key Page',
	'setup.action.enterApiKey': 'Enter API Key',

	// Settings
	'settings.selectProvider': 'Select a provider settings page to open',

	// Providers view
	'providers.tooltip.status': 'Status: {0}',
	'providers.tooltip.endpoint': 'Endpoint: {0}',
	'providers.tooltip.models': 'Models: {0}',
	'providers.badge.vision': 'vision',
	'providers.badge.thinking': 'thinking',
	'providers.webview.title': 'CLLMs Providers',
	'providers.webview.endpointLabel': 'Endpoint',
	'providers.section.models': 'Models',
	'providers.action.setup': 'Setup',
	'providers.action.setApiKey': 'Set API Key',
	'providers.action.clearApiKey': 'Clear API Key',
	'providers.action.test': 'Test Connection',
	'providers.action.apiKeyPage': 'API Key Page',
	'providers.action.usagePage': 'Usage',
	'providers.action.statusPage': 'Status',
	'providers.action.providerSettings': 'Settings',
	'providers.summary': '{0} / {1} configured',
	'providers.noneConfigured':
		'No providers configured yet — click “Setup” on any provider to begin.',
	'providers.loading': 'Loading…',
	'providers.error': 'Could not load provider status.',
	'providers.retry': 'Retry',
	'providers.status.ok': 'Connected',
	'providers.status.error': 'Connection failed',
	'providers.status.testing': 'Testing…',

	// Thinking Effort
	'status.thinking': 'Thinking Effort',
	'thinking.none': 'None',
	'thinking.none.desc': 'Disable thinking for faster responses',
	'thinking.high': 'High',
	'thinking.high.desc': 'Recommended for most tasks',
	'thinking.max': 'Max',
	'thinking.max.desc': 'Maximum reasoning depth for complex agent tasks',

	// Vision
	// NOTE: vision.unableToDescribe has been moved to consts.ts as
	// IMAGE_DESCRIPTION_UNAVAILABLE — it is prompt content, not UI text.
	'vision.proxyUsing': 'Vision proxy: {0}',
	'vision.fallbackUsing': 'Vision proxy (fallback): {0}',
	'vision.notFound': 'Vision model "{0}" not found',
	'vision.unavailable': 'No vision models available, image(s) ignored',
	'vision.proxyError': 'Vision proxy error:',
	'vision.action.configureProxy': 'Configure Vision Proxy',
	'vision.panel.title': 'CLLMs Vision Proxy',
	'model.visionProxyNote':
		'(No native image support — pasted images are auto-routed to a vision proxy model, described, then forwarded to this model as text.)',
	'vision.panel.description':
		'Configure a vision-capable model to turn image attachments into text before the selected model receives the request. The model receives the description, not the original images.',
	'vision.panel.source.vscodeLm': 'VS Code model',
	'vision.panel.source.apiEndpoint': 'API endpoint',
	'vision.panel.field.source': 'Vision proxy source',
	'vision.panel.field.visionModel': 'Vision model',
	'vision.panel.field.endpointType': 'Endpoint type',
	'vision.panel.field.endpointUrl': 'Endpoint URL',
	'vision.panel.field.apiKey': 'API key',
	'vision.panel.field.modelId': 'Model ID',
	'vision.panel.field.customHeaders': 'Custom headers JSON',
	'vision.panel.field.extraBody': 'Additional request body JSON',
	'vision.panel.advanced.title': 'Advanced settings',
	'vision.panel.hint.customHeaders':
		'Header values are stored with the profile. Put provider tokens in the API key field when possible.',
	'vision.panel.hint.extraBody':
		'Merged into the request body. Cannot override model, messages, input, or stream.',
	'vision.panel.placeholder.openaiEndpoint': 'https://api.example.com/v1/chat/completions',
	'vision.panel.placeholder.openaiResponsesEndpoint': 'https://api.example.com/v1/responses',
	'vision.panel.placeholder.anthropicEndpoint': 'https://api.example.com/v1/messages',
	'vision.panel.placeholder.endpointType': 'Select endpoint type',
	'vision.panel.placeholder.enterApiKey': 'Enter API key',
	'vision.panel.endpointType.openaiChatCompletions': 'OpenAI-compatible Chat Completions',
	'vision.panel.endpointType.openaiResponses': 'OpenAI-compatible Responses',
	'vision.panel.endpointType.anthropicMessages': 'Anthropic-compatible Messages',
	'vision.panel.hint.endpointTypeEmpty':
		'Enter an endpoint URL to infer the endpoint type automatically.',
	'vision.panel.hint.endpointTypeInferred': 'Inferred from URL: {0}.',
	'vision.panel.hint.endpointTypeManual':
		'Could not infer this URL. Select the endpoint type manually.',
	'vision.panel.hint.endpointTypeSelected': 'Using selected endpoint type: {0}.',
	'vision.panel.hint.apiKeySet': 'Stored API key is set. Enter a new key to replace it.',
	'vision.panel.hint.apiKeyUnset': 'API key will be stored in VS Code SecretStorage.',
	'vision.panel.cost.tokenCost': 'Cost: {0} credits / 1M tokens',
	'vision.panel.cost.longContextTokenCost': 'Long context: {0} credits / 1M tokens',
	'vision.panel.cost.input': 'input {0}',
	'vision.panel.cost.cachedInput': 'cached input {0}',
	'vision.panel.cost.output': 'output {0}',
	'vision.panel.cost.pricing': 'Cost: {0}',
	'vision.panel.cost.category.low': 'low cost',
	'vision.panel.cost.category.medium': 'medium cost',
	'vision.panel.cost.category.high': 'high cost',
	'vision.panel.cost.category.veryHigh': 'very high cost',
	'vision.panel.cost.category.named': '{0} cost',
	'vision.panel.status.vscodeLmSelected': 'VS Code language model is selected.',
	'vision.panel.status.apiKeySet': 'API key is set.',
	'vision.panel.status.apiKeyNotSet': 'API key is not set.',
	'vision.panel.status.testing': 'Testing vision proxy...',
	'vision.panel.status.vscodeLmNoHttpTest':
		'VS Code language model selection does not need an HTTP test.',
	'vision.panel.status.testSucceeded': 'Vision proxy responded. Review the sample below.',
	'vision.panel.status.vscodeLmSaved': 'VS Code language model is now active.',
	'vision.panel.status.endpointSavedWithKey':
		'API endpoint and API key saved. API endpoint is now active.',
	'vision.panel.status.endpointSaved': 'API endpoint saved. API endpoint is now active.',
	'vision.panel.status.apiKeyCleared': 'Saved API key cleared.',
	'vision.panel.summary.noVSCodeVision.title': 'Current: no VS Code vision model',
	'vision.panel.summary.noVSCodeVision.detail':
		'Configure an API endpoint or install a provider with image input support.',
	'vision.panel.summary.vscodeLm.title': 'Current: VS Code language model',
	'vision.panel.summary.vscodeLm.detail': '{0} · {1} · image input supported',
	'vision.panel.summary.apiNotConfigured.title': 'Current: API endpoint not configured',
	'vision.panel.summary.apiNotConfigured.detail':
		'Complete the endpoint URL, endpoint type, and model ID, then save.',
	'vision.panel.summary.apiEndpoint.title': 'Current: API endpoint',
	'vision.panel.summary.apiEndpoint.detail': '{0} · {1} · {2} · {3}',
	'vision.panel.summary.apiKeySet': 'API key set',
	'vision.panel.summary.apiKeyNotSet': 'API key not set',
	'vision.panel.action.save': 'Save',
	'vision.panel.action.test': 'Test',
	'vision.panel.action.clearApiKey': 'Clear saved API key',
	'vision.panel.test.image': 'Test image',
	'vision.panel.test.response': 'Model response',
	'vision.panel.error.required': '{0} is required',
	'vision.panel.error.invalidJson': '{0} must be valid JSON.',
	'vision.proxy.error.configurationInvalid': 'Vision proxy configuration is invalid.',
	'vision.proxy.error.providerFamilyInvalid': 'Vision proxy provider type is invalid.',
	'vision.proxy.error.apiTypeInvalid': 'Vision proxy API type is invalid.',
	'vision.proxy.error.fieldRequired': '{0} is required.',
	'vision.proxy.error.extraBodyObject': 'Additional request body JSON must be an object.',
	'vision.proxy.error.extraBodyProtectedKey': 'Additional request body cannot override "{0}".',
	'vision.proxy.error.customHeadersObject': 'Custom headers must be an object.',
	'vision.proxy.error.customHeaderNameEmpty': 'Custom header name cannot be empty.',
	'vision.proxy.error.customHeaderNameInvalid': 'Custom header "{0}" is invalid.',
	'vision.proxy.error.customHeaderValueString': 'Custom header "{0}" must have a string value.',
	'vision.proxy.error.customHeaderValueInvalid': 'Custom header "{0}" has an invalid value.',
	'vision.proxy.error.invalidUrl': 'Vision proxy endpoint URL is invalid.',
	'vision.proxy.error.invalidUrlProtocol':
		'Vision proxy endpoint URL must start with http:// or https://.',
	'vision.proxy.error.auth': 'Vision proxy authentication failed ({0}).',
	'vision.proxy.error.notFound': 'Vision proxy endpoint or model not found at {0}.',
	'vision.proxy.error.payloadTooLarge': 'Vision proxy image payload too large ({0}).',
	'vision.proxy.error.rateLimited': 'Vision proxy rate limited ({0}).',
	'vision.proxy.error.providerUnavailable': 'Vision proxy provider unavailable ({0}).',
	'vision.proxy.error.requestFailed': 'Vision proxy request failed ({0}).',
	'vision.proxy.error.cancelled': 'Vision proxy request was cancelled.',
	'vision.proxy.error.timeout': 'Vision proxy request timed out.',
	'vision.proxy.error.network.dns': 'Vision proxy DNS lookup failed ({0}).',
	'vision.proxy.error.network.unreachable':
		'Vision proxy endpoint is unreachable or refused the connection ({0}).',
	'vision.proxy.error.network.interrupted': 'Vision proxy connection was interrupted ({0}).',
	'vision.proxy.error.network.timeout': 'Vision proxy network connection timed out ({0}).',
	'vision.proxy.error.network.tls': 'Vision proxy TLS/certificate verification failed ({0}).',
	'vision.proxy.error.network.aborted': 'Vision proxy request was aborted ({0}).',
	'vision.proxy.error.network.protocol':
		'Vision proxy HTTP connection or response parsing failed ({0}).',
	'vision.proxy.error.network.configuration':
		'Vision proxy request configuration is invalid ({0}).',
	'vision.proxy.error.network.generic': 'Vision proxy network request failed ({0}).',
	'vision.proxy.error.emptyResponse': 'Vision proxy returned an empty response.',
	'vision.proxy.error.unsupportedAnthropicResponse':
		'Anthropic-compatible vision response has unsupported shape.',
	'vision.proxy.error.unsupportedOpenAIResponse':
		'OpenAI-compatible vision response has unsupported shape.',
	'vision.proxy.error.unsupportedOpenAIContent':
		'OpenAI-compatible vision response content has unsupported shape.',
	'vision.proxy.error.testFailed': 'Vision proxy test failed.',
	'vision.proxy.error.unknown': 'unknown',

	// Request
	'request.toolsLimitExceeded':
		'The provider supports at most {0} functions in a single `tools` request, but this request contains {1}. Use VS Code Configure Tools to disable tools you rarely use. If the experimental tool-list stabilization setting is enabled, turn it off.',
	'request.preflightRoundLimitExceeded':
		'Experimental tool-list stabilization tried {0} rounds but still could not get a stable enabled-tools list. Turn this experimental setting off, or use VS Code Configure Tools to disable tools you rarely use first.',
	'notice.visionProxyMissing':
		'⚠️ Vision Proxy is unavailable. The selected model cannot see images. [Configure Vision Proxy]({0})',
	'notice.visionProxyFailure': '**⚠️ {0}**\\\n\\\n**{1} · {2}**',
	'notice.audioProxyMissing':
		'⚠️ Audio Proxy is unavailable. Audio attachments will be ignored. [Configure Audio Proxy]({0})',
	'notice.audioProxyFailure': '**⚠️ {0}**\\\n\\\n**{1} · {2}**',
	'audio.action.configureProxy': 'Configure Audio Proxy',
	'audio.proxyError': 'Audio proxy error:',
	'audio.panel.title': 'CLLMs Audio Proxy',
	'audio.panel.description':
		'Configure an audio transcription proxy so audio attachments are converted into text before reaching the selected model. The model receives text transcripts, not raw audio.',
	'audio.panel.field.source': 'Audio proxy source',
	'audio.panel.source.apiEndpoint': 'API endpoint',
	'audio.panel.source.vscodeLm': 'VS Code model (not supported yet)',
	'audio.panel.field.endpointType': 'Endpoint type',
	'audio.panel.field.endpointUrl': 'Endpoint URL',
	'audio.panel.field.apiKey': 'API key',
	'audio.panel.field.modelId': 'Model ID',
	'audio.panel.field.customHeaders': 'Custom headers',
	'audio.panel.field.extraBody': 'Extra body JSON',
	'audio.panel.advanced.title': 'Advanced settings',
	'audio.panel.placeholder.openaiTranscriptionsEndpoint':
		'https://api.example.com/v1/audio/transcriptions',
	'audio.panel.placeholder.endpointType': 'Select endpoint type',
	'audio.panel.placeholder.enterApiKey': 'Enter API key',
	'audio.panel.endpointType.openaiTranscriptions': 'OpenAI-compatible Transcriptions',
	'audio.panel.endpointType.openaiResponsesAudio': 'OpenAI-compatible Responses Audio',
	'audio.panel.action.save': 'Save configuration',
	'audio.panel.action.clearApiKey': 'Clear saved API key',
	'audio.panel.status.apiKeySet': 'API key is saved.',
	'audio.panel.status.apiKeyNotSet': 'API key is not set.',
	'audio.panel.status.apiKeyCleared': 'Saved API key cleared.',
	'audio.panel.status.vscodeLmSelected': 'VS Code audio source selected (placeholder for now).',
	'audio.panel.status.endpointSavedWithKey': 'Audio proxy endpoint and API key saved.',
	'audio.panel.status.endpointSaved': 'Audio proxy endpoint saved.',
	'audio.panel.summary.vscodeLm.title': 'Current: VS Code model source (placeholder)',
	'audio.panel.summary.vscodeLm.detail':
		'This source does not support audio proxy requests yet. Use API endpoint instead.',
	'audio.panel.summary.apiNotConfigured.title': 'Current: API endpoint not configured',
	'audio.panel.summary.apiNotConfigured.detail':
		'Complete endpoint URL, endpoint type, and model ID, then save.',
	'audio.panel.summary.apiEndpoint.title': 'Current: API endpoint configured',
	'audio.panel.summary.apiEndpoint.detail': '{0} · {1} · {2} · {3}',
	'audio.panel.summary.apiKeySet': 'API key set',
	'audio.panel.summary.apiKeyNotSet': 'API key not set',
	'audio.panel.error.required': '{0} is required.',
	'audio.panel.error.invalidJson': '{0} must be valid JSON.',
	'audio.proxy.error.configurationInvalid': 'Audio proxy configuration is invalid.',
	'audio.proxy.error.apiTypeInvalid': 'Audio proxy API type is invalid.',
	'audio.proxy.error.fieldRequired': '{0} is required.',
	'audio.proxy.error.extraBodyObject': 'Additional request body JSON must be an object.',
	'audio.proxy.error.extraBodyProtectedKey': 'Additional request body cannot override "{0}".',
	'audio.proxy.error.customHeadersObject': 'Custom headers must be an object.',
	'audio.proxy.error.customHeaderNameEmpty': 'Custom header name cannot be empty.',
	'audio.proxy.error.customHeaderNameInvalid': 'Custom header "{0}" is invalid.',
	'audio.proxy.error.customHeaderValueString': 'Custom header "{0}" must have a string value.',
	'audio.proxy.error.customHeaderValueInvalid': 'Custom header "{0}" has an invalid value.',
	'audio.proxy.error.invalidUrl': 'Audio proxy endpoint URL is invalid.',
	'audio.proxy.error.invalidUrlProtocol': 'Audio proxy endpoint URL must start with https://.',
	'audio.proxy.error.auth': 'Audio proxy authentication failed ({0}).',
	'audio.proxy.error.notFound': 'Audio proxy endpoint or model not found at {0}.',
	'audio.proxy.error.payloadTooLarge': 'Audio proxy payload too large ({0}).',
	'audio.proxy.error.rateLimited': 'Audio proxy rate limited ({0}).',
	'audio.proxy.error.providerUnavailable': 'Audio proxy provider unavailable ({0}).',
	'audio.proxy.error.requestFailed': 'Audio proxy request failed ({0}).',
	'audio.proxy.error.cancelled': 'Audio proxy request was cancelled.',
	'audio.proxy.error.timeout': 'Audio proxy request timed out.',
	'audio.proxy.error.network.generic': 'Audio proxy network request failed ({0}).',
	'audio.proxy.error.emptyResponse': 'Audio proxy returned an empty response.',
	'audio.proxy.error.unsupportedOpenAIResponse':
		'OpenAI-compatible audio response has unsupported shape.',
	'audio.proxy.error.invalidAudioPart':
		'Audio proxy only accepts audio/* attachments; received MIME: {0}.',
	'audio.proxy.error.audioTooLarge':
		'Audio attachment is too large ({0} MB) and was rejected before proxy upload.',
	'audio.proxy.error.unknown': 'unknown',
	'notice.toolDrift':
		'⚠️ Tool list is unstable; cache hit rate may drop. [Learn more](https://github.com/appledragon/cllms-for-copilot/blob/main/advanced-settings.md)',

	// Errors
	'error.http.400':
		'[{0}] Invalid request body format. Please modify your request body according to the hints in the error message.',
	'error.http.401':
		"[{0}] Authentication failed. Please check your API key and verify the baseUrl matches your key's region (e.g. Moonshot China: api.moonshot.cn, International: api.moonshot.ai; MiniMax China: api.minimaxi.com, International: api.minimax.io). If you don't have one, please create an API key first.",
	'error.http.401.withCreateApiKeyLink':
		"[{0}] Authentication failed. Please check your API key and verify the baseUrl matches your key's region (e.g. Moonshot China: api.moonshot.cn, International: api.moonshot.ai; MiniMax China: api.minimaxi.com, International: api.minimax.io). If you don't have one, please [create an API key]({1}) first.",
	'error.http.402':
		"[{0}] You have run out of balance. Please check your account's balance, and go to the Top up page to add funds.",
	'error.http.422':
		'[{0}] Your request contains invalid parameters. Please modify your request parameters according to the hints in the error message.',
	'error.http.429':
		'[{0}] You are sending requests too quickly. Please pace your requests reasonably.',
	'error.http.quota':
		'[{0}] Your account balance or current quota is insufficient, so the provider rejected the request. Check Billing/Usage and top up or update your plan.',
	'error.http.quota.withProviderMessage':
		'[{0}] Your account balance or current quota is insufficient, so the provider rejected the request. Provider message: {1} Check Billing/Usage and top up or update your plan.',
	'error.http.500':
		'[{0}] Our server encounters an issue. Please retry your request after a brief wait.',
	'error.http.503':
		'[{0}] The server is overloaded due to high traffic. Please retry your request after a brief wait.',
	'error.http.generic': '[{0}] The service returned an error response.',
	'error.action.setApiKey': 'Set API Key',
	'error.action.createApiKey': 'Create API Key',
	'error.action.viewUsage': 'Usage',
	'error.action.checkQwenStatus': 'Qwen Status',
	'error.action.checkProviderStatus': 'Provider Status',
	'error.action.viewDetails': 'Error Details',
	'error.network.dns':
		'[{0}] DNS lookup failed. Check your network connection, firewall, or proxy settings, and your custom baseUrl.',
	'error.network.unreachable':
		'[{0}] The target is unreachable or refused the connection. Check your custom baseUrl, proxy service, network connection, or firewall settings.',
	'error.network.interrupted':
		'[{0}] The connection was interrupted. Check your network connection, firewall, or proxy settings, or try again later.',
	'error.network.timeout':
		'[{0}] Connection timed out. Try again later, or check your network connection, firewall, or proxy settings.',
	'error.network.tls':
		'[{0}] TLS/certificate verification failed. Check your proxy settings, certificate configuration, or custom baseUrl.',
	'error.network.aborted':
		'[{0}] The request was aborted. If you did not cancel it, check your network connection or proxy settings, or try again later.',
	'error.network.protocol':
		'[{0}] The HTTP connection or response parsing failed. Check your proxy settings, custom baseUrl, or service response.',
	'error.network.configuration':
		'[{0}] The request configuration is invalid. Check your custom baseUrl or extension settings.',
	'error.network.generic':
		'[{0}] Network request failed. Check your network connection, firewall, or proxy settings, and your custom baseUrl.',
	'error.unknown': 'Request failed: {0}',

	// Connection test
	'connection.pickTitle': 'Select a provider to test',
	'connection.noKey': 'No API key configured for {0}. Run "CLLMs: Set API Key" first.',
	'connection.testing': 'Testing connection to {0}…',
	'connection.success': '{0}: connection OK — {1} models available.',
	'connection.successNoList':
		'{0}: connection OK. The endpoint did not return a model list; if chat fails later, try one lightweight chat completion with this provider to verify the chat endpoint.',
	'connection.successStale':
		'{0}: connection OK ({1} models), but these configured model IDs were not found: {2}. Model names in parentheses use that API model ID; update modelIdOverrides if the endpoint uses different names.',
	'connection.failed': '{0}: connection failed. {1}',
	'connection.action.openSettings': 'Open Settings',
	'connection.action.openApiKeyPage': 'Open API Key Page',
	'connection.action.showLogs': 'Show Logs',

	// Diagnostics
	'debug.dumpPrivacyWarning':
		'Verbose request dumps may contain prompts, tool arguments, image descriptions, and other sensitive content. Use them for local debugging only. CLLMs removes dumps older than 7 days and redacts credential-like fields.',
	'diagnosticReport.copied':
		'Copied CLLMs diagnostic report (API keys, prompts, and full request bodies excluded).',

	// Session cost
	'sessionCost.statusBarTooltip': 'CLLMs session cost (approximate) — click for details',
	'sessionCost.empty': 'No CLLMs usage recorded this session yet.',
	'sessionCost.summaryTitle': 'CLLMs session cost (approximate): {0}',
	'sessionCost.lineItem':
		'{0}: {1} ({2} requests, {3} in / {4} out tokens, {5} cached in, {6}% hit, {7} saved, {8}/request)',
	'sessionCost.approximateNote':
		'Approximate and for this session only: estimated from provider-reported usage, with cached input billed at the cache-hit rate.',
	'sessionCost.unbilledNote':
		'{0} more request(s) across {1} model(s) are excluded for lack of pricing.',
	'sessionCost.cacheHealthNote':
		'Session average context-cache hit rate: {0}% (cache hits are billed at the lower input price; higher is cheaper).',
	'sessionCost.tierSplitNote': 'Of which utility/helper requests ≈ {0}, agent requests ≈ {1}.',
	'sessionCost.cacheSavingsNote': 'Estimated context-cache savings this session: {0}.',
	'sessionCost.hintsTitle': 'Optimization suggestions:',
	'sessionCost.hint.sortToolsForCache':
		'- Tool schema drift was detected with a low cache hit rate; try Sort Tools For Cache to stabilize tool order.',
	'sessionCost.hint.stabilizeToolList':
		'- The tool list is large or still has unexpanded tools with a low cache hit rate; try Stabilize Tool List, watching input-token growth.',
	'sessionCost.hint.latestToolLoop':
		'- This long session has accumulated many input tokens; try Reasoning Replay Scope = latest-tool-loop to reduce future input cost.',
	'sessionCost.hint.utilityCostControl':
		'- Utility/helper requests are a meaningful share of cost; configure a utility model or utility max output tokens.',
	'sessionCost.notAvailable': 'n/a',
	'sessionCost.action.openAdvancedSettings': 'Open Advanced Settings',
	'sessionCost.action.configureUtilityModel': 'Configure Utility Model',
	'sessionCost.action.openUsagePage': 'Open Usage Page',
	'sessionCost.reset': 'Reset',
	'sessionCost.resetDone': 'CLLMs session cost reset.',

	// Configure Utility Model command
	'utilityModel.title': 'Configure utility model (chat.utilityModel)',
	'utilityModel.placeholder': 'Pick a cheaper model for titles, commit messages, and other helpers',
	'utilityModel.openSettings': 'Open Settings instead…',
	'utilityModel.openSettingsAction': 'Open Settings',
	'utilityModel.configured':
		'Set chat.utilityModel and chat.utilitySmallModel to "{0}". VS Code will use it for helper requests.',
	'utilityModel.writeFailed':
		'Could not write the chat.utilityModel settings (your VS Code may not support them yet); configure them manually in Settings.',

	// Image Read Tool
	'tool.readImage.error.missingPath': 'Required parameter filePath is missing or empty.',
	'tool.readImage.error.notFound': 'Image file not found: {0}',
	'tool.readImage.error.readFailed': 'Failed to read image file: {0}',
	'tool.readImage.error.emptyFile': 'Image file is empty: {0}',
	'tool.readImage.error.unsupportedFormat': 'Unsupported image format: {0}',
	'tool.readImage.error.noVisionProxy':
		'Vision proxy is not configured or unavailable. Use "CLLMs: Configure Vision Proxy" to set one up.',
	'tool.readImage.error.emptyResponse': 'Vision proxy returned an empty response for {0}.',
	'tool.readImage.error.describeFailed': 'Failed to describe image {0}: {1}',
	'tool.readImage.cancelled': 'Image reading was cancelled.',

	// Extension
	'extension.activateFailed': 'CLLMs failed to activate. Run "CLLMs: Show Logs" for details.',
	'extension.deactivateFailed': 'Failed to prepare CLLMs provider for deactivate',
	'extension.welcomeFailed': 'Failed to show CLLMs welcome prompt',
	'extension.openRequestDumpsFolderFailed':
		'Failed to open request dumps folder. Run "CLLMs: Show Logs" for details.',
};

/**
 * Resolve a translation key for the current VS Code display language.
 * Supports positional placeholders {0}, {1}, ...
 */
export function t(key: string, ...args: (string | number)[]): string {
	const dict = isZh() ? zh : en;
	let text = dict[key];
	if (text === undefined) {
		// Fall back to English when a key is missing from the active locale.
		text = en[key];
	}
	if (text === undefined) {
		return key;
	}
	// Replace all occurrences of each positional placeholder.
	for (let i = 0; i < args.length; i++) {
		text = text.replaceAll(`{${i}}`, String(args[i]));
	}
	return text;
}
