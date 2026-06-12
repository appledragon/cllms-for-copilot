<h1 align="center">CLLMs for Copilot Chat</h1>

<p align="center"><a href="README.zh-cn.md">中文</a></p>

## Thanks

CLLMs began as a Qwen-focused adaptation of [**Vizards/deepseek-v4-for-copilot**](https://github.com/Vizards/deepseek-v4-for-copilot) by [**Vizards**](https://github.com/Vizards), which pioneered the approach of plugging a BYOK model into the Copilot Chat picker via the native `LanguageModelChatProvider` API, and has since grown into a multi-provider extension for Qwen, z.ai (GLM), MiniMax, Xiaomi MiMo, Moonshot Kimi, and Tencent Hunyuan. Huge thanks to the original author — the provider pipeline, vision proxy, thinking-mode handling, and diagnostics here are deeply inspired by the generous foundation that Vizards created and shared with the community.

## Getting Started

### Prerequisites

- VS Code 1.116 or later. This extension relies on non-public Copilot Chat APIs that may break on newer VS Code versions — [report an issue](https://github.com/appledragon/cllms-for-copilot/issues) if you hit one.
- GitHub Copilot subscription (Free / Pro / Enterprise — the free tier works)
- An API key for at least one provider:
  - **Qwen**: a DashScope (Alibaba Cloud Model Studio) key from [Model Studio](https://modelstudio.console.alibabacloud.com/?tab=model#/api-key), or any compatible token when using a custom `cllms.baseUrl`.
  - **z.ai (GLM)**: a key from the [z.ai API keys page](https://z.ai/manage-apikey/apikey-list).
  - **MiniMax**: a key from the [MiniMax platform](https://platform.minimax.io/user-center/basic-information/interface-key).
  - **Xiaomi MiMo**: a pay-as-you-go (`sk-...`) key from the [Xiaomi MiMo open platform](https://platform.xiaomimimo.com).
  - **Moonshot (Kimi)**: a key from the [Moonshot console](https://platform.moonshot.ai/console/api-keys) (international; `platform.moonshot.cn` for mainland China).
  - **Tencent Hunyuan (混元)**: a key from the [Tencent Cloud Hunyuan console](https://console.cloud.tencent.com/hunyuan).

### Installation

Install from the registry used by your editor:

1. **Microsoft VS Code** — install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=cuilian.cllms-for-copilot).

### Usage

1. Run **CLLMs: Set API Key** from the Command Palette (`Cmd/Ctrl+Shift+P`) and pick a provider
2. Paste that provider's API key or compatible token (Qwen DashScope keys usually start with `sk-`)
3. Open Copilot Chat, click the model picker, pick a model
4. That's it — chat away

## Models

Six providers ship out of the box. Each model has its own API key and endpoint, so you can use Qwen, z.ai (GLM), MiniMax, Xiaomi MiMo, Moonshot Kimi, Tencent Hunyuan, or any combination at the same time from the Copilot model picker.

**Qwen (DashScope)**

| Model | Best For |
|---|---|
| **Qwen3 Coder Plus** | Agentic coding, tool calls, large refactors |
| **Qwen Plus** | Balanced everyday use with hybrid thinking |
| **Qwen3 Max** | Flagship model for hard tasks |
| **Qwen3-VL Plus** | Native vision (image input) |

**z.ai (Zhipu GLM)**

| Model | Best For |
|---|---|
| **GLM-5.1** | Flagship long-horizon coding & agents, 200K context, up to 8h autonomous work |
| **GLM-4.6** | Flagship coding & agents, 200K context |
| **GLM-4.5-Air** | Lightweight, faster, lower cost |
| **GLM-4.5V** | Native vision (image input) |

**MiniMax**

| Model | Best For |
|---|---|
| **MiniMax-M3** | Flagship agentic & coding, native vision, up to 1M context |
| **MiniMax-M2.7** | Fast coding & agents, lower cost |

**Xiaomi MiMo**

| Model | Best For |
|---|---|
| **MiMo V2.5 Pro** | Flagship hybrid reasoning & coding, up to 1M context |
| **MiMo V2.5 (Omni)** | Native vision (image input) plus thinking |
| **MiMo V2 Flash** | Fast, low-cost everyday tasks |

**Moonshot (Kimi)**

| Model | Best For |
|---|---|
| **Kimi K2.7** | Latest flagship native-multimodal agents & coding, 256K context |
| **Kimi K2.6** | Flagship native-multimodal agents & coding, 256K context |
| **Kimi K2.5** | Multimodal default with toggleable thinking |

**Tencent Hunyuan (混元)**

| Model | Best For |
|---|---|
| **Tencent HY 2.0 Think** | Flagship deep-thinking & coding, 128K context |
| **Hunyuan TurboS** | Fast & balanced everyday |
| **Hunyuan T1** | Deep thinking, affordable |
| **Hunyuan A13B** | Lightweight, fastest & lowest cost |

Model IDs are the official provider names and are fully configurable via `cllms.modelIdOverrides` / `cllms.zai.modelIdOverrides` / `cllms.minimax.modelIdOverrides` / `cllms.xiaomi.modelIdOverrides` / `cllms.moonshot.modelIdOverrides` / `cllms.hunyuan.modelIdOverrides` for third-party / self-hosted endpoints.

## Adding a new model

Want to add your own model? See [Adding a new model](./docs/adding-a-model.md) for a step-by-step guide.

## Testing Status

| Provider | Status | Notes |
|---|---|---|
| Qwen (DashScope China) | ✅ Tested | Qwen3 Coder Plus, Qwen Plus, Qwen3 Max, Qwen3-VL Plus — all verified. |
| Qwen (DashScope International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| z.ai (Zhipu GLM) | ✅ Tested | GLM-5.1, GLM-4.6, GLM-4.5-Air, GLM-4.5V — all verified. |
| MiniMax (China) | ✅ Tested | MiniMax-M3, MiniMax-M2.7 — all verified. |
| MiniMax (International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| Xiaomi MiMo | ✅ Tested | MiMo V2.5 Pro, MiMo V2.5 (Omni), MiMo V2 Flash — all verified. |
| Moonshot (Kimi China) | ✅ Tested | Kimi K2.7, Kimi K2.6, Kimi K2.5 — all verified. |
| Moonshot (Kimi International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| Tencent Hunyuan (混元) | ✅ Tested | Standard OpenAI-compatible API — all verified. |

> **💡 Help wanted!** International endpoints share the same API surface as their domestic counterparts, so they *should* work out of the box — but they haven't been verified yet. If you have an international API key, please give it a try and [report your results](https://github.com/appledragon/cllms-for-copilot/issues). If you'd like to contribute test tokens, reach out via GitHub Issues. Every bit of testing helps make these providers more reliable for everyone.

## Settings

| Setting | Default | Description |
|---|---|---|
| `cllms.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen OpenAI-compatible endpoint. Use `https://dashscope.aliyuncs.com/compatible-mode/v1` (Beijing), `https://dashscope-us.aliyuncs.com/compatible-mode/v1` (US), or any compatible third-party / self-hosted endpoint |
| `cllms.zai.baseUrl` | `https://api.z.ai/api/paas/v4` | z.ai (GLM) OpenAI-compatible endpoint. Use `https://api.z.ai/api/coding/paas/v4` for a GLM Coding Plan subscription |
| `cllms.minimax.baseUrl` | `https://api.minimax.io/v1` | MiniMax OpenAI-compatible endpoint. Use `https://api.minimaxi.com/v1` for mainland China |
| `cllms.xiaomi.baseUrl` | `https://api.xiaomimimo.com/v1` | Xiaomi MiMo OpenAI-compatible endpoint (official open platform) |
| `cllms.moonshot.baseUrl` | `https://api.moonshot.ai/v1` | Moonshot (Kimi) OpenAI-compatible endpoint. Use `https://api.moonshot.cn/v1` for mainland China (keys are region-specific) |
| `cllms.hunyuan.baseUrl` | `https://api.hunyuan.cloud.tencent.com/v1` | Tencent Hunyuan OpenAI-compatible endpoint |
| `cllms.maxTokens` | `0` | Max output tokens (`0` = no limit). Useful for cost control |
| `cllms.maxRetries` | `2` | Automatic retries for transient failures (HTTP 429, 5xx, network blips) before any output streams. Honors `Retry-After` and uses exponential backoff with jitter; retries stop once output starts, so a response is never duplicated. `0` disables |
| `cllms.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Qwen model. Change only for compatible third-party APIs with different model names |
| `cllms.zai.modelIdOverrides` | prefilled official ID map | API model IDs to send for each z.ai (GLM) model |
| `cllms.minimax.modelIdOverrides` | prefilled official ID map | API model IDs to send for each MiniMax model |
| `cllms.xiaomi.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Xiaomi MiMo model |
| `cllms.moonshot.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Moonshot (Kimi) model |
| `cllms.hunyuan.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Tencent Hunyuan model |
| `cllms.debugMode` | `minimal` | Diagnostic mode: `minimal` for token usage only, `metadata` for privacy-preserving logs, or `verbose` for full request dumps and pipeline snapshots under extension global storage. Full dumps may include sensitive prompt text, tool schemas, file snippets, and image descriptions. Use `CLLMs: Open Request Dumps Folder` to open the dump location |
| `cllms.visionModel` | *(auto)* | Which Copilot model to proxy images through when the selected model is text-only |
| `cllms.visionPrompt` | *(built-in)* | Prompt used to describe image attachments via the vision proxy |
| `cllms.experimental.stabilizeToolList` | `false` | Experimental. Tries to pre-activate VS Code/Copilot virtual tools so the `tools` parameter is more complete and stable across turns. May improve context-cache hit rate when enabled tools change between turns. Can increase input tokens because more function definitions may be included; cache-hit input tokens are cheaper but still count toward usage. Usually leave it off with 64 or fewer enabled tools unless the tool list still changes across turns; do not enable it with more than 128 enabled tools |

Thinking Effort is configured from Copilot Chat's model picker for each thinking-capable model.

## Commands

Run these from the Command Palette (`Cmd/Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `CLLMs: Set API Key` | Store a provider's API key in the OS keychain |
| `CLLMs: Get API Key` | Open a provider's API key page |
| `CLLMs: Clear API Key` | Remove a provider's stored key |
| `CLLMs: Configure Vision Proxy` | Pick the model used to describe images for text-only models |
| `CLLMs: Test Provider Connection` | Verify a provider's key + endpoint via `/v1/models` and flag stale `modelIdOverrides` |
| `CLLMs: Show Session Cost` | Show approximate spend per model for this session, with a reset action |
| `CLLMs: Open Settings` | Jump to the extension settings |
| `CLLMs: Show Logs` | Open the diagnostic output channel |
| `CLLMs: Open Request Dumps Folder` | Open the verbose request-dump folder (debug mode) |

Example `settings.json` override for compatible API proxies:

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
## Using z.ai (Zhipu GLM)

z.ai works out of the box — no proxy or model-ID hacking required:

1. Run **`CLLMs: Set API Key`** and pick **z.ai (Zhipu GLM)**. Get a key from the [z.ai API keys page](https://z.ai/manage-apikey/apikey-list).
2. Open the Copilot Chat model picker — the GLM models appear alongside the Qwen ones.

GLM thinking is sent in z.ai's native format (`thinking: { type: "enabled" }`), tool calling works, and `GLM-4.5V` is used as a native vision model (images sent directly). If you have a GLM Coding Plan subscription, set `cllms.zai.baseUrl` to `https://api.z.ai/api/coding/paas/v4`.

## Using MiniMax

MiniMax works the same way:

1. Run **`CLLMs: Set API Key`** and pick **MiniMax**. Get a key from the [MiniMax platform](https://platform.minimax.io/user-center/basic-information/interface-key).
2. Open the Copilot Chat model picker — **MiniMax-M3** and **MiniMax-M2.7** appear alongside the others.

MiniMax thinking is sent in its native format (`thinking: { type: "adaptive" }`) and reasoning is requested via `reasoning_split: true` so it streams cleanly through `reasoning_content`. Tool calling works; **MiniMax-M3** is a native vision model (images sent directly), while **MiniMax-M2.7** is text-only and image attachments use the vision proxy fallback. The default endpoint is the international `https://api.minimax.io/v1` — set `cllms.minimax.baseUrl` to `https://api.minimaxi.com/v1` for mainland China.

## Using Xiaomi MiMo

Xiaomi MiMo is set up the same way:

1. Run **`CLLMs: Set API Key`** and pick **Xiaomi MiMo**. Create a pay-as-you-go (`sk-...`) key on the [Xiaomi MiMo open platform](https://platform.xiaomimimo.com) console.
2. Open the Copilot Chat model picker — **MiMo V2.5 Pro**, **MiMo V2.5 (Omni)**, and **MiMo V2 Flash** appear alongside the others.

MiMo is a hybrid-reasoning family: thinking is on by default and sent in the same format as GLM (`thinking: { type: "enabled" | "disabled" }`; MiMo doesn't support a thinking budget), with reasoning streamed through `reasoning_content`. Tool calling works, and the omni model **MiMo V2.5 (Omni)** accepts native image input while the Pro/Flash models fall back to the vision proxy. The default endpoint is the official open platform `https://api.xiaomimimo.com/v1`.

> Note: a MiMo **Token Plan** subscription (`tp-...` key) uses a different, subscription-specific base URL and is restricted to coding tools — point `cllms.xiaomi.baseUrl` at the URL shown on your subscription page if you use one. Pay-as-you-go (`sk-...`) keys work with the default endpoint.

## Using Moonshot (Kimi)

Moonshot Kimi is just as straightforward:

1. Run **`CLLMs: Set API Key`** and pick **Moonshot (Kimi)**. Create a key in the [Moonshot console](https://platform.moonshot.ai/console/api-keys).
2. Open the Copilot Chat model picker — **Kimi K2.7**, **Kimi K2.6**, and **Kimi K2.5** appear alongside the others.

Kimi K2.7 / K2.6 / K2.5 are native-multimodal hybrid-reasoning models (256K context): thinking is on by default and sent in the GLM-style `thinking: { type: "enabled" | "disabled" }`, with reasoning streamed through `reasoning_content`. Tool calling works, and all models accept native image input. The default endpoint is the international `https://api.moonshot.ai/v1` — set `cllms.moonshot.baseUrl` to `https://api.moonshot.cn/v1` for mainland China.

> Note: Moonshot keys are **region-specific** — an international (`platform.moonshot.ai`) key only works against `api.moonshot.ai`, and a mainland-China (`platform.moonshot.cn`) key only works against `api.moonshot.cn`. The legacy `kimi-k2-*` series (incl. `kimi-k2-thinking`) was retired on 2026-05-25; use K2.7 / K2.6 / K2.5.

## Using Tencent Hunyuan (混元)

Tencent Hunyuan works the same way:

1. Run **`CLLMs: Set API Key`** and pick **Tencent Hunyuan (混元)**. Get an API key from the [Tencent Cloud Hunyuan console](https://console.cloud.tencent.com/hunyuan).
2. Open the Copilot Chat model picker — **Tencent HY 2.0 Think**, **Hunyuan TurboS**, **Hunyuan T1**, and **Hunyuan A13B** appear alongside the others.

Hunyuan uses the standard OpenAI-compatible Chat Completions API. HY 2.0 Think and T1 are deep-thinking models with thinking sent in GLM-style `thinking: { type: "enabled" | "disabled" }`; TurboS and A13B are fast instruct models. Tool calling works across all four models; there are no native vision models yet, so image attachments use the vision proxy fallback. The default endpoint is `https://api.hunyuan.cloud.tencent.com/v1`.

## Other OpenAI-compatible providers

Beyond the six built-in providers, requests go through a standard OpenAI-compatible Chat Completions endpoint, so you can repoint any provider at a compatible service via its `baseUrl` and map IDs with `modelIdOverrides`. For example, to serve GLM through the Qwen slots instead:

```json
{
  "cllms.baseUrl": "https://api.z.ai/api/paas/v4",
  "cllms.modelIdOverrides": {
    "qwen3-coder-plus": "glm-4.6"
  }
}
```

Dedicated native entries for more Chinese providers are on the roadmap.

## License

[MIT](LICENSE) — see [NOTICE](NOTICE) for attribution to the upstream project.
