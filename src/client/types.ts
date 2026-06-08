import type { ProviderId, LlmRequest } from '../types';

export interface ErrorActionUrls {
	configureApiKey?: string;
	showLogs?: string;
}

export interface RequestErrorContext {
	baseUrl: string;
	request: LlmRequest;
	/**
	 * Resolved provider that owns the request. Threaded through so error action
	 * links stay correct for regional / third-party endpoints whose hostname
	 * does not match a provider's canonical host.
	 */
	providerId?: ProviderId;
}

export interface ErrorActionLink {
	labelKey: string;
	url: string;
}

export interface HttpErrorLinkDefinition {
	labelKey: string;
	url: string;
}

export type ApiProviderId = ProviderId;
export type HttpErrorLinkStatusKey = 401 | 402 | '5xx';

export type LlmRequestErrorKind = 'http' | 'network' | 'unknown';

export type NetworkErrorCategory =
	| 'dns'
	| 'unreachable'
	| 'interrupted'
	| 'timeout'
	| 'tls'
	| 'aborted'
	| 'protocol'
	| 'configuration'
	| 'generic';
