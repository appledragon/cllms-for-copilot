import { t } from '../../../i18n';
import type { AudioProxyConfig } from '../types';
import { AudioProxyError } from './errors';

export function normalizeCustomHeaders(headers: unknown): Record<string, string> | undefined {
	if (headers === undefined || headers === null) {
		return undefined;
	}
	if (typeof headers !== 'object' || Array.isArray(headers)) {
		throw new AudioProxyError('invalid-custom-headers', t('audio.proxy.error.customHeadersObject'));
	}

	const normalized: Record<string, string> = {};
	for (const [rawName, rawValue] of Object.entries(headers)) {
		const name = rawName.trim();
		if (!name) {
			throw new AudioProxyError(
				'invalid-custom-headers',
				t('audio.proxy.error.customHeaderNameEmpty'),
			);
		}
		if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(name)) {
			throw new AudioProxyError(
				'invalid-custom-headers',
				t('audio.proxy.error.customHeaderNameInvalid', name),
			);
		}
		if (typeof rawValue !== 'string') {
			throw new AudioProxyError(
				'invalid-custom-headers',
				t('audio.proxy.error.customHeaderValueString', name),
			);
		}
		const value = rawValue.trim();
		if (!value) {
			continue;
		}
		if (/[\r\n]/u.test(value)) {
			throw new AudioProxyError(
				'invalid-custom-headers',
				t('audio.proxy.error.customHeaderValueInvalid', name),
			);
		}
		normalized[name] = value;
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function createProviderHeaders(
	config: AudioProxyConfig,
	apiKey: string | undefined,
): Record<string, string> {
	return {
		'content-type': 'application/json',
		...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
		...(config.headers ?? {}),
	};
}
