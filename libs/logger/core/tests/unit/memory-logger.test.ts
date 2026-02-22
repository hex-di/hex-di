import { describe, it, expect } from "vitest";
import { createMemoryLogger } from "../../src/index.js";

describe("MemoryLogger", () => {
  it("captures log entries at all levels", () => {
    const logger = createMemoryLogger();

    logger.trace("trace msg");
    logger.debug("debug msg");
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");
    logger.fatal("fatal msg");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(6);
    expect(entries[0].level).toBe("trace");
    expect(entries[1].level).toBe("debug");
    expect(entries[2].level).toBe("info");
    expect(entries[3].level).toBe("warn");
    expect(entries[4].level).toBe("error");
    expect(entries[5].level).toBe("fatal");
  });

  it("captures message text", () => {
    const logger = createMemoryLogger();
    logger.info("hello world");

    const entries = logger.getEntries();
    expect(entries[0].message).toBe("hello world");
  });

  it("captures annotations", () => {
    const logger = createMemoryLogger();
    logger.info("msg", { key: "value", num: 42 });

    const entries = logger.getEntries();
    expect(entries[0].annotations).toEqual({ key: "value", num: 42 });
  });

  it("captures errors for error level", () => {
    const logger = createMemoryLogger();
    const err = new Error("test error");
    logger.error("something failed", err);

    const entries = logger.getEntries();
    expect(entries[0].error).toBe(err);
  });

  it("captures errors for fatal level", () => {
    const logger = createMemoryLogger();
    const err = new Error("fatal error");
    logger.fatal("system crash", err, { code: 500 });

    const entries = logger.getEntries();
    expect(entries[0].error).toBe(err);
    expect(entries[0].annotations).toEqual({ code: 500 });
  });

  it("error with annotations but no Error object", () => {
    const logger = createMemoryLogger();
    logger.error("msg", { key: "val" });

    const entries = logger.getEntries();
    expect(entries[0].error).toBeUndefined();
    expect(entries[0].annotations).toEqual({ key: "val" });
  });

  it("respects minimum log level", () => {
    const logger = createMemoryLogger("warn");

    logger.trace("no");
    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");
    logger.fatal("yes");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].level).toBe("warn");
  });

  it("isLevelEnabled reflects minimum level", () => {
    const logger = createMemoryLogger("info");

    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
    expect(logger.isLevelEnabled("info")).toBe(true);
    expect(logger.isLevelEnabled("warn")).toBe(true);
    expect(logger.isLevelEnabled("error")).toBe(true);
    expect(logger.isLevelEnabled("fatal")).toBe(true);
  });

  it("child logger inherits and extends context", () => {
    const logger = createMemoryLogger();
    const child = logger.child({ correlationId: "abc", userId: "user1" });

    child.info("from child");

    const entries = logger.getEntries();
    expect(entries[0].context).toEqual({
      correlationId: "abc",
      userId: "user1",
    });
  });

  it("child logger shares entries with parent", () => {
    const logger = createMemoryLogger();
    const child = logger.child({ service: "test" });

    logger.info("parent msg");
    child.info("child msg");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(2);
  });

  it("withAnnotations merges base annotations", () => {
    const logger = createMemoryLogger();
    const annotated = logger.withAnnotations({ orderId: "123" });

    annotated.info("msg", { extra: true });

    const entries = logger.getEntries();
    expect(entries[0].annotations).toEqual({ orderId: "123", extra: true });
  });

  it("withAnnotations overrides existing keys", () => {
    const logger = createMemoryLogger();
    const a1 = logger.withAnnotations({ key: "first" });
    const a2 = a1.withAnnotations({ key: "second" });

    a2.info("msg");

    const entries = logger.getEntries();
    expect(entries[0].annotations).toEqual({ key: "second" });
  });

  it("getContext returns current context", () => {
    const logger = createMemoryLogger();
    expect(logger.getContext()).toEqual({});

    const child = logger.child({ service: "my-svc" });
    expect(child.getContext()).toEqual({ service: "my-svc" });
  });

  it("getEntriesByLevel filters correctly", () => {
    const logger = createMemoryLogger();
    logger.info("a");
    logger.warn("b");
    logger.info("c");
    logger.error("d");

    const infoEntries = logger.getEntriesByLevel("info");
    expect(infoEntries).toHaveLength(2);
    expect(infoEntries[0].message).toBe("a");
    expect(infoEntries[1].message).toBe("c");
  });

  it("findEntry returns matching entry", () => {
    const logger = createMemoryLogger();
    logger.info("first");
    logger.warn("second");
    logger.error("third");

    const found = logger.findEntry(e => e.level === "warn");
    expect(found).toBeDefined();
    expect(found?.message).toBe("second");
  });

  it("findEntry returns undefined when no match", () => {
    const logger = createMemoryLogger();
    logger.info("msg");

    const found = logger.findEntry(e => e.level === "fatal");
    expect(found).toBeUndefined();
  });

  it("clear removes all entries", () => {
    const logger = createMemoryLogger();
    logger.info("a");
    logger.info("b");
    expect(logger.getEntries()).toHaveLength(2);

    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it("time logs success with duration", () => {
    const logger = createMemoryLogger();
    const result = logger.time("op", () => 42);

    expect(result).toBe(42);

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("op completed");
    expect(entries[0].annotations).toHaveProperty("duration");
  });

  it("time logs error with duration on throw", () => {
    const logger = createMemoryLogger();

    expect(() =>
      logger.time("op", () => {
        throw new Error("boom");
      })
    ).toThrow("boom");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("op failed");
    expect(entries[0].error?.message).toBe("boom");
  });

  it("timeAsync logs success with duration", async () => {
    const logger = createMemoryLogger();
    const result = await logger.timeAsync("async-op", async () => 99);

    expect(result).toBe(99);

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("async-op completed");
  });

  it("timeAsync logs error with duration on rejection", async () => {
    const logger = createMemoryLogger();

    await expect(
      logger.timeAsync("async-op", async () => {
        throw new Error("async boom");
      })
    ).rejects.toThrow("async boom");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("async-op failed");
  });

  it("entries include timestamp", () => {
    const before = Date.now();
    const logger = createMemoryLogger();
    logger.info("timed");
    const after = Date.now();

    const entries = logger.getEntries();
    expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(entries[0].timestamp).toBeLessThanOrEqual(after);
  });
});
