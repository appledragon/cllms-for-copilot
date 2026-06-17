import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SseParser, type SseEvent } from "../src/client/sse";
import type { LlmStreamChunk } from "../src/types";

/** Build a minimal content chunk for tests. */
function contentChunk(content: string): LlmStreamChunk {
  return {
    id: "x",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
}

/** Format a chunk as an SSE `data:` frame terminated with `\n`. */
function frame(chunk: unknown, lineEnding = "\n"): string {
  return `data: ${JSON.stringify(chunk)}${lineEnding}${lineEnding}`;
}

/** Drain a parser across all chunks, then flush. */
function parseAll(parser: SseParser, chunks: string[]): SseEvent[] {
  const events: SseEvent[] = [];
  for (const chunk of chunks) {
    events.push(...parser.push(chunk));
  }
  events.push(...parser.flush());
  return events;
}

describe("SseParser", () => {
  it("parses a single complete data frame into a chunk event", () => {
    const parser = new SseParser();
    const events = parser.push(frame(contentChunk("hello")));
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "chunk");
    assert.equal(
      events[0].type === "chunk" ? events[0].data.choices[0].delta.content : undefined,
      "hello",
    );
  });

  it("emits a done event for the [DONE] sentinel", () => {
    const parser = new SseParser();
    const events = parser.push("data: [DONE]\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "done");
  });

  it("handles the [DONE] sentinel even without a space after data:", () => {
    const parser = new SseParser();
    const events = parser.push("data:[DONE]\n");
    assert.deepEqual(
      events.map((e) => e.type),
      ["done"],
    );
  });

  it("ignores comment lines and blank lines", () => {
    const parser = new SseParser();
    const events = parser.push(
      `: keep-alive ping\n\n: another comment\n${frame(contentChunk("a"))}`,
    );
    assert.deepEqual(
      events.map((e) => e.type),
      ["chunk"],
    );
  });

  it("supports CRLF line endings", () => {
    const parser = new SseParser();
    const events = parseAll(parser, [frame(contentChunk("crlf"), "\r\n")]);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "chunk");
    assert.equal(
      events[0].type === "chunk" ? events[0].data.choices[0].delta.content : undefined,
      "crlf",
    );
  });

  it("reassembles a frame split across multiple push calls", () => {
    const parser = new SseParser();
    const full = frame(contentChunk("split-me"));
    const mid = Math.floor(full.length / 2);

    const first = parser.push(full.slice(0, mid));
    const second = parser.push(full.slice(mid));

    assert.deepEqual(first, []);
    assert.equal(second.length, 1);
    assert.equal(
      second[0].type === "chunk" ? second[0].data.choices[0].delta.content : undefined,
      "split-me",
    );
  });

  it("splits a frame even when broken inside the JSON payload byte-by-byte", () => {
    const parser = new SseParser();
    const full = frame(contentChunk("drip"));
    const events: SseEvent[] = [];
    for (const ch of full) {
      events.push(...parser.push(ch));
    }
    events.push(...parser.flush());
    assert.deepEqual(
      events.map((e) => e.type),
      ["chunk"],
    );
  });

  it("accumulates multi-chunk tool-call argument deltas in order", () => {
    const parser = new SseParser();
    const deltas = [
      {
        id: "x",
        object: "chat.completion.chunk",
        created: 0,
        model: "test",
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                { index: 0, id: "call_1", function: { name: "search", arguments: '{"q":' } },
              ],
            },
            finish_reason: null,
          },
        ],
      },
      {
        id: "x",
        object: "chat.completion.chunk",
        created: 0,
        model: "test",
        choices: [
          {
            index: 0,
            delta: { tool_calls: [{ index: 0, function: { arguments: '"hi"}' } }] },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];

    const events = parseAll(
      parser,
      deltas.map((d) => frame(d)),
    );
    const toolCallEvents = events.filter(
      (e): e is Extract<SseEvent, { type: "chunk" }> => e.type === "chunk",
    );
    assert.equal(toolCallEvents.length, 2);

    // Reassembling the deltas mirrors what the client core does downstream.
    const argParts = toolCallEvents
      .flatMap((e) => e.data.choices[0].delta.tool_calls ?? [])
      .map((tc) => tc.function?.arguments ?? "")
      .join("");
    assert.equal(argParts, '{"q":"hi"}');
    assert.equal(toolCallEvents[1].data.choices[0].finish_reason, "tool_calls");
  });

  it("preserves reasoning_content ordering ahead of content", () => {
    const parser = new SseParser();
    const reasoning: LlmStreamChunk = {
      id: "x",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: { reasoning_content: "thinking…" }, finish_reason: null }],
    };
    const events = parseAll(parser, [frame(reasoning), frame(contentChunk("answer"))]);
    const chunks = events.filter(
      (e): e is Extract<SseEvent, { type: "chunk" }> => e.type === "chunk",
    );
    assert.equal(chunks[0].data.choices[0].delta.reasoning_content, "thinking…");
    assert.equal(chunks[1].data.choices[0].delta.content, "answer");
  });

  it("reports malformed JSON as a parse-error without throwing", () => {
    const parser = new SseParser();
    const events = parser.push("data: {not json}\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "parse-error");
    assert.equal(events[0].type === "parse-error" ? events[0].raw : undefined, "{not json}");
  });

  it("continues parsing valid frames after a malformed one", () => {
    const parser = new SseParser();
    const events = parseAll(parser, [
      "data: {bad}\n\n",
      frame(contentChunk("recovered")),
      "data: [DONE]\n\n",
    ]);
    assert.deepEqual(
      events.map((e) => e.type),
      ["parse-error", "chunk", "done"],
    );
  });

  it("flushes a trailing frame that has no terminating newline", () => {
    const parser = new SseParser();
    const push = parser.push(`data: ${JSON.stringify(contentChunk("tail"))}`);
    assert.deepEqual(push, []);
    const flushed = parser.flush();
    assert.equal(flushed.length, 1);
    assert.equal(flushed[0].type, "chunk");
  });

  it("flush is a no-op when the buffer is empty", () => {
    const parser = new SseParser();
    parser.push(frame(contentChunk("done")));
    assert.deepEqual(parser.flush(), []);
  });
});
