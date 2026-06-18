import { getBaseUrl } from '../../config';
import { MODELS, PROVIDERS } from '../../consts';
import { t } from '../../i18n';
import type { ModelDefinition, ProviderConnectivity, ProviderId } from '../../types';

/** A single model row rendered inside a provider card. */
export interface ProviderModelView {
	readonly id: string;
	readonly name: string;
	/** Localized one-line description (falls back to the model's static detail). */
	readonly detail: string;
	/** Localized tooltip shown on hover. */
	readonly tooltip: string;
	readonly vision: boolean;
	readonly thinking: boolean;
}

/**
 * Visual status of a provider card's indicator dot, derived from key presence
 * and the latest connection-test result:
 *  - `not-configured`: no API key
 *  - `configured`:     key present, connectivity not yet tested
 *  - `ok` / `error`:   key present, last connection test passed / failed
 */
export type ProviderStatusKind = 'not-configured' | 'configured' | 'ok' | 'error';

/** A provider card: key status, endpoint, and its models. */
export interface ProviderView {
	readonly id: ProviderId;
	readonly name: string;
	readonly configured: boolean;
	readonly statusKind: ProviderStatusKind;
	/** Resolved base URL (public endpoint, never a secret). */
	readonly endpoint: string;
	readonly statusLabel: string;
	readonly models: readonly ProviderModelView[];
}

/** Lifecycle phase of the providers webview, driving its loading/error UI. */
export type ProvidersViewPhase = 'loading' | 'ready' | 'error';

/** Full state posted to the providers webview. */
export interface ProvidersViewState {
	/** Defaults to `ready` when omitted (e.g. in unit tests). */
	readonly phase?: ProvidersViewPhase;
	readonly providers: readonly ProviderView[];
	readonly configuredCount?: number;
	readonly totalCount?: number;
	/** Human-readable error shown when `phase === 'error'`. */
	readonly errorMessage?: string;
}

/**
 * Build the immutable view-model rendered by the providers webview. Pure and
 * side-effect free (aside from reading settings/i18n) so it can be unit tested
 * without a webview host.
 *
 * Only key *presence* (a boolean) is ever read; the secret value is never
 * touched here. Connectivity (when supplied) reflects the last connection test.
 */
export function buildProvidersViewState(
	keyStates: ReadonlyMap<ProviderId, boolean>,
	connectivity: ReadonlyMap<ProviderId, ProviderConnectivity> = new Map(),
): ProvidersViewState {
	const providers = Object.values(PROVIDERS).map((provider) => {
		const configured = keyStates.get(provider.id) ?? false;
		const statusKind = resolveStatusKind(configured, connectivity.get(provider.id));
		return {
			id: provider.id,
			name: provider.name,
			configured,
			statusKind,
			endpoint: getBaseUrl(provider),
			statusLabel: statusLabelFor(statusKind),
			models: MODELS.filter((model) => model.provider === provider.id).map(toModelView),
		};
	});

	return {
		phase: 'ready',
		providers,
		configuredCount: providers.filter((provider) => provider.configured).length,
		totalCount: providers.length,
	};
}

function resolveStatusKind(
	configured: boolean,
	connectivity: ProviderConnectivity | undefined,
): ProviderStatusKind {
	if (!configured) {
		return 'not-configured';
	}
	if (connectivity === 'ok' || connectivity === 'error') {
		return connectivity;
	}
	return 'configured';
}

function statusLabelFor(statusKind: ProviderStatusKind): string {
	switch (statusKind) {
		case 'not-configured':
			return t('auth.providerNotConfigured');
		case 'ok':
			return t('providers.status.ok');
		case 'error':
			return t('providers.status.error');
		case 'configured':
			return t('auth.providerConfigured');
	}
}

function toModelView(model: ModelDefinition): ProviderModelView {
	return {
		id: model.id,
		name: model.name,
		detail: t(`model.${model.id}.detail`),
		tooltip: t(`model.${model.id}.tooltip`),
		vision: model.capabilities.imageInput,
		thinking: model.capabilities.thinking,
	};
}
