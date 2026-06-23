import vscode from 'vscode';
import { getDebugLoggingEnabled } from '../../config';
import { LANGUAGE_MODEL_CHAT_SYSTEM_ROLE, MODELS } from '../../consts';
import { logger } from '../../logger';
import type { LlmRequest, LlmUsage } from '../../types';
import {
	classifyLlmRequest,
	formatModelFields,
	formatRequestLogLine,
	type RequestKind,
} from '../routing';
import { REPLAY_MARKER_MIME } from '../replay';
import type { ConversationSegment } from '../segment';
import { ACTIVATE_TOOL_PREFIX } from '../tools/consts';
import type { ActivatePreflightInspection } from '../tools/preflight';
import { IMAGE_DESCRIPTION_UNAVAILABLE } from '../vision/consts';
import type { VisionProxySource, VisionResolutionStats as VisionPipelineStats } from '../vision';
import type { AudioProxySource, AudioResolutionStats as AudioPipelineStats } from '../audio';
import { compareCacheTraceSnapshots, createCacheTraceSnapshot } from './cache-trace-snapshot';
import {
	formatCacheTraceComparison,
	formatCacheTraceComparisonDetailLines,
	formatCacheTraceDetailLines,
	formatCacheTraceKeyChangeComparison,
	formatCacheTraceSnapshot,
	getCacheTraceComparisonWarnings,
	getCacheTraceInfoLines,
	getCacheTraceWarnings,
} from './cache-trace-format';
import type { CacheTraceComparison, CacheTraceSnapshot } from './cache-trace-types';
import {
	appendNumberIfNonZero,
	countLines,
	countLiteral,
	getPartConstructorName,
	hashString,
	isLanguageModelThinkingPart,
	normalizeThinkingPartValue,
} from './trace-utils';

const HOST_CACHE_CONTROL_MIME = 'cache_control';

export interface BeginCacheDiagnosticsOptions {
	request: LlmRequest;
	segment: ConversationSegment;
	requestKind?: RequestKind;
	vscodeModelId: string;
	isThinkingModel: boolean;
	thinkingEffort: string;
	maxTokens: number | undefined;
	inputMessages: readonly vscode.LanguageModelChatRequestMessage[];
	resolvedMessages: readonly vscode.LanguageModelChatRequestMessage[];
	visionModelId?: string;
	visionProxySource?: VisionProxySource;
	visionStats?: VisionPipelineStats;
	audioModelId?: string;
	audioProxySource?: AudioProxySource;
	audioStats?: AudioPipelineStats;
}

export interface CacheDiagnosticsDoneInfo {
	reasoningTextChars: number;
	emittedToolCalls: number;
	trailingToolResults: number;
}

export interface CacheDiagnosticsRun {
	onDone(info: CacheDiagnosticsDoneInfo): void;
	onCancellationTokenRequested(): void;
	onReplayMarkerReport(info: ReplayMarkerReportInfo): void;
	onUsage(usage: LlmUsage, charsPerToken: number): void;
}

export type ReplayMarkerReportStatus = 'reported' | 'failed' | 'skipped';

export type ReplayMarkerReportTrigger = 'done' | 'cancelled' | 'stream-error';

export interface ReplayMarkerReportInfo {
	status: ReplayMarkerReportStatus;
	trigger?: ReplayMarkerReportTrigger;
	markerBytes?: number;
	visionTextChars?: number;
	reasoningTextChars?: number;
	reason?: 'no-replay-data';
	error?: unknown;
}

export function observeCancellationToken(
	token: vscode.CancellationToken,
	diagnosticsRun: CacheDiagnosticsRun,
	onCancellationRequested?: () => void,
): vscode.Disposable {
	let notified = false;
	const notifyCancellationRequested = (): void => {
		if (notified) {
			return;
		}
		notified = true;
		diagnosticsRun.onCancellationTokenRequested();
		onCancellationRequested?.();
	};
	const listener = token.onCancellationRequested(notifyCancellationRequested);
	if (token.isCancellationRequested) {
		notifyCancellationRequested();
	}
	return listener;
}

export interface CacheDiagnosticsRecorder {
	isEnabled(): boolean;
	beginRequest(options: BeginCacheDiagnosticsOptions): CacheDiagnosticsRun;
}

export function createCacheDiagnosticsRecorder(): CacheDiagnosticsRecorder {
	return new DefaultCacheDiagnosticsRecorder();
}

