import vscode from 'vscode';
import { DEFAULT_MAX_RETRIES } from './client/consts';
import { CONFIG_SECTION } from './consts';
import type { ProviderDefinition } from './types';

export type DebugMode = 'minimal' | 'metadata' | 'verbose';

/**
 * How much marker-replayed `reasoning_content` to re-send on later turns.
 *
 *  - `all` (default): replay reasoning_content for every assistant turn, which
 *    keeps thinking tool-call histories complete (required by Qwen) and the
 *    request prefix byte-stable.
 *  - `latest-tool-loop`: only replay reasoning_content for assistant turns at or
 *    after the most recent human user message (the in-flight tool-call loop), and
 *    drop it from older turns to save input tokens on long sessions.
 */
export type ReasoningReplayScope = 'all' | 'latest-tool-loop';

/** Upper bound for the user-configurable retry count. */
const MAX_CONFIGURABLE_RETRIES = 5;

/**
 * Get a provider's API base URL from settings.
 * Falls back to the provider's official endpoint when not configured.
 */
export function getBaseUrl(provider: ProviderDefinition): string {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	return config.get<string>(provider.baseUrlSetting)?.trim() || provider.defaultBaseUrl;
}

/**
 * Resolve the API model ID to send to a provider's endpoint.
 *
 * Users can override model IDs via the provider's `modelIdOverrides` setting
 * object (e.g. for third-party API proxies or coding-plan endpoints). Falls
 * back to the VS Code model ID when no override is configured.
 */
export function getApiModelId(provider: ProviderDefinition, vscodeModelId: string): string {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const overrides = config.get<Record<string, string>>(provider.modelIdOverridesSetting);
	const override = overrides?.[vscodeModelId]?.trim();
	return override || vscodeModelId;
}

/**
 * Get the configured max output tokens limit.
 * Returns `undefined` when set to 0 (API default — no limit).
 */
export function getMaxTokens(): number | undefined {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<number>('maxTokens', 0);
	return value > 0 ? value : undefined;
}

/**
 * Output-token cap applied only to one-shot utility/helper requests (chat
 * titles, commit messages, etc.). Returns `undefined` when set to 0 (no cap).
 * Combined with {@link getMaxTokens} by taking the smaller of the two.
 */
