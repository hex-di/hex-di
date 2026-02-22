import { describe, it, expect } from "vitest";
import { createMemoryLogger } from "../../src/adapters/memory/logger.js";
import type { MemoryLogger } from "../../src/adapters/memory/logger.js";
import { instrumentContainer } from "../../src/instrumentation/container.js";
import { createLoggingHook } from "../../src/instrumentation/hook.js";

/**
 * Creates a minimal mock container that supports resolution hooks.
 */
function createMockContainer() {
  const resolveHooks: Array<(portName: string, instance: unknown) => void> = [];
  const errorHooks: Array<(portName: string, error: Error) => void> = [];
  const scopeCreateHooks: Array<(scopeId: string) => void> = [];
  const scopeDisposeHooks: Array<(scopeId: string, resolvedCount: number) => void> = [];

  const registry = new Map<string, () => unknown>();

  return {
    register(portName: string, factory: () => unknown): void {
      registry.set(portName, factory);
    },

    resolve(port: unknown): unknown {
      const portName = typeof port === "string" ? port : "unknown";
      const factory = registry.get(portName);
      if (!factory) {
        const error = new Error(`No adapter registered for port: ${portName}`);
        for (const hook of errorHooks) {
          hook(portName, error);
        }
        throw error;
      }
      const instance = factory();
      for (const hook of resolveHooks) {
        hook(portName, instance);
      }
      return instance;
    },

    onResolve(hook: (portName: string, instance: unknown) => void): () => void {
      resolveHooks.push(hook);
      return () => {
        const idx = resolveHooks.indexOf(hook);
        if (idx >= 0) resolveHooks.splice(idx, 1);
      };
    },

    onResolveError(hook: (portName: string, error: Error) => void): () => void {
      errorHooks.push(hook);
      return () => {
        const idx = errorHooks.indexOf(hook);
        if (idx >= 0) errorHooks.splice(idx, 1);
      };
    },

    onScopeCreate(hook: (scopeId: string) => void): () => void {
      scopeCreateHooks.push(hook);
      return () => {
        const idx = scopeCreateHooks.indexOf(hook);
        if (idx >= 0) scopeCreateHooks.splice(idx, 1);
      };
    },

    onScopeDispose(hook: (scopeId: string, resolvedCount: number) => void): () => void {
      scopeDisposeHooks.push(hook);
      return () => {
        const idx = scopeDisposeHooks.indexOf(hook);
        if (idx >= 0) scopeDisposeHooks.splice(idx, 1);
      };
    },

    simulateScopeCreate(scopeId: string): void {
      for (const hook of scopeCreateHooks) {
        hook(scopeId);
      }
    },

    simulateScopeDispose(scopeId: string, resolvedCount: number): void {
      for (const hook of scopeDisposeHooks) {
        hook(scopeId, resolvedCount);
      }
    },
  };
}

