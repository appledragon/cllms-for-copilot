import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vscode from 'vscode';
import { REPLAY_MARKER_MIME, REPLAY_MARKER_WRITER_ID } from '../src/provider/replay/consts';
import { resolveConversationSegment } from '../src/provider/segment';

const UUID = '11111111-2222-3333-4444-555555555555';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function markerPart(payload: string): vscode.LanguageModelDataPart {
	return new vscode.LanguageModelDataPart(new TextEncoder().encode(payload), REPLAY_MARKER_MIME);
}

function assistant(content: unknown[]): vscode.LanguageModelChatRequestMessage {
	return {
		role: vscode.LanguageModelChatMessageRole.Assistant,
		content,
	} as unknown as vscode.LanguageModelChatRequestMessage;
}

function user(text: string): vscode.LanguageModelChatRequestMessage {
	return {
		role: vscode.LanguageModelChatMessageRole.User,
		content: [new vscode.LanguageModelTextPart(text)],
	} as unknown as vscode.LanguageModelChatRequestMessage;
}

describe('resolveConversationSegment', () => {
	it('returns markerFound with the segment id and position', () => {
		const messages = [
			user('hi'),
			assistant([
				new vscode.LanguageModelTextPart('answer'),
				markerPart(`${REPLAY_MARKER_WRITER_ID}\\${UUID}`),
			]),
		];

		const segment = resolveConversationSegment(messages);

		assert.equal(segment.reason, 'markerFound');
		assert.equal(segment.segmentId, UUID);
		assert.equal(segment.markerMessageIndex, 1);
		assert.equal(segment.markerPartIndex, 1);
	});

	it('returns markerInvalid with the error and a fresh id for a corrupt marker', () => {
		const messages = [assistant([markerPart('badwriter\\nope')])];

		const segment = resolveConversationSegment(messages);

		assert.equal(segment.reason, 'markerInvalid');
		assert.equal(segment.markerError, 'marker-prefix-mismatch');
		assert.equal(segment.markerMessageIndex, 0);
		assert.equal(segment.markerPartIndex, 0);
		assert.match(segment.segmentId, UUID_PATTERN);
	});

	it('returns markerMissing when there is no assistant marker', () => {
		const segment = resolveConversationSegment([user('hi'), user('there')]);

		assert.equal(segment.reason, 'markerMissing');
		assert.match(segment.segmentId, UUID_PATTERN);
		assert.equal(segment.markerMessageIndex, undefined);
	});

	it('scans from the most recent assistant message backwards', () => {
		const messages = [
			assistant([markerPart(`${REPLAY_MARKER_WRITER_ID}\\${UUID}`)]),
			assistant([new vscode.LanguageModelTextPart('no marker here')]),
		];

		// The latest assistant message has no marker, so it keeps scanning back.
		const segment = resolveConversationSegment(messages);

		assert.equal(segment.reason, 'markerFound');
		assert.equal(segment.markerMessageIndex, 0);
	});
});
