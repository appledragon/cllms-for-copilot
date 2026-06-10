<h1>如何新增一个模型</h1>

<p align="center"><a href="./adding-a-model.md">English</a> | 简体中文</p>

本文介绍如何为 CLLMs for Copilot Chat 新增一个模型。分两种情况：

- **A.** 给**已有 Provider**（Qwen、z.ai/GLM、MiniMax、小米 MiMo、Moonshot Kimi、腾讯混元）新增模型。
- **B.** 新增一个**全新 Provider**（不同厂商）下的模型。

大多数情况属于 **A**，只需两处必改。

---

## A. 给已有 Provider 新增模型

### 速览

| # | 文件 | 改动内容 | 必需 |
|---|---|---|---|
| 1 | `src/consts.ts` | 在 `MODELS` 中新增一条 `ModelDefinition` | ✅ |
| 2 | `src/i18n.ts` | `model.<id>.detail` + `model.<id>.tooltip`（中文**和**英文） | ✅ |
| 3 | `package.json` + `package.nls*.json` | 新增对应的 `modelIdOverrides` 条目 | ⬜ 推荐 |
| 4 | `test/registry.test.ts` | 更新受影响的断言 | ✅ 若有变化 |
| 5 | `README*.md` / `CHANGELOG.md` | 补充文档 | ⬜ 推荐 |

### 步骤 1 — 注册模型（`src/consts.ts`）

在 `MODELS` 数组中新增一条。Qwen 模型放在其他 Qwen 条目附近，GLM 模型放在
z.ai 区块里，依此类推。

```ts
{
  id: 'qwen3-coder-flash',          // 发送给服务商的 API 模型 id（可被覆盖，见步骤 3）
  name: 'Qwen3 Coder Flash',        // 在 Copilot 模型选择器中显示的名称
  provider: 'qwen',                 // ProviderId —— 必须存在于 PROVIDERS（'qwen' | 'qwen-intl' | 'zai' | 'minimax' | 'minimax-intl' | 'xiaomi' | 'moonshot' | 'moonshot-intl' | 'hunyuan'）
  family: 'qwen',                   // Copilot 用于分组的元数据
  version: 'qwen3',
  detail: 'Fast agentic coding',    // 兜底简介（步骤 2 的 i18n 会覆盖它）
  maxInputTokens: 1000000,
  maxOutputTokens: 65536,
  capabilities: {
    toolCalling: LLM_TOOLS_LIMIT,   // 布尔值，或数字上限（LLM_TOOLS_LIMIT = 128）
    imageInput: false,              // 仅当为原生视觉模型时设为 true
    thinking: true,                 // 为 true 时显示思考深度下拉，并自动发送思考参数
  },
  requiresThinkingParam: false,
  pricing: {                        // 可选；按每 1M tokens 计。仅用于选择器的成本提示
    USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
    CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
  },
  priceCategory: 'low',             // 'low' | 'medium' | 'high' | 'very_high'
},
```

字段说明：

- **`id`** 即作为 `model` 发送给 API 的值。它可以按安装环境通过
  `modelIdOverrides`（步骤 3）重映射，因此这里填官方模型名即可。
- **`provider`** 把模型关联到对应的 base URL、API Key、错误链接以及思考参数序列化方式。
  它必须是 `PROVIDERS` 的一个 key。
- **`capabilities.thinking`** —— 为 `true` 时会出现按模型的**思考深度**下拉
  （`none` / `high` / `max`），并自动在请求中加入该服务商的思考参数
  （见 `src/provider/thinking.ts`）。你**无需**编写任何序列化代码——由该 Provider 的
  `thinkingStyle`（`qwen` / `glm` / `minimax`）决定格式。
- **`capabilities.imageInput`** —— 仅当模型原生支持图片输入时设为 `true`，
  否则图片会走视觉代理回退方案。
- **`pricing`** 为可选且为近似值，只影响成本提示。

### 步骤 2 — 新增本地化描述（`src/i18n.ts`）

选择器会显示本地化的 `detail` 与 `tooltip`。需要在 `zh` **和** `en` 两个字典中
都加上这两个 key，key 中使用模型 `id`：

```ts
// zh 字典中
'model.qwen3-coder-flash.detail': '快速 Agent 编码',
'model.qwen3-coder-flash.tooltip': '更快的 Qwen3 Coder Flash 模型，适合快速 Agent 编码与工具调用。',

// en 字典中
'model.qwen3-coder-flash.detail': 'Fast agentic coding',
'model.qwen3-coder-flash.tooltip':
  'Faster Qwen3 Coder Flash model for quick agentic coding and tool calls.',
```

若省略此步，模型仍可使用，但只会回退到步骤 1 的 `detail` 字符串，且不显示 tooltip。

### 步骤 3 — 暴露模型 ID 覆盖项（推荐，`package.json`）

