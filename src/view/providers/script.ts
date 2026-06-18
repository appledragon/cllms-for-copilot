/**
 * Client script for the providers webview. Builds the UI with DOM APIs
 * (textContent / createElementNS, never innerHTML) so provider/endpoint strings
 * can't inject markup, and posts `{ type, providerId? }` messages for every
 * action. Handles loading/error phases and a transient per-provider "testing…"
 * state cleared whenever fresh state arrives.
 */
export function getProvidersViewScript(initialState: string, initialStrings: string): string {
	return `
		const vscode = acquireVsCodeApi();
		const initialState = ${initialState};
		const strings = ${initialStrings};
		const SVG_NS = 'http://www.w3.org/2000/svg';
		const summaryEl = document.getElementById('summary');
		const rootEl = document.getElementById('view-state');

		let currentState = { phase: 'loading', providers: [] };
		const busy = new Set();
		const busyTimers = Object.create(null);

		function post(type, providerId) {
			vscode.postMessage(providerId ? { type: type, providerId: providerId } : { type: type });
		}

		function format(tmpl, args) {
			let out = String(tmpl);
			for (let i = 0; i < args.length; i++) {
				out = out.split('{' + i + '}').join(String(args[i]));
			}
			return out;
		}

		function el(tag, className, text) {
			const node = document.createElement(tag);
			if (className) {
				node.className = className;
			}
			if (text !== undefined && text !== null && text !== '') {
				node.textContent = text;
			}
			return node;
		}

		function svgIcon(name) {
			const svg = document.createElementNS(SVG_NS, 'svg');
			svg.setAttribute('class', 'icon');
			svg.setAttribute('aria-hidden', 'true');
			svg.setAttribute('focusable', 'false');
			const use = document.createElementNS(SVG_NS, 'use');
			use.setAttribute('href', '#' + name);
			svg.appendChild(use);
			return svg;
		}

		function textButton(label, action, providerId, primary, ariaLabel) {
			const button = el('button', primary ? 'primary' : null, label);
			button.type = 'button';
			button.dataset.action = action;
			if (providerId) {
				button.dataset.provider = providerId;
			}
			if (ariaLabel) {
				button.setAttribute('aria-label', ariaLabel);
			}
			return button;
		}

		function iconButton(iconName, title, ariaLabel, action, providerId, danger) {
			const button = el('button', danger ? 'icon-button danger' : 'icon-button');
			button.type = 'button';
			button.dataset.action = action;
			if (providerId) {
				button.dataset.provider = providerId;
			}
			button.title = title;
			button.dataset.tooltip = title;
			button.setAttribute('aria-label', ariaLabel);
			button.appendChild(svgIcon(iconName));
			return button;
		}

		function renderModels(provider, open) {
			const details = el('details', 'models');
			details.dataset.provider = provider.id;
			details.open = open;
			details.appendChild(
				el('summary', null, strings.modelsLabel + ' (' + provider.models.length + ')'),
			);
			const list = el('ul', 'model-list');
			provider.models.forEach(function (model) {
				const item = el('li', 'model');
				if (model.tooltip) {
					item.title = model.tooltip;
				}
				const name = el('div', 'model-name');
				name.appendChild(el('span', null, model.name));
				if (model.vision) {
					name.appendChild(el('span', 'badge', strings.badgeVision));
				}
				if (model.thinking) {
					name.appendChild(el('span', 'badge', strings.badgeThinking));
				}
				item.appendChild(name);
				if (model.detail) {
					item.appendChild(el('div', 'model-detail', model.detail));
				}
				list.appendChild(item);
			});
			details.appendChild(list);
			return details;
		}

		function renderActions(provider) {
			const actions = el('div', 'actions');
			const name = provider.name;
			function tb(label, action, primary) {
				return textButton(label, action, provider.id, primary, label + ' — ' + name);
			}
			function ib(iconName, label, action, danger) {
				const hint = label + ' — ' + name;
				return iconButton(iconName, hint, hint, action, provider.id, danger);
			}

			if (!provider.configured) {
				actions.appendChild(tb(strings.actionSetup, 'setupProvider', true));
				actions.appendChild(tb(strings.actionSetApiKey, 'setApiKey', false));
				actions.appendChild(el('span', 'spacer'));
				actions.appendChild(ib('i-link', strings.actionApiKeyPage, 'openApiKeyPage'));
				actions.appendChild(ib('i-pulse', strings.actionStatusPage, 'openStatusPage'));
				return actions;
			}

			if (busy.has(provider.id)) {
				const testing = el('button');
				testing.type = 'button';
				testing.disabled = true;
				testing.setAttribute('aria-label', strings.statusTesting + ' — ' + name);
				const spinner = el('span', 'spinner');
				spinner.setAttribute('aria-hidden', 'true');
				testing.appendChild(spinner);
				testing.appendChild(el('span', null, strings.statusTesting));
				actions.appendChild(testing);
			} else {
				actions.appendChild(tb(strings.actionTest, 'testConnection', false));
			}
			actions.appendChild(el('span', 'spacer'));
			actions.appendChild(ib('i-key', strings.actionSetApiKey, 'setApiKey'));
			actions.appendChild(ib('i-trash', strings.actionClearApiKey, 'clearApiKey', true));
			actions.appendChild(ib('i-link', strings.actionApiKeyPage, 'openApiKeyPage'));
			actions.appendChild(ib('i-graph', strings.actionUsagePage, 'openUsagePage'));
			actions.appendChild(ib('i-pulse', strings.actionStatusPage, 'openStatusPage'));
			actions.appendChild(ib('i-sliders', strings.actionProviderSettings, 'openProviderSettings'));
			return actions;
		}

		function renderCard(provider, openIds) {
			const card = el('div', 'card status-' + provider.statusKind);
			card.setAttribute('role', 'group');
			const nameId = 'cllms-name-' + provider.id;
			card.setAttribute('aria-labelledby', nameId);

			const head = el('div', 'card-head');
			const dot = el('span', 'status-dot');
			dot.setAttribute('aria-hidden', 'true');
			head.appendChild(dot);
			const name = el('span', 'card-name', provider.name);
			name.id = nameId;
			head.appendChild(name);
			head.appendChild(el('span', 'card-status', provider.statusLabel));
			card.appendChild(head);

			const endpoint = el('p', 'card-endpoint', provider.endpoint);
			endpoint.title = strings.endpointLabel + ': ' + provider.endpoint;
			card.appendChild(endpoint);

			card.appendChild(renderActions(provider));

			if (provider.models && provider.models.length) {
				card.appendChild(renderModels(provider, openIds.has(provider.id)));
			}
			return card;
		}

		function renderLoading() {
			const box = el('div', 'loading');
			const spinner = el('span', 'spinner');
			spinner.setAttribute('aria-hidden', 'true');
			box.appendChild(spinner);
			box.appendChild(el('span', null, strings.loading));
			return box;
		}

		function renderError(state) {
			const box = el('div', 'error-state');
			const head = el('div', 'error-head');
			head.appendChild(svgIcon('i-warning'));
			head.appendChild(el('span', null, (state && state.errorMessage) || strings.error));
			box.appendChild(head);
			const retry = el('button');
			retry.type = 'button';
			retry.dataset.action = 'refresh';
			retry.appendChild(svgIcon('i-refresh'));
			retry.appendChild(el('span', null, strings.retry));
			box.appendChild(retry);
			return box;
		}

		function renderHint() {
			const box = el('div', 'hint');
			box.appendChild(svgIcon('i-info'));
			box.appendChild(el('span', null, strings.noneConfigured));
			return box;
		}

		function getOpenProviderIds() {
			const ids = new Set();
			rootEl.querySelectorAll('details.models[open]').forEach(function (node) {
				if (node.dataset.provider) {
					ids.add(node.dataset.provider);
				}
			});
			return ids;
		}

		function render(state) {
			currentState = state || { providers: [] };
			const phase = currentState.phase || 'ready';
			const openIds = getOpenProviderIds();
			rootEl.textContent = '';

			if (phase === 'loading') {
				summaryEl.textContent = '';
				rootEl.appendChild(renderLoading());
				return;
			}
			if (phase === 'error') {
				summaryEl.textContent = '';
				rootEl.appendChild(renderError(currentState));
				return;
			}

			const providers = currentState.providers || [];
			const total = currentState.totalCount != null ? currentState.totalCount : providers.length;
			const configured =
				currentState.configuredCount != null
					? currentState.configuredCount
					: providers.filter(function (p) { return p.configured; }).length;
			summaryEl.textContent = providers.length ? format(strings.summary, [configured, total]) : '';

			if (providers.length && configured === 0) {
				rootEl.appendChild(renderHint());
			}
			const list = el('div', 'providers');
			providers.forEach(function (provider) {
				list.appendChild(renderCard(provider, openIds));
			});
			rootEl.appendChild(list);
		}

		function markBusy(providerId) {
			busy.add(providerId);
			if (busyTimers[providerId]) {
				clearTimeout(busyTimers[providerId]);
			}
			busyTimers[providerId] = setTimeout(function () {
				clearBusy(providerId);
			}, 60000);
			render(currentState);
		}

		function clearBusy(providerId) {
			if (busy.delete(providerId)) {
				if (busyTimers[providerId]) {
					clearTimeout(busyTimers[providerId]);
					delete busyTimers[providerId];
				}
				render(currentState);
			}
		}

		function clearAllBusy() {
			busy.clear();
			for (const key in busyTimers) {
				clearTimeout(busyTimers[key]);
				delete busyTimers[key];
			}
		}

		document.addEventListener('click', function (event) {
			const node = event.target;
			if (!(node instanceof Element)) {
				return;
			}
			const button = node.closest('button[data-action]');
			if (!button || button.disabled) {
				return;
			}
			const action = button.dataset.action;
			const providerId = button.dataset.provider;
			if (action === 'testConnection' && providerId) {
				markBusy(providerId);
			}
			post(action, providerId);
		});

		window.addEventListener('message', function (event) {
			const message = event.data;
			if (message && message.type === 'state') {
				clearAllBusy();
				render(message.value);
			}
		});

		render(initialState);
	`;
}
