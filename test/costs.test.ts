import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toModelCostInfo } from '../src/provider/pricing/costs';
import type { ModelDefinition } from '../src/types';

function model(overrides: Partial<ModelDefinition> = {}): ModelDefinition {
	return {
		id: 'test',
		name: 'TEST',
		provider: 'qwen',
		family: 'test',
		version: '1',
		detail: '',
		maxInputTokens: 1000,
		maxOutputTokens: 1000,
		capabilities: { toolCalling: true, imageInput: false, thinking: false },
		requiresThinkingParam: false,
		pricing: {
			USD: { cacheHitInput: 0.1, cacheMissInput: 1, output: 5 },
			CNY: { cacheHitInput: 0.8, cacheMissInput: 4, output: 16 },
		},
		...overrides,
	};
}

describe('toModelCostInfo', () => {
	it('returns nothing when no display currency is resolved', () => {
		assert.deepEqual(toModelCostInfo(model(), undefined), {});
	});

	it('returns nothing when the model has no pricing in the active currency', () => {
		assert.deepEqual(toModelCostInfo(model({ pricing: undefined }), 'USD'), {});
	});

	it('maps USD prices to the input/cache/output cost slots with a dollar sign', () => {
		assert.deepEqual(toModelCostInfo(model(), 'USD'), {
			inputCost: '$1',
			cacheCost: '$0.1',
			outputCost: '$5',
		});
	});

	it('formats CNY prices with a yuan sign', () => {
		assert.deepEqual(toModelCostInfo(model(), 'CNY'), {
			inputCost: '¥4',
			cacheCost: '¥0.8',
			outputCost: '¥16',
		});
	});

	it('includes priceCategory only when pricing is also emitted', () => {
		assert.equal(toModelCostInfo(model({ priceCategory: 'low' }), 'USD').priceCategory, 'low');
		// No currency → all cost metadata (including priceCategory) is suppressed.
		assert.equal(
			toModelCostInfo(model({ priceCategory: 'low' }), undefined).priceCategory,
			undefined,
		);
	});
});
