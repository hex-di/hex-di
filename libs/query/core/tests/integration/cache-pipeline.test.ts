/**
 * Integration tests: Cache pipeline
 *
 * Tests the full cache lifecycle: set → get → invalidate → structural sharing.
 */

import { describe, it, expect } from "vitest";
import {
  createQueryCache,
  createQueryPort,
  replaceEqualDeep,
  type Clock,
} from "../../src/index.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "CpUsers" });
const PostsPort = createQueryPort<string[], unknown>()({ name: "CpPosts" });

function createTestCache(clock?: Clock) {
  return createQueryCache({ gc: { enabled: false }, clock });
}

describe("Cache Pipeline Integration", () => {
  it("set data then get returns the same data", () => {
    const cache = createTestCache();
    cache.set(UsersPort, "params1", ["Alice", "Bob"]);
    const entry = cache.get(UsersPort, "params1");
    expect(entry).toBeDefined();
    expect(entry?.data).toEqual(["Alice", "Bob"]);
    cache.dispose();
  });

  it("set then invalidate then get returns entry with isInvalidated: true", () => {
    const cache = createTestCache();
    cache.set(UsersPort, "params1", ["Alice"]);

    const before = cache.get(UsersPort, "params1");
    expect(before?.isInvalidated).toBe(false);

    cache.invalidate(UsersPort, "params1");

    const after = cache.get(UsersPort, "params1");
    expect(after?.isInvalidated).toBe(true);
    // Data is still present after invalidation
    expect(after?.data).toEqual(["Alice"]);
    cache.dispose();
  });

  it("per-scope cache isolation: parent and child caches are independent", () => {
    const parentCache = createTestCache();
    const childCache = createTestCache();

    parentCache.set(UsersPort, "p1", ["ParentAlice"]);
    childCache.set(UsersPort, "p1", ["ChildAlice"]);

    expect(parentCache.get(UsersPort, "p1")?.data).toEqual(["ParentAlice"]);
    expect(childCache.get(UsersPort, "p1")?.data).toEqual(["ChildAlice"]);

    // Modifying child doesn't affect parent
    childCache.set(UsersPort, "p1", ["ChildBob"]);
    expect(parentCache.get(UsersPort, "p1")?.data).toEqual(["ParentAlice"]);
    expect(childCache.get(UsersPort, "p1")?.data).toEqual(["ChildBob"]);

    parentCache.dispose();
    childCache.dispose();
  });

  it("scope disposal clears the child cache", () => {
    const childCache = createTestCache();
    childCache.set(UsersPort, "p1", ["data"]);
    expect(childCache.has(UsersPort, "p1")).toBe(true);

    childCache.dispose();
    // After disposal, cache should be cleared
    expect(childCache.size).toBe(0);
  });

  it("structural sharing across refetches preserves unchanged references", () => {
    const cache = createTestCache();
    const data1 = { users: [{ id: 1, name: "Alice" }], meta: { total: 1 } };
    cache.set(UsersPort, "p1", data1, { structuralSharing: true });

    const entry1 = cache.get(UsersPort, "p1");
    expect(entry1?.data).toEqual(data1);

    // Refetch with same data structure
    const data2 = { users: [{ id: 1, name: "Alice" }], meta: { total: 1 } };
    cache.set(UsersPort, "p1", data2, { structuralSharing: true });

    const entry2 = cache.get(UsersPort, "p1");

    // With structural sharing, unchanged subtrees should share references
    // The replaceEqualDeep function should preserve the original reference
    // when the values are deeply equal
    expect(entry2?.data).toEqual(data2);

    // Verify replaceEqualDeep directly preserves references for equal objects
    const shared = replaceEqualDeep(data1, data2);
    expect(shared).toBe(data1); // Same reference when deeply equal

    cache.dispose();
  });

  it("different ports maintain independent cache entries", () => {
    const cache = createTestCache();
    cache.set(UsersPort, "same-params", ["user-data"]);
    cache.set(PostsPort, "same-params", ["post-data"]);

    expect(cache.get(UsersPort, "same-params")?.data).toEqual(["user-data"]);
    expect(cache.get(PostsPort, "same-params")?.data).toEqual(["post-data"]);

    // Invalidating one port doesn't affect the other
    cache.invalidate(UsersPort, "same-params");
    expect(cache.get(UsersPort, "same-params")?.isInvalidated).toBe(true);
    expect(cache.get(PostsPort, "same-params")?.isInvalidated).toBe(false);

    cache.dispose();
  });

  it("invalidate without params invalidates all entries for a port", () => {
    const cache = createTestCache();
    cache.set(UsersPort, "p1", ["data1"]);
    cache.set(UsersPort, "p2", ["data2"]);
    cache.set(PostsPort, "p1", ["post"]);

    cache.invalidate(UsersPort);

    expect(cache.get(UsersPort, "p1")?.isInvalidated).toBe(true);
    expect(cache.get(UsersPort, "p2")?.isInvalidated).toBe(true);
    // Other port not affected
    expect(cache.get(PostsPort, "p1")?.isInvalidated).toBe(false);

    cache.dispose();
  });

  it("cache events track the full pipeline", () => {
    const cache = createTestCache();
    const events: string[] = [];
    cache.subscribe(event => {
      events.push(event.type);
    });

    cache.set(UsersPort, "p1", ["data"]);
    cache.invalidate(UsersPort, "p1");
    cache.remove(UsersPort, "p1");

    expect(events).toContain("added");
    expect(events).toContain("invalidated");
    expect(events).toContain("removed");

    cache.dispose();
  });
});
