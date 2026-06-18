import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import vscode from "vscode";
import { getProvidersViewHtml } from "../src/view/providers/html";
import { buildProvidersViewState, type ProvidersViewState } from "../src/view/providers/state";
import { ProvidersWebviewViewProvider } from "../src/view/providers/view";
import type { ProviderConnectivity, ProviderId } from "../src/types";

interface VscodeShim {
  __state: {
    commands: Map<string, (...args: unknown[]) => unknown>;
    executedCommands: Array<{ command: string; args: unknown[] }>;
  };
  __reset(): void;
}

interface FakeWebviewView {
  readonly view: vscode.WebviewView;
  readonly webview: vscode.Webview & {
    html: string;
    options: vscode.WebviewOptions | undefined;
  };
  readonly postedMessages: unknown[];
  fireMessage(message: unknown): void;
  fireVisibility(): void;
  dispose(): void;
}

const shim = vscode as unknown as VscodeShim;

describe("ProvidersWebviewViewProvider", () => {
  beforeEach(() => {
    shim.__reset();
    (vscode.env as { language: string }).language = "en";
  });

  it("renders the initial HTML and posts refreshed state", async () => {
    let configuredQwen = true;
    const refreshEmitter = new vscode.EventEmitter<void>();
    const provider = new ProvidersWebviewViewProvider(
      async () => new Map<ProviderId, boolean>([["qwen", configuredQwen]]),
      refreshEmitter.event,
    );
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    await flushAsyncWork();

    assert.equal(fake.webview.options?.enableScripts, true);
    assert.deepEqual(fake.webview.options?.localResourceRoots, []);
    assert.match(fake.webview.html, /Content-Security-Policy/);

    configuredQwen = false;
    refreshEmitter.fire();
    await flushAsyncWork();

    const stateMessage = fake.postedMessages.at(-1) as
      | { type?: string; value?: ProvidersViewState }
      | undefined;
    assert.equal(stateMessage?.type, "state");
    assert.equal(
      stateMessage?.value?.providers.find((entry) => entry.id === "qwen")?.configured,
      false,
    );
  });

  it("dispatches provider-scoped and global webview actions to commands", async () => {
    const calls: unknown[][] = [];
    vscode.commands.registerCommand("cllms.providers.testConnection", (...args: unknown[]) => {
      calls.push(args);
    });
    vscode.commands.registerCommand("cllms.openSettings", (...args: unknown[]) => {
      calls.push(["settings", ...args]);
    });
    const provider = new ProvidersWebviewViewProvider(async () => new Map(), noOpEvent);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    await flushAsyncWork();
    fake.fireMessage({ type: "testConnection", providerId: "qwen" });
    fake.fireMessage({ type: "openSettings" });
    await flushAsyncWork();

    assert.deepEqual(calls, [[{ kind: "provider", providerId: "qwen" }], ["settings"]]);
  });

  it("ignores malformed messages and invalid provider ids", async () => {
    let providerCommandCalls = 0;
    vscode.commands.registerCommand("cllms.providers.testConnection", () => {
      providerCommandCalls += 1;
    });
    const provider = new ProvidersWebviewViewProvider(async () => new Map(), noOpEvent);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    await flushAsyncWork();
    fake.fireMessage(undefined);
    fake.fireMessage({ type: 123 });
    fake.fireMessage({ type: "testConnection" });
    fake.fireMessage({ type: "testConnection", providerId: "missing" });
    fake.fireMessage({ type: "unknownAction", providerId: "qwen" });
    await flushAsyncWork();

    assert.equal(providerCommandCalls, 0);
    assert.equal(
      shim.__state.executedCommands.some(
        (entry) => entry.command === "cllms.providers.testConnection",
      ),
      false,
    );
  });

  it("posts an error phase when provider state resolution fails", async () => {
    const provider = new ProvidersWebviewViewProvider(async () => {
      throw new Error("boom");
    }, noOpEvent);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    await flushAsyncWork();

    const stateMessage = fake.postedMessages.at(-1) as
      | { type?: string; value?: ProvidersViewState }
      | undefined;
    assert.equal(stateMessage?.type, "state");
    assert.equal(stateMessage?.value?.phase, "error");
    assert.ok((stateMessage?.value?.errorMessage ?? "").length > 0);
  });

  it("handles refresh messages from the webview", async () => {
    const provider = new ProvidersWebviewViewProvider(
      async () => new Map<ProviderId, boolean>([["zai", true]]),
      noOpEvent,
    );
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    await flushAsyncWork();
    fake.fireMessage({ type: "refresh" });
    await flushAsyncWork();

    const stateMessage = fake.postedMessages.at(-1) as
      | { type?: string; value?: ProvidersViewState }
      | undefined;
    assert.equal(stateMessage?.type, "state");
    assert.equal(
      stateMessage?.value?.providers.find((entry) => entry.id === "zai")?.configured,
      true,
    );
  });
});

