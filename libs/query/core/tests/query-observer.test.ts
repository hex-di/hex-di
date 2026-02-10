import { describe, it, expect, vi } from "vitest";
import { ResultAsync, ok, err } from "@hex-di/result";
import { createQueryObserver, createQueryPort } from "../src/index.js";
import type { CacheEntry, QueryObserver } from "../src/index.js";

// =============================================================================
// Test Port
// =============================================================================

const TestPort = createQueryPort<string, { id: number }, Error>()({
  name: "TestQuery",
});

// =============================================================================
// Mock Factory
// =============================================================================

function createPendingCacheEntry(): CacheEntry<unknown, unknown> {
  return {
    result: undefined,
    data: undefined,
    error: null,
    status: "pending",
    fetchStatus: "idle",
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
    fetchCount: 0,
    isInvalidated: false,
  };
}

function createSuccessCacheEntry(data: unknown): CacheEntry<unknown, unknown> {
  return {
    result: ok(data),
    data,
    error: null,
    status: "success",
    fetchStatus: "idle",
    dataUpdatedAt: 1000,
    errorUpdatedAt: undefined,
    fetchCount: 1,
    isInvalidated: false,
  };
}

function createErrorCacheEntry(error: unknown): CacheEntry<unknown, unknown> {
  return {
    result: err(error),
    data: undefined,
    error,
    status: "error",
    fetchStatus: "idle",
    dataUpdatedAt: undefined,
    errorUpdatedAt: 2000,
    fetchCount: 1,
    isInvalidated: false,
  };
}

function createMockClient(opts?: {
  entry?: CacheEntry<unknown, unknown>;
  fetchResult?: ResultAsync<any, any>;
}) {
  let cacheListener: ((event: unknown) => void) | undefined;
  const unsubscribeCache = vi.fn();
  const currentEntry = { value: opts?.entry };
  let fetchResult = opts?.fetchResult ?? ResultAsync.ok("data");

  const client = {
    fetchQuery: vi.fn(() => fetchResult),
    cache: {
      get: vi.fn(() => currentEntry.value),
      getOrCreate: vi.fn(() => currentEntry.value ?? createPendingCacheEntry()),
      incrementObservers: vi.fn(),
      decrementObservers: vi.fn(),
      subscribe: vi.fn((listener: (event: unknown) => void) => {
        cacheListener = listener;
        return unsubscribeCache;
      }),
    },
  };

  return {
    client,
    unsubscribeCache,
    emitCacheEvent(event?: unknown) {
      cacheListener?.(event ?? { type: "updated" });
    },
    setEntry(entry: CacheEntry<unknown, unknown> | undefined) {
      currentEntry.value = entry;
    },
    setFetchResult(result: ResultAsync<any, any>) {
      fetchResult = result;
      client.fetchQuery.mockReturnValue(result);
    },
  };
}

const defaultParams = { id: 1 };

// =============================================================================
// Tests
// =============================================================================

