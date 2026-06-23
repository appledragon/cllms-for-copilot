export const AUDIO_TRANSCRIPTION_PROMPT =
	'Transcribe all audio attachments in this message.\n\n' +
	'If there is one audio file, return the transcript directly.\n' +
	'If there are multiple audio files, keep their order and clearly separate each transcript.\n\n' +
	'Return concise factual text suitable for inserting into a text-only chat prompt.';

export const AUDIO_TRANSCRIPTION_UNAVAILABLE = '[Audio Transcription unavailable]';
export const AUDIO_TRANSCRIPTION_PREFIX = '[Audio Transcription: ';
export const AUDIO_TRANSCRIPTION_SUFFIX = ']';
export const MAX_AUDIO_PART_BYTES = 25 * 1024 * 1024;
