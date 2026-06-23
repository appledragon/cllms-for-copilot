import { t } from '../../../../../i18n';
import { isRecord } from '../../../../vision/shared';
import type { AudioTranscriptionRequest, AudioProxyConfig } from '../../../types';
import { AudioProxyError } from '../../errors';
import type { AudioProviderAdapter } from '../types';

export const openAIResponsesAudioAdapter: AudioProviderAdapter = {
	createBody,
	parseResponse,
};

function createBody(config: AudioProxyConfig, request: AudioTranscriptionRequest): object {
	return {
		...config.extraBody,
		model: config.modelId,
		input: [
			{
				role: 'user',
				content: [
					{ type: 'input_text', text: request.prompt },
					...request.audios.map((audio) => ({
						type: 'input_audio',
						input_audio: {
							format: inferAudioFormat(audio.mimeType),
							data: Buffer.from(
								audio.data.buffer,
								audio.data.byteOffset,
								audio.data.byteLength,
							).toString('base64'),
						},
					})),
				],
			},
		],
	};
}

function parseResponse(value: unknown): string {
	if (!isRecord(value)) {
		throw new AudioProxyError('unsupported-response', t('audio.proxy.error.unsupportedOpenAIResponse'));
	}

	if (typeof value.output_text === 'string' && value.output_text.trim()) {
		return value.output_text.trim();
	}
	const output = value.output;
	if (!Array.isArray(output)) {
		throw new AudioProxyError('unsupported-response', t('audio.proxy.error.unsupportedOpenAIResponse'));
	}
	const text = output
		.map((item) => {
			if (!isRecord(item)) return undefined;
			if (typeof item.text === 'string') return item.text;
			if (typeof item.content === 'string') return item.content;
			if (!Array.isArray(item.content)) return undefined;
			return item.content
				.map((block) => (isRecord(block) && typeof block.text === 'string' ? block.text : ''))
				.join('');
		})
		.filter((item): item is string => typeof item === 'string')
		.join('')
		.trim();
	if (!text) {
		throw new AudioProxyError('empty-response', t('audio.proxy.error.emptyResponse'));
	}
	return text;
}

function inferAudioFormat(mimeType: string): string {
	switch (mimeType) {
		case 'audio/wav':
		case 'audio/x-wav':
			return 'wav';
		case 'audio/mpeg':
		case 'audio/mp3':
			return 'mp3';
		case 'audio/flac':
			return 'flac';
		case 'audio/ogg':
			return 'ogg';
		default:
			return 'wav';
	}
}
