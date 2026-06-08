import type { VisionDescriptionRequest, VisionProxyConfig } from '../../../types';
import type { VisionProviderAdapter } from '../types';
import { isRecord, joinTextBlocks, toBase64, throwVisionResponseError } from '../utils';

export const openAIResponsesAdapter: VisionProviderAdapter = { createBody, parseResponse };

function createBody(config: VisionProxyConfig, request: VisionDescriptionRequest): object {
	return {
		...config.extraBody,
		model: config.modelId,
		input: [
			{
				role: 'user',
				content: [
					{ type: 'input_text', text: request.prompt },
					...request.images.map((image) => ({
						type: 'input_image',
						detail: 'auto',
						image_url: `data:${image.mimeType};base64,${toBase64(image)}`,
					})),
				],
			},
		],
	};
}

function parseResponse(value: unknown): string {
	if (!isRecord(value)) {
		throwVisionResponseError('unsupported-response', 'vision.proxy.error.unsupportedOpenAIResponse');
	}

	if (typeof value.output_text === 'string' && value.output_text.trim()) {
		return value.output_text.trim();
	}

	const text = parseOutput(value.output).trim();
	if (!text) {
		throwVisionResponseError('empty-response', 'vision.proxy.error.emptyResponse');
	}
	return text;
}

function parseOutput(output: unknown): string {
	if (!Array.isArray(output)) {
		throwVisionResponseError('unsupported-response', 'vision.proxy.error.unsupportedOpenAIResponse');
	}

	return output
		.map((item) => {
			if (!isRecord(item)) {
				return undefined;
			}
			if (typeof item.text === 'string') {
				return item.text;
			}
			if (typeof item.content === 'string') {
				return item.content;
			}
			if (Array.isArray(item.content)) {
				return joinTextBlocks(item.content);
			}
			return undefined;
		})
		.filter((item): item is string => typeof item === 'string')
		.join('');
}
