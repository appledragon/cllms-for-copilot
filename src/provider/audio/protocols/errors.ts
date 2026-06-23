import { t } from '../../../i18n';

export type AudioProxyErrorCode =
	| 'missing-configuration'
	| 'invalid-custom-headers'
	| 'invalid-url'
	| 'http-auth'
	| 'http-not-found'
	| 'http-payload-too-large'
	| 'http-rate-limited'
	| 'http-provider'
	| 'timeout'
	| 'cancelled'
	| 'empty-response'
	| 'unsupported-response'
	| 'network';

export class AudioProxyError extends Error {
	constructor(
		readonly code: AudioProxyErrorCode,
		message: string,
		readonly status?: number,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = 'AudioProxyError';
	}
}

export function isAudioProxyError(error: unknown): error is AudioProxyError {
	return error instanceof AudioProxyError;
}

export function mapAudioProxyHttpError(status: number, target: string): AudioProxyError {
	if (status === 401 || status === 403) {
		return new AudioProxyError('http-auth', t('audio.proxy.error.auth', status), status);
	}
	if (status === 404) {
		return new AudioProxyError('http-not-found', t('audio.proxy.error.notFound', target), status);
	}
	if (status === 413) {
		return new AudioProxyError(
			'http-payload-too-large',
			t('audio.proxy.error.payloadTooLarge', status),
			status,
		);
	}
	if (status === 429) {
		return new AudioProxyError('http-rate-limited', t('audio.proxy.error.rateLimited', status), status);
	}
	if (status >= 500) {
		return new AudioProxyError(
			'http-provider',
			t('audio.proxy.error.providerUnavailable', status),
			status,
		);
	}
	return new AudioProxyError('http-provider', t('audio.proxy.error.requestFailed', status), status);
}
