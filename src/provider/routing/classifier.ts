import vscode from 'vscode';
import type { LlmRequest, LlmTool } from '../../types';
import { llmContentToText } from '../convert';

export type RequestKind =
	| 'main-agent'
	| 'terminal-steering'
	| 'todo-tracker'
	| 'settings-resolver'
	| 'prompt-categorizer'
	| 'chat-title'
	| 'inline-progress-message'
	| 'git-branch-name'
	| 'git-commit-message'
	| 'rename-suggestions'
	| 'background'
	| 'unknown';

// ---- Classification rule table ----
//
// This ordered table is the single source of truth for request classification.
// To support a new request kind, add it to the RequestKind union above and add
// one entry here — no other classifier code needs to change.
//
//  - `source`  records which VS Code / Copilot feature emits the signature, so a
//              future prompt change can be traced back to (and fixed in) one place.
//  - `purpose` records why the kind matters — chiefly whether it suppresses
//              thinking for lightweight background work.
//  - `match`   inspects the normalized inputs and returns a short, privacy-safe
//              reason string (never user content) when it applies, else undefined.

/** System-prompt prefixes Copilot/VS Code use for their built-in auxiliary requests. */
const TODO_TRACKER_PREFIX = 'You are a background task tracker';
const PROMPT_CATEGORIZER_PREFIX = 'You are an expert classifier for AI coding assistant prompts';
const SETTINGS_RESOLVER_PREFIX =
	'You are a Visual Studio Code assistant. Your job is to assist users in using Visual Studio Code by returning settings';
const CHAT_TITLE_PREFIXES = [
	'You are an expert in crafting ultra-compact titles',
	'You are an expert in crafting pithy titles',
] as const;
const INLINE_PROGRESS_MESSAGE_PREFIX =
	'You are an expert in writing short, catchy, and encouraging progress messages';
const GIT_BRANCH_NAME_PREFIX = 'You are an expert in crafting pithy branch names';
const GIT_COMMIT_MESSAGE_PREFIX =
	'You are an AI programming assistant, helping a software developer to come with the best git commit message';
