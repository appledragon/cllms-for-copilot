# Changelog

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
