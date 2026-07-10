import type { ModelDefinition, PriceCategory, PricingCurrency } from '../../types';

/**
 * VS Code's proposed cost fields are numeric credits consumed by the Copilot UI.
 * We pass raw per-1M-token prices from the model definition so BYOK costs render
 * correctly in the model picker's native cost slots.
 *
 * Mapping:
 * - inputCost  <- cacheMissInput, the representative non-cached input price.
 * - cacheCost  <- cacheHitInput, shown separately as the cached-input tier.
 * - outputCost <- output.
 *
 * priceCategory is emitted only together with concrete official pricing; incomplete
 * pricing intentionally suppresses all cost metadata.
 */
export interface ModelCostInformation {
	readonly inputCost?: number;
	readonly outputCost?: number;
	readonly cacheCost?: number;
	readonly priceCategory?: PriceCategory;
}

export function toModelCostInfo(
	model: ModelDefinition,
	currency?: PricingCurrency,
): ModelCostInformation {
	if (!currency) {
		return {};
	}

	const pricing = model.pricing?.[currency];
	if (!pricing) {
		return {};
	}

	return {
		...(model.priceCategory ? { priceCategory: model.priceCategory } : {}),
		inputCost: formatPriceValue(pricing.cacheMissInput, currency),
		outputCost: formatPriceValue(pricing.output, currency),
		cacheCost: formatPriceValue(pricing.cacheHitInput, currency),
	};
}

function formatPriceValue(value: number, _currency: PricingCurrency): number {
	return value;
}
