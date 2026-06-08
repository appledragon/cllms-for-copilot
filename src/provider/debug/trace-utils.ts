import { createHash } from 'crypto';
import vscode from 'vscode';

export function appendNumberIfNonZero(parts: string[], name: string, value: number): void {
	if (value > 0) {
		parts.push(`${name}=${value}`);
	}
}

export function isLanguageModelThinkingPart(
	part: unknown,
): part is vscode.LanguageModelThinkingPart {
	return (
		typeof vscode.LanguageModelThinkingPart === 'function' &&
		part instanceof vscode.LanguageModelThinkingPart
	);
}

export function normalizeThinkingPartValue(value: string | string[]): {
	text: string;
	type: string;
} {
	if (Array.isArray(value)) {
		return { text: value.join(''), type: 'string[]' };
	}
	return { text: value, type: 'string' };
}

export function getPartConstructorName(part: unknown): string {
	if (!part || typeof part !== 'object') {
		return typeof part;
	}
	return part.constructor?.name ?? 'object';
}

export function countCommonPrefixChars(a: string, b: string): number {
	const length = Math.min(a.length, b.length);
	let index = 0;
	while (index < length && a.charCodeAt(index) === b.charCodeAt(index)) {
		index += 1;
	}
	return index;
}

export function countLiteral(value: string, needle: string): number {
	if (!needle) {
		return 0;
	}
	let count = 0;
	let index = value.indexOf(needle);
	while (index !== -1) {
		count += 1;
		index = value.indexOf(needle, index + needle.length);
	}
	return count;
}

export function countRegex(value: string, regex: RegExp): number {
	return value.match(regex)?.length ?? 0;
}

export function countLikelyPaths(value: string): number {
	return countRegex(value, /(?:^|\s)(?:[\w.-]+\/){1,}[\w.-]+/g);
}

export function countLines(value: string): number {
	if (value.length === 0) {
		return 0;
	}
	return countLiteral(value, '\n') + 1;
}

export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, entryValue]) => entryValue !== undefined)
		.sort(([left], [right]) => left.localeCompare(right));
	return `{${entries
		.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
		.join(',')}}`;
}

export function hashString(value: string): string {
	return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
