# Changelog

## 0.2.0

- **Providers webview UI improvements**:
  - Status text ("Connected" / "configured") now displayed in green, matching the status dot color.
  - Removed duplicate native browser tooltips on icon buttons (CSS tooltip remains).
  - Removed provider name from button tooltips for a cleaner look.
  - Removed the Status button from provider cards (redundant with other actions).
- **Cost & cache optimizations**:
  - **Reasoning replay on cancel/error** — when a streamed thinking response is cancelled or errors after reasoning was produced, the replay marker is now still written so the assistant turn keeps a non-empty `reasoning_content`, avoiding an empty hole that breaks Qwen-style prefix caches.
  - Add `cllms.experimental.replayReasoningScope` (`all` | `latest-tool-loop`) to optionally drop `reasoning_content` from older turns and only replay the in-flight tool-call loop, saving input tokens on long sessions.
  - Add `cllms.experimental.sortToolsForCache` to stably sort the request `tools` array by name so host-side tool reordering no longer invalidates the provider's context-cache prefix.
  - `CLLMs: Show Session Cost` now reports the session **average context-cache hit rate** and splits billed cost into **utility vs agent** tiers.
  - **Vision proxy**: session-level description cache keyed by image content (avoids re-describing the same image on retries / re-attachments), light retry on transient (429/5xx/network) failures, and a configurable `cllms.visionProxy.timeoutMs`.
  - **Utility cost control**: add `cllms.utility.maxOutputTokens` to cap output for one-shot helper requests, `cllms.utility.modelIdByProvider` to route utility requests to a cheaper model on the same provider, and a `CLLMs: Configure Utility Model` command that guides VS Code's native `chat.utilityModel` / `chat.utilitySmallModel` routing.
- Document provider models that were already present in the model registry but missing from the changelog and READMEs, and complete their i18n (en/zh-cn) `detail`/`tooltip` coverage plus registry-consistency tests:
  - **Qwen (DashScope)**: Qwen3.7 Max, Qwen3.7 Plus, Qwen3.6 Flash (with `-intl` variants).
  - **z.ai (Zhipu GLM)**: GLM-5, GLM-5-Turbo, GLM-4.7, GLM-4.7-FlashX, and the native-vision GLM-5V-Turbo.
  - **MiniMax**: MiniMax-M2.5 (with `-intl` variant).
  - **Tencent Hunyuan (混元)**: Tencent HY 2.0 Instruct.

## 0.1.9

- Add a **CLLMs Activity Bar view** to manage providers: a sidebar tree lists every provider with its API-key status, inline/context actions (set/clear key, test connection, open API key/usage/status pages), and an expandable read-only model list. The view toolbar links to the vision proxy, settings, logs, and the getting-started walkthrough.
- Add **GLM-5.2** model — z.ai's latest flagship with 1M context, 128K output tokens, open-source SOTA coding capability, and project-scale engineering context support. Supports deep thinking mode, tool calling, and MCP. Pricing: ¥8 / ¥2 (cached) input, ¥28 output per 1M tokens.

## 0.1.8

- Fix model picker not showing models: restore `displayName` on `languageModelChatProviders` contribution point (removed in 0.1.6 caused Copilot Chat to ignore the provider on recent VS Code versions).
- Fix `Tool "cllms_readImage" was not contributed` error by wrapping tool registration in try-catch for graceful fallback when the contribution point hasn't loaded yet.

## 0.1.7

- Fix "Canceled: Canceled" warning during extension deactivation by removing the unnecessary `selectChatModels` call that always fails when the extension host is shutting down.

## 0.1.6

- Fix Kimi K2.7 API model ID: use the correct `kimi-k2.7-code` instead of `kimi-k2.7` (which returned 404 "Not found the model kimi-k2.7 or Permission denied").
- Remove `displayName` from `languageModelChatProviders` contribution point.

## 0.1.5

- Add **Kimi K2.7** model — Moonshot's latest flagship native-multimodal hybrid-reasoning model with a 256K context, native image input, thinking mode (on by default), and tool calling. Available on both the domestic (`api.moonshot.cn`) and international (`api.moonshot.ai`) endpoints.

## 0.1.4

- Update README (en/zh-cn) to document the new GLM-5.1 model.

## 0.1.3

- Add **GLM-5.1** model — z.ai's latest flagship with 200K context, up to 128K output tokens, and long-horizon autonomous coding capability (up to 8 hours of sustained agent work). Supports thinking mode, tool calling, and MCP. Pricing: $1.4 / $0.26 (cached) input, $4.4 output per 1M tokens.

## 0.1.2

- Fix broken relative links (`中文`, `Adding a new model`) in the Marketplace README by transforming them to absolute GitHub URLs at publish time.

## 0.1.1

- Improve README wording to better acknowledge original author Vizards' contribution.

## 0.1.0

Initial release of **CLLMs for Copilot Chat** — Chinese frontier LLMs (Qwen, z.ai GLM, MiniMax, Xiaomi MiMo, Moonshot Kimi) in the GitHub Copilot Chat model picker (BYOK). Project identity renamed from `qwen-for-copilot` to `cllms-for-copilot`; settings/commands are now prefixed `cllms.*`.

### Features

- Qwen models via the DashScope OpenAI-compatible API.
- First-class z.ai (Zhipu GLM) provider: GLM-4.6, GLM-4.5-Air, and GLM-4.5V, with configurable `zai.baseUrl` / `zai.modelIdOverrides` (incl. GLM Coding Plan endpoint).
- First-class MiniMax provider: MiniMax-M3 and MiniMax-M2.7, with configurable `minimax.baseUrl` (international `api.minimax.io` by default; `api.minimaxi.com` for mainland China) / `minimax.modelIdOverrides`.
- First-class Xiaomi MiMo provider: MiMo V2.5 Pro, MiMo V2.5 (Omni, native vision), and MiMo V2 Flash via the official open platform (`api.xiaomimimo.com`), with configurable `xiaomi.baseUrl` / `xiaomi.modelIdOverrides`.
- First-class Moonshot (Kimi) provider: Kimi K2.6 and Kimi K2.5 (native-multimodal, 256K context) via the official open platform (international `api.moonshot.ai`; `api.moonshot.cn` for mainland China, region-specific keys), with configurable `moonshot.baseUrl` / `moonshot.modelIdOverrides`.
- All providers appear together in the model picker; each keeps its own API key in VS Code SecretStorage (`CLLMs: Set API Key` lets you pick a provider).
- Default model registry: Qwen3 Coder Plus, Qwen Plus, Qwen3 Max, Qwen3-VL Plus, GLM-4.6, GLM-4.5-Air, GLM-4.5V, MiniMax-M3, MiniMax-M2.7, MiMo V2.5 Pro, MiMo V2.5 (Omni), MiMo V2 Flash, Kimi K2.6, Kimi K2.5. Model IDs and base URLs are configurable for third-party / self-hosted providers.
- Thinking mode with per-model Reasoning Effort control (None / High / Max), mapped per provider to Qwen3's `enable_thinking` / thinking budget, GLM's, Xiaomi MiMo's, and Moonshot Kimi's `thinking: { type }`, and MiniMax's `thinking: { type: "adaptive" }` (+ `reasoning_split` so reasoning streams via `reasoning_content`).
- Hybrid vision: native image input on vision-capable models (Qwen3-VL Plus, GLM-4.5V, MiMo V2.5 Omni, Kimi K2.6 / K2.5), with a Copilot-model proxy fallback for text-only models (incl. MiniMax).
- Tool calling, agent mode, streaming, and context-cache usage stats inherited from Copilot's native provider API.