export function logToolFlowDiagnostics({
	requestKind,
	tools,
	messagesFiltered,
	preflight,
	activatePreflight,
	nextRound,
	initialResponseNotice,
}: {
	requestKind: RequestKind;
	tools: readonly vscode.LanguageModelChatTool[] | undefined;
	messagesFiltered: boolean;
	preflight: 'skipped' | 'handled' | 'ready' | 'round-limit';
	activatePreflight?: ActivatePreflightInspection;
	nextRound?: number;
	initialResponseNotice?: boolean;
}): void {
	if (!getDebugLoggingEnabled()) {
		return;
	}

	const activateToolCount =
		tools?.reduce(
			(count, tool) => count + (tool.name.startsWith(ACTIVATE_TOOL_PREFIX) ? 1 : 0),
			0,
		) ?? 0;
	if (preflight === 'skipped' && !messagesFiltered && activateToolCount === 0) {
		return;
	}

	let message =
		`[tool-flow] preflight=${preflight}` +
		` tools=${tools?.length ?? 0}` +
		` activateTools=${activateToolCount}`;
	if (messagesFiltered) {
		message += ` messagesFiltered=true`;
	}
	if (activatePreflight) {
		message +=
			` preflightRounds=${activatePreflight.rounds}` +
			` calledActivators=${activatePreflight.calledActivatorNames.length}` +
			` remainingActivators=${activatePreflight.remainingActivatorNames.length}`;
	}
	if (nextRound !== undefined) {
		message += ` nextRound=${nextRound}`;
	}
	if (initialResponseNotice) {
		message += ` initialResponseNotice=true`;
	}

	logger.info(formatRequestLogLine(requestKind, message));
}

interface VisionMessageStats {
	inputImageParts: number;
	inputImageMessages: number;
	describedImageMessages: number;
	failedImageMessages: number;
	droppedImageParts: number;
	historyDescriptionMessages: number;
	visionModelId?: string;
	visionProxySource?: VisionProxySource;
}

interface HostPromptTrace {
	hostFreezeCustomizationsIndex: boolean | 'unknown';
	systemMessageIndex: number | null;
	systemRole: string | null;
	systemChars: number;
	systemLines: number;
	systemHash: string | null;
	hasSkillsTag: boolean;
	hasAgentsTag: boolean;
	skillTagCount: number;
	agentTagCount: number;
	customizationsUpdateCount: number;
	latestUserMessageIndex: number | null;
	latestUserHasCustomizationsUpdate: boolean;
}

interface UsageLogContext {
	vscodeModelId: string;
	apiModelId: string;
	requestKind: RequestKind;
}

class DefaultCacheDiagnosticsRecorder implements CacheDiagnosticsRecorder {
	private readonly previousCacheTraces = new Map<string, CacheTraceSnapshot>();
	private readonly lastCacheTracesByScope = new Map<string, CacheTraceSnapshot>();
	private lastCacheTrace: CacheTraceSnapshot | undefined;
	private requestId = 0;

	isEnabled(): boolean {
		return getDebugLoggingEnabled();
	}

