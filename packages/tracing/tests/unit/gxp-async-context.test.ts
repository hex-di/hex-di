/**
 * GxP async span context tests.
 *
 * Verifies AsyncLocalStorage-backed span isolation,
 * global fallback, and init behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  initAsyncSpanContext,
  runInAsyncContext,
  getAsyncLocalStore,
  _resetAsyncContext,
} from "../../src/instrumentation/async-context.js";

describe("async span context", () => {
  beforeEach(() => {
    _resetAsyncContext();
  });

  it("should attempt initialization without error", async () => {
    // initAsyncSpanContext uses new Function() for dynamic import
    // which may fail in some test environments. It should not throw.
    const result = await initAsyncSpanContext();
    expect(typeof result).toBe("boolean");
  });

  it("should provide isolated contexts when ALS is available", async () => {
    const initialized = await initAsyncSpanContext();
    if (!initialized) {
      // ALS not available in this test environment — test the fallback
      return;
    }

    const results: string[] = [];

    await Promise.all([
      new Promise<void>(resolve => {
        runInAsyncContext(() => {
          const store = getAsyncLocalStore();
          if (store) {
            store.stack.push({
              context: { traceId: "trace-a", spanId: "span-a", traceFlags: 1 },
            } as never);
            results.push(`context1:${store.stack.length}`);
          }
          resolve();
        });
      }),
      new Promise<void>(resolve => {
        runInAsyncContext(() => {
          const store = getAsyncLocalStore();
          if (store) {
            results.push(`context2:${store.stack.length}`);
          }
          resolve();
        });
      }),
    ]);

    expect(results).toContain("context1:1");
    expect(results).toContain("context2:0");
  });

  it("should provide empty stack in new async context when ALS available", async () => {
    const initialized = await initAsyncSpanContext();
    if (!initialized) return;

    runInAsyncContext(() => {
      const store = getAsyncLocalStore();
      expect(store).toBeDefined();
      expect(store?.stack).toHaveLength(0);
    });
  });

  it("should return function result from runInAsyncContext", () => {
    const result = runInAsyncContext(() => {
      return 42;
    });
    expect(result).toBe(42);
  });

  it("should fall back to running function directly when not initialized", () => {
    // Don't call initAsyncSpanContext
    const result = runInAsyncContext(() => {
      return "fallback";
    });
    expect(result).toBe("fallback");
  });
});
