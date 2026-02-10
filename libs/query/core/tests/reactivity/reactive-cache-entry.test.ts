import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import {
  createReactiveCacheEntry,
  getSnapshot,
  hasSubscribers,
  incrementSubscribers,
  decrementSubscribers,
  getSubscriberCount,
  createPendingEntry,
  createIsolatedReactiveSystem,
  createEffect,
} from "../../src/index.js";

// =============================================================================
// createReactiveCacheEntry
// =============================================================================

describe("createReactiveCacheEntry", () => {
  it("creates entry with correct initial state", () => {
    const entry = createReactiveCacheEntry<string, Error>("test-key");

    expect(entry.key).toBe("test-key");
    expect(entry.result$.get()).toBeUndefined();
    expect(entry.fetchStatus$.get()).toBe("idle");
    expect(entry.fetchCount$.get()).toBe(0);
    expect(entry.isInvalidated$.get()).toBe(false);
    expect(entry.dataUpdatedAt$.get()).toBeUndefined();
    expect(entry.errorUpdatedAt$.get()).toBeUndefined();
  });

  it("derives pending status when result is undefined", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");

    expect(entry.status.get()).toBe("pending");
    expect(entry.isPending.get()).toBe(true);
    expect(entry.isSuccess.get()).toBe(false);
    expect(entry.isError.get()).toBe(false);
    expect(entry.data.get()).toBeUndefined();
    expect(entry.error.get()).toBeNull();
  });

  it("derives success status when result is Ok", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");

    entry.result$.set(ok("hello"));

    expect(entry.status.get()).toBe("success");
    expect(entry.isSuccess.get()).toBe(true);
    expect(entry.isPending.get()).toBe(false);
    expect(entry.isError.get()).toBe(false);
    expect(entry.data.get()).toBe("hello");
    expect(entry.error.get()).toBeNull();
  });

  it("derives error status when result is Err", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");
    const testError = new Error("test failure");

    entry.result$.set(err(testError));

    expect(entry.status.get()).toBe("error");
    expect(entry.isError.get()).toBe(true);
    expect(entry.isPending.get()).toBe(false);
    expect(entry.isSuccess.get()).toBe(false);
    expect(entry.data.get()).toBeUndefined();
    expect(entry.error.get()).toBe(testError);
  });

  it("derives isFetching from fetchStatus$", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");

    expect(entry.isFetching.get()).toBe(false);

    entry.fetchStatus$.set("fetching");
    expect(entry.isFetching.get()).toBe(true);

    entry.fetchStatus$.set("idle");
    expect(entry.isFetching.get()).toBe(false);
  });

  it("derives isLoading = isPending && isFetching", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");

    // Initially pending and idle → not loading
    expect(entry.isLoading.get()).toBe(false);

    // Pending and fetching → loading
    entry.fetchStatus$.set("fetching");
    expect(entry.isLoading.get()).toBe(true);

    // Success and fetching → not loading (isRefetching instead)
    entry.result$.set(ok("data"));
    expect(entry.isLoading.get()).toBe(false);
  });

  it("derives isRefetching = isSuccess && isFetching", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");

    // Initially pending → not refetching
    expect(entry.isRefetching.get()).toBe(false);

    // Success and idle → not refetching
    entry.result$.set(ok("data"));
    expect(entry.isRefetching.get()).toBe(false);

    // Success and fetching → refetching
    entry.fetchStatus$.set("fetching");
    expect(entry.isRefetching.get()).toBe(true);

    // Back to idle → not refetching
    entry.fetchStatus$.set("idle");
    expect(entry.isRefetching.get()).toBe(false);
  });

  it("propagates signal changes to effects", () => {
    const entry = createReactiveCacheEntry<number, Error>("key");
    const statuses: string[] = [];

    const effect = createEffect(() => {
      statuses.push(entry.status.get());
    });

    expect(statuses).toEqual(["pending"]);

    entry.result$.set(ok(42));
    expect(statuses).toEqual(["pending", "success"]);

    entry.result$.set(err(new Error("fail")));
    expect(statuses).toEqual(["pending", "success", "error"]);

    effect.dispose();
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const entry = createReactiveCacheEntry<string, Error>("isolated-key", system);

    expect(entry.status.get()).toBe("pending");

    entry.result$.set(ok("isolated-data"));
    expect(entry.status.get()).toBe("success");
    expect(entry.data.get()).toBe("isolated-data");

    const statuses: string[] = [];
    const effect = createEffect(() => {
      statuses.push(entry.status.get());
    }, system);

    expect(statuses).toEqual(["success"]);

    entry.result$.set(err(new Error("isolated-error")));
    expect(statuses).toEqual(["success", "error"]);

    effect.dispose();
  });
});

