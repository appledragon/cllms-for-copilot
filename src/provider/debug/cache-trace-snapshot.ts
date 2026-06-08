import vscode from 'vscode';
import type { LlmMessage, LlmRequest, LlmTool } from '../../types';
import { llmContentToText } from '../convert';
import { classifyLlmRequest, type RequestKind } from '../routing';
import { parseFirstReplayMarker, REPLAY_MARKER_MIME } from '../replay';
import { IMAGE_DESCRIPTION_UNAVAILABLE } from '../vision/consts';
import type {
	CacheTraceComparison,
	CacheTraceContentSectionSummary,
	CacheTraceInputAssistantSummary,
	CacheTraceMessageSummary,
	CacheTraceSnapshot,
	CacheTraceStats,
	CacheTraceSystemPromptChange,
	CacheTraceToolSummary,
} from './cache-trace-types';
import {
	countCommonPrefixChars,
	countLikelyPaths,
	countLines,
	countLiteral,
	countRegex,
	hashString,
	isLanguageModelThinkingPart,
	normalizeThinkingPartValue,
	stableStringify,
} from './trace-utils';

const LARGE_MESSAGE_CHARS = 10_000;
const HASH_WINDOW_CHARS = 2_048;
const SYSTEM_PROMPT_SECTION_MAX_LINES = 40;
const SAFE_SYSTEM_PROMPT_TAGS = new Set([
	'agents',
	'attachments',
	'customizationsUpdate',
	'instruction',
	'instructions',
	'skill',
	'skills',
	'toolUseInstructions',
]);

export function createCacheTraceSnapshot(
	request: LlmRequest,
	inputMessages: readonly vscode.LanguageModelChatRequestMessage[] = [],
	requestKind: RequestKind = classifyLlmRequest({ request, inputMessages }),
): CacheTraceSnapshot {
	const toolsSerialized = stableStringify(request.tools ?? []);
	const messageSummaries = summarizeMessages(request.messages);
	const toolSummaries = summarizeTools(request.tools ?? []);
	const firstMessage = messageSummaries[0];
	const redactedComparisonInput = createRedactedComparisonInput(
		request,
		messageSummaries,
		toolSummaries,
	);

	return {
		fingerprint: hashString(redactedComparisonInput),
		requestKind,
		model: request.model,
		cacheTraceKey: hashString(`${request.model}:${firstMessage?.hash ?? 'empty'}`),
		redactedComparisonInput,
		requiresReasoningContent: request.enable_thinking === true,
		inputAssistantSummaries: summarizeInputAssistantMessages(inputMessages),
		toolsHash: hashString(toolsSerialized),
		toolSummaries,
		messageSummaries,
		stats: summarizeStats(request.messages, request.tools?.length ?? 0),
	};
}

function createRedactedComparisonInput(
	request: LlmRequest,
	messageSummaries: CacheTraceMessageSummary[],
	toolSummaries: CacheTraceToolSummary[],
): string {
	return stableStringify({
		model: request.model,
		tool_choice: request.tool_choice ?? null,
		enable_thinking: request.enable_thinking ?? null,
		thinking_budget: request.thinking_budget ?? null,
		tools: toolSummaries,
		messages: messageSummaries,
	});
}

