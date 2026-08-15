import type { LlmRequest, ThinkingStyle } from '../types';
import type { ThinkingEffort } from './models';

/** Reasoning token budget applied for the `max` thinking effort (Qwen only). */
export const MAX_THINKING_BUDGET = 38912;

/** Subset of request fields that carry provider thinking/reasoning control. */
export type ThinkingRequestFields = Pick<
	LlmRequest,
	'enable_thinking' | 'thinking_budget' | 'thinking' | 'reasoning_split' | 'reasoning_effort'
>;

/**
 * Serialize the thinking/reasoning control for a thinking-capable model.
 *
 *  - `qwen` (`enable_thinking` + optional `thinking_budget`): the `max` effort
 *    additionally raises the reasoning token budget.
 *  - `qwen_effort` (`enable_thinking` + `reasoning_effort`): Qwen3.8 Max. `max`
 *    sends `reasoning_effort: "xhigh"`; do not also send `thinking_budget`.
 *  - `glm` / z.ai (`thinking: { type }`): only enabled/disabled is supported, so
 *    `high` and `max` both map to `enabled`.
 *  - `deepseek` (`thinking: { type }` + `reasoning_effort`): `none` disables
 *    thinking; `high`/`max` enable it and set the official effort. Used by
 *    DeepSeek and GLM-5.2.
 *  - `minimax` (`thinking: { type }` + `reasoning_split`): `high`/`max` map to
 *    `adaptive`; `reasoning_split` keeps reasoning in `reasoning_content` rather
 *    than embedding `<think>` tags in `content`. (M2.x models ignore `disabled`
 *    and always think; M3 honors it.)
 *  - `reasoning_effort` (top-level `reasoning_effort`): used by Kimi K3.
 *    Supports `low` / `high` / `max`. K3 always thinks, so `none` maps to `low`.
 */
export function buildThinkingFields(
	style: ThinkingStyle,
	effort: ThinkingEffort,
): ThinkingRequestFields {
	if (style === 'glm') {
		return { thinking: { type: effort === 'none' ? 'disabled' : 'enabled' } };
	}

	if (style === 'deepseek') {
		if (effort === 'none') {
			return { thinking: { type: 'disabled' } };
		}
		return {
			thinking: { type: 'enabled' },
			reasoning_effort: effort === 'max' ? 'max' : 'high',
		};
	}

	if (style === 'minimax') {
		return {
			thinking: { type: effort === 'none' ? 'disabled' : 'adaptive' },
			reasoning_split: true,
		};
	}

	if (style === 'reasoning_effort') {
		// Kimi K3 always thinks; official values are low / high / max.
		if (effort === 'none') {
			return { reasoning_effort: 'low' };
		}
		return { reasoning_effort: effort === 'max' ? 'max' : 'high' };
	}

	if (style === 'qwen_effort') {
		if (effort === 'none') {
			return { enable_thinking: false };
		}
		return {
			enable_thinking: true,
			...(effort === 'max' ? { reasoning_effort: 'xhigh' as const } : {}),
		};
	}

	return {
		enable_thinking: effort !== 'none',
		...(effort === 'max' ? { thinking_budget: MAX_THINKING_BUDGET } : {}),
	};
}