	beginRequest(options: BeginCacheDiagnosticsOptions): CacheDiagnosticsRun {
		const requestKind =
			options.requestKind ??
			classifyLlmRequest({
				request: options.request,
				inputMessages: options.inputMessages,
			});

		if (!this.isEnabled()) {
			this.clearCacheTraces();
			return new NoopCacheDiagnosticsRun({
				vscodeModelId: options.vscodeModelId,
				apiModelId: options.request.model,
				requestKind,
			});
		}

		const requestId = (this.requestId += 1);
		const cacheTrace = createCacheTraceSnapshot(
			options.request,
			options.inputMessages,
			requestKind,
		);
		const previousCacheTrace = this.previousCacheTraces.get(getCacheTraceStoreKey(cacheTrace));
		const previousImmediateCacheTrace = this.lastCacheTrace;
		const previousScopedCacheTrace = this.lastCacheTracesByScope.get(
			getCacheTraceScopeKey(cacheTrace),
		);
		const cacheTraceComparison = compareCacheTraceSnapshots(previousCacheTrace, cacheTrace);
		const immediateTraceKeyChanged =
			previousImmediateCacheTrace?.cacheTraceKey !== undefined &&
			previousImmediateCacheTrace.cacheTraceKey !== cacheTrace.cacheTraceKey;
		const sameImmediateComparisonScope =
			previousImmediateCacheTrace !== undefined &&
			previousImmediateCacheTrace.requestKind === cacheTrace.requestKind &&
			previousImmediateCacheTrace.model === cacheTrace.model &&
			previousImmediateCacheTrace.toolsHash === cacheTrace.toolsHash;
		const traceKeyChangeComparison =
			previousImmediateCacheTrace && immediateTraceKeyChanged && sameImmediateComparisonScope
				? compareCacheTraceSnapshots(previousImmediateCacheTrace, cacheTrace)
				: undefined;
		const skippedImmediateFallback =
			previousImmediateCacheTrace && immediateTraceKeyChanged && !sameImmediateComparisonScope
				? previousImmediateCacheTrace
				: undefined;
		const scopedTraceKeyChangeComparison =
			!traceKeyChangeComparison &&
			previousScopedCacheTrace &&
			previousScopedCacheTrace !== previousImmediateCacheTrace &&
			previousScopedCacheTrace.cacheTraceKey !== cacheTrace.cacheTraceKey
				? compareCacheTraceSnapshots(previousScopedCacheTrace, cacheTrace)
				: undefined;
		const visionResolution = summarizeVisionResolution(
			options.inputMessages,
			options.resolvedMessages,
			options.visionModelId,
			options.visionProxySource,
		);

		logger.info(
			formatRequestLogLine(
				requestKind,
				`[cache-trace #${requestId}] ${formatCacheTraceSnapshot(cacheTrace)}`,
			),
		);
		logger.info(
			formatRequestLogLine(
				requestKind,
				`[cache-trace #${requestId}] request ` +
					formatModelFields(options.vscodeModelId, options.request.model) +
					formatSegmentTrace(options.segment) +
					` thinking=${options.isThinkingModel}` +
					` thinkingEffort=${options.thinkingEffort}` +
					` maxTokens=${options.maxTokens ?? 'api-default'}` +
					` inputMessages=${options.inputMessages.length}` +
					` llmMessages=${options.request.messages.length}`,
			),
		);
		const hostPromptTrace = summarizeHostPromptTrace(options.inputMessages);
		if (shouldLogHostPromptTrace(hostPromptTrace)) {
			logger.info(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] ${formatHostPromptTrace(hostPromptTrace)}`,
				),
			);
		}
		const vscodeMessageTrace = formatVscodeMessageTrace(options.inputMessages);
		if (vscodeMessageTrace) {
			logger.debug(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] vscodeMsgs ${vscodeMessageTrace}`,
				),
			);
		}
		for (const detailLine of formatCacheTraceDetailLines(cacheTrace)) {
			const message = formatRequestLogLine(
				requestKind,
				`[cache-trace #${requestId}] ${detailLine}`,
			);
			if (detailLine.startsWith('contentMarkers ')) {
				logger.debug(message);
			} else {
				logger.info(message);
			}
		}
		const visionTrace = formatVisionTrace(visionResolution, options.visionStats);
		if (visionTrace) {
			logger.info(formatRequestLogLine(requestKind, `[cache-trace #${requestId}] ${visionTrace}`));
		}
		if (cacheTraceComparison) {
			logger.info(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] ${formatCacheTraceComparison(cacheTraceComparison)}`,
				),
			);
			for (const detailLine of formatCacheTraceComparisonDetailLines(cacheTraceComparison)) {
				logger.info(formatRequestLogLine(requestKind, `[cache-trace #${requestId}] ${detailLine}`));
			}
			for (const warning of getCacheTraceComparisonWarnings(cacheTraceComparison)) {
				logger.warn(formatRequestLogLine(requestKind, `[cache-trace #${requestId}] ${warning}`));
			}
		}
		if (traceKeyChangeComparison && previousImmediateCacheTrace) {
			logger.info(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] ${formatCacheTraceKeyChangeComparison(
						previousImmediateCacheTrace.cacheTraceKey,
						cacheTrace.cacheTraceKey,
						traceKeyChangeComparison,
					)}`,
				),
			);
			for (const detailLine of formatCacheTraceComparisonDetailLines(traceKeyChangeComparison)) {
				logger.info(
					formatRequestLogLine(
						requestKind,
						`[cache-trace #${requestId}] cacheTraceKeyChanged ${detailLine}`,
					),
				);
			}
			for (const warning of getCacheTraceComparisonWarnings(traceKeyChangeComparison)) {
				logger.warn(
					formatRequestLogLine(
						requestKind,
						`[cache-trace #${requestId}] cacheTraceKeyChanged fallback diff: ${warning}`,
					),
				);
			}
		}
		if (skippedImmediateFallback) {
			logger.info(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] comparisonScopeChanged` +
						` prevKind=${skippedImmediateFallback.requestKind}` +
						` currKind=${cacheTrace.requestKind}` +
						` prevModel=${skippedImmediateFallback.model}` +
						` currModel=${cacheTrace.model}` +
						` toolsChanged=${skippedImmediateFallback.toolsHash !== cacheTrace.toolsHash}` +
						` cacheTraceKeyChanged=true skipFallbackDiff=true`,
				),
			);
		}
		if (scopedTraceKeyChangeComparison && previousScopedCacheTrace) {
			logger.info(
				formatRequestLogLine(
					requestKind,
					`[cache-trace #${requestId}] sameScope ${formatCacheTraceKeyChangeComparison(
						previousScopedCacheTrace.cacheTraceKey,
						cacheTrace.cacheTraceKey,
						scopedTraceKeyChangeComparison,
					)}`,
				),
			);
			for (const detailLine of formatCacheTraceComparisonDetailLines(
				scopedTraceKeyChangeComparison,
			)) {
				logger.info(
					formatRequestLogLine(
						requestKind,
						`[cache-trace #${requestId}] sameScope cacheTraceKeyChanged ${detailLine}`,
					),
				);
			}
			for (const warning of getCacheTraceComparisonWarnings(scopedTraceKeyChangeComparison)) {
				logger.warn(
					formatRequestLogLine(
						requestKind,
						`[cache-trace #${requestId}] sameScope cacheTraceKeyChanged fallback diff: ${warning}`,
					),
				);
			}
		}
		for (const warning of getCacheTraceWarnings(cacheTrace)) {
			logger.warn(formatRequestLogLine(requestKind, `[cache-trace #${requestId}] ${warning}`));
		}
		for (const infoLine of getCacheTraceInfoLines(cacheTrace)) {
			logger.info(formatRequestLogLine(requestKind, `[cache-trace #${requestId}] ${infoLine}`));
		}

		return new ActiveCacheDiagnosticsRun(
			this,
			requestId,
			cacheTrace,
			{
				vscodeModelId: options.vscodeModelId,
				apiModelId: options.request.model,
				requestKind,
			},
			cacheTraceComparison ?? traceKeyChangeComparison ?? scopedTraceKeyChangeComparison,
			cacheTraceComparison
				? 'summaryPrefixVsPrevious'
				: scopedTraceKeyChangeComparison
					? 'sameScopeFallbackSummaryPrefixVsPrevious'
					: 'fallbackSummaryPrefixVsPrevious',
		);
	}

	private clearCacheTraces(): void {
		this.lastCacheTrace = undefined;
		this.previousCacheTraces.clear();
		this.lastCacheTracesByScope.clear();
	}

	rememberCacheTrace(snapshot: CacheTraceSnapshot): void {
		this.lastCacheTrace = snapshot;
		this.lastCacheTracesByScope.set(getCacheTraceScopeKey(snapshot), snapshot);
		while (this.lastCacheTracesByScope.size > 50) {
			const oldestKey = this.lastCacheTracesByScope.keys().next().value;
			if (!oldestKey) {
				break;
			}
			this.lastCacheTracesByScope.delete(oldestKey);
		}

		const cacheTraceStoreKey = getCacheTraceStoreKey(snapshot);
		this.previousCacheTraces.delete(cacheTraceStoreKey);
		this.previousCacheTraces.set(cacheTraceStoreKey, snapshot);

		while (this.previousCacheTraces.size > 50) {
			const oldestKey = this.previousCacheTraces.keys().next().value;
			if (!oldestKey) {
				break;
			}
			this.previousCacheTraces.delete(oldestKey);
		}
	}
}

