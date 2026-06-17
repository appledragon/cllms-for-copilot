import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import vscode from "vscode";
import { PROVIDERS, WELCOME_SHOWN_KEY, MODELS } from "../src/consts";
import { t } from "../src/i18n";
import { activate, deactivate } from "../src/runtime";

interface VscodeShim {
  __state: {
    commands: Map<string, (...args: unknown[]) => unknown>;
    executedCommands: Array<{ command: string; args: unknown[] }>;
    infoMessages: Array<{ message: string; items: unknown[] }>;
    warningMessages: Array<{ message: string; items: unknown[] }>;
    errorMessages: Array<{ message: string; items: unknown[] }>;
    openedExternal: vscode.Uri[];
    uriHandlers: unknown[];
    languageModelProviders: Map<string, vscode.LanguageModelChatProvider>;
    selectChatModelsCalls: unknown[];
    activatedExtensions: string[];
    treeDataProviders: Map<string, unknown>;
    treeViews: Array<{ viewId: string }>;
  };
  __reset(): void;
  __setConfiguration(
    section: string,
    key: string,
    value: unknown,
    target: vscode.ConfigurationTarget,
  ): void;
  __setInputBoxResult(value: string | undefined): void;
  __setMessageResult(value: string | undefined): void;
}

class TestSecretStorage implements vscode.SecretStorage {
  private readonly values = new Map<string, string>();
  private readonly emitter = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>();
  readonly onDidChange = this.emitter.event;

  constructor(initialValues: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initialValues)) {
      this.values.set(key, value);
    }
  }

  keys(): Thenable<string[]> {
    return Promise.resolve([...this.values.keys()]);
  }

  get(key: string): Thenable<string | undefined> {
    return Promise.resolve(this.values.get(key));
  }

  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    this.emitter.fire({ key });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
    this.emitter.fire({ key });
  }
}

class TestMemento implements vscode.Memento {
  private readonly values = new Map<string, unknown>();
  readonly keys: () => readonly string[] = () => [...this.values.keys()];

  constructor(initialValues: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initialValues)) {
      this.values.set(key, value);
    }
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.values.has(key) ? (this.values.get(key) as T) : defaultValue;
  }

  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.values.delete(key);
    } else {
      this.values.set(key, value);
    }
  }

  setKeysForSync(): void {}
}

interface TestContextOptions {
  secrets?: Record<string, string>;
  globalState?: Record<string, unknown>;
}

const shim = vscode as unknown as VscodeShim;
const contexts: vscode.ExtensionContext[] = [];

function createTestContext(options: TestContextOptions = {}): vscode.ExtensionContext {
  const context = {
    subscriptions: [] as vscode.Disposable[],
    secrets: new TestSecretStorage(options.secrets),
    globalState: new TestMemento(options.globalState),
    workspaceState: new TestMemento(),
    globalStorageUri: vscode.Uri.file("/tmp/cllms-for-copilot-test/global-storage"),
    extension: {
      id: "cuilian.cllms-for-copilot",
      extensionKind: 1,
      packageJSON: { version: "0.0.0-test" },
    },
  } as unknown as vscode.ExtensionContext;
  contexts.push(context);
  return context;
}

async function flushAsyncWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function getRegisteredProvider(): vscode.LanguageModelChatProvider {
  const provider = shim.__state.languageModelProviders.get("cllms");
  assert.ok(provider, "expected cllms language model provider to be registered");
  return provider;
}

async function provideModelInfo(
  provider: vscode.LanguageModelChatProvider,
): Promise<vscode.LanguageModelChatInformation[]> {
  const tokenSource = new vscode.CancellationTokenSource();
  try {
    return (
      (await provider.provideLanguageModelChatInformation(
        {} as vscode.PrepareLanguageModelChatModelOptions,
        tokenSource.token,
      )) ?? []
    );
  } finally {
    tokenSource.dispose();
  }
}

function disposeContexts(): void {
  for (const context of contexts.splice(0)) {
    for (const disposable of context.subscriptions) {
      disposable.dispose();
    }
  }
}

