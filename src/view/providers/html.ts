import { randomBytes } from 'crypto';
import vscode from 'vscode';
import { t } from '../../i18n';
import { getProvidersViewScript } from './script';
import type { ProvidersViewState } from './state';
import { getProvidersViewStyle } from './style';

/** Render the full HTML document for the providers webview. */
export function getProvidersViewHtml(webview: vscode.Webview, state: ProvidersViewState): string {
	const nonce = createNonce();
	const htmlLang = vscode.env.language.toLowerCase() === 'zh-cn' ? 'zh-CN' : 'en';
	const strings = getProvidersViewStrings();
	const initialState = escapeScriptJson(state);
	const initialStrings = escapeScriptJson(strings);
	const csp = [
		"default-src 'none'",
		`style-src 'nonce-${nonce}'`,
		`script-src 'nonce-${nonce}'`,
	].join('; ');

	return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(strings.title)}</title>
	<style nonce="${nonce}">${getProvidersViewStyle()}</style>
</head>
<body>
	${getIconSprite()}
	<main>
		<p class="summary" id="summary" aria-live="polite"></p>
		<div id="view-state"></div>
	</main>
	<script nonce="${nonce}">${getProvidersViewScript(initialState, initialStrings)}</script>
</body>
</html>`;
}

/**
 * Hidden SVG sprite of the action icons. Static markup (no user data), so it is
 * safe to inline; shapes inherit `fill`/`stroke` from the `.icon` CSS class.
 */
function getIconSprite(): string {
	const symbols: Readonly<Record<string, string>> = {
		'i-key': '<circle cx="6" cy="7" r="3"/><path d="M8.2 9.2 13 14M11.2 12.2 12.6 10.8"/>',
		'i-trash':
			'<path d="M3 4.5h10M6.5 4.5V3.3h3v1.2M5 4.5l.7 8.4a1 1 0 0 0 1 .9h2.6a1 1 0 0 0 1-.9l.7-8.4"/>',
		'i-link': '<path d="M9 3.5h3.5V7M12.5 3.5 7.3 8.7M11 9.4v2.1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2.1"/>',
		'i-graph': '<path d="M2.5 13.5h11M4.5 13.5V9.5M8 13.5V5M11.5 13.5v-2.5"/>',
		'i-pulse': '<path d="M1.5 8h2.6l1.7-4.4 3 9 1.7-4.6h2.9"/>',
		'i-sliders':
			'<path d="M2.5 5.5h11M2.5 10.5h11"/><circle cx="6" cy="5.5" r="1.7"/><circle cx="10.5" cy="10.5" r="1.7"/>',
		'i-warning': '<path d="M8 2.6 14.6 13.6H1.4z"/><path d="M8 6.6v3.1"/><path d="M8 11.7v.2"/>',
		'i-info': '<circle cx="8" cy="8" r="6.3"/><path d="M8 7.4v3.6"/><path d="M8 5.1v.1"/>',
		'i-refresh': '<path d="M13 8a5 5 0 1 1-1.4-3.5"/><path d="M13 2.6V5.4h-2.8"/>',
	};
	const defs = Object.entries(symbols)
		.map(([id, body]) => `<symbol id="${id}" viewBox="0 0 16 16">${body}</symbol>`)
		.join('');
	return `<svg class="icon-sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${defs}</svg>`;
}

export type ProvidersViewStrings = ReturnType<typeof getProvidersViewStrings>;

function getProvidersViewStrings() {
	return {
		title: t('providers.webview.title'),
		endpointLabel: t('providers.webview.endpointLabel'),
		modelsLabel: t('providers.section.models'),
		badgeVision: t('providers.badge.vision'),
		badgeThinking: t('providers.badge.thinking'),
		actionSetup: t('providers.action.setup'),
		actionSetApiKey: t('providers.action.setApiKey'),
		actionClearApiKey: t('providers.action.clearApiKey'),
		actionTest: t('providers.action.test'),
		actionApiKeyPage: t('providers.action.apiKeyPage'),
		actionUsagePage: t('providers.action.usagePage'),
		actionStatusPage: t('providers.action.statusPage'),
		actionProviderSettings: t('providers.action.providerSettings'),
		summary: t('providers.summary'),
		noneConfigured: t('providers.noneConfigured'),
		loading: t('providers.loading'),
		error: t('providers.error'),
		retry: t('providers.retry'),
		statusTesting: t('providers.status.testing'),
	};
}

function createNonce(): string {
	return randomBytes(16).toString('base64');
}

function escapeScriptJson(value: unknown): string {
	return JSON.stringify(value)
		.replaceAll('<', '\\u003c')
		.replaceAll('\u2028', '\\u2028')
		.replaceAll('\u2029', '\\u2029');
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}
