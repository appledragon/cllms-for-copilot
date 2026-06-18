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
			padding: 12px 12px 20px;
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background, var(--vscode-editor-background));
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			line-height: 1.5;
		}
		main {
			display: grid;
			gap: 12px;
		}
		.intro {
			margin: 0;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.5;
		}
		.providers {
			display: grid;
			gap: 10px;
		}
		.card {
			display: grid;
			gap: 10px;
			padding: 12px;
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
			background: var(--vscode-testing-iconQueued, #cca700);
		}
		.card.configured .status-dot {
			background: var(--vscode-testing-iconPassed, #73c991);
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
		}
		.card-endpoint {
			margin: 0;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			font-family: var(--vscode-editor-font-family, monospace);
			word-break: break-all;
		}
		.actions {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
		}
		button {
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
		button:focus-visible,
		summary:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}
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
		.global-actions {
			display: grid;
			gap: 8px;
			border-top: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			padding-top: 12px;
		}
		.global-actions-title {
			margin: 0;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.3px;
			text-transform: uppercase;
			color: var(--vscode-descriptionForeground);
		}
	`;
}