describe("runtime integration", () => {
  beforeEach(() => {
    shim.__reset();
  });

  afterEach(async () => {
    await deactivate();
    disposeContexts();
    shim.__reset();
  });

  it("activates diagnostics, action URLs, commands, provider registration, and config migration", async () => {
    shim.__setConfiguration("cllms", "debug", true, vscode.ConfigurationTarget.Global);
    const context = createTestContext({
      secrets: { [PROVIDERS.qwen.apiKeySecret]: "sk-test" },
    });

    await activate(context);
    await flushAsyncWork();

    for (const command of [
      "cllms.showLogs",
      "cllms.openRequestDumpsFolder",
      "cllms.copyDiagnosticReport",
      "cllms.getApiKey",
      "cllms.openSettings",
      "cllms.openProviderSettings",
      "cllms.setupProvider",
      "cllms.setApiKey",
      "cllms.clearApiKey",
      "cllms.setVisionModel",
      "cllms.testConnection",
      "cllms.showSessionCost",
      "cllms.openWalkthrough",
      "cllms.providers.refresh",
      "cllms.providers.setupProvider",
      "cllms.providers.setApiKey",
      "cllms.providers.clearApiKey",
      "cllms.providers.testConnection",
      "cllms.providers.openApiKeyPage",
      "cllms.providers.openUsagePage",
      "cllms.providers.openStatusPage",
      "cllms.providers.openSettings",
    ]) {
      assert.ok(shim.__state.commands.has(command), `${command} should be registered`);
    }
    assert.equal(shim.__state.uriHandlers.length, 1);
    assert.equal(shim.__state.languageModelProviders.has("cllms"), true);
    assert.equal(shim.__state.treeDataProviders.has("cllms.providers"), true);
    assert.ok(
      shim.__state.treeViews.some((view) => view.viewId === "cllms.providers"),
      "cllms.providers tree view should be created",
    );
    assert.deepEqual(shim.__state.activatedExtensions, ["github.copilot-chat"]);
    assert.equal(
      vscode.workspace.getConfiguration("cllms").inspect<boolean>("debug")?.globalValue,
      undefined,
    );
    assert.equal(
      vscode.workspace.getConfiguration("cllms").inspect<string>("debugMode")?.globalValue,
      "metadata",
    );
  });

  it("opens the welcome walkthrough only when no provider key is configured", async () => {
    const context = createTestContext();

    await activate(context);
    await flushAsyncWork();

    assert.ok(
      shim.__state.executedCommands.some(
        (entry) => entry.command === "workbench.action.openWalkthrough",
      ),
    );
    assert.equal(context.globalState.get(WELCOME_SHOWN_KEY), true);
  });

  it("shows keyed models as usable while preserving warnings for unconfigured providers", async () => {
    const context = createTestContext({
      secrets: { [PROVIDERS.qwen.apiKeySecret]: "sk-test" },
    });

    await activate(context);
    await flushAsyncWork();

    assert.equal(
      shim.__state.executedCommands.some(
        (entry) => entry.command === "workbench.action.openWalkthrough",
      ),
      false,
    );

    const infos = await provideModelInfo(getRegisteredProvider());
    const qwenModel = MODELS.find((model) => model.provider === "qwen");
    const zaiModel = MODELS.find((model) => model.provider === "zai");
    assert.ok(qwenModel);
    assert.ok(zaiModel);

    const qwenInfo = infos.find((info) => info.id === qwenModel.id);
    const zaiInfo = infos.find((info) => info.id === zaiModel.id);
    assert.ok(qwenInfo);
    assert.ok(zaiInfo);
    assert.notEqual(qwenInfo.detail, t("auth.apiKeyRequiredDetail"));
    assert.equal(zaiInfo.detail, t("auth.apiKeyRequiredDetail"));
  });

  it("executes key management, connection-test, and session-cost commands through the registered provider", async () => {
    const context = createTestContext({
      globalState: { [WELCOME_SHOWN_KEY]: true },
    });
    await activate(context);
    await flushAsyncWork();

    shim.__setInputBoxResult(" sk-command-test ");
    await vscode.commands.executeCommand("cllms.setApiKey");
    assert.equal(await context.secrets.get(PROVIDERS.qwen.apiKeySecret), "sk-command-test");

    await vscode.commands.executeCommand("cllms.clearApiKey");
    assert.equal(await context.secrets.get(PROVIDERS.qwen.apiKeySecret), undefined);
    assert.ok(
      shim.__state.infoMessages.some((entry) => entry.message.includes(PROVIDERS.qwen.name)),
    );

    await vscode.commands.executeCommand("cllms.testConnection");
    assert.ok(
      shim.__state.warningMessages.some((entry) => entry.message.includes(PROVIDERS.qwen.name)),
    );

    await vscode.commands.executeCommand("cllms.showSessionCost");
    assert.ok(shim.__state.infoMessages.some((entry) => entry.message === t("sessionCost.empty")));
  });

  it("opens the provider API key page from stale connection-test feedback", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: "qwen3-coder-plus" }] }), {
        status: 200,
      })) as typeof fetch;

    try {
      const context = createTestContext({
        secrets: { [PROVIDERS.qwen.apiKeySecret]: "sk-test" },
        globalState: { [WELCOME_SHOWN_KEY]: true },
      });
      await activate(context);
      await flushAsyncWork();

      shim.__setMessageResult(t("connection.action.openApiKeyPage"));
      await vscode.commands.executeCommand("cllms.testConnection");

      assert.ok(
        shim.__state.warningMessages.some((entry) =>
          entry.items.includes(t("connection.action.openApiKeyPage")),
        ),
      );
      assert.equal(shim.__state.openedExternal[0]?.toString(), PROVIDERS.qwen.externalUrls.apiKeys);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("deactivate hides registered models and refreshes the host model picker", async () => {
    const context = createTestContext({
      secrets: { [PROVIDERS.qwen.apiKeySecret]: "sk-test" },
    });
    await activate(context);
    await flushAsyncWork();
    const provider = getRegisteredProvider();

    assert.ok((await provideModelInfo(provider)).length > 0);

    await deactivate();

    assert.deepEqual(await provideModelInfo(provider), []);
    assert.deepEqual(shim.__state.selectChatModelsCalls, []);
  });
});
