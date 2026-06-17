<h1 align="center">CLLMs for Copilot Chat</h1>

## 致谢

CLLMs 起初是对 [**Vizards/deepseek-v4-for-copilot**](https://github.com/Vizards/deepseek-v4-for-copilot)（作者 [**Vizards**](https://github.com/Vizards)）面向 Qwen 的改编，原项目首创了通过原生 `LanguageModelChatProvider` API 将自带密钥（BYOK）的模型接入 Copilot Chat 选择器的方案；如今它已发展为支持 Qwen、z.ai（GLM）、MiniMax、小米 MiMo、Moonshot Kimi 与腾讯混元的多 Provider 扩展。在此向原作者致以诚挚感谢——本项目的 provider 流水线、视觉代理、思考模式处理与诊断能力，都深受 Vizards 打造并开源的那份基础工作的启发与帮助。

## 快速开始

### 前置条件

- VS Code 1.116 及以上版本。本扩展依赖非公开的 Copilot Chat API，较新的 VS Code 版本可能存在兼容性问题——如遇到请[提交 Issue](https://github.com/appledragon/cllms-for-copilot/issues)。
- GitHub Copilot 订阅（Free / Pro / Enterprise——免费版即可使用）
- 至少一个 Provider 的 API Key：
  - **Qwen**：DashScope（阿里云百炼）Key，可在[百炼控制台](https://modelstudio.console.alibabacloud.com/?tab=model#/api-key)获取；使用自定义 `cllms.baseUrl` 时也可使用兼容的 provider token。
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

## 模型

内置六个 Provider，每个模型自带独立的 API Key 与端点，因此你可以在 Copilot 模型选择器里同时使用 Qwen、z.ai（GLM）、MiniMax、小米 MiMo、Moonshot Kimi、腾讯混元或任意组合。

**Qwen（DashScope）**

| 模型 | 适用场景 |
|---|---|
| **Qwen3 Coder Plus** | 智能编码、工具调用、大型重构 |
| **Qwen Plus** | 日常均衡使用，支持混合思考 |
| **Qwen3 Max** | 面向复杂任务的旗舰模型 |
| **Qwen3-VL Plus** | 原生视觉（图片输入） |
| **Qwen3.7 Max** | 最新旗舰，对标 GPT-5.5 / Claude Opus 4.7 |
| **Qwen3.7 Plus** | 均衡旗舰，推荐默认选择 |
| **Qwen3.6 Flash** | 轻量快速，接近旗舰质量，1M 上下文 |

**z.ai（智谱 GLM）**

| 模型 | 适用场景 |
|---|---|
| **GLM-5.2** | 最新旗舰，1M 上下文，开源 SOTA 编码，支撑项目级工程上下文 |
| **GLM-5.1** | 旗舰长程编码与 Agent，200K 上下文，支持 8 小时自主编码 |
| **GLM-4.6** | 旗舰编码与 Agent，200K 上下文 |
| **GLM-4.5-Air** | 轻量、更快、成本更低 |
| **GLM-4.5V** | 原生视觉（图片输入） |
| **GLM-5** | 高智能基座，编码对齐 Claude Opus 4.5，200K 上下文 |
| **GLM-5-Turbo** | Lobster 优化基座，长任务连续性更强，200K 上下文 |
| **GLM-4.7** | 升级通用模型，编码能力更强，200K 上下文 |
| **GLM-4.7-FlashX** | 轻量快速，高性价比 |
| **GLM-5V-Turbo** | 原生视觉（图片输入）并支持深度思考 |

**MiniMax**

| 模型 | 适用场景 |
|---|---|
| **MiniMax-M3** | 旗舰 Agent 与编码，原生视觉，最高 1M 上下文 |
| **MiniMax-M2.7** | 快速编码与 Agent，成本更低 |
| **MiniMax-M2.5** | 高性价比推理与编码 |

**小米 MiMo**

| 模型 | 适用场景 |
|---|---|
| **MiMo V2.5 Pro** | 旗舰混合推理与编码，最高 1M 上下文 |
| **MiMo V2.5（Omni）** | 原生视觉（图片输入）并支持思考 |
| **MiMo V2 Flash** | 快速、低成本的日常任务 |

**Moonshot（Kimi）**

| 模型 | 适用场景 |
|---|---|
| **Kimi K2.7** | 最新旗舰原生多模态、Agent 与编码，256K 上下文 |
| **Kimi K2.6** | 旗舰原生多模态、Agent 与编码，256K 上下文 |
| **Kimi K2.5** | 多模态默认模型，思考可开关 |

**腾讯混元**

| 模型 | 适用场景 |
|---|---|
| **Tencent HY 2.0 Think** | 旗舰深度思考与编码，128K 上下文 |
| **Hunyuan TurboS** | 快速均衡，日常使用 |
| **Hunyuan T1** | 深度思考，高性价比 |
| **Hunyuan A13B** | 轻量快速，成本最低 |
| **Tencent HY 2.0 Instruct** | 指令跟随，创作与知识准确，128K 上下文 |

模型 ID 即各服务商官方模型名，可通过 `cllms.modelIdOverrides` / `cllms.zai.modelIdOverrides` / `cllms.minimax.modelIdOverrides` / `cllms.xiaomi.modelIdOverrides` / `cllms.moonshot.modelIdOverrides` / `cllms.hunyuan.modelIdOverrides` 完全自定义，以对接第三方 / 自托管端点。

## 添加新模型

想要添加自己的模型？参见 [添加新模型](./docs/adding-a-model.zh-cn.md) 的逐步指南。

## 测试状态

| 服务商 | 状态 | 备注 |
|---|---|---|
| Qwen（DashScope 国内） | ✅ 已测试 | Qwen3 Coder Plus、Qwen Plus、Qwen3 Max、Qwen3-VL Plus — 全部验证通过。Qwen3.7 Max、Qwen3.7 Plus、Qwen3.6 Flash 已启用，待单独验证。 |
| Qwen（DashScope International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| z.ai（智谱 GLM） | ✅ 已测试 | GLM-5.2、GLM-5.1、GLM-4.6、GLM-4.5-Air、GLM-4.5V — 全部验证通过。GLM-5、GLM-5-Turbo、GLM-4.7、GLM-4.7-FlashX、GLM-5V-Turbo 已启用，待单独验证。 |
| MiniMax（国内） | ✅ 已测试 | MiniMax-M3、MiniMax-M2.7 — 全部验证通过。MiniMax-M2.5 已启用，待单独验证。 |
| MiniMax（International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| 小米 MiMo | ✅ 已测试 | MiMo V2.5 Pro、MiMo V2.5（Omni）、MiMo V2 Flash — 全部验证通过。 |
| Moonshot（Kimi 国内） | ✅ 已测试 | Kimi K2.7、Kimi K2.6、Kimi K2.5 — 全部验证通过。 |
| Moonshot（Kimi International） | ⚠️ 未测试 | API 兼容性应与国内端点一致。欢迎提供测试 token 或测试反馈！ |
| 腾讯混元 | ✅ 已测试 | 标准 OpenAI 兼容 API——全部验证通过。Tencent HY 2.0 Instruct 已启用，待单独验证。 |

> **💡 求助！** 国际端点与国内端点共享相同的 API 接口，理论上应该开箱即用——但尚未实际验证。如果你有国际站 API Key，欢迎试用并[反馈测试结果](https://github.com/appledragon/cllms-for-copilot/issues)。如果你愿意贡献测试 token，请通过 GitHub Issues 联系我们。每一次测试都能让这些服务商更加稳定可靠。

## 设置项

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `cllms.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen OpenAI 兼容端点。北京地域使用 `https://dashscope.aliyuncs.com/compatible-mode/v1`，美国地域使用 `https://dashscope-us.aliyuncs.com/compatible-mode/v1`，也可填写任意兼容的第三方 / 自托管端点 |
| `cllms.zai.baseUrl` | `https://api.z.ai/api/paas/v4` | z.ai（GLM）OpenAI 兼容端点。使用 GLM Coding Plan 订阅时改为 `https://api.z.ai/api/coding/paas/v4` |
| `cllms.minimax.baseUrl` | `https://api.minimax.io/v1` | MiniMax OpenAI 兼容端点。中国大陆使用 `https://api.minimaxi.com/v1` |
| `cllms.xiaomi.baseUrl` | `https://api.xiaomimimo.com/v1` | 小米 MiMo OpenAI 兼容端点（官方开放平台） |
| `cllms.moonshot.baseUrl` | `https://api.moonshot.ai/v1` | Moonshot（Kimi）OpenAI 兼容端点。中国大陆使用 `https://api.moonshot.cn/v1`（密钥按区域区分） |
| `cllms.hunyuan.baseUrl` | `https://api.hunyuan.cloud.tencent.com/v1` | 腾讯混元 OpenAI 兼容端点 |
| `cllms.maxTokens` | `0` | 最大输出 Token 数（`0` = 不限制）。可用于成本控制 |
| `cllms.maxRetries` | `2` | 在开始输出前，针对临时性失败（HTTP 429、5xx、网络抖动）的自动重试次数。遵循 `Retry-After` 并采用带抖动的指数退避；一旦开始输出即停止重试，因此不会产生重复响应。`0` 表示关闭 |
| `cllms.modelIdOverrides` | 预填官方 ID 映射 | 各 Qwen 模型对应的 API 模型 ID。仅在使用模型名不同的兼容第三方 API 时修改 |
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
| `cllms.utility.modelIdByProvider` | `{}` | 将 utility/辅助请求在同一服务商下路由到更便宜的 API 模型，按服务商 id 配置（如 `{ "qwen": "qwen-flash" }`）。默认空（不降级）。费用估算仍按所选模型计算，但服务商实际按更便宜的模型计费。条件允许时优先使用 VS Code 原生 `chat.utilityModel`（`CLLMs: 配置辅助请求模型`） |
| `cllms.experimental.stabilizeToolList` | `false` | 实验性设置。尝试预先激活 VS Code/Copilot 的虚拟工具，让 `tools` 参数在多轮对话中更完整、更稳定。当已启用工具跨轮次变化时，可能提高上下文缓存命中率。代价是 input tokens 可能增加；缓存命中的 input tokens 单价更低，但仍会计入用量。64 个或更少已启用工具时通常无需开启，除非工具列表仍在跨轮次变化；超过 128 个已启用工具时不建议开启 |
| `cllms.experimental.sortToolsForCache` | `false` | 实验性设置。将请求中的 `tools` 数组按名称字母序稳定排序，避免 VS Code/Copilot 跨轮次调整工具顺序导致服务商上下文缓存前缀失效。可与 `stabilizeToolList` 协同 |
| `cllms.experimental.replayReasoningScope` | `all` | 实验性设置。控制思考模型回放多少 `reasoning_content`。`all` 回放每个 assistant 轮次（兼容性最好、前缀字节稳定）；`latest-tool-loop` 仅回放当前 tool-call 循环并丢弃更早轮次，在长会话中节省 input tokens |

思考深度可通过 Copilot Chat 的模型选择器对每个支持思考的模型单独设置。

参见[高级设置](./advanced-settings.nls.zh-cn.md)，了解上方成本与缓存控制项的集中说明。

对于纯文本模型，视觉代理会在主请求前先把图片附件解析成文字。相同图片描述会在当前 VS Code 会话内按图片字节、提示词和描述器身份缓存，因此重试或重复附加同一张图片时不会再次调用描述模型。API 端点视觉代理还会对临时性 429 / 5xx / 网络失败复用 `cllms.maxRetries` 重试，并用 `cllms.visionProxy.timeoutMs` 控制每次尝试的超时。

### 辅助请求成本控制

CLLMs 可以让一次性的 Copilot 辅助请求比真正的 agent 轮次跑得更便宜。这里有**两条相互独立的路径**，决策者不同。

**谁来判定"是不是辅助请求"？** CLLMs 会根据系统提示签名和工具集合**自动分类**每个进入的请求 —— 这一步不可配置。属于 *utility 级* 的共 8 类：`chat-title`、`git-commit-message`、`git-branch-name`、`inline-progress-message`、`rename-suggestions`、`prompt-categorizer`、`settings-resolver`、`todo-tracker`。其余的一切 —— 真正的 agent 轮次（`main-agent`）、终端后续、通用的 `background`，以及任何**未识别**的请求 —— 都归为 agent 级，**永不**封顶或降级，确保真正的轮次不会被误伤。

**路径 A —— CLLMs 自降级（`cllms.utility.*`）。** 当请求到达某个 CLLMs 模型后，只有"该请求是 utility 级"**且**"你已显式开启"时才会降级：

- `cllms.utility.maxOutputTokens`：对 utility 请求封顶输出 token（与 `cllms.maxTokens` 取较小值）。
- `cllms.utility.modelIdByProvider`：在同一 provider/key 下把 API `model` 换成更便宜的模型（如 `{ "qwen": "qwen-flash" }`）。

两者**默认关闭** —— 不配置则什么都不变。模型选择器仍显示你所选的模型（属服务端静默替换），且当 `cllms.debugMode` 为 `metadata` 或 `verbose` 时每次降级/封顶都会记录日志。会话费用估算仍按所选模型计价，但服务商实际按更便宜的模型计费。

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
    "qwen-plus": "your-plus-model-id",
    "qwen3-max": "your-max-model-id",
    "qwen3-vl-plus": "your-vl-model-id"
  }
}

```
## 使用 z.ai（智谱 GLM）

z.ai 开箱即用——无需代理或改写模型 ID：

1. 运行 **`CLLMs: 设置 API Key`** 并选择 **z.ai（智谱 GLM）**。在 [z.ai API Key 页面](https://z.ai/manage-apikey/apikey-list) 获取密钥。
2. 打开 Copilot Chat 模型选择器——GLM 模型会和 Qwen 模型一起出现。

GLM 的思考模式以 z.ai 原生格式发送（`thinking: { type: "enabled" }`），支持工具调用，`GLM-4.5V` 与 `GLM-5V-Turbo` 作为原生视觉模型（图片直接发送）。如果你有 GLM Coding Plan 订阅，可将 `cllms.zai.baseUrl` 设为 `https://api.z.ai/api/coding/paas/v4`。

## 使用 MiniMax

MiniMax 同样开箱即用：

1. 运行 **`CLLMs: 设置 API Key`** 并选择 **MiniMax**。在 [MiniMax 平台](https://platform.minimax.io/user-center/basic-information/interface-key) 获取密钥。
2. 打开 Copilot Chat 模型选择器——**MiniMax-M3**、**MiniMax-M2.7** 与 **MiniMax-M2.5** 会和其他模型一起出现。

MiniMax 的思考模式以其原生格式发送（`thinking: { type: "adaptive" }`），并通过 `reasoning_split: true` 请求推理内容，使其通过 `reasoning_content` 干净地流式返回。支持工具调用；**MiniMax-M3** 为原生多模态模型（图片直接发送），而 **MiniMax-M2.7** 与 **MiniMax-M2.5** 为纯文本模型，图片附件会走视觉代理回退方案。默认端点为国际站 `https://api.minimax.io/v1`——中国大陆可将 `cllms.minimax.baseUrl` 设为 `https://api.minimaxi.com/v1`。

## 使用小米 MiMo

小米 MiMo 也无须额外配置：

1. 运行 **`CLLMs: 设置 API Key`** 并选择 **小米 MiMo**。在 [小米 MiMo 开放平台](https://platform.xiaomimimo.com) 控制台创建按量付费（`sk-...`）密钥。
2. 打开 Copilot Chat 模型选择器——**MiMo V2.5 Pro**、**MiMo V2.5（Omni）**、**MiMo V2 Flash** 会和其他模型一起出现。

MiMo 是混合推理模型家族：思考模式默认开启，并以与 GLM 相同的格式发送（`thinking: { type: "enabled" | "disabled" }`；MiMo 不支持思考预算），推理内容通过 `reasoning_content` 流式返回。支持工具调用；其中全模态模型 **MiMo V2.5（Omni）** 支持原生图片输入，而 Pro/Flash 模型会走视觉代理回退方案。默认端点为官方开放平台 `https://api.xiaomimimo.com/v1`。

> 注意：MiMo 的 **Token Plan** 订阅套餐（`tp-...` 密钥）使用不同的、套餐专属的 Base URL，且仅限编程工具使用——若你使用套餐，请将 `cllms.xiaomi.baseUrl` 指向订阅管理页面展示的 URL。按量付费（`sk-...`）密钥可直接使用默认端点。

## 使用 Moonshot（Kimi）

Moonshot Kimi 也开箱即用：

1. 运行 **`CLLMs: 设置 API Key`** 并选择 **Moonshot（Kimi）**。在 [Moonshot 控制台](https://platform.moonshot.ai/console/api-keys) 创建密钥。
2. 打开 Copilot Chat 模型选择器——**Kimi K2.7**、**Kimi K2.6** 与 **Kimi K2.5** 会和其他模型一起出现。

Kimi K2.7 / K2.6 / K2.5 是原生多模态混合推理模型（256K 上下文）：思考模式默认开启，以 GLM 风格的 `thinking: { type: "enabled" | "disabled" }` 发送，推理内容通过 `reasoning_content` 流式返回。支持工具调用，且所有模型都支持原生图片输入。默认端点为国际站 `https://api.moonshot.ai/v1`——中国大陆可将 `cllms.moonshot.baseUrl` 设为 `https://api.moonshot.cn/v1`。

> 注意：Moonshot 密钥**按区域区分**——国际站（`platform.moonshot.ai`）密钥仅能用于 `api.moonshot.ai`，中国大陆（`platform.moonshot.cn`）密钥仅能用于 `api.moonshot.cn`。旧的 `kimi-k2-*` 系列（含 `kimi-k2-thinking`）已于 2026-05-25 下线，请使用 K2.7 / K2.6 / K2.5。

## 使用腾讯混元

腾讯混元同样无需额外配置：

1. 运行 **`CLLMs: 设置 API Key`** 并选择 **Tencent Hunyuan（混元）**。在[腾讯云混元控制台](https://console.cloud.tencent.com/hunyuan)获取 API Key。
2. 打开 Copilot Chat 模型选择器——**Tencent HY 2.0 Think**、**Hunyuan TurboS**、**Hunyuan T1**、**Hunyuan A13B**、**Tencent HY 2.0 Instruct** 会和其他模型一起出现。

混元使用标准 OpenAI 兼容 Chat Completions API。HY 2.0 Think 和 T1 是深度思考模型，思考模式以 GLM 风格 `thinking: { type: "enabled" | "disabled" }` 发送；TurboS、A13B 与 HY 2.0 Instruct 是不带深度思考的指令模型。五个模型均支持工具调用；目前没有原生视觉模型，图片附件会走视觉代理回退方案。默认端点为 `https://api.hunyuan.cloud.tencent.com/v1`。


## 其他 OpenAI 兼容的 Provider

除了内置的六个 Provider，由于请求走的是标准 OpenAI 兼容 Chat Completions 接口，你也可以把任意一个 Provider 的 `baseUrl` 指向其他兼容服务，并用对应的 `modelIdOverrides` 映射模型 ID。例如让 Qwen 的槽位转去调用 GLM：

```json
{
  "cllms.baseUrl": "https://api.z.ai/api/paas/v4",
  "cllms.modelIdOverrides": {
    "qwen3-coder-plus": "glm-4.6"
  }
}
```

后续计划为更多国内 Provider 提供独立命名的原生支持。

## 许可证

[MIT](LICENSE) —— 上游项目的归属说明见 [NOTICE](NOTICE)。
