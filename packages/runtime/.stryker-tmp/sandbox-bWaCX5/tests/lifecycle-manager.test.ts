/**
 * Tests for src/container/internal/lifecycle-manager.ts
 * Covers child registration, LIFO disposal, idempotent disposal,
 * scope tracking, snapshot generation, and child inspector map.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import {
  LifecycleManager,
  childInspectorMap,
} from "../src/container/internal/lifecycle-manager.js";
import { MemoMap } from "../src/util/memo-map.js";

function createMockDisposable(isDisposed = false) {
  return {
    dispose: vi.fn().mockResolvedValue(undefined),
    isDisposed,
  };
}

function createMockInspector() {
  return {
    getSnapshot: vi.fn(),
    listPorts: vi.fn(),
    isResolved: vi.fn(),
    getScopeTree: vi.fn(),
    subscribe: vi.fn(),
    emit: vi.fn(),
  } as any;
}

describe("LifecycleManager", () => {
  describe("isDisposed", () => {
    it("returns false initially", () => {
      const lm = new LifecycleManager();
      expect(lm.isDisposed).toBe(false);
    });

    it("returns true after markDisposed", () => {
      const lm = new LifecycleManager();
      lm.markDisposed();
      expect(lm.isDisposed).toBe(true);
    });

    it("returns true after dispose", async () => {
      const lm = new LifecycleManager();
      const memo = new MemoMap();
      await lm.dispose(memo);
      expect(lm.isDisposed).toBe(true);
    });
  });

  describe("registerChildScope / unregisterChildScope", () => {
    it("registers and tracks child scope", () => {
      const lm = new LifecycleManager();
      const scope = createMockDisposable();
      lm.registerChildScope(scope);

      const snapshots = lm.getChildScopeSnapshots(s => ({ tracked: true }));
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].tracked).toBe(true);
    });

    it("unregisters child scope", () => {
      const lm = new LifecycleManager();
      const scope = createMockDisposable();
      lm.registerChildScope(scope);
      lm.unregisterChildScope(scope);

      const snapshots = lm.getChildScopeSnapshots(s => ({ tracked: true }));
      expect(snapshots).toHaveLength(0);
    });

    it("unregistering non-registered scope is a no-op", () => {
      const lm = new LifecycleManager();
      const scope = createMockDisposable();
      // Should not throw
      lm.unregisterChildScope(scope);
    });
  });

  describe("registerChildContainer / unregisterChildContainer", () => {
    it("registers child container and returns unique ID", () => {
      const lm = new LifecycleManager();
      const child1 = createMockDisposable();
      const child2 = createMockDisposable();

      const id1 = lm.registerChildContainer(child1);
      const id2 = lm.registerChildContainer(child2);

      expect(typeof id1).toBe("number");
      expect(typeof id2).toBe("number");
      expect(id1).not.toBe(id2);
    });

    it("stores inspector in childInspectorMap when provided", () => {
      const lm = new LifecycleManager();
      const child = createMockDisposable();
      const inspector = createMockInspector();

      const id = lm.registerChildContainer(child, inspector);
      expect(childInspectorMap.get(id)).toBe(inspector);

      // Cleanup
      lm.unregisterChildContainer(child);
    });

    it("does not store in childInspectorMap when inspector not provided", () => {
      const lm = new LifecycleManager();
      const child = createMockDisposable();

      const id = lm.registerChildContainer(child);
      expect(childInspectorMap.has(id)).toBe(false);
    });

    it("unregisters child container by CHILD_ID", () => {
      const lm = new LifecycleManager();
      const child = createMockDisposable();
      const inspector = createMockInspector();

      const id = lm.registerChildContainer(child, inspector);

      const snapshotsBefore = lm.getChildContainerSnapshots(() => true);
      expect(snapshotsBefore).toHaveLength(1);

      lm.unregisterChildContainer(child);

      const snapshotsAfter = lm.getChildContainerSnapshots(() => true);
      expect(snapshotsAfter).toHaveLength(0);

      // Inspector should also be removed
      expect(childInspectorMap.has(id)).toBe(false);
    });

    it("unregistering child without CHILD_ID is a no-op", () => {
      const lm = new LifecycleManager();
      const child = createMockDisposable();
      // child was never registered, so has no CHILD_ID
      lm.unregisterChildContainer(child); // should not throw
    });
  });

  describe("dispose", () => {
    it("is idempotent - second call returns immediately", async () => {
      const lm = new LifecycleManager();
      const memo = new MemoMap();
      const disposeSpy = vi.spyOn(memo, "dispose");

      await lm.dispose(memo);
      expect(disposeSpy).toHaveBeenCalledTimes(1);

      await lm.dispose(memo);
      // Should NOT call dispose again
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });

    it("disposes child containers in LIFO order", async () => {
      const lm = new LifecycleManager();
      const disposeOrder: string[] = [];

      const child1 = {
        dispose: vi.fn().mockImplementation(async () => {
          disposeOrder.push("child1");
        }),
        isDisposed: false,
      };
      const child2 = {
        dispose: vi.fn().mockImplementation(async () => {
          disposeOrder.push("child2");
        }),
        isDisposed: false,
      };
      const child3 = {
        dispose: vi.fn().mockImplementation(async () => {
          disposeOrder.push("child3");
        }),
        isDisposed: false,
      };

      lm.registerChildContainer(child1);
      lm.registerChildContainer(child2);
      lm.registerChildContainer(child3);

      const memo = new MemoMap();
      await lm.dispose(memo);

      // LIFO: last registered (child3) should be disposed first
      expect(disposeOrder).toEqual(["child3", "child2", "child1"]);
    });

    it("disposes child scopes after child containers", async () => {
      const lm = new LifecycleManager();
      const disposeOrder: string[] = [];

      const childContainer = {
        dispose: vi.fn().mockImplementation(async () => {
          disposeOrder.push("container");
        }),
        isDisposed: false,
      };
      const scope = {
        dispose: vi.fn().mockImplementation(async () => {
          disposeOrder.push("scope");
        }),
        isDisposed: false,
      };

      lm.registerChildContainer(childContainer);
      lm.registerChildScope(scope);

      const memo = new MemoMap();
      await lm.dispose(memo);

      // Containers disposed before scopes
      expect(disposeOrder.indexOf("container")).toBeLessThan(disposeOrder.indexOf("scope"));
    });

    it("calls parentUnregister when provided", async () => {
      const lm = new LifecycleManager();
      const memo = new MemoMap();
      const unregister = vi.fn();

      await lm.dispose(memo, unregister);
      expect(unregister).toHaveBeenCalledTimes(1);
    });

    it("does not call parentUnregister when undefined", async () => {
      const lm = new LifecycleManager();
      const memo = new MemoMap();
      // Should not throw when parentUnregister is undefined
      await lm.dispose(memo, undefined);
    });

    it("disposes singleton memo", async () => {
      const lm = new LifecycleManager();
      const memo = new MemoMap();
      const disposeSpy = vi.spyOn(memo, "dispose");

      await lm.dispose(memo);
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });

    it("clears child containers and scopes after disposal", async () => {
      const lm = new LifecycleManager();
      const child = createMockDisposable();
      const scope = createMockDisposable();

      lm.registerChildContainer(child);
      lm.registerChildScope(scope);

      const memo = new MemoMap();
      await lm.dispose(memo);

      // After disposal, snapshots should be empty (collections cleared)
      const containerSnapshots = lm.getChildContainerSnapshots(() => true);
      const scopeSnapshots = lm.getChildScopeSnapshots(() => true);
      expect(containerSnapshots).toHaveLength(0);
      expect(scopeSnapshots).toHaveLength(0);
    });
  });

  describe("getChildScopeSnapshots", () => {
    it("returns snapshots for all scopes", () => {
      const lm = new LifecycleManager();
      const scope1 = createMockDisposable();
      const scope2 = createMockDisposable();

      lm.registerChildScope(scope1);
      lm.registerChildScope(scope2);

      const snapshots = lm.getChildScopeSnapshots(s => "snapshot");
      expect(snapshots).toHaveLength(2);
      expect(snapshots).toEqual(["snapshot", "snapshot"]);
    });

    it("skips scopes that throw during snapshot", () => {
      const lm = new LifecycleManager();
      const scope1 = createMockDisposable();
      const scope2 = createMockDisposable();
      const scope3 = createMockDisposable();

      lm.registerChildScope(scope1);
      lm.registerChildScope(scope2);
      lm.registerChildScope(scope3);

      let callCount = 0;
      const snapshots = lm.getChildScopeSnapshots(s => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Disposed");
        }
        return `snap-${callCount}`;
      });

      // 3 scopes, but second one threw, so 2 snapshots
      expect(snapshots).toHaveLength(2);
      expect(snapshots).toEqual(["snap-1", "snap-3"]);
    });
  });

  describe("getChildContainerSnapshots", () => {
    it("returns snapshots for all containers", () => {
      const lm = new LifecycleManager();
      const child1 = createMockDisposable();
      const child2 = createMockDisposable();

      lm.registerChildContainer(child1);
      lm.registerChildContainer(child2);

      const snapshots = lm.getChildContainerSnapshots(c => "snap");
      expect(snapshots).toHaveLength(2);
    });

    it("skips containers that throw during snapshot", () => {
      const lm = new LifecycleManager();
      const child1 = createMockDisposable();
      const child2 = createMockDisposable();

      lm.registerChildContainer(child1);
      lm.registerChildContainer(child2);

      let callCount = 0;
      const snapshots = lm.getChildContainerSnapshots(c => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Disposed");
        }
        return `snap-${callCount}`;
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toBe("snap-2");
    });
  });
});
