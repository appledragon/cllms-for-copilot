import type vscode from 'vscode';
import type { ReplayMarkerMetadata } from '../replay';

export type AudioProxySource = 'api-endpoint' | 'vscode-lm';
export type AudioProxyProviderFamily = 'openai-compatible';
export type AudioProxyApiType = 'transcriptions' | 'responses';

export interface AudioProxyConfig {
	providerFamily: AudioProxyProviderFamily;
	apiType: AudioProxyApiType;
	url: string;
	modelId: string;
	headers?: Record<string, string>;
	extraBody?: Record<string, unknown>;
	updatedAt: number;
}

export interface AudioPart {
	mimeType: string;
	data: Uint8Array;
}

export interface AudioTranscriptionRequest {
	prompt: string;
	audios: readonly AudioPart[];
	token: vscode.CancellationToken;
}

export interface AudioTranscriber {
	readonly id: string;
	readonly source: AudioProxySource;
	transcribe(request: AudioTranscriptionRequest): Promise<string>;
}

export interface AudioResolutionStats {
	inputAudioParts: number;
	inputAudioMessages: number;
	currentAudioMessages: number;
	generatedAudioMessages: number;
	replayedAudioMessages: number;
	omittedAudioMessages: number;
	unavailableAudioMessages: number;
	failedAudioMessages: number;
	droppedAudioParts: number;
	markerAudioTextChars: number;
	invalidMarkerAudioMetadata: number;
}

export interface AudioResolutionResult {
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	stats: AudioResolutionStats;
	replayMarkerMetadata: ReplayMarkerMetadata;
	audioModelId?: string;
	audioProxySource?: AudioProxySource;
	initialResponseNotice?: string;
}
