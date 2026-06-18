import type { ReasoningReplayScope } from '../../config';
import { isUtilityRequestKind, type RequestKind } from '../routing';
import type { SessionCostSummary } from './session';

export type SessionOptimizationHintId =
	| 'sort-tools-for-cache'
	| 'stabilize-tool-list'
	| 'latest-tool-loop'
	| 'utility-cost-control';

export interface SessionOptimizationSignals {
	readonly requestKind: RequestKind;
	readonly toolCount: number;
	readonly toolsChanged: boolean;
	readonly hasUnexpandedActivateTools: boolean;
	readonly sortToolsForCacheEnabled: boolean;
	readonly stabilizeToolListEnabled: boolean;
	readonly replayReasoningScope: ReasoningReplayScope;
}

const LOW_CACHE_HIT_RATE_PERCENT = 50;
const HIGH_CACHE_HIT_RATE_PERCENT = 70;
const MIN_PROMPT_TOKENS_FOR_CACHE_HINTS = 1_000;
const LONG_SESSION_PROMPT_TOKENS = 200_000;
const TOOL_LIST_HINT_THRESHOLD = 64;
const UTILITY_COST_SHARE_THRESHOLD = 0.2;

/**
 * Pick actionable, session-scoped suggestions from aggregate cost/cache signals.
 * This intentionally consumes only counts, ratios, and request kinds so it can
 * be shown to users without exposing prompts, tool arguments, or secrets.
 */
export function selectSessionOptimizationHints(
	summary: SessionCostSummary,
	signals: SessionOptimizationSignals | undefined,
): SessionOptimizationHintId[] {
	const hints: SessionOptimizationHintId[] = [];
	const cacheHitRate = getSessionCacheHitRate(summary);

	if (
		signals &&
		!signals.sortToolsForCacheEnabled &&
		signals.toolsChanged &&
		isLowCacheHitRate(summary, cacheHitRate)
	) {
		hints.push('sort-tools-for-cache');
	}

	if (
		signals &&
		!signals.stabilizeToolListEnabled &&
		isLowCacheHitRate(summary, cacheHitRate) &&
		(signals.hasUnexpandedActivateTools || signals.toolCount > TOOL_LIST_HINT_THRESHOLD)
	) {
		hints.push('stabilize-tool-list');
	}

	if (
		signals &&
		signals.replayReasoningScope === 'all' &&
		summary.totalPromptTokens >= LONG_SESSION_PROMPT_TOKENS &&
		cacheHitRate !== undefined &&
		cacheHitRate >= HIGH_CACHE_HIT_RATE_PERCENT
	) {
		hints.push('latest-tool-loop');
	}

	if (
		signals &&
		isUtilityRequestKind(signals.requestKind) &&
		summary.utilityCost > 0 &&
		summary.totalCost > 0 &&
		summary.utilityCost / summary.totalCost >= UTILITY_COST_SHARE_THRESHOLD
	) {
		hints.push('utility-cost-control');
	}

	return hints;
}

function isLowCacheHitRate(summary: SessionCostSummary, cacheHitRate: number | undefined): boolean {
	return (
		summary.totalPromptTokens >= MIN_PROMPT_TOKENS_FOR_CACHE_HINTS &&
		cacheHitRate !== undefined &&
		cacheHitRate < LOW_CACHE_HIT_RATE_PERCENT
	);
}

function getSessionCacheHitRate(summary: SessionCostSummary): number | undefined {
	if (summary.totalPromptTokens <= 0) {
		return undefined;
	}
	return Math.min(
		100,
		Math.max(0, (summary.totalCachedPromptTokens / summary.totalPromptTokens) * 100),
	);
}
