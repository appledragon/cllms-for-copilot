import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vscode from 'vscode';
import { openAIChatAdapter } from '../src/provider/vision/protocols/providers/openai/chat';
import { openAIResponsesAdapter } from '../src/provider/vision/protocols/providers/openai/responses';
import { anthropicMessagesAdapter } from '../src/provider/vision/protocols/providers/anthropic/messages';
import { getVisionProviderAdapter } from '../src/provider/vision/protocols/providers';
import { createProviderHeaders } from '../src/provider/vision/protocols/headers';
import { VisionProxyError, type VisionProxyErrorCode } from '../src/provider/vision/protocols/errors';
import type {
	VisionDescriptionRequest,
	VisionImagePart,
	VisionProxyConfig,
} from '../src/provider/vision/types';

const token = new vscode.CancellationTokenSource().token;

// Bytes [1,2,3] -> "AQID", bytes [4,5] -> "BAU=" in base64.
const pngImage: VisionImagePart = { mimeType: 'image/png', data: new Uint8Array([1, 2, 3]) };
const jpegImage: VisionImagePart = { mimeType: 'image/jpeg', data: new Uint8Array([4, 5]) };

function request(prompt: string, images: readonly VisionImagePart[]): VisionDescriptionRequest {
	return { prompt, images, token };
}

function openAIConfig(overrides: Partial<VisionProxyConfig> = {}): VisionProxyConfig {
	return {
		providerFamily: 'openai-compatible',
		apiType: 'chat-completions',
		url: 'https://api.example.com/v1/chat/completions',
		modelId: 'vision-model',
		updatedAt: 1,
		...overrides,
	};
}

function anthropicConfig(overrides: Partial<VisionProxyConfig> = {}): VisionProxyConfig {
	return {
		providerFamily: 'anthropic-compatible',
		apiType: 'messages',
		url: 'https://api.anthropic.example.com/v1/messages',
		modelId: 'vision-model',
		updatedAt: 1,
		...overrides,
	};
}

function expectVisionError(fn: () => unknown, code: VisionProxyErrorCode): void {
	assert.throws(fn, (error: unknown) => {
		assert.ok(error instanceof VisionProxyError, `expected VisionProxyError, got ${String(error)}`);
		assert.equal(error.code, code);
		return true;
	});
}

describe('openAIChatAdapter.createBody', () => {
	it('builds the chat-completions request body with image_url parts', () => {
		const body = openAIChatAdapter.createBody(
			openAIConfig({ extraBody: { temperature: 0.2, top_p: 0.9 } }),
			request('Describe the image', [pngImage, jpegImage]),
		);

		assert.deepStrictEqual(body, {
			temperature: 0.2,
			top_p: 0.9,
			model: 'vision-model',
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Describe the image' },
						{ type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } },
						{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,BAU=' } },
					],
				},
			],
		});
	});

	it('never lets extraBody override model or messages', () => {
		const body = openAIChatAdapter.createBody(
			openAIConfig({ extraBody: { model: 'evil', messages: 'evil' } }),
			request('p', [pngImage]),
		) as { model: unknown; messages: unknown };
		assert.equal(body.model, 'vision-model');
		assert.ok(Array.isArray(body.messages));
	});
});

describe('openAIChatAdapter.parseResponse', () => {
	it('reads a string content choice', () => {
		assert.equal(
			openAIChatAdapter.parseResponse({ choices: [{ message: { content: '  Hello world  ' } }] }),
			'Hello world',
		);
	});

	it('joins array content text blocks', () => {
		assert.equal(
			openAIChatAdapter.parseResponse({
				choices: [{ message: { content: [{ type: 'text', text: 'Hel' }, { type: 'text', text: 'lo' }] } }],
			}),
			'Hello',
		);
	});

	it('rejects a payload without choices', () => {
		expectVisionError(() => openAIChatAdapter.parseResponse({}), 'unsupported-response');
		expectVisionError(() => openAIChatAdapter.parseResponse(null), 'unsupported-response');
	});

	it('rejects an empty content choice', () => {
		expectVisionError(
			() => openAIChatAdapter.parseResponse({ choices: [{ message: { content: '   ' } }] }),
			'empty-response',
		);
	});
});

describe('openAIResponsesAdapter.createBody', () => {
	it('builds the responses request body with input_image parts', () => {
		const body = openAIResponsesAdapter.createBody(
			openAIConfig({ apiType: 'responses', extraBody: { temperature: 0.2 } }),
			request('Describe the image', [pngImage, jpegImage]),
		);

		assert.deepStrictEqual(body, {
			temperature: 0.2,
			model: 'vision-model',
			input: [
				{
					role: 'user',
					content: [
						{ type: 'input_text', text: 'Describe the image' },
						{ type: 'input_image', detail: 'auto', image_url: 'data:image/png;base64,AQID' },
						{ type: 'input_image', detail: 'auto', image_url: 'data:image/jpeg;base64,BAU=' },
					],
				},
			],
		});
	});

	it('never lets extraBody override model or input', () => {
		const body = openAIResponsesAdapter.createBody(
			openAIConfig({ apiType: 'responses', extraBody: { model: 'evil', input: 'evil' } }),
			request('p', [pngImage]),
		) as { model: unknown; input: unknown };
		assert.equal(body.model, 'vision-model');
		assert.ok(Array.isArray(body.input));
	});
});

