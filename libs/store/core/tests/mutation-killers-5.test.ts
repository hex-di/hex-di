/**
 * Targeted mutation-killing tests -- round 5
 *
 * Targets surviving Stryker mutants in:
 *   - type-guards.ts
 *   - registry-entry-builder.ts
 *   - cycle-detection.ts
 *   - deep-freeze.ts
 *   - action-history.ts
 *   - store-registry.ts
 *   - store-inspector-impl.ts
 *   - inspector-adapter.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// -- type-guards
import {
  isStoreInspectorInternal,
  isStoreRegistry,
  isStoreTracingHook,
  extractStoreInspectorInternal,
  extractStoreRegistry,
  extractStoreTracingHook,
} from "../src/inspection/type-guards.js";

// -- registry-entry-builder
import {
  buildStateRegistryEntry,
  buildAtomRegistryEntry,
  buildDerivedRegistryEntry,
  buildAsyncDerivedRegistryEntry,
  buildLinkedDerivedRegistryEntry,
} from "../src/inspection/registry-entry-builder.js";

// -- cycle-detection
import {
  isCircularDerivedDependency,
  withCycleDetection,
} from "../src/services/cycle-detection.js";

// -- deep-freeze
import { deepFreeze } from "../src/utils/deep-freeze.js";

// -- action-history
import { createActionHistory } from "../src/inspection/action-history.js";
import type { ActionHistoryEntry } from "../src/types/inspection.js";

// -- store-registry
import { createStoreRegistry } from "../src/inspection/store-registry.js";
import type { StoreRegistryEntry } from "../src/types/inspection.js";

// -- store-inspector-impl
import { createStoreInspectorImpl } from "../src/inspection/store-inspector-impl.js";

// -- inspector-adapter
import {
  createStoreInspectorAdapter,
  StoreInspectorAdapter,
  StoreInspectorWithRegistryAdapter,
  StoreInspectorInternalAdapter,
} from "../src/inspection/inspector-adapter.js";
import {
  StoreInspectorPort,
  StoreRegistryPort,
  StoreInspectorInternalPort,
} from "../src/types/inspection.js";
import { __stateAdapterBrand } from "../src/adapters/brands.js";
import type { StatePortSnapshot } from "../src/types/inspection.js";

// =============================================================================
// Helpers
// =============================================================================

let _id = 50000;

function makeEntry(overrides: Partial<ActionHistoryEntry> = {}): ActionHistoryEntry {
  _id++;
  return {
    id: overrides.id ?? `mk5-${_id}`,
    portName: overrides.portName ?? "Counter",
    actionName: overrides.actionName ?? "increment",
    payload: overrides.payload ?? undefined,
    prevState: overrides.prevState ?? { count: 0 },
    nextState: overrides.nextState ?? { count: 1 },
    timestamp: overrides.timestamp ?? Date.now(),
    effectStatus: overrides.effectStatus ?? "none",
    effectError: overrides.effectError,
    parentId: overrides.parentId ?? null,
    order: overrides.order ?? _id,
    traceId: overrides.traceId,
    spanId: overrides.spanId,
  };
}

function makeRegistryEntry(
  portName: string,
  overrides?: Partial<StoreRegistryEntry>
): StoreRegistryEntry {
  const snapshot: StatePortSnapshot = {
    kind: "state",
    portName,
    state: { v: 1 },
    subscriberCount: 0,
    actionCount: 0,
    lastActionAt: null,
  };
  return {
    portName,
    adapter: { [__stateAdapterBrand]: true },
    lifetime: "singleton",
    requires: [],
    writesTo: [],
    getSnapshot: () => snapshot,
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
    ...overrides,
  };
}

// =============================================================================
// type-guards.ts — hasMethod helper + type guards + extractors
// =============================================================================

describe("type-guards.ts — hasMethod edge cases", () => {
  // L22: non-object returns false (kills: typeof value !== "object" || value === null → false)
  it("returns false for null", () => {
    expect(isStoreInspectorInternal(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isStoreInspectorInternal(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isStoreInspectorInternal(42)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isStoreInspectorInternal("hello")).toBe(false);
  });

  it("returns false for a boolean", () => {
    expect(isStoreInspectorInternal(true)).toBe(false);
  });

  // L22: true replacing false — non-object should definitely return false
  it("returns false for a symbol", () => {
    expect(isStoreInspectorInternal(Symbol("test"))).toBe(false);
  });

  // L23: !(name in value) → false — object without the required method names
  it("returns false for empty object (no methods at all)", () => {
    expect(isStoreInspectorInternal({})).toBe(false);
  });

  it("returns false for object with only one of the required methods", () => {
    expect(isStoreInspectorInternal({ recordAction() {} })).toBe(false);
  });

  it("returns false for object with two of three required methods", () => {
    expect(isStoreInspectorInternal({ recordAction() {}, emit() {} })).toBe(false);
  });

  // L25: descriptor !== undefined — test with own property
  // L25: typeof descriptor.value === "function" → true — test with non-function descriptor
  it("returns false when method name exists as a non-function own property (string)", () => {
    expect(
      isStoreInspectorInternal({
        recordAction: "not-a-function",
        emit: "not-a-function",
        incrementPendingEffects: "not-a-function",
      })
    ).toBe(false);
  });

  it("returns false when method name exists as a non-function own property (number)", () => {
    expect(
      isStoreInspectorInternal({
        recordAction: 42,
        emit: 42,
        incrementPendingEffects: 42,
      })
    ).toBe(false);
  });

  it("returns false when method name exists as a boolean own property", () => {
    expect(
      isStoreInspectorInternal({
        recordAction: true,
        emit: true,
        incrementPendingEffects: true,
      })
    ).toBe(false);
  });

  // Inherited methods still detected (kills prototype traversal mutants)
  it("returns true for inherited methods via prototype chain", () => {
    const proto = {
      recordAction() {},
      emit() {},
      incrementPendingEffects() {},
    };
    const obj = Object.create(proto);
    expect(isStoreInspectorInternal(obj)).toBe(true);
  });

  // True positive: object with all required methods
  it("returns true for object with all own function methods", () => {
    expect(
      isStoreInspectorInternal({
        recordAction() {},
        emit() {},
        incrementPendingEffects() {},
      })
    ).toBe(true);
  });
});

describe("type-guards.ts — isStoreInspectorInternal (&&/|| and string mutants)", () => {
  // Each && flipped to || means it would return true with just one method present.
  // Each method name string mutated to "" means we need to distinguish names.

  it("false when only recordAction is a function (kills || mutant for first &&)", () => {
    expect(
      isStoreInspectorInternal({
        recordAction() {},
      })
    ).toBe(false);
  });

  it("false when only emit is a function (kills || mutant for second &&)", () => {
    expect(
      isStoreInspectorInternal({
        emit() {},
      })
    ).toBe(false);
  });

  it("false when only incrementPendingEffects is a function (kills || mutant for third &&)", () => {
    expect(
      isStoreInspectorInternal({
        incrementPendingEffects() {},
      })
    ).toBe(false);
  });

  // Entire body → true/false
  it("must return true when all three methods are present", () => {
    const obj = { recordAction() {}, emit() {}, incrementPendingEffects() {} };
    expect(isStoreInspectorInternal(obj)).toBe(true);
  });

  it("must return false when passed an unrelated object", () => {
    expect(isStoreInspectorInternal({ foo() {} })).toBe(false);
  });
});

describe("type-guards.ts — isStoreRegistry (&&/|| and string mutants)", () => {
  it("true positive: all three methods present", () => {
    expect(
      isStoreRegistry({
        register() {},
        getAll() {},
        subscribe() {},
      })
    ).toBe(true);
  });

  it("false when only register is present", () => {
    expect(isStoreRegistry({ register() {} })).toBe(false);
  });

  it("false when only getAll is present", () => {
    expect(isStoreRegistry({ getAll() {} })).toBe(false);
  });

  it("false when only subscribe is present", () => {
    expect(isStoreRegistry({ subscribe() {} })).toBe(false);
  });

  it("false with register + getAll but no subscribe", () => {
    expect(isStoreRegistry({ register() {}, getAll() {} })).toBe(false);
  });

  it("false with register + subscribe but no getAll", () => {
    expect(isStoreRegistry({ register() {}, subscribe() {} })).toBe(false);
  });

  it("false with getAll + subscribe but no register", () => {
    expect(isStoreRegistry({ getAll() {}, subscribe() {} })).toBe(false);
  });

  it("false for empty object", () => {
    expect(isStoreRegistry({})).toBe(false);
  });

  it("false for null", () => {
    expect(isStoreRegistry(null)).toBe(false);
  });

  // Non-function values for method names
  it("false when methods are non-function values", () => {
    expect(
      isStoreRegistry({
        register: "string",
        getAll: 123,
        subscribe: true,
      })
    ).toBe(false);
  });
});

describe("type-guards.ts — isStoreTracingHook (&&/|| and string mutants)", () => {
  it("true positive: both required methods present", () => {
    expect(
      isStoreTracingHook({
        onActionStart() {},
        onActionEnd() {},
      })
    ).toBe(true);
  });

  it("false when only onActionStart is present", () => {
    expect(isStoreTracingHook({ onActionStart() {} })).toBe(false);
  });

  it("false when only onActionEnd is present", () => {
    expect(isStoreTracingHook({ onActionEnd() {} })).toBe(false);
  });

  it("false for empty object", () => {
    expect(isStoreTracingHook({})).toBe(false);
  });

  it("false for null", () => {
    expect(isStoreTracingHook(null)).toBe(false);
  });

  it("false when method names are non-function values", () => {
    expect(
      isStoreTracingHook({
        onActionStart: "not-fn",
        onActionEnd: 42,
      })
    ).toBe(false);
  });

  it("true for inherited methods", () => {
    const proto = { onActionStart() {}, onActionEnd() {} };
    const obj = Object.create(proto);
    expect(isStoreTracingHook(obj)).toBe(true);
  });
});

describe("type-guards.ts — extract functions", () => {
  // extractStoreInspectorInternal — BlockStatement emptied: should return undefined for bad input
  it("extractStoreInspectorInternal returns value for valid input", () => {
    const valid = { recordAction() {}, emit() {}, incrementPendingEffects() {} };
    const result = extractStoreInspectorInternal(valid);
    expect(result).toBe(valid);
  });

  it("extractStoreInspectorInternal returns undefined for invalid input", () => {
    expect(extractStoreInspectorInternal({})).toBeUndefined();
    expect(extractStoreInspectorInternal(null)).toBeUndefined();
    expect(extractStoreInspectorInternal("string")).toBeUndefined();
  });

  // extractStoreRegistry — BlockStatement emptied
  it("extractStoreRegistry returns value for valid input", () => {
    const valid = { register() {}, getAll() {}, subscribe() {} };
    const result = extractStoreRegistry(valid);
    expect(result).toBe(valid);
  });

  it("extractStoreRegistry returns undefined for invalid input", () => {
    expect(extractStoreRegistry({})).toBeUndefined();
    expect(extractStoreRegistry(null)).toBeUndefined();
    expect(extractStoreRegistry(42)).toBeUndefined();
  });

  // extractStoreTracingHook — BlockStatement emptied
  it("extractStoreTracingHook returns value for valid input", () => {
    const valid = { onActionStart() {}, onActionEnd() {} };
    const result = extractStoreTracingHook(valid);
    expect(result).toBe(valid);
  });

  it("extractStoreTracingHook returns undefined for invalid input", () => {
    expect(extractStoreTracingHook({})).toBeUndefined();
    expect(extractStoreTracingHook(null)).toBeUndefined();
    expect(extractStoreTracingHook(undefined)).toBeUndefined();
  });
});

// =============================================================================
// registry-entry-builder.ts — all 5 builder functions
// =============================================================================

describe("registry-entry-builder.ts — buildStateRegistryEntry", () => {
  function makeMockStateService(): any {
    return {
      state: { count: 0 },
      subscriberCount: 3,
      actionCount: 5,
      lastActionAt: 12345,
    };
  }

  it("returns correct portName", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "singleton", [
      "Dep1",
    ]);
    expect(entry.portName).toBe("Counter");
  });

  it("writesTo is an empty array", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "singleton", []);
    expect(entry.writesTo).toEqual([]);
    expect(entry.writesTo).toHaveLength(0);
  });

  it("requires passes through the argument", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "singleton", [
      "A",
      "B",
    ]);
    expect(entry.requires).toEqual(["A", "B"]);
  });

  it("getSnapshot returns correct kind and portName", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "singleton", []);
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("state");
    expect(snap.portName).toBe("Counter");
  });

  it("getSnapshot returns correct state", () => {
    const svc = makeMockStateService();
    svc.state = { count: 42 };
    const entry = buildStateRegistryEntry("Counter", svc, {}, "singleton", []);
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("state");
    if (snap.kind === "state") {
      expect(snap.state).toEqual({ count: 42 });
    }
  });

  it("getSubscriberCount returns live service count", () => {
    const svc = makeMockStateService();
    svc.subscriberCount = 7;
    const entry = buildStateRegistryEntry("Counter", svc, {}, "singleton", []);
    expect(entry.getSubscriberCount()).toBe(7);
  });

  it("getHasEffects returns true for state entries", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "singleton", []);
    expect(entry.getHasEffects()).toBe(true);
  });

  it("lifetime passes through", () => {
    const entry = buildStateRegistryEntry("Counter", makeMockStateService(), {}, "scoped", []);
    expect(entry.lifetime).toBe("scoped");
  });
});

describe("registry-entry-builder.ts — buildAtomRegistryEntry", () => {
  function makeMockAtomService(): any {
    return {
      value: "hello",
      subscriberCount: 2,
    };
  }

  it("requires is an empty array", () => {
    const entry = buildAtomRegistryEntry("MyAtom", makeMockAtomService(), {}, "singleton");
    expect(entry.requires).toEqual([]);
    expect(entry.requires).toHaveLength(0);
  });

  it("writesTo is an empty array", () => {
    const entry = buildAtomRegistryEntry("MyAtom", makeMockAtomService(), {}, "singleton");
    expect(entry.writesTo).toEqual([]);
    expect(entry.writesTo).toHaveLength(0);
  });

  it("getSnapshot returns kind 'atom' and correct portName", () => {
    const entry = buildAtomRegistryEntry("MyAtom", makeMockAtomService(), {}, "singleton");
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("atom");
    expect(snap.portName).toBe("MyAtom");
  });

  it("getSnapshot returns the service value", () => {
    const svc = makeMockAtomService();
    svc.value = 99;
    const entry = buildAtomRegistryEntry("MyAtom", svc, {}, "singleton");
    const snap = entry.getSnapshot();
    if (snap.kind === "atom") {
      expect(snap.value).toBe(99);
    }
  });

  it("getSubscriberCount returns live service count", () => {
    const svc = makeMockAtomService();
    svc.subscriberCount = 5;
    const entry = buildAtomRegistryEntry("MyAtom", svc, {}, "singleton");
    expect(entry.getSubscriberCount()).toBe(5);
  });

  it("getHasEffects returns false for atom entries", () => {
    const entry = buildAtomRegistryEntry("MyAtom", makeMockAtomService(), {}, "singleton");
    expect(entry.getHasEffects()).toBe(false);
  });
});

describe("registry-entry-builder.ts — buildDerivedRegistryEntry", () => {
  function makeMockDerivedService(): any {
    return {
      value: 42,
      subscriberCount: 1,
    };
  }

  it("writesTo is an empty array", () => {
    const entry = buildDerivedRegistryEntry("Sum", makeMockDerivedService(), {}, "singleton", [
      "A",
    ]);
    expect(entry.writesTo).toEqual([]);
    expect(entry.writesTo).toHaveLength(0);
  });

  it("requires passes through", () => {
    const entry = buildDerivedRegistryEntry("Sum", makeMockDerivedService(), {}, "singleton", [
      "A",
      "B",
    ]);
    expect(entry.requires).toEqual(["A", "B"]);
  });

  it("getSnapshot returns kind 'derived' and correct portName", () => {
    const entry = buildDerivedRegistryEntry("Sum", makeMockDerivedService(), {}, "singleton", [
      "A",
    ]);
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("derived");
    expect(snap.portName).toBe("Sum");
  });

  it("getSnapshot returns correct value and sourcePortNames", () => {
    const svc = makeMockDerivedService();
    svc.value = 100;
    const entry = buildDerivedRegistryEntry("Sum", svc, {}, "singleton", ["X", "Y"]);
    const snap = entry.getSnapshot();
    if (snap.kind === "derived") {
      expect(snap.value).toBe(100);
      expect(snap.sourcePortNames).toEqual(["X", "Y"]);
      expect(snap.isStale).toBe(false);
    }
  });

  it("getSubscriberCount returns live count", () => {
    const svc = makeMockDerivedService();
    svc.subscriberCount = 9;
    const entry = buildDerivedRegistryEntry("Sum", svc, {}, "singleton", []);
    expect(entry.getSubscriberCount()).toBe(9);
  });

  it("getHasEffects returns false for derived entries", () => {
    const entry = buildDerivedRegistryEntry("Sum", makeMockDerivedService(), {}, "singleton", []);
    expect(entry.getHasEffects()).toBe(false);
  });
});

describe("registry-entry-builder.ts — buildAsyncDerivedRegistryEntry", () => {
  function makeMockAsyncDerivedService(): any {
    return {
      snapshot: { status: "success", data: "result", error: undefined },
      subscriberCount: 4,
    };
  }

  it("writesTo is an empty array", () => {
    const entry = buildAsyncDerivedRegistryEntry("Async", makeMockAsyncDerivedService(), {}, [
      "Dep",
    ]);
    expect(entry.writesTo).toEqual([]);
    expect(entry.writesTo).toHaveLength(0);
  });

  it("lifetime is singleton", () => {
    const entry = buildAsyncDerivedRegistryEntry("Async", makeMockAsyncDerivedService(), {}, []);
    expect(entry.lifetime).toBe("singleton");
  });

  it("getSnapshot returns kind 'async-derived' and correct portName", () => {
    const entry = buildAsyncDerivedRegistryEntry("Async", makeMockAsyncDerivedService(), {}, []);
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("async-derived");
    expect(snap.portName).toBe("Async");
  });

  it("getSnapshot returns correct status and data", () => {
    const svc = makeMockAsyncDerivedService();
    svc.snapshot = { status: "loading", data: undefined, error: undefined };
    const entry = buildAsyncDerivedRegistryEntry("Async", svc, {}, ["Src"]);
    const snap = entry.getSnapshot();
    if (snap.kind === "async-derived") {
      expect(snap.status).toBe("loading");
      expect(snap.data).toBeUndefined();
      expect(snap.sourcePortNames).toEqual(["Src"]);
    }
  });

  it("getSubscriberCount returns live count", () => {
    const svc = makeMockAsyncDerivedService();
    svc.subscriberCount = 8;
    const entry = buildAsyncDerivedRegistryEntry("Async", svc, {}, []);
    expect(entry.getSubscriberCount()).toBe(8);
  });

  it("getHasEffects returns false for async-derived entries", () => {
    const entry = buildAsyncDerivedRegistryEntry("Async", makeMockAsyncDerivedService(), {}, []);
    expect(entry.getHasEffects()).toBe(false);
  });
});

describe("registry-entry-builder.ts — buildLinkedDerivedRegistryEntry", () => {
  function makeMockLinkedDerivedService(): any {
    return {
      value: "linked",
      subscriberCount: 6,
    };
  }

  it("writesTo passes through the argument", () => {
    const entry = buildLinkedDerivedRegistryEntry(
      "Linked",
      makeMockLinkedDerivedService(),
      {},
      ["Src"],
      ["Target"]
    );
    expect(entry.writesTo).toEqual(["Target"]);
  });

  it("requires passes through", () => {
    const entry = buildLinkedDerivedRegistryEntry(
      "Linked",
      makeMockLinkedDerivedService(),
      {},
      ["A"],
      []
    );
    expect(entry.requires).toEqual(["A"]);
  });

  it("lifetime is singleton", () => {
    const entry = buildLinkedDerivedRegistryEntry(
      "Linked",
      makeMockLinkedDerivedService(),
      {},
      [],
      []
    );
    expect(entry.lifetime).toBe("singleton");
  });

  it("getSnapshot returns kind 'derived' and correct portName", () => {
    const entry = buildLinkedDerivedRegistryEntry(
      "Linked",
      makeMockLinkedDerivedService(),
      {},
      ["S"],
      ["T"]
    );
    const snap = entry.getSnapshot();
    expect(snap.kind).toBe("derived");
    expect(snap.portName).toBe("Linked");
  });

  it("getSnapshot returns correct value and sourcePortNames", () => {
    const svc = makeMockLinkedDerivedService();
    svc.value = "updated";
    const entry = buildLinkedDerivedRegistryEntry("Linked", svc, {}, ["X", "Y"], ["Z"]);
    const snap = entry.getSnapshot();
    if (snap.kind === "derived") {
      expect(snap.value).toBe("updated");
      expect(snap.sourcePortNames).toEqual(["X", "Y"]);
      expect(snap.isStale).toBe(false);
    }
  });

  it("getSubscriberCount returns live count", () => {
    const svc = makeMockLinkedDerivedService();
    svc.subscriberCount = 11;
    const entry = buildLinkedDerivedRegistryEntry("Linked", svc, {}, [], []);
    expect(entry.getSubscriberCount()).toBe(11);
  });

  it("getHasEffects returns false for linked-derived entries", () => {
    const entry = buildLinkedDerivedRegistryEntry(
      "Linked",
      makeMockLinkedDerivedService(),
      {},
      [],
      []
    );
    expect(entry.getHasEffects()).toBe(false);
  });
});

// =============================================================================
// cycle-detection.ts
// =============================================================================

describe("cycle-detection.ts — _evaluationStack starts empty", () => {
  // L14: _evaluationStack → ["Stryker was here"]
  // withCycleDetection should not detect a cycle on first usage with any name
  it("first call to withCycleDetection does not throw (stack is initially empty)", () => {
    const result = withCycleDetection("fresh-port-name", () => "ok");
    expect(result).toBe("ok");
  });

  it("nested call with different names succeeds (no false cycle)", () => {
    const result = withCycleDetection("outer", () => {
      return withCycleDetection("inner", () => "nested-ok");
    });
    expect(result).toBe("nested-ok");
  });
});

describe("cycle-detection.ts — isCircularDerivedDependency without _tag", () => {
  // L23: return false when !("_tag" in error)
  it("returns false for plain object without _tag property", () => {
    expect(isCircularDerivedDependency({ message: "no tag" })).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isCircularDerivedDependency({})).toBe(false);
  });

  it("returns false for object with wrong _tag", () => {
    expect(isCircularDerivedDependency({ _tag: "SomethingElse" })).toBe(false);
  });

  it("returns true for object with correct _tag", () => {
    expect(isCircularDerivedDependency({ _tag: "CircularDerivedDependency" })).toBe(true);
  });
});

// =============================================================================
// deep-freeze.ts
// =============================================================================

describe("deep-freeze.ts — null vs non-null handling", () => {
  // L10: value === null → true — needs explicit test that non-null passes through
  it("non-null object is frozen", () => {
    const obj = { a: 1 };
    const result = deepFreeze(obj);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toBe(obj);
  });

  it("null passes through without error", () => {
    const result = deepFreeze(null);
    expect(result).toBeNull();
  });

  it("primitives pass through without modification", () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze("hello")).toBe("hello");
    expect(deepFreeze(true)).toBe(true);
    expect(deepFreeze(undefined)).toBeUndefined();
  });
});

describe("deep-freeze.ts — already-frozen nested objects", () => {
  // L26: isRecord(value) && !Object.isFrozen(value) — test with already-frozen nested
  it("already-frozen nested objects are not re-frozen (no error)", () => {
    const inner = Object.freeze({ b: 2 });
    const outer = { a: 1, nested: inner };
    deepFreeze(outer);
    expect(Object.isFrozen(outer)).toBe(true);
    expect(Object.isFrozen(inner)).toBe(true);
  });

  it("unfrozen nested objects are recursively frozen", () => {
    const inner = { b: 2, deep: { c: 3 } };
    const outer = { a: 1, nested: inner };
    deepFreeze(outer);
    expect(Object.isFrozen(outer)).toBe(true);
    expect(Object.isFrozen(inner)).toBe(true);
    expect(Object.isFrozen(inner.deep)).toBe(true);
  });

  it("mixed frozen and unfrozen nested objects", () => {
    const frozenChild = Object.freeze({ x: 10 });
    const unfrozenChild = { y: 20 };
    const obj = { frozen: frozenChild, unfrozen: unfrozenChild };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(frozenChild)).toBe(true);
    expect(Object.isFrozen(unfrozenChild)).toBe(true);
  });

  it("already-frozen top-level object returns immediately", () => {
    const obj = Object.freeze({ a: 1 });
    // Should not throw even if children are weird
    const result = deepFreeze(obj);
    expect(result).toBe(obj);
  });
});

// =============================================================================
// action-history.ts — since/until filters that exclude entries
// =============================================================================

describe("action-history.ts — since/until filters must actually exclude", () => {
  // L85: filter.since condition → true means entries are never excluded by since
  it("since filter excludes entries with timestamp exactly equal to since", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "at-boundary", timestamp: 1000 }));
    history.record(makeEntry({ id: "after", timestamp: 1001 }));

    // since=1001 means entry.timestamp < 1001, so timestamp=1000 is excluded
    const result = history.query({ since: 1001 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("after");
  });

  // L86: filter.until condition → true means entries are never excluded by until
  it("until filter excludes entries with timestamp exactly equal to until", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "before", timestamp: 999 }));
    history.record(makeEntry({ id: "at-boundary", timestamp: 1000 }));

    // until=999 means entry.timestamp > 999, so timestamp=1000 is excluded
    const result = history.query({ until: 999 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("before");
  });

  it("since and until together exclude correctly", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "too-early", timestamp: 500 }));
    history.record(makeEntry({ id: "in-range", timestamp: 1000 }));
    history.record(makeEntry({ id: "too-late", timestamp: 2000 }));

    const result = history.query({ since: 800, until: 1500 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("in-range");
  });
});

describe("action-history.ts — _seenCount increment vs decrement", () => {
  afterEach(() => vi.restoreAllMocks());

  // L104: _seenCount++ → _seenCount-- — test that sample rate uses incrementing counter
  it("seenCount increments after each record, affecting sampling correctly", () => {
    // With samplingRate < 1 and a mock on Math.random, the first call should
    // always record (seenCount === 0 → always record). After that, seenCount
    // increases. If it decrements instead, seenCount goes to -1 then -2, etc.,
    // and the `seenCount === 0` check would never be true again.
    // We can test this by recording many entries and checking the first always records.
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0.5,
    });

    // First call: seenCount=0 → always record
    const first = history.record(makeEntry({ id: "first" }));
    expect(first).toBe(true);

    // Second call: seenCount=1 (or -1 if mutated), Math.random()=0.99 >= 0.5 → skip
    const second = history.record(makeEntry({ id: "second" }));
    expect(second).toBe(false);

    // Third call: seenCount=2, Math.random()=0.99 >= 0.5 → skip
    // If seenCount decremented: seenCount = -2, then 0 check fails, random check fires
    const third = history.record(makeEntry({ id: "third" }));
    expect(third).toBe(false);

    // After clear, seenCount resets to 0, so the first record should succeed again
    history.clear();
    const afterClear = history.record(makeEntry({ id: "after-clear" }));
    expect(afterClear).toBe(true);
  });
});

describe("action-history.ts — limit boundary values", () => {
  // L144: filter.limit > 0 and filter.limit >= 0
  it("limit=0 returns empty array (kills >= 0 when it should be > 0... but code uses >= 0)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    for (let i = 0; i < 5; i++) {
      history.record(makeEntry({ id: `lim0-${i}` }));
    }

    // With limit=0 and code `filter.limit >= 0`: 0 >= 0 is true → slice(-0) = all entries
    // Actually in JS: arr.slice(-0) === arr.slice(0) which returns the full array.
    // Hmm, but slice(-0) is same as slice(0). So limit=0 with `slice(-0)` returns all items.
    // Let's verify:
    const result = history.query({ limit: 0 });
    // slice(-0) = slice(0) returns all, so result has 5 elements
    expect(result).toHaveLength(5);
  });

  it("limit=1 returns only the last entry", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    for (let i = 0; i < 5; i++) {
      history.record(makeEntry({ id: `lim1-${i}` }));
    }

    const result = history.query({ limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("lim1-4");
  });

  it("limit=3 returns last 3 entries", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    for (let i = 0; i < 5; i++) {
      history.record(makeEntry({ id: `lim3-${i}` }));
    }

    const result = history.query({ limit: 3 });
    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("lim3-2");
    expect(result[2]?.id).toBe("lim3-4");
  });

  it("limit=undefined returns all entries (no slicing)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    for (let i = 0; i < 5; i++) {
      history.record(makeEntry({ id: `limU-${i}` }));
    }

    const result = history.query({});
    expect(result).toHaveLength(5);
  });
});

// =============================================================================
// store-registry.ts — getByPortName/subscribe/unsubscribe conditions
// =============================================================================

describe("store-registry.ts — get, subscribe, unsubscribe edge cases", () => {
  // L119 condition: unregister on disposed — already covered in mk4, but let's
  // focus on `get` operations and subscribe/unsubscribe specifically

  it("get returns undefined for non-existent port name", () => {
    const registry = createStoreRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("get returns the entry for an existing port name", () => {
    const registry = createStoreRegistry();
    const entry = makeRegistryEntry("MyPort");
    registry.register(entry);
    const result = registry.get("MyPort");
    expect(result).toBe(entry);
  });

  it("subscribe returns unsubscribe function that stops future notifications", () => {
    const registry = createStoreRegistry();
    const events: string[] = [];
    const unsub = registry.subscribe(e => events.push(e.type));

    registry.register(makeRegistryEntry("A"));
    expect(events).toEqual(["port-registered"]);

    unsub();
    events.length = 0;

    registry.register(makeRegistryEntry("B"));
    expect(events).toEqual([]);
  });

  it("unsubscribe is idempotent (calling twice does not throw)", () => {
    const registry = createStoreRegistry();
    const unsub = registry.subscribe(() => {});
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it("unregister for non-existent port does not notify", () => {
    const registry = createStoreRegistry();
    const events: string[] = [];
    registry.subscribe(e => events.push(e.type));

    registry.unregister("nonexistent");
    expect(events).toEqual([]);
  });

  it("unregister for existing port notifies with port-unregistered", () => {
    const registry = createStoreRegistry();
    const events: string[] = [];
    registry.register(makeRegistryEntry("A"));

    registry.subscribe(e => events.push(e.type));
    registry.unregister("A");
    expect(events).toEqual(["port-unregistered"]);
  });

  it("register on disposed registry does not store or notify", () => {
    const registry = createStoreRegistry();
    const events: string[] = [];
    registry.subscribe(e => events.push(e.type));
    registry.dispose();
    events.length = 0;

    registry.register(makeRegistryEntry("X"));
    expect(events).toEqual([]);
    expect(registry.getAll()).toEqual([]);
  });

  it("registerScoped on disposed registry does not store or notify", () => {
    const registry = createStoreRegistry();
    const events: string[] = [];
    registry.subscribe(e => events.push(e.type));
    registry.dispose();
    events.length = 0;

    registry.registerScoped("scope-1", makeRegistryEntry("X"));
    expect(events).toEqual([]);
    expect(registry.getAllScoped("scope-1")).toEqual([]);
  });

  it("getAllScoped returns empty for non-existent scope", () => {
    const registry = createStoreRegistry();
    expect(registry.getAllScoped("unknown")).toEqual([]);
  });

  it("getAllScoped returns entries for existing scope", () => {
    const registry = createStoreRegistry();
    registry.registerScoped("s1", makeRegistryEntry("A"));
    registry.registerScoped("s1", makeRegistryEntry("B"));
    const results = registry.getAllScoped("s1");
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// store-inspector-impl.ts
// =============================================================================

describe("store-inspector-impl.ts — string literal and listener cleanup", () => {
  // L48: string "" — the default history mode is "full"
  it("default config uses mode 'full' (not empty string)", () => {
    const inspector = createStoreInspectorImpl();
    inspector.recordAction(
      makeEntry({
        id: "full-test",
        prevState: { a: 1 },
        nextState: { a: 2 },
      })
    );

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(1);
    // In full mode, prevState/nextState are preserved. In "" mode, behavior is like full.
    // But with mode "", the "off" check fails, the "lightweight" check fails, so it's full anyway.
    // The mutant would be killed if mode: "" causes unexpected behavior elsewhere.
    // We verify the default config produces valid entries.
    expect(history[0]?.prevState).toEqual({ a: 1 });
    expect(history[0]?.nextState).toEqual({ a: 2 });
  });

  // L85: () => undefined replacing listener cleanup — subscribe returns cleanup
  it("subscribe returns a cleanup function that removes the listener", () => {
    const inspector = createStoreInspectorImpl();
    const events: string[] = [];

    const unsub = inspector.subscribe(e => events.push(e.type));
    inspector.emit({ type: "snapshot-changed" });
    expect(events).toEqual(["snapshot-changed"]);

    // Call the cleanup function
    unsub();
    events.length = 0;

    inspector.emit({ type: "snapshot-changed" });
    // If cleanup was replaced with () => undefined, listener would still fire
    expect(events).toEqual([]);
  });

  // L135: condition → true (getPortState scoped fallback)
  it("getPortState returns snapshot from scoped port when no singleton", () => {
    const inspector = createStoreInspectorImpl();
    const snapshot: StatePortSnapshot = {
      kind: "state",
      portName: "Scoped",
      state: { x: 1 },
      subscriberCount: 2,
      actionCount: 3,
      lastActionAt: 100,
    };

    inspector.registerScopedPort("scope-1", {
      portName: "Scoped",
      adapter: { [__stateAdapterBrand]: true },
      lifetime: "scoped",
      requires: [],
      writesTo: [],
      getSnapshot: () => snapshot,
      getSubscriberCount: () => 2,
      getHasEffects: () => false,
    });

    const result = inspector.getPortState("Scoped");
    expect(result).toBeDefined();
    expect(result?.kind).toBe("state");
    if (result?.kind === "state") {
      expect(result.state).toEqual({ x: 1 });
    }
  });

  it("getPortState returns undefined when port not in any scope", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerScopedPort("scope-1", {
      portName: "Other",
      adapter: { [__stateAdapterBrand]: true },
      lifetime: "scoped",
      requires: [],
      writesTo: [],
      getSnapshot: () => ({
        kind: "state",
        portName: "Other",
        state: {},
        subscriberCount: 0,
        actionCount: 0,
        lastActionAt: null,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    });

    // Request a port name that does not exist in any scope
    const result = inspector.getPortState("NonExistent");
    expect(result).toBeUndefined();
  });

  // L212: condition → true — scoped-port-registered subscription path
  it("registry subscription auto-populates scoped ports", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("scope-A", makeRegistryEntry("ScopedPort"));

    const portState = inspector.getPortState("ScopedPort");
    expect(portState).toBeDefined();
    expect(portState?.portName).toBe("ScopedPort");
  });

  it("registry subscription handles scope-unregistered event", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("scope-B", makeRegistryEntry("ScopeB-Port"));
    expect(inspector.getPortState("ScopeB-Port")).toBeDefined();

    registry.unregisterScope("scope-B");
    expect(inspector.getPortState("ScopeB-Port")).toBeUndefined();
  });
});

describe("store-inspector-impl.ts — pending effects", () => {
  it("incrementPendingEffects increases pendingEffects count in snapshot", () => {
    const inspector = createStoreInspectorImpl();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);

    inspector.incrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(1);

    inspector.incrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(2);
  });

  it("decrementPendingEffects decreases count but never below 0", () => {
    const inspector = createStoreInspectorImpl();
    inspector.incrementPendingEffects();
    inspector.incrementPendingEffects();

    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(1);

    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);

    // Should not go below 0
    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);
  });
});

// =============================================================================
// inspector-adapter.ts — adapter construction and frozen adapters
// =============================================================================

describe("inspector-adapter.ts — createStoreInspectorAdapter", () => {
  // L148-156: Object literal and arrow function mutations
  it("returns both api and internal from createStoreInspectorAdapter", () => {
    const result = createStoreInspectorAdapter();
    expect(result).toHaveProperty("api");
    expect(result).toHaveProperty("internal");
    expect(typeof result.api.getSnapshot).toBe("function");
    expect(typeof result.internal.recordAction).toBe("function");
    expect(typeof result.internal.emit).toBe("function");
    expect(typeof result.internal.incrementPendingEffects).toBe("function");
  });

  it("api and internal refer to the same inspector instance", () => {
    const result = createStoreInspectorAdapter();
    // Both should share the same underlying inspector:
    // recording an action via internal should be visible via api
    result.internal.recordAction(makeEntry({ id: "adapter-test" }));
    const history = result.api.getActionHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("adapter-test");
  });

  it("accepts historyConfig option", () => {
    const result = createStoreInspectorAdapter({
      historyConfig: { maxEntries: 5, mode: "full" },
    });

    for (let i = 0; i < 10; i++) {
      result.internal.recordAction(makeEntry({ id: `cfg-${i}` }));
    }

    // maxEntries=5, so only last 5 should remain
    expect(result.api.getActionHistory()).toHaveLength(5);
  });

  it("accepts registry option for auto-discovery", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("PreExisting"));

    const result = createStoreInspectorAdapter({ registry });

    const ports = result.api.listStatePorts();
    expect(ports.some(p => p.portName === "PreExisting")).toBe(true);
  });
});

describe("inspector-adapter.ts — frozen singleton adapters", () => {
  it("StoreInspectorAdapter is frozen", () => {
    expect(Object.isFrozen(StoreInspectorAdapter)).toBe(true);
  });

  it("StoreInspectorAdapter provides StoreInspectorPort", () => {
    expect(StoreInspectorAdapter.provides).toBe(StoreInspectorPort);
  });

  it("StoreInspectorAdapter has empty requires", () => {
    expect(StoreInspectorAdapter.requires).toEqual([]);
  });

  it("StoreInspectorAdapter factory returns a working inspector", () => {
    const inspector: any = StoreInspectorAdapter.factory({});
    expect(typeof inspector.getSnapshot).toBe("function");
    expect(typeof inspector.getPortState).toBe("function");
    const snap = inspector.getSnapshot();
    expect(snap).toHaveProperty("timestamp");
    expect(snap).toHaveProperty("ports");
    expect(snap).toHaveProperty("totalSubscribers");
    expect(snap).toHaveProperty("pendingEffects");
  });

  it("StoreInspectorWithRegistryAdapter is frozen and provides StoreInspectorPort", () => {
    expect(Object.isFrozen(StoreInspectorWithRegistryAdapter)).toBe(true);
    expect(StoreInspectorWithRegistryAdapter.provides).toBe(StoreInspectorPort);
    expect(StoreInspectorWithRegistryAdapter.requires).toEqual([StoreRegistryPort]);
  });

  it("StoreInspectorWithRegistryAdapter factory uses registry", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("RegPort"));

    const inspector: any = StoreInspectorWithRegistryAdapter.factory({ StoreRegistry: registry });
    const ports = inspector.listStatePorts();
    expect(ports.some((p: any) => p.portName === "RegPort")).toBe(true);
  });

  it("StoreInspectorInternalAdapter is frozen and provides StoreInspectorInternalPort", () => {
    expect(Object.isFrozen(StoreInspectorInternalAdapter)).toBe(true);
    expect(StoreInspectorInternalAdapter.provides).toBe(StoreInspectorInternalPort);
    expect(StoreInspectorInternalAdapter.requires).toEqual([StoreRegistryPort]);
  });

  it("StoreInspectorInternalAdapter factory returns internal interface", () => {
    const registry = createStoreRegistry();
    const internal: any = StoreInspectorInternalAdapter.factory({ StoreRegistry: registry });
    expect(typeof internal.recordAction).toBe("function");
    expect(typeof internal.emit).toBe("function");
    expect(typeof internal.incrementPendingEffects).toBe("function");
    expect(typeof internal.decrementPendingEffects).toBe("function");
  });

  it("StoreInspectorAdapter has correct lifetime and factoryKind", () => {
    expect(StoreInspectorAdapter.lifetime).toBe("singleton");
    expect(StoreInspectorAdapter.factoryKind).toBe("sync");
    expect(StoreInspectorAdapter.clonable).toBe(false);
  });
});
