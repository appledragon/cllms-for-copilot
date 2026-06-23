export interface ReplayMarkerParseResult {
	valid: boolean;
	segmentId?: string;
	visionText?: string;
	visionTextIgnoredReason?: VisionMarkerTextIgnoredReason;
	audioText?: string;
	audioTextIgnoredReason?: AudioMarkerTextIgnoredReason;
	reasoningText?: string;
	reasoningTextIgnoredReason?: ReasoningMarkerTextIgnoredReason;
	legacySegmentOnly?: boolean;
	payloadFormat?: ReplayMarkerPayloadFormat;
	error?: ReplayMarkerError;
}

export type ReplayMarkerError =
	| 'marker-prefix-missing'
	| 'marker-prefix-mismatch'
	| 'marker-payload-not-object'
	| 'segment-id-not-string'
	| 'segment-id-not-uuid'
	| 'marker-json-invalid'
	| 'marker-json-base64-invalid';

export interface LocatedReplayMarker {
	partIndex: number;
	marker: ReplayMarkerParseResult;
}

export type ReplayMarkerPayloadFormat = 'json-base64url' | 'raw-json' | 'raw-uuid';

export type VisionMarkerTextIgnoredReason =
	| 'vision-not-object'
	| 'vision-text-not-string'
	| 'vision-text-empty';

export type ReasoningMarkerTextIgnoredReason =
	| 'reasoning-not-object'
	| 'reasoning-text-not-string'
	| 'reasoning-text-empty';

export type AudioMarkerTextIgnoredReason =
	| 'audio-not-object'
	| 'audio-text-not-string'
	| 'audio-text-empty';

export interface ReplayMarkerMetadata {
	visionText?: string;
	audioText?: string;
	reasoningText?: string;
}
