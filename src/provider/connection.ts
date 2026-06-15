import vscode from 'vscode';
import type { AuthManager } from '../auth';
import { LlmClient, LlmRequestError } from '../client';
import { getApiModelId, getBaseUrl } from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import type { ProviderDefinition } from '../types';

type ConnectionAction = 'openSettings' | 'openApiKeyPage' | 'showLogs';

export interface StaleModelOverride {
	readonly apiModelId: string;
	readonly modelNames: readonly string[];
}

export interface ConnectionSuccessResult {
	readonly kind: 'success' | 'empty-model-list' | 'stale-overrides';
	readonly message: string;
	readonly staleOverrides: readonly StaleModelOverride[];
}

type ApiModelIdResolver = (provider: ProviderDefinition, vscodeModelId: string) => string;

/**
 * Validate a provider's API key and endpoint by hitting `GET {baseUrl}/models`,
 * then cross-check the returned model list against the configured
 * `modelIdOverrides` so users learn early when an override points at a model the
 * endpoint does not expose.
 */
export async function runConnectionTest(
	authManager: AuthManager,
	presetProvider?: ProviderDefinition,
): Promise<void> {
	const provider = presetProvider ?? (await pickProvider(authManager));
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
				await reportSuccess(provider, modelIds);
			} catch (error) {
				if (token.isCancellationRequested) {
					return;
				}
				logger.warn(`Connection test failed for ${provider.id}`, error);
				const detail = formatConnectionFailureDetail(error);
				await showConnectionMessage(
					'error',
					t('connection.failed', provider.name, detail),
					provider,
				);
			}
		},
	);
}

async function reportSuccess(
	provider: ProviderDefinition,
	modelIds: readonly string[],
): Promise<void> {
	const result = createConnectionSuccessResult(provider, modelIds);
	if (result.kind === 'empty-model-list') {
		await showConnectionMessage('info', result.message, provider);
		return;
	}

	if (result.kind === 'stale-overrides') {
		await showConnectionMessage('warning', result.message, provider);
		return;
	}

	void vscode.window.showInformationMessage(result.message);
}

export function createConnectionSuccessResult(
	provider: ProviderDefinition,
	modelIds: readonly string[],
	resolveApiModelId: ApiModelIdResolver = getApiModelId,
): ConnectionSuccessResult {
	if (modelIds.length === 0) {
		return {
			kind: 'empty-model-list',
			message: t('connection.successNoList', provider.name),
			staleOverrides: [],
		};
	}

	const staleOverrides = findStaleOverrides(provider, modelIds, resolveApiModelId);
	if (staleOverrides.length > 0) {
		return {
			kind: 'stale-overrides',
			message: t(
				'connection.successStale',
				provider.name,
				modelIds.length,
				formatStaleOverrides(staleOverrides),
			),
			staleOverrides,
		};
	}

	return {
		kind: 'success',
		message: t('connection.success', provider.name, modelIds.length),
		staleOverrides: [],
	};
}

/**
 * Effective API model IDs (after applying overrides) for this provider that the
 * endpoint did not report. Grouped by effective API ID, deduplicated, and order-stable.
 */
export function findStaleOverrides(
	provider: ProviderDefinition,
	modelIds: readonly string[],
	resolveApiModelId: ApiModelIdResolver = getApiModelId,
): StaleModelOverride[] {
	const available = new Set(modelIds);
	const staleByApiModelId = new Map<string, string[]>();
	for (const model of MODELS) {
		if (model.provider !== provider.id) {
			continue;
		}
		const effectiveId = resolveApiModelId(provider, model.id);
		if (!available.has(effectiveId)) {
			const names = staleByApiModelId.get(effectiveId) ?? [];
			if (!names.includes(model.name)) {
				names.push(model.name);
			}
			staleByApiModelId.set(effectiveId, names);
		}
	}
	return [...staleByApiModelId.entries()].map(([apiModelId, modelNames]) => ({
		apiModelId,
		modelNames,
	}));
}

export function formatStaleOverrides(staleOverrides: readonly StaleModelOverride[]): string {
	return staleOverrides
		.map((override) => `${override.apiModelId} (${override.modelNames.join(', ')})`)
		.join('; ');
}

export function formatConnectionFailureDetail(error: unknown): string {
	if (error instanceof LlmRequestError) {
		return error.userSummary;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

async function showConnectionMessage(
	severity: 'info' | 'warning' | 'error',
	message: string,
	provider: ProviderDefinition,
): Promise<void> {
	const actions = getConnectionActionLabels();
	const labels = Object.values(actions);
	const choice =
		severity === 'error'
			? await vscode.window.showErrorMessage(message, ...labels)
			: severity === 'warning'
				? await vscode.window.showWarningMessage(message, ...labels)
				: await vscode.window.showInformationMessage(message, ...labels);
	await handleConnectionAction(choice, provider, actions);
}

function getConnectionActionLabels(): Record<ConnectionAction, string> {
	return {
		openSettings: t('connection.action.openSettings'),
		openApiKeyPage: t('connection.action.openApiKeyPage'),
		showLogs: t('connection.action.showLogs'),
	};
}

async function handleConnectionAction(
	choice: string | undefined,
	provider: ProviderDefinition,
	actions: Record<ConnectionAction, string>,
): Promise<void> {
	if (choice === actions.openSettings) {
		await vscode.commands.executeCommand('workbench.action.openSettings', 'cllms');
		return;
	}
	if (choice === actions.openApiKeyPage) {
		await vscode.env.openExternal(vscode.Uri.parse(provider.externalUrls.apiKeys));
		return;
	}
	if (choice === actions.showLogs) {
		await vscode.commands.executeCommand('cllms.showLogs');
	}
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
