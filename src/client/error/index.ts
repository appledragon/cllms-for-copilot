import { t } from '../../i18n';
import { safeStringify } from '../../json';
import { API_PROVIDER_HTTP_ERROR_LINKS, MAX_DIAGNOSTIC_FIELD_LENGTH } from '../consts';
import { getNetworkErrorCauseInfo, getNetworkErrorCode, getNetworkErrorMessage } from './network';
import type {
	ApiProviderId,
	LlmRequestErrorKind,
	ErrorActionLink,
	ErrorActionUrls,
	HttpErrorLinkDefinition,
	HttpErrorLinkStatusKey,
	RequestErrorContext,
} from '../types';
export type { LlmRequestErrorKind, ErrorActionUrls } from '../types';

const errorActionUrlStore = (() => {
	let current: ErrorActionUrls = {};

	return {
		get: () => current,
		set: (key: keyof ErrorActionUrls, url: string) => {
			current = { ...current, [key]: url };
		},
	};
})();

export function setErrorActionUrl(key: keyof ErrorActionUrls, url: string): void {
	errorActionUrlStore.set(key, url);
}

export class LlmRequestError extends Error {
	readonly kind: LlmRequestErrorKind;
	readonly userSummary: string;
	readonly diagnosticMessage: string;
	readonly baseUrl?: string;
	readonly status?: number;
	readonly code?: string;
	readonly providerId?: ApiProviderId;
	/** Server-advised retry delay (ms) parsed from a `Retry-After` header. */
	readonly retryAfterMs?: number;

	constructor(options: {
		message: string;
		userSummary?: string;
		kind: LlmRequestErrorKind;
		diagnosticMessage?: string;
		baseUrl?: string;
		status?: number;
		code?: string;
		providerId?: ApiProviderId;
		retryAfterMs?: number;
		cause?: unknown;
	}) {
		super(options.message, { cause: options.cause });
		this.name = 'LlmRequestError';
		this.kind = options.kind;
		this.userSummary = options.userSummary ?? options.message;
		this.diagnosticMessage = options.diagnosticMessage ?? options.message;
		this.baseUrl = options.baseUrl;
		this.status = options.status;
		this.code = options.code;
		this.providerId = options.providerId;
		this.retryAfterMs = options.retryAfterMs;
	}
}

interface ServerErrorDetails {
	message?: string;
	type?: string;
}

export async function createHttpError(
	response: Response,
	context: RequestErrorContext,
): Promise<LlmRequestError> {
	const { baseUrl, providerId } = context;
	const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
	const responseText = await response.text();
	const serverError = extractServerErrorDetails(responseText);
	const serverMessage = serverError.message;
	const redactedServerMessage = serverMessage ? redactSensitiveText(serverMessage) : undefined;
	const redactedResponseText = responseText ? redactSensitiveText(responseText) : '';
	const isQuotaOrBilling = isQuotaOrBillingHttpError(response.status, serverError);
	const userSummary = getHttpErrorMessage(
		response.status,
		getCreateApiKeyUrl(response.status, providerId),
		redactedServerMessage,
		isQuotaOrBilling,
	);

	return new LlmRequestError({
		message: `API request failed with HTTP ${response.status}`,
		userSummary,
		kind: 'http',
		baseUrl,
		status: response.status,
		code:
			isQuotaOrBilling && response.status === 429
				? `HTTP_${response.status}_QUOTA`
				: `HTTP_${response.status}`,
		providerId,
		retryAfterMs,
		diagnosticMessage: joinDiagnosticParts(
			`kind=http`,
			`status=${response.status}`,
			getRequestDiagnosticMessage(context),
			`statusText=${safeStringify(response.statusText || 'unknown')}`,
			serverError.type ? `serverType=${safeStringify(serverError.type)}` : undefined,
			redactedServerMessage ? `serverMessage=${safeStringify(redactedServerMessage)}` : undefined,
			redactedResponseText && redactedResponseText !== redactedServerMessage
				? `body=${safeStringify(truncateSingleLine(redactedResponseText))}`
				: undefined,
		),
	});
}

export function normalizeRequestError(error: unknown, context: RequestErrorContext): Error {
	if (error instanceof LlmRequestError) {
		return error;
	}

	if (!(error instanceof Error)) {
		const value = truncateSingleLine(String(error));
		return new LlmRequestError({
			message: `Request failed with a non-Error value: ${value}`,
			userSummary: t('error.unknown', value),
			kind: 'unknown',
			baseUrl: context.baseUrl,
			providerId: context.providerId,
			diagnosticMessage: joinDiagnosticParts(
				`kind=unknown`,
				getRequestDiagnosticMessage(context),
				`error=${safeStringify(value)}`,
			),
		});
	}

	const causeInfo = getNetworkErrorCauseInfo(error);
	if (!causeInfo) {
		return error;
	}

	const code = getNetworkErrorCode(causeInfo);
	const userSummary = getNetworkErrorMessage(code);
	const enhanced = new LlmRequestError({
		message: code
			? `Request failed due to network error ${code}`
			: 'Request failed due to a network error',
		userSummary,
		kind: 'network',
		baseUrl: context.baseUrl,
		providerId: context.providerId,
		code,
		cause: error,
		diagnosticMessage: joinDiagnosticParts(
			`kind=network`,
			code ? `code=${code}` : undefined,
			getRequestDiagnosticMessage(context),
			`message=${safeStringify(truncateSingleLine(error.message))}`,
			`cause=${causeInfo.value}`,
		),
	});
	enhanced.stack = error.stack;
	return enhanced;
}

