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

const LanguageModelChatMessageRole = { User: 1, Assistant: 2, System: 3 };
const LanguageModelChatToolMode = { Auto: 1, Required: 2 };

const vscodeStub = {
	env: { language: 'en' },
	workspace: {
		getConfiguration() {
			return { get: () => undefined };
		},
	},
	LanguageModelTextPart,
	LanguageModelThinkingPart,
	LanguageModelDataPart,
	LanguageModelToolCallPart,
	LanguageModelToolResultPart,
	LanguageModelChatMessageRole,
	LanguageModelChatToolMode,
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
