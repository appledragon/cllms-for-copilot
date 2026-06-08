import type {
	CacheTraceComparison,
	CacheTraceContentSectionSummary,
	CacheTraceMessageSummary,
	CacheTraceSnapshot,
	CacheTraceSystemPromptChange,
	CacheTraceToolSummary,
} from './cache-trace-types';
import { appendNumberIfNonZero } from './trace-utils';

export function formatCacheTraceSnapshot(snapshot: CacheTraceSnapshot): string {
	const stats = snapshot.stats;
	const parts = [
		`fingerprint=${snapshot.fingerprint}`,
		`cacheTraceKey=${snapshot.cacheTraceKey}`,
		`messages=${stats.messageCount}`,
		`roles(user=${stats.userMessages},assistant=${stats.assistantMessages},tool=${stats.toolMessages},system=${stats.systemMessages})`,
		`tools=${stats.toolCount}`,
		`chars(content=${stats.totalContentChars},toolArgs=${stats.toolCallArgumentChars},reasoning=${stats.reasoningChars})`,
	];

	if (
		stats.assistantToolCallMessages > 0 ||
		stats.nonEmptyToolReasoningMessages > 0 ||
		stats.emptyToolReasoningMessages > 0 ||
		stats.missingToolReasoningMessages > 0
	) {
		parts.push(
			`toolReasoning(messages=${stats.assistantToolCallMessages},nonEmpty=${stats.nonEmptyToolReasoningMessages},empty=${stats.emptyToolReasoningMessages},missing=${stats.missingToolReasoningMessages})`,
		);
	}

	if (
		stats.assistantAfterToolResultMessages > 0 ||
		stats.nonEmptyPostToolReasoningMessages > 0 ||
		stats.emptyPostToolReasoningMessages > 0 ||
		stats.missingPostToolReasoningMessages > 0
	) {
		parts.push(
			`postToolReasoning(messages=${stats.assistantAfterToolResultMessages},toolCall=${stats.assistantAfterToolResultToolCallMessages},final=${stats.assistantAfterToolResultFinalMessages},nonEmpty=${stats.nonEmptyPostToolReasoningMessages},empty=${stats.emptyPostToolReasoningMessages},missing=${stats.missingPostToolReasoningMessages})`,
		);
	}

	appendNumberIfNonZero(parts, 'imageDescriptions', stats.imageDescriptionMessages);
	appendNumberIfNonZero(parts, 'largeMessages', stats.largeMessages);
	return parts.join(' ');
}

export function formatCacheTraceDetailLines(snapshot: CacheTraceSnapshot): string[] {
	const stats = snapshot.stats;
	const lines: string[] = [];
	if (stats.imageDescriptionParts > 0 || stats.unableImageMessages > 0) {
		lines.push(
			`imageText imageDescMsgs=${stats.imageDescriptionMessages}` +
				` imageDescParts=${stats.imageDescriptionParts}` +
				` unableImageMsgs=${stats.unableImageMessages}`,
		);
	}
	if (stats.urlMessages > 0 || stats.codeFenceMessages > 0) {
		lines.push(
			`contentMarkers urlMsgs=${stats.urlMessages}` +
				` urlCount=${stats.urlCount}` +
				` codeFenceMsgs=${stats.codeFenceMessages}` +
				` codeFenceCount=${stats.codeFenceCount}`,
		);
	}
	return lines;
}

export function formatCacheTraceComparison(comparison: CacheTraceComparison): string {
	const changedMessage =
		comparison.firstChangedMessageIndex === undefined
			? 'none'
			: `${comparison.firstChangedMessageIndex} prev=${formatMessageSummary(
					comparison.previousMessage,
				)} curr=${formatMessageSummary(comparison.currentMessage)}`;
	const changedTool = comparison.toolsChanged
		? ` toolsHash=${comparison.previousToolsHash}->${comparison.currentToolsHash}` +
			` firstChangedTool=${formatChangedTool(comparison)}`
		: '';

	return (
		`summaryPrefixVsPrevious chars=${comparison.commonPrefixSummaryChars}` +
		` percent=${comparison.commonPrefixSummaryPercent.toFixed(1)}%` +
		` toolsChanged=${comparison.toolsChanged}` +
		changedTool +
		` firstChangedMessage=${changedMessage}`
	);
}

