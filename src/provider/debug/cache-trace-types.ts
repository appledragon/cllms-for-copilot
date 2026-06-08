import type { LlmMessage } from '../../types';
import type { RequestKind } from '../routing';

export interface CacheTraceStats {
	messageCount: number;
	userMessages: number;
	assistantMessages: number;
	toolMessages: number;
	systemMessages: number;
	toolCount: number;
	totalContentChars: number;
	toolCallArgumentChars: number;
	reasoningChars: number;
	largeMessages: number;
	assistantToolCallMessages: number;
	nonEmptyToolReasoningMessages: number;
	emptyToolReasoningMessages: number;
	missingToolReasoningMessages: number;
	assistantAfterToolResultMessages: number;
	assistantAfterToolResultToolCallMessages: number;
	assistantAfterToolResultFinalMessages: number;
	nonEmptyPostToolReasoningMessages: number;
	emptyPostToolReasoningMessages: number;
	missingPostToolReasoningMessages: number;
	nonEmptyPostToolCallReasoningMessages: number;
	emptyPostToolCallReasoningMessages: number;
	missingPostToolCallReasoningMessages: number;
	nonEmptyPostToolFinalReasoningMessages: number;
	emptyPostToolFinalReasoningMessages: number;
	missingPostToolFinalReasoningMessages: number;
	imageDescriptionMessages: number;
	imageDescriptionParts: number;
	unableImageMessages: number;
	urlMessages: number;
	urlCount: number;
	codeFenceMessages: number;
	codeFenceCount: number;
	likelyPathMessages: number;
	likelyPathCount: number;
}

export interface CacheTraceMessageSummary {
	index: number;
	role: LlmMessage['role'];
	hash: string;
	contentHash: string;
	contentHeadHash: string;
	contentTailHash: string;
	contentChars: number;
	contentLines: number;
	imageDescriptionCount: number;
	unableImageCount: number;
	urlCount: number;
	codeFenceCount: number;
	likelyPathCount: number;
	toolCalls: number;
	toolCallArgumentChars: number;
	reasoningChars: number;
	emptyReasoning: boolean;
	missingToolReasoning: boolean;
	followsToolResult: boolean;
	afterToolResultKind: 'none' | 'tool-call' | 'final';
	missingPostToolReasoning: boolean;
	missingPostToolCallReasoning: boolean;
	missingPostToolFinalReasoning: boolean;
	contentSections?: CacheTraceContentSectionSummary[];
}

export interface CacheTraceToolSummary {
	index: number;
	name: string;
	hash: string;
	descriptionHash: string;
	parametersHash: string;
}

export interface CacheTraceContentSectionSummary {
	index: number;
	label: string;
	startLine: number;
	endLine: number;
	startChar: number;
	endChar: number;
	chars: number;
	hash: string;
}

export interface CacheTraceSnapshot {
	fingerprint: string;
	requestKind: RequestKind;
	model: string;
	cacheTraceKey: string;
	redactedComparisonInput: string;
	requiresReasoningContent: boolean;
	inputAssistantSummaries: CacheTraceInputAssistantSummary[];
	toolsHash: string;
	toolSummaries: CacheTraceToolSummary[];
	messageSummaries: CacheTraceMessageSummary[];
	stats: CacheTraceStats;
}

export interface CacheTraceInputAssistantSummary {
	index: number;
	textChars: number;
	toolCalls: number;
	thinkingChars: number;
	replayMarkerParts: number;
	replayMarkerReasoningChars: number;
	replayMarkerInvalid: boolean;
}

export interface CacheTraceComparison {
	commonPrefixSummaryChars: number;
	commonPrefixSummaryPercent: number;
	previousMessageCount: number;
	currentMessageCount: number;
	firstChangedMessageIndex: number | undefined;
	previousMessage: CacheTraceMessageSummary | undefined;
	currentMessage: CacheTraceMessageSummary | undefined;
	toolsChanged: boolean;
	previousToolsHash: string;
	currentToolsHash: string;
	firstChangedToolIndex: number | undefined;
	previousTool: CacheTraceToolSummary | undefined;
	currentTool: CacheTraceToolSummary | undefined;
	systemPromptChange: CacheTraceSystemPromptChange | undefined;
}

export interface CacheTraceSystemPromptChange {
	firstChangedSectionIndex: number | undefined;
	previousSection: CacheTraceContentSectionSummary | undefined;
	currentSection: CacheTraceContentSectionSummary | undefined;
}