describe('openAIResponsesAdapter.parseResponse', () => {
	it('prefers the output_text shortcut', () => {
		assert.equal(
			openAIResponsesAdapter.parseResponse({ output_text: '  done  ', output: [] }),
			'done',
		);
	});

	it('falls back to joining the output array', () => {
		assert.equal(
			openAIResponsesAdapter.parseResponse({
				output: [
					{ content: [{ type: 'text', text: 'Part ' }] },
					{ text: 'two' },
				],
			}),
			'Part two',
		);
	});

	it('rejects a non-record payload', () => {
		expectVisionError(() => openAIResponsesAdapter.parseResponse('x'), 'unsupported-response');
	});

	it('rejects when output is not an array and there is no output_text', () => {
		expectVisionError(() => openAIResponsesAdapter.parseResponse({ foo: 1 }), 'unsupported-response');
	});

	it('rejects an empty output array', () => {
		expectVisionError(() => openAIResponsesAdapter.parseResponse({ output: [] }), 'empty-response');
	});
});

describe('anthropicMessagesAdapter.createBody', () => {
	it('builds the messages request body with base64 image sources', () => {
		const body = anthropicMessagesAdapter.createBody(
			anthropicConfig(),
			request('Describe the image', [pngImage, jpegImage]),
		);

		assert.deepStrictEqual(body, {
			max_tokens: 1024,
			model: 'vision-model',
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Describe the image' },
						{
							type: 'image',
							source: { type: 'base64', media_type: 'image/png', data: 'AQID' },
						},
						{
							type: 'image',
							source: { type: 'base64', media_type: 'image/jpeg', data: 'BAU=' },
						},
					],
				},
			],
		});
	});

	it('lets extraBody override the default max_tokens but not model/messages', () => {
		const body = anthropicMessagesAdapter.createBody(
			anthropicConfig({ extraBody: { max_tokens: 64, model: 'evil', messages: 'evil' } }),
			request('p', [pngImage]),
		) as { max_tokens: unknown; model: unknown; messages: unknown };
		assert.equal(body.max_tokens, 64);
		assert.equal(body.model, 'vision-model');
		assert.ok(Array.isArray(body.messages));
	});
});

describe('anthropicMessagesAdapter.parseResponse', () => {
	it('joins text content blocks and ignores non-text blocks', () => {
		assert.equal(
			anthropicMessagesAdapter.parseResponse({
				content: [
					{ type: 'text', text: 'Hello ' },
					{ type: 'tool_use', name: 'x' },
					{ type: 'text', text: 'world' },
				],
			}),
			'Hello world',
		);
	});

	it('rejects a payload without a content array', () => {
		expectVisionError(() => anthropicMessagesAdapter.parseResponse({}), 'unsupported-response');
	});

	it('rejects an empty text response', () => {
		expectVisionError(
			() => anthropicMessagesAdapter.parseResponse({ content: [{ type: 'text', text: '   ' }] }),
			'empty-response',
		);
	});
});

describe('getVisionProviderAdapter', () => {
	it('selects the anthropic adapter for the anthropic-compatible family', () => {
		assert.equal(getVisionProviderAdapter(anthropicConfig()), anthropicMessagesAdapter);
	});

	it('selects the responses adapter for openai + responses', () => {
		assert.equal(
			getVisionProviderAdapter(openAIConfig({ apiType: 'responses' })),
			openAIResponsesAdapter,
		);
	});

	it('selects the chat adapter for openai + chat-completions', () => {
		assert.equal(getVisionProviderAdapter(openAIConfig()), openAIChatAdapter);
	});
});

describe('createProviderHeaders', () => {
	it('adds a bearer token for the openai family', () => {
		assert.deepStrictEqual(createProviderHeaders(openAIConfig(), 'KEY'), {
			'content-type': 'application/json',
			authorization: 'Bearer KEY',
		});
	});

	it('omits authorization when there is no api key', () => {
		assert.deepStrictEqual(createProviderHeaders(openAIConfig(), undefined), {
			'content-type': 'application/json',
		});
	});

	it('uses the anthropic auth headers for the anthropic family', () => {
		assert.deepStrictEqual(createProviderHeaders(anthropicConfig(), 'KEY'), {
			'content-type': 'application/json',
			'anthropic-version': '2023-06-01',
			'x-api-key': 'KEY',
		});
	});

	it('merges custom headers and overrides built-ins case-insensitively', () => {
		const headers = createProviderHeaders(
			openAIConfig({ headers: { 'Content-Type': 'application/xml', 'X-Custom': '1' } }),
			'KEY',
		);
		assert.deepStrictEqual(headers, {
			authorization: 'Bearer KEY',
			'Content-Type': 'application/xml',
			'X-Custom': '1',
		});
	});
});
