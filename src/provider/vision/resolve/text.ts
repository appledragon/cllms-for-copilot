import vscode from 'vscode';
import { t } from '../../../i18n';
import { toWellFormedString } from '../../../json';
import { logger } from '../../../logger';
import { createVisionProxyFailureNotice } from '../../tools/notices';
import {
	formatVisionProxyError,
	formatVisionProxyErrorCode,
	getVisionProxyErrorDisplayCode,
	isVisionProxyError,
} from '../protocols/errors';
import {
	IMAGE_DESCRIPTION_PREFIX,
	IMAGE_DESCRIPTION_SUFFIX,
	IMAGE_DESCRIPTION_UNAVAILABLE,
} from '../consts';
import type { VisionDescriber, VisionResolutionStats } from '../types';
import { getVisionPrompt } from '../sources/vscode';
import { hasNonEmptyTextPart, toVisionImagePart } from './parts';

export interface CurrentVisionResolution {
	text: string;
	failureNotice?: string;
}

export async function resolveCurrentVisionText(
	imageParts: readonly vscode.LanguageModelDataPart[],
	nonImageParts: readonly vscode.LanguageModelInputPart[],
	visionDescriber: VisionDescriber | undefined,
	stats: VisionResolutionStats,
	token: vscode.CancellationToken,
): Promise<CurrentVisionResolution> {
	if (!visionDescriber || token.isCancellationRequested) {
		if (!visionDescriber) {
			logger.warn(t('vision.unavailable'));
		}
		stats.unavailableImageMessages += 1;
		return { text: createVisionReplayText(IMAGE_DESCRIPTION_UNAVAILABLE, nonImageParts) };
	}

	try {
		const description = await visionDescriber.describe({
			prompt: getVisionPrompt(),
			images: imageParts.map(toVisionImagePart),
			token,
		});
		if (description.length === 0) {
			stats.failedImageMessages += 1;
			return createFailedVisionResolution(
				formatVisionProxyErrorCode('empty-response'),
				t('vision.proxy.error.emptyResponse'),
				nonImageParts,
			);
		}

		stats.generatedImageMessages += 1;
		return { text: createVisionReplayText(createImageDescriptionText(description), nonImageParts) };
	} catch (error) {
		logger.error(t('vision.proxyError'), formatVisionProxyError(error));
		stats.failedImageMessages += 1;
		return createFailedVisionResolution(
			getVisionProxyErrorDisplayCode(error),
			formatVisionProxyErrorMessage(error),
			nonImageParts,
		);
	}
}

function createFailedVisionResolution(
	errorCode: string,
	errorMessage: string,
	nonImageParts: readonly vscode.LanguageModelInputPart[],
): CurrentVisionResolution {
	return {
		text: createVisionReplayText(IMAGE_DESCRIPTION_UNAVAILABLE, nonImageParts),
		failureNotice: createVisionProxyFailureNotice(errorCode, errorMessage),
	};
}

function formatVisionProxyErrorMessage(error: unknown): string {
	if (isVisionProxyError(error)) {
		return error.message;
	}
	return t('vision.proxy.error.requestFailed', t('vision.proxy.error.unknown'));
}

function createVisionReplayText(
	visionText: string,
	nonImageParts: readonly vscode.LanguageModelInputPart[],
): string {
	const separatedText = hasNonEmptyTextPart(nonImageParts) ? `\n\n${visionText}` : visionText;
	return toWellFormedString(separatedText);
}

function createImageDescriptionText(description: string): string {
	return IMAGE_DESCRIPTION_PREFIX + description + IMAGE_DESCRIPTION_SUFFIX;
}
