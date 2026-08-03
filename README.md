<h1 align="center">CLLMs for Copilot Chat</h1>

<p align="center"><a href="README.zh-cn.md">中文</a></p>

## Getting Started

### Prerequisites

- VS Code 1.116 or later. This extension uses VS Code's Language Model Chat Provider integration. If you encounter compatibility issues with a specific VS Code/Copilot build, please [report an issue](https://github.com/appledragon/cllms-for-copilot/issues).
- GitHub Copilot subscription (Free / Pro / Enterprise — the free tier works)
- An API key for at least one provider:
  - **Qwen**: a DashScope (Alibaba Cloud Model Studio) key from [Model Studio](https://modelstudio.console.alibabacloud.com/?tab=model#/api-key), or any compatible token when using a custom `cllms.baseUrl`.
  - **DeepSeek**: an API key from the [DeepSeek platform](https://platform.deepseek.com/api_keys).
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

## Remote Development

CLLMs works with **Remote - SSH**, **Dev Containers**, and **WSL**. The extension runs on the local client side, so:

- Install the extension **locally** (no need to install it on the remote machine).
- API keys stored in the local SecretStorage are used automatically — no reconfiguration needed.
- Settings (`cllms.*`) are read from your local `settings.json`.

## Models

Seven providers ship out of the box. Each model has its own API key and endpoint, so you can use Qwen, DeepSeek, z.ai (GLM), MiniMax, Xiaomi MiMo, Moonshot Kimi, Tencent Hunyuan, or any combination at the same time from the Copilot model picker.

**Qwen (DashScope)**

| Model | Best For |
|---|---|
| **Qwen3 Coder Plus** | Agentic coding, tool calls, large refactors |
| **Qwen3 Coder Flash** | Lightweight coding, fast & affordable |
| **Qwen Plus** | Balanced everyday use with hybrid thinking |
| **Qwen3 Max** | Flagship model for hard tasks |
| **Qwen3-VL Plus** | Native vision (image input) |
| **Qwen3.8 Max** | Latest flagship, 2.4T MoE with native vision, 1M context |
| **Qwen3.7 Max** | Flagship, aligned with GPT-5.5 / Claude Opus 4.7 |
| **Qwen3.7 Plus** | Balanced flagship, recommended default |
| **Qwen3.6 Flash** | Lightweight, near-flagship quality, 1M context |

**DeepSeek**

| Model | Best For |
|---|---|
| **DeepSeek-V4-Flash** | Fast flagship, 1M context, thinking & non-thinking modes |
| **DeepSeek-V4-Pro** | Pro flagship, 1M context, deep thinking by default |

**z.ai (Zhipu GLM)**

| Model | Best For |
|---|---|
| **GLM-5.2** | Latest flagship, 1M context, open-source SOTA coding, project-scale engineering |
| **GLM-5.1** | Flagship long-horizon coding & agents, 200K context, up to 8h autonomous work |
| **GLM-4.6** | Flagship coding & agents, 200K context |
| **GLM-4.5-Air** | Lightweight, faster, lower cost |
| **GLM-4.5-AirX** | Ultra-fast lightweight, low-latency |
| **GLM-5** | High-intelligence base, coding aligned with Claude Opus 4.5, 200K context |
| **GLM-5-Turbo** | Lobster-optimized base, long-task continuity, 200K context |
| **GLM-4.7** | Upgraded general model, stronger coding, 200K context |
| **GLM-4.7-Flash** | Free model, general-purpose |
| **GLM-4.7-FlashX** | Lightweight & fast, budget-friendly |
| **GLM-5V-Turbo** | Native vision (image input) plus deep thinking |

**MiniMax**

| Model | Best For |
|---|---|
| **MiniMax-M3** | Flagship agentic & coding, native vision, up to 1M context |
| **MiniMax-M2.7** | Fast coding & agents, lower cost |
| **MiniMax-M2.5** | Cost-effective reasoning & coding |

**Xiaomi MiMo**

| Model | Best For |
|---|---|
| **MiMo V2.5 Pro** | Flagship hybrid reasoning & coding, up to 1M context |
| **MiMo V2.5 (Omni)** | Native vision (image input) plus thinking |
| **MiMo V2 Flash** | Fast, low-cost everyday tasks |

**Moonshot (Kimi)**

| Model | Best For |
|---|---|
| **Kimi K3** | Flagship 2.8T, 1M context, always-thinking, native vision |
| **Kimi K2.7** | Latest flagship native-multimodal agents & coding, 256K context |
| **Kimi K2.7 Code HighSpeed** | High-speed variant of Kimi K2.7, ~180 tok/s |
| **Kimi K2.6** | Flagship native-multimodal agents & coding, 256K context |
| **Kimi K2.5** | Multimodal default with toggleable thinking |

**Tencent Hunyuan (混元)**

| Model | Best For |
|---|---|
| **Tencent HY 2.0 Think** | Flagship deep-thinking & coding, 128K context |
| **Hunyuan TurboS** | Fast & balanced everyday |
| **Hunyuan T1** | Deep thinking, affordable |
| **Hunyuan A13B** | Lightweight, fastest & lowest cost |
| **Tencent HY 2.0 Instruct** | Instruction-following, creative & knowledge-accurate, 128K context |

Model IDs are the official provider names and are fully configurable via `cllms.modelIdOverrides` / `cllms.zai.modelIdOverrides` / `cllms.minimax.modelIdOverrides` / `cllms.xiaomi.modelIdOverrides` / `cllms.moonshot.modelIdOverrides` / `cllms.hunyuan.modelIdOverrides` / `cllms.deepseek.modelIdOverrides` for third-party / self-hosted endpoints.

## Adding a new model

Want to add your own model? See [Adding a new model](./docs/adding-a-model.md) for a step-by-step guide.

## Testing Status

| Provider | Status | Notes |
|---|---|---|
| Qwen (DashScope China) | ✅ Tested | Qwen3 Coder Plus, Qwen3 Coder Flash, Qwen Plus, Qwen3 Max, Qwen3-VL Plus — all verified. Qwen3.8 Max, Qwen3.7 Max, Qwen3.7 Plus, and Qwen3.6 Flash ship enabled and are pending individual verification. |
| Qwen (DashScope International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| DeepSeek | ⚠️ Untested | API compatibility follows the standard OpenAI-compatible Chat Completions API. Test tokens or test reports welcome! |
| z.ai (Zhipu GLM) | ✅ Tested | GLM-5.2, GLM-5.1, GLM-4.6, GLM-4.5-Air, GLM-4.5-AirX — all verified. GLM-5, GLM-5-Turbo, GLM-4.7, GLM-4.7-Flash, GLM-4.7-FlashX, and GLM-5V-Turbo ship enabled and are pending individual verification. |
| MiniMax (China) | ✅ Tested | MiniMax-M3, MiniMax-M2.7 — all verified. MiniMax-M2.5 ships enabled and is pending individual verification. |
| MiniMax (International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| Xiaomi MiMo | ✅ Tested | MiMo V2.5 Pro, MiMo V2.5 (Omni), MiMo V2 Flash — all verified. |
| Moonshot (Kimi China) | ✅ Tested | Kimi K2.7, Kimi K2.7 Code HighSpeed, Kimi K2.6, Kimi K2.5 — all verified. |
| Moonshot (Kimi International) | ⚠️ Untested | API compatibility should match the domestic endpoint. Test tokens or test reports welcome! |
| Tencent Hunyuan (混元) | ✅ Tested | Standard OpenAI-compatible API — all verified. Tencent HY 2.0 Instruct ships enabled and is pending individual verification. |

> **💡 Help wanted!** International endpoints share the same API surface as their domestic counterparts, so they *should* work out of the box — but they haven't been verified yet. If you have an international API key, please give it a try and [report your results](https://github.com/appledragon/cllms-for-copilot/issues). If you'd like to contribute test tokens, reach out via GitHub Issues. Every bit of testing helps make these providers more reliable for everyone.

## Settings

| Setting | Default | Description |
|---|---|---|
| `cllms.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen OpenAI-compatible endpoint. Use `https://dashscope.aliyuncs.com/compatible-mode/v1` (Beijing), `https://dashscope-us.aliyuncs.com/compatible-mode/v1` (US), or any compatible third-party / self-hosted endpoint |
| `cllms.qwenIntl.baseUrl` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen International OpenAI-compatible endpoint |
| `cllms.deepseek.baseUrl` | `https://api.deepseek.com/v1` | DeepSeek OpenAI-compatible endpoint |
| `cllms.zai.baseUrl` | `https://api.z.ai/api/paas/v4` | z.ai (GLM) OpenAI-compatible endpoint. Use `https://api.z.ai/api/coding/paas/v4` for a GLM Coding Plan subscription |
| `cllms.minimax.baseUrl` | `https://api.minimax.io/v1` | MiniMax OpenAI-compatible endpoint. Use `https://api.minimaxi.com/v1` for mainland China |
| `cllms.xiaomi.baseUrl` | `https://api.xiaomimimo.com/v1` | Xiaomi MiMo OpenAI-compatible endpoint (official open platform) |
| `cllms.moonshot.baseUrl` | `https://api.moonshot.ai/v1` | Moonshot (Kimi) OpenAI-compatible endpoint. Use `https://api.moonshot.cn/v1` for mainland China (keys are region-specific) |
| `cllms.hunyuan.baseUrl` | `https://api.hunyuan.cloud.tencent.com/v1` | Tencent Hunyuan OpenAI-compatible endpoint |
| `cllms.maxTokens` | `0` | Max output tokens (`0` = no limit). Useful for cost control |
| `cllms.maxRetries` | `2` | Automatic retries for transient failures (HTTP 429, 5xx, network blips) before any output streams. Honors `Retry-After` and uses exponential backoff with jitter; retries stop once output starts, so a response is never duplicated. `0` disables |
| `cllms.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Qwen model. Change only for compatible third-party APIs with different model names |
| `cllms.qwenIntl.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Qwen (International) model |
| `cllms.deepseek.modelIdOverrides` | prefilled official ID map | API model IDs to send for each DeepSeek model |
| `cllms.zai.modelIdOverrides` | prefilled official ID map | API model IDs to send for each z.ai (GLM) model |
| `cllms.minimax.modelIdOverrides` | prefilled official ID map | API model IDs to send for each MiniMax model |
| `cllms.xiaomi.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Xiaomi MiMo model |
| `cllms.moonshot.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Moonshot (Kimi) model |
| `cllms.hunyuan.modelIdOverrides` | prefilled official ID map | API model IDs to send for each Tencent Hunyuan model |
| `cllms.debugMode` | `minimal` | Diagnostic mode: `minimal` for token usage only, `metadata` for privacy-preserving logs, or `verbose` for full request dumps and pipeline snapshots under extension global storage. Full dumps may include sensitive prompt text, tool schemas, file snippets, and image descriptions. Use `CLLMs: Open Request Dumps Folder` to open the dump location |
| `cllms.visionModel` | *(auto)* | Which Copilot model to proxy images through when the selected model is text-only |
| `cllms.visionPrompt` | *(built-in)* | Prompt used to describe image attachments via the vision proxy |
| `cllms.visionProxy.timeoutMs` | `30000` | Per-request timeout (ms) for the API-endpoint vision proxy. Clamped to `1000`–`120000`. Lower it so a slow vision endpoint fails fast instead of stalling the chat |
| `cllms.utility.maxOutputTokens` | `0` | Cap output tokens for one-shot utility/helper requests only (chat titles, commit/branch messages, inline progress, rename suggestions, prompt categorization, settings resolution, todo tracking). `0` disables. Combined with `cllms.maxTokens` by taking the smaller value; agent/chat turns are unaffected |
| `cllms.utility.modelIdByProvider` | `{}` | Route utility/helper requests to a cheaper API model on the same provider, keyed by provider id (e.g. `{ "qwen": "qwen-flash" }`). Empty by default (no downgrade). Session cost uses the override model's built-in pricing when CLLMs recognizes that model; otherwise the request is shown as unbilled. Prefer VS Code's native `chat.utilityModel` (`CLLMs: Configure Utility Model`) when available |
| `cllms.experimental.stabilizeToolList` | `false` | Experimental. Tries to pre-activate VS Code/Copilot virtual tools so the `tools` parameter is more complete and stable across turns. May improve context-cache hit rate when enabled tools change between turns. Can increase input tokens because more function definitions may be included; cache-hit input tokens are cheaper but still count toward usage. Usually leave it off with 64 or fewer enabled tools unless the tool list still changes across turns; do not enable it with more than 128 enabled tools |
| `cllms.experimental.sortToolsForCache` | `false` | Experimental. Sort the request `tools` array alphabetically by name so VS Code/Copilot reordering the enabled tools between turns does not invalidate the provider's context-cache prefix. Works alongside `stabilizeToolList` |
| `cllms.experimental.replayReasoningScope` | `all` | Experimental. How much marker-replayed `reasoning_content` to re-send for thinking models. `all` replays every assistant turn (most compatible, byte-stable prefix); `latest-tool-loop` only replays the in-flight tool-call loop and drops older turns to save input tokens on long sessions |

Thinking Effort is configured from Copilot Chat's model picker for each thinking-capable model.

See [Advanced settings](./advanced-settings.md) for a focused guide to the cost and cache controls above.

For text-only models, the vision proxy resolves image attachments to text before the main request. **All CLLMs models accept pasted images** — text-only models auto-route them through the vision proxy, while native-vision models (e.g. Qwen3.8 Max, Qwen3-VL-Plus, GLM-5V-Turbo) receive images directly. If no explicit vision model is configured, the extension falls back to any available Copilot model (e.g. GPT-4o) as a vision describer. Identical image descriptions are cached for the current VS Code session by image bytes, prompt, and describer identity, so retries or re-attaching the same image avoid another description call. API-endpoint vision calls also use `cllms.maxRetries` for transient 429 / 5xx / network failures and `cllms.visionProxy.timeoutMs` for each attempt.

For audio attachments, the audio proxy can transcribe audio into text before the main request for models that do not natively process audio parts. Configure it from `CLLMs: Configure Audio Proxy` (panel UI, similar to Vision Proxy). API-endpoint audio calls use the same retry policy (`cllms.maxRetries`) and `cllms.audioProxy.timeoutMs` per attempt.

Recent audio hardening updates:
- Quick Setup now validates and normalizes audio proxy endpoint config before saving (same behavior as the panel flow).
- Custom audio proxy headers cannot override protected request headers (`authorization`, `content-type`).
- Responses-audio MIME handling now supports `audio/webm` and `audio/m4a`/`audio/mp4` explicitly; unsupported MIME types return a clear typed error.

### Utility cost control

CLLMs can run lightweight, one-shot Copilot helper requests more cheaply than your real agent turns. Two independent paths exist, with different decision-makers.

**Who decides a request is "utility"?** CLLMs classifies every incoming request automatically from its system-prompt signature and tool set — this is not user-configurable. The eight *utility-tier* kinds are `chat-title`, `git-commit-message`, `git-branch-name`, `inline-progress-message`, `rename-suggestions`, `prompt-categorizer`, `settings-resolver`, and `todo-tracker`. Everything else — your real agent turns (`main-agent`), terminal follow-ups, generic `background` work, and any **unrecognized** request — is agent-tier and is **never** capped or downgraded, so a real turn is never throttled by mistake.

**Path A — CLLMs downgrade (`cllms.utility.*`).** Once a request reaches a CLLMs model, a downgrade fires only when the request is utility-tier **and** you opted in:

- `cllms.utility.maxOutputTokens` caps output tokens for utility requests (combined with `cllms.maxTokens` by taking the smaller value).
- `cllms.utility.modelIdByProvider` swaps the API `model` to a cheaper one on the same provider/key (e.g. `{ "qwen": "qwen-flash" }`).

Both are **off by default** — with no config, nothing changes. The model picker still shows your selected model (this is a silent, server-side swap), and each downgrade/cap is logged when `cllms.debugMode` is `metadata` or `verbose`. Session cost uses the override model's built-in pricing when CLLMs recognizes that model; otherwise the request is shown as unbilled.

**Path B — VS Code native (`chat.utilityModel` / `chat.utilitySmallModel`).** Here **VS Code / Copilot itself** decides which requests are utility and routes them — before they reach any provider. CLLMs does not participate in that decision; it just serves whichever model the host picked. Run `CLLMs: Configure Utility Model` to set these native settings.

Prefer Path B when your VS Code supports it (routing is explicit and the cost estimate stays accurate); use Path A to fine-tune per provider or as a fallback.

## Commands

Run these from the Command Palette (`Cmd/Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `CLLMs: Set API Key` | Store a provider's API key in the OS keychain |
| `CLLMs: Get API Key` | Open a provider's API key page |
| `CLLMs: Clear API Key` | Remove a provider's stored key |
| `CLLMs: Configure Vision Proxy` | Pick the model used to describe images for text-only models |
| `CLLMs: Configure Audio Proxy` | Configure the audio-transcription proxy endpoint and model |
| `CLLMs: Test Provider Connection` | Verify a provider's key + endpoint via `/v1/models` and flag stale `modelIdOverrides` |
| `CLLMs: Show Session Cost` | Show approximate spend per model for this session, with average context-cache hit rate, utility/agent cost split, and a reset action |
| `CLLMs: Configure Utility Model` | Route lightweight Copilot helper requests to a cheaper model via VS Code's native `chat.utilityModel` / `chat.utilitySmallModel` |
| `CLLMs: Open Settings` | Jump to the extension settings |
| `CLLMs: Show Logs` | Open the diagnostic output channel |
| `CLLMs: Open Request Dumps Folder` | Open the verbose request-dump folder (debug mode) |

> **Note on session cost** — `Show Session Cost` is an **approximation for the current session only**. It is estimated from the `usage` each provider streams back (cached input is billed at the cache-hit tier), is not a substitute for your provider's official billing, and resets when the display currency changes. The detail also reports the session average context-cache hit rate and, when utility requests incurred billed cost, the utility vs agent split. Requests for models without configured pricing are counted separately as "excluded for lack of pricing" rather than folded into the total, so the figure never looks more complete than it is.

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

## Thanks

CLLMs began as a Qwen-focused adaptation of [**Vizards/deepseek-v4-for-copilot**](https://github.com/Vizards/deepseek-v4-for-copilot) by [**Vizards**](https://github.com/Vizards), which pioneered the approach of plugging a BYOK model into the Copilot Chat picker via the native `LanguageModelChatProvider` API, and has since grown into a multi-provider extension for Qwen, DeepSeek, z.ai (GLM), MiniMax, Xiaomi MiMo, Moonshot Kimi, and Tencent Hunyuan. Huge thanks to the original author — the provider pipeline, vision proxy, thinking-mode handling, and diagnostics here are deeply inspired by the generous foundation that Vizards created and shared with the community.

## License

[MIT](LICENSE) — see [NOTICE](NOTICE) for attribution to the upstream project.
