import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import vscode from "vscode";
import { MODELS, PROVIDERS } from "../src/consts";
import { t } from "../src/i18n";
import type { ProviderId } from "../src/types";
import { ProvidersTreeDataProvider, type ProvidersNode } from "../src/view/providersTree";

function createTree(states: Partial<Record<ProviderId, boolean>> = {}): {
  tree: ProvidersTreeDataProvider;
  refresh: vscode.EventEmitter<void>;
} {
  const refresh = new vscode.EventEmitter<void>();
  const keyStates = new Map<ProviderId, boolean>(
    (Object.keys(PROVIDERS) as ProviderId[]).map((id) => [id, states[id] ?? false]),
  );
  const tree = new ProvidersTreeDataProvider(async () => keyStates, refresh.event);
  return { tree, refresh };
}

describe("ProvidersTreeDataProvider", () => {
  beforeEach(() => {
    (vscode.env as { language: string }).language = "en";
  });

  it("lists every provider as a collapsible row at the root", async () => {
    const { tree } = createTree();
    const rows = await tree.getChildren();

    assert.equal(rows.length, Object.keys(PROVIDERS).length);
    for (const node of rows) {
      assert.equal(node.kind, "provider");
      const item = tree.getTreeItem(node);
      assert.equal(item.contextValue, "cllmsProvider");
      assert.equal(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    }
  });

  it("reflects configured / unconfigured key status with distinct icons", async () => {
    const { tree } = createTree({ qwen: true });
    // Populate the key-state snapshot before reading tree items.
    await tree.getChildren();

    const configured = tree.getTreeItem({ kind: "provider", providerId: "qwen" });
    const unconfigured = tree.getTreeItem({ kind: "provider", providerId: "zai" });

    assert.equal(configured.description, t("auth.providerConfigured"));
    assert.equal(unconfigured.description, t("auth.providerNotConfigured"));
    assert.equal((configured.iconPath as vscode.ThemeIcon).id, "pass");
    assert.equal((unconfigured.iconPath as vscode.ThemeIcon).id, "warning");
  });

  it("expands a provider node to exactly its models", async () => {
    const { tree } = createTree();
    const providerNode: ProvidersNode = { kind: "provider", providerId: "qwen" };

    const children = await tree.getChildren(providerNode);
    const expected = MODELS.filter((model) => model.provider === "qwen").map((model) => model.id);
    const actual = children.map((node) => (node.kind === "model" ? node.modelId : ""));

    assert.deepEqual(actual, expected);
    for (const node of children) {
      const item = tree.getTreeItem(node);
      assert.equal(item.contextValue, "cllmsModel");
      assert.equal(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    }
  });

  it("returns no children for a model node", async () => {
    const { tree } = createTree();
    const modelNode: ProvidersNode = {
      kind: "model",
      providerId: "qwen",
      modelId: MODELS[0].id,
    };
    assert.deepEqual(await tree.getChildren(modelNode), []);
  });

  it("fires onDidChangeTreeData when the refresh event is raised", () => {
    const { tree, refresh } = createTree();
    let fired = 0;
    const subscription = tree.onDidChangeTreeData(() => {
      fired += 1;
    });

    refresh.fire();
    tree.refresh();

    assert.equal(fired, 2);
    subscription.dispose();
  });
});