describe("QueryObserver", () => {
  // ===========================================================================
  // 1. Factory & initialization
  // ===========================================================================

  describe("factory & initialization", () => {
    it("calls getOrCreate on creation", () => {
      const { client } = createMockClient();
      createQueryObserver(client, TestPort, defaultParams, { enabled: false });
      expect(client.cache.getOrCreate).toHaveBeenCalledWith(TestPort, defaultParams);
    });

    it("calls incrementObservers on creation", () => {
      const { client } = createMockClient();
      createQueryObserver(client, TestPort, defaultParams, { enabled: false });
      expect(client.cache.incrementObservers).toHaveBeenCalledWith(TestPort, defaultParams);
    });

    it("initial state is pending when no cache entry exists", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.status).toBe("pending");
      expect(state.isPending).toBe(true);
    });

    it("initial state reflects success when cache has success entry", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("cached-data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.status).toBe("success");
      expect(state.isSuccess).toBe(true);
      expect(state.data).toBe("cached-data");
    });

    it("fetchStatus is fetching when enabled (default)", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams);
      const state = observer.getState();
      expect(state.fetchStatus).toBe("fetching");
      expect(state.isFetching).toBe(true);
    });
  });

  // ===========================================================================
  // 2. State derivation -- all derived booleans
  // ===========================================================================

  describe("state derivation -- derived booleans", () => {
    it("isPending is true when status is pending", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isPending).toBe(true);
      expect(observer.getState().isSuccess).toBe(false);
      expect(observer.getState().isError).toBe(false);
    });

    it("isSuccess is true when status is success", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("hello"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isSuccess).toBe(true);
      expect(observer.getState().isPending).toBe(false);
      expect(observer.getState().isError).toBe(false);
    });

    it("isError is true when status is error", () => {
      const { client } = createMockClient({
        entry: createErrorCacheEntry(new Error("boom")),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isError).toBe(true);
      expect(observer.getState().isPending).toBe(false);
      expect(observer.getState().isSuccess).toBe(false);
    });

    it("isFetching is true when fetchStatus is fetching", () => {
      const { client } = createMockClient();
      // enabled=true triggers isFetching
      const observer = createQueryObserver(client, TestPort, defaultParams);
      expect(observer.getState().isFetching).toBe(true);
    });

    it("isRefetching is true when success + fetching", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      // enabled=true triggers fetching, entry has success status
      const observer = createQueryObserver(client, TestPort, defaultParams);
      const state = observer.getState();
      expect(state.isRefetching).toBe(true);
      expect(state.isSuccess).toBe(true);
      expect(state.isFetching).toBe(true);
    });

    it("isLoading is true when pending + fetching", () => {
      const { client } = createMockClient();
      // no entry => pending, enabled=true => fetching
      const observer = createQueryObserver(client, TestPort, defaultParams);
      const state = observer.getState();
      expect(state.isLoading).toBe(true);
      expect(state.isPending).toBe(true);
      expect(state.isFetching).toBe(true);
    });

    it("isStale is true when entry.isInvalidated is true", () => {
      const entry: CacheEntry<unknown, unknown> = {
        ...createSuccessCacheEntry("data"),
        isInvalidated: true,
      };
      const { client } = createMockClient({ entry });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isStale).toBe(true);
    });

    it("isStale is true when no entry exists", () => {
      const { client } = createMockClient();
      // cache.get returns undefined (default)
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isStale).toBe(true);
    });

    it("isPlaceholderData is always false", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.getState().isPlaceholderData).toBe(false);
    });

    it("data and error pass through from entry", () => {
      const errorObj = new Error("test-error");
      const { client } = createMockClient({
        entry: createErrorCacheEntry(errorObj),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.error).toBe(errorObj);
      expect(state.data).toBeUndefined();

      // Now test with success entry
      const { client: client2 } = createMockClient({
        entry: createSuccessCacheEntry("the-data"),
      });
      const observer2 = createQueryObserver(client2, TestPort, defaultParams, { enabled: false });
      const state2 = observer2.getState();
      expect(state2.data).toBe("the-data");
      expect(state2.error).toBeNull();
    });

    it("refetch in state is callable", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(typeof state.refetch).toBe("function");
    });

    it("fetchStatus is exactly 'idle' when enabled=false", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      // Specifically asserts string is "idle" not ""
      expect(state.fetchStatus).toBe("idle");
      expect(state.fetchStatus).not.toBe("");
    });

    it("isRefetching is false when status is pending + fetching", () => {
      // pending + fetching = isLoading=true, isRefetching should be false
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams);
      const state = observer.getState();
      expect(state.isPending).toBe(true);
      expect(state.isFetching).toBe(true);
      expect(state.isRefetching).toBe(false);
    });

    it("isRefetching is false when success + idle", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.isSuccess).toBe(true);
      expect(state.fetchStatus).toBe("idle");
      expect(state.isRefetching).toBe(false);
    });

    it("isLoading is false when success + fetching", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams);
      const state = observer.getState();
      expect(state.isSuccess).toBe(true);
      expect(state.isFetching).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("isLoading is false when pending + idle", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.isPending).toBe(true);
      expect(state.fetchStatus).toBe("idle");
      expect(state.isLoading).toBe(false);
    });

    it("state.result is defined when entry has a result", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.result).toBeDefined();
      expect(state.result?.isOk()).toBe(true);
    });
  });

  // ===========================================================================
  // 3. Subscription lifecycle
  // ===========================================================================

  describe("subscription lifecycle", () => {
    it("subscribe fires listener when cache entry changes", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      observer.subscribe(listener);

      // Change state from pending to success
      setEntry(createSuccessCacheEntry("data"));
      emitCacheEvent();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
    });

    it("skips notification when state has not changed", () => {
      const { client, emitCacheEvent } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      observer.subscribe(listener);

      // Emit without changing the entry — observer detects no state change
      emitCacheEvent();

      expect(listener).not.toHaveBeenCalled();
    });

    it("unsubscribe removes listener", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      const unsub = observer.subscribe(listener);

      setEntry(createSuccessCacheEntry("data"));
      emitCacheEvent();
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      setEntry(createSuccessCacheEntry("data2"));
      emitCacheEvent();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("multiple subscribers are independent", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      observer.subscribe(listener1);
      observer.subscribe(listener2);

      setEntry(createSuccessCacheEntry("data"));
      emitCacheEvent();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe one does not affect others", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsub1 = observer.subscribe(listener1);
      observer.subscribe(listener2);

      unsub1();
      setEntry(createSuccessCacheEntry("data"));
      emitCacheEvent();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("cache subscription triggers notify to all listeners", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      observer.subscribe(listener);

      setEntry(createSuccessCacheEntry("value"));
      emitCacheEvent();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: "value",
        })
      );
    });
  });

  // ===========================================================================
  // 4. Initial fetch
  // ===========================================================================

  describe("initial fetch", () => {
    it("enabled:true calls fetchQuery", () => {
      const { client } = createMockClient();
      createQueryObserver(client, TestPort, defaultParams, { enabled: true });
      expect(client.fetchQuery).toHaveBeenCalledWith(TestPort, defaultParams);
    });

    it("enabled:false skips fetchQuery", () => {
      const { client } = createMockClient();
      createQueryObserver(client, TestPort, defaultParams, { enabled: false });
      expect(client.fetchQuery).not.toHaveBeenCalled();
    });

    it("success transitions isFetching to false", async () => {
      const { client, setEntry } = createMockClient({
        fetchResult: ResultAsync.ok("fetched"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams);

      // Initially fetching
      expect(observer.getState().isFetching).toBe(true);

      // Allow the ResultAsync chain to resolve
      await vi.waitFor(() => {
        expect(observer.getState().isFetching).toBe(false);
      });
    });

    it("failure transitions isFetching to false", async () => {
      const { client } = createMockClient({
        fetchResult: ResultAsync.err(new Error("network")),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams);

      expect(observer.getState().isFetching).toBe(true);

      await vi.waitFor(() => {
        expect(observer.getState().isFetching).toBe(false);
      });
    });
  });

  // ===========================================================================
  // 5. Refetch
  // ===========================================================================

  describe("refetch", () => {
    it("sets isFetching true and notifies listeners", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });

      expect(observer.getState().isFetching).toBe(false);

      const listener = vi.fn();
      observer.subscribe(listener);
      observer.refetch();

      expect(observer.getState().isFetching).toBe(true);
      // listener notified with fetching=true
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isFetching: true }));
    });

    it("returns a ResultAsync", () => {
      const { client } = createMockClient({
        fetchResult: ResultAsync.ok("refetched"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const result = observer.refetch();
      // ResultAsync is a PromiseLike
      expect(typeof result.then).toBe("function");
    });

    it("success transitions isFetching to false after resolve", async () => {
      const { client } = createMockClient({
        fetchResult: ResultAsync.ok("refetched"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });

      observer.refetch();
      expect(observer.getState().isFetching).toBe(true);

      await vi.waitFor(() => {
        expect(observer.getState().isFetching).toBe(false);
      });
    });

    it("error transitions isFetching to false after resolve", async () => {
      const { client } = createMockClient({
        fetchResult: ResultAsync.err(new Error("fail")),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });

      observer.refetch();
      expect(observer.getState().isFetching).toBe(true);

      await vi.waitFor(() => {
        expect(observer.getState().isFetching).toBe(false);
      });
    });

    it("state.refetch() calls observer.refetch and returns a ResultAsync", async () => {
      const { client } = createMockClient({
        fetchResult: ResultAsync.ok("via-state-refetch"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      // Call refetch via the state object
      const result = state.refetch();
      expect(typeof result.then).toBe("function");
      // It should actually trigger fetchQuery
      expect(client.fetchQuery).toHaveBeenCalled();
      // Await it to resolve
      const resolved = await result;
      // The result should be Ok or Err
      expect(resolved.isOk() || resolved.isErr()).toBe(true);
    });
  });

  // ===========================================================================
  // 6. Destroy lifecycle
  // ===========================================================================

  describe("destroy lifecycle", () => {
    it("sets isDestroyed to true", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.isDestroyed).toBe(false);
      observer.destroy();
      expect(observer.isDestroyed).toBe(true);
    });

    it("calls unsubscribeCache", () => {
      const { client, unsubscribeCache } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      observer.destroy();
      expect(unsubscribeCache).toHaveBeenCalledTimes(1);
    });

    it("calls decrementObservers", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      observer.destroy();
      expect(client.cache.decrementObservers).toHaveBeenCalledWith(TestPort, defaultParams);
    });

    it("clears listeners -- no more notifications after destroy", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      observer.subscribe(listener);

      // Trigger actual state change so notification fires
      setEntry(createSuccessCacheEntry("data"));
      emitCacheEvent();
      expect(listener).toHaveBeenCalledTimes(1);

      observer.destroy();

      // After destroy, even a state change should not notify
      setEntry(createSuccessCacheEntry("new-data"));
      emitCacheEvent();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 7. Destroyed guard
  // ===========================================================================

  describe("destroyed guard", () => {
    it("notify is no-op after destroy", () => {
      const { client, emitCacheEvent } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const listener = vi.fn();
      observer.subscribe(listener);

      observer.destroy();

      // Even though cache emits, notify should be a no-op
      emitCacheEvent();
      expect(listener).not.toHaveBeenCalled();
    });

    it("isDestroyed getter returns correct value before and after destroy", () => {
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      expect(observer.isDestroyed).toBe(false);
      observer.destroy();
      expect(observer.isDestroyed).toBe(true);
    });

    it("subscribing AFTER destroy does not fire on cache events", () => {
      const { client, emitCacheEvent } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      observer.destroy();

      const listener = vi.fn();
      observer.subscribe(listener);

      emitCacheEvent();
      // Listener should not be called because notify returns early when destroyed
      expect(listener).not.toHaveBeenCalled();
    });

    it("double-destroy is a no-op (decrementObservers called only once)", () => {
      const { client, unsubscribeCache } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      observer.destroy();
      expect(client.cache.decrementObservers).toHaveBeenCalledTimes(1);
      expect(unsubscribeCache).toHaveBeenCalledTimes(1);

      // Second destroy should be a no-op
      observer.destroy();
      expect(client.cache.decrementObservers).toHaveBeenCalledTimes(1);
      expect(unsubscribeCache).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 8. select
  // ===========================================================================

  describe("select", () => {
    it("transforms data in getState()", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("hello-world"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        select: (data: string) => data.toUpperCase(),
      });
      const state = observer.getState();
      expect(state.data).toBe("HELLO-WORLD");
    });

    it("passes data through unchanged without select", () => {
      const { client } = createMockClient({
        entry: createSuccessCacheEntry("hello-world"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });
      const state = observer.getState();
      expect(state.data).toBe("hello-world");
    });

    it("does not apply select when data is undefined", () => {
      const selectFn = vi.fn();
      const { client } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        select: selectFn,
      });
      observer.getState();
      expect(selectFn).not.toHaveBeenCalled();
    });

    it("applies select transform in notifications", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        select: (data: string) => data.length,
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Change the entry so the state differs from the initialized snapshot
      setEntry(createSuccessCacheEntry("longer-data"));
      emitCacheEvent();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: 11 }));
    });
  });

  // ===========================================================================
  // 9. notifyOnChangeProps
  // ===========================================================================

  describe("notifyOnChangeProps", () => {
    it("skips notification when only untracked properties change", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient({
        entry: createSuccessCacheEntry("initial"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        notifyOnChangeProps: ["data"],
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Seed previousState by calling getState
      observer.getState();

      // Emit cache event but data hasn't changed (same entry)
      // Only isFetching would differ, but we're tracking "data" only
      emitCacheEvent();

      // Data is the same, so listener should NOT be called
      expect(listener).not.toHaveBeenCalled();
    });

    it("fires notification when tracked property changes", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient({
        entry: createSuccessCacheEntry("initial"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        notifyOnChangeProps: ["data"],
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Seed previousState
      observer.getState();

      // Change the data
      setEntry(createSuccessCacheEntry("updated"));
      emitCacheEvent();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: "updated" }));
    });

    it("without notifyOnChangeProps, listener is called on every state change", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient();
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Each event changes the entry, so each triggers a notification
      setEntry(createSuccessCacheEntry("data-1"));
      emitCacheEvent();
      setEntry(createSuccessCacheEntry("data-2"));
      emitCacheEvent();
      setEntry(createSuccessCacheEntry("data-3"));
      emitCacheEvent();

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("skips notification when cache event fires but state has not changed", () => {
      const { client, emitCacheEvent } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Same entry, no state change — notification should be skipped
      emitCacheEvent();
      emitCacheEvent();
      emitCacheEvent();

      expect(listener).toHaveBeenCalledTimes(0);
    });

    it("notification fires when tracked property changes from initial state", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient({
        entry: createSuccessCacheEntry("data"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        notifyOnChangeProps: ["data"],
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Change data so tracked property differs from initial state
      setEntry(createSuccessCacheEntry("updated-data"));
      emitCacheEvent();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("tracks multiple properties", () => {
      const { client, emitCacheEvent, setEntry } = createMockClient({
        entry: createSuccessCacheEntry("initial"),
      });
      const observer = createQueryObserver(client, TestPort, defaultParams, {
        enabled: false,
        notifyOnChangeProps: ["data", "error"],
      });

      const listener = vi.fn();
      observer.subscribe(listener);

      // Seed previousState
      observer.getState();

      // Change error (transition from success to error)
      setEntry(createErrorCacheEntry(new Error("boom")));
      emitCacheEvent();

      // error changed, so listener should fire
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
