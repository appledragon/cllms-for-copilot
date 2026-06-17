import vscode from 'vscode';
import { getBaseUrl } from '../config';
import { MODELS, PROVIDERS } from '../consts';
import { t } from '../i18n';
import type { ModelDefinition, ProviderId } from '../types';

/**
 * A node in the providers tree: either a provider row (top level) or one of its
 * models (read-only child rows).
 */
export type ProvidersNode =
	| { readonly kind: 'provider'; readonly providerId: ProviderId }
	| { readonly kind: 'model'; readonly providerId: ProviderId; readonly modelId: string };

/** Resolves the per-provider API-key presence (boolean only, never the value). */
export type ProviderKeyStateProvider = () => Promise<Map<ProviderId, boolean>>;

/**
 * Backs the CLLMs "Providers" Activity Bar view. Lists every provider with its
 * key status and exposes each provider's models as collapsible children.
 *
 * The tree only ever reads key *presence* (a boolean); the secret value is
 * never read or rendered here.
 */
export class ProvidersTreeDataProvider
	implements vscode.TreeDataProvider<ProvidersNode>, vscode.Disposable
{
	private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
		ProvidersNode | undefined
	>();
	readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

	/** Latest key-presence snapshot, refreshed on every root render. */
	private keyStates = new Map<ProviderId, boolean>();

	private readonly refreshSubscription: vscode.Disposable;

	constructor(
		private readonly getKeyStates: ProviderKeyStateProvider,
		onRefresh: vscode.Event<void>,
	) {
		this.refreshSubscription = onRefresh(() => this.refresh());
	}

	/** Force a full re-render (re-reads key presence on the next root query). */
	refresh(): void {
		this.onDidChangeTreeDataEmitter.fire(undefined);
	}

	dispose(): void {
		this.refreshSubscription.dispose();
		this.onDidChangeTreeDataEmitter.dispose();
	}

	async getChildren(node?: ProvidersNode): Promise<ProvidersNode[]> {
		if (!node) {
			// Refresh key presence before rendering the provider rows so their
			// status icons stay in sync with SecretStorage / settings.
			this.keyStates = await this.getKeyStates();
			return Object.values(PROVIDERS).map((provider) => ({
				kind: 'provider',
				providerId: provider.id,
			}));
		}

		if (node.kind === 'provider') {
			return MODELS.filter((model) => model.provider === node.providerId).map((model) => ({
				kind: 'model',
				providerId: node.providerId,
				modelId: model.id,
			}));
		}

		return [];
	}

	getTreeItem(node: ProvidersNode): vscode.TreeItem {
		return node.kind === 'provider'
			? this.createProviderItem(node.providerId)
			: this.createModelItem(node.modelId);
	}

	private createProviderItem(providerId: ProviderId): vscode.TreeItem {
		const provider = PROVIDERS[providerId];
		const configured = this.keyStates.get(providerId) ?? false;
		const modelCount = MODELS.filter((model) => model.provider === providerId).length;

		const item = new vscode.TreeItem(provider.name, vscode.TreeItemCollapsibleState.Collapsed);
		item.id = `provider:${providerId}`;
		item.contextValue = 'cllmsProvider';
		item.description = configured ? t('auth.providerConfigured') : t('auth.providerNotConfigured');
		item.iconPath = configured
			? new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'))
			: new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
		item.tooltip = new vscode.MarkdownString(
			[
				`**${provider.name}**`,
				'',
				t(
					'providers.tooltip.status',
					configured ? t('auth.providerConfigured') : t('auth.providerNotConfigured'),
				),
				t('providers.tooltip.endpoint', getBaseUrl(provider)),
				t('providers.tooltip.models', modelCount),
			].join('\n'),
		);
		return item;
	}

	private createModelItem(modelId: string): vscode.TreeItem {
		const model = MODELS.find((candidate) => candidate.id === modelId);
		const item = new vscode.TreeItem(model?.name ?? modelId, vscode.TreeItemCollapsibleState.None);
		item.id = `model:${modelId}`;
		item.contextValue = 'cllmsModel';
		if (model) {
			item.description = buildModelDescription(model);
			item.tooltip = new vscode.MarkdownString(t(`model.${model.id}.tooltip`));
			item.iconPath = new vscode.ThemeIcon(model.capabilities.imageInput ? 'eye' : 'sparkle');
		}
		return item;
	}
}

/** Compose a model row's trailing description: localized detail plus capability badges. */
function buildModelDescription(model: ModelDefinition): string {
	const detail = t(`model.${model.id}.detail`);
	const badges: string[] = [];
	if (model.capabilities.imageInput) {
		badges.push(t('providers.badge.vision'));
	}
	if (model.capabilities.thinking) {
		badges.push(t('providers.badge.thinking'));
	}
	return badges.length > 0 ? `${detail} · ${badges.join(' · ')}` : detail;
}
