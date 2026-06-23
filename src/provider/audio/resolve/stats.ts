import type vscode from 'vscode';
import type { AudioResolutionStats } from '../types';
import { getAudioParts } from './parts';

export function createAudioResolutionStats(): AudioResolutionStats {
	return {
		inputAudioParts: 0,
		inputAudioMessages: 0,
		currentAudioMessages: 0,
		generatedAudioMessages: 0,
		replayedAudioMessages: 0,
		omittedAudioMessages: 0,
		unavailableAudioMessages: 0,
		failedAudioMessages: 0,
		droppedAudioParts: 0,
		markerAudioTextChars: 0,
		invalidMarkerAudioMetadata: 0,
	};
}

export function collectInputAudioStats(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	stats: AudioResolutionStats,
): void {
	for (const message of messages) {
		const audioParts = getAudioParts(message).length;
		if (audioParts === 0) {
			continue;
		}
		stats.inputAudioMessages += 1;
		stats.inputAudioParts += audioParts;
	}
}
