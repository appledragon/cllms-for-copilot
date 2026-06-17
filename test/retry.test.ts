import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { LlmRequestError } from "../src/client/error";
import { getRetryDelayMs, isRetryableError } from "../src/client/retry";

function httpError(status: number): LlmRequestError {
  return new LlmRequestError({ message: "http", kind: "http", status });
}

function networkError(code: string): LlmRequestError {
  return new LlmRequestError({ message: "network", kind: "network", code });
}

describe("isRetryableError", () => {
  it("retries HTTP 429 and 5xx", () => {
    assert.equal(isRetryableError(httpError(429)), true);
    assert.equal(isRetryableError(httpError(500)), true);
    assert.equal(isRetryableError(httpError(503)), true);
  });

  it("does not retry provider quota failures returned as HTTP 429", () => {
    assert.equal(
      isRetryableError(
        new LlmRequestError({
          message: "quota",
          kind: "http",
          status: 429,
          code: "HTTP_429_QUOTA",
        }),
      ),
      false,
    );
  });

  it("does not retry HTTP 4xx auth/quota errors", () => {
    assert.equal(isRetryableError(httpError(400)), false);
    assert.equal(isRetryableError(httpError(401)), false);
    assert.equal(isRetryableError(httpError(402)), false);
  });

  it("retries transient transport network categories", () => {
    assert.equal(isRetryableError(networkError("ECONNRESET")), true); // interrupted
    assert.equal(isRetryableError(networkError("ETIMEDOUT")), true); // timeout
    assert.equal(isRetryableError(networkError("ECONNREFUSED")), true); // unreachable
  });

  it("does not retry persistent network categories", () => {
    assert.equal(isRetryableError(networkError("ENOTFOUND")), false); // dns
    assert.equal(isRetryableError(networkError("CERT_HAS_EXPIRED")), false); // tls
    assert.equal(isRetryableError(networkError("ERR_INVALID_URL")), false); // configuration
  });

  it("does not retry plain (non-LlmRequestError) errors", () => {
    assert.equal(isRetryableError(new Error("boom")), false);
  });
});

describe("getRetryDelayMs", () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("honors Retry-After, capped at the max delay", () => {
    assert.equal(
      getRetryDelayMs(new LlmRequestError({ message: "x", kind: "http", retryAfterMs: 5_000 }), 1),
      5_000,
    );
    // 50s advised delay is clamped to the 20s ceiling.
    assert.equal(
      getRetryDelayMs(new LlmRequestError({ message: "x", kind: "http", retryAfterMs: 50_000 }), 1),
      20_000,
    );
  });

  it("uses full-jitter exponential backoff when no Retry-After is present", () => {
    const error = httpError(500);

    Math.random = () => 0;
    assert.equal(getRetryDelayMs(error, 1), 0);
    assert.equal(getRetryDelayMs(error, 5), 0);

    // random()=1 yields the full exponential ceiling for the attempt.
    Math.random = () => 1;
    assert.equal(getRetryDelayMs(error, 1), 500); // 500 * 2^0
    assert.equal(getRetryDelayMs(error, 2), 1_000); // 500 * 2^1
    assert.equal(getRetryDelayMs(error, 3), 2_000); // 500 * 2^2
  });

  it("clamps the backoff ceiling to the max delay for high attempts", () => {
    Math.random = () => 1;
    // 500 * 2^9 = 256000, clamped to 20000.
    assert.equal(getRetryDelayMs(httpError(500), 10), 20_000);
  });

  it("keeps the jittered delay within [0, ceiling]", () => {
    Math.random = originalRandom;
    for (let i = 0; i < 100; i += 1) {
      const ms = getRetryDelayMs(httpError(500), 3);
      assert.ok(ms >= 0 && ms <= 2_000, `expected 0..2000, got ${ms}`);
    }
  });
});
