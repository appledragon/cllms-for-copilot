import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	LlmRequestError,
	createHttpError,
	createUserFacingError,
	normalizeRequestError,
	parseRetryAfterMs,
	setErrorActionUrl,
} from '../src/client/error';
import type { RequestErrorContext } from '../src/client/types';

function mockResponse(opts: {
	status: number;
	statusText?: string;
	retryAfter?: string;
	body?: string;
}): Response {
	return {
		status: opts.status,
		statusText: opts.statusText ?? '',
		headers: {
			get: (name: string) =>
				name.toLowerCase() === 'retry-after' ? (opts.retryAfter ?? null) : null,
		},
		text: async () => opts.body ?? '',
	} as unknown as Response;
}

const context: RequestErrorContext = {
	baseUrl: 'https://example.com/v1',
	providerId: 'qwen',
	request: { model: 'qwen3-max', messages: [{ role: 'user', content: 'hi' }], stream: true },
};

const moonshotContext: RequestErrorContext = {
	...context,
	baseUrl: 'https://api.moonshot.ai/v1',
	providerId: 'moonshot-intl',
	request: {
		model: 'kimi-k2.6',
		messages: [{ role: 'user', content: 'hi' }],
		stream: true,
	},
};

describe('parseRetryAfterMs', () => {
	it('returns undefined for empty values', () => {
		assert.equal(parseRetryAfterMs(null), undefined);
		assert.equal(parseRetryAfterMs(undefined), undefined);
		assert.equal(parseRetryAfterMs(''), undefined);
		assert.equal(parseRetryAfterMs('   '), undefined);
	});

	it('parses positive delta-seconds into milliseconds', () => {
		assert.equal(parseRetryAfterMs('30'), 30_000);
		assert.equal(parseRetryAfterMs('  120  '), 120_000);
	});

	it('rejects zero and non-numeric tokens', () => {
		assert.equal(parseRetryAfterMs('0'), undefined);
		assert.equal(parseRetryAfterMs('abc'), undefined);
		assert.equal(parseRetryAfterMs('-5'), undefined);
	});

	it('parses an HTTP-date in the future as a positive delay', () => {
		const future = new Date(Date.now() + 60_000).toUTCString();
		const ms = parseRetryAfterMs(future);
		assert.ok(ms !== undefined && ms > 1_000 && ms <= 60_000, `expected ~60s, got ${ms}`);
	});

	it('treats a past HTTP-date as no delay', () => {
		const past = new Date(Date.now() - 60_000).toUTCString();
		assert.equal(parseRetryAfterMs(past), undefined);
	});
});

describe('createHttpError', () => {
	it('maps a 401 to an authentication summary with a create-key link', async () => {
		const error = await createHttpError(mockResponse({ status: 401 }), context);
		assert.ok(error instanceof LlmRequestError);
		assert.equal(error.kind, 'http');
		assert.equal(error.status, 401);
		assert.equal(error.code, 'HTTP_401');
		assert.equal(error.providerId, 'qwen');
		assert.match(error.userSummary, /^\[401\]/);
		assert.match(error.userSummary, /Authentication failed/);
		// Provider is known, so the summary embeds an actionable create-key URL.
		assert.match(error.userSummary, /\(https:\/\//);
	});

	it('maps a 500 to a server-error summary', async () => {
		const error = await createHttpError(mockResponse({ status: 500 }), context);
		assert.equal(error.status, 500);
		assert.equal(error.code, 'HTTP_500');
		assert.match(error.userSummary, /^\[500\]/);
	});

	it('extracts Retry-After seconds into retryAfterMs', async () => {
		const error = await createHttpError(
			mockResponse({ status: 429, retryAfter: '120' }),
			context,
		);
		assert.equal(error.status, 429);
		assert.equal(error.retryAfterMs, 120_000);
	});

	it('omits retryAfterMs when no Retry-After header is present', async () => {
		const error = await createHttpError(mockResponse({ status: 429 }), context);
		assert.equal(error.retryAfterMs, undefined);
	});

	it('treats provider quota failures returned as 429 differently from rate limits', async () => {
		const error = await createHttpError(
			mockResponse({
				status: 429,
				statusText: 'Too Many Requests',
				body: JSON.stringify({
					error: {
						message:
							'Your account org-3306a83330bd45eb94d6304a110349cf <ak-fam9mkb3xufi11cfznsi> is suspended due to insufficient balance, please recharge your account or check your plan and billing details',
						type: 'exceeded_current_quota_error',
					},
				}),
			}),
			moonshotContext,
		);

		assert.equal(error.status, 429);
		assert.equal(error.code, 'HTTP_429_QUOTA');
		assert.match(error.userSummary, /balance or current quota is insufficient/);
		assert.doesNotMatch(error.userSummary, /sending requests too quickly/);
		assert.match(error.userSummary, /Provider message:/);
		assert.match(error.userSummary, /org-\.\.\.redacted/);
		assert.match(error.userSummary, /ak-\.\.\.redacted/);
		assert.doesNotMatch(error.diagnosticMessage, /org-3306a83330bd45eb94d6304a110349cf/);
		assert.doesNotMatch(error.diagnosticMessage, /ak-fam9mkb3xufi11cfznsi/);

		setErrorActionUrl('showLogs', 'command:cllms.showLogs');
		const display = createUserFacingError(error);
		assert.match(display.message, /Usage/);
		assert.match(display.message, /Error Details/);
	});
});

describe('createUserFacingError', () => {
	it('renders the summary with markdown action links for HTTP errors', () => {
		setErrorActionUrl('configureApiKey', 'command:cllms.configureApiKey');
		setErrorActionUrl('showLogs', 'command:cllms.showLogs');
		const httpError = new LlmRequestError({
			message: 'API request failed with HTTP 401',
			userSummary: '[401] Authentication failed.',
			kind: 'http',
			status: 401,
			providerId: 'qwen',
		});

		const display = createUserFacingError(httpError);

		assert.match(display.message, /\[401\] Authentication failed\./);
		assert.match(display.message, /Set API Key/);
		assert.match(display.message, /Error Details/);
		assert.equal(display.stack, undefined);
	});

	it('passes through plain Error messages unchanged', () => {
		const display = createUserFacingError(new Error('boom'));
		assert.equal(display.message, 'boom');
	});
});

describe('normalizeRequestError', () => {
	it('returns the same LlmRequestError instance', async () => {
		const httpError = await createHttpError(mockResponse({ status: 500 }), context);
		assert.equal(normalizeRequestError(httpError, context), httpError);
	});

	it('wraps a network cause into a network LlmRequestError', () => {
		const raw = new Error('fetch failed');
		(raw as Error & { cause?: unknown }).cause = { code: 'ENOTFOUND' };

		const normalized = normalizeRequestError(raw, context);

		assert.ok(normalized instanceof LlmRequestError);
		assert.equal((normalized as LlmRequestError).kind, 'network');
		assert.equal((normalized as LlmRequestError).code, 'ENOTFOUND');
		assert.match((normalized as LlmRequestError).userSummary, /DNS lookup failed/);
	});

	it('passes through a plain Error without a network cause', () => {
		const raw = new Error('totally unrelated');
		assert.equal(normalizeRequestError(raw, context), raw);
	});
});
