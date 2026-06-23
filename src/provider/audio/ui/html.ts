import { randomBytes } from 'crypto';
import vscode from 'vscode';
import { t } from '../../../i18n';
import type { AudioProxyConfig, AudioProxySource } from '../types';
import { getAudioProxyPanelScript } from './script';
import { getAudioProxyPanelStyle } from './style';

export interface AudioProxyPanelState {
	source: AudioProxySource;
	config?: AudioProxyConfig;
	hasApiKey: boolean;
}

export function getAudioProxyPanelHtml(
	webview: vscode.Webview,
	state: AudioProxyPanelState,
): string {
	const nonce = randomBytes(16).toString('base64');
	const strings = getAudioProxyPanelStrings();
	const initialState = escapeScriptJson(state);
	const initialStrings = escapeScriptJson(strings);
	const csp = [
		"default-src 'none'",
		`style-src 'nonce-${nonce}'`,
		`script-src 'nonce-${nonce}'`,
		`img-src ${webview.cspSource} data:`,
	].join('; ');
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(strings.title)}</title>
	<style nonce="${nonce}">${getAudioProxyPanelStyle()}</style>
</head>
<body>
	<main>
		<header class="page-header">
			<h1>${escapeHtml(strings.title)}</h1>
			<p class="intro">${escapeHtml(strings.description)}</p>
		</header>
		<div id="summary" class="summary">
			<div class="summary-dot"></div>
			<div>
				<div id="summaryTitle" class="summary-title"></div>
				<div id="summaryDetail" class="summary-detail"></div>
			</div>
		</div>
		<form id="form">
			<fieldset class="card">
				<div class="field">
					<div class="field-label">${escapeHtml(strings.fieldSource)}</div>
					<div class="source-options">
						<label class="source-option">
							<input id="sourceVscodeLm" type="radio" name="source" value="vscode-lm">
							<span>${escapeHtml(strings.sourceVscodeLm)}</span>
						</label>
						<label class="source-option">
							<input id="sourceApiEndpoint" type="radio" name="source" value="api-endpoint">
							<span>${escapeHtml(strings.sourceApiEndpoint)}</span>
						</label>
					</div>
				</div>
			</fieldset>
			<fieldset id="endpointSection" class="card">
				<div class="field">
					<label for="url">${escapeHtml(strings.fieldEndpointUrl)}</label>
					<input id="url" type="url" placeholder="${escapeHtml(strings.placeholderEndpoint)}">
				</div>
				<div class="field">
					<label for="endpointType">${escapeHtml(strings.fieldEndpointType)}</label>
					<select id="endpointType">
						<option value="">${escapeHtml(strings.placeholderEndpointType)}</option>
						<option value="openai-transcriptions">${escapeHtml(strings.endpointTypeOpenAITranscriptions)}</option>
						<option value="openai-responses">${escapeHtml(strings.endpointTypeOpenAIResponsesAudio)}</option>
					</select>
				</div>
				<div class="field">
					<label for="apiKey">${escapeHtml(strings.fieldApiKey)}</label>
					<input id="apiKey" type="password" autocomplete="off" placeholder="${escapeHtml(strings.placeholderEnterApiKey)}">
					<div id="apiKeyHint" class="hint"></div>
				</div>
				<div class="field">
					<label for="modelId">${escapeHtml(strings.fieldModelId)}</label>
					<input id="modelId" placeholder="gpt-4o-mini-transcribe">
				</div>
				<details class="advanced">
					<summary>${escapeHtml(strings.advancedSettings)}</summary>
					<div class="advanced-body">
						<div class="field">
							<label for="headers">${escapeHtml(strings.fieldCustomHeaders)}</label>
							<textarea id="headers" spellcheck="false"></textarea>
						</div>
						<div class="field">
							<label for="extraBody">${escapeHtml(strings.fieldExtraBody)}</label>
							<textarea id="extraBody" spellcheck="false"></textarea>
						</div>
					</div>
				</details>
			</fieldset>
			<div class="actions">
				<button id="save" type="submit">${escapeHtml(strings.actionSave)}</button>
			</div>
			<div id="status" class="status" aria-live="polite"></div>
		</form>
	</main>
	<script nonce="${nonce}">${getAudioProxyPanelScript(initialState, initialStrings)}</script>
</body>
</html>`;
}

function getAudioProxyPanelStrings() {
	return {
		title: t('audio.panel.title'),
		description: t('audio.panel.description'),
		fieldSource: t('audio.panel.field.source'),
		sourceVscodeLm: t('audio.panel.source.vscodeLm'),
		sourceApiEndpoint: t('audio.panel.source.apiEndpoint'),
		fieldEndpointUrl: t('audio.panel.field.endpointUrl'),
		fieldEndpointType: t('audio.panel.field.endpointType'),
		fieldApiKey: t('audio.panel.field.apiKey'),
		fieldModelId: t('audio.panel.field.modelId'),
		fieldCustomHeaders: t('audio.panel.field.customHeaders'),
		fieldExtraBody: t('audio.panel.field.extraBody'),
		advancedSettings: t('audio.panel.advanced.title'),
		placeholderEndpoint: t('audio.panel.placeholder.openaiTranscriptionsEndpoint'),
		placeholderEndpointType: t('audio.panel.placeholder.endpointType'),
		placeholderEnterApiKey: t('audio.panel.placeholder.enterApiKey'),
		endpointTypeOpenAITranscriptions: t('audio.panel.endpointType.openaiTranscriptions'),
		endpointTypeOpenAIResponsesAudio: t('audio.panel.endpointType.openaiResponsesAudio'),
		actionSave: t('audio.panel.action.save'),
		actionClearApiKey: t('audio.panel.action.clearApiKey'),
		statusApiKeySet: t('audio.panel.status.apiKeySet'),
		statusApiKeyNotSet: t('audio.panel.status.apiKeyNotSet'),
		statusApiKeyCleared: t('audio.panel.status.apiKeyCleared'),
		statusVscodeLmSelected: t('audio.panel.status.vscodeLmSelected'),
		statusEndpointSaved: t('audio.panel.status.endpointSaved'),
		statusEndpointSavedWithKey: t('audio.panel.status.endpointSavedWithKey'),
		summaryVscodeLmTitle: t('audio.panel.summary.vscodeLm.title'),
		summaryVscodeLmDetail: t('audio.panel.summary.vscodeLm.detail'),
		summaryApiNotConfiguredTitle: t('audio.panel.summary.apiNotConfigured.title'),
		summaryApiNotConfiguredDetail: t('audio.panel.summary.apiNotConfigured.detail'),
		summaryApiEndpointTitle: t('audio.panel.summary.apiEndpoint.title'),
		summaryApiEndpointDetail: t('audio.panel.summary.apiEndpoint.detail'),
		summaryApiKeySet: t('audio.panel.summary.apiKeySet'),
		summaryApiKeyNotSet: t('audio.panel.summary.apiKeyNotSet'),
		errorRequired: t('audio.panel.error.required'),
		errorInvalidJson: t('audio.panel.error.invalidJson'),
	};
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
