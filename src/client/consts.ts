import type {
	ApiProviderId,
	HttpErrorLinkDefinition,
	HttpErrorLinkStatusKey,
	NetworkErrorCategory,
} from './types';
import { EXTERNAL_URLS } from '../consts';

export const MAX_DIAGNOSTIC_FIELD_LENGTH = 300;

// ---- Network resilience ----

/** Default number of automatic retries before the first byte is delivered. */
export const DEFAULT_MAX_RETRIES = 2;

/** Base delay for exponential backoff between retries (ms). */
export const RETRY_BASE_DELAY_MS = 500;

/** Upper bound for a single backoff delay (ms). */
export const RETRY_MAX_DELAY_MS = 20_000;

/**
 * Abort a request attempt if no stream chunk arrives within this window (ms).
 * Guards against silently stalled connections, distinct from user cancellation.
 */
export const DEFAULT_IDLE_TIMEOUT_MS = 90_000;

export const API_PROVIDER_HTTP_ERROR_LINKS: Readonly<
	Record<HttpErrorLinkStatusKey, Readonly<Partial<Record<ApiProviderId, HttpErrorLinkDefinition>>>>
> = {
	401: {
		qwen: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.qwen.apiKeys,
		},
		'qwen-intl': {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.qwenIntl.apiKeys,
		},
		zai: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.zai.apiKeys,
		},
		minimax: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.minimax.apiKeys,
		},
		'minimax-intl': {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.minimaxIntl.apiKeys,
		},
		xiaomi: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.xiaomi.apiKeys,
		},
		moonshot: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.moonshot.apiKeys,
		},
		'moonshot-intl': {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.moonshotIntl.apiKeys,
		},
		hunyuan: {
			labelKey: 'error.action.createApiKey',
			url: EXTERNAL_URLS.hunyuan.apiKeys,
		},
	},
	402: {
		qwen: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.qwen.usage,
		},
		'qwen-intl': {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.qwenIntl.usage,
		},
		zai: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.zai.usage,
		},
		minimax: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.minimax.usage,
		},
		'minimax-intl': {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.minimaxIntl.usage,
		},
		xiaomi: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.xiaomi.usage,
		},
		moonshot: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.moonshot.usage,
		},
		'moonshot-intl': {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.moonshotIntl.usage,
		},
		hunyuan: {
			labelKey: 'error.action.viewUsage',
			url: EXTERNAL_URLS.hunyuan.usage,
		},
	},
	'5xx': {
		qwen: {
			labelKey: 'error.action.checkQwenStatus',
			url: EXTERNAL_URLS.qwen.status,
		},
		'qwen-intl': {
			labelKey: 'error.action.checkQwenStatus',
			url: EXTERNAL_URLS.qwenIntl.status,
		},
		zai: {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.zai.status,
		},
		minimax: {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.minimax.status,
		},
		'minimax-intl': {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.minimaxIntl.status,
		},
		xiaomi: {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.xiaomi.status,
		},
		moonshot: {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.moonshot.status,
		},
		'moonshot-intl': {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.moonshotIntl.status,
		},
		hunyuan: {
			labelKey: 'error.action.checkProviderStatus',
			url: EXTERNAL_URLS.hunyuan.status,
		},
	},
};

/**
 * Curated network error codes observed from Node.js fetch failures.
 *
 * Sources: Node errno / c-ares DNS codes (`NodeJS.ErrnoException.code`),
 * Node TLS/OpenSSL error codes, and undici error `code` / `name` literals
 * from the `undici-types` package bundled through `@types/node`.
 *
 * This is intentionally not exhaustive: unknown codes fall back to `generic`
 * while still being shown to the user in the error message.
 */