describe("instrumentation", () => {
  let logger: MemoryLogger;

  function freshLogger(): MemoryLogger {
    logger = createMemoryLogger();
    return logger;
  }

  it("instrumentContainer logs resolution events", () => {
    const log = freshLogger();
    const container = createMockContainer();
    container.register("UserService", () => ({ name: "UserService" }));

    instrumentContainer(container, log);

    container.resolve("UserService");

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("debug");
    expect(entries[0].message).toBe("Resolved port: UserService");
    expect(entries[0].annotations).toEqual({ port: "UserService" });
  });

  it("instrumentContainer logs errors on failed resolutions", () => {
    const log = freshLogger();
    const container = createMockContainer();

    instrumentContainer(container, log);

    expect(() => container.resolve("MissingPort")).toThrow();

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("Failed to resolve port: MissingPort");
    expect(entries[0].error).toBeInstanceOf(Error);
    expect(entries[0].annotations).toEqual({ port: "MissingPort" });
  });

  it("instrumentContainer respects portFilter", () => {
    const log = freshLogger();
    const container = createMockContainer();
    container.register("UserService", () => ({}));
    container.register("InternalService", () => ({}));

    instrumentContainer(container, log, {
      portFilter: name => name !== "InternalService",
    });

    container.resolve("UserService");
    container.resolve("InternalService");

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("Resolved port: UserService");
  });

  it("instrumentContainer includes timing when enabled", () => {
    const log = freshLogger();
    const container = createMockContainer();
    container.register("SlowService", () => ({}));

    instrumentContainer(container, log, { includeTiming: true });

    container.resolve("SlowService");

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toHaveProperty("port", "SlowService");
    expect(entries[0].annotations).toHaveProperty("durationMs");
    expect(typeof entries[0].annotations.durationMs).toBe("number");
  });

  it("instrumentContainer respects minDurationMs threshold", () => {
    const log = freshLogger();
    const container = createMockContainer();
    container.register("FastService", () => ({}));

    instrumentContainer(container, log, {
      includeTiming: true,
      minDurationMs: 1000,
    });

    // Resolution is near-instant, so it should be filtered out
    container.resolve("FastService");

    const entries = log.getEntries();
    expect(entries).toHaveLength(0);
  });

  it("instrumentContainer cleanup function removes hooks", () => {
    const log = freshLogger();
    const container = createMockContainer();
    container.register("ServiceA", () => ({}));

    const cleanup = instrumentContainer(container, log);

    container.resolve("ServiceA");
    expect(log.getEntries()).toHaveLength(1);

    log.clear();
    cleanup();

    container.resolve("ServiceA");
    expect(log.getEntries()).toHaveLength(0);
  });

  it("instrumentContainer does not cause infinite loops with Logger resolution", () => {
    const log = freshLogger();
    const container = createMockContainer();
    // Default portFilter skips "Logger" and "LogHandler"
    container.register("Logger", () => log);
    container.register("LogHandler", () => ({}));
    container.register("UserService", () => ({}));

    instrumentContainer(container, log);

    container.resolve("Logger");
    container.resolve("LogHandler");
    container.resolve("UserService");

    const entries = log.getEntries();
    // Only UserService should be logged, Logger and LogHandler are filtered
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("Resolved port: UserService");
  });

  it("scope lifecycle logging: logs scope creation when enabled", () => {
    const log = freshLogger();
    const container = createMockContainer();

    instrumentContainer(container, log, { logScopeLifecycle: true });

    container.simulateScopeCreate("scope-123");

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("debug");
    expect(entries[0].message).toBe("Scope created: scope-123");
    expect(entries[0].annotations).toEqual({ scopeId: "scope-123" });
  });

  it("scope lifecycle logging: logs scope disposal with resolvedCount", () => {
    const log = freshLogger();
    const container = createMockContainer();

    instrumentContainer(container, log, { logScopeLifecycle: true });

    container.simulateScopeDispose("scope-456", 7);

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("debug");
    expect(entries[0].message).toBe("Scope disposed: scope-456");
    expect(entries[0].annotations).toEqual({ scopeId: "scope-456", resolvedCount: 7 });
  });

  it("createLoggingHook produces compatible hook", () => {
    const log = freshLogger();
    const hook = createLoggingHook(log, { resolutionLevel: "info" });

    expect(hook.beforeResolve).toBeDefined();
    expect(hook.afterResolve).toBeDefined();
    expect(hook.onError).toBeDefined();

    // Use the hook directly
    hook.beforeResolve?.("TestPort");
    hook.afterResolve?.("TestPort", { value: 1 });

    const entries = log.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("info");
    expect(entries[0].message).toBe("Resolved port: TestPort");

    log.clear();

    const testError = new Error("hook error");
    hook.onError?.("FailPort", testError);

    const errorEntries = log.getEntries();
    expect(errorEntries).toHaveLength(1);
    expect(errorEntries[0].level).toBe("error");
    expect(errorEntries[0].message).toBe("Failed to resolve port: FailPort");
    expect(errorEntries[0].error).toBe(testError);
  });
});
