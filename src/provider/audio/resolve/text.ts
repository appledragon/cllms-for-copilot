import vscode from 'vscode';
import { t } from '../../../i18n';
import { toWellFormedString } from '../../../json';
import { logger } from '../../../logger';
import { createAudioProxyFailureNotice } from '../../tools/notices';
import {
	AUDIO_TRANSCRIPTION_PROMPT,
	AUDIO_TRANSCRIPTION_PREFIX,
	AUDIO_TRANSCRIPTION_SUFFIX,
	AUDIO_TRANSCRIPTION_UNAVAILABLE,
	MAX_AUDIO_PART_BYTES,
} from '../consts';
import { isAudioProxyError } from '../protocols/errors';
import type { AudioResolutionStats, AudioTranscriber } from '../types';
import { hasNonEmptyTextPart, toAudioPart } from './parts';

export interface CurrentAudioResolution {
	text: string;
	failureNotice?: string;
}

export async function resolveCurrentAudioText(
	audioParts: readonly vscode.LanguageModelDataPart[],
	nonAudioParts: readonly vscode.LanguageModelInputPart[],
	audioTranscriber: AudioTranscriber | undefined,
	stats: AudioResolutionStats,
	token: vscode.CancellationToken,
): Promise<CurrentAudioResolution> {
	if (!audioTranscriber || token.isCancellationRequested) {
		stats.unavailableAudioMessages += 1;
		return { text: createAudioReplayText(AUDIO_TRANSCRIPTION_UNAVAILABLE, nonAudioParts) };
	}
	for (const part of audioParts) {
		if (!part.mimeType.startsWith('audio/')) {
			stats.failedAudioMessages += 1;
			return createFailedAudioResolution(
				'INVALID_AUDIO',
				t('audio.proxy.error.invalidAudioPart', part.mimeType),
				nonAudioParts,
			);
		}
		if (part.data.byteLength > MAX_AUDIO_PART_BYTES) {
			stats.failedAudioMessages += 1;
			return createFailedAudioResolution(
				'AUDIO_TOO_LARGE',
				t('audio.proxy.error.audioTooLarge', Math.ceil(part.data.byteLength / (1024 * 1024))),
				nonAudioParts,
			);
		}
	}

	try {
		const transcription = await audioTranscriber.transcribe({
			prompt: AUDIO_TRANSCRIPTION_PROMPT,
			audios: audioParts.map(toAudioPart),
			token,
		});
		if (transcription.length === 0) {
			stats.failedAudioMessages += 1;
			return createFailedAudioResolution('EMPTY_RESPONSE', t('audio.proxy.error.emptyResponse'), nonAudioParts);
		}
		stats.generatedAudioMessages += 1;
		return {
			text: createAudioReplayText(
				`${AUDIO_TRANSCRIPTION_PREFIX}${transcription}${AUDIO_TRANSCRIPTION_SUFFIX}`,
				nonAudioParts,
			),
		};
	} catch (error) {
		logger.error(t('audio.proxyError'), error);
		stats.failedAudioMessages += 1;
		return createFailedAudioResolution(
			'AUDIO_PROXY_ERROR',
			formatAudioProxyErrorMessage(error),
			nonAudioParts,
		);
	}
}

function createFailedAudioResolution(
	errorCode: string,
	errorMessage: string,
	nonAudioParts: readonly vscode.LanguageModelInputPart[],
): CurrentAudioResolution {
	return {
		text: createAudioReplayText(AUDIO_TRANSCRIPTION_UNAVAILABLE, nonAudioParts),
		failureNotice: createAudioProxyFailureNotice(errorCode, errorMessage),
	};
}

function formatAudioProxyErrorMessage(error: unknown): string {
	if (isAudioProxyError(error)) {
		return error.message;
	}
	return t('audio.proxy.error.requestFailed', t('audio.proxy.error.unknown'));
}

function createAudioReplayText(
	audioText: string,
	nonAudioParts: readonly vscode.LanguageModelInputPart[],
): string {
	const separatedText = hasNonEmptyTextPart(nonAudioParts) ? `\n\n${audioText}` : audioText;
	return toWellFormedString(separatedText);
}
