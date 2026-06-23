import { createHash } from 'crypto';
import type { AudioTranscriber, AudioTranscriptionRequest } from './types';

const DEFAULT_MAX_ENTRIES = 50;

export class AudioTranscriptionCache {
	private readonly entries = new Map<string, string>();

	constructor(private readonly maxEntries: number = DEFAULT_MAX_ENTRIES) {}

	get(key: string): string | undefined {
		const value = this.entries.get(key);
		if (value === undefined) {
			return undefined;
		}
		this.entries.delete(key);
		this.entries.set(key, value);
		return value;
	}

	set(key: string, value: string): void {
		this.entries.delete(key);
		this.entries.set(key, value);
		while (this.entries.size > this.maxEntries) {
			const oldest = this.entries.keys().next().value;
			if (oldest === undefined) {
				break;
			}
			this.entries.delete(oldest);
		}
	}

	clear(): void {
		this.entries.clear();
	}
}

export function computeAudioTranscriptionCacheKey(
	transcriberId: string,
	request: AudioTranscriptionRequest,
): string {
	const hash = createHash('sha256');
	hash.update(transcriberId);
	hash.update('\u0000');
	hash.update(request.prompt);
	for (const audio of request.audios) {
		hash.update('\u0000');
		hash.update(audio.mimeType);
		hash.update('\u0000');
		hash.update(audio.data);
	}
	return hash.digest('hex');
}

export function createCachingAudioTranscriber(
	inner: AudioTranscriber,
	cache: AudioTranscriptionCache,
): AudioTranscriber {
	return {
		id: inner.id,
		source: inner.source,
		async transcribe(request: AudioTranscriptionRequest): Promise<string> {
			const key = computeAudioTranscriptionCacheKey(inner.id, request);
			const cached = cache.get(key);
			if (cached !== undefined) {
				return cached;
			}
			const transcription = await inner.transcribe(request);
			if (transcription.length > 0) {
				cache.set(key, transcription);
			}
			return transcription;
		},
	};
}