export function formatRequestError(error: Error): string {
	const diagnosticMessage = joinDiagnosticParts(
		error instanceof LlmRequestError
			? error.diagnosticMessage
			: `message=${safeStringify(error.message)}`,
	);
	return error.stack ? `${diagnosticMessage}\n${error.stack}` : diagnosticMessage;
}

export function createUserFacingError(error: Error): Error {
	const message =
		error instanceof LlmRequestError
			? formatMarkdownMessage(error.userSummary, getErrorActions(error, errorActionUrlStore.get()))
			: error.message;
	const displayError = new Error(message);
	displayError.stack = undefined;
	return displayError;
}

function getHttpErrorMessage(
	status: number,
	createApiKeyUrl?: string,
	serverMessage?: string,
	isQuotaOrBilling = false,
): string {
	switch (status) {
		case 400:
			return t('error.http.400', status);
		case 401:
			return createApiKeyUrl
				? t('error.http.401.withCreateApiKeyLink', status, createApiKeyUrl)
				: t('error.http.401', status);
		case 402:
			return t('error.http.402', status);
		case 422:
			return t('error.http.422', status);
		case 429:
			if (isQuotaOrBilling) {
				return serverMessage
					? t('error.http.quota.withProviderMessage', status, serverMessage)
					: t('error.http.quota', status);
			}
			return t('error.http.429', status);
		case 500:
			return t('error.http.500', status);
		case 503:
			return t('error.http.503', status);
		default:
			return t('error.http.generic', status);
	}
}

function extractServerErrorDetails(responseText: string): ServerErrorDetails {
	const trimmed = responseText.trim();
	if (!trimmed) {
		return {};
	}

	try {
		const parsed: unknown = JSON.parse(trimmed);
		const error = getObjectProperty(parsed, 'error');
		const message =
			getStringProperty(error, 'message') ??
			getStringProperty(parsed, 'message') ??
			(typeof error === 'string' ? error : undefined);
		const type = getStringProperty(error, 'type') ?? getStringProperty(parsed, 'type');
		return {
			message: message ? truncateSingleLine(message) : undefined,
			type: type ? truncateSingleLine(type) : undefined,
		};
	} catch {
		return { message: truncateSingleLine(trimmed) };
	}
}

function isQuotaOrBillingHttpError(status: number, serverError: ServerErrorDetails): boolean {
	if (status === 402) {
		return true;
	}

	if (status !== 429) {
		return false;
	}

	const text = `${serverError.type ?? ''} ${serverError.message ?? ''}`.toLowerCase();
	return QUOTA_OR_BILLING_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

const QUOTA_OR_BILLING_ERROR_PATTERNS: readonly RegExp[] = [
	/exceeded[_ -]?current[_ -]?quota/u,
	/insufficient[_ -]?quota/u,
	/insufficient[_ -]?balance/u,
	/out of balance/u,
	/account\b.*\bsuspended/u,
	/recharge/u,
	/billing/u,
	/payment/u,
	/credits?\b.*\b(?:exhausted|insufficient|used up|run out)/u,
	/quota[_ -]?error/u,
	/quota\b.*\b(?:exceeded|exhausted)/u,
];

function getObjectProperty(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)[key]
		: undefined;
}

function getStringProperty(value: unknown, key: string): string | undefined {
	const property = getObjectProperty(value, key);
	return typeof property === 'string' && property.length > 0 ? property : undefined;
}

function formatMarkdownMessage(
	summary: string,
	actions: readonly ErrorActionLink[] | undefined = undefined,
): string {
	const formattedSummary = `**${escapeBoldText(summary)}**`;
	const actionLinks = actions?.map(formatActionLink).join(' · ');
	return actionLinks
		? [formattedSummary + '\\', '\\', `**${actionLinks}**`].join('\n')
		: formattedSummary;
}

function formatActionLink(action: ErrorActionLink): string {
	return `[${t(action.labelKey)}](${action.url})`;
}

function getErrorActions(
	error: LlmRequestError,
	actionUrls: ErrorActionUrls,
): readonly ErrorActionLink[] {
	if (error.kind === 'http' && error.status !== undefined) {
		return getHttpErrorActions(error.status, error.providerId, actionUrls, error.code);
	}

	return getDiagnosticErrorActions(actionUrls);
}