这让用户能把模型指向兼容的第三方 / 自托管端点。在对应 Provider 的
`modelIdOverrides` 设置里新增条目（Qwen 用 `cllms.modelIdOverrides`，Qwen 国际站用 `cllms.qwenIntl.modelIdOverrides`，
其余为 `cllms.zai.modelIdOverrides`、`cllms.minimax.modelIdOverrides`、`cllms.minimaxIntl.modelIdOverrides`、`cllms.xiaomi.modelIdOverrides`、`cllms.moonshot.modelIdOverrides`、`cllms.moonshotIntl.modelIdOverrides`、`cllms.hunyuan.modelIdOverrides`）：

```jsonc
// package.json → contributes.configuration.properties["cllms.modelIdOverrides"]
"default": {
  "qwen3-coder-plus": "qwen3-coder-plus",
  "qwen3-coder-flash": "qwen3-coder-flash"   // <-- 新增
},
"properties": {
  "qwen3-coder-flash": {
    "type": "string",
    "description": "%cllms.config.modelIdOverrides.qwen3-coder-flash.description%"
  }
}
```

然后把引用的描述字符串加到**两个**本地化文件中：

```jsonc
// package.nls.json
"cllms.config.modelIdOverrides.qwen3-coder-flash.description": "API model ID for Qwen3 Coder Flash",
// package.nls.zh-cn.json
"cllms.config.modelIdOverrides.qwen3-coder-flash.description": "Qwen3 Coder Flash 的 API 模型 ID。",
```

> 没有这一步模型也能用（默认通过 `getApiModelId` 直接使用 `id`）。它只是为了提供
> 可发现、带校验的覆盖项。

### 步骤 4 — 更新测试（`test/registry.test.ts`）

有几条断言枚举了精确的模型集合，集合变化时需要同步更新，例如：

- `marks only the known native-vision models` —— 当 `imageInput: true` 时需更新。
- 按 Provider 的列表检查（如 MiniMax 模型列表）。

通用不变量（id 唯一、provider 存在、定价排序）会自动覆盖你的新模型。

### 步骤 5 — 校验

```bash
npm run compile   # 类型检查
npm run lint      # oxlint
npm test          # node:test 单元测试
```

可顺带更新 `README.md`、`README.zh-cn.md` 和 `CHANGELOG.md`。

---

## B. 新增一个全新 Provider 下的模型

如果模型属于尚未支持的厂商，先注册 **Provider**，再按 A1–A5 新增模型。

1. **`src/types.ts`**
   - 把 id 加到 `ProviderId`（例：`'qwen' | 'qwen-intl' | 'zai' | 'minimax' | 'minimax-intl' | 'xiaomi' | 'moonshot' | 'moonshot-intl' | 'hunyuan' | 'newco'`）。
   - 若该厂商的思考格式不同，给 `ThinkingStyle` 增加一个取值；若需要新字段，
     再扩展 `LlmRequest`。若该厂商复用了已有的传输格式，则直接复用对应的
     `thinkingStyle`（如小米 MiMo 与 Moonshot Kimi 都复用 `glm` 的 `thinking: { type }`）。
2. **`src/consts.ts`**
   - 在 `EXTERNAL_URLS` 中加入该 Provider 的链接。
   - 在 `PROVIDERS` 中新增一条 `ProviderDefinition`（`defaultBaseUrl`、
     `baseUrlSetting`、`apiKeySecret`、`apiKeySetting`、`modelIdOverridesSetting`、
     `officialHost`、`thinkingStyle`、`externalUrls`）。
3. **`src/provider/thinking.ts`** —— 在 `buildThinkingFields` 中处理新的
   `thinkingStyle`（仅当它不是 `qwen` / `glm` / `minimax` 时）。
4. **`src/client/consts.ts`** —— 新增 `OFFICIAL_<NAME>_API_HOST` 以及
   `API_PROVIDER_HTTP_ERROR_LINKS` 条目（401 / 402 / 5xx）。
5. **`src/client/error/index.ts`** —— 在 `identifyApiProvider` 中识别新的 host。
6. **`package.json`** —— 新增 `cllms.<id>.baseUrl` 与
   `cllms.<id>.modelIdOverrides` 设置，以及对应的 `package.nls*.json` 描述。
7. 以 `provider: '<id>'` 新增模型（步骤 **A1–A5**）。

测试 `ships the built-in providers`（以及 `Object.keys(PROVIDERS)` 相关断言）
需要更新以包含新的 Provider。

> 实例参考：**小米 MiMo** 与 **Moonshot Kimi** Provider 正是按以上步骤新增的——
> 两者都复用了 `glm` 的思考风格（`thinking: { type }`），并各自新增了
> `OFFICIAL_<NAME>_API_HOST` 与 `cllms.<id>.*` 设置。

---

## 整体关系

```
MODELS (consts.ts)
  └─ provider ──▶ PROVIDERS[provider]  (base URL、key、错误链接、thinkingStyle)
  └─ id        ──▶ getApiModelId()      (modelIdOverrides → API 模型名)
  └─ capabilities.thinking ──▶ buildThinkingFields(thinkingStyle, effort)
  └─ model.<id>.detail/tooltip (i18n)  ──▶ Copilot 模型选择器
```
