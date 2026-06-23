import vscode from 'vscode';
import { createAudioProxyMissingNotice } from '../../tools/notices';
import type { AudioResolutionResult, AudioTranscriber } from '../types';
import { createAudioMarkerBindings } from './markers';
import {
	createResolvedMessage,
	findCurrentAudioMessageIndex,
	getAudioParts,
	getNonAudioParts,
} from './parts';
import { collectInputAudioStats, createAudioResolutionStats } from './stats';
import { resolveCurrentAudioText } from './text';

export async function resolveAudioMessages(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	token: vscode.CancellationToken,
	getTranscriber: () => Promise<AudioTranscriber | undefined>,
): Promise<AudioResolutionResult> {
	const stats = createAudioResolutionStats();
	collectInputAudioStats(messages, stats);
	if (stats.inputAudioParts === 0) {
		return { messages, stats, replayMarkerMetadata: {} };
	}

	const markerBindings = createAudioMarkerBindings(messages, stats);
	const currentAudioMessageIndex = findCurrentAudioMessageIndex(messages);
	const result: vscode.LanguageModelChatRequestMessage[] = [];
	let transcriber: AudioTranscriber | undefined;
	let transcriberRequested = false;
	let missingAudioProxy = false;
	let audioFailureNotice: string | undefined;
	let markerAudioText: string | undefined;

	for (const [messageIndex, message] of messages.entries()) {
		const audioParts = getAudioParts(message);
		if (audioParts.length === 0) {
			result.push(message as vscode.LanguageModelChatRequestMessage);
			continue;
		}

		const nonAudioParts = getNonAudioParts(message);
		const replayText = markerBindings.get(messageIndex);
		if (replayText) {
			stats.replayedAudioMessages += 1;
			stats.droppedAudioParts += audioParts.length;
			result.push(
				createResolvedMessage(message, [
					...nonAudioParts,
					new vscode.LanguageModelTextPart(replayText),
				]),
			);
			continue;
		}

		if (messageIndex === currentAudioMessageIndex) {
			stats.currentAudioMessages += 1;
			if (!transcriberRequested) {
				transcriberRequested = true;
				transcriber = await getTranscriber();
			}
			const audioResolution = await resolveCurrentAudioText(
				audioParts,
				nonAudioParts,
				transcriber,
				stats,
				token,
			);
			const audioText = audioResolution.text;
			if (!transcriber && !token.isCancellationRequested) {
				missingAudioProxy = true;
			}
			audioFailureNotice ??= audioResolution.failureNotice;
			markerAudioText = audioText;
			stats.markerAudioTextChars = audioText.length;
			stats.droppedAudioParts += audioParts.length;
			result.push(
				createResolvedMessage(message, [
					...nonAudioParts,
					new vscode.LanguageModelTextPart(audioText),
				]),
			);
			continue;
		}

		stats.omittedAudioMessages += 1;
		stats.droppedAudioParts += audioParts.length;
		result.push(createResolvedMessage(message, nonAudioParts));
	}

	return {
		messages: result,
		stats,
		replayMarkerMetadata: { audioText: markerAudioText },
		audioModelId: transcriber?.id,
		audioProxySource: transcriber?.source,
		initialResponseNotice: missingAudioProxy ? createAudioProxyMissingNotice() : audioFailureNotice,
	};
}