export function formatCacheTraceKeyChangeComparison(
	previousCacheTraceKey: string,
	currentCacheTraceKey: string,
	comparison: CacheTraceComparison,
): string {
	const changedMessage =
		comparison.firstChangedMessageIndex === undefined
			? 'none'
			: `${comparison.firstChangedMessageIndex} prev=${formatMessageSummary(
					comparison.previousMessage,
				)} curr=${formatMessageSummary(comparison.currentMessage)}`;
	const changedTool = comparison.toolsChanged
		? ` toolsHash=${comparison.previousToolsHash}->${comparison.currentToolsHash}` +
			` firstChangedTool=${formatChangedTool(comparison)}`
		: '';

	return (
		`cacheTraceKeyChanged=true prev=${previousCacheTraceKey} curr=${currentCacheTraceKey}` +
		` fallbackSummaryPrefixVsPrevious chars=${comparison.commonPrefixSummaryChars}` +
		` percent=${comparison.commonPrefixSummaryPercent.toFixed(1)}%` +
		` toolsChanged=${comparison.toolsChanged}` +
		changedTool +
		` firstChangedMessage=${changedMessage}`
	);
}

export function formatCacheTraceComparisonDetailLines(comparison: CacheTraceComparison): string[] {
	if (
		comparison.firstChangedMessageIndex === undefined ||
		!comparison.previousMessage ||
		!comparison.currentMessage
	) {
		return [];
	}

	const previous = comparison.previousMessage;
	const current = comparison.currentMessage;
	return [
		`changedMessage position=index${comparison.firstChangedMessageIndex}` +
			` fromEndPrev=${comparison.previousMessageCount - comparison.firstChangedMessageIndex - 1}` +
			` fromEndCurr=${comparison.currentMessageCount - comparison.firstChangedMessageIndex - 1}` +
			` delta(chars=${current.contentChars - previous.contentChars}` +
			`,lines=${current.contentLines - previous.contentLines}` +
			`,toolArgs=${current.toolCallArgumentChars - previous.toolCallArgumentChars}` +
			`,reasoning=${current.reasoningChars - previous.reasoningChars})`,
	];
}

export function getCacheTraceWarnings(snapshot: CacheTraceSnapshot): string[] {
	const warnings: string[] = [];
	if (!snapshot.requiresReasoningContent) {
		return warnings;
	}
	if (snapshot.stats.missingToolReasoningMessages > 0) {
		warnings.push(
			`${snapshot.stats.missingToolReasoningMessages} assistant tool-call message(s) are missing marker-replayed reasoning_content; Qwen requires this in thinking tool-call histories and cache prefixes may drift.`,
		);
	}
	if (snapshot.stats.missingPostToolCallReasoningMessages > 0) {
		warnings.push(
			`${snapshot.stats.missingPostToolCallReasoningMessages} assistant tool-call message(s) after tool results are missing marker-replayed reasoning_content.`,
		);
	}
	if (snapshot.stats.missingPostToolFinalReasoningMessages > 0) {
		warnings.push(
			`${snapshot.stats.missingPostToolFinalReasoningMessages} final assistant message(s) after tool results are missing marker-replayed reasoning_content.`,
		);
	}
	const recoveryLostEmptyMessages = countEmptyReasoningFallbackMessages(snapshot, 'recovery-lost');
	if (recoveryLostEmptyMessages > 0) {
		warnings.push(
			`${recoveryLostEmptyMessages} reasoning-required assistant message reference(s) have empty reasoning_content fallback despite a non-empty VS Code thinking/replay marker source; marker replay may have failed.`,
		);
	}
	const unknownEmptyMessages = countEmptyReasoningFallbackMessages(snapshot, 'unknown');
	if (unknownEmptyMessages > 0) {
		warnings.push(
			`${unknownEmptyMessages} reasoning-required assistant message reference(s) have empty reasoning_content fallback; unable to classify whether the original VS Code message had recoverable reasoning data.`,
		);
	}
	return warnings;
}

export function getCacheTraceInfoLines(snapshot: CacheTraceSnapshot): string[] {
	const infoLines: string[] = [];
	if (!snapshot.requiresReasoningContent) {
		return infoLines;
	}
	const upstreamEmptyMessages = countEmptyReasoningFallbackMessages(
		snapshot,
		'upstream-no-reasoning',
	);
	if (upstreamEmptyMessages > 0) {
		infoLines.push(
			`${upstreamEmptyMessages} reasoning-required assistant message reference(s) have empty reasoning_content fallback because the original VS Code assistant message had no non-empty thinking/replay marker source; likely upstream returned no usable reasoning_content.`,
		);
	}
	return infoLines;
}

type EmptyReasoningFallbackCause = 'upstream-no-reasoning' | 'recovery-lost' | 'unknown';

function countEmptyReasoningFallbackMessages(
	snapshot: CacheTraceSnapshot,
	cause: EmptyReasoningFallbackCause,
): number {
	let count = 0;
	let assistantOrdinal = 0;
	for (const message of snapshot.messageSummaries) {
		if (message.role !== 'assistant') {
			continue;
		}
		if (
			isReasoningRequiredEmptyFallback(message) &&
			classifyEmptyReasoningFallback(snapshot, assistantOrdinal) === cause
		) {
			count += 1;
		}
		assistantOrdinal += 1;
	}
	return count;
}

