import { getBaseUrl } from '../../config';
import { MODELS, PROVIDERS } from '../../consts';
import { t } from '../../i18n';
import type { ModelDefinition, ProviderId } from '../../types';

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

/** A provider card: key status, endpoint, and its models. */
export interface ProviderView {
	readonly id: ProviderId;
	readonly name: string;
	readonly configured: boolean;
	/** Resolved base URL (public endpoint, never a secret). */
	readonly endpoint: string;
	readonly statusLabel: string;
	readonly models: readonly ProviderModelView[];
}

/** Full state posted to the providers webview. */
export interface ProvidersViewState {
	readonly providers: readonly ProviderView[];
}

/**
 * Build the immutable view-model rendered by the providers webview. Pure and
 * side-effect free (aside from reading settings/i18n) so it can be unit tested
 * without a webview host.
 *
 * Only key *presence* (a boolean) is ever read; the secret value is never
 * touched here.
 */
export function buildProvidersViewState(
	keyStates: ReadonlyMap<ProviderId, boolean>,
): ProvidersViewState {
	return {
		providers: Object.values(PROVIDERS).map((provider) => {
			const configured = keyStates.get(provider.id) ?? false;
			return {
				id: provider.id,
				name: provider.name,
				configured,
				endpoint: getBaseUrl(provider),
				statusLabel: configured ? t('auth.providerConfigured') : t('auth.providerNotConfigured'),
				models: MODELS.filter((model) => model.provider === provider.id).map(toModelView),
			};
		}),
	};
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