function getHttpErrorActions(
	status: number,
	providerId: ApiProviderId | undefined,
	actionUrls: ErrorActionUrls,
	code?: string,
): readonly ErrorActionLink[] {
	return [
		...getUniversalHttpErrorActions(status, actionUrls),
		...getProviderHttpErrorActions(status, providerId, code),
		...getDiagnosticErrorActions(actionUrls),
	];
}

function getUniversalHttpErrorActions(
	status: number,
	actionUrls: ErrorActionUrls,
): readonly ErrorActionLink[] {
	const url = actionUrls.configureApiKey;
	return status === 401 && url ? [{ labelKey: 'error.action.setApiKey', url }] : [];
}

function getProviderHttpErrorActions(
	status: number,
	providerId: ApiProviderId | undefined,
	code?: string,
): readonly ErrorActionLink[] {
	if (status === 401) {
		return [];
	}

	const actionStatus = code === 'HTTP_429_QUOTA' ? 402 : status;
	const link = getProviderHttpErrorLink(actionStatus, providerId);
	return link ? [{ labelKey: link.labelKey, url: link.url }] : [];
}

function getProviderHttpErrorLink(
	status: number,
	providerId: ApiProviderId | undefined,
): HttpErrorLinkDefinition | undefined {
	const statusKey = getHttpErrorLinkStatusKey(status);
	return providerId && statusKey ? API_PROVIDER_HTTP_ERROR_LINKS[statusKey][providerId] : undefined;
}

function getCreateApiKeyUrl(
	status: number,
	providerId: ApiProviderId | undefined,
): string | undefined {
	return status === 401 ? getProviderHttpErrorLink(status, providerId)?.url : undefined;
}

function getDiagnosticErrorActions(actionUrls: ErrorActionUrls): readonly ErrorActionLink[] {
	const url = actionUrls.showLogs;
	return url ? [{ labelKey: 'error.action.viewDetails', url }] : [];
}

function getRequestDiagnosticMessage(context: RequestErrorContext): string {
	const { request } = context;
	return joinDiagnosticParts(
		`baseUrl=${safeStringify(context.baseUrl)}`,
		`model=${safeStringify(request.model)}`,
		`stream=${request.stream}`,
		request.temperature !== undefined ? `temperature=${request.temperature}` : undefined,
		request.top_p !== undefined ? `topP=${request.top_p}` : undefined,
		request.max_tokens !== undefined ? `maxTokens=${request.max_tokens}` : undefined,
		request.enable_thinking !== undefined ? `enableThinking=${request.enable_thinking}` : undefined,
		request.thinking_budget !== undefined ? `thinkingBudget=${request.thinking_budget}` : undefined,
		request.tool_choice ? `toolChoice=${safeStringify(request.tool_choice)}` : undefined,
		`toolCount=${request.tools?.length ?? 0}`,
		`messageCount=${request.messages.length}`,
		`messageChars=${request.messages.reduce((total, message) => total + message.content.length, 0)}`,
	);
}

function joinDiagnosticParts(...parts: (string | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}

function truncateSingleLine(value: string): string {
	const singleLine = value.replace(/\s+/g, ' ').trim();
	return singleLine.length > MAX_DIAGNOSTIC_FIELD_LENGTH
		? `${singleLine.slice(0, MAX_DIAGNOSTIC_FIELD_LENGTH)}...`
		: singleLine;
}

function redactSensitiveText(value: string): string {
	return value
		.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/giu, 'Bearer <redacted>')
		.replace(/\b(?:sk|ak)-[A-Za-z0-9_-]{8,}\b/gu, (token) => `${token.slice(0, 3)}...redacted`)
		.replace(/\borg-[A-Za-z0-9_-]{8,}\b/gu, 'org-...redacted');
}

function escapeBoldText(value: string): string {
	return value.replace(/\*/g, '\\*');
}

/**
 * Parse an HTTP `Retry-After` header into milliseconds.
 *
 * Supports both the delta-seconds form (`Retry-After: 30`) and the HTTP-date
 * form (`Retry-After: Wed, 21 Oct 2026 07:28:00 GMT`). Returns `undefined` for
 * a missing, malformed, or non-positive value.
 */
export function parseRetryAfterMs(headerValue: string | null | undefined): number | undefined {
	if (!headerValue) {
		return undefined;
	}
	const trimmed = headerValue.trim();
	if (!trimmed) {
		return undefined;
	}

	if (/^\d+$/.test(trimmed)) {
		const seconds = Number(trimmed);
		return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
	}

	const dateMs = Date.parse(trimmed);
	if (Number.isNaN(dateMs)) {
		return undefined;
	}
	const deltaMs = dateMs - Date.now();
	return deltaMs > 0 ? deltaMs : undefined;
}

function getHttpErrorLinkStatusKey(status: number): HttpErrorLinkStatusKey | undefined {
	if (status === 401 || status === 402) {
		return status;
	}

	return status >= 500 && status <= 599 ? '5xx' : undefined;
}
