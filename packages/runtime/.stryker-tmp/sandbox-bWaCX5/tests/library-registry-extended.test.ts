/**
 * Extended tests for src/inspection/library-registry.ts
 * Covers registration, event forwarding, snapshot aggregation, disposal.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";
import type { LibraryInspector } from "@hex-di/core";

function createMockInspector(
  name: string,
  overrides: Partial<LibraryInspector> = {}
): LibraryInspector {
  return {
    name,
    getSnapshot: () => ({ status: "active" }),
    dispose: vi.fn(),
    subscribe: vi.fn(cb => {
      // Return unsubscribe
      return () => {};
    }),
    ...overrides,
  };
}

describe("LibraryRegistry", () => {
  describe("registerLibrary", () => {
    it("registers a valid inspector", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib");

      registry.registerLibrary(inspector, emit);

      expect(registry.getLibraryInspector("test-lib")).toBe(inspector);
      expect(emit).toHaveBeenCalledWith({ type: "library-registered", name: "test-lib" });
    });

    it("throws for invalid inspector", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();

      expect(() => registry.registerLibrary({} as any, emit)).toThrow(TypeError);
    });

    it("returns unregister function", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib");

      const unregister = registry.registerLibrary(inspector, emit);
      expect(typeof unregister).toBe("function");

      unregister();
      expect(registry.getLibraryInspector("test-lib")).toBeUndefined();
      expect(emit).toHaveBeenCalledWith({ type: "library-unregistered", name: "test-lib" });
    });

    it("unregister is idempotent", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib");

      const unregister = registry.registerLibrary(inspector, emit);
      unregister();
      const callCountAfterFirst = emit.mock.calls.length;

      unregister(); // Second call - should be no-op
      expect(emit.mock.calls.length).toBe(callCountAfterFirst);
    });

    it("replaces existing inspector with same name (last-write-wins)", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector1 = createMockInspector("test-lib");
      const inspector2 = createMockInspector("test-lib");

      registry.registerLibrary(inspector1, emit);
      registry.registerLibrary(inspector2, emit);

      expect(registry.getLibraryInspector("test-lib")).toBe(inspector2);
      // Should have called dispose on old inspector
      expect(inspector1.dispose).toHaveBeenCalled();
    });

    it("subscribes to library events when subscribe is provided", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const subscribeFn = vi.fn(() => () => {});
      const inspector = createMockInspector("test-lib", { subscribe: subscribeFn });

      registry.registerLibrary(inspector, emit);
      expect(subscribeFn).toHaveBeenCalled();
    });

    it("does not throw when subscribe returns an unsubscribe function", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib", { subscribe: vi.fn(() => () => {}) });

      registry.registerLibrary(inspector, emit);
      // Should not throw
      expect(registry.getLibraryInspector("test-lib")).toBeDefined();
    });

    it("forwards library events to container emit", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      let libraryCallback: ((event: any) => void) | undefined;
      const inspector = createMockInspector("test-lib", {
        subscribe: vi.fn((cb: any) => {
          libraryCallback = cb;
          return () => {};
        }),
      });

      registry.registerLibrary(inspector, emit);

      // Simulate library emitting an event
      libraryCallback?.({ type: "custom" });

      expect(emit).toHaveBeenCalledWith({ type: "library", event: { type: "custom" } });
    });
  });

  describe("getLibraryInspectors", () => {
    it("returns copy of inspectors map", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib");
      registry.registerLibrary(inspector, emit);

      const inspectors = registry.getLibraryInspectors();
      expect(inspectors.size).toBe(1);
      expect(inspectors.get("test-lib")).toBe(inspector);

      // Should be a copy, not the internal map
      expect(inspectors).not.toBe(registry.getLibraryInspectors());
    });

    it("returns empty map when no inspectors", () => {
      const registry = createLibraryRegistry();
      const inspectors = registry.getLibraryInspectors();
      expect(inspectors.size).toBe(0);
    });
  });

  describe("getLibraryInspector", () => {
    it("returns inspector by name", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib");
      registry.registerLibrary(inspector, emit);

      expect(registry.getLibraryInspector("test-lib")).toBe(inspector);
    });

    it("returns undefined for unknown name", () => {
      const registry = createLibraryRegistry();
      expect(registry.getLibraryInspector("nonexistent")).toBeUndefined();
    });
  });

  describe("getLibrarySnapshots", () => {
    it("returns frozen aggregate snapshots", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib", {
        getSnapshot: () => ({ status: "active", count: 42 }),
      });
      registry.registerLibrary(inspector, emit);

      const snapshots = registry.getLibrarySnapshots();
      expect(Object.isFrozen(snapshots)).toBe(true);
      expect(snapshots["test-lib"]).toEqual({ status: "active", count: 42 });
    });

    it("handles snapshot failures gracefully", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("test-lib", {
        getSnapshot: () => {
          throw new Error("snapshot error");
        },
      });
      registry.registerLibrary(inspector, emit);

      const snapshots = registry.getLibrarySnapshots();
      expect(snapshots["test-lib"]).toEqual({ error: "snapshot-failed" });
    });

    it("returns empty object when no inspectors", () => {
      const registry = createLibraryRegistry();
      const snapshots = registry.getLibrarySnapshots();
      expect(snapshots).toEqual({});
    });
  });

  describe("dispose", () => {
    it("disposes all inspectors", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector1 = createMockInspector("lib1");
      const inspector2 = createMockInspector("lib2");
      registry.registerLibrary(inspector1, emit);
      registry.registerLibrary(inspector2, emit);

      registry.dispose();

      expect(inspector1.dispose).toHaveBeenCalled();
      expect(inspector2.dispose).toHaveBeenCalled();
    });

    it("clears all inspectors after disposal", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      registry.registerLibrary(createMockInspector("lib1"), emit);

      registry.dispose();

      expect(registry.getLibraryInspectors().size).toBe(0);
    });

    it("tolerates individual dispose failures", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("lib1", {
        dispose: vi.fn(() => {
          throw new Error("dispose error");
        }),
      });
      registry.registerLibrary(inspector, emit);

      // Should not throw
      expect(() => registry.dispose()).not.toThrow();
    });

    it("tolerates individual unsubscribe failures", () => {
      const registry = createLibraryRegistry();
      const emit = vi.fn();
      const inspector = createMockInspector("lib1", {
        subscribe: vi.fn(() => {
          return () => {
            throw new Error("unsub error");
          };
        }),
      });
      registry.registerLibrary(inspector, emit);

      // Should not throw
      expect(() => registry.dispose()).not.toThrow();
    });
  });
});