export const NETWORK_ERROR_CATEGORY_BY_CODE = {
	ENOTFOUND: 'dns',
	EAI_AGAIN: 'dns',
	ENODATA: 'dns',
	ESERVFAIL: 'dns',
	EFORMERR: 'dns',
	ENONAME: 'dns',
	EBADNAME: 'dns',
	EBADQUERY: 'dns',
	EBADFAMILY: 'dns',
	EBADRESP: 'dns',
	ENOTIMP: 'dns',
	EREFUSED: 'dns',
	ENOTINITIALIZED: 'dns',
	ELOADIPHLPAPI: 'dns',
	EADDRGETNETWORKPARAMS: 'dns',
	ECONNREFUSED: 'unreachable',
	ENETUNREACH: 'unreachable',
	EHOSTUNREACH: 'unreachable',
	EADDRNOTAVAIL: 'unreachable',
	ENETDOWN: 'unreachable',
	EHOSTDOWN: 'unreachable',
	ECONNRESET: 'interrupted',
	ECONNABORTED: 'interrupted',
	ENETRESET: 'interrupted',
	ENOTCONN: 'interrupted',
	EPIPE: 'interrupted',
	EOF: 'interrupted',
	UND_ERR_SOCKET: 'interrupted',
	SocketError: 'interrupted',
	ETIMEDOUT: 'timeout',
	ETIMEOUT: 'timeout',
	ESOCKETTIMEDOUT: 'timeout',
	UND_ERR_CONNECT_TIMEOUT: 'timeout',
	UND_ERR_HEADERS_TIMEOUT: 'timeout',
	UND_ERR_BODY_TIMEOUT: 'timeout',
	ERR_TLS_HANDSHAKE_TIMEOUT: 'timeout',
	TimeoutError: 'timeout',
	ConnectTimeoutError: 'timeout',
	HeadersTimeoutError: 'timeout',
	BodyTimeoutError: 'timeout',
	CERT_HAS_EXPIRED: 'tls',
	CERT_NOT_YET_VALID: 'tls',
	CERT_UNTRUSTED: 'tls',
	CERT_REJECTED: 'tls',
	CERT_SIGNATURE_FAILURE: 'tls',
	SELF_SIGNED_CERT_IN_CHAIN: 'tls',
	DEPTH_ZERO_SELF_SIGNED_CERT: 'tls',
	UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'tls',
	UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'tls',
	UNABLE_TO_GET_ISSUER_CERT: 'tls',
	UNABLE_TO_GET_CRL: 'tls',
	UNABLE_TO_DECRYPT_CERT_SIGNATURE: 'tls',
	UNABLE_TO_DECRYPT_CRL_SIGNATURE: 'tls',
	UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY: 'tls',
	CRL_SIGNATURE_FAILURE: 'tls',
	ERR_TLS_CERT_ALTNAME_INVALID: 'tls',
	UND_ERR_PRX_TLS: 'tls',
	SecureProxyConnectionError: 'tls',
	ABORT_ERR: 'aborted',
	AbortError: 'aborted',
	UND_ERR_ABORTED: 'aborted',
	ECANCELLED: 'aborted',
	UND_ERR_HEADERS_OVERFLOW: 'protocol',
	UND_ERR_RESPONSE: 'protocol',
	UND_ERR_REQ_CONTENT_LENGTH_MISMATCH: 'protocol',
	UND_ERR_RES_CONTENT_LENGTH_MISMATCH: 'protocol',
	UND_ERR_RES_EXCEEDED_MAX_SIZE: 'protocol',
	HTTPParserError: 'protocol',
	HeadersOverflowError: 'protocol',
	ResponseError: 'protocol',
	ResponseContentLengthMismatchError: 'protocol',
	ResponseExceededMaxSizeError: 'protocol',
	ERR_INVALID_URL: 'configuration',
	ERR_INVALID_ARG_TYPE: 'configuration',
	ERR_INVALID_ARG_VALUE: 'configuration',
	UND_ERR_INVALID_ARG: 'configuration',
	InvalidArgumentError: 'configuration',
} as const satisfies Record<string, NetworkErrorCategory>;
