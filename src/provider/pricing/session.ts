import type { RequestCostTier } from '../routing';
import type { LlmUsage, ModelDefinition, PricingCurrency } from '../../types';

export interface SessionCostLineItem {
	readonly modelId: string;
	readonly modelName: string;
	readonly requests: number;
	readonly promptTokens: number;
	/** Portion of promptTokens billed at the cheaper cache-hit tier. */
	readonly cachedPromptTokens: number;
	/** Context-cache hit rate for this model (0-100), if it sent prompt tokens. */
	readonly cacheHitRate?: number;
	readonly completionTokens: number;
	readonly cost: number;
	/** Estimated amount saved by cached input versus billing every input token at cache-miss price. */
	readonly cacheSavings: number;
	/** Average estimated cost per request for this model. */
	readonly averageCost: number;
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
	/** Prompt tokens across every request this session (billed and unbilled). */
	readonly totalPromptTokens: number;
	/** Cached prompt tokens across every request this session (billed and unbilled). */
	readonly totalCachedPromptTokens: number;
	/** Billed cost attributed to lightweight utility/helper requests. */
	readonly utilityCost: number;
	/** Billed cost attributed to user-facing/agent (non-utility) requests. */
	readonly agentCost: number;
	/** Estimated session-wide amount saved by cached input versus cache-miss pricing. */
	readonly totalCacheSavings: number;
}

interface MutableEntry {
	modelName: string;
	requests: number;
	promptTokens: number;
	cachedPromptTokens: number;
	completionTokens: number;
	cost: number;
	cacheSavings: number;
}

const TOKENS_PER_PRICING_UNIT = 1_000_000;
const UNKNOWN_UNBILLED_MODEL_ID = 'unknown';

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
	/** Session-wide cache health, accumulated for billed and unbilled requests. */
	private totalPromptTokens = 0;
	private totalCachedPromptTokens = 0;
	/** Billed cost split by request cost tier, to surface utility overhead. */
	private utilityCost = 0;
	private agentCost = 0;
	private currency: PricingCurrency | undefined;
	private totalCost = 0;

	record(
		model: ModelDefinition | undefined,
		usage: LlmUsage,
		currency: PricingCurrency | undefined,
		costTier: RequestCostTier = 'agent',
		unbilledModelId: string = UNKNOWN_UNBILLED_MODEL_ID,
	): void {
		if (!currency) {
			return;
		}

		// A currency switch mid-session (locale change) restarts the tally so we
		// never mix $ and ¥ in one total.
		if (this.currency && this.currency !== currency) {
			this.reset();
		}
		this.currency = currency;

		const promptTokens = Math.max(0, usage.prompt_tokens);
		const cachedTokens = Math.min(
			promptTokens,
			Math.max(0, usage.prompt_tokens_details?.cached_tokens ?? 0),
		);
		const completionTokens = Math.max(0, usage.completion_tokens);

		// Cache health spans the whole session, including requests we cannot price.
		this.totalPromptTokens += promptTokens;
		this.totalCachedPromptTokens += cachedTokens;

		const pricing = model?.pricing?.[currency];
		if (!pricing) {
			// Keep the cost total honest: this request is real but cannot be
			// priced, so record it as unbilled instead of silently dropping it.
			this.unbilledRequests += 1;
			this.unbilledModelIds.add(model?.id ?? unbilledModelId);
			return;
		}

		const nonCachedPromptTokens = promptTokens - cachedTokens;
		const cost =
			(nonCachedPromptTokens * pricing.cacheMissInput +
				cachedTokens * pricing.cacheHitInput +
				completionTokens * pricing.output) /
			TOKENS_PER_PRICING_UNIT;
		const cacheSavings =
			(cachedTokens * Math.max(0, pricing.cacheMissInput - pricing.cacheHitInput)) /
			TOKENS_PER_PRICING_UNIT;

		const entry = this.entries.get(model.id) ?? {
			modelName: model.name,
			requests: 0,
			promptTokens: 0,
			cachedPromptTokens: 0,
			completionTokens: 0,
			cost: 0,
			cacheSavings: 0,
		};
		entry.requests += 1;
		entry.promptTokens += promptTokens;
		entry.cachedPromptTokens += cachedTokens;
		entry.completionTokens += completionTokens;
		entry.cost += cost;
		entry.cacheSavings += cacheSavings;
		this.entries.set(model.id, entry);
		this.totalCost += cost;
		if (costTier === 'utility') {
			this.utilityCost += cost;
		} else {
			this.agentCost += cost;
		}
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
				cacheHitRate: getCacheHitRate(entry.promptTokens, entry.cachedPromptTokens),
				completionTokens: entry.completionTokens,
				cost: entry.cost,
				cacheSavings: entry.cacheSavings,
				averageCost: entry.requests > 0 ? entry.cost / entry.requests : 0,
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
			totalPromptTokens: this.totalPromptTokens,
			totalCachedPromptTokens: this.totalCachedPromptTokens,
			utilityCost: this.utilityCost,
			agentCost: this.agentCost,
			totalCacheSavings: items.reduce((sum, item) => sum + item.cacheSavings, 0),
		};
	}

	reset(): void {
		this.entries.clear();
		this.unbilledModelIds.clear();
		this.unbilledRequests = 0;
		this.totalPromptTokens = 0;
		this.totalCachedPromptTokens = 0;
		this.utilityCost = 0;
		this.agentCost = 0;
		this.totalCost = 0;
	}
}

function getCacheHitRate(promptTokens: number, cachedPromptTokens: number): number | undefined {
	if (promptTokens <= 0) {
		return undefined;
	}
	return Math.min(100, Math.max(0, (cachedPromptTokens / promptTokens) * 100));
}

/** Format a cost amount with its currency symbol (4 dp for sub-cent precision). */
export function formatSessionCost(amount: number, currency: PricingCurrency): string {
	const symbol = currency === 'CNY' ? '¥' : '$';
	return `${symbol}${amount.toFixed(4)}`;
}
