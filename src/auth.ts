import vscode from 'vscode';
import { CONFIG_SECTION } from './consts';
import { t } from './i18n';
import type { ProviderDefinition } from './types';

/**
 * Manages per-provider API keys via VS Code SecretStorage (secure) with a
 * fallback to extension settings (less secure, for CI/automation).
 *
 * Every method is scoped to a {@link ProviderDefinition} so multiple providers
 * (Qwen, z.ai, …) can each keep their own credentials.
 */
export class AuthManager {
	private readonly secretStorage: vscode.SecretStorage;

	/**
	 * Cached key-presence per SecretStorage key. `provideLanguageModelChatInformation`
	 * is queried by Copilot on every model-picker refresh and checks every provider,
	 * so reading SecretStorage each time adds avoidable IPC. Presence (a boolean) is
	 * cheap to cache and is kept fresh via {@link invalidatePresence}, wired to the
	 * SecretStorage / configuration change events the provider already listens to.
	 * The key value itself is never cached.
	 */
	private readonly presenceCache = new Map<string, boolean>();

	constructor(context: vscode.ExtensionContext) {
		this.secretStorage = context.secrets;
	}

	/**
	 * Get the API key for a provider. Tries SecretStorage first, then falls back
	 * to settings.
	 */
	async getApiKey(provider: ProviderDefinition): Promise<string | undefined> {
		const secretKey = await this.secretStorage.get(provider.apiKeySecret);
		if (secretKey) {
			return secretKey;
		}

		const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
		const settingsKey = config.get<string>(provider.apiKeySetting);
		if (settingsKey?.trim()) {
			return settingsKey.trim();
		}

		return undefined;
	}

	/** Store a provider's API key in SecretStorage. */
	async setApiKey(provider: ProviderDefinition, apiKey: string): Promise<void> {
		const trimmed = apiKey.trim();
		await this.secretStorage.store(provider.apiKeySecret, trimmed);
		this.presenceCache.set(provider.apiKeySecret, trimmed.length > 0);
	}

	/** Delete a provider's stored API key. */
	async deleteApiKey(provider: ProviderDefinition): Promise<void> {
		await this.secretStorage.delete(provider.apiKeySecret);
		this.presenceCache.set(provider.apiKeySecret, false);
	}

	/** Check whether an API key is configured for a provider (cached). */
	async hasApiKey(provider: ProviderDefinition): Promise<boolean> {
		const cached = this.presenceCache.get(provider.apiKeySecret);
		if (cached !== undefined) {
			return cached;
		}
		const key = await this.getApiKey(provider);
		const present = key !== undefined && key.length > 0;
		this.presenceCache.set(provider.apiKeySecret, present);
		return present;
	}

	/**
	 * Drop cached key-presence so the next {@link hasApiKey} re-reads SecretStorage
	 * and settings. Pass a SecretStorage key to clear a single provider (e.g. on a
	 * `secrets.onDidChange` event), or omit it to clear everything (e.g. when any
	 * `cllms.*` setting changes, since the settings fallback may have changed).
	 */
	invalidatePresence(secret?: string): void {
		if (secret === undefined) {
			this.presenceCache.clear();
		} else {
			this.presenceCache.delete(secret);
		}
	}

	/**
	 * Prompt the user to enter a provider's API key. The input box carries a
	 * title-bar button that opens the provider's API key page, so the "where do I
	 * get a key" and "paste the key" steps live in a single flow. The key is
	 * stored on accept; callers handle any follow-up messaging.
	 */
	async promptForApiKey(provider: ProviderDefinition): Promise<boolean> {
		const apiKey = await this.showApiKeyInput(provider);
		if (apiKey) {
			await this.setApiKey(provider, apiKey);
			return true;
		}
		return false;
	}

	private showApiKeyInput(provider: ProviderDefinition): Promise<string | undefined> {
		return new Promise<string | undefined>((resolve) => {
			const input = vscode.window.createInputBox();
			input.title = t('auth.inputTitle', provider.name);
			input.prompt = t('auth.promptFor', provider.name);
			input.placeholder = t('auth.placeholder');
			input.password = true;
			input.ignoreFocusOut = true;
			input.buttons = [
				{
					iconPath: new vscode.ThemeIcon('link-external'),
					tooltip: t('auth.openApiKeyPage', provider.name),
				},
			];

			let settled = false;
			const settle = (value: string | undefined): void => {
				if (settled) {
					return;
				}
				settled = true;
				resolve(value);
				input.dispose();
			};

			input.onDidChangeValue(() => {
				input.validationMessage = undefined;
			});
			input.onDidTriggerButton(() => {
				void vscode.env.openExternal(vscode.Uri.parse(provider.externalUrls.apiKeys));
			});
			input.onDidAccept(() => {
				const value = input.value.trim();
				if (!value) {
					input.validationMessage = t('auth.emptyValidation');
					return;
				}
				settle(value);
			});
			input.onDidHide(() => settle(undefined));
			input.show();
		});
	}
}
