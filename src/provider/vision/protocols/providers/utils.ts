import { t } from '../../../../i18n';
import type { VisionImagePart } from '../../types';
import { isRecord } from '../../shared';
import { VisionProxyError } from '../errors';

export { isRecord } from '../../shared';

export function toBase64(image: VisionImagePart): string {
	return Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength).toString(
		'base64',
	);
}

export function pickBlockText(block: unknown): string | undefined {
	if (!isRecord(block)) {
		return undefined;
	}
	if (typeof block.text === 'string') {
		return block.text;
	}
	if (typeof block.content === 'string') {
		return block.content;
	}
	return undefined;
}

export function joinTextBlocks(blocks: readonly unknown[]): string {
	return blocks
		.map(pickBlockText)
		.filter((text): text is string => typeof text === 'string')
		.join('');
}

export function throwVisionResponseError(
	code: 'unsupported-response' | 'empty-response',
	messageKey: string,
): never {
	throw new VisionProxyError(code, t(messageKey));
}
