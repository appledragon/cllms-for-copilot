import vscode from 'vscode';
import { safeStringify, toWellFormedString } from '../../json';
import { parseReplayMarkerData, REPLAY_MARKER_MIME } from '../replay';
import {
	formatRole,
	getConstructorName,
	hashBytes,
	hashString,
	sanitizeJsonValue,
} from './dump-utils';

export interface SerializedMessage {
	index: number;
	role: string;
	name: string | undefined;
	contentPartCount: number;
	contentTextChars: number;
	contentDataBytes: number;
	contentParts: SerializedContentPart[];
}

export type SerializedContentPart =
	| {
			index: number;
			type: 'text';
			value: string;
			chars: number;
			hash: string;
	  }
	| {
			index: number;
			type: 'toolCall';
			callId: string;
			name: string;
			input: unknown;
			inputJsonChars: number;
			inputHash: string;
	  }
	| {
			index: number;
			type: 'toolResult';
			callId: string;
			contentPartCount: number;
			contentParts: SerializedContentPart[];
	  }
	| {
			index: number;
			type: 'promptTsx';
			value: unknown;
			valueJsonChars: number;
			valueHash: string;
	  }
	| {
			index: number;
			type: 'data';
			mimeType: string;
			byteLength: number;
			dataHash: string;
			isImage: boolean;
			replayMarker?: {
				valid: boolean;
				segmentId?: string;
				payloadFormat?: string;
				legacySegmentOnly?: boolean;
				visionTextChars?: number;
				visionTextHash?: string;
				visionTextIgnoredReason?: string;
				reasoningTextChars?: number;
				reasoningTextHash?: string;
				reasoningTextIgnoredReason?: string;
				error?: string;
			};
	  }
	| {
			index: number;
			type: 'unknown';
			constructorName: string | undefined;
			value: unknown;
			valueJsonChars: number;
			valueHash: string;
	  };

export function serializeMessage(
	message: vscode.LanguageModelChatRequestMessage,
	index: number,
): SerializedMessage {
	const contentParts = message.content.map((part, partIndex) =>
		serializeContentPart(part, partIndex),
	);
	return {
		index,
		role: formatRole(message.role),
		name: message.name,
		contentPartCount: contentParts.length,
		contentTextChars: contentParts.reduce((sum, part) => sum + getContentPartTextChars(part), 0),
		contentDataBytes: contentParts.reduce((sum, part) => sum + getContentPartDataBytes(part), 0),
		contentParts,
	};
}

function serializeContentPart(part: unknown, index: number): SerializedContentPart {
	if (part instanceof vscode.LanguageModelTextPart) {
		const value = toWellFormedString(part.value);
		return {
			index,
			type: 'text',
			value,
			chars: value.length,
			hash: hashString(value),
		};
	}

	if (part instanceof vscode.LanguageModelToolCallPart) {
		const input = sanitizeJsonValue(part.input);
		const inputJson = safeStringify(input);
		return {
			index,
			type: 'toolCall',
			callId: part.callId,
			name: part.name,
			input,
			inputJsonChars: inputJson.length,
			inputHash: hashString(inputJson),
		};
	}

	if (part instanceof vscode.LanguageModelToolResultPart) {
		return {
			index,
			type: 'toolResult',
			callId: part.callId,
			contentPartCount: part.content.length,
			contentParts: part.content.map((item, itemIndex) => serializeContentPart(item, itemIndex)),
		};
	}

	if (part instanceof vscode.LanguageModelPromptTsxPart) {
		const value = sanitizeJsonValue(part.value);
		const valueJson = safeStringify(value);
		return {
			index,
			type: 'promptTsx',
			value,
			valueJsonChars: valueJson.length,
			valueHash: hashString(valueJson),
		};
	}

	if (part instanceof vscode.LanguageModelDataPart) {
		const replayMarker =
			part.mimeType === REPLAY_MARKER_MIME
				? summarizeReplayMarker(parseReplayMarkerData(part.data))
				: undefined;
		return {
			index,
			type: 'data',
			mimeType: part.mimeType,
			byteLength: part.data.byteLength,
			dataHash: hashBytes(part.data),
			isImage: part.mimeType.toLowerCase().startsWith('image/'),
			replayMarker,
		};
	}

	const value = sanitizeJsonValue(part);
	const valueJson = safeStringify(value);
	return {
		index,
		type: 'unknown',
		constructorName: getConstructorName(part),
		value,
		valueJsonChars: valueJson.length,
		valueHash: hashString(valueJson),
	};
}

