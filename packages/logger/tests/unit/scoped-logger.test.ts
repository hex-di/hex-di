import { describe, it, expect, vi } from "vitest";
import { createHandlerLogger } from "../../src/index.js";
import type { LogHandler } from "../../src/index.js";
import type { LogEntry } from "../../src/index.js";

function createMockHandler(): LogHandler & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    handle(entry: LogEntry) {
      entries.push(entry);
    },
    flush: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  };
}

describe("HandlerLogger", () => {
  it("delegates to handler.handle()", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    logger.info("hello");

    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].level).toBe("info");
    expect(handler.entries[0].message).toBe("hello");
  });

  it("delegates all log levels to handler", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    logger.trace("t");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    logger.fatal("f");

    expect(handler.entries).toHaveLength(6);
    expect(handler.entries[0].level).toBe("trace");
    expect(handler.entries[1].level).toBe("debug");
    expect(handler.entries[2].level).toBe("info");
    expect(handler.entries[3].level).toBe("warn");
    expect(handler.entries[4].level).toBe("error");
    expect(handler.entries[5].level).toBe("fatal");
  });

  it("respects min level", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, { level: "warn" });

    logger.trace("no");
    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");
    logger.fatal("yes");

    expect(handler.entries).toHaveLength(3);
    expect(handler.entries[0].level).toBe("warn");
    expect(handler.entries[1].level).toBe("error");
    expect(handler.entries[2].level).toBe("fatal");
  });

  it("isLevelEnabled reflects minimum level", () => {
    const logger = createHandlerLogger(createMockHandler(), { level: "info" });

    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
    expect(logger.isLevelEnabled("info")).toBe(true);
    expect(logger.isLevelEnabled("warn")).toBe(true);
    expect(logger.isLevelEnabled("error")).toBe(true);
    expect(logger.isLevelEnabled("fatal")).toBe(true);
  });

  it("child creates child with merged context", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, {
      context: { service: "api" },
    });
    const child = logger.child({ correlationId: "abc", userId: "user1" });

    child.info("from child");

    expect(handler.entries[0].context).toEqual({
      service: "api",
      correlationId: "abc",
      userId: "user1",
    });
  });

  it("child inherits min level from parent", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, { level: "error" });
    const child = logger.child({ service: "child-svc" });

    child.debug("should be filtered");
    child.error("should pass");

    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].level).toBe("error");
  });

  it("withAnnotations persists annotations", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const annotated = logger.withAnnotations({ orderId: "123" });

    annotated.info("msg", { extra: true });

    expect(handler.entries[0].annotations).toEqual({ orderId: "123", extra: true });
  });

  it("withAnnotations overrides existing keys", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const a1 = logger.withAnnotations({ key: "first" });
    const a2 = a1.withAnnotations({ key: "second" });

    a2.info("msg");

    expect(handler.entries[0].annotations).toEqual({ key: "second" });
  });

  it("passes annotations in log entries", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    logger.info("msg", { key: "value", num: 42 });

    expect(handler.entries[0].annotations).toEqual({ key: "value", num: 42 });
  });

  it("captures error for error level", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const err = new Error("test error");

    logger.error("something failed", err);

    expect(handler.entries[0].error).toBe(err);
  });

  it("captures error for fatal level with annotations", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const err = new Error("fatal error");

    logger.fatal("system crash", err, { code: 500 });

    expect(handler.entries[0].error).toBe(err);
    expect(handler.entries[0].annotations).toEqual({ code: 500 });
  });

  it("error with annotations but no Error object", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    logger.error("msg", { key: "val" });

    expect(handler.entries[0].error).toBeUndefined();
    expect(handler.entries[0].annotations).toEqual({ key: "val" });
  });

  it("getContext returns current context", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, {
      context: { service: "my-svc" },
    });

    expect(logger.getContext()).toEqual({ service: "my-svc" });
  });

  it("getContext returns empty context by default", () => {
    const logger = createHandlerLogger(createMockHandler());
    expect(logger.getContext()).toEqual({});
  });

  it("time logs success with duration", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const result = logger.time("op", () => 42);

    expect(result).toBe(42);
    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].message).toBe("op completed");
    expect(handler.entries[0].annotations).toHaveProperty("duration");
  });

  it("time logs error with duration on throw", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    expect(() =>
      logger.time("op", () => {
        throw new Error("boom");
      })
    ).toThrow("boom");

    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].level).toBe("error");
    expect(handler.entries[0].message).toBe("op failed");
    expect(handler.entries[0].error?.message).toBe("boom");
  });

  it("timeAsync logs success with duration", async () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const result = await logger.timeAsync("async-op", async () => 99);

    expect(result).toBe(99);
    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].message).toBe("async-op completed");
  });

  it("timeAsync logs error with duration on rejection", async () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);

    await expect(
      logger.timeAsync("async-op", async () => {
        throw new Error("async boom");
      })
    ).rejects.toThrow("async boom");

    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0].level).toBe("error");
    expect(handler.entries[0].message).toBe("async-op failed");
  });

  it("entries include timestamp", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler);
    const before = Date.now();
    logger.info("timed");
    const after = Date.now();

    expect(handler.entries[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(handler.entries[0].timestamp).toBeLessThanOrEqual(after);
  });

  it("accepts initial annotations via options", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, {
      annotations: { requestId: "req-1" },
    });

    logger.info("msg");

    expect(handler.entries[0].annotations).toEqual({ requestId: "req-1" });
  });

  it("initial annotations merge with per-call annotations", () => {
    const handler = createMockHandler();
    const logger = createHandlerLogger(handler, {
      annotations: { requestId: "req-1" },
    });

    logger.info("msg", { extra: "data" });

    expect(handler.entries[0].annotations).toEqual({
      requestId: "req-1",
      extra: "data",
    });
  });
});
