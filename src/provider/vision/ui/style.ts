export function getVisionProxyPanelStyle(): string {
	return `
		:root {
			color-scheme: light dark;
		}
		* {
			box-sizing: border-box;
		}
		body {
			margin: 0;
			padding: 28px 24px 40px;
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			line-height: 1.5;
		}
		main {
			max-width: 720px;
			margin: 0 auto;
			display: grid;
			gap: 20px;
		}
		header.page-header {
			display: grid;
			gap: 6px;
		}
		h1 {
			margin: 0;
			font-size: 20px;
			font-weight: 600;
			letter-spacing: 0.2px;
		}
		.intro {
			margin: 0;
			color: var(--vscode-descriptionForeground);
			line-height: 1.55;
		}
		.summary {
			display: flex;
			align-items: flex-start;
			gap: 10px;
			padding: 12px 14px;
			border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			border-left: 3px solid var(--vscode-descriptionForeground);
			border-radius: 6px;
			background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
		}
		.summary-dot {
			flex: 0 0 auto;
			width: 8px;
			height: 8px;
			margin-top: 6px;
			border-radius: 50%;
			background: var(--vscode-descriptionForeground);
		}
		.summary-title {
			font-weight: 600;
		}
		.summary-detail {
			margin-top: 3px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.5;
		}
		.summary.success {
			border-left-color: var(--vscode-testing-iconPassed, #73c991);
		}
		.summary.success .summary-dot {
			background: var(--vscode-testing-iconPassed, #73c991);
		}
		.summary.warning {
			border-left-color: var(--vscode-testing-iconQueued, #cca700);
		}
		.summary.warning .summary-dot {
			background: var(--vscode-testing-iconQueued, #cca700);
		}
		.summary.error {
			border-left-color: var(--vscode-testing-iconFailed, var(--vscode-errorForeground));
		}
		.summary.error .summary-dot {
			background: var(--vscode-testing-iconFailed, var(--vscode-errorForeground));
		}
		form {
			display: grid;
			gap: 16px;
		}
		fieldset {
			margin: 0;
			padding: 0;
			border: 0;
			display: grid;
			gap: 16px;
		}
		.card {
			display: grid;
			gap: 14px;
			padding: 18px;
			border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			border-radius: 8px;
			background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
		}
		.card-title {
			margin: 0;
			font-size: 13px;
			font-weight: 600;
			letter-spacing: 0.3px;
			text-transform: uppercase;
			color: var(--vscode-descriptionForeground);
		}
		.field {
			display: grid;
			gap: 6px;
		}
		.section {
			display: grid;
			gap: 14px;
		}
		[hidden] {
			display: none !important;
		}
		label {
			font-weight: 600;
		}
		.field-label {
			font-weight: 600;
		}
		input,
		select,
		textarea {
			box-sizing: border-box;
			width: 100%;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			padding: 7px 10px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}
		input::placeholder,
		textarea::placeholder {
			color: var(--vscode-input-placeholderForeground);
		}
		.source-options {
			display: inline-flex;
			align-items: stretch;
			flex-wrap: wrap;
			padding: 2px;
			border-radius: 6px;
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border, transparent);
		}
		.source-option {
			position: relative;
			flex: 0 0 auto;
			font-weight: 400;
		}
		.source-option input {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: 0;
			padding: 0;
			border: 0;
			opacity: 0;
			background: transparent;
			pointer-events: none;
		}
		.source-option span {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 28px;
			box-sizing: border-box;
			padding: 4px 16px;
			color: var(--vscode-foreground);
			background: transparent;
			border: 1px solid transparent;
			border-radius: 4px;
			cursor: pointer;
			white-space: nowrap;
			user-select: none;
		}
		.source-option input:checked + span {
			z-index: 1;
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
		}
		.source-option input:focus-visible + span {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}
		.source-option input:not(:checked) + span:hover {
			background: var(--vscode-toolbar-hoverBackground);
		}
		textarea {
			min-height: 110px;
			font-family: var(--vscode-editor-font-family, monospace);
			resize: vertical;
		}
		input:focus,
		select:focus,
		textarea:focus,
		button:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}
		.hint {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.5;
		}
		.hint-link {
			display: inline;
			margin: 0;
			padding: 0;
			border: 0;
			color: var(--vscode-textLink-foreground);
			background: transparent;
			font: inherit;
			text-decoration: underline;
			cursor: pointer;
		}
		.hint-link:hover {
			color: var(--vscode-textLink-activeForeground);
			background: transparent;
		}
		details.advanced {
			border-top: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			padding-top: 14px;
		}
		details.advanced > summary {
			display: flex;
			align-items: center;
			gap: 6px;
			list-style: none;
			cursor: pointer;
			font-weight: 600;
			color: var(--vscode-foreground);
			user-select: none;
			border-radius: 4px;
			padding: 2px 0;
		}
		details.advanced > summary::-webkit-details-marker {
			display: none;
		}
		details.advanced > summary::before {
			content: "";
			width: 0;
			height: 0;
			border-left: 5px solid currentColor;
			border-top: 4px solid transparent;
			border-bottom: 4px solid transparent;
			transition: transform 0.12s ease;
		}
		details.advanced[open] > summary::before {
			transform: rotate(90deg);
		}
		details.advanced > summary:hover {
			color: var(--vscode-textLink-foreground);
		}
		details.advanced > summary:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 2px;
		}
		details.advanced .advanced-body {
			display: grid;
			gap: 14px;
			margin-top: 14px;
		}
		.actions {
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: 8px;
			padding-top: 4px;
		}
		button {
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
			border: 1px solid var(--vscode-button-border, transparent);
			border-radius: 4px;
			padding: 7px 16px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			font-weight: 600;
			cursor: pointer;
		}
		button.secondary {
			color: var(--vscode-button-secondaryForeground);
			background: var(--vscode-button-secondaryBackground);
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button.secondary:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}
		.status {
			min-height: 18px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
		.status.error,
		.status.success {
			display: flex;
			align-items: flex-start;
			gap: 8px;
			min-height: 0;
			margin-top: 2px;
			padding: 10px 12px;
			border: 1px solid transparent;
			border-left-width: 3px;
			border-radius: 6px;
			font-size: 13px;
			line-height: 1.5;
		}
		.status.error {
			color: var(--vscode-inputValidation-errorForeground, var(--vscode-foreground));
			background: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.12));
			border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
		}
		.status.success {
			color: var(--vscode-foreground);
			background: var(--vscode-inputValidation-infoBackground, rgba(115, 201, 145, 0.12));
			border-color: var(--vscode-testing-iconPassed, #73c991);
		}
		.status-icon {
			flex: 0 0 auto;
			width: 16px;
			height: 16px;
			margin-top: 1px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			font-size: 11px;
			font-weight: 700;
			line-height: 1;
			color: var(--vscode-editor-background);
		}
		.status.error .status-icon {
			background: var(--vscode-errorForeground, #f48771);
		}
		.status.success .status-icon {
			background: var(--vscode-testing-iconPassed, #73c991);
		}
		.status-body {
			flex: 1 1 auto;
			min-width: 0;
			word-break: break-word;
		}
		.status-link {
			display: inline;
			margin: 0;
			padding: 0;
			border: 0;
			color: var(--vscode-textLink-foreground);
			background: transparent;
			font: inherit;
			text-decoration: underline;
			cursor: pointer;
		}
		.status.error .status-link,
		.status.success .status-link {
			color: inherit;
			font-weight: 600;
		}
		.status-link:hover {
			color: var(--vscode-textLink-activeForeground);
		}
		.status.error .status-link:hover,
		.status.success .status-link:hover {
			color: inherit;
			text-decoration: none;
		}
		.test-result {
			border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
			border-radius: 8px;
			padding: 14px;
			background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
		}
		.test-result-grid {
			display: grid;
			grid-template-columns: minmax(140px, max-content) minmax(0, 1fr);
			gap: 14px;
			align-items: start;
		}
		.test-result-pane {
			display: grid;
			gap: 6px;
			min-width: 0;
		}
		.test-result-label {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.5;
			font-weight: 600;
		}
		.test-image {
			display: block;
			max-width: 160px;
			height: auto;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			background: var(--vscode-input-background);
			image-rendering: pixelated;
		}
		.test-response {
			box-sizing: border-box;
			min-height: 48px;
			max-height: 180px;
			margin: 0;
			padding: 10px;
			overflow: auto;
			white-space: pre-wrap;
			word-break: break-word;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			font-family: var(--vscode-editor-font-family, monospace);
			font-size: var(--vscode-editor-font-size, var(--vscode-font-size));
			line-height: 1.5;
		}
		@media (max-width: 640px) {
			body {
				padding: 20px 16px 32px;
			}
			.card {
				padding: 14px;
			}
			.source-options {
				width: 100%;
			}
			.source-option {
				flex: 1 1 0;
			}
			.actions {
				justify-content: stretch;
			}
			.actions button {
				flex: 1 1 0;
			}
			.test-result-grid {
				grid-template-columns: 1fr;
			}
		}
	`;
}
