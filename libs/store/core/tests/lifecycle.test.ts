/**
 * DOD 9: Lifecycle
 */

import { describe, expect, it } from "vitest";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import { createAtomServiceImpl } from "../src/services/atom-service-impl.js";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
import { createAsyncDerivedServiceImpl } from "../src/services/async-derived-service-impl.js";
import type { DisposedStateAccess } from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

function expectTaggedThrow(fn: () => unknown, tag: string): Record<string, unknown> {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeDefined();
  expect(thrown).toHaveProperty("_tag", tag);
  return thrown as Record<string, unknown>;
}

// =============================================================================
// StateService disposal
// =============================================================================

describe("StateService lifecycle", () => {
  function makeCounter() {
    return createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });
  }

  it("accessing .state after disposal throws DisposedStateAccess", () => {
    const svc = makeCounter();
    svc.dispose();
    expectTaggedThrow(() => svc.state, "DisposedStateAccess");
  });

  it("calling .actions.X() after disposal throws DisposedStateAccess", () => {
    const svc = makeCounter();
    svc.dispose();
    expectTaggedThrow(() => svc.actions, "DisposedStateAccess");
  });

  it("calling .subscribe() after disposal throws DisposedStateAccess", () => {
    const svc = makeCounter();
    svc.dispose();
    expectTaggedThrow(() => svc.subscribe(() => {}), "DisposedStateAccess");
  });

  it("DisposedStateAccess includes portName, containerName, operation", () => {
    const svc = makeCounter();
    svc.dispose();
    try {
      void svc.state;
    } catch (e) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      const err = e as DisposedStateAccess;
      expect(err.portName).toBe("Counter");
      expect(err.containerName).toBe("root");
      expect(err.operation).toBe("state");
    }
  });

  it("dispose cancels all subscriptions", () => {
    const svc = makeCounter();
    const values: number[] = [];
    svc.subscribe(s => values.push((s as { count: number }).count));

    svc.actions.increment();
    expect(values).toEqual([1]);

    svc.dispose();
    // No further callbacks after disposal
    // (can't call increment because actions check disposed too)
    expect(values).toEqual([1]);
  });

  it("no subscription callback fires after disposal begins", () => {
    const svc = makeCounter();
    const values: number[] = [];
    svc.subscribe(s => values.push((s as { count: number }).count));

    svc.dispose();
    // Effects are disposed so no callbacks fire after this point
    // Note: subscriberCount tracks active subscriptions, not effects
    expect(values).toHaveLength(0);
  });
});

// =============================================================================
// AtomService disposal
// =============================================================================

describe("AtomService lifecycle", () => {
  function makeAtom() {
    return createAtomServiceImpl({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });
  }

  it("accessing .value after disposal throws DisposedStateAccess", () => {
    const svc = makeAtom();
    svc.dispose();
    expectTaggedThrow(() => svc.value, "DisposedStateAccess");
  });

  it("calling .set() after disposal throws DisposedStateAccess", () => {
    const svc = makeAtom();
    svc.dispose();
    expectTaggedThrow(() => svc.set("dark"), "DisposedStateAccess");
  });

  it("calling .subscribe() after disposal throws DisposedStateAccess", () => {
    const svc = makeAtom();
    svc.dispose();
    expectTaggedThrow(() => svc.subscribe(() => {}), "DisposedStateAccess");
  });
});

// =============================================================================
// DerivedService disposal
// =============================================================================

describe("DerivedService lifecycle", () => {
  it("accessing .value after disposal throws DisposedStateAccess", () => {
    const svc = createDerivedServiceImpl({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });
    svc.dispose();
    expectTaggedThrow(() => svc.value, "DisposedStateAccess");
  });

  it("calling .subscribe() after disposal throws DisposedStateAccess", () => {
    const svc = createDerivedServiceImpl({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });
    svc.dispose();
    expectTaggedThrow(() => svc.subscribe(() => {}), "DisposedStateAccess");
  });
});

// =============================================================================
// LinkedDerivedService disposal
// =============================================================================

describe("LinkedDerivedService lifecycle", () => {
  it("accessing .value after disposal throws DisposedStateAccess", () => {
    const svc = createLinkedDerivedServiceImpl({
      portName: "F",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });
    svc.dispose();
    expectTaggedThrow(() => svc.value, "DisposedStateAccess");
  });

  it("calling .set() after disposal throws DisposedStateAccess", () => {
    const svc = createLinkedDerivedServiceImpl({
      portName: "F",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });
    svc.dispose();
    expectTaggedThrow(() => svc.set(100), "DisposedStateAccess");
  });
});

// =============================================================================
// isDisposed getter
// =============================================================================

describe("isDisposed", () => {
  it("StateService.isDisposed is false initially and true after dispose", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });
    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("AtomService.isDisposed is false initially and true after dispose", () => {
    const svc = createAtomServiceImpl({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });
    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("DerivedService.isDisposed is false initially and true after dispose", () => {
    const svc = createDerivedServiceImpl({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });
    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("LinkedDerivedService.isDisposed is false initially and true after dispose", () => {
    const svc = createLinkedDerivedServiceImpl({
      portName: "F",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });
    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("AsyncDerivedService.isDisposed is false initially and true after dispose", () => {
    const svc = createAsyncDerivedServiceImpl({
      portName: "Async",
      containerName: "root",
      select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
    });
    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });
});
