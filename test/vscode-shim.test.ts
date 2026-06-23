import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import vscode from "vscode";

interface VscodeShim {
  EventEmitter: new <T>() => {
    event: (listener: (value: T) => void) => { dispose(): void };
    fire(value: T): void;
  };
  lm: {
    registerTool(name: string, tool: unknown): { dispose(): void };
  };
  __state: {
    lmTools?: Map<string, unknown>;
  };
  __reset(): void;
  __isLoadHookInstalled(): boolean;
}

const shim = vscode as unknown as VscodeShim;

describe("vscode shim hardening", () => {
  afterEach(() => {
    shim.__reset();
  });

  it("keeps dispatching EventEmitter listeners when one throws", () => {
    const emitter = new shim.EventEmitter<number>();
    const received: number[] = [];

    emitter.event(() => {
      throw new Error("listener boom");
    });
    emitter.event((value) => {
      received.push(value);
    });

    assert.doesNotThrow(() => emitter.fire(42));
    assert.deepEqual(received, [42]);
  });

  it("clears lmTools on __reset to prevent cross-test leakage", () => {
    shim.lm.registerTool("test.tool", { execute: () => undefined });
    assert.equal(shim.__state.lmTools?.has("test.tool"), true);

    shim.__reset();

    assert.equal(shim.__state.lmTools?.size ?? 0, 0);
  });

  it("installs the vscode require hook by default", () => {
    assert.equal(shim.__isLoadHookInstalled(), true);
  });
});
