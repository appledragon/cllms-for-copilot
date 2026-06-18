/** Inline stylesheet for the providers webview, tuned for the narrow sidebar. */
export function getProvidersViewStyle(): string {
	return `
		:root {
			color-scheme: light dark;
		}
		* {
			box-sizing: border-box;
		}
		body {
			margin: 0;
			padding: 10px 12px 20px;
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background, var(--vscode-editor-background));
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			line-height: 1.5;
		}
		main {
			display: grid;
			gap: 10px;
		}
		.icon-sprite {
			display: none;
		}
		.icon {
			width: 16px;
			height: 16px;
			flex: 0 0 auto;
			fill: none;
			stroke: currentColor;
			stroke-width: 1.4;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		.summary {
			margin: 0;
			min-height: 16px;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			letter-spacing: 0.2px;
		}

		/* ---- Provider cards ---- */
		.providers {
			display: grid;
			gap: 8px;
		}
		.card {
			display: grid;
			gap: 9px;
			padding: 11px 12px;
			border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			border-radius: 6px;
			background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
		}
		.card-head {
			display: flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		}
		.status-dot {
			flex: 0 0 auto;
			width: 9px;
			height: 9px;
			border-radius: 50%;
			background: var(--vscode-descriptionForeground);
		}
		.card.status-configured .status-dot {
			background: var(--vscode-charts-blue, #4daafc);
		}
		.card.status-ok .status-dot {
			background: var(--vscode-charts-green, #89d185);
		}
		.card.status-error .status-dot {
			background: var(--vscode-charts-red, #f14c4c);
		}
		.card-name {
			flex: 1 1 auto;
			min-width: 0;
			font-weight: 600;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.card-status {
			flex: 0 0 auto;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			white-space: nowrap;
		}
		.card.status-error .card-status {
			color: var(--vscode-charts-red, #f14c4c);
		}
		.card-endpoint {
			margin: 0;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			font-family: var(--vscode-editor-font-family, monospace);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/* ---- Actions ---- */
		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 6px;
		}
		.actions .spacer {
			flex: 1 1 auto;
		}
		button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 5px;
			color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
			background: var(--vscode-button-secondaryBackground, var(--vscode-toolbar-hoverBackground));
			border: 1px solid var(--vscode-button-border, transparent);
			border-radius: 4px;
			padding: 4px 9px;
			font-family: var(--vscode-font-family);
			font-size: 12px;
			cursor: pointer;
			white-space: nowrap;
		}
		button:hover {
			background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
		}
		button.primary {
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
		}
		button.primary:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button.icon-button {
			padding: 4px;
			width: 26px;
			height: 26px;
			color: var(--vscode-icon-foreground, var(--vscode-foreground));
			background: transparent;
			border-color: transparent;
		}
		button.icon-button:hover {
			background: var(--vscode-toolbar-hoverBackground);
		}
		button.danger:hover {
			color: var(--vscode-errorForeground, var(--vscode-foreground));
		}
		button[disabled] {
			opacity: 0.6;
			cursor: default;
		}
		button:focus-visible,
		summary:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}

		/* ---- Spinner ---- */
		.spinner {
			display: inline-block;
			width: 12px;
			height: 12px;
			border: 1.5px solid currentColor;
			border-right-color: transparent;
			border-radius: 50%;
			animation: cllms-spin 0.7s linear infinite;
		}
		.loading {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 14px 2px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
		@keyframes cllms-spin {
			to { transform: rotate(360deg); }
		}
		@media (prefers-reduced-motion: reduce) {
			.spinner { animation-duration: 0s; }
		}

		/* ---- Hints / errors ---- */
		.hint {
			display: flex;
			gap: 8px;
			padding: 10px 12px;
			border: 1px solid var(--vscode-panel-border, transparent);
			border-radius: 6px;
			background: var(--vscode-editorWidget-background, transparent);
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
		.hint .icon {
			color: var(--vscode-charts-blue, #4daafc);
		}
		.error-state {
			display: grid;
			gap: 10px;
			padding: 14px 2px;
		}
		.error-state .error-head {
			display: flex;
			gap: 8px;
			align-items: center;
			color: var(--vscode-errorForeground, var(--vscode-foreground));
			font-size: 12px;
		}
		.error-state .error-head .icon {
			color: var(--vscode-errorForeground, var(--vscode-foreground));
		}

		/* ---- Models ---- */
		.models {
			border-top: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			padding-top: 8px;
		}
		.models > summary {
			list-style: none;
			cursor: pointer;
			font-size: 12px;
			font-weight: 600;
			color: var(--vscode-foreground);
			user-select: none;
			display: flex;
			align-items: center;
			gap: 6px;
		}
		.models > summary::-webkit-details-marker {
			display: none;
		}
		.models > summary::before {
			content: "";
			width: 0;
			height: 0;
			border-left: 5px solid currentColor;
			border-top: 4px solid transparent;
			border-bottom: 4px solid transparent;
			transition: transform 0.12s ease;
		}
		.models[open] > summary::before {
			transform: rotate(90deg);
		}
		@media (prefers-reduced-motion: reduce) {
			.models > summary::before { transition: none; }
		}
		.model-list {
			display: grid;
			gap: 8px;
			margin: 10px 0 0;
			padding: 0;
			list-style: none;
		}
		.model-name {
			display: flex;
			align-items: center;
			gap: 6px;
			flex-wrap: wrap;
			font-size: 12px;
			font-weight: 600;
		}
		.model-detail {
			margin-top: 2px;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
		}
		.badge {
			flex: 0 0 auto;
			padding: 0 6px;
			border-radius: 8px;
			font-size: 10px;
			font-weight: 600;
			line-height: 16px;
			color: var(--vscode-badge-foreground);
			background: var(--vscode-badge-background);
		}
	`;
}
