/**
 * Performance Tests for Library Registry
 *
 * Covers DoD 8 (#1-#5): Performance characteristics of the library registry.
 *
 * @packageDocumentation
 */

import { describe, test, expect } from "vitest";
import type { LibraryInspector } from "@hex-di/core";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";
import type { InspectorEvent } from "@hex-di/core";

// =============================================================================
// Test Helpers
// =============================================================================

function createMinimalInspector(name: string): LibraryInspector {
  return { name, getSnapshot: () => Object.freeze({ n: name }) };
}

function noopEmit(_event: InspectorEvent): void {
  // intentional no-op
}

// =============================================================================
// Tests
// =============================================================================

describe("Library registry performance", () => {
  // #1
  test("supports registering 100 library inspectors", () => {
    const registry = createLibraryRegistry();

    for (let i = 0; i < 100; i++) {
      registry.registerLibrary(createMinimalInspector(`lib-${i}`), noopEmit);
    }

    expect(registry.getLibraryInspectors().size).toBe(100);
  });

  // #2
  test("getLibrarySnapshots aggregates 100 inspectors within reasonable time", () => {
    const registry = createLibraryRegistry();

    for (let i = 0; i < 100; i++) {
      registry.registerLibrary(createMinimalInspector(`lib-${i}`), noopEmit);
    }

    const start = Date.now();
    const snapshots = registry.getLibrarySnapshots();
    const elapsed = Date.now() - start;

    expect(Object.keys(snapshots)).toHaveLength(100);
    // Should complete in < 100ms even on slow machines
    expect(elapsed).toBeLessThan(100);
  });

  // #3
  test("dispose cleans up 100 inspectors without leaking", () => {
    const registry = createLibraryRegistry();

    for (let i = 0; i < 100; i++) {
      registry.registerLibrary(createMinimalInspector(`lib-${i}`), noopEmit);
    }

    registry.dispose();

    expect(registry.getLibraryInspectors().size).toBe(0);
  });

  // #4
  test("rapid registration/unregistration cycles do not leak", () => {
    const registry = createLibraryRegistry();

    for (let i = 0; i < 50; i++) {
      const unsub = registry.registerLibrary(createMinimalInspector(`lib-${i}`), noopEmit);
      unsub();
    }

    expect(registry.getLibraryInspectors().size).toBe(0);
  });

  // #5
  test("getLibraryInspector lookup is fast for large registries", () => {
    const registry = createLibraryRegistry();

    for (let i = 0; i < 100; i++) {
      registry.registerLibrary(createMinimalInspector(`lib-${i}`), noopEmit);
    }

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      registry.getLibraryInspector(`lib-${i % 100}`);
    }
    const elapsed = Date.now() - start;

    // 1000 lookups should be < 10ms
    expect(elapsed).toBeLessThan(10);
  });
});
