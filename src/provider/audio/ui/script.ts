export function getAudioProxyPanelScript(initialState: string, initialStrings: string): string {
	return `
		const vscode = acquireVsCodeApi();
		const strings = ${initialStrings};
		let currentState = ${initialState};
		const summary = document.getElementById('summary');
		const summaryTitle = document.getElementById('summaryTitle');
		const summaryDetail = document.getElementById('summaryDetail');
		const form = document.getElementById('form');
		const sourceInputs = Array.from(document.querySelectorAll('input[name="source"]'));
		const endpointSection = document.getElementById('endpointSection');
		const endpointType = document.getElementById('endpointType');
		const url = document.getElementById('url');
		const apiKey = document.getElementById('apiKey');
		const apiKeyHint = document.getElementById('apiKeyHint');
		const modelId = document.getElementById('modelId');
		const headers = document.getElementById('headers');
		const extraBody = document.getElementById('extraBody');
		const status = document.getElementById('status');

		function formatString(template, ...args) {
			return template.replace(/\\{(\\d+)\\}/g, (m, i) =>
				Object.prototype.hasOwnProperty.call(args, i) ? String(args[i]) : m,
			);
		}

		function getSelectedSource() {
			const selected = sourceInputs.find((item) => item.checked);
			return selected ? selected.value : 'api-endpoint';
		}

		function setSelectedSource(value) {
			for (const item of sourceInputs) {
				item.checked = item.value === value;
			}
		}

		function parseOptionalJson(value, label) {
			const text = value.trim();
			if (!text) return undefined;
			try {
				return JSON.parse(text);
			} catch {
				throw new Error(formatString(strings.errorInvalidJson, label));
			}
		}

		function getEndpointTypeConfig(value) {
			if (value === 'openai-transcriptions') {
				return { providerFamily: 'openai-compatible', apiType: 'transcriptions' };
			}
			if (value === 'openai-responses') {
				return { providerFamily: 'openai-compatible', apiType: 'responses' };
			}
			throw new Error(formatString(strings.errorRequired, strings.fieldEndpointType));
		}

		function getEndpointTypeValue(config) {
			if (!config || config.providerFamily !== 'openai-compatible') {
				return '';
			}
			return config.apiType === 'responses' ? 'openai-responses' : 'openai-transcriptions';
		}

		function renderApiKeyHint(hasApiKey) {
			apiKeyHint.textContent = '';
			if (!hasApiKey) {
				apiKeyHint.textContent = strings.statusApiKeyNotSet;
				return;
			}
			apiKeyHint.appendChild(document.createTextNode(strings.statusApiKeySet + ' '));
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'hint-link';
			button.textContent = strings.actionClearApiKey;
			button.addEventListener('click', () => vscode.postMessage({ type: 'clearApiKey' }));
			apiKeyHint.appendChild(button);
		}

		function renderSummary() {
			const source = getSelectedSource();
			const config = currentState.config || {};
			if (source === 'vscode-lm') {
				summary.classList.remove('warning', 'error');
				summary.classList.add('success');
				summaryTitle.textContent = strings.summaryVscodeLmTitle;
				summaryDetail.textContent = strings.summaryVscodeLmDetail;
				return;
			}
			if (!config.url || !config.modelId || !getEndpointTypeValue(config)) {
				summary.classList.remove('success', 'warning');
				summary.classList.add('error');
				summaryTitle.textContent = strings.summaryApiNotConfiguredTitle;
				summaryDetail.textContent = strings.summaryApiNotConfiguredDetail;
				return;
			}
			summary.classList.remove('success', 'error');
			summary.classList.add(currentState.hasApiKey ? 'success' : 'warning');
			summaryTitle.textContent = strings.summaryApiEndpointTitle;
			summaryDetail.textContent = formatString(
				strings.summaryApiEndpointDetail,
				config.modelId,
				endpointType.options[endpointType.selectedIndex]?.text || '',
				(new URL(config.url)).host,
				currentState.hasApiKey ? strings.summaryApiKeySet : strings.summaryApiKeyNotSet,
			);
		}

		function syncVisibility() {
			endpointSection.hidden = getSelectedSource() !== 'api-endpoint';
		}

		function setStatus(message, isError) {
			status.textContent = message || '';
			status.classList.toggle('error', Boolean(isError));
			status.classList.toggle('success', !isError && Boolean(message));
		}

		function applyState(nextState) {
			currentState = nextState;
			setSelectedSource(nextState.source || 'api-endpoint');
			const config = nextState.config || {};
			url.value = config.url || '';
			endpointType.value = getEndpointTypeValue(config);
			apiKey.value = '';
			modelId.value = config.modelId || '';
			headers.value = config.headers ? JSON.stringify(config.headers, null, 2) : '';
			extraBody.value = config.extraBody ? JSON.stringify(config.extraBody, null, 2) : '';
			renderApiKeyHint(nextState.hasApiKey);
			syncVisibility();
			renderSummary();
		}

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			try {
				const source = getSelectedSource();
				if (source === 'vscode-lm') {
					vscode.postMessage({ type: 'saveConfig', value: { source } });
					return;
				}
				const endpoint = getEndpointTypeConfig(endpointType.value);
				vscode.postMessage({
					type: 'saveConfig',
					value: {
						source,
						apiKey: apiKey.value,
						config: {
							providerFamily: endpoint.providerFamily,
							apiType: endpoint.apiType,
							url: url.value,
							modelId: modelId.value,
							headers: parseOptionalJson(headers.value, strings.fieldCustomHeaders),
							extraBody: parseOptionalJson(extraBody.value, strings.fieldExtraBody),
						},
					},
				});
			} catch (error) {
				setStatus(error instanceof Error ? error.message : String(error), true);
			}
		});

		for (const input of sourceInputs) {
			input.addEventListener('change', () => {
				syncVisibility();
				renderSummary();
				setStatus('', false);
			});
		}

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'state') {
				applyState(message.value);
				return;
			}
			if (message.type === 'status') {
				setStatus(message.value.message, message.value.error);
				return;
			}
			if (message.type === 'apiKeyCleared') {
				currentState = { ...currentState, hasApiKey: false };
				renderApiKeyHint(false);
				renderSummary();
				setStatus(message.value.message || strings.statusApiKeyCleared, false);
			}
		});

		applyState(currentState);
	`;
}