function getCacheTraceStoreKey(snapshot: CacheTraceSnapshot): string {
	return `${snapshot.requestKind}:${snapshot.cacheTraceKey}`;
}

function getCacheTraceScopeKey(snapshot: CacheTraceSnapshot): string {
	return `${snapshot.requestKind}:${snapshot.model}:${snapshot.toolsHash}`;
}

class ActiveCacheDiagnosticsRun implements CacheDiagnosticsRun {
	private cancellationLogged = false;

	constructor(
		private readonly recorder: DefaultCacheDiagnosticsRecorder,
		private readonly requestId: number,
		private readonly snapshot: CacheTraceSnapshot,
		private readonly usageLogContext: UsageLogContext,
		private readonly resultComparison: CacheTraceComparison | undefined,
		private readonly prefixLabel: string,
	) {}

	onDone(info: CacheDiagnosticsDoneInfo): void {
		if (info.emittedToolCalls > 0 || info.trailingToolResults > 0) {
			logger.info(
				formatRequestLogLine(
					this.snapshot.requestKind,
					`[cache-trace #${this.requestId}] stream done reasoningTextChars=${info.reasoningTextChars}` +
						` emittedToolCalls=${info.emittedToolCalls}` +
						` trailingToolResults=${info.trailingToolResults}`,
				),
			);
		}
		this.recorder.rememberCacheTrace(this.snapshot);
	}