describe("getProvidersViewHtml", () => {
  beforeEach(() => {
    shim.__reset();
    (vscode.env as { language: string }).language = "en";
  });

  it("uses nonce-only CSP for inline style and script", () => {
    const html = getProvidersViewHtml(createFakeWebviewView().webview, {
      providers: [],
    });
    const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1];
    const styleNonce = html.match(/<style nonce="([^"]+)">/)?.[1];
    const scriptNonce = html.match(/<script nonce="([^"]+)">/)?.[1];

    assert.ok(csp);
    assert.ok(styleNonce);
    assert.ok(scriptNonce);
    assert.equal(styleNonce, scriptNonce);
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, new RegExp(`style-src 'nonce-${escapeRegExp(styleNonce)}'`));
    assert.match(csp, new RegExp(`script-src 'nonce-${escapeRegExp(scriptNonce)}'`));
    assert.equal(csp.includes("unsafe-inline"), false);
  });

  it("includes the icon sprite, summary, and view-state regions", () => {
    const html = getProvidersViewHtml(createFakeWebviewView().webview, { providers: [] });

    assert.match(html, /class="icon-sprite"/);
    assert.match(html, /<symbol id="i-key"/);
    assert.match(html, /id="summary"/);
    assert.match(html, /id="view-state"/);
    assert.equal(html.includes("global-actions"), false);
  });

  it("escapes provider state before embedding it in script JSON", () => {
    const state: ProvidersViewState = {
      providers: [
        {
          id: "qwen",
          name: "<Provider>",
          configured: false,
          statusKind: "not-configured",
          endpoint: "https://example.test/<endpoint>",
          statusLabel: "not <configured>",
          models: [
            {
              id: "malicious-model",
              name: "</script><script>alert(1)</script>",
              detail: "line\u2028separator",
              tooltip: "tip\u2029separator",
              vision: true,
              thinking: false,
            },
          ],
        },
      ],
    };

    const html = getProvidersViewHtml(createFakeWebviewView().webview, state);

    assert.equal(html.includes("</script><script>alert(1)</script>"), false);
    assert.match(html, /\\u003cProvider>/);
    assert.match(html, /\\u003cendpoint>/);
    assert.match(html, /\\u003c\/script>\\u003cscript>alert\(1\)\\u003c\/script>/);
    assert.match(html, /line\\u2028separator/);
    assert.match(html, /tip\\u2029separator/);
  });
});

describe("buildProvidersViewState", () => {
  beforeEach(() => {
    shim.__reset();
    (vscode.env as { language: string }).language = "en";
  });

  it("derives status kind from key presence and connectivity", () => {
    const state = buildProvidersViewState(
      new Map<ProviderId, boolean>([
        ["qwen", true],
        ["zai", true],
        ["hunyuan", true],
        ["minimax", false],
      ]),
      new Map<ProviderId, ProviderConnectivity>([
        ["qwen", "ok"],
        ["zai", "error"],
      ]),
    );
    const byId = (id: ProviderId) => state.providers.find((entry) => entry.id === id);

    assert.equal(state.phase, "ready");
    assert.equal(byId("qwen")?.statusKind, "ok");
    assert.equal(byId("zai")?.statusKind, "error");
    assert.equal(byId("hunyuan")?.statusKind, "configured");
    assert.equal(byId("minimax")?.statusKind, "not-configured");
    assert.equal(state.configuredCount, 3);
    assert.equal(state.totalCount, state.providers.length);
  });
});

const noOpEvent: vscode.Event<void> = () => ({ dispose() {} });

function createFakeWebviewView(): FakeWebviewView {
  const messageEmitter = new vscode.EventEmitter<unknown>();
  const visibilityEmitter = new vscode.EventEmitter<void>();
  const disposeEmitter = new vscode.EventEmitter<void>();
  const postedMessages: unknown[] = [];
  const webview = {
    html: "",
    options: undefined,
    cspSource: "vscode-resource:",
    onDidReceiveMessage: messageEmitter.event,
    postMessage: async (message: unknown) => {
      postedMessages.push(message);
      return true;
    },
    asWebviewUri: (uri: vscode.Uri) => uri,
  } as unknown as FakeWebviewView["webview"];
  const view = {
    webview,
    visible: true,
    onDidChangeVisibility: visibilityEmitter.event,
    onDidDispose: disposeEmitter.event,
    show: () => {},
  } as unknown as vscode.WebviewView;

  return {
    view,
    webview,
    postedMessages,
    fireMessage(message: unknown) {
      messageEmitter.fire(message);
    },
    fireVisibility() {
      visibilityEmitter.fire();
    },
    dispose() {
      disposeEmitter.fire();
      messageEmitter.dispose();
      visibilityEmitter.dispose();
      disposeEmitter.dispose();
    },
  };
}

async function flushAsyncWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
