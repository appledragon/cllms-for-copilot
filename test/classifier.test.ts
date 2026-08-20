import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vscode from "vscode";
import {
  ClassificationStats,
  classifyLlmRequest,
  classifyLlmRequestDetailed,
  classifyProviderRequest,
  classifyProviderRequestDetailed,
  formatModelFields,
  formatRequestLogLine,
  isFallbackClassification,
  isUtilityRequestKind,
  shouldForceThinkingNone,
} from "../src/provider/routing/classifier";
import type { LlmRequest } from "../src/types";

const UTILITY_KINDS = [
  "todo-tracker",
  "prompt-categorizer",
  "settings-resolver",
  "chat-title",
  "inline-progress-message",
  "git-branch-name",
  "git-commit-message",
  "rename-suggestions",
] as const;

function userMessage(text: string): vscode.LanguageModelChatRequestMessage {
  return {
    role: vscode.LanguageModelChatMessageRole.User,
    content: [new vscode.LanguageModelTextPart(text)],
  } as unknown as vscode.LanguageModelChatRequestMessage;
}

function tool(name: string): vscode.LanguageModelChatTool {
  return {
    name,
    description: "",
    inputSchema: undefined,
  } as unknown as vscode.LanguageModelChatTool;
}

function llmRequest(firstText: string, latestUserText = firstText): LlmRequest {
  return {
    model: "qwen3.7-max",
    stream: true,
    messages: [
      { role: "system", content: firstText },
      { role: "user", content: latestUserText },
    ],
  };
}

describe("classifyProviderRequest", () => {
  it("detects the main agent system prompt", () => {
    const messages = [
      userMessage("You are an expert AI programming assistant working in VS Code."),
    ];
    assert.equal(classifyProviderRequest({ messages }), "main-agent");
  });

  it("detects the todo tracker by its sole tool", () => {
    const messages = [userMessage("whatever")];
    assert.equal(
      classifyProviderRequest({ messages, tools: [tool("manage_todo_list")] }),
      "todo-tracker",
    );
  });

  it("detects the prompt categorizer by prefix", () => {
    const messages = [
      userMessage("You are an expert classifier for AI coding assistant prompts and more."),
    ];
    assert.equal(classifyProviderRequest({ messages }), "prompt-categorizer");
  });

  it("detects terminal steering from the latest user message", () => {
    const messages = [
      userMessage("You are an expert AI programming assistant"),
      userMessage("[Terminal abc123 notification: command finished]"),
    ];
    assert.equal(classifyProviderRequest({ messages }), "terminal-steering");
  });

  it("falls back to background when a tool is present but no prompt matches", () => {
    const messages = [userMessage("do something")];
    assert.equal(classifyProviderRequest({ messages, tools: [tool("read_file")] }), "background");
  });

  it("returns unknown for an empty request", () => {
    assert.equal(classifyProviderRequest({ messages: [] }), "unknown");
  });
});

describe("classifyLlmRequest", () => {
  it("classifies from the API-shaped request messages", () => {
    assert.equal(
      classifyLlmRequest({
        request: llmRequest("You are an expert AI programming assistant."),
      }),
      "main-agent",
    );
  });

  it("detects git commit message generation", () => {
    assert.equal(
      classifyLlmRequest({
        request: llmRequest(
          "You are an AI programming assistant, helping a software developer to come with the best git commit message",
        ),
      }),
      "git-commit-message",
    );
  });

  it("detects terminal steering via the latest user text", () => {
    assert.equal(
      classifyLlmRequest({
        request: llmRequest(
          "You are an expert AI programming assistant.",
          "[Terminal t1 notification: build done]",
        ),
      }),
      "terminal-steering",
    );
  });
});