	onUsage(usage: LlmUsage, charsPerToken: number): void {
		logUsage(usage, charsPerToken, this.usageLogContext, this.requestId);
		if (this.resultComparison) {
			const hitRate = getCacheHitRate(usage);
			logger.info(
				formatRequestLogLine(
					this.snapshot.requestKind,
					`[cache-trace #${this.requestId}] result cacheRate=${hitRate}%` +
						` ${this.prefixLabel}=${this.resultComparison.commonPrefixSummaryChars}` +
						` chars (${this.resultComparison.commonPrefixSummaryPercent.toFixed(1)}%)`,
				),
			);
		}
	}

	onCancellationTokenRequested(): void {
		if (this.cancellationLogged) {
			return;
		}
		this.cancellationLogged = true;
		logger.info(
			formatRequestLogLine(
				this.snapshot.requestKind,
				`[cache-trace #${this.requestId}] cancellation token requested; aborting stream`,
			),
		);
	}

	onReplayMarkerReport(info: ReplayMarkerReportInfo): void {
		logger.info(
			formatRequestLogLine(
				this.snapshot.requestKind,
				`[cache-trace #${this.requestId}] ${formatReplayMarkerReport(info)}`,
			),
		);
	}
}

class NoopCacheDiagnosticsRun implements CacheDiagnosticsRun {
	constructor(private readonly usageLogContext: UsageLogContext) {}

	onDone(_info: CacheDiagnosticsDoneInfo): void {}

	onCancellationTokenRequested(): void {}

	onReplayMarkerReport(_info: ReplayMarkerReportInfo): void {}

	onUsage(usage: LlmUsage, charsPerToken: number): void {
		logUsage(usage, charsPerToken, this.usageLogContext);
	}
}

function formatSegmentTrace(segment: ConversationSegment): string {
	let legacyMarker = '';
	if (segment.reason === 'markerFound') {
		legacyMarker = ' legacySegmentMarker=found';
	} else if (segment.reason === 'markerInvalid') {
		const markerLocation =
			segment.markerMessageIndex === undefined || segment.markerPartIndex === undefined
				? ''
				: ` at=message#${segment.markerMessageIndex}:part#${segment.markerPartIndex}`;
		const markerError = segment.markerError ? ` error=${segment.markerError}` : '';
		legacyMarker = ` legacySegmentMarker=invalid${markerLocation}${markerError}`;
	}
	return ` dumpSegment=${segment.segmentId}${legacyMarker}`;
}

function formatReplayMarkerReport(info: ReplayMarkerReportInfo): string {
	const trigger = info.trigger ? ` trigger=${info.trigger}` : '';
	const markerBytes = info.markerBytes === undefined ? '' : ` markerBytes=${info.markerBytes}`;
	const visionTextChars =
		info.visionTextChars === undefined ? '' : ` visionTextChars=${info.visionTextChars}`;
	const reasoningTextChars =
		info.reasoningTextChars === undefined ? '' : ` reasoningTextChars=${info.reasoningTextChars}`;
	const reason = info.reason ? ` reason=${info.reason}` : '';
	const error = info.error ? ` error=${formatError(info.error)}` : '';
	return (
		`replayMarker status=${info.status}` +
		trigger +
		markerBytes +
		visionTextChars +
		reasoningTextChars +
		reason +
		error
	);
}

function summarizeHostPromptTrace(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): HostPromptTrace {
	let customizationsUpdateCount = 0;
	let latestUserMessageIndex: number | null = null;
	let latestUserHasCustomizationsUpdate = false;

	for (const [index, message] of messages.entries()) {
		const text = getMessageText(message);
		customizationsUpdateCount += countLiteral(text, '<customizationsUpdate>');
		if (message.role === vscode.LanguageModelChatMessageRole.User) {
			latestUserMessageIndex = index;
			latestUserHasCustomizationsUpdate = text.includes('<customizationsUpdate>');
		}
	}

	const systemMessage = messages[0];
	const systemText = systemMessage ? getMessageText(systemMessage) : '';

	return {
		hostFreezeCustomizationsIndex: getHostFreezeCustomizationsIndex(),
		systemMessageIndex: systemMessage ? 0 : null,
		systemRole: systemMessage ? formatVscodeMessageRole(systemMessage.role) : null,
		systemChars: systemText.length,
		systemLines: countLines(systemText),
		systemHash: systemMessage ? hashString(systemText) : null,
		hasSkillsTag: systemText.includes('<skills>'),
		hasAgentsTag: systemText.includes('<agents>'),
		skillTagCount: countLiteral(systemText, '<skill>'),
		agentTagCount: countLiteral(systemText, '<agent>'),
		customizationsUpdateCount,
		latestUserMessageIndex,
		latestUserHasCustomizationsUpdate,
	};
}

