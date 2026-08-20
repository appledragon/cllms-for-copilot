## Cost And Cache Settings

CLLMs includes several optional settings for lowering cost and improving provider context-cache hit rates. Most of these are advanced controls; keep the defaults unless you are chasing a specific cache miss, latency, or billing issue.

## Stabilize Tool List (Experimental)

First, open VS Code's Tools configuration and check how many tools are enabled for chat.

[Configure Tools](command:workbench.action.chat.configureTools)

- 64 or fewer enabled tools: there is usually no need to turn this on unless the tool list still changes across turns.
- More than 128 enabled tools: not recommended. Providers support at most 128 functions in one `tools` request, so CLLMs cannot guarantee a stable `tools` list above that limit. Disable rarely used tools first, then consider enabling this setting.
- Between 64 and 128 enabled tools: consider this setting only if the tools list changes between turns and context-cache hits are poor.

This setting may improve cache hits by making the `tools` parameter more complete and stable across turns. It may also increase input tokens because more function definitions can be included in each request.

[Open setting](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.stabilizeToolList%22%5D)

## Sort Tools For Cache (Experimental)

If the enabled tool set is the same but VS Code/Copilot changes the order between turns, some providers may miss their context cache because the request prefix bytes changed. `cllms.experimental.sortToolsForCache` sorts the request `tools` array by name to make that order stable.

[Open setting](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.sortToolsForCache%22%5D)

## Reasoning Replay Scope (Experimental)

Thinking models replay marker-carried `reasoning_content` on later turns. The default `all` is the most compatible and keeps Qwen-style tool-call histories byte-stable. `latest-tool-loop` only replays reasoning for the current tool-call loop, saving input tokens in long sessions at the cost of less stable older prefixes.

[Open setting](command:workbench.action.openSettings?%5B%22%40id%3Acllms.experimental.replayReasoningScope%22%5D)

## Utility Cost Control

Use `cllms.utility.maxOutputTokens` and `cllms.utility.modelIdByProvider` only for lightweight helper requests such as chat titles, commit messages, branch names, inline progress, rename suggestions, prompt categorization, settings resolution, and todo tracking. Real agent turns and unrecognized requests are never capped or downgraded by these settings. Prefer VS Code's native utility model routing when available.

- `cllms.utility.maxOutputTokens` is combined with `cllms.maxTokens` by taking the smaller non-zero cap.
- `cllms.utility.modelIdByProvider` is keyed by provider id, for example `{ "qwen": "qwen3-coder-flash" }`.
- Session cost estimates use the utility override model when it matches a known model with pricing; unknown override IDs are tracked as unbilled usage instead of being estimated from the selected model.
- Utility routing is classifier-driven, so prompts that do not look like one-shot helper work keep the selected chat/agent model.

[Configure Utility Model](command:cllms.configureUtilityModel)

[Open utility settings](command:workbench.action.openSettings?%5B%22%40id%3Acllms.utility.modelIdByProvider%22%5D)

## Vision Proxy Latency

For text-only models, image descriptions are cached for the current session when the same image, prompt, and describer are used again. API-endpoint vision calls also retry transient 429 / 5xx / network failures using `cllms.maxRetries`, and `cllms.visionProxy.timeoutMs` controls each attempt's timeout.

[Open vision timeout setting](command:workbench.action.openSettings?%5B%22%40id%3Acllms.visionProxy.timeoutMs%22%5D)
