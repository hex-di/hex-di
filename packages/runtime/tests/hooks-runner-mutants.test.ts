/**
 * Mutation-killing tests for src/resolution/hooks-runner.ts
 *
 * Targets survived mutants in:
 * - HooksRunner._createContext: parentPort, depth, containerId, containerKind
 * - HooksRunner.runSync: beforeResolve call, startTime, error capture, finally
 * - HooksRunner.runAsync: beforeResolve call, then/catch/finally
 * - HooksRunner._emitAfterResolve: pop, duration, error
 * - checkCacheHit: singleton/scoped/transient branches
 */
import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import {
  HooksRunner,
  checkCacheHit,
  type ContainerMetadata,
} from "../src/resolution/hooks-runner.js";
import type { ResolutionHooks, ResolutionHookContext } from "../src/resolution/hooks.js";
import { MemoMap } from "../src/util/memo-map.js";

// =============================================================================
// Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

const defaultMetadata: ContainerMetadata = {
  containerId: "root",
  containerKind: "root",
  parentContainerId: null,
};

function makeHooks(
  opts: {
    before?: (ctx: ResolutionHookContext) => void;
    after?: (ctx: ResolutionHookContext) => void;
  } = {}
): ResolutionHooks {
  return {
    beforeResolve: opts.before,
    afterResolve: opts.after,
  };
}

// =============================================================================
// HooksRunner._createContext
// =============================================================================

describe("HooksRunner._createContext (via runSync)", () => {
  it("sets portName from port.__portName", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(contexts[0].portName).toBe("Logger");
  });

  it("sets lifetime from adapter", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "transient" }, null, false, null, () => "result");

    expect(contexts[0].lifetime).toBe("transient");
  });

  it("sets scopeId from parameter", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "scoped" }, "scope-1", false, null, () => "result");

    expect(contexts[0].scopeId).toBe("scope-1");
  });

  it("sets isCacheHit from parameter", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, true, null, () => "result");
    expect(contexts[0].isCacheHit).toBe(true);

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");
    expect(contexts[1].isCacheHit).toBe(false);
  });

  it("parentPort is null for top-level resolution", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(contexts[0].parentPort).toBeNull();
  });

  it("depth is 0 for top-level resolution", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(contexts[0].depth).toBe(0);
  });

  it("depth and parentPort are correct for nested resolutions", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => {
      // Nested resolution
      runner.runSync(DatabasePort, { lifetime: "transient" }, null, false, null, () => "db");
      return "logger";
    });

    // First context (Logger): depth 0, parentPort null
    expect(contexts[0].depth).toBe(0);
    expect(contexts[0].parentPort).toBeNull();

    // Second context (Database): depth 1, parentPort is LoggerPort
    expect(contexts[1].depth).toBe(1);
    expect(contexts[1].parentPort).toBe(LoggerPort);
  });

  it("sets containerId from metadata", () => {
    const contexts: ResolutionHookContext[] = [];
    const meta: ContainerMetadata = {
      containerId: "child-1",
      containerKind: "child",
      parentContainerId: "root",
    };
    const runner = new HooksRunner(makeHooks({ before: ctx => contexts.push(ctx) }), meta);

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(contexts[0].containerId).toBe("child-1");
    expect(contexts[0].containerKind).toBe("child");
    expect(contexts[0].parentContainerId).toBe("root");
  });

  it("sets inheritanceMode from parameter", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, "forked", () => "result");

    expect(contexts[0].inheritanceMode).toBe("forked");
  });

  it("initial duration is 0 and error is null", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push(ctx) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(contexts[0].duration).toBe(0);
    expect(contexts[0].error).toBeNull();
  });
});

// =============================================================================
// HooksRunner.runSync
// =============================================================================

describe("HooksRunner.runSync (mutant killing)", () => {
  it("calls beforeResolve before action", () => {
    const callOrder: string[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: () => callOrder.push("before") }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => {
      callOrder.push("action");
      return "result";
    });

    expect(callOrder).toEqual(["before", "action"]);
  });

  it("calls afterResolve after action", () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "result");

    expect(afterContexts).toHaveLength(1);
    expect(afterContexts[0].duration).toBeGreaterThanOrEqual(0);
    expect(afterContexts[0].error).toBeNull();
  });

  it("afterResolve receives error when action throws", () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    const testError = new Error("test error");
    expect(() => {
      runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => {
        throw testError;
      });
    }).toThrow(testError);

    expect(afterContexts).toHaveLength(1);
    expect(afterContexts[0].error).toBe(testError);
  });

  it("afterResolve wraps non-Error thrown values", () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    expect(() => {
      runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => {
        throw "string error";
      });
    }).toThrow("string error");

    expect(afterContexts[0].error).toBeInstanceOf(Error);
    expect(afterContexts[0].error!.message).toBe("string error");
  });

  it("returns the action result", () => {
    const runner = new HooksRunner(makeHooks(), defaultMetadata);
    const result = runner.runSync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      () => "my-result"
    );
    expect(result).toBe("my-result");
  });

  it("sets context.result on success", () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "my-value");

    expect(afterContexts[0].result).toBe("my-value");
  });

  it("does not call beforeResolve when hook is undefined", () => {
    const runner = new HooksRunner(makeHooks(), defaultMetadata);
    // Should not throw
    const result = runner.runSync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      () => "ok"
    );
    expect(result).toBe("ok");
  });

  it("does not call afterResolve when hook is undefined", () => {
    const runner = new HooksRunner(makeHooks({ before: vi.fn() }), defaultMetadata);
    // Should not throw
    const result = runner.runSync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      () => "ok"
    );
    expect(result).toBe("ok");
  });
});

