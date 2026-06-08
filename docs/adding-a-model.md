<h1>Adding a new model</h1>

<p align="center">English | <a href="./adding-a-model.zh-cn.md">简体中文</a></p>

This guide explains how to add a new model to CLLMs for Copilot Chat. There are
two cases:

- **A.** Add a model to an **existing provider** (Qwen, z.ai/GLM, MiniMax, Xiaomi MiMo, or Moonshot Kimi).
- **B.** Add a model under a **brand-new provider** (a different vendor).

Most of the time you want case **A**, which is just two required edits.

---

## A. Add a model to an existing provider

### TL;DR

| # | File | What to add | Required |
|---|---|---|---|
| 1 | `src/consts.ts` | A `ModelDefinition` entry in `MODELS` | ✅ |
| 2 | `src/i18n.ts` | `model.<id>.detail` + `model.<id>.tooltip` (EN **and** 中文) | ✅ |
| 3 | `package.json` + `package.nls*.json` | A `modelIdOverrides` entry for the new id | ⬜ recommended |
| 4 | `test/registry.test.ts` | Update affected assertions | ✅ if they change |
| 5 | `README*.md` / `CHANGELOG.md` | Document the model | ⬜ recommended |

### Step 1 — Register the model (`src/consts.ts`)

Add an entry to the `MODELS` array. Place Qwen models near the other Qwen
entries, GLM models in the z.ai block, etc.

```ts
{
  id: 'qwen3-coder-flash',          // API model id sent to the provider (overridable, see step 3)
  name: 'Qwen3 Coder Flash',        // display name in the Copilot model picker
  provider: 'qwen',                 // ProviderId — MUST exist in PROVIDERS ('qwen' | 'zai' | 'minimax' | 'xiaomi' | 'moonshot')
  family: 'qwen',                   // grouping metadata shown by Copilot
  version: 'qwen3',
  detail: 'Fast agentic coding',    // fallback short description (i18n in step 2 overrides this)
  maxInputTokens: 1000000,
  maxOutputTokens: 65536,
  capabilities: {
    toolCalling: LLM_TOOLS_LIMIT,   // boolean, or a number cap (LLM_TOOLS_LIMIT = 128)
    imageInput: false,              // true only for a native vision model
    thinking: true,                 // true shows the Thinking Effort dropdown and sends thinking params
  },
  requiresThinkingParam: false,
  pricing: {                        // optional; per 1M tokens. Only drives the picker's cost hints
    USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
    CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
  },
  priceCategory: 'low',             // 'low' | 'medium' | 'high' | 'very_high'
},
```

Field notes:

- **`id`** is what gets sent to the API as the `model`. It can be remapped per
  install via `modelIdOverrides` (step 3), so keep it the official model name.
- **`provider`** wires the model to its base URL, API key, error links, and
  thinking serialization. It must be a key of `PROVIDERS`.
- **`capabilities.thinking`** — when `true`, the per-model **Thinking Effort**
  dropdown (`none` / `high` / `max`) appears, and the request includes the
  provider's thinking parameters automatically (see `src/provider/thinking.ts`).
  You do **not** need to write any serialization code — the provider's
  `thinkingStyle` (`qwen` / `glm` / `minimax`) decides the format.
- **`capabilities.imageInput`** — set `true` only if the model accepts images
  natively. Otherwise images are handled by the vision proxy fallback.
- **`pricing`** is optional and approximate; it only affects cost hints.

### Step 2 — Add localized descriptions (`src/i18n.ts`)

The picker shows a localized `detail` and `tooltip`. Add both keys in **both**
the `zh` and `en` dictionaries, using the model `id` in the key:

```ts
// in the zh dictionary
'model.qwen3-coder-flash.detail': '快速 Agent 编码',
'model.qwen3-coder-flash.tooltip': '更快的 Qwen3 Coder Flash 模型，适合快速 Agent 编码与工具调用。',

// in the en dictionary
'model.qwen3-coder-flash.detail': 'Fast agentic coding',
'model.qwen3-coder-flash.tooltip':
  'Faster Qwen3 Coder Flash model for quick agentic coding and tool calls.',
```

If you skip this, the model still works but falls back to the `detail` string
from step 1 and shows no tooltip.

### Step 3 — Expose a model-ID override (recommended, `package.json`)

