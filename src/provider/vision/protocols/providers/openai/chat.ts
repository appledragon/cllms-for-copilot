import type { VisionDescriptionRequest, VisionProxyConfig } from '../../../types';
import type { VisionProviderAdapter } from '../types';
import { isRecord, joinTextBlocks, toBase64, throwVisionResponseError } from '../utils';

export const openAIChatAdapter: VisionProviderAdapter = { createBody, parseResponse };

function createBody(config: VisionProxyConfig, request: VisionDescriptionRequest): object {
	return {
		...config.extraBody,
		model: config.modelId,
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: request.prompt },
					...request.images.map((image) => ({
						type: 'image_url',
						image_url: {
							url: `data:${image.mimeType};base64,${toBase64(image)}`,
						},
					})),
				],
			},
		],
	};
}

function parseResponse(value: unknown): string {
	if (!isRecord(value) || !Array.isArray(value.choices)) {
		throwVisionResponseError(
			'unsupported-response',
			'vision.proxy.error.unsupportedOpenAIResponse',
		);
	}

	const choice = value.choices[0];
	const message = isRecord(choice) ? choice.message : undefined;
	const content = isRecord(message) ? message.content : undefined;
	const text = parseContent(content).trim();

	if (!text) {
		throwVisionResponseError('empty-response', 'vision.proxy.error.emptyResponse');
	}
	return text;
}

function parseContent(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}
	if (!Array.isArray(content)) {
		throwVisionResponseError('unsupported-response', 'vision.proxy.error.unsupportedOpenAIContent');
	}
	return joinTextBlocks(content);
}
