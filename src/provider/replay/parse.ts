import {
	BASE64URL_PATTERN,
	ENCODED_JSON_MARKER_PREFIX,
	LEGACY_SEGMENT_ID_PATTERN,
	REPLAY_MARKER_PREFIXES,
} from './consts';
import type {
	ReasoningMarkerTextIgnoredReason,
	ReplayMarkerParseResult,
	ReplayMarkerPayloadFormat,
	VisionMarkerTextIgnoredReason,
} from './types';

const textDecoder = new TextDecoder();

type MarkerSectionKey = 'vision' | 'reasoning';

export function parseReplayMarkerData(data: Uint8Array): ReplayMarkerParseResult {
	const decoded = textDecoder.decode(data);
	const separatorIndex = decoded.indexOf('\\');
	if (separatorIndex < 0) {
		return { valid: false, error: 'marker-prefix-missing' };
	}

	const markerPrefix = decoded.slice(0, separatorIndex);
	if (!REPLAY_MARKER_PREFIXES.has(markerPrefix)) {
		return { valid: false, error: 'marker-prefix-mismatch' };
	}

	const markerPayload = decoded.slice(separatorIndex + 1);
	const decodedPayload = decodeReplayMarkerPayload(markerPayload);
	if (!decodedPayload.valid) {
		return { valid: false, error: decodedPayload.error };
	}
	const payload = decodedPayload.value;

	if (decodedPayload.format === 'raw-uuid') {
		return {
			valid: true,
			segmentId: payload.toLowerCase(),
			legacySegmentOnly: true,
			payloadFormat: decodedPayload.format,
		};
	}

	try {
		const value = JSON.parse(payload) as unknown;
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return { valid: false, error: 'marker-payload-not-object' };
		}

		const segmentId = parseOptionalSegmentId(value);
		if (segmentId.error) {
			return { valid: false, error: segmentId.error };
		}

		const vision = parseVisionMarkerMetadata(value);
		const reasoning = parseReasoningMarkerMetadata(value);
		return {
			valid: true,
			segmentId: segmentId.value,
			...vision,
			...reasoning,
			legacySegmentOnly: Boolean(segmentId.value && !vision.visionText && !reasoning.reasoningText),
			payloadFormat: decodedPayload.format,
		};
	} catch {
		return { valid: false, error: 'marker-json-invalid' };
	}
}

function parseOptionalSegmentId(value: object): {
	value?: string;
	error?: 'segment-id-not-string' | 'segment-id-not-uuid';
} {
	const segmentId = (value as { segmentId?: unknown }).segmentId;
	if (segmentId === undefined) {
		return {};
	}
	if (typeof segmentId !== 'string') {
		return { error: 'segment-id-not-string' };
	}
	if (!isValidLegacySegmentId(segmentId)) {
		return { error: 'segment-id-not-uuid' };
	}
	return { value: segmentId.toLowerCase() };
}

function parseMarkerTextSection<K extends MarkerSectionKey>(
	value: object,
	key: K,
): {
	text?: string;
	ignoredReason?: `${K}-not-object` | `${K}-text-not-string` | `${K}-text-empty`;
} {
	const section = (value as Record<string, unknown>)[key];
	if (section === undefined) {
		return {};
	}
	if (!section || typeof section !== 'object' || Array.isArray(section)) {
		return { ignoredReason: `${key}-not-object` };
	}

	const text = (section as { text?: unknown }).text;
	if (typeof text !== 'string') {
		return { ignoredReason: `${key}-text-not-string` };
	}
	if (text.length === 0) {
		return { ignoredReason: `${key}-text-empty` };
	}

	return { text };
}

function parseVisionMarkerMetadata(value: object): {
	visionText?: string;
	visionTextIgnoredReason?: VisionMarkerTextIgnoredReason;
} {
	const { text, ignoredReason } = parseMarkerTextSection(value, 'vision');
	if (ignoredReason) {
		return { visionTextIgnoredReason: ignoredReason };
	}
	return text ? { visionText: text } : {};
}

function parseReasoningMarkerMetadata(value: object): {
	reasoningText?: string;
	reasoningTextIgnoredReason?: ReasoningMarkerTextIgnoredReason;
} {
	const { text, ignoredReason } = parseMarkerTextSection(value, 'reasoning');
	if (ignoredReason) {
		return { reasoningTextIgnoredReason: ignoredReason };
	}
	return text ? { reasoningText: text } : {};
}

function decodeReplayMarkerPayload(
	markerPayload: string,
):
	| { valid: true; value: string; format: ReplayMarkerPayloadFormat }
	| { valid: false; error: 'marker-json-base64-invalid' } {
	if (!markerPayload.startsWith(ENCODED_JSON_MARKER_PREFIX)) {
		return {
			valid: true,
			value: markerPayload,
			format: isValidLegacySegmentId(markerPayload) ? 'raw-uuid' : 'raw-json',
		};
	}

	const encodedPayload = markerPayload.slice(ENCODED_JSON_MARKER_PREFIX.length);
	if (!encodedPayload || !BASE64URL_PATTERN.test(encodedPayload)) {
		return { valid: false, error: 'marker-json-base64-invalid' };
	}

	try {
		return {
			valid: true,
			value: Buffer.from(encodedPayload, 'base64url').toString('utf8'),
			format: 'json-base64url',
		};
	} catch {
		return { valid: false, error: 'marker-json-base64-invalid' };
	}
}

export function isValidLegacySegmentId(value: string): boolean {
	return LEGACY_SEGMENT_ID_PATTERN.test(value);
}
