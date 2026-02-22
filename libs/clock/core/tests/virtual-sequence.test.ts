/**
 * VirtualSequenceGenerator tests — DoD 5
 */

import { describe, it, expect } from "vitest";
import { createVirtualSequenceGenerator, VirtualSequenceGeneratorAdapter } from "../src/testing/virtual-sequence.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import { SequenceGeneratorPort } from "../src/ports/sequence.js";

// Helper: unwrap Result from createVirtualSequenceGenerator in test setup
function makeSeq(options?: Parameters<typeof createVirtualSequenceGenerator>[0]) {
  const r = createVirtualSequenceGenerator(options);
  if (r.isErr()) throw new Error(`makeSeq failed: ${r.error.message}`);
  return r.value;
}

// =============================================================================
// DoD 5: Virtual Sequence Generator
// =============================================================================

describe("VirtualSequenceGenerator", () => {
  it("createVirtualSequenceGenerator() starts at 0 by default", () => {
    const seq = makeSeq();
    expect(seq.current()).toBe(0);
  });

  it("createVirtualSequenceGenerator() with custom startAt", () => {
    const seq = makeSeq({ startAt: 100 });
    expect(seq.current()).toBe(100);
  });

  it("setCounter() sets the internal counter", () => {
    const seq = makeSeq();
    const r = seq.setCounter(50);
    expect(r.isOk()).toBe(true);
    expect(seq.current()).toBe(50);
  });

  it("next() after setCounter(N) returns N+1", () => {
    const seq = makeSeq();
    seq.setCounter(10);
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(11);
    }
  });

  it("setCounter() to MAX_SAFE_INTEGER-1, next() returns MAX_SAFE_INTEGER", () => {
    const seq = makeSeq();
    seq.setCounter(Number.MAX_SAFE_INTEGER - 1);
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("setCounter() to MAX_SAFE_INTEGER, next() returns err(SequenceOverflowError)", () => {
    const seq = makeSeq();
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    const result = seq.next();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("SequenceOverflowError");
      expect(result.error.lastValue).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("reset() sets counter back to 0 (only on VirtualSequenceGenerator)", () => {
    const seq = makeSeq();
    seq.next();
    seq.next();
    seq.next();
    seq.reset();
    expect(seq.current()).toBe(0);
  });

  it("next() returns 1 after reset() (only on VirtualSequenceGenerator)", () => {
    const seq = makeSeq();
    seq.next();
    seq.next();
    seq.reset();
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
  });

  it("setCounter() returns err when value is NaN", () => {
    const seq = makeSeq();
    const r = seq.setCounter(NaN);
    expect(r.isErr()).toBe(true);
  });

  it("setCounter() returns err when value is Infinity or -Infinity", () => {
    const seq = makeSeq();
    expect(seq.setCounter(Infinity).isErr()).toBe(true);
    expect(seq.setCounter(-Infinity).isErr()).toBe(true);
  });

  it("setCounter() accepts negative values without error", () => {
    const seq = makeSeq();
    expect(seq.setCounter(-10).isOk()).toBe(true);
    expect(seq.current()).toBe(-10);
  });

  it("createVirtualSequenceGenerator() returns err when startAt is NaN", () => {
    const r = createVirtualSequenceGenerator({ startAt: NaN });
    expect(r.isErr()).toBe(true);
  });

  it("createVirtualSequenceGenerator() returns err when startAt is non-integer (e.g., 1.5)", () => {
    const r = createVirtualSequenceGenerator({ startAt: 1.5 });
    expect(r.isErr()).toBe(true);
  });

  it("createVirtualSequenceGenerator() accepts negative integer startAt without error", () => {
    const r = createVirtualSequenceGenerator({ startAt: -5 });
    expect(r.isOk()).toBe(true);
  });

  it("VirtualSequenceGenerator has reset() method that SequenceGeneratorPort does not", () => {
    const seq = makeSeq();
    expect("reset" in seq).toBe(true);
    expect(typeof seq.reset).toBe("function");
  });
});

// =============================================================================
// Mutation score improvement — error messages and factory
// =============================================================================

describe("VirtualSequenceGenerator — error message content (kills StringLiteral mutants)", () => {
  it("startAt: NaN error message contains 'VirtualSequenceOptions' (kills id=1283)", () => {
    const r = createVirtualSequenceGenerator({ startAt: NaN });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/VirtualSequenceOptions/);
  });

  it("startAt: NaN error message contains 'finite integer' (kills id=1283)", () => {
    const r = createVirtualSequenceGenerator({ startAt: NaN });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/finite integer/);
  });

  it("setCounter(NaN) error message contains 'setCounter' (kills id=1299)", () => {
    const seq = makeSeq();
    const r = seq.setCounter(NaN);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/setCounter/);
  });

  it("setCounter(Infinity) error message contains 'finite number' (kills id=1299)", () => {
    const seq = makeSeq();
    const r = seq.setCounter(Infinity);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/finite number/);
  });
});

describe("VirtualSequenceGeneratorAdapter — factory resolution (kills ArrowFunction mutant id=1303)", () => {
  it("VirtualSequenceGeneratorAdapter factory returns a working SequenceGeneratorPort", () => {
    // ArrowFunction mutant: factory: () => undefined instead of createVirtualSequenceGenerator()
    // → container.resolve returns undefined → typeof undefined.next throws → KILLED
    const graph = GraphBuilder.create().provide(adapterOrDie(VirtualSequenceGeneratorAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const seq = container.resolve(SequenceGeneratorPort);
    expect(typeof seq.next).toBe("function");
  });

  it("VirtualSequenceGeneratorAdapter factory: next() returns ok(1) on first call", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(VirtualSequenceGeneratorAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const seq = container.resolve(SequenceGeneratorPort);
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
  });
});
