import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildThinkingFields, MAX_THINKING_BUDGET } from '../src/provider/thinking';

describe('buildThinkingFields', () => {
	describe('qwen style (flat enable_thinking)', () => {
		it('disables thinking for "none"', () => {
			assert.deepEqual(buildThinkingFields('qwen', 'none'), { enable_thinking: false });
		});

		it('enables thinking for "high" without a budget', () => {
			assert.deepEqual(buildThinkingFields('qwen', 'high'), { enable_thinking: true });
		});

		it('enables thinking and raises the budget for "max"', () => {
			assert.deepEqual(buildThinkingFields('qwen', 'max'), {
				enable_thinking: true,
				thinking_budget: MAX_THINKING_BUDGET,
			});
		});

		it('never emits nested thinking / reasoning_split fields', () => {
			for (const effort of ['none', 'high', 'max'] as const) {
				const fields = buildThinkingFields('qwen', effort);
				assert.equal('thinking' in fields, false);
				assert.equal('reasoning_split' in fields, false);
			}
		});
	});

	describe('glm style (nested thinking.type enabled/disabled)', () => {
		it('maps "none" to disabled', () => {
			assert.deepEqual(buildThinkingFields('glm', 'none'), { thinking: { type: 'disabled' } });
		});

		for (const effort of ['high', 'max'] as const) {
			it(`maps "${effort}" to enabled`, () => {
				assert.deepEqual(buildThinkingFields('glm', effort), { thinking: { type: 'enabled' } });
			});
		}

		it('never emits qwen/minimax-only fields', () => {
			const fields = buildThinkingFields('glm', 'high');
			assert.equal('enable_thinking' in fields, false);
			assert.equal('thinking_budget' in fields, false);
			assert.equal('reasoning_split' in fields, false);
		});
	});

	describe('minimax style (nested thinking.type adaptive + reasoning_split)', () => {
		it('maps "none" to disabled but still sets reasoning_split', () => {
			assert.deepEqual(buildThinkingFields('minimax', 'none'), {
				thinking: { type: 'disabled' },
				reasoning_split: true,
			});
		});

		for (const effort of ['high', 'max'] as const) {
			it(`maps "${effort}" to adaptive with reasoning_split`, () => {
				assert.deepEqual(buildThinkingFields('minimax', effort), {
					thinking: { type: 'adaptive' },
					reasoning_split: true,
				});
			});
		}

		it('always requests reasoning_split regardless of effort', () => {
			for (const effort of ['none', 'high', 'max'] as const) {
				assert.equal(buildThinkingFields('minimax', effort).reasoning_split, true);
			}
		});
	});
});
