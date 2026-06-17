import vscode from 'vscode';
import type { LlmMessage } from '../../types';
import { llmContentToText } from '../convert';
import { ACTIVATE_TOOL_PREFIX } from '../tools/consts';
import {
	countLines,
	countLiteral,
	formatRole,
	formatToolMode,
	getBooleanSetting,
	getObjectKeys,
	getStringSetting,
	getVscodeMessageText,
	hashString,
	sanitizeJsonValue,
} from './dump-utils';

const HASH_WINDOW_CHARS = 2_048;

export interface ToolSummary {
	toolCount: number;
	toolNames: string[];
	activateToolCount: number;
	activateToolNames: string[];
}

export interface CustomizationsSummary {
	customizationsUpdateCountInHistory: number;
	latestUserMessageIndex: number | null;
	latestUserHasCustomizationsUpdate: boolean;
}

export interface HostSettingsSummary {
	copilotFreezeCustomizationsIndex: boolean | 'unknown';
	chatUtilityModel: string | 'unknown';
	chatUtilitySmallModel: string | 'unknown';
	chatPlanAgentDefaultModel: string | 'unknown';
	chatExploreAgentDefaultModel: string | 'unknown';
	copilotAskAgentModel: string | 'unknown';
	copilotImplementAgentModel: string | 'unknown';
	copilotExploreAgentModel: string | 'unknown';
}

export interface SystemPromptSummary extends CustomizationsSummary {
	messageIndex: number | null;
	role: string | null;
	chars: number;
	lines: number;
	hash: string | null;
	headHash: string | null;
	tailHash: string | null;
	hasInstructionsTag: boolean;
	hasSkillsTag: boolean;
	hasAgentsTag: boolean;
	skillTagCount: number;
	agentTagCount: number;
}

type ProviderRequestOptions = vscode.ProvideLanguageModelChatResponseOptions & {
	readonly requestInitiator?: unknown;
	readonly modelConfiguration?: unknown;
};

export function summarizeVscodeSystemPrompt(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): SystemPromptSummary {
	const message = messages[0];
	const customizations = summarizeVscodeCustomizations(messages);
	if (!message) {
		return createSystemPromptSummary(null, null, '', customizations);
	}

	return createSystemPromptSummary(
		0,
		formatRole(message.role),
		getVscodeMessageText(message),
		customizations,
	);
}

export function summarizeLlmSystemPrompt(messages: readonly LlmMessage[]): SystemPromptSummary {
	const message = messages[0];
	const customizations = summarizeLlmCustomizations(messages);
	if (!message) {
		return createSystemPromptSummary(null, null, '', customizations);
	}

	return createSystemPromptSummary(
		0,
		message.role,
		llmContentToText(message.content),
		customizations,
	);
}

function createSystemPromptSummary(
	messageIndex: number | null,
	role: string | null,
	text: string,
	customizations: CustomizationsSummary,
): SystemPromptSummary {
	return {
		messageIndex,
		role,
		chars: text.length,
		lines: countLines(text),
		hash: messageIndex === null ? null : hashString(text),
		headHash: messageIndex === null ? null : hashString(text.slice(0, HASH_WINDOW_CHARS)),
		tailHash: messageIndex === null ? null : hashString(text.slice(-HASH_WINDOW_CHARS)),
		hasInstructionsTag: text.includes('<instructions>'),
		hasSkillsTag: text.includes('<skills>'),
		hasAgentsTag: text.includes('<agents>'),
		skillTagCount: countLiteral(text, '<skill>'),
		agentTagCount: countLiteral(text, '<agent>'),
		...customizations,
	};
}

function summarizeVscodeCustomizations(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
): CustomizationsSummary {
	let customizationsUpdateCountInHistory = 0;
	let latestUserMessageIndex: number | null = null;
	let latestUserHasCustomizationsUpdate = false;

	for (const [index, message] of messages.entries()) {
		const text = getVscodeMessageText(message);
		customizationsUpdateCountInHistory += countLiteral(text, '<customizationsUpdate>');
		if (message.role === vscode.LanguageModelChatMessageRole.User) {
			latestUserMessageIndex = index;
			latestUserHasCustomizationsUpdate = text.includes('<customizationsUpdate>');
		}
	}

	return {
		customizationsUpdateCountInHistory,
		latestUserMessageIndex,
		latestUserHasCustomizationsUpdate,
	};
}

function summarizeLlmCustomizations(messages: readonly LlmMessage[]): CustomizationsSummary {
	let customizationsUpdateCountInHistory = 0;
	let latestUserMessageIndex: number | null = null;
	let latestUserHasCustomizationsUpdate = false;

	for (const [index, message] of messages.entries()) {
		const text = llmContentToText(message.content);
		customizationsUpdateCountInHistory += countLiteral(text, '<customizationsUpdate>');
		if (message.role === 'user') {
			latestUserMessageIndex = index;
			latestUserHasCustomizationsUpdate = text.includes('<customizationsUpdate>');
		}
	}

	return {
		customizationsUpdateCountInHistory,
		latestUserMessageIndex,
		latestUserHasCustomizationsUpdate,
	};
}

export function summarizeHostSettings(): HostSettingsSummary {
	return {
		copilotFreezeCustomizationsIndex: getBooleanSetting(
			'github.copilot.chat',
			'freezeCustomizationsIndex',
		),
		chatUtilityModel: getStringSetting('chat', 'utilityModel'),
		chatUtilitySmallModel: getStringSetting('chat', 'utilitySmallModel'),
		chatPlanAgentDefaultModel: getStringSetting('chat', 'planAgent.defaultModel'),
		chatExploreAgentDefaultModel: getStringSetting('chat', 'exploreAgent.defaultModel'),
		copilotAskAgentModel: getStringSetting('github.copilot.chat', 'askAgent.model'),
		copilotImplementAgentModel: getStringSetting('github.copilot.chat', 'implementAgent.model'),
		copilotExploreAgentModel: getStringSetting('github.copilot.chat', 'exploreAgent.model'),
	};
}

export function summarizeTools(
	tools: readonly vscode.LanguageModelChatTool[] | undefined,
): ToolSummary {
	const toolNames = getToolNames(tools);
	const activateToolNames = getActivateToolNames(toolNames);
	return {
		toolCount: toolNames.length,
		toolNames,
		activateToolCount: activateToolNames.length,
		activateToolNames,
	};
}

export function summarizeRequestOptions(
	options: vscode.ProvideLanguageModelChatResponseOptions,
): object {
	const providerOptions = options as ProviderRequestOptions;
	const modelOptions = sanitizeJsonValue(options.modelOptions);
	const modelConfiguration = sanitizeJsonValue(providerOptions.modelConfiguration);
	return {
		optionKeys: Object.keys(options).sort(),
		requestInitiator: sanitizeJsonValue(providerOptions.requestInitiator),
		toolMode: formatToolMode(options.toolMode),
		modelOptions,
		modelOptionsKeys: getObjectKeys(modelOptions),
		modelConfiguration,
		modelConfigurationKeys: getObjectKeys(modelConfiguration),
	};
}

function getToolNames(tools: readonly vscode.LanguageModelChatTool[] | undefined): string[] {
	return tools?.map((tool) => tool.name) ?? [];
}

function getActivateToolNames(toolNames: readonly string[]): string[] {
	return toolNames.filter((name) => name.startsWith(ACTIVATE_TOOL_PREFIX));
}
