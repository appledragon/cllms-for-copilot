import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getNetworkErrorCategory,
  getNetworkErrorCauseInfo,
  getNetworkErrorCode,
  getNetworkErrorMessage,
} from "../src/client/error/network";

describe("getNetworkErrorCategory", () => {
  it("classifies well-known errno codes", () => {
    assert.equal(getNetworkErrorCategory("ENOTFOUND"), "dns");
    assert.equal(getNetworkErrorCategory("ECONNREFUSED"), "unreachable");
    assert.equal(getNetworkErrorCategory("ECONNRESET"), "interrupted");
    assert.equal(getNetworkErrorCategory("ETIMEDOUT"), "timeout");
    assert.equal(getNetworkErrorCategory("CERT_HAS_EXPIRED"), "tls");
    assert.equal(getNetworkErrorCategory("ABORT_ERR"), "aborted");
    assert.equal(getNetworkErrorCategory("ERR_INVALID_URL"), "configuration");
  });

  it("classifies by prefix for unlisted TLS/protocol codes", () => {
    assert.equal(getNetworkErrorCategory("ERR_TLS_SOMETHING_NEW"), "tls");
    assert.equal(getNetworkErrorCategory("ERR_SSL_WEIRD"), "tls");
    assert.equal(getNetworkErrorCategory("HPE_INVALID_HEADER_TOKEN"), "protocol");
  });

  it("falls back to generic for unknown or missing codes", () => {
    assert.equal(getNetworkErrorCategory("SOMETHING_ELSE"), "generic");
    assert.equal(getNetworkErrorCategory(undefined), "generic");
  });
});

describe("getNetworkErrorCode", () => {
  it("prefers code over name", () => {
    assert.equal(
      getNetworkErrorCode({ code: "ENOTFOUND", name: "Error", value: "{}" }),
      "ENOTFOUND",
    );
  });

  it("falls back to name when code is missing", () => {
    assert.equal(getNetworkErrorCode({ name: "AbortError", value: "{}" }), "AbortError");
  });

  it("returns undefined when neither is present", () => {
    assert.equal(getNetworkErrorCode(undefined), undefined);
    assert.equal(getNetworkErrorCode({ value: "{}" }), undefined);
  });
});

describe("getNetworkErrorMessage", () => {
  it("embeds the code and selects the matching category text", () => {
    assert.match(getNetworkErrorMessage("ENOTFOUND"), /^\[ENOTFOUND\] DNS lookup failed/);
    assert.match(getNetworkErrorMessage("ETIMEDOUT"), /^\[ETIMEDOUT\] Connection timed out/);
    assert.match(
      getNetworkErrorMessage("CERT_HAS_EXPIRED"),
      /TLS\/certificate verification failed/,
    );
  });

  it("uses UNKNOWN and the generic message when no code is given", () => {
    assert.match(getNetworkErrorMessage(undefined), /^\[UNKNOWN\] Network request failed/);
  });
});

describe("getNetworkErrorCauseInfo", () => {
  it("extracts code from an Error cause", () => {
    const error = new Error("fetch failed");
    (error as Error & { cause?: unknown }).cause = Object.assign(new Error("getaddrinfo"), {
      code: "ENOTFOUND",
    });

    const info = getNetworkErrorCauseInfo(error);

    assert.ok(info);
    assert.equal(info?.code, "ENOTFOUND");
  });

  it("extracts code from a plain object cause", () => {
    const error = new Error("fetch failed");
    (error as Error & { cause?: unknown }).cause = { code: "ECONNREFUSED", name: "Error" };

    const info = getNetworkErrorCauseInfo(error);

    assert.equal(info?.code, "ECONNREFUSED");
  });

  it("returns undefined when there is no cause", () => {
    assert.equal(getNetworkErrorCauseInfo(new Error("no cause")), undefined);
  });
});
