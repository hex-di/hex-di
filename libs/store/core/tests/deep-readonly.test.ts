/**
 * DOD 5: DeepReadonly & Snapshot Separation
 */

import { describe, expect, it } from "vitest";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";

// =============================================================================
// DeepReadonly runtime tests (via StateService snapshots)
// =============================================================================

describe("DeepReadonly & Snapshot Separation", () => {
  it("makes top-level properties readonly (frozen)", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const snapshot = svc.state;
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("makes nested object properties readonly recursively", () => {
    const svc = createStateServiceImpl({
      portName: "Nested",
      containerName: "root",
      initial: { a: { b: { c: 1 } } },
      actions: {},
    });

    const snapshot = svc.state;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen((snapshot as { a: { b: { c: number } } }).a)).toBe(true);
    expect(Object.isFrozen((snapshot as { a: { b: { c: number } } }).a.b)).toBe(true);
  });

  it("makes arrays readonly", () => {
    const svc = createStateServiceImpl({
      portName: "List",
      containerName: "root",
      initial: { items: [1, 2, 3] },
      actions: {},
    });

    const snapshot = svc.state;
    expect(Object.isFrozen((snapshot as { items: number[] }).items)).toBe(true);
  });

  it("frozen snapshot throws on mutation attempt", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {},
    });

    const snapshot = svc.state;
    expect(() => {
      (snapshot as Record<string, unknown>)["count"] = 999;
    }).toThrow();
  });

  it("structural sharing: unchanged subtrees share references between snapshots", () => {
    const nested = { deep: { value: 42 } };
    const svc = createStateServiceImpl({
      portName: "Sharing",
      containerName: "root",
      initial: { nested, other: 0 },
      actions: {
        updateOther: (state: { nested: typeof nested; other: number }, v: number) => ({
          ...state,
          other: v,
        }),
      },
    });

    const snap1 = svc.state;
    svc.actions.updateOther(1);
    const snap2 = svc.state;

    // snap1 and snap2 are different objects (state changed)
    expect(snap1).not.toBe(snap2);

    // But nested subtree should share reference if the reducer preserves it
    // (our reducer uses spread which preserves the nested ref)
    expect((snap1 as { nested: typeof nested }).nested).toBe(
      (snap2 as { nested: typeof nested }).nested
    );
  });

  it("snapshot after action: changed subtrees get new references", () => {
    const svc = createStateServiceImpl({
      portName: "RefChange",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const snap1 = svc.state;
    svc.actions.increment();
    const snap2 = svc.state;

    // Different objects since state changed
    expect(snap1).not.toBe(snap2);
    expect((snap1 as { count: number }).count).toBe(0);
    expect((snap2 as { count: number }).count).toBe(1);
  });
});
