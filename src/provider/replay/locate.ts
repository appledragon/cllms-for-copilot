import vscode from 'vscode';
import { REPLAY_MARKER_MIME } from './consts';
import { parseReplayMarkerData } from './parse';
import type {
	LocatedReplayMarker,
	ReplayMarkerMetadata,
	ReplayMarkerParseResult,
} from './types';

export function findFirstReplayMarker(
	message: vscode.LanguageModelChatRequestMessage,
): LocatedReplayMarker | undefined {
	for (const [partIndex, part] of message.content.entries()) {
		const marker = parseReplayMarkerPart(part);
		if (marker) {
			return { partIndex, marker };
		}
	}
	return undefined;
}

export function parseFirstReplayMarker(
	message: vscode.LanguageModelChatRequestMessage,
): ReplayMarkerParseResult | undefined {
	return findFirstReplayMarker(message)?.marker;
}

function parseReplayMarkerPart(part: unknown): ReplayMarkerParseResult | undefined {
	if (!(part instanceof vscode.LanguageModelDataPart)) {
		return undefined;
	}
	if (part.mimeType !== REPLAY_MARKER_MIME) {
		return undefined;
	}
	return parseReplayMarkerData(part.data);
}

export function hasReplayMarkerMetadata(metadata: ReplayMarkerMetadata): boolean {
	return Boolean(metadata.visionText || metadata.reasoningText);
}
