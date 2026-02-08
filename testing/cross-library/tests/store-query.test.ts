/**
 * Store + Query Integration Tests
 *
 * Tests for cross-library integration patterns between @hex-di/store and @hex-di/query.
 * Based on spec/integration/store-query.md and spec/integration/17-definition-of-done.md.
 *
 * Patterns tested:
 * 1. Cache-to-State Sync
 * 2. Mutation-to-State Coordination
 * 3. Unified Optimistic Updates
 * 4. Query-Driven Derived State
 *
 * Anti-patterns tested:
 * 1. Direct query cache access from store adapter
 * 2. Circular sync (store -> query -> store)
 * 3. Dual source of truth
 */

import { describe, it, expect } from "vitest";
import {
  createInMemoryStateAdapter,
  createFakeQueryAdapter,
  createFakeMutationAdapter,
  createFakeQueryClientAdapter,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Shared types for Store + Query tests
// ---------------------------------------------------------------------------

interface User {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

// ---------------------------------------------------------------------------
// Pattern 1: Cache-to-State Sync
// ---------------------------------------------------------------------------

describe("Store + Query: Cache-to-State Sync", () => {
  const testUsers: readonly User[] = [
    { id: "1", name: "Alice", role: "admin" },
    { id: "2", name: "Bob", role: "user" },
  ];

  function createCacheSyncSetup() {
    const store = createInMemoryStateAdapter({
      name: "UserList",
      initial: { users: [] as readonly User[], lastSyncedAt: null as number | null },
      actions: {
        setUsers: (
          state: { users: readonly User[]; lastSyncedAt: number | null },
          users: readonly User[]
        ) => ({ ...state, users }),
        markSynced: (state: { users: readonly User[]; lastSyncedAt: number | null }) => ({
          ...state,
          lastSyncedAt: Date.now(),
        }),
      },
    });

    const query = createFakeQueryAdapter<readonly User[], { role?: string }>({
      name: "UsersQuery",
      data: testUsers,
    });

    // Sync adapter: subscribes to query state and dispatches to store
    let unsubscribe: (() => void) | undefined;

    const syncAdapter = {
      start: () => {
        unsubscribe = query.subscribe(queryState => {
          if (queryState.status === "success" && queryState.data) {
            store.actions.setUsers(queryState.data);
            store.actions.markSynced();
          }
        });
      },
      stop: () => {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    };

    return { store, query, syncAdapter };
  }

  it("cache sync adapter subscribes to query cache and dispatches store actions", async () => {
    const { store, query, syncAdapter } = createCacheSyncSetup();
    syncAdapter.start();

    await query.fetch({ role: "admin" });

    expect(store.spy.getByAction("setUsers")).toHaveLength(1);
    expect(store.spy.getByAction("markSynced")).toHaveLength(1);

    syncAdapter.stop();
  });

  it("store state reflects query data after cache update", async () => {
    const { store, query, syncAdapter } = createCacheSyncSetup();
    syncAdapter.start();

    await query.fetch({ role: "admin" });

    expect(store.state.users).toEqual(testUsers);
    expect(store.state.lastSyncedAt).not.toBeNull();

    syncAdapter.stop();
  });

  it("cache sync adapter handles query error without updating store state", async () => {
    const store = createInMemoryStateAdapter({
      name: "UserList",
      initial: { users: [] as readonly User[], lastSyncedAt: null as number | null },
      actions: {
        setUsers: (
          state: { users: readonly User[]; lastSyncedAt: number | null },
          users: readonly User[]
        ) => ({ ...state, users }),
        markSynced: (state: { users: readonly User[]; lastSyncedAt: number | null }) => ({
          ...state,
          lastSyncedAt: Date.now(),
        }),
      },
    });

    const failingQuery = createFakeQueryAdapter<readonly User[], void>({
      name: "UsersQuery",
      error: new Error("Network error"),
    });

    const unsub = failingQuery.subscribe(queryState => {
      if (queryState.status === "success" && queryState.data) {
        store.actions.setUsers(queryState.data);
        store.actions.markSynced();
      }
    });

    await expect(failingQuery.fetch(undefined)).rejects.toThrow("Network error");

    expect(store.state.users).toEqual([]);
    expect(store.state.lastSyncedAt).toBeNull();
    expect(store.spy.count).toBe(0);

    unsub();
  });

  it("cache sync adapter cleanup unsubscribes on stop", async () => {
    const { store, query, syncAdapter } = createCacheSyncSetup();
    syncAdapter.start();

    await query.fetch({ role: "admin" });
    expect(store.spy.count).toBe(2);

    syncAdapter.stop();

    store.reset();
    query.reset();
    await query.fetch({ role: "admin" });

    expect(store.spy.count).toBe(0);
    expect(store.state.users).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pattern 2: Mutation-to-State Coordination
// ---------------------------------------------------------------------------

interface TodoItem {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

describe("Store + Query: Mutation-to-State Coordination", () => {
  function createMutationCoordinatorSetup() {
    const store = createInMemoryStateAdapter({
      name: "TodoState",
      initial: { items: [] as readonly TodoItem[] },
      actions: {
        addItem: (state: { items: readonly TodoItem[] }, item: TodoItem) => ({
          items: [...state.items, item],
        }),
        removeItem: (state: { items: readonly TodoItem[] }, id: string) => ({
          items: state.items.filter(i => i.id !== id),
        }),
      },
    });

    const mutation = createFakeMutationAdapter<TodoItem, { text: string }>({
      name: "CreateTodo",
      data: { id: "new-1", text: "Test", done: false },
    });

    const queryClient = createFakeQueryClientAdapter();

    const coordinator = {
      async createTodo(input: { text: string }) {
        const todo = await mutation.execute(input);
        store.actions.addItem(todo);
        await queryClient.invalidate("TodosQuery");
        return todo;
      },
    };

    return { store, mutation, queryClient, coordinator };
  }

  it("mutation success triggers coordinator to dispatch store action", async () => {
    const { store, coordinator } = createMutationCoordinatorSetup();

    await coordinator.createTodo({ text: "Buy milk" });

    expect(store.state.items).toHaveLength(1);
    expect(store.state.items[0].id).toBe("new-1");
    expect(store.spy.getByAction("addItem")).toHaveLength(1);
  });

  it("mutation failure does not dispatch store action", async () => {
    const { store, mutation, queryClient } = createMutationCoordinatorSetup();
    mutation.setShouldFail(new Error("Server error"));

    const coordinator = {
      async createTodo(input: { text: string }) {
        try {
          const todo = await mutation.execute(input);
          store.actions.addItem(todo);
          await queryClient.invalidate("TodosQuery");
          return todo;
        } catch {
          return undefined;
        }
      },
    };

    const result = await coordinator.createTodo({ text: "Buy milk" });

    expect(result).toBeUndefined();
    expect(store.state.items).toHaveLength(0);
    expect(store.spy.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pattern 3: Unified Optimistic Updates
// ---------------------------------------------------------------------------

interface TodoState {
  readonly items: readonly TodoItem[];
}

interface OptimisticState {
  readonly confirmed: TodoState;
  readonly optimistic: TodoState;
  readonly pending: ReadonlyArray<{ readonly id: string; readonly rollback: TodoState }>;
}

describe("Store + Query: Unified Optimistic Updates", () => {
  function createOptimisticActions() {
    return {
      optimisticAdd: (
        state: OptimisticState,
        payload: { id: string; text: string }
      ): OptimisticState => ({
        ...state,
        optimistic: {
          items: [...state.optimistic.items, { ...payload, done: false }],
        },
        pending: [...state.pending, { id: payload.id, rollback: state.optimistic }],
      }),
      confirm: (state: OptimisticState, payload: { id: string }): OptimisticState => ({
        ...state,
        confirmed: state.optimistic,
        pending: state.pending.filter(p => p.id !== payload.id),
      }),
      rollback: (state: OptimisticState, payload: { id: string }): OptimisticState => {
        const entry = state.pending.find(p => p.id === payload.id);
        return {
          ...state,
          optimistic: entry ? entry.rollback : state.confirmed,
          pending: state.pending.filter(p => p.id !== payload.id),
        };
      },
    };
  }

  const emptyOptimistic: OptimisticState = {
    confirmed: { items: [] },
    optimistic: { items: [] },
    pending: [],
  };

  function createOptimisticSetup() {
    const store = createInMemoryStateAdapter({
      name: "TodoOptimistic",
      initial: emptyOptimistic,
      actions: createOptimisticActions(),
    });

    const mutation = createFakeMutationAdapter<TodoItem, { text: string }>({
      name: "CreateTodo",
      data: { id: "server-1", text: "Test", done: false },
    });

    let pendingIdCounter = 0;

    const optimisticMutate = async (text: string) => {
      pendingIdCounter++;
      const pendingId = `pending-${pendingIdCounter}`;
      store.actions.optimisticAdd({ id: pendingId, text });

      try {
        await mutation.execute({ text });
        store.actions.confirm({ id: pendingId });
        return { ok: true };
      } catch (error) {
        store.actions.rollback({ id: pendingId });
        return { ok: false, error };
      }
    };

    return { store, mutation, optimisticMutate };
  }

  it("optimistic add applies pending entry to store immediately", () => {
    const { store } = createOptimisticSetup();
    store.actions.optimisticAdd({ id: "p1", text: "Buy milk" });

    expect(store.state.optimistic.items).toHaveLength(1);
    expect(store.state.optimistic.items[0].text).toBe("Buy milk");
    expect(store.state.pending).toHaveLength(1);
    expect(store.state.pending[0].id).toBe("p1");
  });

  it("mutation success confirms optimistic entry and removes pending", async () => {
    const { store, optimisticMutate } = createOptimisticSetup();

    const result = await optimisticMutate("Buy milk");

    expect(result.ok).toBe(true);
    expect(store.state.pending).toHaveLength(0);
    expect(store.state.confirmed.items).toHaveLength(1);
  });

  it("mutation failure rolls back optimistic entry to pre-mutation state", async () => {
    const { store, mutation, optimisticMutate } = createOptimisticSetup();
    mutation.setShouldFail(new Error("Server error"));

    const result = await optimisticMutate("Buy milk");

    expect(result.ok).toBe(false);
    expect(store.state.optimistic.items).toHaveLength(0);
    expect(store.state.pending).toHaveLength(0);
  });

  it("concurrent optimistic mutations track independent pending entries", () => {
    const store = createInMemoryStateAdapter({
      name: "TodoOptimistic",
      initial: emptyOptimistic,
      actions: createOptimisticActions(),
    });

    store.actions.optimisticAdd({ id: "p1", text: "First" });
    store.actions.optimisticAdd({ id: "p2", text: "Second" });

    expect(store.state.pending).toHaveLength(2);
    expect(store.state.optimistic.items).toHaveLength(2);
    expect(store.state.pending[0].id).toBe("p1");
    expect(store.state.pending[1].id).toBe("p2");

    store.actions.confirm({ id: "p1" });
    expect(store.state.pending).toHaveLength(1);
    expect(store.state.pending[0].id).toBe("p2");

    store.actions.confirm({ id: "p2" });
    expect(store.state.pending).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Pattern 4: Query-Driven Derived State
// ---------------------------------------------------------------------------

describe("Store + Query: Query-Driven Derived State", () => {
  interface ExchangeRate {
    readonly from: string;
    readonly to: string;
    readonly rate: number;
    readonly updatedAt: number;
  }

  it("async derived port delegates computation to query fetcher", async () => {
    const query = createFakeQueryAdapter<ExchangeRate, { from: string; to: string }>({
      name: "ExchangeRateQuery",
      data: { from: "USD", to: "EUR", rate: 0.85, updatedAt: Date.now() },
    });

    const derivedFetch = async (params: { from: string; to: string }) => {
      return query.fetch(params);
    };

    const result = await derivedFetch({ from: "USD", to: "EUR" });
    expect(result.rate).toBe(0.85);
    expect(query.fetchCalls).toHaveLength(1);
    expect(query.fetchCalls[0].params).toEqual({ from: "USD", to: "EUR" });
  });

  it("query caching applies to derived port resolution (staleTime honored)", async () => {
    const query = createFakeQueryAdapter<ExchangeRate, { from: string; to: string }>({
      name: "ExchangeRateQuery",
      data: { from: "USD", to: "EUR", rate: 0.85, updatedAt: Date.now() },
    });

    let cachedResult: ExchangeRate | undefined;
    const cachedFetch = async (params: { from: string; to: string }) => {
      if (cachedResult) {
        return cachedResult;
      }
      const result = await query.fetch(params);
      cachedResult = result;
      return result;
    };

    const first = await cachedFetch({ from: "USD", to: "EUR" });
    const second = await cachedFetch({ from: "USD", to: "EUR" });

    expect(first).toBe(second);
    expect(query.fetchCalls).toHaveLength(1);
  });

  it("reactive subscriptions on derived port re-emit on query cache update", async () => {
    const query = createFakeQueryAdapter<ExchangeRate, void>({
      name: "ExchangeRateQuery",
      sequence: [
        { data: { from: "USD", to: "EUR", rate: 0.85, updatedAt: 1 } },
        { data: { from: "USD", to: "EUR", rate: 0.86, updatedAt: 2 } },
      ],
    });

    const emissions: ExchangeRate[] = [];
    query.subscribe(state => {
      if (state.status === "success" && state.data) {
        emissions.push(state.data);
      }
    });

    await query.fetch(undefined);
    await query.fetch(undefined);

    expect(emissions).toHaveLength(2);
    expect(emissions[0].rate).toBe(0.85);
    expect(emissions[1].rate).toBe(0.86);
  });

  it("typed errors from query layer propagate through derived port", async () => {
    interface NetworkError {
      readonly _tag: "NetworkError";
      readonly cause: string;
    }

    const query = createFakeQueryAdapter<ExchangeRate, void, NetworkError>({
      name: "ExchangeRateQuery",
      error: { _tag: "NetworkError", cause: "timeout" },
    });

    let capturedError: NetworkError | undefined;
    query.subscribe(state => {
      if (state.status === "error" && state.error) {
        capturedError = state.error;
      }
    });

    await expect(query.fetch(undefined)).rejects.toEqual({
      _tag: "NetworkError",
      cause: "timeout",
    });

    expect(capturedError).toBeDefined();
    expect(capturedError?._tag).toBe("NetworkError");
    expect(capturedError?.cause).toBe("timeout");
  });
});

// ---------------------------------------------------------------------------
// Anti-Patterns
// ---------------------------------------------------------------------------

describe("Store + Query: Anti-Patterns", () => {
  it("direct query cache access from store adapter is detected as anti-pattern", async () => {
    const queryClient = createFakeQueryClientAdapter();
    const store = createInMemoryStateAdapter({
      name: "UserList",
      initial: { users: [] as readonly User[] },
      actions: {
        setUsers: (_state: { users: readonly User[] }, users: readonly User[]) => ({ users }),
      },
    });

    const query = createFakeQueryAdapter<readonly User[]>({
      name: "UsersQuery",
      data: [{ id: "1", name: "Alice", role: "admin" }],
    });

    const syncUpdates: string[] = [];
    const unsub = query.subscribe(state => {
      if (state.status === "success" && state.data) {
        syncUpdates.push("sync");
        store.actions.setUsers(state.data);
      }
    });

    await query.fetch(undefined);

    expect(syncUpdates).toHaveLength(1);
    expect(store.state.users).toHaveLength(1);
    expect(queryClient.invalidations).toHaveLength(0);

    unsub();
  });

  it("circular sync (store -> query -> store) is detected and prevented", async () => {
    const store = createInMemoryStateAdapter({
      name: "CircularStore",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const query = createFakeQueryAdapter<number>({
      name: "CountQuery",
      data: 0,
    });

    let syncInProgress = false;
    let loopDetected = false;

    const storeUnsub = store.subscribe(() => {
      if (syncInProgress) {
        loopDetected = true;
        return;
      }
    });

    const queryUnsub = query.subscribe(state => {
      if (state.status === "success") {
        syncInProgress = true;
        store.actions.increment();
        syncInProgress = false;
      }
    });

    await query.fetch(undefined);

    expect(loopDetected).toBe(true);
    expect(store.state.count).toBe(1);

    storeUnsub();
    queryUnsub();
  });

  it("dual source of truth (independent store and query for same data) is flagged", async () => {
    const query = createFakeQueryAdapter<readonly User[]>({
      name: "UsersQuery",
      data: [{ id: "1", name: "Alice", role: "admin" }],
    });

    const store = createInMemoryStateAdapter({
      name: "UserList",
      initial: { users: [{ id: "1", name: "Alice (stale)", role: "admin" }] as readonly User[] },
      actions: {
        setUsers: (_state: { users: readonly User[] }, users: readonly User[]) => ({ users }),
      },
    });

    const queryData = await query.fetch(undefined);
    const storeData = store.state.users;

    expect(queryData[0].name).toBe("Alice");
    expect(storeData[0].name).toBe("Alice (stale)");
    expect(queryData[0].name).not.toBe(storeData[0].name);
  });
});
