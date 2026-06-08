import vscode from 'vscode';
import { AuthManager } from '../auth';
import { LlmClient } from '../client';
import { getApiModelId, getBaseUrl, getMaxRetries, getMaxTokens } from '../config';
import { MODELS, PROVIDERS, getModelProvider } from '../consts';
import { t } from '../i18n';
import type { LlmRequest } from '../types';
import { convertMessages, countMessageChars } from './convert';
import {
	dumpLlmRequest,
	type CacheDiagnosticsRecorder,
	type CacheDiagnosticsRun,
} from './debug';
import { getConfiguredThinkingEffort, type ModelConfigurationOptions } from './models';
import { classifyLlmRequest, shouldForceThinkingNone, type RequestKind } from './routing';
import type { ReplayMarkerMetadata } from './replay';
import type { ConversationSegment } from './segment';
import { buildThinkingFields } from './thinking';
import { collectTrailingToolResultIds, prepareRequestTools } from './tools/request';
import { resolveImageMessages, type VisionDescriber } from './vision';

export interface PreparedChatRequest {
	client: LlmClient;
	request: LlmRequest;
	isThinkingModel: boolean;
	totalRequestChars: number;
	trailingToolResultIds: string[];
	cacheDiagnostics: CacheDiagnosticsRun;
	requestKind: RequestKind;
	segment: ConversationSegment;
	replayMarkerMetadata: ReplayMarkerMetadata;
	visionMarkerTextChars?: number;
	initialResponseNotice?: string;
}

export interface PrepareChatRequestOptions {
	authManager: AuthManager;
	globalStorageUri: vscode.Uri;
	modelInfo: vscode.LanguageModelChatInformation;
	segment: ConversationSegment;
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	options: vscode.ProvideLanguageModelChatResponseOptions;
	token: vscode.CancellationToken;
	cacheDiagnostics: CacheDiagnosticsRecorder;
	getVisionDescriber: () => Promise<VisionDescriber | undefined>;
}

export async function prepareChatRequest({
	authManager,
	globalStorageUri,
	modelInfo,
	segment,
	messages,
	options,
	token,
	cacheDiagnostics,
	getVisionDescriber,
}: PrepareChatRequestOptions): Promise<PreparedChatRequest> {
	const modelDef = MODELS.find((m) => m.id === modelInfo.id);
	const provider = modelDef ? getModelProvider(modelDef) : PROVIDERS.qwen;

	const apiKey = await authManager.getApiKey(provider);
	if (!apiKey) {
		throw new Error(t('auth.notConfigured'));
	}

	const client = new LlmClient(getBaseUrl(provider), apiKey, {
		providerId: provider.id,
		maxRetries: getMaxRetries(),
	});
	const isThinkingModel = modelDef?.capabilities.thinking ?? false;
	// Native vision: when the selected model accepts images, send them directly
	// as image_url parts instead of resolving them to text via the proxy.
	const isVisionModel = modelDef?.capabilities.imageInput ?? false;
	const maxTokens = getMaxTokens();

	const visionResolution = await resolveImageMessages(messages, token, getVisionDescriber, {
		nativeVision: isVisionModel,
	});
	const resolvedMessages = visionResolution.messages;
	const qwenMessages = convertMessages(resolvedMessages, isThinkingModel, isVisionModel);
	const tools = prepareRequestTools(modelDef?.capabilities.toolCalling, options);

	const totalRequestChars = countMessageChars(qwenMessages);
	const baseRequest: LlmRequest = {
		model: getApiModelId(provider, modelInfo.id),
		messages: qwenMessages,
		stream: true,
		tools,
		tool_choice: tools && tools.length > 0 ? ('auto' as const) : undefined,
		max_tokens: maxTokens,
	};
	const requestKind = classifyLlmRequest({
		request: baseRequest,
		inputMessages: messages,
	});
	const configuredThinkingEffort = getConfiguredThinkingEffort(
		options as ModelConfigurationOptions,
	);
	const thinkingEffort = shouldForceThinkingNone(requestKind) ? 'none' : configuredThinkingEffort;
	// Thinking control differs per provider (see buildThinkingFields). Streamed
	// reasoning arrives in `delta.reasoning_content` regardless of provider.
	const request: LlmRequest = {
		...baseRequest,
		...(isThinkingModel
			? buildThinkingFields(provider.thinkingStyle, thinkingEffort)
			: {}),
	};
	dumpLlmRequest(request, {
		globalStorageUri,
		segment,
		requestKind,
		vscodeModelId: modelInfo.id,
		isThinkingModel,
		thinkingEffort,
		maxTokens,
		inputMessages: messages,
		resolvedMessages,
		requestOptions: options,
		visionModelId: visionResolution.visionModelId,
		visionProxySource: visionResolution.visionProxySource,
		visionStats: visionResolution.stats,
	});

	const diagnosticsRun = cacheDiagnostics.beginRequest({
		request,
		segment,
		requestKind,
		vscodeModelId: modelInfo.id,
		isThinkingModel,
		thinkingEffort,
		maxTokens,
		inputMessages: messages,
		resolvedMessages,
		visionModelId: visionResolution.visionModelId,
		visionProxySource: visionResolution.visionProxySource,
		visionStats: visionResolution.stats,
	});

	return {
		client,
		request,
		isThinkingModel,
		totalRequestChars,
		trailingToolResultIds: collectTrailingToolResultIds(qwenMessages),
		cacheDiagnostics: diagnosticsRun,
		requestKind,
		segment,
		replayMarkerMetadata: visionResolution.replayMarkerMetadata,
		visionMarkerTextChars: visionResolution.stats.markerVisionTextChars || undefined,
		initialResponseNotice: visionResolution.initialResponseNotice,
	};
}
