import type { LlmUsage, ModelDefinition, PricingCurrency } from '../../types';

export interface SessionCostLineItem {
	readonly modelId: string;
	readonly modelName: string;
	readonly requests: number;
	readonly promptTokens: number;
	readonly completionTokens: number;
	readonly cost: number;
}

export interface SessionCostSummary {
	readonly currency: PricingCurrency;
	readonly totalCost: number;
	readonly items: readonly SessionCostLineItem[];
}

interface MutableEntry {
	modelName: string;
	requests: number;
	promptTokens: number;
	completionTokens: number;
	cost: number;
}

const TOKENS_PER_PRICING_UNIT = 1_000_000;

/**
 * Accumulates approximate spend for the current VS Code session from streamed
 * usage stats. Cost only accrues for models with concrete pricing in the
 * configured display currency; usage for models without pricing is ignored so
 * the total never shows a misleading partial figure.
 */
export class SessionCostTracker {
	private readonly entries = new Map<string, MutableEntry>();
	private currency: PricingCurrency | undefined;
	private totalCost = 0;

	record(model: ModelDefinition, usage: LlmUsage, currency: PricingCurrency | undefined): void {
		if (!currency) {
			return;
		}
		const pricing = model.pricing?.[currency];
		if (!pricing) {
			return;
		}

		// A currency switch mid-session (locale change) restarts the tally so we
		// never mix $ and ¥ in one total.
		if (this.currency && this.currency !== currency) {
			this.reset();
		}
		this.currency = currency;

		const cachedTokens = Math.max(0, usage.prompt_tokens_details?.cached_tokens ?? 0);
		const nonCachedPromptTokens = Math.max(0, usage.prompt_tokens - cachedTokens);
		const cost =
			(nonCachedPromptTokens * pricing.cacheMissInput +
				cachedTokens * pricing.cacheHitInput +
				usage.completion_tokens * pricing.output) /
			TOKENS_PER_PRICING_UNIT;

		const entry = this.entries.get(model.id) ?? {
			modelName: model.name,
			requests: 0,
			promptTokens: 0,
			completionTokens: 0,
			cost: 0,
		};
		entry.requests += 1;
		entry.promptTokens += usage.prompt_tokens;
		entry.completionTokens += usage.completion_tokens;
		entry.cost += cost;
		this.entries.set(model.id, entry);
		this.totalCost += cost;
	}

	isEmpty(): boolean {
		return this.entries.size === 0;
	}

	getCurrency(): PricingCurrency | undefined {
		return this.currency;
	}

	getTotalCost(): number {
		return this.totalCost;
	}

	getSummary(): SessionCostSummary | undefined {
		if (!this.currency || this.entries.size === 0) {
			return undefined;
		}
		const items = [...this.entries.entries()]
			.map(([modelId, entry]) => ({
				modelId,
				modelName: entry.modelName,
				requests: entry.requests,
				promptTokens: entry.promptTokens,
				completionTokens: entry.completionTokens,
				cost: entry.cost,
			}))
			.sort((a, b) => b.cost - a.cost);
		return { currency: this.currency, totalCost: this.totalCost, items };
	}

	reset(): void {
		this.entries.clear();
		this.totalCost = 0;
	}
}

/** Format a cost amount with its currency symbol (4 dp for sub-cent precision). */
export function formatSessionCost(amount: number, currency: PricingCurrency): string {
	const symbol = currency === 'CNY' ? '¥' : '$';
	return `${symbol}${amount.toFixed(4)}`;
}
