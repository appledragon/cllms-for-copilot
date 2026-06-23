import type { AudioProxyConfig, AudioTranscriptionRequest } from '../../types';

export interface AudioProviderAdapter {
	createBody(config: AudioProxyConfig, request: AudioTranscriptionRequest): object;
	parseResponse(value: unknown): string;
}