export function getUtilityMaxOutputTokens(): number | undefined {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<number>('utility.maxOutputTokens', 0);
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

/**
 * Optional cheaper API model ID to use for utility/helper requests on a given
 * provider, keyed by {@link ProviderDefinition.id}. Off by default (empty map);
 * when set, utility-tier requests are routed to this model on the same
 * provider/key instead of the user-selected one.
 */
export function getUtilityModelIdOverride(provider: ProviderDefinition): string | undefined {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const map = config.get<Record<string, string>>('utility.modelIdByProvider');
	return map?.[provider.id]?.trim() || undefined;
}

/**
 * Number of automatic retries for transient request failures (429 / 5xx /
 * network blips) before any output is delivered. Clamped to a sane range.
 */
export function getMaxRetries(): number {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<number>('maxRetries', DEFAULT_MAX_RETRIES);
	if (!Number.isFinite(value) || value < 0) {
		return DEFAULT_MAX_RETRIES;
	}
	return Math.min(Math.floor(value), MAX_CONFIGURABLE_RETRIES);
}

/**
 * Diagnostic mode. `verbose` also enables metadata logs.
 *
 * The legacy boolean `debug` setting is still read as a fallback so old
 * settings keep working even if migration cannot update every scope.
 */
export function getDebugMode(): DebugMode {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const mode = getConfiguredDebugMode(config);
	if (mode) return mode;

	return config.get<boolean>('debug', false) ? 'metadata' : 'minimal';
}

/**
 * Whether to log privacy-preserving diagnostic debug information.
 */
export function getDebugLoggingEnabled(): boolean {
	return getDebugMode() !== 'minimal';
}

/**
 * Whether to write full request payloads to disk.
 */
export function getRequestDumpEnabled(): boolean {
	return getDebugMode() === 'verbose';
}

export function getStabilizeToolListEnabled(): boolean {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	return config.get<boolean>('experimental.stabilizeToolList', false);
}

/**
 * Sort the request `tools` array by name so VS Code/Copilot reordering the
 * enabled tools between turns does not invalidate the provider's context-cache
 * prefix. Experimental and off by default.
 */
export function getSortToolsForCacheEnabled(): boolean {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	return config.get<boolean>('experimental.sortToolsForCache', false);
}

/** Resolve the configured marker-replayed reasoning_content scope. */
export function getReplayReasoningScope(): ReasoningReplayScope {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<string>('experimental.replayReasoningScope', 'all');
	return value === 'latest-tool-loop' ? 'latest-tool-loop' : 'all';
}

const DEFAULT_VISION_PROXY_TIMEOUT_MS = 30_000;
const MIN_VISION_PROXY_TIMEOUT_MS = 1_000;
const MAX_VISION_PROXY_TIMEOUT_MS = 120_000;

/**
 * Per-request timeout (ms) for the API-endpoint vision proxy. Clamped to a sane
 * range so a slow endpoint cannot stall the whole chat indefinitely, while fast
 * endpoints can be configured to fail quicker.
 */
export function getVisionProxyTimeoutMs(): number {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<number>('visionProxy.timeoutMs', DEFAULT_VISION_PROXY_TIMEOUT_MS);
	if (!Number.isFinite(value) || value <= 0) {
		return DEFAULT_VISION_PROXY_TIMEOUT_MS;
	}
	return Math.min(
		MAX_VISION_PROXY_TIMEOUT_MS,
		Math.max(MIN_VISION_PROXY_TIMEOUT_MS, Math.floor(value)),
	);
}

export function getAudioProxyTimeoutMs(): number {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const value = config.get<number>('audioProxy.timeoutMs', DEFAULT_VISION_PROXY_TIMEOUT_MS);
	if (!Number.isFinite(value) || value <= 0) {
		return DEFAULT_VISION_PROXY_TIMEOUT_MS;
	}
	return Math.min(
		MAX_VISION_PROXY_TIMEOUT_MS,
		Math.max(MIN_VISION_PROXY_TIMEOUT_MS, Math.floor(value)),
	);
}

/**
 * Migrate the legacy boolean `cllms.debug` setting to `debugMode`.
 *
 * `debug: true` maps to `debugMode: metadata`; `debug: false` maps to the
 * default `minimal`, so it only needs cleanup.
 */
export async function migrateLegacyDebugSetting(): Promise<void> {
	await migrateLegacyDebugSettingAtScope(vscode.ConfigurationTarget.Global);
	if (vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length) {
		await migrateLegacyDebugSettingAtScope(vscode.ConfigurationTarget.Workspace);
	}
}

function getConfiguredDebugMode(config: vscode.WorkspaceConfiguration): DebugMode | undefined {
	const mode = config.inspect<unknown>('debugMode');
	return normalizeDebugMode(mode?.workspaceValue) ?? normalizeDebugMode(mode?.globalValue);
}

function normalizeDebugMode(value: unknown): DebugMode | undefined {
	if (value === 'minimal' || value === 'metadata' || value === 'verbose') {
		return value;
	}
	return undefined;
}

async function migrateLegacyDebugSettingAtScope(
	target: vscode.ConfigurationTarget,
	resource?: vscode.Uri,
): Promise<void> {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION, resource);
	const legacy = config.inspect<boolean>('debug');
	const mode = config.inspect<DebugMode>('debugMode');
	const legacyValue = getScopedValue(legacy, target);

	if (legacyValue === undefined) {
		return;
	}

	if (legacyValue === true && getScopedValue(mode, target) === undefined) {
		await config.update('debugMode', 'metadata', target);
	}
	await config.update('debug', undefined, target);
}

function getScopedValue<T>(
	inspection:
		| {
				globalValue?: T;
				workspaceValue?: T;
				workspaceFolderValue?: T;
		  }
		| undefined,
	target: vscode.ConfigurationTarget,
): T | undefined {
	if (!inspection) {
		return undefined;
	}

	if (target === vscode.ConfigurationTarget.Global) {
		return inspection.globalValue;
	}
	if (target === vscode.ConfigurationTarget.Workspace) {
		return inspection.workspaceValue;
	}
	return undefined;
}
