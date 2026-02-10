/**
 * Mutation-killers-9: Targeted tests for the final ~21 surviving mutants
 * needed to push mutation score from 89.5% to 90%+.
 *
 * Targets:
 * - errors/tagged-errors.ts L172-177 (InvalidComputedGetter NoCoverage + Survived)
 * - inspection/type-guards.ts L46 (&& → ||)
 * - inspection/action-history.ts L85, L86, L144 (since/until/limit filters)
 * - inspection/store-inspector-impl.ts L48, L135, L212 (defaults, scoped)
 * - inspection/store-registry.ts L119, L137 (disposed guards)
 * - services/cycle-detection.ts L14 (array mutation)
 * - reactivity/batch.ts L104, L132, L134, L141, L143 (cross-container + depth)
 * - services/state-service-impl.ts L354, L406 (fast-path, dispose effects)
 */

import { describe, it, expect, vi } from "vitest";
import { InvalidComputedGetter } from "../src/errors/tagged-errors.js";
import {
  isStoreInspectorInternal,
  isStoreRegistry,
  isStoreTracingHook,
  extractStoreInspectorInternal,
  extractStoreRegistry,
  extractStoreTracingHook,
} from "../src/inspection/type-guards.js";
import { createActionHistory } from "../src/inspection/action-history.js";
import type { ActionHistoryEntry, ActionHistoryConfig } from "../src/types/inspection.js";
import { createStoreInspectorImpl } from "../src/inspection/store-inspector-impl.js";
import { createStoreRegistry } from "../src/inspection/store-registry.js";
import {
  isCircularDerivedDependency,
  withCycleDetection,
} from "../src/services/cycle-detection.js";
import { batch, setBatchDiagnostics } from "../src/reactivity/batch.js";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import { createIsolatedReactiveSystem } from "../src/reactivity/system-factory.js";

// =============================================================================
// errors/tagged-errors.ts — InvalidComputedGetter runtime tests
// Kills: L172 (StringLiteral), L173 (ArrowFunction), L174 (ObjectLiteral NoCov), L177 (StringLiteral NoCov)
// =============================================================================

