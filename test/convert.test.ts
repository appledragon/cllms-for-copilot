import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vscode from 'vscode';
import {
	convertMessages,
	convertTools,
	countMessageChars,
	llmContentToText,
} from '../src/provider/convert';
import type { LlmMessage } from '../src/types';

function message(
	role: number,
	content: unknown[],
): vscode.LanguageModelChatRequestMessage {
	return { role, content } as unknown as vscode.LanguageModelChatRequestMessage;
}

const { User, Assistant } = vscode.LanguageModelChatMessageRole;

describe('convertMessages', () => {
	it('converts a plain user text message', () => {
		const result = convertMessages(
			[message(User, [new vscode.LanguageModelTextPart('hello')])],
			false,
		);
		assert.deepEqual(result, [{ role: 'user', content: 'hello' }]);
	});

	it('emits reasoning_content for thinking models even when empty', () => {
		const result = convertMessages(
			[message(Assistant, [new vscode.LanguageModelTextPart('answer')])],
			true,
		);
		assert.deepEqual(result, [{ role: 'assistant', content: 'answer', reasoning_content: '' }]);
	});

	it('converts assistant tool calls', () => {
		const result = convertMessages(
			[
				message(Assistant, [
					new vscode.LanguageModelTextPart('calling'),
					new vscode.LanguageModelToolCallPart('call-1', 'read_file', { path: 'a.ts' }),
				]),
			],
			false,
		);
		assert.equal(result.length, 1);
		assert.equal(result[0].role, 'assistant');
		assert.deepEqual(result[0].tool_calls, [
			{
				id: 'call-1',
				type: 'function',
				function: { name: 'read_file', arguments: '{"path":"a.ts"}' },
			},
		]);
	});

	it('emits a tool message following its tool-result part', () => {
		const result = convertMessages(
			[
				message(User, [
					new vscode.LanguageModelToolResultPart('call-1', [
						new vscode.LanguageModelTextPart('file contents'),
					]),
				]),
			],
			false,
		);
		assert.deepEqual(result, [
			{ role: 'tool', content: 'file contents', tool_call_id: 'call-1' },
		]);
	});
});

describe('llmContentToText', () => {
	it('returns string content unchanged', () => {
		assert.equal(llmContentToText('plain'), 'plain');
	});

	it('flattens multimodal parts with an image placeholder', () => {
		const content: LlmMessage['content'] = [
			{ type: 'text', text: 'see ' },
			{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
		];
		assert.equal(llmContentToText(content), 'see [image]');
	});
});

describe('convertTools', () => {
	it('returns undefined for empty tool lists', () => {
		assert.equal(convertTools(undefined), undefined);
		assert.equal(convertTools([]), undefined);
	});

	it('falls back to an empty object schema when none is provided', () => {
		const tools = convertTools([
			{ name: 'do_thing', description: 'does a thing', inputSchema: undefined },
		] as unknown as vscode.LanguageModelChatTool[]);
		assert.deepEqual(tools, [
			{
				type: 'function',
				function: {
					name: 'do_thing',
					description: 'does a thing',
					parameters: { type: 'object', properties: {} },
				},
			},
		]);
	});
});

describe('countMessageChars', () => {
	it('counts text, reasoning, and tool-call payloads', () => {
		const messages: LlmMessage[] = [
			{ role: 'user', content: 'abc' },
			{
				role: 'assistant',
				content: 'de',
				reasoning_content: 'fg',
				tool_calls: [
					{ id: 'x', type: 'function', function: { name: 'hi', arguments: '{}' } },
				],
			},
		];
		// 3 + 2 + 2 + 2 (name 'hi') + 2 (args '{}')
		assert.equal(countMessageChars(messages), 11);
	});
});
