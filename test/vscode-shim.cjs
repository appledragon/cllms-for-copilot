'use strict';

/**
 * Minimal `vscode` runtime stub for `node --test`.
 *
 * The extension source imports `vscode` for both types and a handful of runtime
 * values (chat part classes, role enums, `env.language`). The real module only
 * exists inside the VS Code host, so unit tests preload this stub via
 * `node --require ./test/vscode-shim.cjs`, which intercepts `require('vscode')`
 * and returns the surface below. The same object instance is shared between the
 * compiled source and the tests, so `instanceof` checks line up.
 */
const Module = require('node:module');

function createDisposable(dispose) {
	return {
		dispose: typeof dispose === 'function' ? dispose : () => {},
	};
}

class EventEmitter {
	constructor() {
		this.listeners = new Set();
		this.event = (listener) => {
			this.listeners.add(listener);
			return createDisposable(() => this.listeners.delete(listener));
		};
	}

	fire(value) {
		for (const listener of this.listeners) {
			listener(value);
		}
	}

	dispose() {
		this.listeners.clear();
	}
}

class LanguageModelTextPart {
	constructor(value) {
		this.value = value;
	}
}

class LanguageModelThinkingPart {
	constructor(value, id) {
		this.value = value;
		this.id = id;
	}
}

class LanguageModelDataPart {
	constructor(data, mimeType) {
		this.data = data;
		this.mimeType = mimeType;
	}
}

class LanguageModelToolCallPart {
	constructor(callId, name, input) {
		this.callId = callId;
		this.name = name;
		this.input = input;
	}
}

class LanguageModelToolResultPart {
	constructor(callId, content) {
		this.callId = callId;
		this.content = content;
	}
}

class LanguageModelToolResult {
	constructor(content) {
		this.content = content;
	}
}

class LanguageModelChatMessage {
	constructor(role, content) {
		this.role = role;
		this.content = content;
	}

	static User(content) {
		return new LanguageModelChatMessage(LanguageModelChatMessageRole.User, content);
	}

	static Assistant(content) {
		return new LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, content);
	}
}

class CancellationTokenSource {
	constructor() {
		this.emitter = new EventEmitter();
		this.token = {
			isCancellationRequested: false,
			onCancellationRequested: this.emitter.event,
		};
	}

	cancel() {
		this.token.isCancellationRequested = true;
		this.emitter.fire(undefined);
	}

	dispose() {
		this.emitter.dispose();
	}
}

class Uri {
	constructor({ scheme = 'file', authority = '', path = '', query = '', fragment = '' }) {
		this.scheme = scheme;
		this.authority = authority;
		this.path = path;
		this.query = query;
		this.fragment = fragment;
		this.fsPath = scheme === 'file' ? decodeURIComponent(path) : path;
	}

	static file(path) {
		return new Uri({ scheme: 'file', path });
	}

	static from(value) {
		return new Uri(value);
	}

	static parse(value) {
		const parsed = new URL(value);
		return new Uri({
			scheme: parsed.protocol.replace(/:$/, ''),
			authority: parsed.host,
			path: parsed.pathname,
			query: parsed.search.replace(/^\?/, ''),
			fragment: parsed.hash.replace(/^#/, ''),
		});
	}

	toString() {
		if (this.scheme === 'file') {
			return `file://${this.path}`;
		}
		const authority = this.authority ? `//${this.authority}` : '';
		const query = this.query ? `?${this.query}` : '';
		const fragment = this.fragment ? `#${this.fragment}` : '';
		return `${this.scheme}:${authority}${this.path}${query}${fragment}`;
	}
}

class ThemeIcon {
	constructor(id, color) {
		this.id = id;
		this.color = color;
	}
}

class ThemeColor {
	constructor(id) {
		this.id = id;
	}
}

class MarkdownString {
	constructor(value = '') {
		this.value = value;
		this.isTrusted = false;
		this.supportThemeIcons = false;
	}

	appendText(value) {
		this.value += value;
		return this;
	}

