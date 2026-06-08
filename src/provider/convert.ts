import vscode from 'vscode';
import { safeStringify } from '../json';
import type { LlmImageContentPart, LlmMessage, LlmTool, LlmToolCall } from '../types';
import { isImageDataPart } from './imageParts';
import { parseFirstReplayMarker } from './replay';

/**
 * Convert VS Code chat messages to the API format.
 * Injects marker-replayed reasoning_content for assistant messages.
 *
 * When `nativeVision` is true the selected model is vision-capable, so image
 * attachments are forwarded directly as OpenAI-compatible `image_url` content
 * parts instead of being resolved to text by the vision proxy.
 */
export function convertMessages(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	isThinkingModel: boolean,
	nativeVision = false,
): LlmMessage[] {
	const result: LlmMessage[] = [];

	for (const message of messages) {
		const role = mapRole(message.role);

		let content = '';
		let thinkingContent = '';
		const toolCalls: LlmToolCall[] = [];
		const toolResults: Array<{ callId: string; content: string }> = [];
		const imageParts: LlmImageContentPart[] = [];

		for (const part of message.content) {
			if (part instanceof vscode.LanguageModelTextPart) {
				content += part.value;
			} else if (isLanguageModelThinkingPart(part)) {
				thinkingContent += normalizeThinkingPartText(part.value);
			} else if (nativeVision && isImageDataPart(part)) {
				imageParts.push(toImageContentPart(part));
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				toolCalls.push({
					id: part.callId,
					type: 'function',
					function: {
						name: part.name,
						arguments: safeStringify(part.input),
					},
				});
			} else if (part instanceof vscode.LanguageModelToolResultPart) {
				let toolContent = '';
				for (const item of part.content) {
					if (item instanceof vscode.LanguageModelTextPart) {
						toolContent += item.value;
					}
				}
				toolResults.push({
					callId: part.callId,
					content: toolContent || safeStringify(part.content),
				});
			}
		}

		if (role === 'assistant') {
			if (content || toolCalls.length > 0) {
				const replayMarker = isThinkingModel ? parseFirstReplayMarker(message) : undefined;
				const msg: LlmMessage = {
					role: 'assistant' as const,
					content: content || '',
				};

				if (toolCalls.length > 0) {
					msg.tool_calls = toolCalls;
				}

				if (isThinkingModel) {
					msg.reasoning_content = getReasoningContent(replayMarker, thinkingContent);
				}

				result.push(msg);
			}
		} else if (imageParts.length > 0) {
			// Native vision: emit a multimodal content array with text + images.
			const parts: LlmImageContentPart[] | { type: 'text'; text: string }[] = [];
			if (content) {
				(parts as { type: 'text'; text: string }[]).push({ type: 'text', text: content });
			}
			result.push({
				role: role as 'user' | 'assistant',
				content: [...parts, ...imageParts] as LlmMessage['content'],
			});
		} else if (content) {
			result.push({
				role: role as 'user' | 'assistant',
				content: content,
			});
		}

		// Tool result messages follow their associated assistant message
		for (const tr of toolResults) {
			result.push({
				role: 'tool',
				content: tr.content,
				tool_call_id: tr.callId,
			});
		}
	}

	return result;
}

/**
 * Flatten a Qwen message content (string or multimodal parts) to plain text.
 * Image parts contribute a short placeholder so diagnostics/length math stay
 * meaningful without embedding base64 bytes.
 */
export function llmContentToText(content: LlmMessage['content']): string {
	if (typeof content === 'string') {
		return content;
	}
	return content
		.map((part) => (part.type === 'text' ? part.text : '[image]'))
		.join('');
}

function toImageContentPart(part: vscode.LanguageModelDataPart): LlmImageContentPart {
	const base64 = Buffer.from(part.data).toString('base64');
	return {
		type: 'image_url',
		image_url: { url: `data:${part.mimeType};base64,${base64}` },
	};
}

function getReasoningContent(
	replayMarker: ReturnType<typeof parseFirstReplayMarker>,
	thinkingContent: string,
): string {
	if (replayMarker?.valid && replayMarker.reasoningText) {
		return replayMarker.reasoningText;
	}
	return thinkingContent;
}

function isLanguageModelThinkingPart(part: unknown): part is vscode.LanguageModelThinkingPart {
	return (
		typeof vscode.LanguageModelThinkingPart === 'function' &&
		part instanceof vscode.LanguageModelThinkingPart
	);
}

function normalizeThinkingPartText(value: string | string[]): string {
	return Array.isArray(value) ? value.join('') : value;
}

function mapRole(role: vscode.LanguageModelChatMessageRole): 'user' | 'assistant' {
	switch (role) {
		case vscode.LanguageModelChatMessageRole.User:
			return 'user';
		case vscode.LanguageModelChatMessageRole.Assistant:
			return 'assistant';
		default:
			return 'user';
	}
}

/**
 * Convert VS Code tool definitions to the API format.
 */
export function convertTools(
	tools: readonly vscode.LanguageModelChatTool[] | undefined,
): LlmTool[] | undefined {
	if (!tools || tools.length === 0) {
		return undefined;
	}

	return tools.map((tool) => ({
		type: 'function' as const,
		function: {
			name: tool.name,
			description: tool.description,
			// Some providers (e.g. MiniMax) reject functions with missing/empty
			// parameters (error 2013). Always emit a valid JSON Schema object.
			parameters: (tool.inputSchema as Record<string, unknown> | undefined) || {
				type: 'object',
				properties: {},
			},
		},
	}));
}

/**
 * Count total characters across all messages to calibrate chars-per-token ratio.
 */
export function countMessageChars(messages: LlmMessage[]): number {
	let total = 0;
	for (const msg of messages) {
		if (typeof msg.content === 'string') {
			total += msg.content.length;
		} else if (Array.isArray(msg.content)) {
			for (const part of msg.content) {
				if (part.type === 'text') {
					total += part.text.length;
				}
			}
		}
		total += msg.reasoning_content?.length ?? 0;
		if (msg.tool_calls) {
			for (const tc of msg.tool_calls) {
				total += tc.function?.name?.length ?? 0;
				total += tc.function?.arguments?.length ?? 0;
			}
		}
	}
	return total;
}
