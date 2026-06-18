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
	<main>
		<p class="intro">${escapeHtml(strings.intro)}</p>
		<div id="providers" class="providers"></div>
		<section class="global-actions">
			<h2 class="global-actions-title">${escapeHtml(strings.globalActionsTitle)}</h2>
			<div class="actions">
				<button type="button" data-action="refresh">${escapeHtml(strings.toolbarRefresh)}</button>
				<button type="button" data-action="setVisionModel">${escapeHtml(strings.toolbarVisionModel)}</button>
				<button type="button" data-action="openSettings">${escapeHtml(strings.toolbarSettings)}</button>
				<button type="button" data-action="showLogs">${escapeHtml(strings.toolbarLogs)}</button>
				<button type="button" data-action="copyDiagnosticReport">${escapeHtml(strings.toolbarDiagnostics)}</button>
				<button type="button" data-action="openWalkthrough">${escapeHtml(strings.toolbarWalkthrough)}</button>
			</div>
		</section>
	</main>
	<script nonce="${nonce}">${getProvidersViewScript(initialState, initialStrings)}</script>
</body>
</html>`;
}

export type ProvidersViewStrings = ReturnType<typeof getProvidersViewStrings>;

function getProvidersViewStrings() {
	return {
		title: t('providers.webview.title'),
		intro: t('providers.webview.intro'),
		endpointLabel: t('providers.webview.endpointLabel'),
		modelsLabel: t('providers.section.models'),
		badgeVision: t('providers.badge.vision'),
		badgeThinking: t('providers.badge.thinking'),
		globalActionsTitle: t('providers.section.more'),
		actionSetup: t('providers.action.setup'),
		actionSetApiKey: t('providers.action.setApiKey'),
		actionClearApiKey: t('providers.action.clearApiKey'),
		actionTest: t('providers.action.test'),
		actionApiKeyPage: t('providers.action.apiKeyPage'),
		actionUsagePage: t('providers.action.usagePage'),
		actionStatusPage: t('providers.action.statusPage'),
		actionProviderSettings: t('providers.action.providerSettings'),
		toolbarRefresh: t('providers.toolbar.refresh'),
		toolbarVisionModel: t('providers.toolbar.visionModel'),
		toolbarSettings: t('providers.toolbar.settings'),
		toolbarLogs: t('providers.toolbar.logs'),
		toolbarDiagnostics: t('providers.toolbar.diagnostics'),
		toolbarWalkthrough: t('providers.toolbar.walkthrough'),
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
