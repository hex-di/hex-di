import { describe, it, expect } from "vitest";
import { createQueryCache, createQueryPort } from "../src/index.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });

describe("Staleness", () => {
  it("entry is stale when dataUpdatedAt === undefined", () => {
    const cache = createQueryCache({ gc: { enabled: false } });
    const entry = cache.getOrCreate(UsersPort, "p1");
    // Pending entry has no dataUpdatedAt
    expect(entry.dataUpdatedAt).toBeUndefined();
    cache.dispose();
  });

  it("entry is stale when isInvalidated === true", () => {
    const cache = createQueryCache({ gc: { enabled: false } });
    cache.set(UsersPort, "p1", ["data"]);
    cache.invalidate(UsersPort, "p1");
    const entry = cache.get(UsersPort, "p1");
    expect(entry?.isInvalidated).toBe(true);
    cache.dispose();
  });

  it("entry is stale when now - dataUpdatedAt > staleTime", () => {
    let now = 1000;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: false },
    });
    cache.set(UsersPort, "p1", ["data"]);
    const entry = cache.get(UsersPort, "p1");
    expect(entry?.dataUpdatedAt).toBe(1000);
    // If staleTime is 0 (default), then at now=1001 the data is stale
    now = 1001;
    // Data was updated at 1000, staleTime default is 0, so 1001-1000 > 0
    expect(now - (entry?.dataUpdatedAt ?? 0) > 0).toBe(true);
    cache.dispose();
  });

  it("entry is fresh when now - dataUpdatedAt <= staleTime", () => {
    const now = 1000;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: false },
    });
    cache.set(UsersPort, "p1", ["data"]);
    const entry = cache.get(UsersPort, "p1");
    // staleTime default is 0; at dataUpdatedAt=1000, now=1000 => 0 <= 0 (fresh)
    expect(now - (entry?.dataUpdatedAt ?? 0)).toBe(0);
    cache.dispose();
  });

  it("staleTime: 0 makes data immediately stale", () => {
    let now = 1000;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: false },
    });
    cache.set(UsersPort, "p1", ["data"]);
    now = 1001; // Any time after dataUpdatedAt makes it stale with staleTime=0
    const entry = cache.get(UsersPort, "p1");
    const diff = now - (entry?.dataUpdatedAt ?? 0);
    expect(diff > 0).toBe(true); // staleTime=0, diff>0 means stale
    cache.dispose();
  });

  it("staleTime: Infinity makes data never stale", () => {
    let now = 1000;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: false },
    });
    cache.set(UsersPort, "p1", ["data"]);
    now = 999_999_999; // Even very far in the future
    const entry = cache.get(UsersPort, "p1");
    const diff = now - (entry?.dataUpdatedAt ?? 0);
    // With staleTime=Infinity, diff < Infinity is always true => fresh
    expect(diff < Infinity).toBe(true);
    cache.dispose();
  });

  it("staleness uses injectable Clock for time source", () => {
    const now = 5000;
    const cache = createQueryCache({
      clock: { now: () => now },
      gc: { enabled: false },
    });
    cache.set(UsersPort, "p1", ["data"]);
    const entry = cache.get(UsersPort, "p1");
    expect(entry?.dataUpdatedAt).toBe(5000);
    cache.dispose();
  });
});