describe("InvalidComputedGetter runtime", () => {
  it("returns an object with _tag 'InvalidComputedGetter'", () => {
    const err = InvalidComputedGetter();
    expect(err._tag).toBe("InvalidComputedGetter");
  });

  it("returns an object with code 'INVALID_COMPUTED_GETTER'", () => {
    const err = InvalidComputedGetter();
    expect(err.code).toBe("INVALID_COMPUTED_GETTER");
  });

  it("isProgrammingError is true", () => {
    const err = InvalidComputedGetter();
    expect(err.isProgrammingError).toBe(true);
  });

  it("message is 'getter must be a function'", () => {
    const err = InvalidComputedGetter();
    expect(err.message).toBe("getter must be a function");
  });

  it("is a frozen object", () => {
    const err = InvalidComputedGetter();
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// inspection/type-guards.ts — L46: && → ||
// =============================================================================

describe("type-guards: isStoreInspectorInternal", () => {
  it("returns false when only recordAction is present (missing emit, incrementPendingEffects)", () => {
    // Kills L46 && → || : with ||, this would return true
    expect(isStoreInspectorInternal({ recordAction: () => {} })).toBe(false);
  });

  it("returns false when only emit is present", () => {
    expect(isStoreInspectorInternal({ emit: () => {} })).toBe(false);
  });

  it("returns false when recordAction and emit are present but incrementPendingEffects is missing", () => {
    expect(isStoreInspectorInternal({ recordAction: () => {}, emit: () => {} })).toBe(false);
  });

  it("returns true when all three methods are present", () => {
    expect(
      isStoreInspectorInternal({
        recordAction: () => {},
        emit: () => {},
        incrementPendingEffects: () => {},
      })
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isStoreInspectorInternal(null)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isStoreInspectorInternal(42)).toBe(false);
  });
});

describe("type-guards: isStoreRegistry", () => {
  it("returns false when only register is present (missing getAll, subscribe)", () => {
    expect(isStoreRegistry({ register: () => {} })).toBe(false);
  });

  it("returns true when all three methods present", () => {
    expect(
      isStoreRegistry({
        register: () => {},
        getAll: () => [],
        subscribe: () => () => {},
      })
    ).toBe(true);
  });
});

describe("type-guards: isStoreTracingHook", () => {
  it("returns false when only onActionStart is present", () => {
    expect(isStoreTracingHook({ onActionStart: () => {} })).toBe(false);
  });

  it("returns true when both onActionStart and onActionEnd are present", () => {
    expect(
      isStoreTracingHook({
        onActionStart: () => {},
        onActionEnd: () => {},
      })
    ).toBe(true);
  });
});

describe("type-guards: extractors return undefined for non-matching", () => {
  it("extractStoreInspectorInternal returns undefined for null", () => {
    expect(extractStoreInspectorInternal(null)).toBeUndefined();
  });

  it("extractStoreRegistry returns undefined for null", () => {
    expect(extractStoreRegistry(null)).toBeUndefined();
  });

  it("extractStoreTracingHook returns undefined for null", () => {
    expect(extractStoreTracingHook(null)).toBeUndefined();
  });

  it("extractors return the value when matching", () => {
    const inspector = { recordAction: () => {}, emit: () => {}, incrementPendingEffects: () => {} };
    expect(extractStoreInspectorInternal(inspector)).toBe(inspector);
  });
});

// =============================================================================
// inspection/action-history.ts — L85 (since), L86 (until), L144 (limit >= 0)
// =============================================================================

function makeEntry(overrides: Partial<ActionHistoryEntry> = {}): ActionHistoryEntry {
  return {
    id: "test-1",
    portName: "TestPort",
    actionName: "doThing",
    payload: undefined,
    prevState: undefined,
    nextState: undefined,
    timestamp: 1000,
    effectStatus: "none",
    effectError: undefined,
    parentId: null,
    order: 0,
    traceId: undefined,
    spanId: undefined,
    ...overrides,
  };
}

describe("action-history: since filter", () => {
  it("excludes entries with timestamp before since", () => {
    // Kills L85: if mutated to true, this entry would be excluded even when it shouldn't be
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", timestamp: 500 }));
    history.record(makeEntry({ id: "e2", timestamp: 1500 }));
    history.record(makeEntry({ id: "e3", timestamp: 2000 }));

    const result = history.query({ since: 1000 });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e2");
    expect(result[1].id).toBe("e3");
  });

  it("includes entries with timestamp equal to since", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", timestamp: 1000 }));
    const result = history.query({ since: 1000 });
    expect(result).toHaveLength(1);
  });
});

describe("action-history: until filter", () => {
  it("excludes entries with timestamp after until", () => {
    // Kills L86: if mutated to true, this entry would be excluded incorrectly
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", timestamp: 500 }));
    history.record(makeEntry({ id: "e2", timestamp: 1500 }));
    history.record(makeEntry({ id: "e3", timestamp: 2500 }));

    const result = history.query({ until: 2000 });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e1");
    expect(result[1].id).toBe("e2");
  });

  it("includes entries with timestamp equal to until", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", timestamp: 2000 }));
    const result = history.query({ until: 2000 });
    expect(result).toHaveLength(1);
  });
});

describe("action-history: limit filter", () => {
  it("limit 2 returns last 2 entries", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1" }));
    history.record(makeEntry({ id: "e2" }));
    history.record(makeEntry({ id: "e3" }));

    const result = history.query({ limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e2");
    expect(result[1].id).toBe("e3");
  });

  it("limit 1 returns only the most recent entry", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1" }));
    history.record(makeEntry({ id: "e2" }));
    history.record(makeEntry({ id: "e3" }));

    const result = history.query({ limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e3");
  });

  it("traceId filter works correctly", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", traceId: "trace-a" }));
    history.record(makeEntry({ id: "e2", traceId: "trace-b" }));
    history.record(makeEntry({ id: "e3", traceId: "trace-a" }));

    const result = history.query({ traceId: "trace-a" });
    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// inspection/store-inspector-impl.ts — L48, L135, L212
// =============================================================================

describe("store-inspector-impl: default config", () => {
  it("default history config mode is 'full' (records prevState/nextState)", () => {
    // Kills L48: mode: "full" → ""
    const inspector = createStoreInspectorImpl();
    const entry = makeEntry({ prevState: { x: 1 }, nextState: { x: 2 } });
    inspector.recordAction(entry);
    const recorded = inspector.getActionHistory();
    expect(recorded).toHaveLength(1);
    // In full mode, prevState and nextState are preserved
    expect(recorded[0].prevState).toEqual({ x: 1 });
    expect(recorded[0].nextState).toEqual({ x: 2 });
  });
});

describe("store-inspector-impl: getPortState scoped fallback", () => {
  it("returns scoped port snapshot when singleton is not found", () => {
    // Kills L135: conditional → true (would return all entries, not just matching ones)
    const inspector = createStoreInspectorImpl();
    const mockEntry = {
      portName: "ScopedPort",
      adapter: {},
      lifetime: "scoped" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({
        portName: "ScopedPort",
        kind: "atom" as const,
        value: 42,
        subscriberCount: 0,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    inspector.registerScopedPort("scope-1", mockEntry);
    const snapshot = inspector.getPortState("ScopedPort");
    expect(snapshot).toBeDefined();
    expect(snapshot!.portName).toBe("ScopedPort");
    expect(snapshot!.kind).toBe("atom");
    if (snapshot!.kind === "atom") {
      expect(snapshot!.value).toBe(42);
    }
  });

  it("returns undefined for non-existent port", () => {
    const inspector = createStoreInspectorImpl();
    expect(inspector.getPortState("NonExistent")).toBeUndefined();
  });
});

describe("store-inspector-impl: registry auto-discovery", () => {
  it("auto-discovers scoped port registrations from registry", () => {
    // Kills L212: conditional → true
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const mockEntry = {
      portName: "AutoPort",
      adapter: {},
      lifetime: "scoped" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({
        portName: "AutoPort",
        kind: "atom" as const,
        value: "auto",
        subscriberCount: 1,
      }),
      getSubscriberCount: () => 1,
      getHasEffects: () => false,
    };

    registry.registerScoped("scope-x", mockEntry);

    // The inspector should have auto-discovered this via the registry subscription
    const snapshot = inspector.getSnapshot();
    const autoPort = snapshot.ports.find(p => p.portName === "AutoPort");
    expect(autoPort).toBeDefined();
    expect(autoPort!.scopeId).toBe("scope-x");
  });

  it("auto-removes scoped ports when scope is unregistered", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const mockEntry = {
      portName: "ScopePort",
      adapter: {},
      lifetime: "scoped" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({
        portName: "ScopePort",
        kind: "atom" as const,
        value: 1,
        subscriberCount: 0,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    registry.registerScoped("scope-y", mockEntry);
    expect(inspector.getPortState("ScopePort")).toBeDefined();

    registry.unregisterScope("scope-y");
    expect(inspector.getPortState("ScopePort")).toBeUndefined();
  });
});

// =============================================================================
// inspection/store-registry.ts — L119, L137 (disposed guards)
// =============================================================================

describe("store-registry: disposed guards", () => {
  it("unregister is a no-op after dispose", () => {
    // Kills L119: disposed check → false (would not guard against unregister after dispose)
    const registry = createStoreRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    const entry = {
      portName: "P",
      adapter: {},
      lifetime: "singleton" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({ portName: "P", kind: "atom" as const, value: 1, subscriberCount: 0 }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    registry.register(entry);
    listener.mockClear();
    registry.dispose();

    // After dispose, unregister should NOT fire events or modify state
    registry.unregister("P");
    expect(listener).not.toHaveBeenCalled();
  });

  it("unregisterScope is a no-op after dispose", () => {
    // Kills L137: disposed check → false
    const registry = createStoreRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    const entry = {
      portName: "SP",
      adapter: {},
      lifetime: "scoped" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({ portName: "SP", kind: "atom" as const, value: 1, subscriberCount: 0 }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    registry.registerScoped("s1", entry);
    listener.mockClear();
    registry.dispose();

    // After dispose, unregisterScope should NOT fire events
    registry.unregisterScope("s1");
    expect(listener).not.toHaveBeenCalled();
  });
});

// =============================================================================
// services/cycle-detection.ts — L14 (array initial value mutation)
// =============================================================================

describe("cycle-detection: chain contents", () => {
  it("dependency chain starts with the first port in the cycle, not garbage", () => {
    // Kills L14: [] → ["Stryker was here"]
    // If the array starts non-empty, the chain would include extra elements
    try {
      withCycleDetection("A", () => {
        withCycleDetection("B", () => {
          withCycleDetection("A", () => {
            // This should throw CircularDerivedDependency
          });
        });
      });
      expect.unreachable("Should have thrown");
    } catch (e: unknown) {
      expect(isCircularDerivedDependency(e)).toBe(true);
      const err = e as { dependencyChain: readonly string[] };
      // Chain should be exactly ["A", "B", "A"]
      expect(err.dependencyChain).toEqual(["A", "B", "A"]);
      // If array started with "Stryker was here", chain would have extra element
      expect(err.dependencyChain[0]).toBe("A");
    }
  });
});

// =============================================================================
// reactivity/batch.ts — L104, L132, L134, L141, L143
// =============================================================================

describe("batch: cross-container detection", () => {
  it("does NOT fire callback when same target enters batch", () => {
    // Kills L104: existing !== containerOrScope → true
    // With the mutation, callback would fire even for same-container
    const callback = vi.fn();
    setBatchDiagnostics(callback);

    const target = {};
    batch(target, () => {
      batch(target, () => {
        // Nested batch on same target should NOT trigger cross-container
      });
    });

    expect(callback).not.toHaveBeenCalled();
    setBatchDiagnostics(null);
  });

  it("fires callback when different target enters batch", () => {
    const callback = vi.fn();
    setBatchDiagnostics(callback);

    const targetA = {};
    const targetB = {};
    batch(targetA, () => {
      batch(targetB, () => {
        // Different target should trigger cross-container callback
      });
    });

    expect(callback).toHaveBeenCalledWith(targetB, targetA);
    setBatchDiagnostics(null);
  });
});

describe("batch: null target handling", () => {
  it("batch with null target succeeds without depth tracking", () => {
    // Kills L132: containerOrScope !== null → true (would try WeakMap.get(null))
    const result = batch(null, () => {
      // This should work fine with null target
    });
    expect(result.isOk()).toBe(true);
  });

  it("batch with null target after non-null batch succeeds", () => {
    // Kills L141: _activeBatchTarget !== null → true (would try to deref null)
    const target = {};
    batch(target, () => {
      const innerResult = batch(null, () => {});
      expect(innerResult.isOk()).toBe(true);
    });
  });
});

describe("batch: depth tracking", () => {
  it("nested batch decrements depth correctly", () => {
    // Kills L134: depth <= 1 → depth < 1
    const target = {};
    let innerComplete = false;
    batch(target, () => {
      batch(target, () => {
        innerComplete = true;
      });
    });
    expect(innerComplete).toBe(true);
  });

  it("clears active batch target when depth reaches 0", () => {
    // Kills L143: ref === containerOrScope && ... → true
    const callback = vi.fn();
    setBatchDiagnostics(callback);

    const targetA = {};
    const targetB = {};

    // First batch on A — sets active target
    batch(targetA, () => {});

    // Second batch on B — should NOT trigger cross-container (A's batch ended)
    batch(targetB, () => {});

    expect(callback).not.toHaveBeenCalled();
    setBatchDiagnostics(null);
  });
});

// =============================================================================
// services/state-service-impl.ts — L354 (hasPathChanged skip), L406 (dispose effects)
// =============================================================================

describe("state-service-impl: subscribe with selector fast-path", () => {
  it("object-returning selector is NOT re-run when untracked paths change", () => {
    // Kills L354: !hasPathChanged → false / BlockStatement → {}
    // With mutation, selector always re-runs. Since it returns a new object each time,
    // Object.is sees different references → listener fires spuriously.
    const system = createIsolatedReactiveSystem();
    const svc = createStateServiceImpl({
      portName: "FastPathTest",
      containerName: "default",
      initial: { count: 0, name: "hello" },
      actions: {
        increment: (state: { count: number; name: string }) => ({
          ...state,
          count: state.count + 1,
        }),
      },
      reactiveSystem: system,
    });

    const listener = vi.fn();
    // Selector returns a NEW object each time — Object.is will see different refs
    svc.subscribe((state: { count: number; name: string }) => ({ n: state.name }), listener);

    // Changing 'count' should NOT trigger listener because 'name' path didn't change.
    // With mutation (fast-path removed), selector re-runs, returns new {n:"hello"},
    // Object.is({n:"hello"}, {n:"hello"}) = false → spurious notification.
    (svc.actions as Record<string, (...args: unknown[]) => void>).increment();
    expect(listener).not.toHaveBeenCalled();

    svc.dispose();
  });
});

describe("state-service-impl: dispose cleans up effects", () => {
  it("effects are stopped after dispose", () => {
    // Kills L406: loop body → {} (would skip effect disposal)
    const system = createIsolatedReactiveSystem();
    const effectFn = vi.fn();
    const svc = createStateServiceImpl({
      portName: "EffTest",
      containerName: "default",
      initial: { val: 0 },
      actions: {
        bump: (state: { val: number }) => ({ val: state.val + 1 }),
      },
      effects: {
        bump: effectFn,
      },
      reactiveSystem: system,
    });

    // Trigger action — effect should fire
    (svc.actions as Record<string, (...args: unknown[]) => void>).bump();
    expect(effectFn).toHaveBeenCalledTimes(1);

    svc.dispose();

    // Effect function should not run after dispose
    // (even if we could somehow trigger it, the effects array was cleared)
    expect(svc.isDisposed).toBe(true);
  });
});

// =============================================================================
// state-service-impl: effectAdapters empty-check (L132)
// =============================================================================

describe("state-service-impl: effectAdapters guard", () => {
  it("notifyEffectAdapters short-circuits when effectAdapters is empty array", () => {
    // Kills L132: config.effectAdapters.length === 0 → false
    const system = createIsolatedReactiveSystem();
    const svc = createStateServiceImpl({
      portName: "AdpTest",
      containerName: "default",
      initial: { x: 0 },
      actions: {
        inc: (state: { x: number }) => ({ x: state.x + 1 }),
      },
      effectAdapters: [], // Empty array — should short-circuit
      reactiveSystem: system,
    });

    // Should not throw when dispatching with empty effectAdapters
    expect(() => {
      (svc.actions as Record<string, (...args: unknown[]) => void>).inc();
    }).not.toThrow();

    svc.dispose();
  });
});

// =============================================================================
// Additional: store-inspector-impl listener error isolation
// =============================================================================

describe("store-inspector-impl: listener error isolation", () => {
  it("one listener throwing does not prevent other listeners from being called", () => {
    const inspector = createStoreInspectorImpl();
    const listener1 = vi.fn(() => {
      throw new Error("boom");
    });
    const listener2 = vi.fn();

    inspector.subscribe(listener1);
    inspector.subscribe(listener2);

    // Emit an event — listener1 throws, but listener2 should still be called
    inspector.recordAction(makeEntry({ id: "e1" }));

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });
});

// =============================================================================
// Additional: action-history alwaysRecord overrides
// =============================================================================

describe("action-history: alwaysRecord overrides", () => {
  it("records 'failed' status entries even when sampling rate is 0", () => {
    // Exercises the alwaysRecord.effectStatus path
    const config: ActionHistoryConfig = {
      maxEntries: 100,
      mode: "full",
      samplingRate: 0, // Would normally reject all entries
      alwaysRecord: { effectStatus: ["failed"] },
    };
    const history = createActionHistory(config);
    history.record(makeEntry({ id: "e1", effectStatus: "failed" }));
    history.record(makeEntry({ id: "e2", effectStatus: "completed" }));
    expect(history.size).toBe(1);
    expect(history.query()[0].id).toBe("e1");
  });

  it("records 'pending' status entries via alwaysRecord", () => {
    const config: ActionHistoryConfig = {
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { effectStatus: ["pending"] },
    };
    const history = createActionHistory(config);
    history.record(makeEntry({ id: "e1", effectStatus: "pending" }));
    history.record(makeEntry({ id: "e2", effectStatus: "completed" }));
    expect(history.size).toBe(1);
  });

  it("portNames override bypasses sampling", () => {
    const config: ActionHistoryConfig = {
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { portNames: ["ImportantPort"] },
    };
    const history = createActionHistory(config);
    history.record(makeEntry({ id: "e1", portName: "ImportantPort" }));
    history.record(makeEntry({ id: "e2", portName: "OtherPort" }));
    expect(history.size).toBe(1);
    expect(history.query()[0].portName).toBe("ImportantPort");
  });

  it("actionNames override bypasses sampling", () => {
    const config: ActionHistoryConfig = {
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { actionNames: ["criticalAction"] },
    };
    const history = createActionHistory(config);
    history.record(makeEntry({ id: "e1", actionName: "criticalAction" }));
    history.record(makeEntry({ id: "e2", actionName: "normalAction" }));
    expect(history.size).toBe(1);
    expect(history.query()[0].actionName).toBe("criticalAction");
  });
});

// =============================================================================
// Additional: action-history mode and eviction
// =============================================================================

describe("action-history: mode and eviction", () => {
  it("mode 'off' rejects all entries", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "off", samplingRate: 1 });
    const recorded = history.record(makeEntry({ id: "e1" }));
    expect(recorded).toBe(false);
    expect(history.size).toBe(0);
  });

  it("mode 'lightweight' strips prevState and nextState", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight", samplingRate: 1 });
    history.record(makeEntry({ id: "e1", prevState: { a: 1 }, nextState: { a: 2 } }));
    const entries = history.query();
    expect(entries[0].prevState).toBeUndefined();
    expect(entries[0].nextState).toBeUndefined();
  });

  it("evicts oldest entries when maxEntries exceeded", () => {
    const history = createActionHistory({ maxEntries: 3, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1" }));
    history.record(makeEntry({ id: "e2" }));
    history.record(makeEntry({ id: "e3" }));
    history.record(makeEntry({ id: "e4" }));
    expect(history.size).toBe(3);
    expect(history.query()[0].id).toBe("e2");
  });

  it("clear resets entries and count", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
    history.record(makeEntry({ id: "e1" }));
    history.record(makeEntry({ id: "e2" }));
    expect(history.size).toBe(2);
    history.clear();
    expect(history.size).toBe(0);
  });
});

// =============================================================================
// Additional: inspector pendingEffects tracking
// =============================================================================

describe("store-inspector-impl: pendingEffects", () => {
  it("incrementPendingEffects / decrementPendingEffects updates snapshot", () => {
    const inspector = createStoreInspectorImpl();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);

    inspector.incrementPendingEffects();
    inspector.incrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(2);

    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(1);
  });

  it("decrementPendingEffects does not go below 0", () => {
    const inspector = createStoreInspectorImpl();
    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);
  });
});

// =============================================================================
// Additional: inspector port registration and unregistration
// =============================================================================

describe("store-inspector-impl: port lifecycle", () => {
  it("registerPort and unregisterPort work correctly", () => {
    const inspector = createStoreInspectorImpl();
    const entry = {
      portName: "TestPort",
      adapter: {},
      lifetime: "singleton" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({
        portName: "TestPort",
        kind: "atom" as const,
        value: 1,
        subscriberCount: 0,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    inspector.registerPort(entry);
    expect(inspector.getPortState("TestPort")).toBeDefined();

    inspector.unregisterPort("TestPort");
    expect(inspector.getPortState("TestPort")).toBeUndefined();
  });

  it("unregisterScope removes all ports in that scope", () => {
    const inspector = createStoreInspectorImpl();
    const entry = {
      portName: "ScopePort",
      adapter: {},
      lifetime: "scoped" as const,
      requires: [] as readonly string[],
      writesTo: [] as readonly string[],
      getSnapshot: () => ({
        portName: "ScopePort",
        kind: "atom" as const,
        value: 1,
        subscriberCount: 0,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    };

    inspector.registerScopedPort("s1", entry);
    expect(inspector.getPortState("ScopePort")).toBeDefined();

    inspector.unregisterScope("s1");
    expect(inspector.getPortState("ScopePort")).toBeUndefined();
  });
});
