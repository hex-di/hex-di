/**
 * Integration Tests: Container Lifecycle
 *
 * Tests for full lifecycle flows, multi-port reactivity across disposal,
 * scope inheritance, and captive dependency awareness.
 */

import { describe, it, expect, vi } from "vitest";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";
import { createDerivedServiceImpl } from "../../src/services/derived-service-impl.js";
import { createAtomServiceImpl } from "../../src/services/atom-service-impl.js";

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
// Full lifecycle: create → subscribe → dispatch → verify → dispose → verify
// =============================================================================

describe("Full service lifecycle", () => {
  it("create → subscribe → dispatch → verify → dispose → verify throws", () => {
    // Create
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "lifecycle-test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
        set: (_: { count: number }, value: number) => ({ count: value }),
      },
    });

    // Subscribe
    const states: Array<{ count: number }> = [];
    const unsub = service.subscribe(state => {
      states.push({ count: (state as { count: number }).count });
    });

    // Dispatch
    service.actions.increment();
    service.actions.increment();
    service.actions.set(10);

    // Verify
    expect(service.state).toEqual({ count: 10 });
    expect(states).toEqual([{ count: 1 }, { count: 2 }, { count: 10 }]);
    expect(service.actionCount).toBe(3);

    // Dispose
    service.dispose();

    // Verify throws
    expectTaggedThrow(() => service.state, "DisposedStateAccess");
    expectTaggedThrow(() => service.actions, "DisposedStateAccess");
    expectTaggedThrow(() => service.subscribe(vi.fn()), "DisposedStateAccess");

    // Unsubscribe after dispose is a no-op (should not throw)
    expect(() => unsub()).not.toThrow();
  });
});

// =============================================================================
// Multi-port reactivity through disposal
// =============================================================================

describe("Multi-port reactivity through disposal", () => {
  it("state service feeds derived, dispose state, derived no longer updates", () => {
    const stateService = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    // Derived reads from state service
    const derived = createDerivedServiceImpl<number>({
      portName: "DoubleCounter",
      containerName: "test",
      select: () => (stateService.state as { count: number }).count * 2,
    });

    // Verify initial values
    expect(derived.value).toBe(0);

    // Update state, derived should reflect
    stateService.actions.increment();
    expect(stateService.state).toEqual({ count: 1 });
    expect(derived.value).toBe(2);

    // Subscribe to derived to track updates
    const derivedValues: number[] = [];
    derived.subscribe(value => {
      derivedValues.push(value as number);
    });

    stateService.actions.increment();
    expect(derivedValues).toEqual([4]);

    // Dispose state service
    stateService.dispose();

    // Derived still holds its last computed value
    // (it doesn't throw because derived itself isn't disposed)
    expect(derived.value).toBe(4);

    // No more updates come through since state service is disposed
    // (we can't dispatch actions anymore)
    expectTaggedThrow(() => stateService.actions, "DisposedStateAccess");
  });
});

// =============================================================================
// Scope inheritance: parent and child disposal
// =============================================================================

describe("Scope inheritance", () => {
  it("child scope disposal does not affect parent scope services", () => {
    // Parent scope services
    const parentCounter = createStateServiceImpl({
      portName: "ParentCounter",
      containerName: "parent-scope",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const parentAtom = createAtomServiceImpl({
      portName: "ParentTheme",
      containerName: "parent-scope",
      initial: "light" as const,
    });

    // Child scope services
    const childCounter = createStateServiceImpl({
      portName: "ChildCounter",
      containerName: "child-scope",
      initial: { count: 100 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    // Both work
    parentCounter.actions.increment();
    childCounter.actions.increment();
    expect(parentCounter.state).toEqual({ count: 1 });
    expect(childCounter.state).toEqual({ count: 101 });

    // Dispose child scope
    childCounter.dispose();

    // Child is disposed
    expectTaggedThrow(() => childCounter.state, "DisposedStateAccess");

    // Parent is unaffected
    parentCounter.actions.increment();
    expect(parentCounter.state).toEqual({ count: 2 });
    expect(parentAtom.value).toBe("light");

    // Parent can still be disposed independently
    parentCounter.dispose();
    parentAtom.dispose();
    expectTaggedThrow(() => parentCounter.state, "DisposedStateAccess");
    expectTaggedThrow(() => parentAtom.value, "DisposedStateAccess");
  });
});

// =============================================================================
// Captive dependency: derived subscribing to disposed upstream
// =============================================================================

describe("Captive dependency awareness", () => {
  it("derived holds last value when upstream is disposed (no crash on access)", () => {
    const stateService = createStateServiceImpl({
      portName: "Source",
      containerName: "test",
      initial: { value: 42 },
      actions: {
        set: (_: { value: number }, value: number) => ({ value }),
      },
    });

    // Derived depends on stateService.state
    const derived = createDerivedServiceImpl<number>({
      portName: "Doubled",
      containerName: "test",
      select: () => (stateService.state as { value: number }).value * 2,
    });

    // Works initially
    expect(derived.value).toBe(84);

    stateService.actions.set(10);
    expect(derived.value).toBe(20);

    // Dispose upstream
    stateService.dispose();

    // Since the upstream signal no longer changes, the computed value
    // is cached at 20 — the derived service does NOT recompute and
    // does NOT throw. This is the correct "captive dependency" behavior:
    // the derived is stale but stable.
    expect(derived.value).toBe(20);

    // No new updates can come through (upstream is disposed)
    expectTaggedThrow(() => stateService.actions, "DisposedStateAccess");

    // Dispose derived for cleanup
    derived.dispose();
    expectTaggedThrow(() => derived.value, "DisposedStateAccess");
  });
});
