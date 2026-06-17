import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import vscode from "vscode";
import { AuthManager } from "../src/auth";
import { PROVIDERS } from "../src/consts";

interface VscodeShim {
  __reset(): void;
  __setInputBoxResult(value: string | undefined): void;
  __state: {
    openedExternal: vscode.Uri[];
    inputBoxes: Array<{ __buttonEmitter: { fire(v: unknown): void } }>;
  };
}

const shim = vscode as unknown as VscodeShim;

/** SecretStorage stub that counts reads so cache hits can be asserted. */
class CountingSecretStorage implements vscode.SecretStorage {
  getCalls = 0;
  storeCalls = 0;
  deleteCalls = 0;
  private readonly values = new Map<string, string>();
  private readonly emitter = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>();
  readonly onDidChange = this.emitter.event;

  get(key: string): Thenable<string | undefined> {
    this.getCalls++;
    return Promise.resolve(this.values.get(key));
  }

  async store(key: string, value: string): Promise<void> {
    this.storeCalls++;
    this.values.set(key, value);
    this.emitter.fire({ key });
  }

  async delete(key: string): Promise<void> {
    this.deleteCalls++;
    this.values.delete(key);
    this.emitter.fire({ key });
  }

  keys(): Thenable<string[]> {
    return Promise.resolve([...this.values.keys()]);
  }
}

function createAuthManager(secrets: CountingSecretStorage): AuthManager {
  const context = { secrets } as unknown as vscode.ExtensionContext;
  return new AuthManager(context);
}

const provider = PROVIDERS.qwen;

describe("AuthManager key-presence cache", () => {
  afterEach(() => shim.__reset());

  it("serves repeated hasApiKey checks from cache after a single read", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    assert.equal(await auth.hasApiKey(provider), false);
    assert.equal(secrets.getCalls, 1);
    // Second and third checks are served from the cache.
    assert.equal(await auth.hasApiKey(provider), false);
    assert.equal(await auth.hasApiKey(provider), false);
    assert.equal(secrets.getCalls, 1);
  });

  it("re-reads SecretStorage after invalidatePresence", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    await auth.hasApiKey(provider);
    assert.equal(secrets.getCalls, 1);

    // Targeted invalidation for one provider.
    auth.invalidatePresence(provider.apiKeySecret);
    await auth.hasApiKey(provider);
    assert.equal(secrets.getCalls, 2);

    // Clear-all invalidation.
    auth.invalidatePresence();
    await auth.hasApiKey(provider);
    assert.equal(secrets.getCalls, 3);
  });

  it("updates the cache on set/delete without an extra read", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    await auth.setApiKey(provider, "  sk-abc  ");
    assert.equal(secrets.storeCalls, 1);
    // Presence is known from the write itself — no SecretStorage read needed.
    assert.equal(await auth.hasApiKey(provider), true);
    assert.equal(secrets.getCalls, 0);

    await auth.deleteApiKey(provider);
    assert.equal(secrets.deleteCalls, 1);
    assert.equal(await auth.hasApiKey(provider), false);
    assert.equal(secrets.getCalls, 0);
  });

  it("trims the key before storing it", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    await auth.setApiKey(provider, "  sk-trim  ");
    assert.equal(await auth.getApiKey(provider), "sk-trim");
  });
});

describe("AuthManager.promptForApiKey", () => {
  afterEach(() => shim.__reset());

  it("stores the entered key and reports success", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    shim.__setInputBoxResult(" sk-typed ");
    const saved = await auth.promptForApiKey(provider);

    assert.equal(saved, true);
    // Presence is cached as a side effect of saving — no read needed. Check
    // this before getApiKey(), which intentionally reads SecretStorage.
    assert.equal(await auth.hasApiKey(provider), true);
    assert.equal(secrets.getCalls, 0);
    assert.equal(await auth.getApiKey(provider), "sk-typed");
  });

  it("returns false when the input box is dismissed", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    shim.__setInputBoxResult(undefined);
    const saved = await auth.promptForApiKey(provider);

    assert.equal(saved, false);
    assert.equal(await auth.getApiKey(provider), undefined);
  });

  it("opens the provider API key page when the input-box button is triggered", async () => {
    const secrets = new CountingSecretStorage();
    const auth = createAuthManager(secrets);

    shim.__setInputBoxResult(" sk-after-link ");
    const pending = auth.promptForApiKey(provider);
    // The shim records the created input box; fire its title-bar button.
    const input = shim.__state.inputBoxes.at(-1);
    assert.ok(input, "expected an input box to be created");
    input.__buttonEmitter.fire({ iconPath: undefined });

    assert.equal(await pending, true);
    assert.equal(shim.__state.openedExternal[0]?.toString(), provider.externalUrls.apiKeys);
  });
});