describe("classifier helpers", () => {
  it("forces thinking off only for lightweight request kinds", () => {
    assert.equal(shouldForceThinkingNone("todo-tracker"), true);
    assert.equal(shouldForceThinkingNone("chat-title"), true);
    assert.equal(shouldForceThinkingNone("main-agent"), false);
    assert.equal(shouldForceThinkingNone("background"), false);
  });

  it("formats model fields, hiding redundant api model ids", () => {
    assert.equal(formatModelFields("qwen3.7-max"), "model=qwen3.7-max");
    assert.equal(formatModelFields("qwen3.7-max", "qwen3.7-max"), "model=qwen3.7-max");
    assert.equal(
      formatModelFields("qwen3.7-max", "qwen-max-latest"),
      "model=qwen3.7-max apiModel=qwen-max-latest",
    );
  });

  it("prefixes log lines with the request kind", () => {
    assert.equal(formatRequestLogLine("main-agent", "hello"), "[main-agent] hello");
  });
});

describe("classification reasons (for diagnostics)", () => {
  it("explains a main-agent match", () => {
    const messages = [
      userMessage("You are an expert AI programming assistant working in VS Code."),
    ];
    const result = classifyProviderRequestDetailed({ messages });
    assert.equal(result.kind, "main-agent");
    assert.equal(result.reason, "systemPrompt:main-agent");
    assert.ok(
      result.source && result.source.length > 0,
      "matched rule should carry a source annotation",
    );
  });

  it("explains a todo-tracker match by its sole tool", () => {
    const result = classifyProviderRequestDetailed({
      messages: [userMessage("whatever")],
      tools: [tool("manage_todo_list")],
    });
    assert.equal(result.kind, "todo-tracker");
    assert.equal(result.reason, "tool:manage_todo_list");
  });

  it("explains a terminal-steering match from the latest user turn", () => {
    const result = classifyLlmRequestDetailed({
      request: llmRequest(
        "You are an expert AI programming assistant.",
        "[Terminal t1 notification: build done]",
      ),
    });
    assert.equal(result.kind, "terminal-steering");
    assert.equal(result.reason, "latestUser:terminal-notification");
  });

  it("explains the empty-request fallback", () => {
    const result = classifyProviderRequestDetailed({ messages: [] });
    assert.equal(result.kind, "unknown");
    assert.equal(result.reason, "fallback:empty-request");
  });

  it("keeps reasons free of raw prompt content", () => {
    const secret = "You are an expert AI programming assistant. SECRET-TOKEN-12345";
    const result = classifyProviderRequestDetailed({ messages: [userMessage(secret)] });
    assert.ok(!result.reason.includes("SECRET-TOKEN-12345"), "reason must not leak prompt text");
  });
});

describe("cost tiers", () => {
  it("annotates utility kinds with costTier=utility", () => {
    const result = classifyProviderRequestDetailed({
      messages: [userMessage("whatever")],
      tools: [tool("manage_todo_list")],
    });
    assert.equal(result.kind, "todo-tracker");
    assert.equal(result.costTier, "utility");
  });

  it("annotates agent and unknown kinds with costTier=agent", () => {
    const main = classifyProviderRequestDetailed({
      messages: [userMessage("You are an expert AI programming assistant working in VS Code.")],
    });
    assert.equal(main.costTier, "agent");
    const unknown = classifyProviderRequestDetailed({ messages: [] });
    assert.equal(unknown.costTier, "agent");
  });

  it("isUtilityRequestKind matches utility-tier kinds only", () => {
    for (const kind of UTILITY_KINDS) {
      assert.equal(isUtilityRequestKind(kind), true, `${kind} should be utility`);
    }
    for (const kind of ["main-agent", "terminal-steering", "background", "unknown"] as const) {
      assert.equal(isUtilityRequestKind(kind), false, `${kind} should not be utility`);
    }
  });

  it("keeps the utility tier aligned with the forced-thinking-off kinds", () => {
    for (const kind of UTILITY_KINDS) {
      assert.equal(shouldForceThinkingNone(kind), true, `${kind} should force thinking off`);
    }
  });
});

