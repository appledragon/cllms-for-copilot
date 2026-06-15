import { appendFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import vscode from 'vscode';
import { getRequestDumpEnabled } from '../../config';
import { safeStringify } from '../../json';
import { logger } from '../../logger';
import type { LlmRequest } from '../../types';
import { llmContentToText } from '../convert';
import {
	classifyLlmRequestDetailed,
	classifyProviderRequestDetailed,
	formatModelFields,
	formatRequestLogLine,
	type RequestKind,
} from '../routing';
import type { ConversationSegment } from '../segment';
import type { VisionProxySource, VisionResolutionStats } from '../vision';
import {
	formatActivateToolNames,
	formatDumpSegment,
	formatFileUri,
	formatHostSettingsSummary,
	formatSystemPromptSummary,
} from './dump-format';
import {
	serializeMessage,
	serializeTools,
	summarizeMessagesFromInput,
	summarizeSerializedMessages,
} from './dump-serialize';
import {
	summarizeHostSettings,
	summarizeLlmSystemPrompt,
	summarizeRequestOptions,
	summarizeTools,
	summarizeVscodeSystemPrompt,
	type SystemPromptSummary,
	type ToolSummary,
} from './dump-summarize';
import { sanitizeJsonValue, writeJsonFile, writeTextFile } from './dump-utils';

let dumpCounter = 0;
let providerInputDumpCounter = 0;
let dumpWriteQueue: Promise<void> = Promise.resolve();

const REQUEST_OBSERVATIONS_FILE = '_request-observations.jsonl';

type DumpEvent = 'provider-input' | 'qwen-request';
type DumpStage = 'provider-input' | 'input' | 'resolved';

interface DumpContext {
	root: string;
	timestamp: string;
	basename: string;
	requestKind: RequestKind;
	/** Privacy-safe explanation of why the request was classified as requestKind. */
	requestKindReason: string;
}

interface ProviderInputDumpPaths {
	directory: string;
	providerInput: string;
}

interface RequestDumpPaths {
	directory: string;
	input: string;
	resolved: string;
	request: string;
	msg0?: string;
}

export interface DumpLlmRequestOptions {
	globalStorageUri: vscode.Uri;
	segment: ConversationSegment;
	requestKind?: RequestKind;
	vscodeModelId: string;
	isThinkingModel: boolean;
	thinkingEffort: string;
	maxTokens: number | undefined;
	inputMessages: readonly vscode.LanguageModelChatRequestMessage[];
	resolvedMessages: readonly vscode.LanguageModelChatRequestMessage[];
	requestOptions: vscode.ProvideLanguageModelChatResponseOptions;
	visionModelId?: string;
	visionProxySource?: VisionProxySource;
	visionStats?: VisionResolutionStats;
}

export interface DumpProviderInputOptions {
	globalStorageUri: vscode.Uri;
	segment: ConversationSegment;
	requestKind?: RequestKind;
	modelInfo: vscode.LanguageModelChatInformation;
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	requestOptions: vscode.ProvideLanguageModelChatResponseOptions;
}

/**
 * Dump the raw LanguageModelChatProvider input before any request preparation.
 * This captures the first observable `options.tools` list, including any
 * `activate_*` virtual tools, even if the provider later short-circuits.
 */
export function dumpProviderInput(options: DumpProviderInputOptions): void {
	if (!getRequestDumpEnabled()) return;

	const classification = classifyProviderRequestDetailed({
		messages: options.messages,
		tools: options.requestOptions.tools,
	});
	const requestKind = options.requestKind ?? classification.kind;
	const context = createDumpContext(
		options.globalStorageUri,
		options.segment,
		'qwen-provider-input',
		(providerInputDumpCounter += 1),
		requestKind,
		classification.reason,
	);
	const paths = createProviderInputDumpPaths(context);
	const toolSummary = summarizeTools(options.requestOptions.tools);

	enqueueDumpWrite(formatRequestLogLine(requestKind, 'providerInputDump'), async () => {
		await mkdir(context.root, { recursive: true });
		await writeJsonFile(paths.providerInput, createProviderInputSnapshot(options, context));

		await writeDumpObservation(
			options.globalStorageUri,
			createDumpObservation({
				event: 'provider-input',
				context,
				segment: options.segment,
				paths,
				model: {
					vscodeModelId: options.modelInfo.id,
				},
				requestKind,
				requestKindReason: context.requestKindReason,
				requestOptions: options.requestOptions,
				messages: options.messages,
				toolSummary,
			}),
		);
		logProviderInputDump(options, paths, toolSummary, requestKind, context.requestKindReason);
	});
}

/**
 * Dump the FULL request payload (messages + tools) to disk verbatim
 * when debugMode is `verbose`. No truncation, no hashing - you get the
 * exact JSON that will be sent to the API (minus the auth header).
 *
 * Files land under `<dump root>/<conversationSegmentId>/` so marker replay and
 * cache-lineage changes are easy to inspect across provider calls:
 *   qwen-request-<timestamp>-NNNN.input.json     — VS Code input snapshot
 *   qwen-request-<timestamp>-NNNN.resolved.json  — post-vision VS Code snapshot
 *   qwen-request-<timestamp>-NNNN.json           — full request body
 *   qwen-request-<timestamp>-NNNN.msg0.txt       — messages[0] content (system prompt)
 */
export function dumpLlmRequest(
	request: LlmRequest,
	options: DumpLlmRequestOptions,
): void {
	if (!getRequestDumpEnabled()) return;

	const classification = classifyLlmRequestDetailed({
		request,
		inputMessages: options.inputMessages,
	});
	const requestKind = options.requestKind ?? classification.kind;
	const context = createDumpContext(
		options.globalStorageUri,
		options.segment,
		'qwen-request',
		(dumpCounter += 1),
		requestKind,
		classification.reason,
	);
	const msg0 = request.messages[0];
	const paths = createRequestDumpPaths(context, Boolean(msg0));
	const toolSummary = summarizeTools(options.requestOptions.tools);

	enqueueDumpWrite(formatRequestLogLine(requestKind, 'requestDump'), async () => {
		await mkdir(context.root, { recursive: true });
		await writeJsonFile(
			paths.input,
			createPipelineSnapshot('input', request, options.inputMessages, options, context),
		);
		await writeJsonFile(
			paths.resolved,
			createPipelineSnapshot('resolved', request, options.resolvedMessages, options, context),
		);

		const requestJson = await writeJsonFile(paths.request, request, (value) =>
			JSON.stringify(value, null, 2),
		);

		if (msg0 && paths.msg0) {
			await writeTextFile(paths.msg0, llmContentToText(msg0.content));
		}

		await writeDumpObservation(
			options.globalStorageUri,
			createDumpObservation({
				event: 'qwen-request',
				context,
				segment: options.segment,
				paths,
				model: {
					vscodeModelId: options.vscodeModelId,
					apiModelId: request.model === options.vscodeModelId ? undefined : request.model,
				},
				requestKind,
				requestKindReason: context.requestKindReason,
				requestOptions: options.requestOptions,
				messages: options.inputMessages,
				toolSummary,
			}),
		);
		logRequestDump(request, options, paths, requestJson.length, requestKind, context.requestKindReason);
	});
}

export async function ensureRequestDumpRoot(globalStorageUri: vscode.Uri): Promise<vscode.Uri> {
	const root = getRequestDumpBaseRootUri(globalStorageUri);
	await mkdir(root.fsPath, { recursive: true });
	return root;
}

function createDumpContext(
	globalStorageUri: vscode.Uri,
	segment: ConversationSegment,
	prefix: string,
	seq: number,
	requestKind: RequestKind,
	requestKindReason: string,
): DumpContext {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	return {
		root: getRequestDumpRoot(globalStorageUri, segment),
		timestamp,
		basename: `${prefix}-${timestamp}-${String(seq).padStart(4, '0')}`,
		requestKind,
		requestKindReason,
	};
}

function createProviderInputDumpPaths(context: DumpContext): ProviderInputDumpPaths {
	return {
		directory: context.root,
		providerInput: join(context.root, `${context.basename}.json`),
	};
}

function createRequestDumpPaths(context: DumpContext, hasMsg0: boolean): RequestDumpPaths {
	return {
		directory: context.root,
		input: join(context.root, `${context.basename}.input.json`),
		resolved: join(context.root, `${context.basename}.resolved.json`),
		request: join(context.root, `${context.basename}.json`),
		msg0: hasMsg0 ? join(context.root, `${context.basename}.msg0.txt`) : undefined,
	};
}

function createDumpObservation(options: {
	event: DumpEvent;
	context: DumpContext;
	segment: ConversationSegment;
	paths: ProviderInputDumpPaths | RequestDumpPaths;
	model: object;
	requestKind: RequestKind;
	requestKindReason: string;
	requestOptions: vscode.ProvideLanguageModelChatResponseOptions;
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	toolSummary: ToolSummary;
}): object {
	return {
		event: options.event,
		timestamp: options.context.timestamp,
		basename: options.context.basename,
		segment: options.segment,
		paths: options.paths,
		model: options.model,
		requestKind: options.requestKind,
		requestKindReason: options.requestKindReason,
		options: summarizeRequestOptions(options.requestOptions),
		hostSettings: summarizeHostSettings(),
		systemPromptSummary: summarizeVscodeSystemPrompt(options.messages),
		messageStats: summarizeMessagesFromInput(options.messages),
		toolStats: options.toolSummary,
	};
}

function createProviderInputSnapshot(
	options: DumpProviderInputOptions,
	context: DumpContext,
): object {
	return createDumpSnapshot({
		stage: 'provider-input',
		context,
		segment: options.segment,
		requestKind: context.requestKind,
		model: {
			vscodeModelId: options.modelInfo.id,
			name: options.modelInfo.name,
			family: options.modelInfo.family,
			version: options.modelInfo.version,
			maxInputTokens: options.modelInfo.maxInputTokens,
			maxOutputTokens: options.modelInfo.maxOutputTokens,
			capabilities: sanitizeJsonValue(options.modelInfo.capabilities),
		},
		messages: options.messages,
		requestOptions: options.requestOptions,
	});
}

function createPipelineSnapshot(
	stage: 'input' | 'resolved',
	request: LlmRequest,
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	options: DumpLlmRequestOptions,
	context: DumpContext,
): object {
	return createDumpSnapshot({
		stage,
		context,
		segment: options.segment,
		requestKind: context.requestKind,
		model: {
			vscodeModelId: options.vscodeModelId,
			apiModelId: request.model === options.vscodeModelId ? undefined : request.model,
			isThinkingModel: options.isThinkingModel,
			thinkingEffort: options.thinkingEffort,
			maxTokens: options.maxTokens ?? null,
		},
		vision:
			stage === 'resolved'
				? {
						modelId: options.visionModelId ?? null,
						source: options.visionProxySource ?? null,
						stats: options.visionStats ?? null,
					}
				: undefined,
		deepSeekPromptSummary: summarizeLlmSystemPrompt(request.messages),
		messages,
		requestOptions: options.requestOptions,
	});
}

function createDumpSnapshot(options: {
	stage: DumpStage;
	context: DumpContext;
	segment: ConversationSegment;
	requestKind: RequestKind;
	model: object;
	vision?: object;
	deepSeekPromptSummary?: SystemPromptSummary;
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	requestOptions: vscode.ProvideLanguageModelChatResponseOptions;
}): object {
	const serializedMessages = options.messages.map((message, index) =>
		serializeMessage(message, index),
	);
	return {
		stage: options.stage,
		timestamp: options.context.timestamp,
		basename: options.context.basename,
		segment: options.segment,
		requestKind: options.requestKind,
		requestKindReason: options.context.requestKindReason,
		model: options.model,
		options: summarizeRequestOptions(options.requestOptions),
		hostSettings: summarizeHostSettings(),
		vision: options.vision,
		systemPromptSummary: summarizeVscodeSystemPrompt(options.messages),
		deepSeekPromptSummary: options.deepSeekPromptSummary,
		messageStats: summarizeSerializedMessages(serializedMessages),
		messages: serializedMessages,
		toolStats: summarizeTools(options.requestOptions.tools),
		tools: serializeTools(options.requestOptions.tools),
	};
}

async function writeDumpObservation(
	globalStorageUri: vscode.Uri,
	observation: object,
): Promise<void> {
	const baseRoot = getRequestDumpBaseRoot(globalStorageUri);
	await mkdir(baseRoot, { recursive: true });
	await appendFile(
		join(baseRoot, REQUEST_OBSERVATIONS_FILE),
		`${safeStringify(observation)}\n`,
		'utf-8',
	);
}

function enqueueDumpWrite(label: string, write: () => Promise<void>): void {
	dumpWriteQueue = dumpWriteQueue.then(write, write).catch((err) => {
		logger.warn(`${label} write failed`, err);
	});
}

function logProviderInputDump(
	options: DumpProviderInputOptions,
	paths: ProviderInputDumpPaths,
	toolSummary: ToolSummary,
	requestKind: RequestKind,
	requestKindReason: string,
): void {
	const systemPromptSummary = summarizeVscodeSystemPrompt(options.messages);
	logger.debug(
		formatRequestLogLine(
			requestKind,
			`providerInputDump written: classifyReason=${requestKindReason} ${formatDumpSegment(options.segment)}` +
				` ${formatModelFields(options.modelInfo.id)}` +
				` input=${formatFileUri(paths.providerInput)} ` +
				`(${options.messages.length} msgs, ${toolSummary.toolCount} tools, ` +
				`activateTools=${toolSummary.activateToolCount}${formatActivateToolNames(
					toolSummary.activateToolNames,
				)}) ` +
				formatHostSettingsSummary(summarizeHostSettings()) +
				` ${formatSystemPromptSummary(systemPromptSummary)}`,
		),
	);
}

function logRequestDump(
	request: LlmRequest,
	options: DumpLlmRequestOptions,
	paths: RequestDumpPaths,
	requestJsonLength: number,
	requestKind: RequestKind,
	requestKindReason: string,
): void {
	const systemPromptSummary = summarizeLlmSystemPrompt(request.messages);
	logger.debug(
		formatRequestLogLine(
			requestKind,
			`requestDump written: classifyReason=${requestKindReason} ${formatDumpSegment(options.segment)}` +
				` ${formatModelFields(options.vscodeModelId, request.model)}` +
				` request=${formatFileUri(paths.request)} ` +
				`input=${formatFileUri(paths.input)} resolved=${formatFileUri(paths.resolved)} ` +
				`(${request.messages.length} msgs, ${request.tools?.length ?? 0} tools, ` +
				`~${(requestJsonLength / 1024).toFixed(0)} KB) ` +
				formatHostSettingsSummary(summarizeHostSettings()) +
				` ${formatSystemPromptSummary(systemPromptSummary)}`,
		),
	);
}

function getRequestDumpRoot(globalStorageUri: vscode.Uri, segment?: ConversationSegment): string {
	const baseRoot = getRequestDumpBaseRoot(globalStorageUri);
	return segment ? join(baseRoot, segment.segmentId) : baseRoot;
}

function getRequestDumpBaseRoot(globalStorageUri: vscode.Uri): string {
	return getRequestDumpBaseRootUri(globalStorageUri).fsPath;
}

function getRequestDumpBaseRootUri(globalStorageUri: vscode.Uri): vscode.Uri {
	if (globalStorageUri.fsPath) {
		return vscode.Uri.joinPath(globalStorageUri, 'request-dumps');
	}

	return vscode.Uri.file(join(tmpdir(), 'qwen-request-dumps'));
}
