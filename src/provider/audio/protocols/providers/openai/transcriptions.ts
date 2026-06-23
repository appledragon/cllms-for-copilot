import { t } from '../../../../../i18n';
import { isRecord } from '../../../../vision/shared';
import type { AudioTranscriptionRequest, AudioProxyConfig } from '../../../types';
import { AudioProxyError } from '../../errors';
import type { AudioProviderAdapter } from '../types';

export const openAITranscriptionsAdapter: AudioProviderAdapter = {
	createBody: createOpenAITranscriptionsBody,
	parseResponse: parseOpenAITranscriptionsResponse,
};

function createOpenAITranscriptionsBody(
	config: AudioProxyConfig,
	request: AudioTranscriptionRequest,
): object {
	return {
		...config.extraBody,
		model: config.modelId,
		input: request.prompt,
		audio: request.audios.map((audio) => ({
			format: audio.mimeType,
			data: Buffer.from(audio.data.buffer, audio.data.byteOffset, audio.data.byteLength).toString(
				'base64',
			),
		})),
	};
}

function parseOpenAITranscriptionsResponse(value: unknown): string {
	if (!isRecord(value)) {
		throw new AudioProxyError(
			'unsupported-response',
			t('audio.proxy.error.unsupportedOpenAIResponse'),
		);
	}
	const text = typeof value.text === 'string' ? value.text.trim() : '';
	if (!text) {
		throw new AudioProxyError('empty-response', t('audio.proxy.error.emptyResponse'));
	}
	return text;
}