This lets users point the model at a compatible third-party / self-hosted
endpoint. Add an entry to the matching provider's `modelIdOverrides` setting
(`cllms.modelIdOverrides` for Qwen, `cllms.zai.modelIdOverrides`,
`cllms.minimax.modelIdOverrides`, `cllms.xiaomi.modelIdOverrides`,
`cllms.moonshot.modelIdOverrides`):

```jsonc
// package.json → contributes.configuration.properties["cllms.modelIdOverrides"]
"default": {
  "qwen3-coder-plus": "qwen3-coder-plus",
  "qwen3-coder-flash": "qwen3-coder-flash"   // <-- add
},
"properties": {
  "qwen3-coder-flash": {
    "type": "string",
    "description": "%cllms.config.modelIdOverrides.qwen3-coder-flash.description%"
  }
}
```

Then add the referenced description string to **both** localization files:

```jsonc
// package.nls.json
"cllms.config.modelIdOverrides.qwen3-coder-flash.description": "API model ID for Qwen3 Coder Flash",
// package.nls.zh-cn.json
"cllms.config.modelIdOverrides.qwen3-coder-flash.description": "Qwen3 Coder Flash 的 API 模型 ID。",
```

> The model works **without** this step (the `id` is used as-is by default via
> `getApiModelId`). It is only for discoverable, validated overrides.

### Step 4 — Update tests (`test/registry.test.ts`)

A few assertions enumerate the exact model set and must be updated when it
changes, e.g.:

- `marks only the known native-vision models` — update if `imageInput: true`.
- The per-provider list checks (e.g. the MiniMax model list).

The generic invariants (unique ids, provider exists, pricing ordering) cover
your new model automatically.

### Step 5 — Verify

```bash
npm run compile   # type-check
npm run lint      # oxlint
npm test          # node:test unit tests
```

Optionally update `README.md`, `README.zh-cn.md`, and `CHANGELOG.md`.

---

## B. Add a model under a brand-new provider

If the model belongs to a vendor not yet supported, first register the
**provider**, then add the model with steps A1–A5.

1. **`src/types.ts`**
   - Add the id to `ProviderId` (e.g. `'qwen' | 'zai' | 'minimax' | 'xiaomi' | 'moonshot' | 'newco'`).
   - If the vendor needs a different thinking format, add a value to
     `ThinkingStyle` and extend `LlmRequest` if a new field is required. If the
     vendor reuses an existing wire format, reuse that `thinkingStyle` instead
     (e.g. Xiaomi MiMo and Moonshot Kimi both reuse `glm`'s `thinking: { type }`).
2. **`src/consts.ts`**
   - Add the provider's links to `EXTERNAL_URLS`.
   - Add a `ProviderDefinition` entry to `PROVIDERS` (`defaultBaseUrl`,
     `baseUrlSetting`, `apiKeySecret`, `apiKeySetting`, `modelIdOverridesSetting`,
     `officialHost`, `thinkingStyle`, `externalUrls`).
3. **`src/provider/thinking.ts`** — handle the new `thinkingStyle` in
   `buildThinkingFields` (only if it isn't `qwen` / `glm` / `minimax`).
4. **`src/client/consts.ts`** — add `OFFICIAL_<NAME>_API_HOST` and the
   `API_PROVIDER_HTTP_ERROR_LINKS` entries (401 / 402 / 5xx).
5. **`src/client/error/index.ts`** — recognize the new host in
   `identifyApiProvider`.
6. **`package.json`** — add `cllms.<id>.baseUrl` and
   `cllms.<id>.modelIdOverrides` settings, plus their `package.nls*.json`
   descriptions.
7. Add the models (steps **A1–A5**) with `provider: '<id>'`.

The registry test `ships the five built-in providers` (and the
`Object.keys(PROVIDERS)` assertions) will need updating to include the new
provider.

> Worked example: the **Xiaomi MiMo** and **Moonshot Kimi** providers were
> added with exactly these steps — both reuse the `glm` thinking style
> (`thinking: { type }`) and add their own `OFFICIAL_<NAME>_API_HOST` /
> `cllms.<id>.*` settings.

---

## How it fits together

```
MODELS (consts.ts)
  └─ provider ──▶ PROVIDERS[provider]  (base URL, key, error links, thinkingStyle)
  └─ id        ──▶ getApiModelId()      (modelIdOverrides → API model name)
  └─ capabilities.thinking ──▶ buildThinkingFields(thinkingStyle, effort)
  └─ model.<id>.detail/tooltip (i18n)  ──▶ Copilot model picker
```
