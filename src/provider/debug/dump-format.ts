import vscode from 'vscode';
import { safeStringify } from '../../json';
import type { ConversationSegment } from '../segment';
import type { HostSettingsSummary, SystemPromptSummary } from './dump-summarize';

export function formatFileUri(fsPath: string): string {
	return vscode.Uri.file(fsPath).toString();
}

export function formatActivateToolNames(toolNames: readonly string[]): string {
	if (toolNames.length === 0) {
		return '';
	}
	const shown = toolNames.slice(0, 5).join(',');
	const suffix = toolNames.length > 5 ? `,+${toolNames.length - 5}` : '';
	return ` names=${shown}${suffix}`;
}

export function formatDumpSegment(segment: ConversationSegment): string {
	if (segment.reason === 'markerFound') {
		return `dumpSegment=${segment.segmentId} legacySegmentMarker=found`;
	}
	if (segment.reason === 'markerInvalid') {
		const markerLocation =
			segment.markerMessageIndex === undefined || segment.markerPartIndex === undefined
				? ''
				: ` at=message#${segment.markerMessageIndex}:part#${segment.markerPartIndex}`;
		const markerError = segment.markerError ? ` error=${segment.markerError}` : '';
		return `dumpSegment=${segment.segmentId} legacySegmentMarker=invalid${markerLocation}${markerError}`;
	}
	return `dumpSegment=${segment.segmentId}`;
}

export function formatHostSettingsSummary(settings: HostSettingsSummary): string {
	return (
		`hostFreezeCustomizationsIndex=${settings.copilotFreezeCustomizationsIndex}` +
		` chatUtilityModel=${formatSettingValue(settings.chatUtilityModel)}` +
		` chatUtilitySmallModel=${formatSettingValue(settings.chatUtilitySmallModel)}` +
		` chatPlanAgentDefaultModel=${formatSettingValue(settings.chatPlanAgentDefaultModel)}` +
		` chatExploreAgentDefaultModel=${formatSettingValue(settings.chatExploreAgentDefaultModel)}` +
		` copilotAskAgentModel=${formatSettingValue(settings.copilotAskAgentModel)}` +
		` copilotImplementAgentModel=${formatSettingValue(settings.copilotImplementAgentModel)}` +
		` copilotExploreAgentModel=${formatSettingValue(settings.copilotExploreAgentModel)}`
	);
}

function formatSettingValue(value: string | 'unknown'): string {
	if (value === '') return 'empty';
	if (value === 'unknown') return 'unknown';
	return safeStringify(value);
}

export function formatSystemPromptSummary(summary: SystemPromptSummary): string {
	if (summary.messageIndex === null) {
		return 'systemPrompt=none';
	}

	return (
		`systemPrompt#${summary.messageIndex}:${summary.role}` +
		`:chars=${summary.chars}` +
		`:lines=${summary.lines}` +
		`:hash=${formatShortHash(summary.hash)}` +
		`:skills=${formatBoolean(summary.hasSkillsTag)}(${summary.skillTagCount})` +
		`:agents=${formatBoolean(summary.hasAgentsTag)}(${summary.agentTagCount})` +
		`:customizationsUpdate=${summary.customizationsUpdateCountInHistory}` +
		`:latestUser#${summary.latestUserMessageIndex ?? 'none'}=` +
		formatBoolean(summary.latestUserHasCustomizationsUpdate)
	);
}

function formatShortHash(value: string | null): string {
	return value ? value.slice(0, 12) : 'none';
}

function formatBoolean(value: boolean): 'yes' | 'no' {
	return value ? 'yes' : 'no';
}
