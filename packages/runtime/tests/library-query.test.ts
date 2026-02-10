/**
 * Tests for Cross-Library Unified Query API
 */

import { describe, it, expect } from "vitest";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";
import type { LibraryInspector, InspectorEvent } from "@hex-di/core";

function noop(_event: InspectorEvent): void {
  // no-op emitter for tests
}

function createMockInspector(name: string, snapshot: Record<string, unknown>): LibraryInspector {
  return {
    name,
    getSnapshot: () => Object.freeze({ ...snapshot }),
  };
}

function createFailingInspector(name: string): LibraryInspector {
  return {
    name,
    getSnapshot: () => {
      throw new Error("snapshot failed");
    },
  };
}

describe("queryLibraries", () => {
  it("filters entries across multiple libraries", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42, name: "test" }), noop);
    registry.registerLibrary(createMockInspector("flow", { state: "idle", count: 7 }), noop);

    const results = registry.queryLibraries(entry => entry.key === "count");

    expect(results).toHaveLength(2);
    expect(results.map(r => r.library).sort()).toEqual(["flow", "store"]);
    expect(results.find(r => r.library === "store")?.value).toBe(42);
    expect(results.find(r => r.library === "flow")?.value).toBe(7);
  });

  it("returns empty array when no entries match", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryLibraries(entry => entry.key === "nonexistent");

    expect(results).toHaveLength(0);
  });

  it("skips libraries whose getSnapshot throws", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);
    registry.registerLibrary(createFailingInspector("broken"), noop);

    const results = registry.queryLibraries(() => true);

    expect(results.every(r => r.library === "store")).toBe(true);
    expect(results.find(r => r.library === "broken")).toBeUndefined();
  });

  it("returns frozen entries", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryLibraries(() => true);

    expect(Object.isFrozen(results)).toBe(true);
    for (const entry of results) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it("returns empty when no libraries are registered", () => {
    const registry = createLibraryRegistry();

    const results = registry.queryLibraries(() => true);

    expect(results).toHaveLength(0);
  });
});

describe("queryByLibrary", () => {
  it("returns all entries for a library when no predicate is given", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42, name: "test" }), noop);
    registry.registerLibrary(createMockInspector("flow", { state: "idle" }), noop);

    const results = registry.queryByLibrary("store");

    expect(results).toHaveLength(2);
    expect(results.every(r => r.library === "store")).toBe(true);
  });

  it("filters entries with a predicate", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42, name: "test" }), noop);

    const results = registry.queryByLibrary("store", entry => entry.key === "count");

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("count");
    expect(results[0].value).toBe(42);
  });

  it("returns empty for non-existent library", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryByLibrary("nonexistent");

    expect(results).toHaveLength(0);
  });

  it("returns empty when library's snapshot throws", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createFailingInspector("broken"), noop);

    const results = registry.queryByLibrary("broken");

    expect(results).toHaveLength(0);
  });

  it("returns frozen results", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryByLibrary("store");

    expect(Object.isFrozen(results)).toBe(true);
  });
});

describe("queryByKey", () => {
  it("matches exact string key across libraries", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42, name: "test" }), noop);
    registry.registerLibrary(createMockInspector("flow", { count: 7, state: "idle" }), noop);

    const results = registry.queryByKey("count");

    expect(results).toHaveLength(2);
    expect(results.map(r => r.library).sort()).toEqual(["flow", "store"]);
  });

  it("matches RegExp key pattern", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(
      createMockInspector("store", { errorCount: 1, errorRate: 0.5, name: "test" }),
      noop
    );

    const results = registry.queryByKey(/^error/);

    expect(results).toHaveLength(2);
    expect(results.map(r => r.key).sort()).toEqual(["errorCount", "errorRate"]);
  });

  it("returns empty when no keys match", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryByKey("nonexistent");

    expect(results).toHaveLength(0);
  });

  it("skips libraries whose snapshot throws", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);
    registry.registerLibrary(createFailingInspector("broken"), noop);

    const results = registry.queryByKey("count");

    expect(results).toHaveLength(1);
    expect(results[0].library).toBe("store");
  });

  it("returns frozen results", () => {
    const registry = createLibraryRegistry();
    registry.registerLibrary(createMockInspector("store", { count: 42 }), noop);

    const results = registry.queryByKey("count");

    expect(Object.isFrozen(results)).toBe(true);
    for (const entry of results) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});
