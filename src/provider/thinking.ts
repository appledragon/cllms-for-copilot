import type { LlmRequest, ThinkingStyle } from '../types';
import type { ThinkingEffort } from './models';

/** Reasoning token budget applied for the `max` thinking effort (Qwen only). */
export const MAX_THINKING_BUDGET = 38912;

/** Subset of request fields that carry provider thinking/reasoning control. */
export type ThinkingRequestFields = Pick<
	LlmRequest,
	'enable_thinking' | 'thinking_budget' | 'thinking' | 'reasoning_split'
>;

/**
 * Serialize the thinking/reasoning control for a thinking-capable model.
 *
 *  - `qwen` (`enable_thinking` + optional `thinking_budget`): the `max` effort
 *    additionally raises the reasoning token budget.
 *  - `glm` / z.ai (`thinking: { type }`): only enabled/disabled is supported, so
 *    `high` and `max` both map to `enabled`.
 *  - `minimax` (`thinking: { type }` + `reasoning_split`): `high`/`max` map to
 *    `adaptive`; `reasoning_split` keeps reasoning in `reasoning_content` rather
 *    than embedding `<think>` tags in `content`. (M2.x models ignore `disabled`
 *    and always think; M3 honors it.)
 */
export function buildThinkingFields(
	style: ThinkingStyle,
	effort: ThinkingEffort,
): ThinkingRequestFields {
	if (style === 'glm') {
		return { thinking: { type: effort === 'none' ? 'disabled' : 'enabled' } };
	}

	if (style === 'minimax') {
		return {
			thinking: { type: effort === 'none' ? 'disabled' : 'adaptive' },
			reasoning_split: true,
		};
	}

	return {
		enable_thinking: effort !== 'none',
		...(effort === 'max' ? { thinking_budget: MAX_THINKING_BUDGET } : {}),
	};
}
