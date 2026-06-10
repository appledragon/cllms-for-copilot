# TODO

本文档基于当前代码结构、测试覆盖和发布配置整理，目标是把后续工作拆成可执行、可验收的任务。

## 项目概览

`cllms-for-copilot` 是一个 TypeScript VS Code/Cursor 扩展，通过 `LanguageModelChatProvider` 把多家 OpenAI-compatible 模型接入 Copilot Chat 模型选择器。核心链路如下：

- 扩展入口与生命周期：`src/extension.ts`、`src/runtime/lifecycle.ts`
- 命令、URI action 和欢迎流程：`src/runtime/commands.ts`、`src/runtime/actions.ts`、`src/runtime/welcome.ts`
- 模型与服务商注册：`src/consts.ts`、`src/types.ts`、`src/provider/models.ts`
- 认证与配置：`src/auth.ts`、`src/config.ts`
- 请求准备、消息转换、工具调用、流式输出：`src/provider/request.ts`、`src/provider/convert.ts`、`src/provider/tools/`、`src/provider/stream.ts`
- HTTP/SSE 客户端与错误处理：`src/client/`
- 视觉代理与图片解析：`src/provider/vision/`
- 诊断、请求 dump、replay marker 和缓存追踪：`src/provider/debug/`、`src/provider/replay/`
- 成本估算与币种展示：`src/provider/pricing/`

当前测试主要覆盖纯函数和协议层逻辑，包括 registry、消息转换、retry、SSE、routing classifier、token 估算、session cost、replay marker、网络错误分类等。CI 已配置 `npm run lint`、`npm run format:check`、`npm run compile`、`npm run test` 和 VSIX 打包。

## P0: 发布前必须处理

### ~~1. 补齐 VS Code 扩展集成测试~~

~~状态：已完成。已通过 `test/runtime-integration.test.ts` 和扩展后的 `test/vscode-shim.cjs` 覆盖激活、命令、SecretStorage、配置迁移、模型 provider 注册和停用清理。~~

~~背景：现有测试集中在纯函数，缺少对扩展激活、命令注册、SecretStorage、配置迁移、模型 provider 注册的集成验证。`activate()` 中的 `initializeDiagnostics`、`registerCommands`、`registerActionUrls`、`registerProvider` 是用户启动路径，一旦 VS Code API 变化，纯单测不容易发现。~~

~~建议：~~

~~- 引入 VS Code extension test runner 或在现有 `node:test` shim 上补充更完整的 VS Code 行为模拟。~~
~~- 覆盖 `activate()` 成功路径、注册命令列表、`deactivate()` 清理 provider、`migrateLegacyDebugSetting()`。~~
~~- 增加 `cllms.setApiKey` / `clearApiKey` / `testConnection` / `showSessionCost` 的命令级测试。~~

~~验收标准：~~

~~- 新增集成测试能在 CI 中运行。~~
~~- 模拟至少一个 provider 有 key、一个 provider 无 key 的场景。~~
~~- `npm run lint && npm run format:check && npm run compile && npm test` 通过。~~

### 2. 增强 HTTP/SSE 流式客户端测试

背景：`src/client/core.ts` 负责真实网络请求、SSE 解析、idle timeout、取消和 retry。当前 retry 与 SSE parser 有单测，但 `LlmClient.streamChatCompletion()` 的端到端行为仍缺少覆盖。

建议：

- 用 mock `fetch` 覆盖成功流、HTTP 401/429/5xx、网络异常、idle timeout、取消请求。
- 验证“首个可见输出后不重试”的不变量，避免重复输出。
- 覆盖 tool call delta 聚合、usage chunk 上报、`[DONE]` 前后边界情况。

验收标准：

- `maxRetries`、`Retry-After`、输出后失败、取消请求都有稳定测试。
- 中途失败不会重复调用 `onContent` / `onThinking` / `onToolCall`。

### 3. 明确 verbose debug 的隐私防护与清理策略

背景：`debugMode=verbose` 会把完整请求、系统提示、工具 schema、图片描述和用户消息写入本地 dump。README 已提醒风险，但代码层面缺少自动过期、大小限制、敏感字段过滤策略说明。

建议：

- 在 `src/provider/debug/` 增加 dump 保留策略，例如按天数或总大小清理旧文件。
- 对已知敏感字段做最小化处理，至少确保 auth header、API key、vision proxy API key、custom header 中的 token 不落盘。
- 在 `CLLMs: Open Request Dumps Folder` 或启用 verbose 时增加一次性警告，明确 dump 可能包含私密内容。

验收标准：

- 新增单测覆盖 dump 路径、字段过滤和清理逻辑。
- README/中文 README 同步说明保留策略和用户如何删除 dump。

## P1: 高价值改进

### 4. 完善视觉代理配置与协议测试

背景：视觉代理支持 VS Code LM、OpenAI Chat Completions、OpenAI Responses、Anthropic Messages，并允许 custom headers / extra body。该区域既复杂又靠近用户输入和外部 HTTP。

建议：

- 为 `src/provider/vision/sources/endpoint/config.ts` 增加更多 schema/边界测试。
- 覆盖非法 URL、非法 header 名、非字符串 header 值、`extraBody` 覆盖受保护字段等场景。
- 为三个 endpoint protocol provider 增加请求体快照测试，避免 provider 格式漂移。
- 为 `resolveImageMessages()` 增加多轮图片、marker replay、当前图片失败、无视觉代理 fallback 的测试。

验收标准：