function getHostFreezeCustomizationsIndex(): boolean | 'unknown' {
	const value = vscode.workspace
		.getConfiguration('github.copilot.chat')
		.get<unknown>('freezeCustomizationsIndex');
	return typeof value === 'boolean' ? value : 'unknown';
}

function formatHostPromptTrace(trace: HostPromptTrace): string {
	const systemPrompt =
		trace.systemMessageIndex === null
			? 'systemPrompt=none'
			: `systemPrompt#${trace.systemMessageIndex}:${trace.systemRole}` +
				`:chars=${trace.systemChars}` +
				`:lines=${trace.systemLines}` +
				`:hash=${trace.systemHash ?? 'none'}` +
				`:skills=${formatYesNo(trace.hasSkillsTag)}(${trace.skillTagCount})` +
				`:agents=${formatYesNo(trace.hasAgentsTag)}(${trace.agentTagCount})`;

	return (
		`hostFreezeCustomizationsIndex=${trace.hostFreezeCustomizationsIndex}` +
		` ${systemPrompt}` +
		` customizationsUpdate=${trace.customizationsUpdateCount}` +
		` latestUser#${trace.latestUserMessageIndex ?? 'none'}=` +
		formatYesNo(trace.latestUserHasCustomizationsUpdate)
	);
}

function shouldLogHostPromptTrace(trace: HostPromptTrace): boolean {
	return trace.customizationsUpdateCount > 0 || trace.latestUserHasCustomizationsUpdate;
}

function formatYesNo(value: boolean): 'yes' | 'no' {
	return value ? 'yes' : 'no';
}

function formatError(error: unknown): string {
	if (error instanceof Error) {
		return sanitizeLogValue(error.message || error.name);
	}
	if (typeof error === 'string') {
		return sanitizeLogValue(error);
	}
	return sanitizeLogValue(String(error));
}

function sanitizeLogValue(value: string): string {
	return value.replace(/\s+/g, ' ').slice(0, 200);
}

function logUsage(
	usage: LlmUsage,
	charsPerToken: number,
	context: UsageLogContext,
	requestId?: number,
): void {
	const cacheHit = usage.prompt_tokens_details?.cached_tokens ?? 0;
	const cacheMiss = Math.max(0, usage.prompt_tokens - cacheHit);
	logger.info(
		formatRequestLogLine(
			context.requestKind,
			`tokens${requestId ? ` #${requestId}` : ''}: ` +
				formatModelFields(context.vscodeModelId, context.apiModelId) +
				` prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}` +
				` | cache: hit=${cacheHit} miss=${cacheMiss} rate=${getCacheHitRate(usage)}%` +
				` | chars/tok=${charsPerToken.toFixed(2)}` +
				formatUsageCost(context.vscodeModelId, usage),
		),
	);
}

function getCacheHitRate(usage: LlmUsage): string {
	const cacheHit = usage.prompt_tokens_details?.cached_tokens ?? 0;
	const cacheTotal = usage.prompt_tokens;
	return cacheTotal > 0 ? ((cacheHit / cacheTotal) * 100).toFixed(0) : 'n/a';
}

const TOKENS_PER_PRICING_UNIT = 1_000_000;

function getLocaleDisplayCurrency(): 'USD' | 'CNY' {
	return vscode.env.language.toLowerCase().startsWith('zh') ? 'CNY' : 'USD';
}

function formatUsageCost(modelId: string, usage: LlmUsage): string {
	const model = MODELS.find(m => m.id === modelId);
	if (!model?.pricing) {
		return '';
	}

	const currency = getLocaleDisplayCurrency();
	const pricing = model.pricing[currency];
	if (!pricing) {
		return '';
	}

	const cacheHit = usage.prompt_tokens_details?.cached_tokens ?? 0;
	const cacheMiss = Math.max(0, usage.prompt_tokens - cacheHit);
	const cost =
		(cacheMiss * pricing.cacheMissInput +
			cacheHit * pricing.cacheHitInput +
			usage.completion_tokens * pricing.output) /
		TOKENS_PER_PRICING_UNIT;

	const symbol = currency === 'CNY' ? '¥' : '$';
	return ` | cost=${symbol}${cost.toFixed(4)}`;
}

