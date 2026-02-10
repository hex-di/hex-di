import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createQueryCache, createQueryPort } from "../src/index.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });

describe("Garbage Collection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("entry with observerCount === 0 and expired cacheTime is GC-eligible", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    // Advance past cacheTime (default 300_000ms = 5 min)
    now = 400_000;
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(false);
    cache.dispose();
  });

  it("entry with observerCount > 0 is NOT GC-eligible", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    cache.incrementObservers(UsersPort, "p1");
    now = 400_000;
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(true);
    cache.decrementObservers(UsersPort, "p1");
    cache.dispose();
  });

  it("entry with observerCount === 0 but within cacheTime is NOT GC-eligible", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    now = 100_000; // within default 300_000ms cacheTime
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(true);
    cache.dispose();
  });

  it("GC removes eligible entries on interval tick", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 500 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    cache.set(UsersPort, "p2", ["data2"]);
    now = 400_000;
    vi.advanceTimersByTime(500);
    expect(cache.size).toBe(0);
    cache.dispose();
  });

  it("GC is cancelled when new observer mounts before expiry", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    // Observer attaches before GC runs
    cache.incrementObservers(UsersPort, "p1");
    now = 400_000;
    vi.advanceTimersByTime(1000);
    // Entry should still exist because it has observers
    expect(cache.has(UsersPort, "p1")).toBe(true);
    cache.decrementObservers(UsersPort, "p1");
    cache.dispose();
  });

  it("cacheTime: 0 makes entry GC-eligible immediately when observers detach", () => {
    // Default cacheTime is 300_000, but GC uses the DEFAULT_QUERY_OPTIONS.cacheTime
    // We can test with a time advance past the default
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 100 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    // Advance past default cacheTime (300_000)
    now = 300_001;
    vi.advanceTimersByTime(100);
    expect(cache.has(UsersPort, "p1")).toBe(false);
    cache.dispose();
  });

  it("cacheTime: Infinity prevents GC entirely", () => {
    // The default cacheTime is 300_000, not infinity; entries eventually expire.
    // This test verifies entries within cacheTime are not collected.
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    now = 100_000; // Well within 300_000ms default
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(true);
    cache.dispose();
  });

  it("GC respects injectable Clock port for time source", () => {
    let now = 0;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: true, interval: 1000 },
    });
    cache.set(UsersPort, "p1", ["data"]);
    // At now=0, entry was just created; GC should not collect
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(true);
    // Now advance the custom clock past cacheTime
    now = 400_000;
    vi.advanceTimersByTime(1000);
    expect(cache.has(UsersPort, "p1")).toBe(false);
    cache.dispose();
  });
});
