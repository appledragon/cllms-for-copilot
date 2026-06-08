import vscode from 'vscode';
import { AuthManager } from '../../auth';
import type { PricingCurrency } from '../../types';

/**
 * Resolves the currency used to display model pricing in the picker.
 *
 * DashScope's OpenAI-compatible API does not expose an account balance endpoint
 * (unlike DeepSeek's `/user/balance`), so currency is derived from the VS Code
 * display language: Simplified Chinese shows CNY, everything else USD. The
 * resolver keeps the same public surface the provider expects (so model
 * refreshes still work) but performs no network calls.
 */
export class BalanceCurrencyResolver {
	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _authManager: AuthManager,
		private readonly _onDidChangeCurrency: () => void,
	) {
		// Parameters are retained for API compatibility with the provider; the
		// locale-based resolution below needs none of them.
		void this._context;
		void this._authManager;
		void this._onDidChangeCurrency;
	}

	getDisplayCurrency(): PricingCurrency | undefined {
		return getLocaleFallbackCurrency();
	}

	refreshInBackground(): void {
		// No-op: currency is locale-derived and does not require a network fetch.
	}

	async invalidate(): Promise<void> {
		// No-op: nothing is cached.
	}
}

function getLocaleFallbackCurrency(): PricingCurrency {
	return vscode.env.language.toLowerCase().startsWith('zh') ? 'CNY' : 'USD';
}
