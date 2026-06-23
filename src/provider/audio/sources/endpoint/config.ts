import type vscode from 'vscode';
import { t } from '../../../../i18n';
import type { AudioProxyApiType, AudioProxyConfig, AudioProxySource } from '../../types';
import { normalizeCustomHeaders } from '../../protocols/headers';
import { AudioProxyError } from '../../protocols/errors';
import { validateAudioEndpointUrl } from '../../protocols/url';
import { isRecord } from '../../../vision/shared';

export const AUDIO_PROXY_CONFIG_KEY = 'cllms.audioProxy.config';
export const AUDIO_PROXY_SOURCE_KEY = 'cllms.audioProxy.source';
export const AUDIO_PROXY_API_KEY_SECRET = 'cllms.audioProxy.apiKey';

const PROTECTED_EXTRA_BODY_KEYS = new Set(['model', 'messages', 'input', 'stream', 'audio']);

export class AudioProxyConfigStore {
	constructor(private readonly context: vscode.ExtensionContext) {}

	getConfig(): AudioProxyConfig | undefined {
		const raw = this.context.globalState.get<unknown>(AUDIO_PROXY_CONFIG_KEY);
		if (raw === undefined) return undefined;
		return normalizeAudioProxyConfig(raw);
	}

	getSource(): AudioProxySource | undefined {
		const value = this.context.globalState.get<unknown>(AUDIO_PROXY_SOURCE_KEY);
		return value === 'api-endpoint' || value === 'vscode-lm' ? value : undefined;
	}

	getApiKey(): Thenable<string | undefined> {
		return this.context.secrets.get(AUDIO_PROXY_API_KEY_SECRET);
	}

	saveConfig(config: AudioProxyConfig): Thenable<void> {
		return this.context.globalState.update(AUDIO_PROXY_CONFIG_KEY, normalizeAudioProxyConfig(config));
	}

	saveSource(source: AudioProxySource): Thenable<void> {
		return this.context.globalState.update(AUDIO_PROXY_SOURCE_KEY, source);
	}

	setApiKey(apiKey: string): Thenable<void> {
		return this.context.secrets.store(AUDIO_PROXY_API_KEY_SECRET, apiKey.trim());
	}

	deleteApiKey(): Thenable<void> {
		return this.context.secrets.delete(AUDIO_PROXY_API_KEY_SECRET);
	}

	async hasApiKey(): Promise<boolean> {
		return Boolean((await this.getApiKey())?.trim());
	}
}

export function normalizeAudioProxyConfig(value: unknown): AudioProxyConfig {
	if (!isRecord(value)) {
		throw new AudioProxyError('missing-configuration', t('audio.proxy.error.configurationInvalid'));
	}
	const url = required(value.url, t('audio.panel.field.endpointUrl'));
	validateAudioEndpointUrl(url);
	const modelId = required(value.modelId, t('audio.panel.field.modelId'));
	const apiType = normalizeApiType(value.apiType);
	const headers = normalizeCustomHeaders(value.headers);
	const extraBody = normalizeExtraBody(value.extraBody);
	return {
		providerFamily: 'openai-compatible',
		apiType,
		url,
		modelId,
		headers,
		extraBody,
		updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
	};
}

function normalizeApiType(value: unknown): AudioProxyApiType {
	if (value === 'transcriptions' || value === 'responses') {
		return value;
	}
	throw new AudioProxyError('missing-configuration', t('audio.proxy.error.apiTypeInvalid'));
}

function required(value: unknown, label: string): string {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) {
		throw new AudioProxyError('missing-configuration', t('audio.proxy.error.fieldRequired', label));
	}
	return text;
}

function normalizeExtraBody(value: unknown): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	if (!isRecord(value)) {
		throw new AudioProxyError('missing-configuration', t('audio.proxy.error.extraBodyObject'));
	}
	const normalized: Record<string, unknown> = {};
	for (const [key, v] of Object.entries(value)) {
		if (PROTECTED_EXTRA_BODY_KEYS.has(key)) {
			throw new AudioProxyError(
				'missing-configuration',
				t('audio.proxy.error.extraBodyProtectedKey', key),
			);
		}
		normalized[key] = v;
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}
