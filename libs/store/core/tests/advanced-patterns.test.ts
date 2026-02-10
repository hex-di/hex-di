/**
 * DOD 13: Advanced Patterns
 *
 * Tests for linked derived, optimistic update, undo/redo, multi-tenant,
 * and hydration patterns using existing store primitives.
 */

import { describe, it, expect, vi } from "vitest";
import { createSignal, createComputed } from "../src/index.js";
import type { Signal, ActionMap } from "../src/index.js";
import type { HydrationError } from "../src/index.js";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import type { StateServiceInternal } from "../src/services/state-service-impl.js";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
import { ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// =============================================================================
// 1. Linked Derived
// =============================================================================

describe("Linked derived pattern", () => {
  function createTemperaturePair(): {
    celsius: Signal<number>;
    fahrenheit: ReturnType<typeof createLinkedDerivedServiceImpl<number>>;
  } {
    const celsius = createSignal(100);
    const fahrenheit = createLinkedDerivedServiceImpl<number>({
      portName: "Fahrenheit",
      containerName: "root",
      select: () => (celsius.get() * 9) / 5 + 32,
      write: (f: number) => celsius.set(((f - 32) * 5) / 9),
    });
    return { celsius, fahrenheit };
  }

  it("fahrenheit.value computes from celsius source", () => {
    const { fahrenheit } = createTemperaturePair();
    // 100C = 212F
    expect(fahrenheit.value).toBe(212);
  });

  it("fahrenheit.set(212) writes back to celsius source (sets to 100)", () => {
    const { celsius, fahrenheit } = createTemperaturePair();

    // Start from celsius=100, change fahrenheit to 212 explicitly
    celsius.set(0); // reset celsius to 0
    fahrenheit.set(212);
    expect(celsius.get()).toBeCloseTo(100);
  });

  it("bidirectional update propagates correctly", () => {
    const { celsius, fahrenheit } = createTemperaturePair();

    // Initial: 100C = 212F
    expect(fahrenheit.value).toBe(212);

    // Write via fahrenheit -> celsius changes
    fahrenheit.set(32);
    expect(celsius.get()).toBeCloseTo(0);
    expect(fahrenheit.value).toBe(32);

    // Write via celsius -> fahrenheit changes
    celsius.set(100);
    expect(fahrenheit.value).toBe(212);
  });
});

// =============================================================================
// 2. Optimistic Update Pattern
// =============================================================================

/**
 * Test-only optimistic update helper built on createSignal.
 *
 * Manages an items list with optimistic additions that can be
 * confirmed or rolled back.
 */
interface OptimisticEntry<T> {
  readonly id: string;
  readonly value: T;
}

interface OptimisticState<T> {
  readonly confirmed: readonly T[];
  readonly pending: readonly OptimisticEntry<T>[];
}

function createOptimisticStore<T>(): {
  state: Signal<OptimisticState<T>>;
  computed: ReturnType<typeof createComputed<readonly T[]>>;
  optimisticAdd: (id: string, value: T) => void;
  confirm: (id: string) => void;
  rollback: (id: string) => void;
} {
  const state = createSignal<OptimisticState<T>>({
    confirmed: [],
    pending: [],
  });

  // Computed view: confirmed + pending values
  const computed = createComputed(() => {
    const s = state.get();
    return [...s.confirmed, ...s.pending.map(p => p.value)];
  });

  function optimisticAdd(id: string, value: T): void {
    const current = state.get();
    state.set({
      ...current,
      pending: [...current.pending, { id, value }],
    });
  }

  function confirm(id: string): void {
    const current = state.get();
    const entry = current.pending.find(p => p.id === id);
    if (!entry) return;
    state.set({
      confirmed: [...current.confirmed, entry.value],
      pending: current.pending.filter(p => p.id !== id),
    });
  }

  function rollback(id: string): void {
    const current = state.get();
    state.set({
      ...current,
      pending: current.pending.filter(p => p.id !== id),
    });
  }

  return { state, computed, optimisticAdd, confirm, rollback };
}

describe("Optimistic update pattern", () => {
  it("optimisticAdd sets optimistic state immediately", () => {
    const store = createOptimisticStore<string>();

    store.optimisticAdd("op-1", "new-item");

    // Pending contains the item
    expect(store.state.get().pending).toHaveLength(1);
    expect(store.state.get().pending[0]?.id).toBe("op-1");

    // Computed view includes it
    expect(store.computed.get()).toEqual(["new-item"]);
  });

  it("confirm removes pending entry and moves to confirmed", () => {
    const store = createOptimisticStore<string>();

    store.optimisticAdd("op-1", "item-a");
    store.confirm("op-1");

    expect(store.state.get().pending).toHaveLength(0);
    expect(store.state.get().confirmed).toEqual(["item-a"]);
    expect(store.computed.get()).toEqual(["item-a"]);
  });

  it("rollback restores previous state (removes pending entry)", () => {
    const store = createOptimisticStore<string>();

    store.optimisticAdd("op-1", "item-a");
    expect(store.computed.get()).toEqual(["item-a"]);

    store.rollback("op-1");

    expect(store.state.get().pending).toHaveLength(0);
    expect(store.computed.get()).toEqual([]);
  });

  it("onEffectError triggers rollback on Err", async () => {
    const store = createOptimisticStore<string>();

    interface ItemsState {
      readonly items: readonly string[];
      readonly lastRolledBack: string;
    }

    interface ItemsActions extends ActionMap<ItemsState> {
      addItem: (state: ItemsState, item: string) => ItemsState;
      removeItem: (state: ItemsState, item: string) => ItemsState;
    }

    const svc = createStateServiceImpl<ItemsState, ItemsActions>({
      portName: "OptimisticCounter",
      containerName: "root",
      initial: { items: [], lastRolledBack: "" },
      actions: {
        addItem: (state, item) => ({
          ...state,
          items: [...state.items, item],
        }),
        removeItem: (state, item) => ({
          ...state,
          items: state.items.filter(i => i !== item),
          lastRolledBack: item,
        }),
      },
      effects: {
        addItem: () =>
          ResultAsync.fromPromise(Promise.reject(new Error("server rejected")), e => e),
      },
      onEffectError: ctx => {
        // Compensating action: rollback the optimistic entry
        store.rollback("rollback-target");
        // Also dispatch compensating action in the state service
        if (ctx.prevState.items.length === 0) {
          ctx.actions.removeItem("optimistic-item");
        }
      },
    });

    // Add optimistic entry in our store
    store.optimisticAdd("rollback-target", "optimistic-item");
    expect(store.computed.get()).toEqual(["optimistic-item"]);

    // Dispatch the action that will fail via effect
    svc.actions.addItem("optimistic-item");
    await new Promise(r => setTimeout(r, 50));

    // The rollback should have been called by onEffectError
    expect(store.state.get().pending).toHaveLength(0);
    expect(store.computed.get()).toEqual([]);
  });
});

// =============================================================================
// 3. Undo/Redo Pattern
// =============================================================================

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

function createUndoRedoStore<T>(initial: T): {
  state: Signal<UndoRedoState<T>>;
  push: (value: T) => void;
  undo: () => void;
  redo: () => void;
} {
  const state = createSignal<UndoRedoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  function push(value: T): void {
    const current = state.get();
    state.set({
      past: [...current.past, current.present],
      present: value,
      future: [], // clear future on new push
    });
  }

  function undo(): void {
    const current = state.get();
    if (current.past.length === 0) return;
    const previousPast = [...current.past];
    const newPresent = previousPast.pop();
    if (newPresent === undefined) return;
    state.set({
      past: previousPast,
      present: newPresent,
      future: [current.present, ...current.future],
    });
  }

  function redo(): void {
    const current = state.get();
    if (current.future.length === 0) return;
    const previousFuture = [...current.future];
    const newPresent = previousFuture.shift();
    if (newPresent === undefined) return;
    state.set({
      past: [...current.past, current.present],
      present: newPresent,
      future: previousFuture,
    });
  }

  return { state, push, undo, redo };
}

describe("Undo/redo pattern", () => {
  it("push adds to past, clears future", () => {
    const store = createUndoRedoStore(0);

    store.push(1);
    store.push(2);

    const s = store.state.get();
    expect(s.past).toEqual([0, 1]);
    expect(s.present).toBe(2);
    expect(s.future).toEqual([]);
  });

  it("undo moves present to future, past.pop() to present", () => {
    const store = createUndoRedoStore(0);

    store.push(1);
    store.push(2);
    store.undo();

    const s = store.state.get();
    expect(s.past).toEqual([0]);
    expect(s.present).toBe(1);
    expect(s.future).toEqual([2]);
  });

  it("redo moves present to past, future.pop() to present", () => {
    const store = createUndoRedoStore(0);

    store.push(1);
    store.push(2);
    store.undo();
    store.redo();

    const s = store.state.get();
    expect(s.past).toEqual([0, 1]);
    expect(s.present).toBe(2);
    expect(s.future).toEqual([]);
  });
});

// =============================================================================
// 4. Multi-tenant Pattern
// =============================================================================

interface PreferencesState {
  readonly theme: string;
  readonly locale: string;
}

interface PreferencesActions extends ActionMap<PreferencesState> {
  setTheme: (state: PreferencesState, theme: string) => PreferencesState;
  setLocale: (state: PreferencesState, locale: string) => PreferencesState;
}

describe("Multi-tenant pattern", () => {
  function createTenantStateService(
    tenantId: string
  ): StateServiceInternal<PreferencesState, PreferencesActions> {
    return createStateServiceImpl<PreferencesState, PreferencesActions>({
      portName: `Preferences:${tenantId}`,
      containerName: `tenant:${tenantId}`,
      initial: { theme: "light", locale: "en" },
      actions: {
        setTheme: (state, theme) => ({
          ...state,
          theme,
        }),
        setLocale: (state, locale) => ({
          ...state,
          locale,
        }),
      },
    });
  }

  it("scoped port produces independent state per tenant scope", () => {
    const tenantA = createTenantStateService("tenant-a");
    const tenantB = createTenantStateService("tenant-b");

    tenantA.actions.setTheme("dark");

    expect(tenantA.state).toEqual({ theme: "dark", locale: "en" });
    expect(tenantB.state).toEqual({ theme: "light", locale: "en" });
  });

  it("tenant A changes do not affect tenant B", () => {
    const tenantA = createTenantStateService("tenant-a");
    const tenantB = createTenantStateService("tenant-b");

    const bListener = vi.fn();
    tenantB.subscribe(bListener);

    tenantA.actions.setTheme("dark");
    tenantA.actions.setLocale("fr");

    // Tenant B's listener should never have been called
    expect(bListener).not.toHaveBeenCalled();
    expect(tenantB.state).toEqual({ theme: "light", locale: "en" });
  });
});

// =============================================================================
// 5. Hydration Pattern
// =============================================================================

/**
 * Test-only StateHydrator using the HydrationError type from effects.ts.
 *
 * Demonstrates the hydration pattern with a simple in-memory storage adapter.
 */

interface StateHydrator {
  hydrate(key: string): ResultAsync<unknown, HydrationError>;
  dehydrate(key: string, value: unknown): ResultAsync<void, HydrationError>;
}

function createLocalStorageHydrator(storage: Map<string, string>): StateHydrator {
  return {
    hydrate(key: string): ResultAsync<unknown, HydrationError> {
      return ResultAsync.fromPromise(
        Promise.resolve().then(() => {
          const raw = storage.get(key);
          if (raw === undefined) return undefined;
          return JSON.parse(raw);
        }),
        (cause): HydrationError => ({
          _tag: "HydrationFailed",
          portName: key,
          cause,
        })
      );
    },

    dehydrate(key: string, value: unknown): ResultAsync<void, HydrationError> {
      return ResultAsync.fromPromise(
        Promise.resolve().then(() => {
          storage.set(key, JSON.stringify(value));
        }),
        (cause): HydrationError => ({
          _tag: "HydrationFailed",
          portName: key,
          cause,
        })
      );
    },
  };
}

describe("Hydration pattern", () => {
  it("StateHydrator.hydrate() returns ResultAsync<unknown, HydrationError>", async () => {
    const storage = new Map<string, string>();
    storage.set("counter", JSON.stringify({ count: 42 }));
    const hydrator = createLocalStorageHydrator(storage);

    const result: Result<unknown, HydrationError> = await hydrator.hydrate("counter");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ count: 42 });
    }
  });

  it("StateHydrator.dehydrate() returns ResultAsync<void, HydrationError>", async () => {
    const storage = new Map<string, string>();
    const hydrator = createLocalStorageHydrator(storage);

    const result: Result<void, HydrationError> = await hydrator.dehydrate("counter", { count: 10 });

    expect(result.isOk()).toBe(true);
    expect(storage.get("counter")).toBe(JSON.stringify({ count: 10 }));
  });

  it("localStorage adapter round-trip", async () => {
    const storage = new Map<string, string>();
    const hydrator = createLocalStorageHydrator(storage);

    const originalState = { theme: "dark", items: [1, 2, 3] };

    // Dehydrate
    const dehydrateResult = await hydrator.dehydrate("app-state", originalState);
    expect(dehydrateResult.isOk()).toBe(true);

    // Hydrate
    const hydrateResult = await hydrator.hydrate("app-state");
    expect(hydrateResult.isOk()).toBe(true);
    if (hydrateResult.isOk()) {
      expect(hydrateResult.value).toEqual(originalState);
    }
  });

  it("missing key returns Ok(undefined)", async () => {
    const storage = new Map<string, string>();
    const hydrator = createLocalStorageHydrator(storage);

    const result = await hydrator.hydrate("nonexistent-key");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  it('HydrationError has _tag: "HydrationFailed", portName, cause', () => {
    const cause = new Error("storage unavailable");
    const error: HydrationError = {
      _tag: "HydrationFailed",
      portName: "UserPreferences",
      cause,
    };

    expect(error._tag).toBe("HydrationFailed");
    expect(error.portName).toBe("UserPreferences");
    expect(error.cause).toBeInstanceOf(Error);
    expect(cause.message).toBe("storage unavailable");
  });
});
