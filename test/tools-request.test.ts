import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import { prepareRequestTools } from "../src/provider/tools/request";

function tool(name: string): vscode.LanguageModelChatTool {
  return {
    name,
    description: "",
    inputSchema: undefined,
  } as unknown as vscode.LanguageModelChatTool;
}

function options(
  tools: vscode.LanguageModelChatTool[],
): vscode.ProvideLanguageModelChatResponseOptions {
  return { tools } as unknown as vscode.ProvideLanguageModelChatResponseOptions;
}

describe("prepareRequestTools sortForCache", () => {
  it("preserves the host-provided order by default", () => {
    const tools = prepareRequestTools(true, options([tool("c"), tool("a"), tool("b")]), false);
    assert.deepEqual(
      tools?.map((entry) => entry.function.name),
      ["c", "a", "b"],
    );
  });

  it("sorts tools alphabetically by name when enabled", () => {
    const tools = prepareRequestTools(true, options([tool("c"), tool("a"), tool("b")]), true);
    assert.deepEqual(
      tools?.map((entry) => entry.function.name),
      ["a", "b", "c"],
    );
  });

  it("leaves tools undefined when the model cannot call tools", () => {
    assert.equal(prepareRequestTools(false, options([tool("a")]), true), undefined);
  });
});
