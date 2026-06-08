import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vscode from 'vscode';
import {
	classifyLlmRequest,
	classifyProviderRequest,
	formatModelFields,
	formatRequestLogLine,
	shouldForceThinkingNone,
} from '../src/provider/routing/classifier';
import type { LlmRequest } from '../src/types';

function userMessage(text: string): vscode.LanguageModelChatRequestMessage {
	return {
		role: vscode.LanguageModelChatMessageRole.User,
		content: [new vscode.LanguageModelTextPart(text)],
	} as unknown as vscode.LanguageModelChatRequestMessage;
}

function tool(name: string): vscode.LanguageModelChatTool {
	return { name, description: '', inputSchema: undefined } as unknown as vscode.LanguageModelChatTool;
}

function llmRequest(firstText: string, latestUserText = firstText): LlmRequest {
	return {
		model: 'qwen3-max',
		stream: true,
		messages: [
			{ role: 'system', content: firstText },
			{ role: 'user', content: latestUserText },
		],
	};
}

describe('classifyProviderRequest', () => {
	it('detects the main agent system prompt', () => {
		const messages = [userMessage('You are an expert AI programming assistant working in VS Code.')];
		assert.equal(classifyProviderRequest({ messages }), 'main-agent');
	});

	it('detects the todo tracker by its sole tool', () => {
		const messages = [userMessage('whatever')];
		assert.equal(
			classifyProviderRequest({ messages, tools: [tool('manage_todo_list')] }),
			'todo-tracker',
		);
	});

	it('detects the prompt categorizer by prefix', () => {
		const messages = [
			userMessage('You are an expert classifier for AI coding assistant prompts and more.'),
		];
		assert.equal(classifyProviderRequest({ messages }), 'prompt-categorizer');
	});

	it('detects terminal steering from the latest user message', () => {
		const messages = [
			userMessage('You are an expert AI programming assistant'),
			userMessage('[Terminal abc123 notification: command finished]'),
		];
		assert.equal(classifyProviderRequest({ messages }), 'terminal-steering');
	});

	it('falls back to background when a tool is present but no prompt matches', () => {
		const messages = [userMessage('do something')];
		assert.equal(classifyProviderRequest({ messages, tools: [tool('read_file')] }), 'background');
	});

	it('returns unknown for an empty request', () => {
		assert.equal(classifyProviderRequest({ messages: [] }), 'unknown');
	});
});

describe('classifyLlmRequest', () => {
	it('classifies from the API-shaped request messages', () => {
		assert.equal(
			classifyLlmRequest({
				request: llmRequest('You are an expert AI programming assistant.'),
			}),
			'main-agent',
		);
	});

	it('detects git commit message generation', () => {
		assert.equal(
			classifyLlmRequest({
				request: llmRequest(
					'You are an AI programming assistant, helping a software developer to come with the best git commit message',
				),
			}),
			'git-commit-message',
		);
	});

	it('detects terminal steering via the latest user text', () => {
		assert.equal(
			classifyLlmRequest({
				request: llmRequest(
					'You are an expert AI programming assistant.',
					'[Terminal t1 notification: build done]',
				),
			}),
			'terminal-steering',
		);
	});
});

describe('classifier helpers', () => {
	it('forces thinking off only for lightweight request kinds', () => {
		assert.equal(shouldForceThinkingNone('todo-tracker'), true);
		assert.equal(shouldForceThinkingNone('chat-title'), true);
		assert.equal(shouldForceThinkingNone('main-agent'), false);
		assert.equal(shouldForceThinkingNone('background'), false);
	});

	it('formats model fields, hiding redundant api model ids', () => {
		assert.equal(formatModelFields('qwen3-max'), 'model=qwen3-max');
		assert.equal(formatModelFields('qwen3-max', 'qwen3-max'), 'model=qwen3-max');
		assert.equal(formatModelFields('qwen3-max', 'qwen-max-latest'), 'model=qwen3-max apiModel=qwen-max-latest');
	});

	it('prefixes log lines with the request kind', () => {
		assert.equal(formatRequestLogLine('main-agent', 'hello'), '[main-agent] hello');
	});
});
