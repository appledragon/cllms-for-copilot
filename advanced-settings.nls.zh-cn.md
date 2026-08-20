## 成本与缓存设置

CLLMs 提供了一些可选设置，用于降低费用或提高服务商上下文缓存命中率。多数都是高级控制项；除非你正在排查缓存 miss、延迟或账单问题，否则建议保持默认值。

## 稳定工具列表（实验性）

先打开 VS Code 的 Tools 配置，查看当前聊天启用了多少个工具。

[配置 Tools](command:workbench.action.chat.configureTools)

- 64 个或更少已启用工具：通常无需开启，除非工具列表仍在跨轮次变化。
- 超过 128 个已启用工具：不建议开启。因为 服务商单次 `tools` 请求最多支持 128 个 functions，超过这个数量后，CLLMs 无法保证传给模型的 `tools` 列表稳定。请先 disable 掉一些不常用的工具，再考虑开启。
- 介于 64 到 128 个已启用工具：仅在工具列表跨轮次变化、上下文缓存命中率不理想时，再考虑开启。

这个设置可能通过让 `tools` 参数在多轮对话中更完整、更稳定来提高缓存命中率。代价是每次请求可能包含更多函数工具定义，因此 input tokens 可能增加。

[打开插件设置](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.stabilizeToolList%22%5D)

## 按名称排序工具（实验性）

如果启用的工具集合没有变化，但 VS Code/Copilot 在不同轮次改变了顺序，部分服务商会因为请求前缀字节变化而无法命中上下文缓存。`cllms.experimental.sortToolsForCache` 会按名称排序请求中的 `tools` 数组，让顺序保持稳定。

[打开设置](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.sortToolsForCache%22%5D)

## Reasoning 回放范围（实验性）

思考模型会在后续轮次回放 replay marker 中携带的 `reasoning_content`。默认值 `all` 兼容性最好，并能让 Qwen 风格的工具调用历史保持字节稳定。`latest-tool-loop` 只回放当前工具调用循环的 reasoning，可在长会话中节省 input tokens，但较早轮次的前缀稳定性会降低。

[打开设置](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.replayReasoningScope%22%5D)

## 辅助请求成本控制

`cllms.utility.maxOutputTokens` 与 `cllms.utility.modelIdByProvider` 只用于对话标题、提交信息、分支名、内联进度、重命名建议、提示分类、设置解析、todo 跟踪等轻量辅助请求。真正的 agent 轮次和未识别请求不会被这些设置封顶或降级。条件允许时，优先使用 VS Code 原生的 utility model 路由。

- `cllms.utility.maxOutputTokens` 会与 `cllms.maxTokens` 取较小的非零上限。
- `cllms.utility.modelIdByProvider` 按 provider id 配置，例如 `{ "qwen": "qwen3-coder-flash" }`。
- 如果覆盖模型匹配到带定价的已知模型，会话费用会按该模型估算；未知覆盖 ID 会记录为未计费用量，而不是沿用所选模型估算。
- Utility 路由由请求分类器决定；不像一次性辅助工作的提示会继续使用所选的 chat/agent 模型。

[配置辅助请求模型](command:cllms.configureUtilityModel)

[打开辅助请求设置](command:workbench.action.openSettings?%5B%22%40id%3Acllms.utility.modelIdByProvider%22%5D)

## 视觉代理延迟

对于纯文本模型，如果同一图片、提示词和描述器再次出现，图片描述会在当前会话中复用缓存。API 端点视觉代理还会使用 `cllms.maxRetries` 重试临时性 429 / 5xx / 网络失败，并由 `cllms.visionProxy.timeoutMs` 控制每次尝试的超时。

[打开视觉超时设置](command:workbench.action.openSettings?%5B%22%40id%3Acllms.visionProxy.timeoutMs%22%5D)