function summarizeReplayMarker(marker: ReturnType<typeof parseReplayMarkerData>): {
	valid: boolean;
	segmentId?: string;
	payloadFormat?: string;
	legacySegmentOnly?: boolean;
	visionTextChars?: number;
	visionTextHash?: string;
	visionTextIgnoredReason?: string;
	reasoningTextChars?: number;
	reasoningTextHash?: string;
	reasoningTextIgnoredReason?: string;
	error?: string;
} {
	return {
		valid: marker.valid,
		segmentId: marker.segmentId,
		payloadFormat: marker.payloadFormat,
		legacySegmentOnly: marker.legacySegmentOnly,
		visionTextChars: marker.visionText?.length,
		visionTextHash: marker.visionText ? hashString(marker.visionText) : undefined,
		visionTextIgnoredReason: marker.visionTextIgnoredReason,
		reasoningTextChars: marker.reasoningText?.length,
		reasoningTextHash: marker.reasoningText ? hashString(marker.reasoningText) : undefined,
		reasoningTextIgnoredReason: marker.reasoningTextIgnoredReason,
		error: marker.error,
	};
}

export function serializeTools(
	tools: readonly vscode.LanguageModelChatTool[] | undefined,
): object[] | undefined {
	return tools?.map((tool, index) => {
		const inputSchema = sanitizeJsonValue(tool.inputSchema);
		const inputSchemaJson = safeStringify(inputSchema);
		return {
			index,
			name: tool.name,
			description: tool.description,
			inputSchema,
			inputSchemaJsonChars: inputSchemaJson.length,
			inputSchemaHash: hashString(inputSchemaJson),
		};
	});
}

export function summarizeSerializedMessages(messages: readonly SerializedMessage[]): object {
	const roleCounts: Record<string, number> = {};
	let textChars = 0;
	let dataBytes = 0;
	let toolCallParts = 0;
	let toolResultParts = 0;
	let dataParts = 0;
	let imageParts = 0;

	for (const message of messages) {
		roleCounts[message.role] = (roleCounts[message.role] ?? 0) + 1;
		textChars += message.contentTextChars;
		dataBytes += message.contentDataBytes;
		for (const part of flattenContentParts(message.contentParts)) {
			if (part.type === 'toolCall') toolCallParts += 1;
			if (part.type === 'toolResult') toolResultParts += 1;
			if (part.type === 'data') {
				dataParts += 1;
				if (part.isImage) imageParts += 1;
			}
		}
	}

	return {
		messageCount: messages.length,
		roleCounts,
		textChars,
		dataBytes,
		toolCallParts,
		toolResultParts,
		dataParts,
		imageParts,
	};
}

export function summarizeMessagesFromInput(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): object {
	return summarizeSerializedMessages(
		messages.map((message, index) => serializeMessage(message, index)),
	);
}

function getContentPartTextChars(part: SerializedContentPart): number {
	if (part.type === 'text') return part.chars;
	if (part.type === 'toolResult') {
		return part.contentParts.reduce((sum, item) => sum + getContentPartTextChars(item), 0);
	}
	return 0;
}

function getContentPartDataBytes(part: SerializedContentPart): number {
	if (part.type === 'data') return part.byteLength;
	if (part.type === 'toolResult') {
		return part.contentParts.reduce((sum, item) => sum + getContentPartDataBytes(item), 0);
	}
	return 0;
}

function flattenContentParts(parts: readonly SerializedContentPart[]): SerializedContentPart[] {
	const flattened: SerializedContentPart[] = [];
	for (const part of parts) {
		flattened.push(part);
		if (part.type === 'toolResult') {
			flattened.push(...flattenContentParts(part.contentParts));
		}
	}
	return flattened;
}
