import { describe, it, expect, vi } from "vitest";
import {
  NoOpLoggerAdapter,
  NOOP_LOGGER,
  MemoryLoggerAdapter,
  createMemoryLogger,
  ConsoleLoggerAdapter,
  createConsoleLogger,
  LoggerPort,
} from "../src/index.js";
import { getConsole } from "../src/utils/globals.js";

// =============================================================================
// NoOp Adapter (10 tests)
// =============================================================================

describe("NoOp Logger", () => {
  it("trace() does not throw", () => {
    expect(() => NOOP_LOGGER.trace("msg")).not.toThrow();
  });

  it("info() does not throw", () => {
    expect(() => NOOP_LOGGER.info("msg")).not.toThrow();
  });

  it("error() does not throw", () => {
    expect(() => NOOP_LOGGER.error("msg", new Error("e"))).not.toThrow();
  });

  it("child() returns same NOOP_LOGGER", () => {
    expect(NOOP_LOGGER.child({ correlationId: "abc" })).toBe(NOOP_LOGGER);
  });

  it("withAnnotations() returns same NOOP_LOGGER", () => {
    expect(NOOP_LOGGER.withAnnotations({ key: "val" })).toBe(NOOP_LOGGER);
  });

  it("isLevelEnabled() always returns false", () => {
    expect(NOOP_LOGGER.isLevelEnabled("trace")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("debug")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("info")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("warn")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("error")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("fatal")).toBe(false);
  });

  it("getContext() returns frozen empty object", () => {
    const ctx = NOOP_LOGGER.getContext();
    expect(ctx).toEqual({});
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it("time() executes and returns result", () => {
    const result = NOOP_LOGGER.time("op", () => 42);
    expect(result).toBe(42);
  });

  it("timeAsync() executes and returns result", async () => {
    const result = await NOOP_LOGGER.timeAsync("op", async () => "hello");
    expect(result).toBe("hello");
  });

  it("NOOP_LOGGER is frozen", () => {
    expect(Object.isFrozen(NOOP_LOGGER)).toBe(true);
  });
});

// =============================================================================
// Memory Adapter (15 tests)
// =============================================================================

describe("Memory Logger", () => {
  it("logs at trace level", () => {
    const logger = createMemoryLogger();
    logger.trace("trace msg");
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("trace");
    expect(entries[0].message).toBe("trace msg");
  });

  it("logs at info level", () => {
    const logger = createMemoryLogger();
    logger.info("info msg");
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("info");
  });

  it("logs at error level", () => {
    const logger = createMemoryLogger();
    logger.error("err msg");
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
  });

  it("getEntries() returns all entries", () => {
    const logger = createMemoryLogger();
    logger.trace("one");
    logger.info("two");
    logger.error("three");
    expect(logger.getEntries()).toHaveLength(3);
  });

  it("getEntriesByLevel() filters by level", () => {
    const logger = createMemoryLogger();
    logger.trace("a");
    logger.info("b");
    logger.info("c");
    logger.error("d");
    expect(logger.getEntriesByLevel("info")).toHaveLength(2);
  });

  it("clear() removes all entries", () => {
    const logger = createMemoryLogger();
    logger.info("one");
    logger.info("two");
    expect(logger.getEntries()).toHaveLength(2);
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it("findEntry() returns matching entry", () => {
    const logger = createMemoryLogger();
    logger.info("target", { code: 42 });
    logger.info("other");
    const found = logger.findEntry(e => e.annotations.code === 42);
    expect(found).toBeDefined();
    expect(found?.message).toBe("target");
  });

  it("findEntry() returns undefined when no match", () => {
    const logger = createMemoryLogger();
    logger.info("msg");
    const found = logger.findEntry(e => e.level === "error");
    expect(found).toBeUndefined();
  });

  it("child shares entries with parent", () => {
    const parent = createMemoryLogger();
    const child = parent.child({ service: "child-svc" });
    child.info("from child");

    expect(parent.getEntries()).toHaveLength(1);
    expect(parent.getEntries()[0].message).toBe("from child");
  });

  it("child includes merged context", () => {
    const parent = createMemoryLogger();
    const child = parent.child({ correlationId: "cid-1" });
    child.info("test");

    const entry = parent.getEntries()[0];
    expect(entry.context).toEqual({ correlationId: "cid-1" });
  });

  it("withAnnotations() persists annotations across log calls", () => {
    const logger = createMemoryLogger();
    const annotated = logger.withAnnotations({ env: "test" });
    annotated.info("first");
    annotated.info("second");

    const entries = logger.getEntries();
    expect(entries[0].annotations).toMatchObject({ env: "test" });
    expect(entries[1].annotations).toMatchObject({ env: "test" });
  });

  it("suppressed levels are not collected", () => {
    const logger = createMemoryLogger("warn");
    logger.trace("no");
    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");
    expect(logger.getEntries()).toHaveLength(2);
  });

  it("time() logs completion with duration", () => {
    const logger = createMemoryLogger();
    logger.time("myOp", () => "done");
    const entry = logger.getEntries()[0];
    expect(entry.level).toBe("debug");
    expect(entry.message).toBe("myOp completed");
    expect(typeof entry.annotations.duration).toBe("number");
  });

  it("time() logs error with duration", () => {
    const logger = createMemoryLogger();
    try {
      logger.time("myOp", () => {
        throw new Error("fail");
      });
    } catch {
      // expected
    }
    const entry = logger.getEntries()[0];
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("myOp failed");
    expect(typeof entry.annotations.duration).toBe("number");
  });

  it("entries have timestamps > 0", () => {
    const logger = createMemoryLogger();
    logger.info("test");
    expect(logger.getEntries()[0].timestamp).toBeGreaterThan(0);
  });
});

// =============================================================================
// Console Adapter (5 tests)
// =============================================================================

describe("Console Logger", () => {
  it("doesn't throw on any level", () => {
    const logger = createConsoleLogger({ level: "trace" });
    expect(() => {
      logger.trace("t");
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      logger.fatal("f");
    }).not.toThrow();
  });

  it("child() returns a new Logger", () => {
    const logger = createConsoleLogger();
    const child = logger.child({ service: "test" });
    expect(child).not.toBe(logger);
  });

  it("isLevelEnabled() respects level", () => {
    const logger = createConsoleLogger({ level: "warn" });
    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
    expect(logger.isLevelEnabled("info")).toBe(false);
    expect(logger.isLevelEnabled("warn")).toBe(true);
    expect(logger.isLevelEnabled("error")).toBe(true);
  });

  it("suppressed levels are not output", () => {
    const cons = getConsole();
    const spy = cons ? vi.spyOn(cons, "debug").mockImplementation(() => {}) : undefined;
    const logger = createConsoleLogger({ level: "error" });
    logger.trace("suppressed");
    logger.debug("suppressed");
    logger.info("suppressed");
    if (spy) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });

  it("default formatter is pretty", () => {
    const cons = getConsole();
    const spy = cons ? vi.spyOn(cons, "info").mockImplementation(() => {}) : undefined;
    const logger = createConsoleLogger({ level: "info" });
    logger.info("hello");
    if (spy) {
      expect(spy).toHaveBeenCalledTimes(1);
      // Pretty formatter includes ISO timestamp and level label
      const output = spy.mock.calls[0][0];
      expect(output).toContain("[");
      expect(output).toContain("INFO");
      expect(output).toContain("hello");
      spy.mockRestore();
    }
  });
});

// =============================================================================
// Adapter Metadata (3 tests)
// =============================================================================

describe("Adapter metadata", () => {
  it("NoOpLoggerAdapter.provides is LoggerPort", () => {
    expect(NoOpLoggerAdapter.provides).toBe(LoggerPort);
  });

  it('MemoryLoggerAdapter.lifetime is "transient"', () => {
    expect(MemoryLoggerAdapter.lifetime).toBe("transient");
  });

  it('ConsoleLoggerAdapter.lifetime is "singleton"', () => {
    expect(ConsoleLoggerAdapter.lifetime).toBe("singleton");
  });
});
