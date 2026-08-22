<h1 align="center">CLLMs for Copilot Chat</h1>

## 快速开始

### 前置条件

- VS Code 1.116 及以上版本。本扩展基于 VS Code 的 Language Model Chat Provider 集成实现；如果你在特定 VS Code/Copilot 版本组合下遇到兼容性问题，请[提交 Issue](https://github.com/appledragon/cllms-for-copilot/issues)。
- GitHub Copilot 订阅（Free / Pro / Enterprise——免费版即可使用）
- 至少一个 Provider 的 API Key：
  - **Qwen**：DashScope（阿里云百炼）Key，可在[百炼控制台](https://modelstudio.console.alibabacloud.com/?tab=model#/api-key)获取；使用自定义 `cllms.baseUrl` 时也可使用兼容的 provider token。
  - **DeepSeek**：在 [DeepSeek 平台](https://platform.deepseek.com/api_keys) 获取 API Key。
  - **z.ai（GLM）**：在 [z.ai API Key 页面](https://z.ai/manage-apikey/apikey-list) 获取。
  - **MiniMax**：在 [MiniMax 平台](https://platform.minimax.io/user-center/basic-information/interface-key) 获取。
  - **小米 MiMo**：在 [小米 MiMo 开放平台](https://platform.xiaomimimo.com) 创建按量付费（`sk-...`）密钥。
  - **Moonshot（Kimi）**：在 [Moonshot 控制台](https://platform.moonshot.ai/console/api-keys) 获取（国际站；中国大陆用 `platform.moonshot.cn`）。
  - **腾讯混元**：在[腾讯云混元控制台](https://console.cloud.tencent.com/hunyuan)获取 API Key。

### 安装方式

根据你所使用的编辑器选择对应的注册表安装：

1. **Microsoft VS Code** — 从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=cuilian.cllms-for-copilot) 安装。

### 使用步骤

1. 通过命令面板（`Cmd/Ctrl+Shift+P`）运行 **CLLMs: 设置 API Key**，并选择一个 Provider
2. 粘贴该 Provider 的 API Key 或兼容 token（Qwen DashScope Key 通常以 `sk-` 开头）
3. 打开 Copilot Chat，点击模型选择器，选择一个模型
4. 搞定——开始聊天

## 远程开发

CLLMs 支持 **Remote - SSH**、**Dev Containers** 和 **WSL**。扩展运行在本地客户端侧，因此：

- 只需在**本地**安装扩展即可（无需在远程机器上安装）。
- 本地 SecretStorage 中保存的 API Key 自动生效，无需重新配置。
- 设置项（`cllms.*`）从本地 `settings.json` 读取。

## 模型

内置七个 Provider，每个模型自带独立的 API Key 与端点，因此你可以在 Copilot 模型选择器里同时使用 Qwen、DeepSeek、z.ai（GLM）、MiniMax、小米 MiMo、Moonshot Kimi、腾讯混元或任意组合。

**Qwen（DashScope）**

| 模型 | 适用场景 |
|---|---|
| **Qwen3 Coder Plus** | 智能编码、工具调用、大型重构 |
| **Qwen3 Coder Flash** | 轻量编码，快速且经济 |
| **Qwen3.8 Max** | 最新旗舰，2.4T MoE，原生视觉，1M 上下文 |
| **Qwen3.7 Max** | 旗舰模型，对标 GPT-5.5 / Claude Opus 4.7 |
| **Qwen3.7 Plus** | 均衡旗舰，推荐默认选择 |

**DeepSeek**

| 模型 | 适用场景 |
|---|---|
| **DeepSeek-V4-Flash** | 旗舰极速，1M 上下文，支持思考与非思考模式 |
| **DeepSeek-V4-Flash-Vision-Exp** | 实验性多模态极速模型，原生图片输入，定价与 Flash 一致 |
| **DeepSeek-V4-Pro** | 旗舰专业，1M 上下文，默认深度思考 |

**z.ai（智谱 GLM）**

| 模型 | 适用场景 |
|---|---|
| **GLM-5.3** | 最新旗舰，1M 上下文，编程与智能体能力更强 |
| **GLM-5.2** | 最新旗舰，1M 上下文，开源 SOTA 编码，支撑项目级工程上下文 |
| **GLM-5.1** | 旗舰长程编码与 Agent，200K 上下文，支持 8 小时自主编码 |
| **GLM-5** | 高智能基座，编码对齐 Claude Opus 4.5，200K 上下文 |
| **GLM-5-Turbo** | Lobster 优化基座，长任务连续性更强，200K 上下文 |
| **GLM-5V-Turbo** | 原生视觉（图片输入）并支持深度思考 |

**MiniMax**

| 模型 | 适用场景 |
|---|---|
| **MiniMax-M3** | 旗舰 Agent 与编码，原生视觉，最高 1M 上下文 |

**小米 MiMo**

| 模型 | 适用场景 |
|---|---|
| **MiMo V2.5 Pro** | 旗舰混合推理与编码，最高 1M 上下文 |
| **MiMo V2.5（Omni）** | 原生视觉（图片输入）并支持思考 |

**Moonshot（Kimi）**

| 模型 | 适用场景 |
|---|---|
| **Kimi K3** | 旗舰 2.8T 参数，1M 上下文，始终思考，原生视觉 |
| **Kimi K2.7** | 最新旗舰原生多模态、Agent 与编码，256K 上下文 |
| **Kimi K2.7 Code HighSpeed** | Kimi K2.7 高速变体，约 180 tok/s |
| **Kimi K2.6** | 旗舰原生多模态、Agent 与编码，256K 上下文 |
| **Kimi K2.5** | 多模态默认模型，思考可开关 |

**腾讯混元**

| 模型 | 适用场景 |
|---|---|
| **Tencent HY 2.0 Think** | 旗舰深度思考与编码，128K 上下文 |
| **Tencent HY 2.0 Instruct** | 指令跟随，创作与知识准确，128K 上下文 |

模型 ID 即各服务商官方模型名，可通过 `cllms.modelIdOverrides` / `cllms.zai.modelIdOverrides` / `cllms.minimax.modelIdOverrides` / `cllms.xiaomi.modelIdOverrides` / `cllms.moonshot.modelIdOverrides` / `cllms.hunyuan.modelIdOverrides` / `cllms.deepseek.modelIdOverrides` 完全自定义，以对接第三方 / 自托管端点。

## 添加新模型

想要添加自己的模型？参见 [添加新模型](./docs/adding-a-model.zh-cn.md) 的逐步指南。

## 测试状态

| 服务商 | 状态 | 备注 |
|---|---|---|
| Qwen（DashScope 国内） | ✅ 已测试 | Qwen3 Coder Plus、Qwen3 Coder Flash — 全部验证通过。Qwen3.8 Max、Qwen3.7 Max、Qwen3.7 Plus 已启用，待单独验证。 |
| Qwen（DashScope International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| DeepSeek | ⚠️ 未测试 | API 兼容性遵循标准 OpenAI 兼容 Chat Completions API。欢迎提供测试 token 或测试反馈！ |
| z.ai（智谱 GLM） | ✅ 已测试 | GLM-5.2、GLM-5.1 — 全部验证通过。GLM-5.3、GLM-5、GLM-5-Turbo、GLM-5V-Turbo 已启用，待单独验证。 |
| MiniMax（国内） | ✅ 已测试 | MiniMax-M3 — 全部验证通过。 |
| MiniMax（International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| 小米 MiMo | ✅ 已测试 | MiMo V2.5 Pro、MiMo V2.5（Omni）— 全部验证通过。 |
| Moonshot（Kimi 国内） | ✅ 已测试 | Kimi K2.7、Kimi K2.7 Code HighSpeed、Kimi K2.6、Kimi K2.5 — 全部验证通过。 |
| Moonshot（Kimi International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| 腾讯混元 | ✅ 已测试 | 标准 OpenAI 兼容 API——全部验证通过。Tencent HY 2.0 Instruct 已启用，待单独验证。 |

> **💡 求助！** 国际端点与国内端点共享相同的 API 接口，理论上应该开箱即用——但尚未实际验证。如果你有国际站 API Key，欢迎试用并[反馈测试结果](https://github.com/appledragon/cllms-for-copilot/issues)。如果你愿意贡献测试 token，请通过 GitHub Issues 联系我们。每一次测试都能让这些服务商更加稳定可靠。

## 设置项

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `cllms.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen OpenAI 兼容端点。北京地域使用 `https://dashscope.aliyuncs.com/compatible-mode/v1`，美国地域使用 `https://dashscope-us.aliyuncs.com/compatible-mode/v1`，也可填写任意兼容的第三方 / 自托管端点 |
| `cllms.qwenIntl.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen 国际站 OpenAI 兼容端点 |
| `cllms.deepseek.baseUrl` | `https://api.deepseek.com/v1` | DeepSeek OpenAI 兼容端点 |
| `cllms.zai.baseUrl` | `https://api.z.ai/api/paas/v4` | z.ai（GLM）OpenAI 兼容端点。使用 GLM Coding Plan 订阅时改为 `https://api.z.ai/api/coding/paas/v4` |
| `cllms.minimax.baseUrl` | `https://api.minimax.io/v1` | MiniMax OpenAI 兼容端点。中国大陆使用 `https://api.minimaxi.com/v1` |
| `cllms.xiaomi.baseUrl` | `https://api.xiaomimimo.com/v1` | 小米 MiMo OpenAI 兼容端点（官方开放平台） |
| `cllms.moonshot.baseUrl` | `https://api.moonshot.ai/v1` | Moonshot（Kimi）OpenAI 兼容端点。中国大陆使用 `https://api.moonshot.cn/v1`（密钥按区域区分） |
| `cllms.hunyuan.baseUrl` | `https://api.hunyuan.cloud.tencent.com/v1` | 腾讯混元 OpenAI 兼容端点 |
| `cllms.maxTokens` | `0` | 最大输出 Token 数（`0` = 不限制）。可用于成本控制 |
| `cllms.maxRetries` | `2` | 在开始输出前，针对临时性失败（HTTP 429、5xx、网络抖动）的自动重试次数。遵循 `Retry-After` 并采用带抖动的指数退避；一旦开始输出即停止重试，因此不会产生重复响应。`0` 表示关闭 |
| `cllms.modelIdOverrides` | 预填官方 ID 映射 | 各 Qwen 模型对应的 API 模型 ID。仅在使用模型名不同的兼容第三方 API 时修改 |
| `cllms.qwenIntl.modelIdOverrides` | 预填官方 ID 映射 | 各 Qwen 国际站模型对应的 API 模型 ID |
| `cllms.deepseek.modelIdOverrides` | 预填官方 ID 映射 | 各 DeepSeek 模型对应的 API 模型 ID |
| `cllms.zai.modelIdOverrides` | 预填官方 ID 映射 | 各 z.ai（GLM）模型对应的 API 模型 ID |
| `cllms.minimax.modelIdOverrides` | 预填官方 ID 映射 | 各 MiniMax 模型对应的 API 模型 ID |
| `cllms.xiaomi.modelIdOverrides` | 预填官方 ID 映射 | 各小米 MiMo 模型对应的 API 模型 ID |
| `cllms.moonshot.modelIdOverrides` | 预填官方 ID 映射 | 各 Moonshot（Kimi）模型对应的 API 模型 ID |
| `cllms.hunyuan.modelIdOverrides` | 预填官方 ID 映射 | 各腾讯混元模型对应的 API 模型 ID |
| `cllms.debugMode` | `minimal` | 诊断模式：`minimal` 仅上报 token 用量，`metadata` 输出隐私安全日志，`verbose` 将完整请求 dump 和 pipeline snapshot 写入扩展 global storage。完整 dump 可能包含敏感提示词文本、工具定义、文件片段和图片描述。使用 `CLLMs: 打开请求 Dump 目录` 打开 dump 位置 |
| `cllms.visionModel` | *(自动)* | 当所选模型为纯文本模型时，用作视觉代理的 Copilot 模型 |
| `cllms.visionPrompt` | *(内置)* | 通过视觉代理描述图片附件时使用的提示词 |
| `cllms.visionProxy.timeoutMs` | `30000` | API 端点视觉代理的单次请求超时（毫秒），取值范围 `1000`–`120000`。调小可让缓慢的视觉端点尽快失败，而不是拖住整条对话 |
| `cllms.utility.maxOutputTokens` | `0` | 仅对一次性 utility/辅助请求（对话标题、提交/分支信息、内联进度、重命名建议、提示分类、设置解析、todo 跟踪）封顶输出 token。`0` 关闭。与 `cllms.maxTokens` 取较小值，不影响 agent/对话轮次 |
| `cllms.utility.modelIdByProvider` | `{}` | 将 utility/辅助请求在同一服务商下路由到更便宜的 API 模型，按服务商 id 配置（如 `{ "qwen": "qwen-flash" }`）。默认空（不降级）。如果 CLLMs 识别该覆盖模型，会话费用按覆盖模型的内置价格估算；否则该请求会显示为未计费。条件允许时优先使用 VS Code 原生 `chat.utilityModel`（`CLLMs: 配置辅助请求模型`） |
| `cllms.experimental.stabilizeToolList` | `false` | 实验性设置。尝试预先激活 VS Code/Copilot 的虚拟工具，让 `tools` 参数在多轮对话中更完整、更稳定。当已启用工具跨轮次变化时，可能提高上下文缓存命中率。代价是 input tokens 可能增加；缓存命中的 input tokens 单价更低，但仍会计入用量。64 个或更少已启用工具时通常无需开启，除非工具列表仍在跨轮次变化；超过 128 个已启用工具时不建议开启 |
| `cllms.experimental.sortToolsForCache` | `false` | 实验性设置。将请求中的 `tools` 数组按名称字母序稳定排序，避免 VS Code/Copilot 跨轮次调整工具顺序导致服务商上下文缓存前缀失效。可与 `stabilizeToolList` 协同 |
| `cllms.experimental.replayReasoningScope` | `all` | 实验性设置。控制思考模型回放多少 `reasoning_content`。`all` 回放每个 assistant 轮次（兼容性最好、前缀字节稳定）；`latest-tool-loop` 仅回放当前 tool-call 循环并丢弃更早轮次，在长会话中节省 input tokens |

思考深度可通过 Copilot Chat 的模型选择器对每个支持思考的模型单独设置。

参见[高级设置](./advanced-settings.nls.zh-cn.md)，了解上方成本与缓存控制项的集中说明。

对于纯文本模型，视觉代理会在主请求前先把图片附件解析成文字。**所有 CLLMs 模型均接受粘贴图片**——纯文本模型会自动将图片路由到视觉代理，而原生视觉模型（如 Qwen3.8 Max、GLM-5V-Turbo、MiniMax-M3）则直接接收图片。如果未配置显式的视觉模型，扩展会回退使用任意可用的 Copilot 模型（如 GPT-4o）作为视觉描述器。相同图片描述会在当前 VS Code 会话内按图片字节、提示词和描述器身份缓存，因此重试或重复附加同一张图片时不会再次调用描述模型。API 端点视觉代理还会对临时性 429 / 5xx / 网络失败复用 `cllms.maxRetries` 重试，并用 `cllms.visionProxy.timeoutMs` 控制每次尝试的超时。

对于音频附件，音频代理可在主请求前先将音频转写为文本，供不支持原生音频输入的模型使用。可通过 `CLLMs: 配置音频代理` 打开与视觉代理同风格的面板进行配置。API 端点音频代理会复用 `cllms.maxRetries` 重试策略，并用 `cllms.audioProxy.timeoutMs` 控制每次尝试超时。

最近的音频模块加固更新：
- Quick Setup 在保存前会先校验并规范化音频代理端点配置（与面板保存路径一致）。
- 自定义音频代理请求头不允许覆盖受保护请求头（`authorization`、`content-type`）。
- Responses-audio 的 MIME 处理显式支持 `audio/webm` 与 `audio/m4a`/`audio/mp4`；不支持的 MIME 会返回明确的类型化错误。

### 辅助请求成本控制

CLLMs 可以让一次性的 Copilot 辅助请求比真正的 agent 轮次跑得更便宜。这里有**两条相互独立的路径**，决策者不同。

**谁来判定"是不是辅助请求"？** CLLMs 会根据系统提示签名和工具集合**自动分类**每个进入的请求 —— 这一步不可配置。属于 *utility 级* 的共 8 类：`chat-title`、`git-commit-message`、`git-branch-name`、`inline-progress-message`、`rename-suggestions`、`prompt-categorizer`、`settings-resolver`、`todo-tracker`。其余的一切 —— 真正的 agent 轮次（`main-agent`）、终端后续、通用的 `background`，以及任何**未识别**的请求 —— 都归为 agent 级，**永不**封顶或降级，确保真正的轮次不会被误伤。

**路径 A —— CLLMs 自降级（`cllms.utility.*`）。** 当请求到达某个 CLLMs 模型后，只有"该请求是 utility 级"**且**"你已显式开启"时才会降级：

- `cllms.utility.maxOutputTokens`：对 utility 请求封顶输出 token（与 `cllms.maxTokens` 取较小值）。
- `cllms.utility.modelIdByProvider`：在同一 provider/key 下把 API `model` 换成更便宜的模型（如 `{ "qwen": "qwen-flash" }`）。

两者**默认关闭** —— 不配置则什么都不变。模型选择器仍显示你所选的模型（属服务端静默替换），且当 `cllms.debugMode` 为 `metadata` 或 `verbose` 时每次降级/封顶都会记录日志。如果 CLLMs 识别该覆盖模型，会话费用按覆盖模型的内置价格估算；否则该请求会显示为未计费。

**路径 B —— VS Code 原生（`chat.utilityModel` / `chat.utilitySmallModel`）。** 这里是 **VS Code / Copilot 自己**判定哪些是辅助请求并完成路由 —— 在请求到达任何服务商**之前**。CLLMs 不参与该决策，只是为宿主选中的那个模型提供服务。运行 `CLLMs: 配置辅助请求模型` 即可写入这两个原生设置。

当你的 VS Code 支持时优先用路径 B（路由显式、费用估算也准确）；需要按 provider 精细控制或作为兜底时再用路径 A。

## 命令

在命令面板（`Cmd/Ctrl+Shift+P`）中运行：

| 命令 | 说明 |
|---|---|
| `CLLMs: 设置 API Key` | 将服务商 API Key 存入系统密钥链 |
| `CLLMs: 获取 API Key` | 打开服务商的 API Key 页面 |
| `CLLMs: 清除 API Key` | 移除已保存的服务商 Key |
| `CLLMs: 配置视觉代理` | 选择用于为纯文本模型描述图片的模型 |
| `CLLMs: 配置音频代理` | 配置音频转写代理端点与模型 |
| `CLLMs: 测试服务商连接` | 通过 `/v1/models` 验证服务商 Key 与端点，并提示失效的 `modelIdOverrides` |
| `CLLMs: 查看会话费用` | 按模型查看本次会话的大致花费，包含平均上下文缓存命中率、utility/agent 费用拆分，并可清零 |
| `CLLMs: 配置辅助请求模型` | 通过 VS Code 原生 `chat.utilityModel` / `chat.utilitySmallModel` 将 Copilot 的轻量辅助请求路由到更便宜的模型 |
| `CLLMs: 打开设置` | 跳转到扩展设置 |
| `CLLMs: 显示日志` | 打开诊断输出通道 |
| `CLLMs: 打开请求 Dump 目录` | 打开 verbose 请求 dump 目录（调试模式） |

> **关于会话费用** —— `查看会话费用` 仅为**当前会话的近似估算**：它基于各服务商流式返回的 `usage` 计算（命中缓存的输入按缓存命中价计费），不能替代服务商的官方账单，并会在显示币种切换时清零。明细还会显示本会话平均上下文缓存命中率；当 utility 请求产生可计价费用时，也会拆分 utility 与 agent 费用。对未配置定价的模型，其请求会单独计为“因缺少定价未纳入估算”，而不会并入总额，因此显示的金额不会显得比实际更完整。

兼容 API 代理的 `settings.json` 配置示例：

```json
{
  "cllms.modelIdOverrides": {
    "qwen3-coder-plus": "your-coder-model-id",
    "qwen3-coder-flash": "your-coder-flash-model-id",
    "qwen3.8-max": "your-max-model-id"
  }
}

```

## 致谢

CLLMs 起初是对 [**Vizards/deepseek-v4-for-copilot**](https://github.com/Vizards/deepseek-v4-for-copilot)（作者 [**Vizards**](https://github.com/Vizards)）面向 Qwen 的改编，原项目首创了通过原生 `LanguageModelChatProvider` API 将自带密钥（BYOK）的模型接入 Copilot Chat 选择器的方案；如今它已发展为支持 Qwen、DeepSeek、z.ai（GLM）、MiniMax、小米 MiMo、Moonshot Kimi 与腾讯混元的多 Provider 扩展。在此向原作者致以诚挚感谢——本项目的 provider 流水线、视觉代理、思考模式处理与诊断能力，都深受 Vizards 打造并开源的那份基础工作的启发与帮助。

## 许可证

[MIT](LICENSE) —— 上游项目的归属说明见 [NOTICE](NOTICE)。