- 所有可配置字段都有成功和失败测试。
- 图片不会在 text-only 模型路径中意外透传给目标模型。

### 5. 建立“新增服务商/模型”的自动一致性检查

背景：新增 provider/model 需要同时修改 `src/consts.ts`、`src/i18n.ts`、`package.json`、`package.nls*.json`、README、CHANGELOG 和测试。已有 `docs/adding-a-model.md` 说明流程，但缺少自动检查。

建议：

- 增加一个 registry consistency test，检查每个 `MODELS` 条目都有中英文 detail/tooltip。
- 检查每个 provider 的 baseUrl、modelIdOverrides、SecretStorage key、error action link、README 表格是否同步。
- 检查 `docs/adding-a-model.md` 的 provider 列表与实际 `PROVIDERS` 一致，避免文档滞后。

验收标准：

- 新增或删除模型时，遗漏 i18n / package setting / docs 能被测试捕获。
- `docs/adding-a-model.md` 不再出现“内置五个服务商”等过期描述。

### ~~6. 改进连接测试反馈~~

~~状态：已完成。连接测试结果现在会为失败、stale override 和空模型列表提供更明确的摘要、可点击修复动作，并按 API model ID 分组展示缺失 override。~~

~~背景：`runConnectionTest()` 通过 `/models` 校验 key、endpoint 和 model override。当前反馈是信息/警告弹窗，无法展开查看具体缺失模型、endpoint、provider、下一步操作。~~

~~建议：~~

~~- 在失败和 stale override 场景提供"打开设置""打开 API key 页面""显示日志"操作。~~
~~- 把 stale override 按 provider 内置模型名和实际 API model id 分组展示。~~
~~- 当 `/models` 不返回列表时，提示用户可以通过一次轻量 chat completion 做可选验证。~~

~~验收标准：~~

~~- 用户能从错误消息直接跳转到修复入口。~~
~~- 单测覆盖 stale override 去重、空 model list 和错误摘要。~~

### 7. 成本统计增加可解释性

背景：session cost 使用 streamed usage 和 provider pricing 估算，并在币种切换时 reset。用户看到状态栏金额时，可能不清楚缓存命中、输入/输出 token、币种来源。

建议：

- `showSessionCost()` 详情中加入 cached input tokens、cache hit/miss 成本说明。
- 对没有 pricing 的模型记录“未纳入估算”的请求数，避免用户误以为总价完整。
- README 增加成本估算限制说明：仅近似、仅当前会话、依赖 provider 返回 usage。

验收标准：

- `SessionCostTracker` 能区分已计费和未计费请求。
- UI 文案中明确“approximate / 近似”。

## P2: 可持续维护

### 8. 提升 routing classifier 可维护性

背景：`src/provider/routing/classifier.ts` 通过 prompt 前缀、tool name 和 latest user text 判断请求类型，并基于类型关闭轻量后台任务的 thinking。当前实现可读，但未来 VS Code/Copilot prompt 变化会导致分类失效。

建议：

- 把 magic prefix 集中成带注释的数据表，包含来源和预期用途。
- 在 debug metadata 中记录 classifier 命中原因，便于诊断误判。
- 增加未知前缀样本测试，确认 fallback 行为不会误关 thinking。

验收标准：

- 新增 request kind 时只需改一处表结构。
- 诊断日志能说明请求被归类为某种 kind 的原因。

### 9. 梳理本地化和 Marketplace 文档一致性

背景：项目同时维护 `README.md`、`README.zh-cn.md`、walkthrough、`package.nls*.json`、`docs/adding-a-model*.md`。最近 changelog 已修复 Marketplace README 相对链接，说明发布文档转换是敏感路径。

建议：

- 给 `scripts/fix-marketplace-readme.js` 增加测试或 snapshot，覆盖中文链接、docs 链接、图片链接。
- 增加文档链接检查，至少验证本地相对链接存在。
- 维护一份发布检查清单：README、CHANGELOG、package.nls、截图、VSIX 打包。

验收标准：

- Marketplace README 生成结果可测试。
- CI 能发现断开的本地文档链接。

### 10. 建立手工验收矩阵

背景：多个服务商、地区 endpoint、thinking style、native vision 和 vision proxy 的组合较多，不适合全部用自动化真实 API 覆盖。

建议：

- 在 `docs/` 增加手工验收矩阵，记录 provider、模型、地区、key 类型、thinking、tool calling、vision、cost usage、错误链接。
- 把 README 的 Testing Status 与该矩阵关联。
- 为未验证的国际 endpoint 标注 owner、最近验证时间和验证步骤。

验收标准：

- 发布前能按矩阵完成最小手工回归。
- 未验证能力有明确状态，而不是散落在 README 表格中。

## 安全与隐私复核卡

每次修改请求链路、视觉代理、debug dump、认证或外部 HTTP 时，至少确认：

- 输入边界：settings、custom headers、extra body、baseUrl、model overrides 都有类型和范围校验。
- 敏感数据：API key、Authorization header、用户 prompt、图片描述不会进入普通日志；verbose dump 的风险有明确提示和清理路径。
- 外部请求：URL scheme、header name/value、provider endpoint、retry/timeout/cancel 行为可控。
- 授权与本地存储：优先使用 VS Code SecretStorage，settings fallback 的风险在文档中说明。
- 测试：新增或修改的安全相关逻辑有单元测试或手工验证记录。

## 统一验证命令

```bash
npm run lint
npm run format:check
npm run compile
npm test
npm run package
```
