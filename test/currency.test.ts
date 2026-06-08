import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import vscode from 'vscode';
import type { AuthManager } from '../src/auth';
import { BalanceCurrencyResolver } from '../src/provider/pricing/currency';

function setLanguage(language: string): void {
	(vscode.env as { language: string }).language = language;
}

function makeResolver(): BalanceCurrencyResolver {
	return new BalanceCurrencyResolver(
		{} as unknown as vscode.ExtensionContext,
		{} as unknown as AuthManager,
		() => {},
	);
}

describe('BalanceCurrencyResolver.getDisplayCurrency', () => {
	const originalLanguage = vscode.env.language;

	afterEach(() => {
		setLanguage(originalLanguage);
	});

	it('returns CNY for Simplified Chinese locales', () => {
		setLanguage('zh-cn');
		assert.equal(makeResolver().getDisplayCurrency(), 'CNY');
	});

	it('returns CNY for any zh-prefixed locale', () => {
		setLanguage('zh-tw');
		assert.equal(makeResolver().getDisplayCurrency(), 'CNY');
	});

	it('returns USD for non-Chinese locales', () => {
		setLanguage('en');
		assert.equal(makeResolver().getDisplayCurrency(), 'USD');
		setLanguage('ja');
		assert.equal(makeResolver().getDisplayCurrency(), 'USD');
	});
});
