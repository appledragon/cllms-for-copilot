import { createHash } from 'crypto';
import type { VisionDescriber, VisionDescriptionRequest } from './types';

const DEFAULT_MAX_ENTRIES = 50;

/**
 * Bounded, session-scoped cache of vision-proxy descriptions keyed by the image
 * bytes (+ prompt + describer identity). Describing the same image is the most
 * expensive and latency-heavy part of the text-only vision path, so reusing a
 * prior description across retries / re-attachments saves real cost and also
 * keeps the marker-replayed text byte-stable for prefix caching.
 *
 * Insertion order is used as a simple LRU: reads re-insert the key so the oldest
 * untouched entry is evicted first once {@link maxEntries} is exceeded.
 */
export class VisionDescriptionCache {
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

	get size(): number {
		return this.entries.size;
	}
}

/** Content-addressed key over the describer identity, prompt, and image bytes. */
export function computeVisionDescriptionCacheKey(
	describerId: string,
	request: VisionDescriptionRequest,
): string {
	const hash = createHash('sha256');
	hash.update(describerId);
	hash.update('\u0000');
	hash.update(request.prompt);
	for (const image of request.images) {
		hash.update('\u0000');
		hash.update(image.mimeType);
		hash.update('\u0000');
		hash.update(image.data);
	}
	return hash.digest('hex');
}

/**
 * Wrap a describer so identical describe requests resolve from {@link cache}.
 * Only non-empty results are cached; empty strings signal an upstream failure
 * the caller handles, and thrown errors propagate uncached.
 */
export function createCachingVisionDescriber(
	inner: VisionDescriber,
	cache: VisionDescriptionCache,
): VisionDescriber {
	return {
		id: inner.id,
		source: inner.source,
		async describe(request: VisionDescriptionRequest): Promise<string> {
			const key = computeVisionDescriptionCacheKey(inner.id, request);
			const cached = cache.get(key);
			if (cached !== undefined) {
				return cached;
			}
			const description = await inner.describe(request);
			if (description.length > 0) {
				cache.set(key, description);
			}
			return description;
		},
	};
}