export function compareCacheTraceSnapshots(
	previous: CacheTraceSnapshot | undefined,
	current: CacheTraceSnapshot,
): CacheTraceComparison | undefined {
	if (!previous) {
		return undefined;
	}

	const commonPrefixSummaryChars = countCommonPrefixChars(
		previous.redactedComparisonInput,
		current.redactedComparisonInput,
	);
	const firstChangedMessageIndex = findFirstChangedMessageIndex(
		previous.messageSummaries,
		current.messageSummaries,
	);
	const firstChangedToolIndex = findFirstChangedToolIndex(
		previous.toolSummaries,
		current.toolSummaries,
	);
	const previousMessage =
		firstChangedMessageIndex === undefined
			? undefined
			: previous.messageSummaries[firstChangedMessageIndex];
	const currentMessage =
		firstChangedMessageIndex === undefined
			? undefined
			: current.messageSummaries[firstChangedMessageIndex];

	return {
		commonPrefixSummaryChars,
		commonPrefixSummaryPercent:
			current.redactedComparisonInput.length > 0
				? (commonPrefixSummaryChars / current.redactedComparisonInput.length) * 100
				: 100,
		previousMessageCount: previous.messageSummaries.length,
		currentMessageCount: current.messageSummaries.length,
		firstChangedMessageIndex,
		previousMessage,
		currentMessage,
		toolsChanged: previous.toolsHash !== current.toolsHash,
		previousToolsHash: previous.toolsHash,
		currentToolsHash: current.toolsHash,
		firstChangedToolIndex,
		previousTool:
			firstChangedToolIndex === undefined
				? undefined
				: previous.toolSummaries[firstChangedToolIndex],
		currentTool:
			firstChangedToolIndex === undefined
				? undefined
				: current.toolSummaries[firstChangedToolIndex],
		systemPromptChange:
			firstChangedMessageIndex === 0
				? compareSystemPromptSections(previousMessage, currentMessage)
				: undefined,
	};
}

function compareSystemPromptSections(
	previous: CacheTraceMessageSummary | undefined,
	current: CacheTraceMessageSummary | undefined,
): CacheTraceSystemPromptChange | undefined {
	if (!previous || !current) {
		return {
			firstChangedSectionIndex: undefined,
			previousSection: previous?.contentSections?.[0],
			currentSection: current?.contentSections?.[0],
		};
	}
	if (previous.contentHash === current.contentHash) {
		return undefined;
	}

	const previousSections = previous.contentSections ?? [];
	const currentSections = current.contentSections ?? [];
	const maxLength = Math.max(previousSections.length, currentSections.length);
	for (let index = 0; index < maxLength; index += 1) {
		const previousSection = previousSections[index];
		const currentSection = currentSections[index];
		if (
			previousSection?.hash !== currentSection?.hash ||
			previousSection?.label !== currentSection?.label
		) {
			return {
				firstChangedSectionIndex: index,
				previousSection,
				currentSection,
			};
		}
	}

	return {
		firstChangedSectionIndex: undefined,
		previousSection: previousSections[0],
		currentSection: currentSections[0],
	};
}

function summarizeInputAssistantMessages(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): CacheTraceInputAssistantSummary[] {
	const summaries: CacheTraceInputAssistantSummary[] = [];

	for (const [index, message] of messages.entries()) {
		if (message.role !== vscode.LanguageModelChatMessageRole.Assistant) {
			continue;
		}

		let textChars = 0;
		let toolCalls = 0;
		let thinkingChars = 0;
		let replayMarkerParts = 0;

		for (const part of message.content) {
			if (part instanceof vscode.LanguageModelTextPart) {
				textChars += part.value.length;
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				toolCalls += 1;
			} else if (isLanguageModelThinkingPart(part)) {
				thinkingChars += normalizeThinkingPartValue(part.value).text.length;
			} else if (
				part instanceof vscode.LanguageModelDataPart &&
				part.mimeType === REPLAY_MARKER_MIME
			) {
				replayMarkerParts += 1;
			}
		}

		if (!textChars && !toolCalls) {
			continue;
		}

		const replayMarker = parseFirstReplayMarker(message);
		summaries.push({
			index,
			textChars,
			toolCalls,
			thinkingChars,
			replayMarkerParts,
			replayMarkerReasoningChars: replayMarker?.reasoningText?.length ?? 0,
			replayMarkerInvalid: replayMarker?.valid === false,
		});
	}

	return summaries;
}

function summarizeMessages(messages: LlmMessage[]): CacheTraceMessageSummary[] {
	const summaries: CacheTraceMessageSummary[] = [];
	let followsToolResult = false;
	for (const [index, message] of messages.entries()) {
		summaries.push(summarizeMessage(message, index, followsToolResult));
		if (message.role === 'tool') {
			followsToolResult = true;
		} else {
			followsToolResult = false;
		}
	}
	return summaries;
}

