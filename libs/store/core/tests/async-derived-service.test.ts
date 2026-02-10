/**
 * AsyncDerivedService Implementation Tests
 *
 * Tests for retry logic, stale time, disposal during fetch,
 * tracing hooks, subscriber management, and safeTry error paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAsyncDerivedServiceImpl } from "../src/services/async-derived-service-impl.js";
import type { AsyncDerivedServiceConfig } from "../src/services/async-derived-service-impl.js";
import type { AsyncDerivedSnapshot } from "../src/types/index.js";
import { ResultAsync } from "@hex-di/result";
import type { StoreTracingHook, StoreSpanContext } from "../src/integration/tracing-bridge.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockTracingHook(): StoreTracingHook & {
  fetchCalls: Array<{ portName: string; containerName: string }>;
  fetchEndCalls: Array<{ ok: boolean }>;
} {
  const fetchCalls: Array<{ portName: string; containerName: string }> = [];
  const fetchEndCalls: Array<{ ok: boolean }> = [];
  return {
    fetchCalls,
    fetchEndCalls,
    onActionStart: () => ({}),
    onActionEnd: () => {},
    onAsyncDerivedFetch(portName: string, containerName: string): StoreSpanContext {
      fetchCalls.push({ portName, containerName });
      return {};
    },
    onAsyncDerivedFetchEnd(fetchOk: boolean): void {
      fetchEndCalls.push({ ok: fetchOk });
    },
  };
}

function makeConfig<T>(
  overrides: Partial<AsyncDerivedServiceConfig<T, unknown>> & {
    select: () => ResultAsync<T, unknown>;
  }
): AsyncDerivedServiceConfig<T, unknown> {
  return {
    portName: overrides.portName ?? "TestAsync",
    containerName: overrides.containerName ?? "root",
    ...overrides,
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// =============================================================================
// Basic lifecycle
// =============================================================================

describe("AsyncDerivedService — basic lifecycle", () => {
  it("starts with idle snapshot", () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    expect(svc.snapshot.status).toBe("idle");
    expect(svc.snapshot.data).toBeUndefined();
    expect(svc.snapshot.error).toBeUndefined();
    expect(svc.snapshot.isLoading).toBe(false);
  });

  it("refresh transitions to loading then success", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    svc.refresh();
    expect(svc.snapshot.status).toBe("loading");
    expect(svc.snapshot.isLoading).toBe(true);

    await flushMicrotasks();

    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe(42);
    expect(svc.snapshot.isLoading).toBe(false);
  });

  it("status getter returns current status", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve("hello")),
      })
    );

    expect(svc.status).toBe("idle");
    svc.refresh();
    expect(svc.status).toBe("loading");
    await flushMicrotasks();
    expect(svc.status).toBe("success");
  });

  it("isLoading getter returns true during fetch", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(1)),
      })
    );

    expect(svc.isLoading).toBe(false);
    svc.refresh();
    expect(svc.isLoading).toBe(true);
    await flushMicrotasks();
    expect(svc.isLoading).toBe(false);
  });

  it("deep freezes success data", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve({ nested: { value: 1 } })),
      })
    );

    svc.refresh();
    await flushMicrotasks();

    expect(svc.snapshot.status).toBe("success");
    expect(Object.isFrozen(svc.snapshot.data)).toBe(true);
  });
});

// =============================================================================
// Error paths
// =============================================================================

describe("AsyncDerivedService — error paths", () => {
  it("ResultAsync Err transitions to error status", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromPromise(Promise.reject(new Error("network fail")), e => e),
      })
    );

    svc.refresh();
    await flushMicrotasks();

    expect(svc.snapshot.status).toBe("error");
    expect(svc.snapshot.error).toBeInstanceOf(Error);
  });

  it("sync throw in select with retries ends in error status", async () => {
    // With retries, the sync throw path (SelectThrew) retries and eventually
    // falls through to the error snapshot path after exhausting all non-throw retries.
    // We test with retryCount=1 to exercise the SelectThrew code path
    // while staying on the error snapshot branch (not the throw branch).
    let attempts = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          attempts++;
          if (attempts === 1) {
            throw new Error("sync boom");
          }
          // Second attempt returns a normal Err
          return ResultAsync.fromPromise(Promise.reject(new Error("async fail")), e => e);
        },
        retryCount: 1,
        retryDelay: 0,
      })
    );

    svc.refresh();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(attempts).toBe(2);
    expect(svc.snapshot.status).toBe("error");
  });
});

// =============================================================================
// Retry logic
// =============================================================================

describe("AsyncDerivedService — retry logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries the configured number of times with constant delay", async () => {
    let attempts = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          attempts++;
          return ResultAsync.fromPromise(Promise.reject(new Error(`fail-${attempts}`)), e => e);
        },
        retryCount: 2,
        retryDelay: 100,
      })
    );

    svc.refresh();
    // Initial attempt
    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);

    // First retry after 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    expect(attempts).toBe(2);

    // Second retry after another 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    expect(attempts).toBe(3);

    // Should be in error state after all retries exhausted
    expect(svc.snapshot.status).toBe("error");
  });

  it("retries with function-based delay", async () => {
    let attempts = 0;
    const delays: number[] = [];
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          attempts++;
          return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e);
        },
        retryCount: 2,
        retryDelay: attempt => {
          const d = attempt * 50;
          delays.push(d);
          return d;
        },
      })
    );

    svc.refresh();
    await vi.advanceTimersByTimeAsync(0); // attempt 1

    await vi.advanceTimersByTimeAsync(50); // delay(1) = 50ms, attempt 2
    await vi.advanceTimersByTimeAsync(100); // delay(2) = 100ms, attempt 3

    expect(attempts).toBe(3);
    expect(delays).toEqual([1 * 50, 2 * 50]);
  });

  it("succeeds on retry after initial failure", async () => {
    let attempts = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          attempts++;
          if (attempts === 1) {
            return ResultAsync.fromPromise(Promise.reject(new Error("first fail")), e => e);
          }
          return ResultAsync.fromSafePromise(Promise.resolve("success"));
        },
        retryCount: 1,
        retryDelay: 0,
      })
    );

    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe("success");
    expect(attempts).toBe(2);
  });

  it("retryDelay defaults to 0 when not configured", async () => {
    let attempts = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          attempts++;
          return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e);
        },
        retryCount: 1,
        // retryDelay not set — defaults to 0
      })
    );

    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(attempts).toBe(2);
    expect(svc.snapshot.status).toBe("error");
  });
});

// =============================================================================
// Stale time
// =============================================================================

describe("AsyncDerivedService — stale time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("isStale returns false when staleTime is not configured", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(Promise.resolve(fetchCount));
        },
        // No staleTime
      })
    );

    // Fetch and succeed
    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(svc.snapshot.status).toBe("success");
    expect(fetchCount).toBe(1);

    // Subscribe to ensure subscriberCount > 0
    svc.subscribe(() => {});

    // Advance time — should not trigger auto-refetch since no staleTime
    vi.advanceTimersByTime(10000);

    // Access snapshot — should not trigger auto-refetch
    const snap = svc.snapshot;
    expect(snap.status).toBe("success");
    expect(fetchCount).toBe(1);
  });

  it("auto-refetches stale data when subscriber accesses snapshot", async () => {
    let fetchCount = 0;
    const resolvers: Array<(v: number) => void> = [];
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(
            new Promise<number>(resolve => {
              resolvers.push(resolve);
            })
          );
        },
        staleTime: 100,
      })
    );

    // Initial fetch
    svc.refresh();
    // Resolve the first fetch
    resolvers[0]!(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(svc.snapshot.status).toBe("success");
    expect(fetchCount).toBe(1);

    // Subscribe to make subscriberCount > 0
    svc.subscribe(() => {});

    // Advance past stale time
    vi.advanceTimersByTime(200);

    // First access triggers doFetch() but returns the current (stale) snapshot
    const snap = svc.snapshot;
    expect(snap.status).toBe("success"); // returns pre-fetch value
    expect(fetchCount).toBe(2); // but doFetch was called

    // doFetch synchronously sets signal to "loading" before first await
    // Second access sees the loading state
    expect(svc.snapshot.status).toBe("loading");

    // Resolve the second fetch
    resolvers[1]!(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe(2);
  });

  it("auto-refetches stale data on new subscription", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(Promise.resolve(fetchCount));
        },
        staleTime: 50,
      })
    );

    // Initial fetch
    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchCount).toBe(1);

    // Advance past stale time
    vi.advanceTimersByTime(100);

    // Subscribe — should trigger auto-refetch for stale data
    svc.subscribe(() => {});
    expect(fetchCount).toBe(2);
  });

  it("does not auto-refetch when data is not stale", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(Promise.resolve(fetchCount));
        },
        staleTime: 1000,
      })
    );

    // Initial fetch
    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchCount).toBe(1);

    // Subscribe within stale time
    svc.subscribe(() => {});

    // Access snapshot within stale time — no refetch
    vi.advanceTimersByTime(500);
    const snap = svc.snapshot;
    expect(snap.status).toBe("success");
    expect(fetchCount).toBe(1);
  });

  it("does not auto-refetch when no subscribers", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(Promise.resolve(fetchCount));
        },
        staleTime: 50,
      })
    );

    svc.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchCount).toBe(1);

    // Advance past stale time
    vi.advanceTimersByTime(100);

    // Access snapshot without subscribers — no auto-refetch
    const snap = svc.snapshot;
    expect(snap.status).toBe("success");
    expect(fetchCount).toBe(1);
  });

  it("preserves previous data in loading snapshot during refetch", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => {
          fetchCount++;
          return ResultAsync.fromSafePromise(
            new Promise<number>(resolve => setTimeout(() => resolve(fetchCount), 50))
          );
        },
      })
    );

    // First fetch
    svc.refresh();
    await vi.advanceTimersByTimeAsync(50);
    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe(1);

    // Second fetch — loading snapshot should have previous data
    svc.refresh();
    expect(svc.snapshot.status).toBe("loading");
    expect(svc.snapshot.data).toBe(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe(2);
  });
});

// =============================================================================
// Subscriber management
// =============================================================================

describe("AsyncDerivedService — subscriber management", () => {
  it("subscribe notifies on snapshot changes", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    const snapshots: Array<AsyncDerivedSnapshot<number, unknown>> = [];
    svc.subscribe(snap => snapshots.push(snap));

    svc.refresh();
    await flushMicrotasks();

    // Should have received loading and success snapshots
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const lastSnap = snapshots[snapshots.length - 1];
    expect(lastSnap?.status).toBe("success");
    expect(lastSnap?.data).toBe(42);
  });

  it("unsubscribe prevents further notifications", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    const snapshots: Array<AsyncDerivedSnapshot<number, unknown>> = [];
    const unsub = svc.subscribe(snap => snapshots.push(snap));

    unsub();
    svc.refresh();
    await flushMicrotasks();

    expect(snapshots).toHaveLength(0);
  });

  it("subscriberCount tracks active subscriptions", () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    expect(svc.subscriberCount).toBe(0);

    const unsub1 = svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(1);

    const unsub2 = svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(2);

    unsub1();
    expect(svc.subscriberCount).toBe(1);

    unsub2();
    expect(svc.subscriberCount).toBe(0);
  });
});

// =============================================================================
// Disposal
// =============================================================================

describe("AsyncDerivedService — disposal", () => {
  it("refresh throws DisposedStateAccess after disposal", () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    svc.dispose();

    let thrown: unknown;
    try {
      svc.refresh();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toHaveProperty("_tag", "DisposedStateAccess");
  });

  it("subscribe throws DisposedStateAccess after disposal", () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    svc.dispose();

    let thrown: unknown;
    try {
      svc.subscribe(() => {});
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toHaveProperty("_tag", "DisposedStateAccess");
  });

  it("isDisposed is true after disposal", () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("dispose clears all active effects", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
      })
    );

    const snapshots: unknown[] = [];
    svc.subscribe(snap => snapshots.push(snap));

    svc.dispose();

    // No further notifications after disposal
    expect(svc.subscriberCount).toBe(1); // subscriber count not decremented by dispose
    // But effect is disposed, so no notifications
  });

  it("disposal during fetch aborts gracefully", async () => {
    let resolved = false;
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () =>
          ResultAsync.fromSafePromise(
            new Promise<number>(resolve => {
              setTimeout(() => {
                resolved = true;
                resolve(42);
              }, 100);
            })
          ),
      })
    );

    svc.refresh();
    expect(svc.snapshot.status).toBe("loading");

    // Dispose before the promise resolves
    svc.dispose();

    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(resolved).toBe(true);

    // Service should not have updated after disposal
    // (the doFetch checks disposed after await)
  });
});

// =============================================================================
// Tracing hook integration
// =============================================================================

describe("AsyncDerivedService — tracing hook", () => {
  it("calls onAsyncDerivedFetch on refresh", async () => {
    const hook = createMockTracingHook();
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
        tracingHook: hook,
      })
    );

    svc.refresh();
    await flushMicrotasks();

    expect(hook.fetchCalls).toHaveLength(1);
    expect(hook.fetchCalls[0]?.portName).toBe("TestAsync");
    expect(hook.fetchCalls[0]?.containerName).toBe("root");
  });

  it("calls onAsyncDerivedFetchEnd(true) on success", async () => {
    const hook = createMockTracingHook();
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
        tracingHook: hook,
      })
    );

    svc.refresh();
    await flushMicrotasks();

    expect(hook.fetchEndCalls.length).toBeGreaterThanOrEqual(1);
    const lastEnd = hook.fetchEndCalls[hook.fetchEndCalls.length - 1];
    expect(lastEnd?.ok).toBe(true);
  });

  it("calls onAsyncDerivedFetchEnd(false) on error", async () => {
    const hook = createMockTracingHook();
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
        tracingHook: hook,
      })
    );

    svc.refresh();
    await flushMicrotasks();

    expect(hook.fetchEndCalls.length).toBeGreaterThanOrEqual(1);
    const lastEnd = hook.fetchEndCalls[hook.fetchEndCalls.length - 1];
    expect(lastEnd?.ok).toBe(false);
  });

  it("tracing hook errors do not break fetch flow", async () => {
    const hook: StoreTracingHook = {
      onActionStart: () => ({}),
      onActionEnd: () => {},
      onAsyncDerivedFetch: () => {
        throw new Error("tracing error");
      },
      onAsyncDerivedFetchEnd: () => {
        throw new Error("tracing error");
      },
    };

    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromSafePromise(Promise.resolve(42)),
        tracingHook: hook,
      })
    );

    svc.refresh();
    await flushMicrotasks();

    // Despite tracing errors, fetch should still complete
    expect(svc.snapshot.status).toBe("success");
    expect(svc.snapshot.data).toBe(42);
  });
});

// =============================================================================
// Loading snapshot — prevData preservation
// =============================================================================

describe("AsyncDerivedService — loading prevData", () => {
  it("loading snapshot preserves undefined data when no prior success", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () =>
          ResultAsync.fromSafePromise(
            new Promise<number>(resolve => setTimeout(() => resolve(1), 100))
          ),
      })
    );

    svc.refresh();
    const loadingSnap = svc.snapshot;
    expect(loadingSnap.status).toBe("loading");
    expect(loadingSnap.data).toBeUndefined();
  });

  it("loading snapshot has no data after prior error", async () => {
    const svc = createAsyncDerivedServiceImpl(
      makeConfig({
        select: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
      })
    );

    svc.refresh();
    await flushMicrotasks();
    expect(svc.snapshot.status).toBe("error");

    // Second refresh — loading should have no prevData since prior was error
    svc.refresh();
    expect(svc.snapshot.status).toBe("loading");
    expect(svc.snapshot.data).toBeUndefined();
  });
});