describe("isFallbackClassification", () => {
  it("flags unknown and background fallbacks", () => {
    assert.equal(isFallbackClassification(classifyProviderRequestDetailed({ messages: [] })), true);
    assert.equal(
      isFallbackClassification(
        classifyProviderRequestDetailed({
          messages: [userMessage("do the thing")],
          tools: [tool("read_file")],
        }),
      ),
      true,
    );
  });

  it("does not flag a recognized main-agent turn", () => {
    assert.equal(
      isFallbackClassification(
        classifyProviderRequestDetailed({
          messages: [userMessage("You are an expert AI programming assistant working in VS Code.")],
        }),
      ),
      false,
    );
  });
});

describe("ClassificationStats", () => {
  it("tracks total, fallback count, and fallback rate", () => {
    const stats = new ClassificationStats();
    stats.record(
      classifyProviderRequestDetailed({
        messages: [userMessage("You are an expert AI programming assistant working in VS Code.")],
      }),
    );
    stats.record(classifyProviderRequestDetailed({ messages: [] }));
    stats.record(
      classifyProviderRequestDetailed({
        messages: [userMessage("do the thing")],
        tools: [tool("read_file")],
      }),
    );

    const summary = stats.getSummary();
    assert.equal(summary.total, 3);
    assert.equal(summary.fallback, 2);
    assert.ok(Math.abs(summary.fallbackRate - (2 / 3) * 100) < 1e-9);
    assert.equal(summary.byKind.get("main-agent"), 1);
    assert.equal(summary.byKind.get("background"), 1);
    assert.equal(summary.byKind.get("unknown"), 1);
  });

  it("reset clears the counters", () => {
    const stats = new ClassificationStats();
    stats.record(classifyProviderRequestDetailed({ messages: [] }));
    stats.reset();
    assert.equal(stats.getSummary().total, 0);
    assert.equal(stats.getSummary().fallbackRate, 0);
  });
});

describe("unrecognized prompts never force thinking off", () => {
  // Stand-ins for prompts whose wording changed or that we have simply never
  // seen. The invariant under test: an unknown signature must fall back to a
  // thinking-preserving kind, never to a lightweight "force thinking off" one.
  const UNKNOWN_SYSTEM_PROMPTS = [
    "You are a helpful assistant.",
    "You are ChatGPT, a large language model trained by OpenAI.",
    "Summarize the following document in three bullet points.",
    "You are an expert in writing concise pull request descriptions.",
    "Please translate the following text to French.",
    "Réponds en français, tu es un assistant.",
  ];

  for (const prompt of UNKNOWN_SYSTEM_PROMPTS) {
    it(`treats "${prompt.slice(0, 28)}…" as a thinking-preserving kind`, () => {
      const withoutTools = classifyProviderRequestDetailed({ messages: [userMessage(prompt)] });
      const withTools = classifyProviderRequestDetailed({
        messages: [userMessage(prompt)],
        tools: [tool("read_file"), tool("edit_file")],
      });

      assert.equal(
        shouldForceThinkingNone(withoutTools.kind),
        false,
        `unexpectedly throttled: ${prompt}`,
      );
      assert.equal(
        shouldForceThinkingNone(withTools.kind),
        false,
        `unexpectedly throttled: ${prompt}`,
      );
      assert.ok(
        ["main-agent", "background"].includes(withoutTools.kind),
        `expected a fallback kind, got ${withoutTools.kind}`,
      );
    });
  }

  it("treats a tool-only unknown request as background", () => {
    const result = classifyProviderRequestDetailed({
      messages: [userMessage("do the thing")],
      tools: [tool("read_file")],
    });
    assert.equal(result.kind, "background");
    assert.equal(result.reason, "fallback:has-tools");
    assert.equal(shouldForceThinkingNone(result.kind), false);
  });

  it("never forces thinking off for the empty / unknown request", () => {
    assert.equal(shouldForceThinkingNone("unknown"), false);
    assert.equal(shouldForceThinkingNone(classifyProviderRequest({ messages: [] })), false);
  });
});