function summarizeMessage(
	message: LlmMessage,
	index: number,
	followsToolResult: boolean,
): CacheTraceMessageSummary {
	const content = llmContentToText(message.content);
	const toolCallArgumentChars =
		message.tool_calls?.reduce((sum, toolCall) => sum + toolCall.function.arguments.length, 0) ?? 0;
	const reasoningChars = message.reasoning_content?.length ?? 0;
	const toolCalls = message.tool_calls?.length ?? 0;
	const assistantAfterToolResult = message.role === 'assistant' && followsToolResult;
	const afterToolResultKind = assistantAfterToolResult
		? toolCalls > 0
			? ('tool-call' as const)
			: ('final' as const)
		: ('none' as const);
	const hasReasoningContent = message.reasoning_content !== undefined;
	const hasEmptyReasoningContent = hasReasoningContent && reasoningChars === 0;
	const imageDescriptionCount = countLiteral(content, '[Image Description:');
	const unableImageCount = countLiteral(content, IMAGE_DESCRIPTION_UNAVAILABLE);
	const urlCount = countRegex(content, /https?:\/\//g);
	const codeFenceCount = countLiteral(content, '```');
	const likelyPathCount = countLikelyPaths(content);

	return {
		index,
		role: message.role,
		hash: hashString(stableStringify(message)),
		contentHash: hashString(content),
		contentHeadHash: hashString(content.slice(0, HASH_WINDOW_CHARS)),
		contentTailHash: hashString(content.slice(-HASH_WINDOW_CHARS)),
		contentChars: content.length,
		contentLines: countLines(content),
		imageDescriptionCount,
		unableImageCount,
		urlCount,
		codeFenceCount,
		likelyPathCount,
		toolCalls,
		toolCallArgumentChars,
		reasoningChars,
		emptyReasoning: hasEmptyReasoningContent,
		missingToolReasoning: message.role === 'assistant' && toolCalls > 0 && !hasReasoningContent,
		followsToolResult: assistantAfterToolResult,
		afterToolResultKind,
		missingPostToolReasoning: assistantAfterToolResult && !hasReasoningContent,
		missingPostToolCallReasoning: afterToolResultKind === 'tool-call' && !hasReasoningContent,
		missingPostToolFinalReasoning: afterToolResultKind === 'final' && !hasReasoningContent,
		contentSections: index === 0 ? summarizeSystemPromptSections(content) : undefined,
	};
}

interface ContentLineRange {
	text: string;
	startChar: number;
	endChar: number;
}

function summarizeSystemPromptSections(content: string): CacheTraceContentSectionSummary[] {
	const lines = getContentLineRanges(content);
	if (lines.length === 0) {
		return [];
	}

	const sections: CacheTraceContentSectionSummary[] = [];
	let sectionStart = 0;
	let sectionLabel = 'preamble';

	for (const [lineIndex, line] of lines.entries()) {
		const nextLabel = getSafeSystemPromptSectionLabel(line.text);
		if (!nextLabel) {
			continue;
		}

		if (lineIndex > sectionStart) {
			appendSystemPromptSectionWindows(
				sections,
				content,
				lines,
				sectionLabel,
				sectionStart,
				lineIndex,
			);
		}
		sectionStart = lineIndex;
		sectionLabel = nextLabel;
	}

	appendSystemPromptSectionWindows(
		sections,
		content,
		lines,
		sectionLabel,
		sectionStart,
		lines.length,
	);
	return sections;
}

function appendSystemPromptSectionWindows(
	sections: CacheTraceContentSectionSummary[],
	content: string,
	lines: readonly ContentLineRange[],
	label: string,
	startLineIndex: number,
	endLineIndex: number,
): void {
	for (
		let windowStart = startLineIndex;
		windowStart < endLineIndex;
		windowStart += SYSTEM_PROMPT_SECTION_MAX_LINES
	) {
		const windowEnd = Math.min(endLineIndex, windowStart + SYSTEM_PROMPT_SECTION_MAX_LINES);
		const startChar = lines[windowStart].startChar;
		const endChar = lines[windowEnd - 1].endChar;
		sections.push({
			index: sections.length,
			label,
			startLine: windowStart + 1,
			endLine: windowEnd,
			startChar,
			endChar,
			chars: endChar - startChar,
			hash: hashString(content.slice(startChar, endChar)),
		});
	}
}

function getContentLineRanges(content: string): ContentLineRange[] {
	if (content.length === 0) {
		return [];
	}

	const lines: ContentLineRange[] = [];
	let lineStart = 0;
	for (let index = 0; index < content.length; index += 1) {
		if (content.charAt(index) !== '\n') {
			continue;
		}
		const textEnd = index > lineStart && content.charAt(index - 1) === '\r' ? index - 1 : index;
		lines.push({
			text: content.slice(lineStart, textEnd),
			startChar: lineStart,
			endChar: index + 1,
		});
		lineStart = index + 1;
	}

	if (lineStart < content.length) {
		lines.push({
			text: content.slice(lineStart),
			startChar: lineStart,
			endChar: content.length,
		});
	}

	return lines;
}

function getSafeSystemPromptSectionLabel(line: string): string | undefined {
	const tag = /^\s*<([A-Za-z][\w-]*)\b/.exec(line)?.[1];
	if (!tag) {
		return undefined;
	}
	return SAFE_SYSTEM_PROMPT_TAGS.has(tag) ? `tag:${tag}` : 'tag:other';
}

function summarizeTools(tools: LlmTool[]): CacheTraceToolSummary[] {
	return tools.map((tool, index) => ({
		index,
		name: tool.function.name,
		hash: hashString(stableStringify(tool)),
		descriptionHash: hashString(tool.function.description ?? ''),
		parametersHash: hashString(stableStringify(tool.function.parameters ?? null)),
	}));
}

function summarizeStats(messages: LlmMessage[], toolCount: number): CacheTraceStats {
	let userMessages = 0;
	let assistantMessages = 0;
	let toolMessages = 0;
	let systemMessages = 0;
	let totalContentChars = 0;
	let toolCallArgumentChars = 0;
	let reasoningChars = 0;
	let largeMessages = 0;
	let assistantToolCallMessages = 0;
	let nonEmptyToolReasoningMessages = 0;
	let emptyToolReasoningMessages = 0;
	let missingToolReasoningMessages = 0;
	let assistantAfterToolResultMessages = 0;
	let assistantAfterToolResultToolCallMessages = 0;
	let assistantAfterToolResultFinalMessages = 0;
	let nonEmptyPostToolReasoningMessages = 0;
	let emptyPostToolReasoningMessages = 0;
	let missingPostToolReasoningMessages = 0;
	let nonEmptyPostToolCallReasoningMessages = 0;
	let emptyPostToolCallReasoningMessages = 0;
	let missingPostToolCallReasoningMessages = 0;
	let nonEmptyPostToolFinalReasoningMessages = 0;
	let emptyPostToolFinalReasoningMessages = 0;
	let missingPostToolFinalReasoningMessages = 0;
	let imageDescriptionMessages = 0;
	let imageDescriptionParts = 0;
	let unableImageMessages = 0;
	let urlMessages = 0;
	let urlCount = 0;
	let codeFenceMessages = 0;
	let codeFenceCount = 0;
	let likelyPathMessages = 0;
	let likelyPathCount = 0;
	let followsToolResult = false;

	for (const message of messages) {
		const content = llmContentToText(message.content);
		if (message.role === 'user') {
			userMessages += 1;
		} else if (message.role === 'assistant') {
			assistantMessages += 1;
		} else if (message.role === 'tool') {
			toolMessages += 1;
		} else if (message.role === 'system') {
			systemMessages += 1;
		}

		totalContentChars += content.length;
		if (content.length > LARGE_MESSAGE_CHARS) {
			largeMessages += 1;
		}

		const imageDescriptions = countLiteral(content, '[Image Description:');
		if (imageDescriptions > 0) {
			imageDescriptionMessages += 1;
			imageDescriptionParts += imageDescriptions;
		}
		if (content.includes(IMAGE_DESCRIPTION_UNAVAILABLE)) {
			unableImageMessages += 1;
		}

		const messageUrlCount = countRegex(content, /https?:\/\//g);
		if (messageUrlCount > 0) {
			urlMessages += 1;
			urlCount += messageUrlCount;
		}

		const messageCodeFenceCount = countLiteral(content, '```');
		if (messageCodeFenceCount > 0) {
			codeFenceMessages += 1;
			codeFenceCount += messageCodeFenceCount;
		}

		const messageLikelyPathCount = countLikelyPaths(content);
		if (messageLikelyPathCount > 0) {
			likelyPathMessages += 1;
			likelyPathCount += messageLikelyPathCount;
		}

		const toolCalls = message.tool_calls?.length ?? 0;
		const messageReasoningChars = message.reasoning_content?.length ?? 0;
		if (message.role === 'assistant' && followsToolResult) {
			assistantAfterToolResultMessages += 1;
			const isToolCallAfterToolResult = toolCalls > 0;
			if (isToolCallAfterToolResult) {
				assistantAfterToolResultToolCallMessages += 1;
			} else {
				assistantAfterToolResultFinalMessages += 1;
			}
			if (message.reasoning_content === undefined) {
				missingPostToolReasoningMessages += 1;
				if (isToolCallAfterToolResult) {
					missingPostToolCallReasoningMessages += 1;
				} else {
					missingPostToolFinalReasoningMessages += 1;
				}
			} else if (messageReasoningChars === 0) {
				emptyPostToolReasoningMessages += 1;
				if (isToolCallAfterToolResult) {
					emptyPostToolCallReasoningMessages += 1;
				} else {
					emptyPostToolFinalReasoningMessages += 1;
				}
			} else {
				nonEmptyPostToolReasoningMessages += 1;
				if (isToolCallAfterToolResult) {
					nonEmptyPostToolCallReasoningMessages += 1;
				} else {
					nonEmptyPostToolFinalReasoningMessages += 1;
				}
			}
		}

		if (toolCalls > 0) {
			assistantToolCallMessages += 1;
			if (message.reasoning_content === undefined) {
				missingToolReasoningMessages += 1;
			} else if (messageReasoningChars === 0) {
				emptyToolReasoningMessages += 1;
			} else {
				nonEmptyToolReasoningMessages += 1;
			}
			for (const toolCall of message.tool_calls ?? []) {
				toolCallArgumentChars += toolCall.function.arguments.length;
			}
		}

		reasoningChars += messageReasoningChars;

		if (message.role === 'tool') {
			followsToolResult = true;
		} else {
			followsToolResult = false;
		}
	}

	return {
		messageCount: messages.length,
		userMessages,
		assistantMessages,
		toolMessages,
		systemMessages,
		toolCount,
		totalContentChars,
		toolCallArgumentChars,
		reasoningChars,
		largeMessages,
		assistantToolCallMessages,
		nonEmptyToolReasoningMessages,
		emptyToolReasoningMessages,
		missingToolReasoningMessages,
		assistantAfterToolResultMessages,
		assistantAfterToolResultToolCallMessages,
		assistantAfterToolResultFinalMessages,
		nonEmptyPostToolReasoningMessages,
		emptyPostToolReasoningMessages,
		missingPostToolReasoningMessages,
		nonEmptyPostToolCallReasoningMessages,
		emptyPostToolCallReasoningMessages,
		missingPostToolCallReasoningMessages,
		nonEmptyPostToolFinalReasoningMessages,
		emptyPostToolFinalReasoningMessages,
		missingPostToolFinalReasoningMessages,
		imageDescriptionMessages,
		imageDescriptionParts,
		unableImageMessages,
		urlMessages,
		urlCount,
		codeFenceMessages,
		codeFenceCount,
		likelyPathMessages,
		likelyPathCount,
	};
}

function findFirstChangedMessageIndex(
	previous: CacheTraceMessageSummary[],
	current: CacheTraceMessageSummary[],
): number | undefined {
	const maxLength = Math.max(previous.length, current.length);
	for (let index = 0; index < maxLength; index += 1) {
		if (previous[index]?.hash !== current[index]?.hash) {
			return index;
		}
	}
	return undefined;
}

function findFirstChangedToolIndex(
	previous: CacheTraceToolSummary[],
	current: CacheTraceToolSummary[],
): number | undefined {
	const maxLength = Math.max(previous.length, current.length);
	for (let index = 0; index < maxLength; index += 1) {
		if (previous[index]?.hash !== current[index]?.hash) {
			return index;
		}
	}
	return undefined;
}