// =============================================================================
// HooksRunner.runAsync
// =============================================================================

describe("HooksRunner.runAsync (mutant killing)", () => {
  it("calls beforeResolve before async action", async () => {
    const callOrder: string[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: () => callOrder.push("before") }),
      defaultMetadata
    );

    await runner.runAsync(LoggerPort, { lifetime: "singleton" }, null, false, null, async () => {
      callOrder.push("action");
      return "result";
    });

    expect(callOrder).toEqual(["before", "action"]);
  });

  it("calls afterResolve after async action", async () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    await runner.runAsync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      async () => "result"
    );

    expect(afterContexts).toHaveLength(1);
    expect(afterContexts[0].error).toBeNull();
    expect(afterContexts[0].duration).toBeGreaterThanOrEqual(0);
  });

  it("afterResolve receives error when async action rejects", async () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    const testError = new Error("async error");
    await expect(
      runner.runAsync(LoggerPort, { lifetime: "singleton" }, null, false, null, async () => {
        throw testError;
      })
    ).rejects.toThrow(testError);

    expect(afterContexts[0].error).toBe(testError);
  });

  it("wraps non-Error async rejections", async () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    await expect(
      runner.runAsync(LoggerPort, { lifetime: "singleton" }, null, false, null, async () => {
        throw "string rejection";
      })
    ).rejects.toBe("string rejection");

    expect(afterContexts[0].error).toBeInstanceOf(Error);
    expect(afterContexts[0].error!.message).toBe("string rejection");
  });

  it("returns the action result", async () => {
    const runner = new HooksRunner(makeHooks(), defaultMetadata);
    const result = await runner.runAsync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      async () => "async-result"
    );
    expect(result).toBe("async-result");
  });

  it("sets context.result on async success", async () => {
    const afterContexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ after: ctx => afterContexts.push({ ...ctx }) }),
      defaultMetadata
    );

    await runner.runAsync(
      LoggerPort,
      { lifetime: "singleton" },
      null,
      false,
      null,
      async () => "async-value"
    );

    expect(afterContexts[0].result).toBe("async-value");
  });

  it("depth tracking works for async nested resolutions", async () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push({ ...ctx }) }),
      defaultMetadata
    );

    await runner.runAsync(LoggerPort, { lifetime: "singleton" }, null, false, null, async () => {
      await runner.runAsync(
        DatabasePort,
        { lifetime: "transient" },
        null,
        false,
        null,
        async () => "db"
      );
      return "logger";
    });

    expect(contexts[0].depth).toBe(0);
    expect(contexts[1].depth).toBe(1);
    expect(contexts[1].parentPort).toBe(LoggerPort);
  });
});

// =============================================================================
// _emitAfterResolve
// =============================================================================

describe("_emitAfterResolve (via runSync)", () => {
  it("pops parent stack after resolution", () => {
    const contexts: ResolutionHookContext[] = [];
    const runner = new HooksRunner(
      makeHooks({ before: ctx => contexts.push({ ...ctx }) }),
      defaultMetadata
    );

    // First resolution sets depth 0
    runner.runSync(LoggerPort, { lifetime: "singleton" }, null, false, null, () => "a");
    // Second resolution also at depth 0 (stack was popped)
    runner.runSync(DatabasePort, { lifetime: "singleton" }, null, false, null, () => "b");

    expect(contexts[0].depth).toBe(0);
    expect(contexts[1].depth).toBe(0);
    expect(contexts[1].parentPort).toBeNull();
  });
});

// =============================================================================
// checkCacheHit
// =============================================================================

describe("checkCacheHit (mutant killing)", () => {
  it("returns true for singleton when in singletonMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    singletonMemo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(checkCacheHit(LoggerPort, "singleton", singletonMemo, scopedMemo)).toBe(true);
  });

  it("returns false for singleton when not in singletonMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(LoggerPort, "singleton", singletonMemo, scopedMemo)).toBe(false);
  });

  it("returns true for scoped when in scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    scopedMemo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(checkCacheHit(LoggerPort, "scoped", singletonMemo, scopedMemo)).toBe(true);
  });

  it("returns false for scoped when not in scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(LoggerPort, "scoped", singletonMemo, scopedMemo)).toBe(false);
  });

  it("returns false for transient always", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    singletonMemo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(checkCacheHit(LoggerPort, "transient", singletonMemo, scopedMemo)).toBe(false);
  });

  it("returns false for unknown lifetime (default case)", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();

    expect(checkCacheHit(LoggerPort, "unknown" as any, singletonMemo, scopedMemo)).toBe(false);
  });

  it("singleton check uses singletonMemo not scopedMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    // Put in scoped but not singleton
    scopedMemo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(checkCacheHit(LoggerPort, "singleton", singletonMemo, scopedMemo)).toBe(false);
  });

  it("scoped check uses scopedMemo not singletonMemo", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    // Put in singleton but not scoped
    singletonMemo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(checkCacheHit(LoggerPort, "scoped", singletonMemo, scopedMemo)).toBe(false);
  });
});
