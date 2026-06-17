import vscode from 'vscode';
import { t } from '../../i18n';
import type { LlmMessage, LlmTool } from '../../types';
import { convertTools } from '../convert';
import { LLM_TOOLS_LIMIT } from './consts';

export function prepareRequestTools(
	toolCallingCapability: boolean | number | undefined,
	options: vscode.ProvideLanguageModelChatResponseOptions,
	sortForCache = false,
): LlmTool[] | undefined {
	const tools = toolCallingCapability ? convertTools(options.tools) : undefined;
	const toolLimit = getToolCallingLimit(toolCallingCapability);
	const toolsCount = tools?.length ?? 0;
	if (toolsCount > toolLimit) {
		throw new Error(t('request.toolsLimitExceeded', toolLimit, toolsCount));
	}
	return sortForCache && tools ? sortToolsByName(tools) : tools;
}

/**
 * Stable alphabetical sort by tool name. Keeps the request `tools` prefix
 * byte-stable when the host reorders the enabled tools between turns, so the
 * provider's context cache is not invalidated by ordering alone.
 */
function sortToolsByName(tools: LlmTool[]): LlmTool[] {
	return [...tools].sort((a, b) => {
		if (a.function.name < b.function.name) return -1;
		if (a.function.name > b.function.name) return 1;
		return 0;
	});
}

export function collectTrailingToolResultIds(messages: readonly LlmMessage[]): string[] {
	const trailingToolResultIds: string[] = [];
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role !== 'tool' || !message.tool_call_id) {
			break;
		}
		trailingToolResultIds.push(message.tool_call_id);
	}
	return trailingToolResultIds.reverse();
}

function getToolCallingLimit(toolCallingCapability: boolean | number | undefined): number {
	return typeof toolCallingCapability === 'number' ? toolCallingCapability : LLM_TOOLS_LIMIT;
}
