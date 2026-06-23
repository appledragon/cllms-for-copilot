import { AudioProxyClient, type AudioProxyRequestOptions } from '../../protocols/client';
import type { AudioProxyConfig, AudioTranscriber, AudioTranscriptionRequest } from '../../types';

export function createEndpointAudioTranscriber(
	config: AudioProxyConfig,
	apiKey: string | undefined,
	options: AudioProxyRequestOptions = {},
): AudioTranscriber {
	return new EndpointAudioTranscriber(config, apiKey, options);
}

class EndpointAudioTranscriber implements AudioTranscriber {
	readonly source = 'api-endpoint' as const;
	private readonly client = new AudioProxyClient();

	constructor(
		private readonly config: AudioProxyConfig,
		private readonly apiKey: string | undefined,
		private readonly options: AudioProxyRequestOptions = {},
	) {}

	get id(): string {
		return `${this.config.providerFamily}:${this.config.modelId}`;
	}

	transcribe(request: AudioTranscriptionRequest): Promise<string> {
		return this.client.transcribe(this.config, this.apiKey, request, this.options);
	}
}
