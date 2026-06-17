import vscode from 'vscode';
import { safeStringify } from '../../json';
import { ENCODED_JSON_MARKER_PREFIX, REPLAY_MARKER_MIME, REPLAY_MARKER_WRITER_ID } from './consts';
import type { ReplayMarkerMetadata } from './types';

const textEncoder = new TextEncoder();

type MarkerSectionKey = 'vision' | 'reasoning';

export function createReplayMarkerPart(
	metadata: ReplayMarkerMetadata,
): vscode.LanguageModelDataPart {
	const payload = encodeReplayMarkerJson({
		...createMarkerTextSection('vision', metadata.visionText),
		...createMarkerTextSection('reasoning', metadata.reasoningText),
	});
	return new vscode.LanguageModelDataPart(
		textEncoder.encode(`${REPLAY_MARKER_WRITER_ID}\\${payload}`),
		REPLAY_MARKER_MIME,
	);
}

function createMarkerTextSection(key: MarkerSectionKey, text: string | undefined): object {
	return text ? { [key]: { text } } : {};
}

function encodeReplayMarkerJson(value: object): string {
	const json = safeStringify(value);
	return `${ENCODED_JSON_MARKER_PREFIX}${Buffer.from(json, 'utf8').toString('base64url')}`;
}