function summarizeVisionResolution(
	inputMessages: readonly vscode.LanguageModelChatRequestMessage[],
	resolvedMessages: readonly vscode.LanguageModelChatRequestMessage[],
	visionModelId: string | undefined,
	visionProxySource: VisionProxySource | undefined,
): VisionMessageStats {
	const stats: VisionMessageStats = {
		inputImageParts: 0,
		inputImageMessages: 0,
		describedImageMessages: 0,
		failedImageMessages: 0,
		droppedImageParts: 0,
		historyDescriptionMessages: 0,
		visionModelId,
		visionProxySource,
	};

	for (const [index, message] of inputMessages.entries()) {
		const imageParts = countImageDataParts(message);
		const inputText = getMessageText(message);
		if (countLiteral(inputText, '[Image Description:') > 0) {
			stats.historyDescriptionMessages += 1;
		}

		if (imageParts > 0) {
			stats.inputImageMessages += 1;
			stats.inputImageParts += imageParts;

			const resolvedMessage = resolvedMessages[index];
			const resolvedImageParts = resolvedMessage ? countImageDataParts(resolvedMessage) : 0;
			const resolvedText = resolvedMessage ? getMessageText(resolvedMessage) : '';
			const newDescriptions = Math.max(
				0,
				countLiteral(resolvedText, '[Image Description:') -
					countLiteral(inputText, '[Image Description:'),
			);
			const newFailures = Math.max(
				0,
				countLiteral(resolvedText, IMAGE_DESCRIPTION_UNAVAILABLE) -
					countLiteral(inputText, IMAGE_DESCRIPTION_UNAVAILABLE),
			);

			if (newDescriptions > 0) {
				stats.describedImageMessages += 1;
			}
			if (newFailures > 0) {
				stats.failedImageMessages += 1;
			}
			if (resolvedImageParts < imageParts && newDescriptions === 0 && newFailures === 0) {
				stats.droppedImageParts += imageParts - resolvedImageParts;
			}
		}
	}

	return stats;
}

function countImageDataParts(message: vscode.LanguageModelChatRequestMessage): number {
	return message.content.filter((part) => isImageDataPart(part)).length;
}

function isImageDataPart(part: unknown): part is vscode.LanguageModelDataPart {
	return part instanceof vscode.LanguageModelDataPart && part.mimeType.startsWith('image/');
}

function getMessageText(message: vscode.LanguageModelChatRequestMessage): string {
	let text = '';
	for (const part of message.content) {
		if (part instanceof vscode.LanguageModelTextPart) {
			text += part.value;
		}
	}
	return text;
}

function formatVisionTrace(
	stats: VisionMessageStats,
	pipelineStats: VisionPipelineStats | undefined,
): string | undefined {
	if (
		stats.inputImageParts === 0 &&
		stats.historyDescriptionMessages === 0 &&
		!hasVisionPipelineActivity(pipelineStats)
	) {
		return undefined;
	}

	const note =
		stats.inputImageParts === 0 && stats.historyDescriptionMessages > 0 ? ' note=history-only' : '';
	const visionModel = formatVisionModel(stats);
	const parts = [
		`vision inputImages=${stats.inputImageParts}`,
		`inputMessages=${stats.inputImageMessages}`,
	];

	if (pipelineStats && hasVisionPipelineActivity(pipelineStats)) {
		parts.push(
			`current=${pipelineStats.currentImageMessages}`,
			`generated=${pipelineStats.generatedImageMessages}`,
			`replayed=${pipelineStats.replayedImageMessages}`,
			`omitted=${pipelineStats.omittedImageMessages}`,
			`droppedParts=${pipelineStats.droppedImageParts}`,
		);
		appendNumberIfNonZero(parts, 'unavailable', pipelineStats.unavailableImageMessages);
		appendNumberIfNonZero(parts, 'failed', pipelineStats.failedImageMessages);
		appendNumberIfNonZero(parts, 'markerChars', pipelineStats.markerVisionTextChars);
		appendNumberIfNonZero(parts, 'invalidMarkerVision', pipelineStats.invalidMarkerVisionMetadata);
	} else {
		appendNumberIfNonZero(parts, 'generated', stats.describedImageMessages);
		appendNumberIfNonZero(parts, 'failed', stats.failedImageMessages);
		appendNumberIfNonZero(parts, 'droppedParts', stats.droppedImageParts);
	}

	parts.push(`model=${visionModel}`);
	if (stats.visionProxySource) {
		parts.push(`source=${stats.visionProxySource}`);
	}
	appendNumberIfNonZero(parts, 'historyDescriptions', stats.historyDescriptionMessages);
	return parts.join(' ') + note;
}

