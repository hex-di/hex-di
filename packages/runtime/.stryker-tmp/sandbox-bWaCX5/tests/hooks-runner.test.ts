/**
 * Tests for src/resolution/hooks-runner.ts
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { HooksRunner, checkCacheHit } from "../src/resolution/hooks-runner.js";
import { MemoMap } from "../src/util/memo-map.js";
import { port } from "@hex-di/core";

// Test ports
const PortA = port<string>()({ name: "PortA" });
const PortB = port<number>()({ name: "PortB" });

describe("HooksRunner", () => {
  const containerMetadata = {
    containerId: "root",
    containerKind: "root" as const,
    parentContainerId: null,
  };

  describe("runSync", () => {
    it("calls beforeResolve hook before action", () => {
      const callOrder: string[] = [];
      const hooks = {
        beforeResolve: vi.fn(() => callOrder.push("before")),
        afterResolve: vi.fn(() => callOrder.push("after")),
      };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => {
        callOrder.push("action");
        return "result";
      });

      expect(callOrder).toEqual(["before", "action", "after"]);
    });

    it("returns the action result", () => {
      const hooks = {};
      const runner = new HooksRunner(hooks, containerMetadata);

      const result = runner.runSync(
        PortA,
        { lifetime: "singleton" },
        null,
        false,
        null,
        () => "value"
      );
      expect(result).toBe("value");
    });

    it("calls afterResolve even when action throws", () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      expect(() =>
        runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => {
          throw new Error("action error");
        })
      ).toThrow("action error");

      expect(afterResolve).toHaveBeenCalledOnce();
      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe("action error");
    });

    it("re-throws the original error from action", () => {
      const hooks = { afterResolve: vi.fn() };
      const runner = new HooksRunner(hooks, containerMetadata);
      const err = new Error("original");

      expect(() =>
        runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => {
          throw err;
        })
      ).toThrow(err);
    });

    it("provides correct context to beforeResolve", () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(PortA, { lifetime: "singleton" }, "scope-1", true, "shared", () => "v");

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.port).toBe(PortA);
      expect(ctx.portName).toBe("PortA");
      expect(ctx.lifetime).toBe("singleton");
      expect(ctx.scopeId).toBe("scope-1");
      expect(ctx.isCacheHit).toBe(true);
      expect(ctx.containerId).toBe("root");
      expect(ctx.containerKind).toBe("root");
      expect(ctx.inheritanceMode).toBe("shared");
      expect(ctx.parentContainerId).toBeNull();
      expect(ctx.depth).toBe(0);
      expect(ctx.duration).toBe(0);
      expect(ctx.error).toBeNull();
    });

    it("tracks depth correctly for nested resolutions", () => {
      const contexts: any[] = [];
      const hooks = {
        beforeResolve: vi.fn((ctx: any) => contexts.push({ ...ctx })),
        afterResolve: vi.fn(),
      };
      const runner = new HooksRunner(hooks, containerMetadata);

      // Simulate nested resolution
      runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => {
        // Inside PortA's factory, resolve PortB
        return runner.runSync(PortB, { lifetime: "transient" }, null, false, null, () => 42);
      });

      expect(contexts).toHaveLength(2);
      expect(contexts[0].depth).toBe(0);
      expect(contexts[0].parentPort).toBeNull();
      expect(contexts[1].depth).toBe(1);
      expect(contexts[1].parentPort).toBe(PortA);
    });

    it("sets result on context after successful action", () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => "success");

      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.result).toBe("success");
      expect(ctx.error).toBeNull();
    });

    it("does not call hooks when they are undefined", () => {
      const hooks = {};
      const runner = new HooksRunner(hooks, containerMetadata);
      const result = runner.runSync(
        PortA,
        { lifetime: "singleton" },
        null,
        false,
        null,
        () => "ok"
      );
      expect(result).toBe("ok");
    });

    it("wraps non-Error thrown values in Error objects", () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      expect(() =>
        runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => {
          throw "string error";
        })
      ).toThrow("string error");

      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe("string error");
    });

    it("includes scopeName in context when provided", () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(
        PortA,
        { lifetime: "scoped" },
        "user-scope",
        false,
        null,
        () => "v",
        "user-scope"
      );

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.scopeId).toBe("user-scope");
      expect(ctx.scopeName).toBe("user-scope");
    });

    it("has undefined scopeName when not provided (auto-generated scope)", () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(PortA, { lifetime: "scoped" }, "scope-0", false, null, () => "v");

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.scopeId).toBe("scope-0");
      expect(ctx.scopeName).toBeUndefined();
    });

    it("has undefined scopeName for container-level resolution", () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      runner.runSync(PortA, { lifetime: "singleton" }, null, false, null, () => "v");

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.scopeId).toBeNull();
      expect(ctx.scopeName).toBeUndefined();
    });
  });

  describe("runAsync", () => {
    it("calls beforeResolve hook before action", async () => {
      const callOrder: string[] = [];
      const hooks = {
        beforeResolve: vi.fn(() => callOrder.push("before")),
        afterResolve: vi.fn(() => callOrder.push("after")),
      };
      const runner = new HooksRunner(hooks, containerMetadata);

      await runner.runAsync(PortA, { lifetime: "singleton" }, null, false, null, async () => {
        callOrder.push("action");
        return "result";
      });

      expect(callOrder).toEqual(["before", "action", "after"]);
    });

    it("returns the action result", async () => {
      const hooks = {};
      const runner = new HooksRunner(hooks, containerMetadata);

      const result = await runner.runAsync(
        PortA,
        { lifetime: "singleton" },
        null,
        false,
        null,
        async () => "value"
      );
      expect(result).toBe("value");
    });

    it("calls afterResolve even when async action rejects", async () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      await expect(
        runner.runAsync(PortA, { lifetime: "singleton" }, null, false, null, async () => {
          throw new Error("async error");
        })
      ).rejects.toThrow("async error");

      expect(afterResolve).toHaveBeenCalledOnce();
      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe("async error");
    });

    it("wraps non-Error async rejections", async () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      await expect(
        runner.runAsync(PortA, { lifetime: "singleton" }, null, false, null, async () => {
          throw "string rejection";
        })
      ).rejects.toBe("string rejection");

      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe("string rejection");
    });

    it("sets result on context after successful async action", async () => {
      const afterResolve = vi.fn();
      const hooks = { afterResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      await runner.runAsync(
        PortA,
        { lifetime: "singleton" },
        null,
        false,
        null,
        async () => "async-success"
      );

      const ctx = afterResolve.mock.calls[0][0];
      expect(ctx.result).toBe("async-success");
      expect(ctx.error).toBeNull();
    });

    it("includes scopeName in async context when provided", async () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      await runner.runAsync(
        PortA,
        { lifetime: "scoped" },
        "user-scope",
        false,
        null,
        async () => "v",
        "user-scope"
      );

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.scopeId).toBe("user-scope");
      expect(ctx.scopeName).toBe("user-scope");
    });

    it("has undefined scopeName in async context when not provided", async () => {
      const beforeResolve = vi.fn();
      const hooks = { beforeResolve };
      const runner = new HooksRunner(hooks, containerMetadata);

      await runner.runAsync(PortA, { lifetime: "scoped" }, "scope-0", false, null, async () => "v");

      const ctx = beforeResolve.mock.calls[0][0];
      expect(ctx.scopeId).toBe("scope-0");
      expect(ctx.scopeName).toBeUndefined();
    });
  });
});

describe("checkCacheHit", () => {
  it("returns true for singleton when port is in singletonMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    singletonMemo.getOrElseMemoize(PortA, () => "cached", undefined);

    expect(checkCacheHit(PortA, "singleton", singletonMemo, scopedMemo)).toBe(true);
  });

  it("returns false for singleton when port is not in singletonMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(PortA, "singleton", singletonMemo, scopedMemo)).toBe(false);
  });

  it("returns true for scoped when port is in scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    scopedMemo.getOrElseMemoize(PortA, () => "scoped", undefined);

    expect(checkCacheHit(PortA, "scoped", singletonMemo, scopedMemo)).toBe(true);
  });

  it("returns false for scoped when port is not in scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(PortA, "scoped", singletonMemo, scopedMemo)).toBe(false);
  });

  it("always returns false for transient lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    singletonMemo.getOrElseMemoize(PortA, () => "cached", undefined);
    scopedMemo.getOrElseMemoize(PortA, () => "cached", undefined);

    expect(checkCacheHit(PortA, "transient", singletonMemo, scopedMemo)).toBe(false);
  });

  it("returns false for unknown lifetime (default case)", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(PortA, "unknown" as any, singletonMemo, scopedMemo)).toBe(false);
  });
});