	appendMarkdown(value) {
		this.value += value;
		return this;
	}
}

class TreeItem {
	constructor(label, collapsibleState) {
		this.label = label;
		this.collapsibleState = collapsibleState;
	}
}

const LanguageModelChatMessageRole = { User: 1, Assistant: 2, System: 3 };
const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
const LanguageModelChatToolMode = { Auto: 1, Required: 2 };
const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
const StatusBarAlignment = { Left: 1, Right: 2 };
const ProgressLocation = { SourceControl: 1, Window: 10, Notification: 15 };

const state = {
	commands: new Map(),
	executedCommands: [],
	openedExternal: [],
	clipboardText: '',
	quickPickResult: undefined,
	inputBoxResult: undefined,
	messageResult: undefined,
	infoMessages: [],
	warningMessages: [],
	errorMessages: [],
	outputChannels: [],
	statusBarItems: [],
	inputBoxes: [],
	quickPicks: [],
	uriHandlers: [],
	languageModelProviders: new Map(),
	selectChatModelsCalls: [],
	activatedExtensions: [],
	configuration: new Map(),
	workspaceConfiguration: new Map(),
	treeDataProviders: new Map(),
	treeViews: [],
	webviewViewProviders: new Map(),
};

const configurationEmitter = new EventEmitter();

function configurationKey(section, key) {
	return section && key ? `${section}.${key}` : (key ?? section ?? '');
}

function getConfigurationValue(section, key, defaultValue) {
	const fullKey = configurationKey(section, key);
	if (state.workspaceConfiguration.has(fullKey)) {
		return state.workspaceConfiguration.get(fullKey);
	}
	if (state.configuration.has(fullKey)) {
		return state.configuration.get(fullKey);
	}
	return defaultValue;
}

function setConfigurationValue(section, key, value, target) {
	const fullKey = configurationKey(section, key);
	const store =
		target === ConfigurationTarget.Workspace ? state.workspaceConfiguration : state.configuration;
	if (value === undefined) {
		store.delete(fullKey);
	} else {
		store.set(fullKey, value);
	}
	configurationEmitter.fire({
		affectsConfiguration(candidate) {
			return candidate === fullKey || fullKey.startsWith(`${candidate}.`);
		},
	});
}

function inspectConfigurationValue(section, key) {
	const fullKey = configurationKey(section, key);
	return {
		globalValue: state.configuration.get(fullKey),
		workspaceValue: state.workspaceConfiguration.get(fullKey),
	};
}

function createConfiguration(section) {
	return {
		get(key, defaultValue) {
			return getConfigurationValue(section, key, defaultValue);
		},
		inspect(key) {
			return inspectConfigurationValue(section, key);
		},
		update(key, value, target) {
			setConfigurationValue(section, key, value, target);
			return Promise.resolve();
		},
	};
}

function createOutputChannel(name) {
	const entries = [];
	const channel = {
		name,
		entries,
		info: (message) => entries.push({ level: 'info', message }),
		warn: (message) => entries.push({ level: 'warn', message }),
		error: (message) => entries.push({ level: 'error', message }),
		debug: (message) => entries.push({ level: 'debug', message }),
		show: () => entries.push({ level: 'show', message: '' }),
		dispose: () => {
			channel.disposed = true;
		},
		disposed: false,
	};
	state.outputChannels.push(channel);
	return channel;
}

function createStatusBarItem(alignment, priority) {
	const item = {
		alignment,
		priority,
		command: undefined,
		tooltip: undefined,
		text: '',
		visible: false,
		show() {
			this.visible = true;
		},
		hide() {
			this.visible = false;
		},
		dispose() {
			this.disposed = true;
		},
		disposed: false,
	};
	state.statusBarItems.push(item);
	return item;
}

function createInputBox() {
	const acceptEmitter = new EventEmitter();
	const hideEmitter = new EventEmitter();
	const buttonEmitter = new EventEmitter();
	const changeEmitter = new EventEmitter();
	const input = {
		value: '',
		placeholder: undefined,
		prompt: undefined,
		title: undefined,
		password: false,
		ignoreFocusOut: false,
		buttons: [],
		validationMessage: undefined,
		busy: false,
		enabled: true,
		visible: false,
		onDidAccept: acceptEmitter.event,
		onDidHide: hideEmitter.event,
		onDidTriggerButton: buttonEmitter.event,
		onDidChangeValue: changeEmitter.event,
		show() {
			this.visible = true;
			// Simulate the user: type the configured value and accept, or dismiss.
			queueMicrotask(() => {
				if (state.inputBoxResult !== undefined) {
					this.value = state.inputBoxResult;
					changeEmitter.fire(this.value);
					acceptEmitter.fire();
				} else {
					hideEmitter.fire();
				}
			});
		},
		hide() {
			this.visible = false;
			hideEmitter.fire();
		},
		dispose() {
			acceptEmitter.dispose();
			hideEmitter.dispose();
			buttonEmitter.dispose();
			changeEmitter.dispose();
		},
		__acceptEmitter: acceptEmitter,
		__buttonEmitter: buttonEmitter,
	};
	state.inputBoxes.push(input);
	return input;
}

function createQuickPick() {
	const acceptEmitter = new EventEmitter();
	const hideEmitter = new EventEmitter();
	const itemButtonEmitter = new EventEmitter();
	const activeEmitter = new EventEmitter();
	const quickPick = {
		items: [],
		value: '',
		placeholder: undefined,
		title: undefined,
		ignoreFocusOut: false,
		busy: false,
		selectedItems: [],
		activeItems: [],
		visible: false,
		onDidAccept: acceptEmitter.event,
		onDidHide: hideEmitter.event,
		onDidTriggerItemButton: itemButtonEmitter.event,
		onDidChangeActive: activeEmitter.event,
		show() {
			this.visible = true;
			// Simulate the user: pick the configured result (or the first item).
			queueMicrotask(() => {
				const chosen = state.quickPickResult ?? this.items[0];
				if (chosen !== undefined) {
					this.selectedItems = [chosen];
					this.activeItems = [chosen];
					acceptEmitter.fire();
				} else {
					hideEmitter.fire();
				}
			});
		},
		hide() {
			this.visible = false;
			hideEmitter.fire();
		},
		dispose() {
			acceptEmitter.dispose();
			hideEmitter.dispose();
			itemButtonEmitter.dispose();
			activeEmitter.dispose();
		},
		__itemButtonEmitter: itemButtonEmitter,
	};
	state.quickPicks.push(quickPick);
	return quickPick;
}

function resetState() {
	state.commands.clear();
	state.executedCommands.length = 0;
	state.openedExternal.length = 0;
	state.clipboardText = '';
	state.quickPickResult = undefined;
	state.inputBoxResult = undefined;
	state.messageResult = undefined;
	state.infoMessages.length = 0;
	state.warningMessages.length = 0;
	state.errorMessages.length = 0;
	state.outputChannels.length = 0;
	state.statusBarItems.length = 0;
	state.inputBoxes.length = 0;
	state.quickPicks.length = 0;
	state.uriHandlers.length = 0;
	state.languageModelProviders.clear();
	state.selectChatModelsCalls.length = 0;
	state.activatedExtensions.length = 0;
	state.configuration.clear();
	state.workspaceConfiguration.clear();
	state.treeDataProviders.clear();
	state.treeViews.length = 0;
	state.webviewViewProviders.clear();
	vscodeStub.env.language = 'en';
	vscodeStub.env.remoteName = undefined;
}

const vscodeStub = {
	version: '1.116.0-test',
	env: {
		language: 'en',
		remoteName: undefined,
		uiKind: 1,
		uriScheme: 'vscode-test',
		asExternalUri: async (uri) => uri,
		openExternal: async (uri) => {
			state.openedExternal.push(uri);
			return true;
		},
		clipboard: {
			writeText: async (value) => {
				state.clipboardText = value;
			},
			readText: async () => state.clipboardText,
		},
	},
	workspace: {
		workspaceFolders: undefined,
		workspaceFile: undefined,
		getConfiguration(section) {
			return createConfiguration(section);
		},
		onDidChangeConfiguration: configurationEmitter.event,
	},
	window: {
		createOutputChannel,
		createStatusBarItem,
		createInputBox,
		createQuickPick,
		showInformationMessage: async (message, ...items) => {
			state.infoMessages.push({ message, items });
			return state.messageResult;
		},
		showWarningMessage: async (message, ...items) => {
			state.warningMessages.push({ message, items });
			return state.messageResult;
		},
		showErrorMessage: async (message, ...items) => {
			state.errorMessages.push({ message, items });
			return state.messageResult;
		},
		showQuickPick: async (items) => state.quickPickResult ?? items?.[0],
		showInputBox: async () => state.inputBoxResult,
		registerUriHandler: (handler) => {
			state.uriHandlers.push(handler);
			return createDisposable(() => {
				const index = state.uriHandlers.indexOf(handler);
				if (index >= 0) state.uriHandlers.splice(index, 1);
			});
		},
		createTreeView: (viewId, options) => {
			state.treeDataProviders.set(viewId, options ? options.treeDataProvider : undefined);
			const view = {
				viewId,
				visible: true,
				disposed: false,
				dispose() {
					this.disposed = true;
				},
			};
			state.treeViews.push(view);
			return view;
		},
		registerTreeDataProvider: (viewId, treeDataProvider) => {
			state.treeDataProviders.set(viewId, treeDataProvider);
			return createDisposable(() => state.treeDataProviders.delete(viewId));
		},
		registerWebviewViewProvider: (viewId, provider, options) => {
			state.webviewViewProviders.set(viewId, { provider, options });
			return createDisposable(() => state.webviewViewProviders.delete(viewId));
		},
		withProgress: async (_options, task) =>
			task(
				{ report: () => {} },
				{ isCancellationRequested: false, onCancellationRequested: () => createDisposable() },
			),
	},
	commands: {
		registerCommand: (command, callback) => {
			state.commands.set(command, callback);
			return createDisposable(() => state.commands.delete(command));
		},
		executeCommand: async (command, ...args) => {
			state.executedCommands.push({ command, args });
			const callback = state.commands.get(command);
			return callback ? callback(...args) : undefined;
		},
	},
	lm: {
		registerLanguageModelChatProvider: (vendor, provider) => {
			state.languageModelProviders.set(vendor, provider);
			return createDisposable(() => state.languageModelProviders.delete(vendor));
		},
		registerTool: (name, tool) => {
			if (!state.lmTools) {
				state.lmTools = new Map();
			}
			state.lmTools.set(name, tool);
			return createDisposable(() => state.lmTools.delete(name));
		},
		selectChatModels: async (selector) => {
			state.selectChatModelsCalls.push(selector);
			return [];
		},
		tools: [],
	},
	extensions: {
		getExtension: (id) => ({
			id,
			activate: async () => {
				state.activatedExtensions.push(id);
			},
		}),
	},
	ConfigurationTarget,
	StatusBarAlignment,
	ProgressLocation,
	EventEmitter,
	ThemeIcon,
	ThemeColor,
	MarkdownString,
	TreeItem,
	TreeItemCollapsibleState,
	Uri,
	CancellationTokenSource,
	LanguageModelTextPart,
	LanguageModelThinkingPart,
	LanguageModelDataPart,
	LanguageModelToolCallPart,
	LanguageModelToolResultPart,
	LanguageModelToolResult,
	LanguageModelChatMessage,
	LanguageModelChatMessageRole,
	LanguageModelChatToolMode,
	__state: state,
	__reset: resetState,
	__setConfiguration: setConfigurationValue,
	__setQuickPickResult: (value) => {
		state.quickPickResult = value;
	},
	__setInputBoxResult: (value) => {
		state.inputBoxResult = value;
	},
	__setMessageResult: (value) => {
		state.messageResult = value;
	},
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') {
		return vscodeStub;
	}
	return originalLoad.call(this, request, parent, isMain);
};

globalThis.__vscodeStub = vscodeStub;

module.exports = vscodeStub;