// =============================================================================
// getSnapshot
// =============================================================================

describe("getSnapshot", () => {
  it("returns plain object snapshot of pending entry", () => {
    const entry = createReactiveCacheEntry<string, Error>("snap-key");
    const snap = getSnapshot(entry);

    expect(snap.result).toBeUndefined();
    expect(snap.data).toBeUndefined();
    expect(snap.error).toBeNull();
    expect(snap.status).toBe("pending");
    expect(snap.fetchStatus).toBe("idle");
    expect(snap.fetchCount).toBe(0);
    expect(snap.isInvalidated).toBe(false);
    expect(snap.dataUpdatedAt).toBeUndefined();
    expect(snap.errorUpdatedAt).toBeUndefined();
  });

  it("returns snapshot reflecting current signal values", () => {
    const entry = createReactiveCacheEntry<string, Error>("snap-key");
    const now = Date.now();

    entry.result$.set(ok("snapshot-data"));
    entry.fetchStatus$.set("fetching");
    entry.fetchCount$.set(3);
    entry.isInvalidated$.set(true);
    entry.dataUpdatedAt$.set(now);

    const snap = getSnapshot(entry);
    expect(snap.data).toBe("snapshot-data");
    expect(snap.status).toBe("success");
    expect(snap.fetchStatus).toBe("fetching");
    expect(snap.fetchCount).toBe(3);
    expect(snap.isInvalidated).toBe(true);
    expect(snap.dataUpdatedAt).toBe(now);
  });
});

// =============================================================================
// Subscriber tracking
// =============================================================================

describe("subscriber tracking", () => {
  it("hasSubscribers returns false initially", () => {
    const entry = createReactiveCacheEntry<string, Error>("sub-key");
    expect(hasSubscribers(entry)).toBe(false);
    expect(getSubscriberCount(entry)).toBe(0);
  });

  it("incrementSubscribers/decrementSubscribers track count", () => {
    const entry = createReactiveCacheEntry<string, Error>("sub-key");

    incrementSubscribers(entry);
    expect(hasSubscribers(entry)).toBe(true);
    expect(getSubscriberCount(entry)).toBe(1);

    incrementSubscribers(entry);
    expect(getSubscriberCount(entry)).toBe(2);

    decrementSubscribers(entry);
    expect(getSubscriberCount(entry)).toBe(1);
    expect(hasSubscribers(entry)).toBe(true);

    decrementSubscribers(entry);
    expect(getSubscriberCount(entry)).toBe(0);
    expect(hasSubscribers(entry)).toBe(false);
  });

  it("decrementSubscribers does not go below 0", () => {
    const entry = createReactiveCacheEntry<string, Error>("sub-key");

    decrementSubscribers(entry);
    expect(getSubscriberCount(entry)).toBe(0);
    expect(hasSubscribers(entry)).toBe(false);
  });
});

// =============================================================================
// createPendingEntry (legacy)
// =============================================================================

describe("createPendingEntry", () => {
  it("returns a snapshot with pending defaults", () => {
    const pending = createPendingEntry<string, Error>();

    expect(pending.result).toBeUndefined();
    expect(pending.data).toBeUndefined();
    expect(pending.error).toBeNull();
    expect(pending.status).toBe("pending");
    expect(pending.fetchStatus).toBe("idle");
    expect(pending.fetchCount).toBe(0);
    expect(pending.isInvalidated).toBe(false);
    expect(pending.dataUpdatedAt).toBeUndefined();
    expect(pending.errorUpdatedAt).toBeUndefined();
  });
});
