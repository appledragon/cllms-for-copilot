import type { LlmUsage, ModelDefinition, PricingCurrency } from '../../types';

export interface SessionCostLineItem {
	readonly modelId: string;
	readonly modelName: string;
	readonly requests: number;
	readonly promptTokens: number;
	/** Portion of promptTokens billed at the cheaper cache-hit tier. */
	readonly cachedPromptTokens: number;
	readonly completionTokens: number;
	readonly cost: number;
}

export interface SessionCostSummary {
	readonly currency: PricingCurrency;
	readonly totalCost: number;
	readonly items: readonly SessionCostLineItem[];
	/** Requests whose cost was estimated (model had pricing in the active currency). */
	readonly billedRequests: number;
	/** Requests excluded from the total because the model lacked pricing. */
	readonly unbilledRequests: number;
	/** Distinct models excluded from the total for lack of pricing. */
	readonly unbilledModelCount: number;
}

interface MutableEntry {
	modelName: string;
	requests: number;
	promptTokens: number;
	cachedPromptTokens: number;
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
	/** Models seen with usage but no pricing in the active currency. */
	private readonly unbilledModelIds = new Set<string>();
	private unbilledRequests = 0;
	private currency: PricingCurrency | undefined;
	private totalCost = 0;

	record(model: ModelDefinition, usage: LlmUsage, currency: PricingCurrency | undefined): void {
		if (!currency) {
			return;
		}

		// A currency switch mid-session (locale change) restarts the tally so we
		// never mix $ and ¥ in one total.
		if (this.currency && this.currency !== currency) {
			this.reset();
		}
		this.currency = currency;

		const pricing = model.pricing?.[currency];
		if (!pricing) {
			// Keep the cost total honest: this request is real but cannot be
			// priced, so record it as unbilled instead of silently dropping it.
			this.unbilledRequests += 1;
			this.unbilledModelIds.add(model.id);
			return;
		}

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
			cachedPromptTokens: 0,
			completionTokens: 0,
			cost: 0,
		};
		entry.requests += 1;
		entry.promptTokens += usage.prompt_tokens;
		entry.cachedPromptTokens += cachedTokens;
		entry.completionTokens += usage.completion_tokens;
		entry.cost += cost;
		this.entries.set(model.id, entry);
		this.totalCost += cost;
	}

	/** True when no priced usage has accrued (unbilled-only usage still reads empty). */
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
		if (!this.currency || (this.entries.size === 0 && this.unbilledRequests === 0)) {
			return undefined;
		}
		const items = [...this.entries.entries()]
			.map(([modelId, entry]) => ({
				modelId,
				modelName: entry.modelName,
				requests: entry.requests,
				promptTokens: entry.promptTokens,
				cachedPromptTokens: entry.cachedPromptTokens,
				completionTokens: entry.completionTokens,
				cost: entry.cost,
			}))
			.sort((a, b) => b.cost - a.cost);
		const billedRequests = items.reduce((sum, item) => sum + item.requests, 0);
		return {
			currency: this.currency,
			totalCost: this.totalCost,
			items,
			billedRequests,
			unbilledRequests: this.unbilledRequests,
			unbilledModelCount: this.unbilledModelIds.size,
		};
	}

	reset(): void {
		this.entries.clear();
		this.unbilledModelIds.clear();
		this.unbilledRequests = 0;
		this.totalCost = 0;
	}
}

/** Format a cost amount with its currency symbol (4 dp for sub-cent precision). */
export function formatSessionCost(amount: number, currency: PricingCurrency): string {
	const symbol = currency === 'CNY' ? '¥' : '$';
	return `${symbol}${amount.toFixed(4)}`;
}
