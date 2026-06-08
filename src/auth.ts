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
		await this.secretStorage.store(provider.apiKeySecret, apiKey.trim());
	}

	/** Delete a provider's stored API key. */
	async deleteApiKey(provider: ProviderDefinition): Promise<void> {
		await this.secretStorage.delete(provider.apiKeySecret);
	}

	/** Check whether an API key is configured for a provider. */
	async hasApiKey(provider: ProviderDefinition): Promise<boolean> {
		const key = await this.getApiKey(provider);
		return key !== undefined && key.length > 0;
	}

	/** Prompt the user to enter a provider's API key via input box. */
	async promptForApiKey(provider: ProviderDefinition): Promise<boolean> {
		const apiKey = await vscode.window.showInputBox({
			prompt: t('auth.promptFor', provider.name),
			placeHolder: t('auth.placeholder'),
			password: true,
			ignoreFocusOut: true,
			validateInput: (value: string) => {
				if (!value?.trim()) {
					return t('auth.emptyValidation');
				}
				return undefined;
			},
		});

		if (apiKey) {
			await this.setApiKey(provider, apiKey);
			vscode.window.showInformationMessage(t('auth.savedFor', provider.name));
			return true;
		}

		return false;
	}
}