function isReasoningRequiredEmptyFallback(message: CacheTraceMessageSummary): boolean {
	return (
		message.emptyReasoning && (message.toolCalls > 0 || message.afterToolResultKind === 'final')
	);
}

function classifyEmptyReasoningFallback(
	snapshot: CacheTraceSnapshot,
	assistantOrdinal: number,
): EmptyReasoningFallbackCause {
	const inputAssistant = snapshot.inputAssistantSummaries[assistantOrdinal];
	if (!inputAssistant) {
		return 'unknown';
	}
	if (
		inputAssistant.thinkingChars > 0 ||
		inputAssistant.replayMarkerReasoningChars > 0 ||
		inputAssistant.replayMarkerInvalid
	) {
		return 'recovery-lost';
	}
	return 'upstream-no-reasoning';
}

export function getCacheTraceComparisonWarnings(comparison: CacheTraceComparison): string[] {
	const warnings: string[] = [];
	if (
		comparison.firstChangedMessageIndex !== undefined &&
		comparison.previousMessage &&
		comparison.currentMessage
	) {
		const previousMessagesAfterChange =
			comparison.previousMessageCount - comparison.firstChangedMessageIndex - 1;
		if (comparison.systemPromptChange) {
			warnings.push(
				`system prompt changed; ${formatSystemPromptChange(comparison.systemPromptChange)}.`,
			);
		}
		if (previousMessagesAfterChange > 2) {
			warnings.push(
				`retained history changed before the append boundary at message #${comparison.firstChangedMessageIndex}; ${previousMessagesAfterChange} previous message(s) after it cannot share an identical request prefix.`,
			);
		}
	}
	if (comparison.toolsChanged) {
		warnings.push(
			`tool schema changed; firstChangedTool=${formatChangedTool(comparison)}. A changed tool list rebuilds the cache prefix before messages.`,
		);
	}
	if (comparison.currentMessageCount < comparison.previousMessageCount) {
		warnings.push(
			`message count decreased ${comparison.previousMessageCount}->${comparison.currentMessageCount}; host-side history truncation or compaction may have occurred.`,
		);
	}
	return warnings;
}

function formatSystemPromptChange(change: CacheTraceSystemPromptChange): string {
	const changedSection =
		change.firstChangedSectionIndex === undefined
			? 'firstChangedSection=unknown'
			: `firstChangedSection=${change.firstChangedSectionIndex}`;
	return (
		`${changedSection}` +
		` prev=${formatContentSectionSummary(change.previousSection)}` +
		` curr=${formatContentSectionSummary(change.currentSection)}` +
		` content=redacted`
	);
}

function formatContentSectionSummary(summary: CacheTraceContentSectionSummary | undefined): string {
	if (!summary) {
		return 'missing';
	}
	return (
		`${summary.label}#${summary.index}` +
		`:lines=${summary.startLine}-${summary.endLine}` +
		`:chars=${summary.chars}` +
		`:range=${summary.startChar}-${summary.endChar}` +
		`:hash=${summary.hash}`
	);
}

function formatMessageSummary(summary: CacheTraceMessageSummary | undefined): string {
	if (!summary) {
		return 'missing';
	}
	let result =
		`${summary.role}#${summary.index}` +
		` chars=${summary.contentChars}` +
		` lines=${summary.contentLines}` +
		` toolCalls=${summary.toolCalls}` +
		` toolArgs=${summary.toolCallArgumentChars}` +
		` reasoning=${summary.reasoningChars}` +
		` emptyReasoning=${summary.emptyReasoning}`;
	const markers = formatRelevantMarkerSummary(summary);
	if (markers) {
		result += ` markers=${markers}`;
	}
	if (summary.followsToolResult) {
		result += ` afterToolResultKind=${summary.afterToolResultKind}`;
	}
	return result;
}

function formatRelevantMarkerSummary(summary: CacheTraceMessageSummary): string {
	const markers: string[] = [];
	appendNumberIfNonZero(markers, 'imageDesc', summary.imageDescriptionCount);
	appendNumberIfNonZero(markers, 'unableImage', summary.unableImageCount);
	appendNumberIfNonZero(markers, 'url', summary.urlCount);
	appendNumberIfNonZero(markers, 'codeFence', summary.codeFenceCount);
	return markers.join(',');
}

function formatChangedTool(comparison: CacheTraceComparison): string {
	if (comparison.firstChangedToolIndex === undefined) {
		return 'none';
	}
	return (
		`${comparison.firstChangedToolIndex}` +
		` prev=${formatToolSummary(comparison.previousTool)}` +
		` curr=${formatToolSummary(comparison.currentTool)}`
	);
}

function formatToolSummary(summary: CacheTraceToolSummary | undefined): string {
	if (!summary) {
		return 'missing';
	}
	return (
		`${summary.name}#${summary.index}` +
		` hash=${summary.hash}` +
		` desc=${summary.descriptionHash}` +
		` params=${summary.parametersHash}`
	);
}
