import { t } from '../../../i18n';
import { AudioProxyError } from './errors';

export function resolveAudioEndpoint(url: string): URL {
	return createHttpsUrl(url);
}

export function validateAudioEndpointUrl(value: string): void {
	createHttpsUrl(value);
}

function createHttpsUrl(value: string): URL {
	try {
		const parsed = new URL(value);
		if (parsed.protocol !== 'https:') {
			throw new AudioProxyError('invalid-url', t('audio.proxy.error.invalidUrlProtocol'));
		}
		return parsed;
	} catch (error) {
		if (error instanceof AudioProxyError) {
			throw error;
		}
		throw new AudioProxyError('invalid-url', t('audio.proxy.error.invalidUrl'), undefined, error);
	}
}
