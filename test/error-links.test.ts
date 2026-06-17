import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_PROVIDER_HTTP_ERROR_LINKS } from "../src/client/consts";
import type { HttpErrorLinkStatusKey } from "../src/client/types";
import { PROVIDERS } from "../src/consts";

const STATUS_KEYS: readonly HttpErrorLinkStatusKey[] = [401, 402, "5xx"];

describe("provider HTTP error links", () => {
  for (const statusKey of STATUS_KEYS) {
    it(`provides a next-step link for every provider on ${statusKey}`, () => {
      const links = API_PROVIDER_HTTP_ERROR_LINKS[statusKey];
      assert.deepEqual(Object.keys(links).sort(), Object.keys(PROVIDERS).sort());
    });
  }

  it("uses https URLs and namespaced action labels", () => {
    for (const statusKey of STATUS_KEYS) {
      const links = API_PROVIDER_HTTP_ERROR_LINKS[statusKey];
      for (const [providerId, link] of Object.entries(links)) {
        assert.ok(link, `${statusKey} ${providerId} has no link`);
        assert.ok(
          link.url.startsWith("https://"),
          `${statusKey} ${providerId} url should be https: ${link.url}`,
        );
        assert.ok(
          link.labelKey.startsWith("error.action."),
          `${statusKey} ${providerId} labelKey should be a namespaced action key: ${link.labelKey}`,
        );
      }
    }
  });

  it("points 401 links at each provider API-key console", () => {
    for (const [providerId, link] of Object.entries(API_PROVIDER_HTTP_ERROR_LINKS[401])) {
      assert.ok(link, `401 ${providerId} has no link`);
      assert.equal(link.labelKey, "error.action.createApiKey", providerId);
      assert.equal(
        link.url,
        PROVIDERS[providerId as keyof typeof PROVIDERS].externalUrls.apiKeys,
        providerId,
      );
    }
  });
});
