import vscode from 'vscode';
import { parseFirstReplayMarker } from '../../replay';
import type { AudioResolutionStats } from '../types';
import { getAudioParts } from './parts';

export function createAudioMarkerBindings(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	stats: AudioResolutionStats,
): Map<number, string> {
	const bindings = new Map<number, string>();
	const boundUserMessages = new Set<number>();

	for (const [messageIndex, message] of messages.entries()) {
		if (message.role !== vscode.LanguageModelChatMessageRole.Assistant) {
			continue;
		}
		const marker = parseFirstReplayMarker(message);
		if (!marker) {
			continue;
		}
		if (!marker.valid) {
			stats.invalidMarkerAudioMetadata += 1;
			continue;
		}
		if (!marker.audioText) {
			if (marker.audioTextIgnoredReason) {
				stats.invalidMarkerAudioMetadata += 1;
			}
			continue;
		}

		for (let userIndex = messageIndex - 1; userIndex >= 0; userIndex -= 1) {
			if (boundUserMessages.has(userIndex)) {
				continue;
			}
			const candidate = messages[userIndex];
			if (candidate.role !== vscode.LanguageModelChatMessageRole.User) {
				continue;
			}
			if (getAudioParts(candidate).length === 0) {
				continue;
			}
			bindings.set(userIndex, marker.audioText);
			boundUserMessages.add(userIndex);
			break;
		}
	}

	return bindings;
}