const RENAME_SUGGESTIONS_PREFIX = 'You are a distinguished software engineer';
const MAIN_AGENT_PREFIX = 'You are an expert AI programming assistant';
const TERMINAL_NOTIFICATION_PATTERN = /^\[Terminal\s+\S+\s+notification:/;

/** Normalized signals a classification rule is matched against. */
interface ClassifierInput {
	firstText: string;
	latestUserText: string;
	toolNames: readonly string[];
}

interface ClassificationRule {
	readonly kind: RequestKind;
	/** Which VS Code / Copilot feature emits this signature. */
	readonly source: string;
	/** Why we classify it this way (and what behavior it drives). */
	readonly purpose: string;
	/** Returns a short match reason when the rule applies, else undefined. */
	readonly match: (input: ClassifierInput) => string | undefined;
}

/** Outcome of classification: the kind plus why it was chosen (for diagnostics). */
export interface RequestClassification {
	readonly kind: RequestKind;
	/** Short, privacy-safe explanation of which signal matched. */
	readonly reason: string;
	/** Provenance annotation of the matched rule, when one matched. */
	readonly source?: string;
}

/**
 * Ordered classification rules. The first rule whose `match` returns a reason
 * wins, so specific signatures must precede the broad fallbacks at the end.
 */
const CLASSIFICATION_RULES: readonly ClassificationRule[] = [
	{
		kind: 'terminal-steering',
		source: 'VS Code terminal auto-reply injected as the latest user turn after a command finishes',
		purpose: 'Real follow-up work — keep thinking enabled.',
		match: ({ latestUserText }) =>
			TERMINAL_NOTIFICATION_PATTERN.test(latestUserText)
				? 'latestUser:terminal-notification'
				: undefined,
	},
	{
		kind: 'todo-tracker',
		source: 'Copilot background todo tracker (manage_todo_list tool / "background task tracker" prompt)',
		purpose: 'Lightweight bookkeeping — force thinking off to save latency and cost.',
		match: ({ toolNames, firstText }) => {
			if (isOnlyTool(toolNames, 'manage_todo_list')) return 'tool:manage_todo_list';
			if (firstText.startsWith(TODO_TRACKER_PREFIX)) return 'systemPrompt:todo-tracker';
			return undefined;
		},
	},
	{
		kind: 'prompt-categorizer',
		source: 'Copilot prompt categorizer (categorize_prompt tool / "expert classifier" prompt)',
		purpose: 'Lightweight classification — force thinking off.',
		match: ({ toolNames, firstText }) => {
			if (isOnlyTool(toolNames, 'categorize_prompt')) return 'tool:categorize_prompt';
			if (firstText.startsWith(PROMPT_CATEGORIZER_PREFIX)) return 'systemPrompt:prompt-categorizer';
			return undefined;
		},
	},
	{
		kind: 'settings-resolver',
		source: 'VS Code settings assistant ("returning settings" prompt)',
		purpose: 'Lightweight settings lookup — force thinking off.',
		match: ({ firstText }) =>
			firstText.startsWith(SETTINGS_RESOLVER_PREFIX) ? 'systemPrompt:settings-resolver' : undefined,
	},
	{
		kind: 'chat-title',
		source: 'Copilot chat title generator ("ultra-compact / pithy titles" prompts)',
		purpose: 'One-shot title — force thinking off.',
		match: ({ firstText }) =>
			startsWithAny(firstText, CHAT_TITLE_PREFIXES) ? 'systemPrompt:chat-title' : undefined,
	},
	{
		kind: 'inline-progress-message',
		source: 'Copilot inline progress message generator',
		purpose: 'One-shot status line — force thinking off.',
		match: ({ firstText }) =>
			firstText.startsWith(INLINE_PROGRESS_MESSAGE_PREFIX)
				? 'systemPrompt:inline-progress-message'
				: undefined,
	},
	{
		kind: 'git-branch-name',
		source: 'Copilot git branch name generator',
		purpose: 'One-shot suggestion — force thinking off.',
		match: ({ firstText }) =>
			firstText.startsWith(GIT_BRANCH_NAME_PREFIX) ? 'systemPrompt:git-branch-name' : undefined,
	},
	{
		kind: 'git-commit-message',
		source: 'Copilot git commit message generator',
		purpose: 'One-shot suggestion — force thinking off.',
		match: ({ firstText }) =>
			firstText.startsWith(GIT_COMMIT_MESSAGE_PREFIX) ? 'systemPrompt:git-commit-message' : undefined,
	},
	{
		kind: 'rename-suggestions',
		source: 'Copilot symbol rename suggester ("distinguished software engineer" prompt)',
		purpose: 'One-shot suggestion — force thinking off.',
		match: ({ firstText }) =>
			firstText.startsWith(RENAME_SUGGESTIONS_PREFIX) ? 'systemPrompt:rename-suggestions' : undefined,
	},
	{
		kind: 'main-agent',
		source: 'Primary Copilot agent loop (main system prompt, or <skills>/<agents> sections)',
		purpose: 'User-facing agent turn — keep thinking enabled.',
		match: ({ firstText }) => {
			if (firstText.startsWith(MAIN_AGENT_PREFIX)) return 'systemPrompt:main-agent';
			if (firstText.includes('<skills>')) return 'systemPrompt:skills-tag';
			if (firstText.includes('<agents>')) return 'systemPrompt:agents-tag';
			return undefined;
		},
	},
	{
		kind: 'background',
		source: 'Fallback: unrecognized request that still carries tools or a non-empty system prompt',
		purpose: 'Unknown auxiliary work — keep thinking enabled so a real agent turn is never throttled.',
		match: ({ toolNames, firstText }) => {
			if (toolNames.length > 0) return 'fallback:has-tools';
			if (firstText.length > 0) return 'fallback:non-empty-prompt';
			return undefined;
		},
	},
];

/** Returned when no rule matches (e.g. a fully empty request). */
const UNKNOWN_CLASSIFICATION: RequestClassification = {
	kind: 'unknown',
	reason: 'fallback:empty-request',
};

/**
 * RequestKinds whose work is lightweight enough to run without thinking. Kept as
 * an explicit set (rather than derived from the table) so the safety-critical
 * "force thinking off" decision stays obvious and easy to audit.
 */
const REQUEST_KINDS_WITH_FORCED_NONE_THINKING = new Set<RequestKind>([
	'todo-tracker',
	'prompt-categorizer',
	'settings-resolver',
	'chat-title',
	'inline-progress-message',
	'git-branch-name',
	'git-commit-message',
	'rename-suggestions',
]);

export function formatModelFields(vscodeModelId: string, apiModelId?: string): string {
	const apiField = apiModelId && apiModelId !== vscodeModelId ? ` apiModel=${apiModelId}` : '';
	return `model=${vscodeModelId}${apiField}`;
}

export function formatRequestLogLine(requestKind: RequestKind, message: string): string {
	return `[${requestKind}] ${message}`;
}

export function shouldForceThinkingNone(requestKind: RequestKind): boolean {
	return REQUEST_KINDS_WITH_FORCED_NONE_THINKING.has(requestKind);
}

export function classifyProviderRequest(input: {
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	tools?: readonly vscode.LanguageModelChatTool[];
}): RequestKind {
	return classifyProviderRequestDetailed(input).kind;
}

/** Like {@link classifyProviderRequest} but also returns the match reason. */
export function classifyProviderRequestDetailed(input: {
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	tools?: readonly vscode.LanguageModelChatTool[];
}): RequestClassification {
	return classifyRequest({
		firstText: getFirstVscodeText(input.messages),
		latestUserText: getLatestVscodeUserText(input.messages),
		toolNames: input.tools?.map((tool) => tool.name) ?? [],
	});
}

export function classifyLlmRequest(input: {
	request: LlmRequest;
	inputMessages?: readonly vscode.LanguageModelChatRequestMessage[];
}): RequestKind {
	return classifyLlmRequestDetailed(input).kind;
}

/** Like {@link classifyLlmRequest} but also returns the match reason. */
export function classifyLlmRequestDetailed(input: {
	request: LlmRequest;
	inputMessages?: readonly vscode.LanguageModelChatRequestMessage[];
}): RequestClassification {
	return classifyRequest({
		firstText:
			(input.request.messages[0] ? llmContentToText(input.request.messages[0].content) : undefined) ??
			(input.inputMessages ? getFirstVscodeText(input.inputMessages) : ''),
		latestUserText:
			(input.inputMessages ? getLatestVscodeUserText(input.inputMessages) : '') ||
			getLatestLlmUserText(input.request),
		toolNames: input.request.tools?.map(getLlmToolName) ?? [],
	});
}

function classifyRequest(input: ClassifierInput): RequestClassification {
	const normalized: ClassifierInput = {
		firstText: input.firstText.trimStart(),
		latestUserText: input.latestUserText.trimStart(),
		toolNames: input.toolNames,
	};
	for (const rule of CLASSIFICATION_RULES) {
		const reason = rule.match(normalized);
		if (reason !== undefined) {
			return { kind: rule.kind, reason, source: rule.source };
		}
	}
	return UNKNOWN_CLASSIFICATION;
}

function isOnlyTool(toolNames: readonly string[], toolName: string): boolean {
	return toolNames.length === 1 && toolNames[0] === toolName;
}

function startsWithAny(text: string, prefixes: readonly string[]): boolean {
	return prefixes.some((prefix) => text.startsWith(prefix));
}

function getLlmToolName(tool: LlmTool): string {
	return tool.function.name;
}

function getFirstVscodeText(messages: readonly vscode.LanguageModelChatRequestMessage[]): string {
	const firstMessage = messages[0];
	if (!firstMessage) {
		return '';
	}

	return getVscodeMessageText(firstMessage);
}

function getLatestVscodeUserText(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role === vscode.LanguageModelChatMessageRole.User) {
			return getVscodeMessageText(message);
		}
	}
	return '';
}

function getVscodeMessageText(message: vscode.LanguageModelChatRequestMessage): string {
	let text = '';
	for (const part of message.content) {
		if (part instanceof vscode.LanguageModelTextPart) {
			text += part.value;
		}
	}
	return text;
}

function getLatestLlmUserText(request: LlmRequest): string {
	for (let index = request.messages.length - 1; index >= 0; index -= 1) {
		const message = request.messages[index];
		if (message.role === 'user') {
			return llmContentToText(message.content);
		}
	}
	return '';
}
