/**
 * Tests for src/container/internal/async-initializer.ts
 * Covers registration, topological ordering, parallel initialization,
 * idempotent init, error handling, and markInitialized.
 */
import { describe, it, expect, vi } from "vitest";
import { AsyncInitializer } from "../src/container/internal/async-initializer.js";
import { AsyncFactoryError } from "../src/errors/index.js";
import { port } from "@hex-di/core";

interface ServiceA {
  a(): void;
}
interface ServiceB {
  b(): void;
}
interface ServiceC {
  c(): void;
}

const PortA = port<ServiceA>()({ name: "ServiceA" });
const PortB = port<ServiceB>()({ name: "ServiceB" });
const PortC = port<ServiceC>()({ name: "ServiceC" });

function createAsyncAdapter(portObj: any, requires: any[] = []) {
  return {
    provides: portObj,
    requires,
    lifetime: "singleton" as const,
    factory: vi.fn(),
    factoryKind: "async" as const,
    freeze: true,
    clonable: false,
  };
}

describe("AsyncInitializer", () => {
  describe("isInitialized", () => {
    it("returns false before initialization", () => {
      const init = new AsyncInitializer();
      expect(init.isInitialized).toBe(false);
    });

    it("returns true after markInitialized", () => {
      const init = new AsyncInitializer();
      init.markInitialized();
      expect(init.isInitialized).toBe(true);
    });

    it("returns true after successful initialize", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      await init.initialize(async () => {});
      expect(init.isInitialized).toBe(true);
    });
  });

  describe("hasAsyncPort", () => {
    it("returns true for registered async port", () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      expect(init.hasAsyncPort(PortA)).toBe(true);
    });

    it("returns false for unregistered port", () => {
      const init = new AsyncInitializer();
      expect(init.hasAsyncPort(PortA)).toBe(false);
    });
  });

  describe("initialize", () => {
    it("resolves all registered async ports", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.registerAdapter(createAsyncAdapter(PortB));
      init.finalizeRegistration();

      const resolved: string[] = [];
      await init.initialize(async port => {
        resolved.push(port.__portName);
      });

      expect(resolved).toContain("ServiceA");
      expect(resolved).toContain("ServiceB");
    });

    it("is idempotent after successful initialization", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      let callCount = 0;
      const resolver = async () => {
        callCount++;
      };

      await init.initialize(resolver);
      expect(callCount).toBe(1);

      await init.initialize(resolver);
      // Should not call resolver again
      expect(callCount).toBe(1);
    });

    it("is no-op when already markInitialized", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();
      init.markInitialized();

      let callCount = 0;
      await init.initialize(async () => {
        callCount++;
      });
      expect(callCount).toBe(0);
    });

    it("initializes in topological order (dependencies first)", async () => {
      const init = new AsyncInitializer();
      // B depends on A, so A should be initialized first
      init.registerAdapter(createAsyncAdapter(PortA));
      init.registerAdapter(createAsyncAdapter(PortB, [PortA]));
      init.finalizeRegistration();

      const order: string[] = [];
      await init.initialize(async port => {
        order.push(port.__portName);
      });

      const aIdx = order.indexOf("ServiceA");
      const bIdx = order.indexOf("ServiceB");
      expect(aIdx).toBeLessThan(bIdx);
    });

    it("initializes independent adapters at the same level in parallel", async () => {
      const init = new AsyncInitializer();
      // A and B are independent - both should be in level 0
      init.registerAdapter(createAsyncAdapter(PortA));
      init.registerAdapter(createAsyncAdapter(PortB));
      init.finalizeRegistration();

      let concurrentCount = 0;
      let maxConcurrent = 0;

      await init.initialize(async port => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(r => setTimeout(r, 10));
        concurrentCount--;
      });

      // Both should start in parallel (max concurrent >= 2)
      expect(maxConcurrent).toBe(2);
    });

    it("handles chain A -> B -> C (3 levels)", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.registerAdapter(createAsyncAdapter(PortB, [PortA]));
      init.registerAdapter(createAsyncAdapter(PortC, [PortB]));
      init.finalizeRegistration();

      const order: string[] = [];
      await init.initialize(async port => {
        order.push(port.__portName);
      });

      expect(order).toEqual(["ServiceA", "ServiceB", "ServiceC"]);
    });

    it("deduplicates concurrent initialize calls", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      let callCount = 0;
      const resolver = async () => {
        callCount++;
        await new Promise(r => setTimeout(r, 10));
      };

      // Start two concurrent calls
      const p1 = init.initialize(resolver);
      const p2 = init.initialize(resolver);

      await Promise.all([p1, p2]);
      expect(callCount).toBe(1);
    });

    it("wraps factory errors in AsyncFactoryError", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      await expect(
        init.initialize(async () => {
          throw new Error("Factory failed");
        })
      ).rejects.toThrow(AsyncFactoryError);
    });

    it("re-throws AsyncFactoryError as-is", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      const origError = new AsyncFactoryError("ServiceA", new Error("already wrapped"));
      await expect(
        init.initialize(async () => {
          throw origError;
        })
      ).rejects.toBe(origError);
    });

    it("handles non-Error thrown values", async () => {
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortA));
      init.finalizeRegistration();

      await expect(
        init.initialize(async () => {
          throw "string error";
        })
      ).rejects.toThrow(AsyncFactoryError);
    });

    it("handles empty adapter list", async () => {
      const init = new AsyncInitializer();
      init.finalizeRegistration();

      // Should complete without error
      await init.initialize(async () => {});
      expect(init.isInitialized).toBe(true);
    });
  });

  describe("finalizeRegistration", () => {
    it("computes empty levels when no adapters", () => {
      const init = new AsyncInitializer();
      init.finalizeRegistration();
      // No way to inspect directly, but initialize should work
    });

    it("ignores sync dependencies in level computation", async () => {
      // B depends on PortA, but PortA is not async (not registered)
      // So B should be at level 0
      const init = new AsyncInitializer();
      init.registerAdapter(createAsyncAdapter(PortB, [PortA]));
      init.finalizeRegistration();

      const order: string[] = [];
      await init.initialize(async port => {
        order.push(port.__portName);
      });

      expect(order).toEqual(["ServiceB"]);
    });
  });
});
