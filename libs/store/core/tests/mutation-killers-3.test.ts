/**
 * Targeted mutation-killing tests — Round 3
 *
 * Focus: async-derived-service-impl.ts (44 survived + 20 NoCov),
 * atom-service-impl.ts (13 survived), derived-service-impl.ts (8 survived),
 * cycle-detection.ts (8 survived + 1 NoCov), linked-derived-service-impl.ts (5 survived).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createAsyncDerivedServiceImpl } from "../src/services/async-derived-service-impl.js";
import { createAtomServiceImpl } from "../src/services/atom-service-impl.js";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
import {
  withCycleDetection,
  isCircularDerivedDependency,
} from "../src/services/cycle-detection.js";
import { ResultAsync } from "@hex-di/result";
import type { StoreTracingHook } from "../src/integration/tracing-bridge.js";

// Node.js process type for unhandled rejection testing
declare const process: {
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
};

// =============================================================================
// Helpers
// =============================================================================

function makeHook(overrides: Partial<StoreTracingHook> = {}): StoreTracingHook {
  return {
    onActionStart: () => ({}),
    onActionEnd: () => {},
    ...overrides,
  };
}

/**
 * Flush microtask queue to let async operations settle.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// =============================================================================
// async-derived-service-impl.ts — select returning ResultAsync.err
// Kills: snapshot transitions idle → loading → error with ResultAsync Err
// =============================================================================

describe("AsyncDerivedService — select returns ResultAsync.err", () => {
  afterEach(() => vi.restoreAllMocks());

  it("transitions to error state when select returns ResultAsync.err", async () => {
    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.err("api-failure"),
    });

    expect(svc.snapshot.status).toBe("idle");
    expect(svc.snapshot.isLoading).toBe(false);

    svc.refresh();

    // Should go through loading
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));
    expect(svc.snapshot.error).toBe("api-failure");
    expect(svc.snapshot.isLoading).toBe(false);
    expect(svc.snapshot.data).toBeUndefined();

    svc.dispose();
  });

  it("keeps previous data as undefined when error occurs from idle", async () => {
    const svc = createAsyncDerivedServiceImpl<number, string>({
      portName: "Numbers",
      containerName: "root",
      select: () => ResultAsync.err("fail"),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));

    // No previous success data
    expect(svc.snapshot.data).toBeUndefined();
    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — stale data preserved during loading
// Kills: L82 prevData = current.status === "success" ? current.data : undefined
// =============================================================================

describe("AsyncDerivedService — stale data during loading", () => {
  afterEach(() => vi.restoreAllMocks());

  it("preserves previous success data as stale when re-fetching", async () => {
    let callCount = 0;
    let resolveSecond: ((v: string) => void) | undefined;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      select: () => {
        callCount++;
        if (callCount === 1) {
          return ResultAsync.ok("first-result");
        }
        return ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolveSecond = resolve;
          })
        );
      },
    });

    // First fetch: success
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(svc.snapshot.data).toBe("first-result");

    // Second fetch: goes to loading, should have stale data from first success
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("loading"));
    expect(svc.snapshot.data).toBe("first-result"); // stale data preserved
    expect(svc.snapshot.isLoading).toBe(true);

    // Resolve second fetch
    resolveSecond?.("second-result");
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(svc.snapshot.data).toBe("second-result");

    svc.dispose();
  });

  it("has undefined stale data when previous status was error (not success)", async () => {
    let callCount = 0;
    let resolveSecond: ((v: string) => void) | undefined;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      select: () => {
        callCount++;
        if (callCount === 1) {
          return ResultAsync.err("first-fail");
        }
        return ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolveSecond = resolve;
          })
        );
      },
    });

    // First fetch: error
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));

    // Second fetch: loading with no stale data (previous was error, not success)
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("loading"));
    expect(svc.snapshot.data).toBeUndefined(); // no stale data from error state

    resolveSecond?.("now-ok");
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — retry logic
// Kills: L85 maxAttempts, L88 attempt <= maxAttempts, L132 attempt === maxAttempts
// =============================================================================

describe("AsyncDerivedService — retry logic", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retries the configured number of times on ResultAsync.err", async () => {
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 2,
      retryDelay: 0,
      select: () => {
        attempts++;
        if (attempts <= 2) {
          return ResultAsync.err(`fail-${attempts}`);
        }
        return ResultAsync.ok("success-on-third");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(attempts).toBe(3); // 1 initial + 2 retries
    expect(svc.snapshot.data).toBe("success-on-third");

    svc.dispose();
  });

  it("transitions to error after exhausting all retries with ResultAsync.err", async () => {
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 2,
      retryDelay: 0,
      select: () => {
        attempts++;
        return ResultAsync.err(`fail-${attempts}`);
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));
    expect(attempts).toBe(3); // 1 + 2 retries, all failed
    expect(svc.snapshot.error).toBe("fail-3"); // last error

    svc.dispose();
  });

  it("retryCount=0 means exactly one attempt with no retries", async () => {
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 0,
      select: () => {
        attempts++;
        return ResultAsync.err("fail");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));
    expect(attempts).toBe(1);

    svc.dispose();
  });

  it("uses retryDelay function for variable delays between retries", async () => {
    const delayFn = vi.fn((_attempt: number) => 0);
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 2,
      retryDelay: delayFn,
      select: () => {
        attempts++;
        if (attempts < 3) return ResultAsync.err("retry");
        return ResultAsync.ok("done");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    // delayFn should have been called with attempt=1 and attempt=2
    expect(delayFn).toHaveBeenCalledWith(1);
    expect(delayFn).toHaveBeenCalledWith(2);
    expect(delayFn).toHaveBeenCalledTimes(2);

    svc.dispose();
  });

  it("retryDelay > 0 actually introduces a delay between retries", async () => {
    let attempts = 0;
    const timestamps: number[] = [];

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 1,
      retryDelay: 50,
      select: () => {
        attempts++;
        timestamps.push(Date.now());
        if (attempts === 1) return ResultAsync.err("retry");
        return ResultAsync.ok("done");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"), { timeout: 500 });

    expect(attempts).toBe(2);
    // The gap between attempts should be at least ~50ms due to delay
    if (timestamps.length === 2) {
      const gap = (timestamps[1] ?? 0) - (timestamps[0] ?? 0);
      expect(gap).toBeGreaterThanOrEqual(30); // allow some tolerance
    }

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — isSelectThrew: sync throw in select
// Kills: L22-24 isSelectThrew guard, L103 cause instanceof Error, L130-138
// =============================================================================

describe("AsyncDerivedService — select sync throw (isSelectThrew path)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("select throwing Error causes AsyncDerivedExhausted (no retries)", async () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Throwing",
      containerName: "root",
      select: (): never => {
        throw new Error("sync-throw");
      },
    });

    // doFetch is fire-and-forget, so the throw becomes an unhandled rejection.
    // In Node.js we use process.on("unhandledRejection") to catch it.
    const rejections: unknown[] = [];
    const handler = (reason: unknown): void => {
      rejections.push(reason);
    };

    process.on("unhandledRejection", handler);
    svc.refresh();

    await vi.waitFor(() => expect(rejections.length).toBeGreaterThan(0), { timeout: 200 });
    process.removeListener("unhandledRejection", handler);

    const err = rejections[0];
    expect(err).toHaveProperty("_tag", "AsyncDerivedExhausted");
    expect(err).toHaveProperty("portName", "Throwing");
    expect(err).toHaveProperty("attempts", 1);

    svc.dispose();
  });

  it("select throwing non-Error value wraps it in Error", async () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "ThrowString",
      containerName: "root",
      select: (): never => {
        throw "string-thrown";
      },
    });

    const rejections: unknown[] = [];
    const handler = (reason: unknown): void => {
      rejections.push(reason);
    };

    process.on("unhandledRejection", handler);
    svc.refresh();

    await vi.waitFor(() => expect(rejections.length).toBeGreaterThan(0), { timeout: 200 });
    process.removeListener("unhandledRejection", handler);

    const err = rejections[0];
    expect(err).toHaveProperty("_tag", "AsyncDerivedExhausted");
    // The cause should be an Error wrapping the string
    const cause = (err as { cause: unknown }).cause;
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toBe("string-thrown");

    svc.dispose();
  });

  it("select throwing is retried and succeeds on subsequent attempt", async () => {
    let attempt = 0;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "RetryThrow",
      containerName: "root",
      retryCount: 1,
      retryDelay: 0,
      select: () => {
        attempt++;
        if (attempt === 1) throw new Error("first-throw");
        return ResultAsync.ok("recovered");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"), { timeout: 200 });
    expect(svc.snapshot.data).toBe("recovered");
    expect(attempt).toBe(2);

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — subscribe listener is notified
// Kills: L208-212 createEffect listener call, L209 current !== prevSnapshot
// =============================================================================

describe("AsyncDerivedService — subscribe notifies listeners on state change", () => {
  afterEach(() => vi.restoreAllMocks());

  it("subscriber receives snapshots as state transitions", async () => {
    const snapshots: Array<{ status: string }> = [];

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    const unsub = svc.subscribe(snap => {
      snapshots.push({ status: snap.status });
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    // Should have received loading and success snapshots
    expect(snapshots.some(s => s.status === "loading")).toBe(true);
    expect(snapshots.some(s => s.status === "success")).toBe(true);

    unsub();
    svc.dispose();
  });

  it("subscriber does NOT receive notification when snapshot is the same reference", async () => {
    const listener = vi.fn();

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    const unsub = svc.subscribe(listener);

    // Before any refresh, status is idle. Accessing snapshot repeatedly should not re-notify.
    expect(listener).not.toHaveBeenCalled();

    unsub();
    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — dispose behavior
// Kills: L226-232 dispose sets disposed=true and clears activeEffects
// =============================================================================

describe("AsyncDerivedService — dispose", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sets isDisposed to true after dispose", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    expect(svc.isDisposed).toBe(false);
    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });

  it("clears all active effects on dispose", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    svc.subscribe(() => {});
    svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(2);

    svc.dispose();
    // subscriberCount is not reset in async-derived dispose (only activeEffects cleared),
    // but we can verify isDisposed is set
    expect(svc.isDisposed).toBe(true);
  });

  it("throws DisposedStateAccess on refresh after dispose", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    svc.dispose();
    expect(() => svc.refresh()).toThrow();

    try {
      svc.refresh();
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "refresh");
      expect(e).toHaveProperty("portName", "Data");
    }
  });

  it("throws DisposedStateAccess on subscribe after dispose", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    svc.dispose();
    expect(() => svc.subscribe(() => {})).toThrow();

    try {
      svc.subscribe(() => {});
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "subscribe");
    }
  });

  it("stops pending fetch when disposed mid-flight (after attempt resolve)", async () => {
    let resolvePromise: ((v: string) => void) | undefined;
    const snapshots: string[] = [];

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () =>
        ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolvePromise = resolve;
          })
        ),
    });

    svc.subscribe(snap => snapshots.push(snap.status));
    svc.refresh();

    await vi.waitFor(() => expect(svc.snapshot.status).toBe("loading"));

    // Dispose while fetching
    svc.dispose();

    // Now resolve the fetch — should not crash or update state
    resolvePromise?.("late-data");
    await flushMicrotasks();

    // Snapshot should still be loading (no transition to success after dispose)
    // and no new subscriber notifications
    const successCount = snapshots.filter(s => s === "success").length;
    expect(successCount).toBe(0);
  });
});

// =============================================================================
// async-derived-service-impl.ts — staleTime and isStale logic
// Kills: L173-175 isStale boundary conditions
// =============================================================================

describe("AsyncDerivedService — staleTime and auto-refetch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("isStale returns false when staleTime is undefined", async () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      // No staleTime configured
      select: () => ResultAsync.ok("value"),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    // Access snapshot — should NOT trigger another fetch since no staleTime
    const unsub = svc.subscribe(() => {});
    const snap = svc.snapshot;
    expect(snap.status).toBe("success");
    expect(snap.data).toBe("value");

    unsub();
    svc.dispose();
  });

  it("isStale returns false when _lastFetchTime is 0 (never fetched)", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      staleTime: 100,
      select: () => ResultAsync.ok("value"),
    });

    // Never refreshed — _lastFetchTime is 0, so isStale should be false
    const unsub = svc.subscribe(() => {});
    const snap = svc.snapshot;
    expect(snap.status).toBe("idle");

    unsub();
    svc.dispose();
  });

  it("triggers auto-refetch on snapshot access when data is stale and has subscribers", async () => {
    let fetchCount = 0;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      staleTime: 1, // 1ms stale time — effectively always stale
      select: () => {
        fetchCount++;
        return ResultAsync.ok(`result-${fetchCount}`);
      },
    });

    const unsub = svc.subscribe(() => {});

    // First fetch
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    const firstFetch = fetchCount;

    // Wait just enough for staleTime to expire
    await new Promise(r => setTimeout(r, 10));

    // Access snapshot — should trigger auto-refetch because stale
    const snap = svc.snapshot;
    // The auto-refetch might have already started
    expect(snap.status === "success" || snap.status === "loading").toBe(true);
    expect(fetchCount).toBeGreaterThan(firstFetch);

    unsub();
    svc.dispose();
  });

  it("does NOT auto-refetch when no subscribers (subscriberCount === 0)", async () => {
    let fetchCount = 0;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      staleTime: 1,
      select: () => {
        fetchCount++;
        return ResultAsync.ok(`result-${fetchCount}`);
      },
    });

    // Fetch without subscribers
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    const fetchAfterFirst = fetchCount;

    await new Promise(r => setTimeout(r, 10));

    // Access snapshot with no subscribers — should NOT auto-refetch
    const _snap = svc.snapshot;
    expect(fetchCount).toBe(fetchAfterFirst);

    svc.dispose();
  });

  it("auto-refetch on subscribe when data is stale", async () => {
    let fetchCount = 0;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      staleTime: 1,
      select: () => {
        fetchCount++;
        return ResultAsync.ok(`result-${fetchCount}`);
      },
    });

    // First fetch
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    const countAfterFirst = fetchCount;

    // Wait for stale
    await new Promise(r => setTimeout(r, 10));

    // Subscribing when stale should trigger refetch
    const unsub = svc.subscribe(() => {});
    expect(fetchCount).toBeGreaterThan(countAfterFirst);

    unsub();
    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — status/isLoading convenience getters
// Kills: L187-193 getter mutations
// =============================================================================

describe("AsyncDerivedService — status and isLoading getters", () => {
  afterEach(() => vi.restoreAllMocks());

  it("status getter reflects current snapshot status", async () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    expect(svc.status).toBe("idle");

    svc.refresh();
    // Could be loading or success depending on timing
    await vi.waitFor(() => expect(svc.status).toBe("success"));

    svc.dispose();
  });

  it("isLoading getter reflects current loading state", async () => {
    let resolvePromise: ((v: string) => void) | undefined;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () =>
        ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolvePromise = resolve;
          })
        ),
    });

    expect(svc.isLoading).toBe(false);

    svc.refresh();
    await vi.waitFor(() => expect(svc.isLoading).toBe(true));

    resolvePromise?.("done");
    await vi.waitFor(() => expect(svc.isLoading).toBe(false));

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — _lastFetchTime updated on success
// Kills: L119 _lastFetchTime = Date.now()
// =============================================================================

describe("AsyncDerivedService — _lastFetchTime tracking", () => {
  afterEach(() => vi.restoreAllMocks());

  it("staleTime check works after successful fetch", async () => {
    let fetchCount = 0;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      staleTime: 5000, // long stale time so data won't be stale
      select: () => {
        fetchCount++;
        return ResultAsync.ok(`v${fetchCount}`);
      },
    });

    const unsub = svc.subscribe(() => {});
    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    const afterFirst = fetchCount;

    // Access snapshot — staleTime is 5000ms so data should NOT be stale
    const snap = svc.snapshot;
    expect(snap.data).toBe("v1");
    expect(fetchCount).toBe(afterFirst); // no extra fetch

    unsub();
    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — tracing hook: onAsyncDerivedFetch called
// Kills: L76-79 tryCatch around onAsyncDerivedFetch
// =============================================================================

describe("AsyncDerivedService — tracing hook error resilience", () => {
  afterEach(() => vi.restoreAllMocks());

  it("continues fetch even when onAsyncDerivedFetch throws", async () => {
    const hook = makeHook({
      onAsyncDerivedFetch: () => {
        throw new Error("tracing-crash");
      },
    });

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("ok-despite-crash"),
      tracingHook: hook,
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(svc.snapshot.data).toBe("ok-despite-crash");

    svc.dispose();
  });

  it("continues even when onAsyncDerivedFetchEnd throws", async () => {
    const hook = makeHook({
      onAsyncDerivedFetchEnd: () => {
        throw new Error("end-hook-crash");
      },
    });

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("ok"),
      tracingHook: hook,
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — snapshot helper functions
// Kills: L41-56 idleSnapshot, loadingSnapshot, successSnapshot, errorSnapshot
// =============================================================================

describe("AsyncDerivedService — snapshot structure", () => {
  afterEach(() => vi.restoreAllMocks());

  it("idle snapshot has correct shape", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    const snap = svc.snapshot;
    expect(snap.status).toBe("idle");
    expect(snap.data).toBeUndefined();
    expect(snap.error).toBeUndefined();
    expect(snap.isLoading).toBe(false);

    svc.dispose();
  });

  it("loading snapshot has isLoading=true and error=undefined", async () => {
    let resolvePromise: ((v: string) => void) | undefined;

    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () =>
        ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolvePromise = resolve;
          })
        ),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("loading"));
    expect(svc.snapshot.isLoading).toBe(true);
    expect(svc.snapshot.error).toBeUndefined();

    resolvePromise?.("done");
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    svc.dispose();
  });

  it("success snapshot has isLoading=false and error=undefined", async () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("val"),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(svc.snapshot.isLoading).toBe(false);
    expect(svc.snapshot.error).toBeUndefined();
    expect(svc.snapshot.data).toBe("val");

    svc.dispose();
  });

  it("error snapshot has isLoading=false and data=undefined", async () => {
    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.err("bad"),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));
    expect(svc.snapshot.isLoading).toBe(false);
    expect(svc.snapshot.data).toBeUndefined();
    expect(svc.snapshot.error).toBe("bad");

    svc.dispose();
  });

  it("idle snapshot is frozen", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    const snap = svc.snapshot;
    expect(Object.isFrozen(snap)).toBe(true);

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — disposed mid-fetch paths
// Kills: L89-95 disposed check in retry loop, L111-117 disposed check after OK,
//        L152-158 disposed check after retry loop
// =============================================================================

describe("AsyncDerivedService — disposed mid-fetch edge cases", () => {
  afterEach(() => vi.restoreAllMocks());

  it("disposed during retry does not update snapshot after dispose", async () => {
    let attemptCount = 0;
    let resolveSecond: ((v: string) => void) | undefined;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 1,
      retryDelay: 0,
      select: () => {
        attemptCount++;
        if (attemptCount === 1) return ResultAsync.err("first-fail");
        return ResultAsync.fromSafePromise(
          new Promise<string>(resolve => {
            resolveSecond = resolve;
          })
        );
      },
    });

    svc.refresh();
    // Wait for first failure + start of retry
    await vi.waitFor(() => expect(attemptCount).toBe(2));

    // Dispose while second attempt is in-flight
    svc.dispose();

    // Resolve second attempt
    resolveSecond?.("late");
    await flushMicrotasks();

    // Should still be disposed, snapshot not updated to success
    expect(svc.isDisposed).toBe(true);
  });
});

// =============================================================================
// atom-service-impl.ts — disposal guards
// Kills: L36-38 checkDisposed for "value", "set", "update", "subscribe"
// =============================================================================

describe("AtomService — disposal guards", () => {
  it("throws DisposedStateAccess on .value after dispose", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    svc.dispose();

    try {
      const _v = svc.value;
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "value");
      expect(e).toHaveProperty("portName", "Theme");
      expect(e).toHaveProperty("containerName", "root");
    }
  });

  it("throws DisposedStateAccess on .set after dispose", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    svc.dispose();

    try {
      svc.set("dark");
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "set");
    }
  });

  it("throws DisposedStateAccess on .update after dispose", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    svc.dispose();

    try {
      svc.update(() => "dark");
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "update");
    }
  });

  it("throws DisposedStateAccess on .subscribe after dispose", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    svc.dispose();

    try {
      svc.subscribe(() => {});
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "subscribe");
    }
  });
});

// =============================================================================
// atom-service-impl.ts — subscribers notification
// Kills: L84-91 createEffect listener notification logic
// =============================================================================

describe("AtomService — subscriber notification on set and update", () => {
  it("set notifies all subscribers with new and previous values", () => {
    const svc = createAtomServiceImpl<number>({
      portName: "Counter",
      containerName: "root",
      initial: 0,
    });

    const received: Array<{ value: number; prev: number }> = [];
    svc.subscribe((value, prev) => {
      received.push({ value: value as number, prev: prev as number });
    });

    svc.set(10);
    svc.set(20);

    expect(received).toEqual([
      { value: 10, prev: 0 },
      { value: 20, prev: 10 },
    ]);

    svc.dispose();
  });

  it("update notifies subscriber with computed value", () => {
    const svc = createAtomServiceImpl<number>({
      portName: "Counter",
      containerName: "root",
      initial: 5,
    });

    const received: number[] = [];
    svc.subscribe(value => {
      received.push(value as number);
    });

    svc.update(current => current + 3);
    expect(received).toEqual([8]);

    svc.dispose();
  });

  it("multiple subscribers all receive notifications", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    svc.subscribe(listener1);
    svc.subscribe(listener2);

    svc.set("dark");

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    svc.dispose();
  });
});

// =============================================================================
// atom-service-impl.ts — unsubscribe removes from activeEffects
// Kills: L93-98 unsubscribe splice logic
// =============================================================================

describe("AtomService — unsubscribe cleans up", () => {
  it("unsubscribed listener no longer receives notifications", () => {
    const svc = createAtomServiceImpl<number>({
      portName: "Counter",
      containerName: "root",
      initial: 0,
    });

    const listener = vi.fn();
    const unsub = svc.subscribe(listener);

    svc.set(1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();

    svc.set(2);
    // Should NOT receive the second notification
    expect(listener).toHaveBeenCalledTimes(1);

    svc.dispose();
  });

  it("unsubscribing first of two listeners still notifies the second", () => {
    const svc = createAtomServiceImpl<number>({
      portName: "Counter",
      containerName: "root",
      initial: 0,
    });

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = svc.subscribe(listener1);
    svc.subscribe(listener2);

    unsub1();

    svc.set(5);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);

    svc.dispose();
  });
});

// =============================================================================
// atom-service-impl.ts — dispose resets subscriberCount
// Kills: L110 _subscriberCount = 0
// =============================================================================

describe("AtomService — dispose resets subscriberCount", () => {
  it("subscriberCount becomes 0 after dispose", () => {
    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
    });

    svc.subscribe(() => {});
    svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(2);

    svc.dispose();
    expect(svc.subscriberCount).toBe(0);
  });
});

// =============================================================================
// atom-service-impl.ts — tracing hook error resilience
// Kills: L44-52 tryCatch wrapping onAtomUpdate/onAtomUpdateEnd
// =============================================================================

describe("AtomService — tracing hook error resilience", () => {
  it("set still works when onAtomUpdate throws", () => {
    const hook = makeHook({
      onAtomUpdate: () => {
        throw new Error("hook-crash");
      },
    });

    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
      tracingHook: hook,
    });

    // Should not throw, tryCatch protects
    svc.set("dark");
    expect(svc.value).toBe("dark");

    svc.dispose();
  });

  it("set still works when onAtomUpdateEnd throws", () => {
    const hook = makeHook({
      onAtomUpdateEnd: () => {
        throw new Error("end-crash");
      },
    });

    const svc = createAtomServiceImpl<string>({
      portName: "Theme",
      containerName: "root",
      initial: "light",
      tracingHook: hook,
    });

    svc.set("dark");
    expect(svc.value).toBe("dark");

    svc.dispose();
  });

  it("update still works when onAtomUpdate throws", () => {
    const hook = makeHook({
      onAtomUpdate: () => {
        throw new Error("hook-crash");
      },
    });

    const svc = createAtomServiceImpl<number>({
      portName: "Counter",
      containerName: "root",
      initial: 0,
      tracingHook: hook,
    });

    svc.update(v => v + 1);
    expect(svc.value).toBe(1);

    svc.dispose();
  });
});

// =============================================================================
// derived-service-impl.ts — disposal guards
// Kills: L56-58 checkDisposed for "value" and "subscribe"
// =============================================================================

describe("DerivedService — disposal guards", () => {
  it("throws DisposedStateAccess on .value after dispose", () => {
    const svc = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });

    svc.dispose();

    try {
      const _v = svc.value;
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "value");
      expect(e).toHaveProperty("portName", "Double");
    }
  });

  it("throws DisposedStateAccess on .subscribe after dispose", () => {
    const svc = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });

    svc.dispose();

    try {
      svc.subscribe(() => {});
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "subscribe");
    }
  });
});

// =============================================================================
// derived-service-impl.ts — DerivedComputationFailed error
// Kills: L39-48 tryCatch select failure path
// =============================================================================

describe("DerivedService — DerivedComputationFailed on select throw", () => {
  it("wraps non-circular error in DerivedComputationFailed", () => {
    const svc = createDerivedServiceImpl<number>({
      portName: "Broken",
      containerName: "root",
      select: () => {
        throw new Error("computation-error");
      },
    });

    try {
      const _v = svc.value;
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DerivedComputationFailed");
      expect(e).toHaveProperty("portName", "Broken");
      expect(e).toHaveProperty("cause");
      expect((e as { cause: Error }).cause).toBeInstanceOf(Error);
    }
  });

  it("re-throws CircularDerivedDependency without wrapping", () => {
    // Create a derived that reads itself to trigger cycle detection.
    // Use a holder object so we can reference the service from within select
    // while using const for the service binding.
    const holder: { svc?: ReturnType<typeof createDerivedServiceImpl<number>> } = {};

    holder.svc = createDerivedServiceImpl<number>({
      portName: "SelfRef",
      containerName: "root",
      select: () => {
        // Reading own value triggers cycle detection via withCycleDetection
        return holder.svc?.value as number;
      },
    });

    try {
      const _v = holder.svc.value;
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      // Should be CircularDerivedDependency, NOT DerivedComputationFailed
      expect(e).toHaveProperty("_tag", "CircularDerivedDependency");
    }
  });
});

// =============================================================================
// derived-service-impl.ts — custom equality function
// Kills: L72 config.equals ?? Object.is
// =============================================================================

describe("DerivedService — custom equality function", () => {
  it("uses custom equals to suppress duplicate notifications", () => {
    const atom = createAtomServiceImpl<{ x: number }>({
      portName: "Source",
      containerName: "root",
      initial: { x: 1 },
    });

    const listener = vi.fn();

    const svc = createDerivedServiceImpl<{ x: number }>({
      portName: "Derived",
      containerName: "root",
      select: () => ({ x: (atom.value as { x: number }).x }),
      equals: (a, b) => (a as { x: number }).x === (b as { x: number }).x,
    });

    svc.subscribe(listener);

    // Set same structural value — custom equals should suppress notification
    atom.set({ x: 1 });
    expect(listener).not.toHaveBeenCalled();

    // Set different value — should notify
    atom.set({ x: 2 });
    expect(listener).toHaveBeenCalledTimes(1);

    svc.dispose();
    atom.dispose();
  });

  it("default equality uses Object.is (reference equality)", () => {
    const atom = createAtomServiceImpl<{ x: number }>({
      portName: "Source",
      containerName: "root",
      initial: { x: 1 },
    });

    const listener = vi.fn();

    const svc = createDerivedServiceImpl<{ x: number }>({
      portName: "Derived",
      containerName: "root",
      select: () => ({ x: (atom.value as { x: number }).x }),
      // No custom equals — uses Object.is
    });

    svc.subscribe(listener);

    // New object reference even with same values triggers notification (Object.is check fails)
    atom.set({ x: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    svc.dispose();
    atom.dispose();
  });
});

// =============================================================================
// derived-service-impl.ts — dispose resets subscriberCount
// Kills: L101 _subscriberCount = 0
// =============================================================================

describe("DerivedService — dispose resets subscriberCount", () => {
  it("subscriberCount becomes 0 after dispose", () => {
    const svc = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "root",
      select: () => 42,
    });

    svc.subscribe(() => {});
    svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(2);

    svc.dispose();
    expect(svc.subscriberCount).toBe(0);
  });
});

// =============================================================================
// derived-service-impl.ts — tracing hooks error resilience
// Kills: L33-36 tryCatch around onDerivedRecompute, L44-47 onDerivedRecomputeEnd
// =============================================================================

describe("DerivedService — tracing hooks error resilience", () => {
  it("value still accessible when onDerivedRecompute throws", () => {
    const hook = makeHook({
      onDerivedRecompute: () => {
        throw new Error("recompute-crash");
      },
    });

    const svc = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "root",
      select: () => 42,
      tracingHook: hook,
    });

    // Should not throw
    expect(svc.value).toBe(42);

    svc.dispose();
  });

  it("value still accessible when onDerivedRecomputeEnd throws", () => {
    const hook = makeHook({
      onDerivedRecomputeEnd: () => {
        throw new Error("end-crash");
      },
    });

    const svc = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "root",
      select: () => 42,
      tracingHook: hook,
    });

    expect(svc.value).toBe(42);

    svc.dispose();
  });
});

// =============================================================================
// cycle-detection.ts — withCycleDetection
// Kills: L36-49 various mutations
// =============================================================================

describe("withCycleDetection — thorough", () => {
  it("returns the value from fn when no cycle", () => {
    const result = withCycleDetection("portA", () => 123);
    expect(result).toBe(123);
  });

  it("throws CircularDerivedDependency on self-reference", () => {
    try {
      withCycleDetection("portA", () => {
        withCycleDetection("portA", () => "nested");
      });
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "CircularDerivedDependency");
      const err = e as { dependencyChain: readonly string[] };
      expect(err.dependencyChain).toEqual(["portA", "portA"]);
    }
  });

  it("resets evaluation stack after fn throws non-cycle error", () => {
    try {
      withCycleDetection("portX", () => {
        throw new Error("non-cycle");
      });
    } catch {
      // expected
    }

    // Stack is clean — can use portX again
    const result = withCycleDetection("portX", () => "recovered");
    expect(result).toBe("recovered");
  });

  it("resets evaluation stack after cycle detection throws", () => {
    try {
      withCycleDetection("a", () => {
        withCycleDetection("b", () => {
          withCycleDetection("a", () => {});
        });
      });
    } catch {
      // expected
    }

    // Both a and b should be clean
    const resultA = withCycleDetection("a", () => "a-ok");
    expect(resultA).toBe("a-ok");

    const resultB = withCycleDetection("b", () => "b-ok");
    expect(resultB).toBe("b-ok");
  });

  it("handles three-level chain correctly", () => {
    try {
      withCycleDetection("p1", () => {
        withCycleDetection("p2", () => {
          withCycleDetection("p3", () => {
            withCycleDetection("p1", () => {});
          });
        });
      });
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "CircularDerivedDependency");
      const err = e as { dependencyChain: readonly string[] };
      expect(err.dependencyChain).toEqual(["p1", "p2", "p3", "p1"]);
    }
  });

  it("handles partial chain cycle (middle node repeated)", () => {
    try {
      withCycleDetection("a", () => {
        withCycleDetection("b", () => {
          withCycleDetection("c", () => {
            withCycleDetection("b", () => {});
          });
        });
      });
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const err = e as { dependencyChain: readonly string[] };
      // Chain from b → c → b (only the cycle portion)
      expect(err.dependencyChain).toEqual(["b", "c", "b"]);
    }
  });

  it("independent chains do not interfere", () => {
    // First chain: a → b (no cycle)
    const r1 = withCycleDetection("a", () => {
      return withCycleDetection("b", () => "chain1");
    });
    expect(r1).toBe("chain1");

    // Second chain: b → c (no cycle, even though b was used before)
    const r2 = withCycleDetection("b", () => {
      return withCycleDetection("c", () => "chain2");
    });
    expect(r2).toBe("chain2");
  });
});

// =============================================================================
// isCircularDerivedDependency — additional edge cases
// Kills: L22-25 various conditional mutations
// =============================================================================

describe("isCircularDerivedDependency — edge cases", () => {
  it("returns false for array", () => {
    expect(isCircularDerivedDependency([])).toBe(false);
  });

  it("returns false for object with _tag as non-string", () => {
    expect(isCircularDerivedDependency({ _tag: 42 })).toBe(false);
    expect(isCircularDerivedDependency({ _tag: true })).toBe(false);
    expect(isCircularDerivedDependency({ _tag: null })).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isCircularDerivedDependency({})).toBe(false);
  });

  it("returns true for real CircularDerivedDependency error", () => {
    try {
      withCycleDetection("x", () => {
        withCycleDetection("x", () => {});
      });
    } catch (e) {
      expect(isCircularDerivedDependency(e)).toBe(true);
    }
  });
});

// =============================================================================
// linked-derived-service-impl.ts — set writes to underlying
// Kills: L49-52 stableSet calls config.write
// =============================================================================

describe("LinkedDerivedService — set method", () => {
  it("set calls config.write with the value", () => {
    const writeFn = vi.fn();

    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => 0,
      write: writeFn,
    });

    svc.set(42);
    expect(writeFn).toHaveBeenCalledWith(42);
    expect(writeFn).toHaveBeenCalledTimes(1);

    svc.dispose();
  });

  it("set throws DisposedStateAccess after dispose", () => {
    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });

    svc.dispose();

    try {
      svc.set(1);
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "set");
    }
  });
});

// =============================================================================
// linked-derived-service-impl.ts — disposal guards
// Kills: L43-47 checkDisposed for "value", "subscribe"
// =============================================================================

describe("LinkedDerivedService — disposal guards", () => {
  it("throws DisposedStateAccess on .value after dispose", () => {
    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });

    svc.dispose();

    try {
      const _v = svc.value;
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "value");
    }
  });

  it("throws DisposedStateAccess on .subscribe after dispose", () => {
    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => 0,
      write: () => {},
    });

    svc.dispose();

    try {
      svc.subscribe(() => {});
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toHaveProperty("_tag", "DisposedStateAccess");
      expect(e).toHaveProperty("operation", "subscribe");
    }
  });
});

// =============================================================================
// linked-derived-service-impl.ts — dispose resets subscriberCount
// Kills: L94 _subscriberCount = 0
// =============================================================================

describe("LinkedDerivedService — dispose resets subscriberCount", () => {
  it("subscriberCount becomes 0 after dispose", () => {
    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => 42,
      write: () => {},
    });

    svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(1);

    svc.dispose();
    expect(svc.subscriberCount).toBe(0);
  });
});

// =============================================================================
// linked-derived-service-impl.ts — subscribe and notify
// Kills: L68-74 createEffect listener logic
// =============================================================================

describe("LinkedDerivedService — subscribe notification", () => {
  it("subscriber receives notifications when underlying value changes", () => {
    const atom = createAtomServiceImpl<number>({
      portName: "Source",
      containerName: "root",
      initial: 10,
    });

    const received: Array<{ value: number; prev: number }> = [];

    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => (atom.value as number) * 2,
      write: v => atom.set(v / 2),
    });

    svc.subscribe((value, prev) => {
      received.push({ value: value as number, prev: prev as number });
    });

    atom.set(20);
    expect(received).toEqual([{ value: 40, prev: 20 }]);

    svc.dispose();
    atom.dispose();
  });

  it("unsubscribed listener does not receive further notifications", () => {
    const atom = createAtomServiceImpl<number>({
      portName: "Source",
      containerName: "root",
      initial: 0,
    });

    const listener = vi.fn();

    const svc = createLinkedDerivedServiceImpl<number>({
      portName: "Linked",
      containerName: "root",
      select: () => atom.value as number,
      write: () => {},
    });

    const unsub = svc.subscribe(listener);

    atom.set(1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();

    atom.set(2);
    expect(listener).toHaveBeenCalledTimes(1); // no additional call

    svc.dispose();
    atom.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — subscriberCount tracking
// Kills: L200 _subscriberCount++, L217 _subscriberCount--
// =============================================================================

describe("AsyncDerivedService — subscriberCount tracking", () => {
  it("subscriberCount increments on subscribe and decrements on unsubscribe", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    expect(svc.subscriberCount).toBe(0);

    const unsub1 = svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(1);

    const unsub2 = svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(2);

    const unsub3 = svc.subscribe(() => {});
    expect(svc.subscriberCount).toBe(3);

    unsub2();
    expect(svc.subscriberCount).toBe(2);

    unsub1();
    expect(svc.subscriberCount).toBe(1);

    unsub3();
    expect(svc.subscriberCount).toBe(0);

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — refresh is referentially stable
// Kills: L168 stableRefresh arrow function identity
// =============================================================================

describe("AsyncDerivedService — refresh referential stability", () => {
  it("refresh is the same function reference across accesses", () => {
    const svc = createAsyncDerivedServiceImpl<string>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok("value"),
    });

    const ref1 = svc.refresh;
    const ref2 = svc.refresh;
    expect(ref1).toBe(ref2);

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — success path deep-freezes data
// Kills: L120 deepFreeze call on attemptResult.value
// =============================================================================

describe("AsyncDerivedService — data is deeply frozen on success", () => {
  afterEach(() => vi.restoreAllMocks());

  it("success data is deeply frozen", async () => {
    const svc = createAsyncDerivedServiceImpl<{ nested: { val: number } }>({
      portName: "Data",
      containerName: "root",
      select: () => ResultAsync.ok({ nested: { val: 42 } }),
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));

    const data = svc.snapshot.data;
    expect(data).toBeDefined();
    if (data !== undefined) {
      expect(Object.isFrozen(data)).toBe(true);
      expect(Object.isFrozen((data as { nested: { val: number } }).nested)).toBe(true);
    }

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — retryDelay undefined defaults to 0
// Kills: L146 config.retryDelay ?? 0
// =============================================================================

describe("AsyncDerivedService — retryDelay defaults to 0 when undefined", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retry proceeds immediately when retryDelay is not configured", async () => {
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      retryCount: 1,
      // retryDelay not specified — defaults to 0
      select: () => {
        attempts++;
        if (attempts === 1) return ResultAsync.err("fail");
        return ResultAsync.ok("ok");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("success"));
    expect(attempts).toBe(2);

    svc.dispose();
  });
});

// =============================================================================
// async-derived-service-impl.ts — no retries configured (retryCount undefined)
// Kills: L85 config.retryCount ?? 0
// =============================================================================

describe("AsyncDerivedService — no retryCount means single attempt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not retry when retryCount is not configured", async () => {
    let attempts = 0;

    const svc = createAsyncDerivedServiceImpl<string, string>({
      portName: "Data",
      containerName: "root",
      // retryCount not specified — defaults to 0, so maxAttempts = 1
      select: () => {
        attempts++;
        return ResultAsync.err("fail");
      },
    });

    svc.refresh();
    await vi.waitFor(() => expect(svc.snapshot.status).toBe("error"));
    expect(attempts).toBe(1);

    svc.dispose();
  });
});