function hasVisionPipelineActivity(stats: VisionPipelineStats | undefined): boolean {
	if (!stats) {
		return false;
	}
	return (
		stats.inputImageParts > 0 ||
		stats.currentImageMessages > 0 ||
		stats.generatedImageMessages > 0 ||
		stats.replayedImageMessages > 0 ||
		stats.omittedImageMessages > 0 ||
		stats.unavailableImageMessages > 0 ||
		stats.failedImageMessages > 0 ||
		stats.invalidMarkerVisionMetadata > 0
	);
}

function formatVisionModel(stats: VisionMessageStats): string {
	if (stats.visionModelId) {
		return stats.visionModelId;
	}
	if (stats.inputImageParts === 0) {
		return 'none';
	}
	if (
		stats.droppedImageParts > 0 &&
		stats.describedImageMessages === 0 &&
		stats.failedImageMessages === 0
	) {
		return 'none';
	}
	return 'unknown';
}

function formatVscodeMessageTrace(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): string | undefined {
	if (messages.length === 0) {
		return undefined;
	}

	let hasInterestingParts = false;
	const traces = messages.map((msg, index) => {
		const role = formatVscodeMessageRole(msg.role);
		let textChars = 0;
		let imageParts = 0;
		let toolCallParts = 0;
		let toolResultParts = 0;
		let thinkingParts = 0;
		let thinkingChars = 0;
		let replayMarkerParts = 0;
		let hostCacheControlParts = 0;
		const dataPartMimes = new Map<string, number>();
		const thinkingValueTypes = new Set<string>();
		const thinkingHashes: string[] = [];
		const unknownPartConstructors = new Map<string, number>();

		for (const part of msg.content) {
			if (part instanceof vscode.LanguageModelTextPart) {
				textChars += part.value.length;
			} else if (part instanceof vscode.LanguageModelDataPart) {
				if (part.mimeType.startsWith('image/')) {
					imageParts += 1;
				} else if (part.mimeType === REPLAY_MARKER_MIME) {
					replayMarkerParts += 1;
				} else if (part.mimeType === HOST_CACHE_CONTROL_MIME) {
					hostCacheControlParts += 1;
				} else {
					dataPartMimes.set(part.mimeType, (dataPartMimes.get(part.mimeType) ?? 0) + 1);
				}
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				toolCallParts += 1;
			} else if (part instanceof vscode.LanguageModelToolResultPart) {
				toolResultParts += 1;
			} else if (isLanguageModelThinkingPart(part)) {
				const value = normalizeThinkingPartValue(part.value);
				thinkingParts += 1;
				thinkingChars += value.text.length;
				thinkingValueTypes.add(value.type);
				thinkingHashes.push(hashString(value.text));
			} else {
				const constructorName = getPartConstructorName(part);
				unknownPartConstructors.set(
					constructorName,
					(unknownPartConstructors.get(constructorName) ?? 0) + 1,
				);
			}
		}

		const parts: string[] = [];
		if (imageParts) {
			parts.push(`image=${imageParts}`);
		}
		if (toolCallParts) {
			parts.push(`toolCalls=${toolCallParts}`);
		}
		if (toolResultParts) {
			parts.push(`toolResults=${toolResultParts}`);
		}
		if (thinkingParts) {
			parts.push(
				`thinking=${thinkingParts}:chars=${thinkingChars}:types=${[...thinkingValueTypes].join(
					'+',
				)}:hashes=${thinkingHashes.join(',')}`,
			);
		}
		if (replayMarkerParts) {
			parts.push(`replayMarker=${replayMarkerParts}`);
		}
		for (const [mimeType, count] of dataPartMimes) {
			parts.push(`data=${mimeType}:${count}`);
		}
		if (hostCacheControlParts > 1) {
			parts.push(`cacheControl=${hostCacheControlParts}`);
		}
		for (const [constructorName, count] of unknownPartConstructors) {
			parts.push(`unknown=${constructorName}:${count}`);
		}

		const suffix = parts.length > 0 ? ` (${parts.join(',')})` : '';
		if (parts.length > 0) {
			hasInterestingParts = true;
		}

		return `${role}#${index}:chars=${textChars}${suffix}`;
	});

	return hasInterestingParts ? traces.join(' | ') : undefined;
}

function formatVscodeMessageRole(role: vscode.LanguageModelChatMessageRole): string {
	if (role === vscode.LanguageModelChatMessageRole.User) return 'user';
	if (role === vscode.LanguageModelChatMessageRole.Assistant) return 'assistant';
	if (role === LANGUAGE_MODEL_CHAT_SYSTEM_ROLE) return 'system';
	return 'unknown';
}
