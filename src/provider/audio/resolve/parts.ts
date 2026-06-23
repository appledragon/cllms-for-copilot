import vscode from 'vscode';
import { isAudioDataPart } from '../../imageParts';
import type { AudioPart } from '../types';

export function getAudioParts(
	message: vscode.LanguageModelChatRequestMessage,
): vscode.LanguageModelDataPart[] {
	return (message.content as readonly vscode.LanguageModelInputPart[]).filter(isAudioDataPart);
}

export function getNonAudioParts(
	message: vscode.LanguageModelChatRequestMessage,
): vscode.LanguageModelInputPart[] {
	return (message.content as readonly vscode.LanguageModelInputPart[]).filter(
		(part) => !isAudioDataPart(part),
	);
}

export function findCurrentAudioMessageIndex(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): number | undefined {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
			return undefined;
		}
		if (message.role !== vscode.LanguageModelChatMessageRole.User) {
			continue;
		}
		if (getAudioParts(message).length > 0) {
			return index;
		}
	}
	return undefined;
}

export function createResolvedMessage(
	message: vscode.LanguageModelChatRequestMessage,
	content: readonly vscode.LanguageModelInputPart[],
): vscode.LanguageModelChatRequestMessage {
	return {
		role: message.role,
		content,
		name: message.name,
	} as unknown as vscode.LanguageModelChatRequestMessage;
}

export function hasNonEmptyTextPart(parts: readonly vscode.LanguageModelInputPart[]): boolean {
	return parts.some(
		(part) => part instanceof vscode.LanguageModelTextPart && part.value.trim().length > 0,
	);
}

export function toAudioPart(part: vscode.LanguageModelDataPart): AudioPart {
	return {
		mimeType: part.mimeType,
		data: part.data,
	};
}
