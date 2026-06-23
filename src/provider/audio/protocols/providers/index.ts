import type { AudioProxyConfig } from '../../types';
import { openAIResponsesAudioAdapter } from './openai/responses-audio';
import { openAITranscriptionsAdapter } from './openai/transcriptions';
import type { AudioProviderAdapter } from './types';

export function getAudioProviderAdapter(config: AudioProxyConfig): AudioProviderAdapter {
	return config.apiType === 'responses' ? openAIResponsesAudioAdapter : openAITranscriptionsAdapter;
}
