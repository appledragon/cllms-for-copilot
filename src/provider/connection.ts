import vscode from 'vscode';
import type { AuthManager } from '../auth';
import { LlmClient, LlmRequestError } from '../client';
import { getApiModelId, getBaseUrl } from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import type { ProviderDefinition } from '../types';

/**
 * Validate a provider's API key and endpoint by hitting `GET {baseUrl}/models`,
 * then cross-check the returned model list against the configured
 * `modelIdOverrides` so users learn early when an override points at a model the
 * endpoint does not expose.
 */
export async function runConnectionTest(authManager: AuthManager): Promise<void> {
	const provider = await pickProvider(authManager);
	if (!provider) {
		return;
	}

	const apiKey = await authManager.getApiKey(provider);
	if (!apiKey) {
		void vscode.window.showWarningMessage(t('connection.noKey', provider.name));
		return;
	}

	const client = new LlmClient(getBaseUrl(provider), apiKey, {
		providerId: provider.id,
		// Validation should fail fast; don't silently retry behind the spinner.
		maxRetries: 0,
	});

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: t('connection.testing', provider.name),
		},
		async (_progress, token) => {
			try {
				const modelIds = await client.listModels(token);
				if (token.isCancellationRequested) {
					return;
				}
				reportSuccess(provider, modelIds);
			} catch (error) {
				if (token.isCancellationRequested) {
					return;
				}
				logger.warn(`Connection test failed for ${provider.id}`, error);
				const detail = error instanceof LlmRequestError ? error.userSummary : String(error);
				void vscode.window.showErrorMessage(t('connection.failed', provider.name, detail));
			}
		},
	);
}

function reportSuccess(provider: ProviderDefinition, modelIds: readonly string[]): void {
	if (modelIds.length === 0) {
		void vscode.window.showInformationMessage(t('connection.successNoList', provider.name));
		return;
	}

	const staleOverrides = findStaleOverrides(provider, modelIds);
	if (staleOverrides.length > 0) {
		void vscode.window.showWarningMessage(
			t('connection.successStale', provider.name, modelIds.length, staleOverrides.join(', ')),
		);
		return;
	}

	void vscode.window.showInformationMessage(
		t('connection.success', provider.name, modelIds.length),
	);
}

/**
 * Effective API model IDs (after applying overrides) for this provider that the
 * endpoint did not report. Deduplicated and order-stable.
 */
function findStaleOverrides(
	provider: ProviderDefinition,
	modelIds: readonly string[],
): string[] {
	const available = new Set(modelIds);
	const stale: string[] = [];
	for (const model of MODELS) {
		if (model.provider !== provider.id) {
			continue;
		}
		const effectiveId = getApiModelId(provider, model.id);
		if (!available.has(effectiveId) && !stale.includes(effectiveId)) {
			stale.push(effectiveId);
		}
	}
	return stale;
}

async function pickProvider(authManager: AuthManager): Promise<ProviderDefinition | undefined> {
	const providers = Object.values(PROVIDERS);
	const configured = await Promise.all(
		providers.map((provider) => authManager.hasApiKey(provider)),
	);

	const items = providers.map((provider, index) => ({
		label: provider.name,
		description: configured[index]
			? t('auth.providerConfigured')
			: t('auth.providerNotConfigured'),
		provider,
	}));

	const picked = await vscode.window.showQuickPick(items, {
		title: t('connection.pickTitle'),
		placeHolder: t('auth.selectProviderPlaceholder'),
		ignoreFocusOut: true,
	});
	return picked?.provider;
}
