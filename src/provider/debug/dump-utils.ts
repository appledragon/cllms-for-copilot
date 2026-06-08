import { createHash } from 'crypto';
import { writeFile } from 'fs/promises';
import vscode from 'vscode';
import { LANGUAGE_MODEL_CHAT_SYSTEM_ROLE } from '../../consts';
import { safeStringify, toWellFormedString } from '../../json';

export function hashString(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function hashBytes(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

export function countLines(value: string): number {
	if (!value) {
		return 0;
	}
	return value.split('\n').length;
}

export function countLiteral(value: string, literal: string): number {
	if (!value || !literal) {
		return 0;
	}

	let count = 0;
	let index = 0;
	while (true) {
		index = value.indexOf(literal, index);
		if (index < 0) {
			break;
		}
		count += 1;
		index += literal.length;
	}
	return count;
}

export function sanitizeJsonValue(value: unknown): unknown {
	const seen = new WeakSet<object>();
	return JSON.parse(
		JSON.stringify(value, (_key, entryValue: unknown) => {
			if (typeof entryValue === 'string') {
				return toWellFormedString(entryValue);
			}
			if (typeof entryValue === 'bigint') {
				return `${entryValue.toString()}n`;
			}
			if (entryValue instanceof Uint8Array) {
				return {
					type: 'Uint8Array',
					byteLength: entryValue.byteLength,
					sha256: hashBytes(entryValue),
				};
			}
			if (entryValue && typeof entryValue === 'object') {
				if (seen.has(entryValue)) {
					return '[Circular]';
				}
				seen.add(entryValue);
			}
			return entryValue;
		}) ?? 'null',
	) as unknown;
}

export function getConstructorName(value: unknown): string | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	const constructorName = (value as { constructor?: { name?: string } }).constructor?.name;
	return constructorName || undefined;
}

export function formatRole(role: vscode.LanguageModelChatMessageRole): string {
	if (role === vscode.LanguageModelChatMessageRole.User) return 'user';
	if (role === vscode.LanguageModelChatMessageRole.Assistant) return 'assistant';
	if (role === LANGUAGE_MODEL_CHAT_SYSTEM_ROLE) return 'system';
	return String(role);
}

export function formatToolMode(mode: vscode.LanguageModelChatToolMode): string {
	if (mode === vscode.LanguageModelChatToolMode.Auto) return 'auto';
	if (mode === vscode.LanguageModelChatToolMode.Required) return 'required';
	return String(mode);
}

export function getVscodeMessageText(message: vscode.LanguageModelChatRequestMessage): string {
	let text = '';
	for (const part of message.content) {
		if (part instanceof vscode.LanguageModelTextPart) {
			text += part.value;
		}
	}
	return text;
}

export function getBooleanSetting(section: string, key: string): boolean | 'unknown' {
	const value = vscode.workspace.getConfiguration(section).get<unknown>(key);
	return typeof value === 'boolean' ? value : 'unknown';
}

export function getStringSetting(section: string, key: string): string | 'unknown' {
	const value = vscode.workspace.getConfiguration(section).get<unknown>(key);
	return typeof value === 'string' ? value : 'unknown';
}

export function getObjectKeys(value: unknown): string[] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}
	return Object.keys(value).sort();
}

export async function writeJsonFile<T>(
	filePath: string,
	value: T,
	stringify: (value: T) => string = safeStringify,
): Promise<string> {
	const content = stringify(value);
	await writeFile(filePath, content, 'utf-8');
	return content;
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
	await writeFile(filePath, content, 'utf-8');
}
