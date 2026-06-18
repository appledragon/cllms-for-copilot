/**
 * Client script for the providers webview. Builds the provider cards with DOM
 * APIs (textContent, never innerHTML) so provider/endpoint strings can't inject
 * markup, and posts `{ type, providerId? }` messages for every action.
 */
export function getProvidersViewScript(initialState: string, initialStrings: string): string {
	return `
		const vscode = acquireVsCodeApi();
		const initialState = ${initialState};
		const strings = ${initialStrings};
		const providersEl = document.getElementById('providers');

		function post(type, providerId) {
			vscode.postMessage(providerId ? { type: type, providerId: providerId } : { type: type });
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

		function actionButton(label, action, providerId, primary) {
			const button = el('button', primary ? 'primary' : null, label);
			button.type = 'button';
			button.dataset.action = action;
			if (providerId) {
				button.dataset.provider = providerId;
			}
			return button;
		}

		function getOpenProviderIds() {
			const ids = new Set();
			providersEl.querySelectorAll('details.models[open]').forEach(function (node) {
				if (node.dataset.provider) {
					ids.add(node.dataset.provider);
				}
			});
			return ids;
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

		function renderCard(provider, openIds) {
			const card = el('div', provider.configured ? 'card configured' : 'card');

			const head = el('div', 'card-head');
			head.appendChild(el('span', 'status-dot'));
			head.appendChild(el('span', 'card-name', provider.name));
			head.appendChild(el('span', 'card-status', provider.statusLabel));
			card.appendChild(head);

			const endpoint = el('p', 'card-endpoint', provider.endpoint);
			endpoint.title = strings.endpointLabel + ': ' + provider.endpoint;
			card.appendChild(endpoint);

			const actions = el('div', 'actions');
			actions.appendChild(actionButton(strings.actionSetup, 'setupProvider', provider.id, true));
			actions.appendChild(actionButton(strings.actionSetApiKey, 'setApiKey', provider.id));
			if (provider.configured) {
				actions.appendChild(actionButton(strings.actionClearApiKey, 'clearApiKey', provider.id));
			}
			actions.appendChild(actionButton(strings.actionTest, 'testConnection', provider.id));
			actions.appendChild(actionButton(strings.actionApiKeyPage, 'openApiKeyPage', provider.id));
			actions.appendChild(actionButton(strings.actionUsagePage, 'openUsagePage', provider.id));
			actions.appendChild(actionButton(strings.actionStatusPage, 'openStatusPage', provider.id));
			actions.appendChild(
				actionButton(strings.actionProviderSettings, 'openProviderSettings', provider.id),
			);
			card.appendChild(actions);

			if (provider.models.length) {
				card.appendChild(renderModels(provider, openIds.has(provider.id)));
			}
			return card;
		}

		function render(state) {
			const openIds = getOpenProviderIds();
			providersEl.textContent = '';
			(state.providers || []).forEach(function (provider) {
				providersEl.appendChild(renderCard(provider, openIds));
			});
		}

		document.addEventListener('click', function (event) {
			const node = event.target;
			if (!(node instanceof Element)) {
				return;
			}
			const button = node.closest('button[data-action]');
			if (!button) {
				return;
			}
			post(button.dataset.action, button.dataset.provider);
		});

		window.addEventListener('message', function (event) {
			const message = event.data;
			if (message && message.type === 'state') {
				render(message.value);
			}
		});

		render(initialState);
	`;
}
