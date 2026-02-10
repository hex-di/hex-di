import { describe, it, expect } from "vitest";
import { LoggerPort, createMemoryLogger } from "../src/index.js";
import { getPortDirection, getPortMetadata } from "@hex-di/core";
import type { MemoryLogger } from "../src/index.js";

describe("LoggerPort metadata", () => {
  it('LoggerPort.name is "Logger"', () => {
    expect(LoggerPort.__portName).toBe("Logger");
  });

  it('LoggerPort.direction is "outbound"', () => {
    expect(getPortDirection(LoggerPort)).toBe("outbound");
  });

  it('LoggerPort.category is "infrastructure"', () => {
    const metadata = getPortMetadata(LoggerPort);
    expect(metadata?.category).toBe("infrastructure");
  });

  it('LoggerPort.tags includes "logging" and "observability"', () => {
    const metadata = getPortMetadata(LoggerPort);
    expect(metadata?.tags).toContain("logging");
    expect(metadata?.tags).toContain("observability");
  });
});

describe("Logger via MemoryLogger", () => {
  function createLogger(
    minLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal" = "trace"
  ): MemoryLogger {
    return createMemoryLogger(minLevel);
  }

  it("child() returns a new Logger with merged context", () => {
    const parent = createLogger();
    const child = parent.child({ correlationId: "abc" });

    child.info("test");
    const entries = parent.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].context).toEqual({ correlationId: "abc" });
  });

  it("child() does not modify parent context", () => {
    const parent = createLogger();
    parent.child({ correlationId: "abc" });

    parent.info("parent message");
    const entries = parent.getEntries();
    expect(entries[0].context).toEqual({});
  });

  it("withAnnotations() returns Logger with persistent annotations", () => {
    const logger = createLogger();
    const annotated = logger.withAnnotations({ service: "api" });

    annotated.info("test");
    const entries = logger.getEntries();
    expect(entries[0].annotations).toEqual({ service: "api" });
  });

  it("withAnnotations() merges with existing annotations", () => {
    const logger = createLogger();
    const first = logger.withAnnotations({ a: 1 });
    const second = first.withAnnotations({ b: 2 });

    second.info("test");
    const entries = logger.getEntries();
    expect(entries[0].annotations).toEqual({ a: 1, b: 2 });
  });

  it("isLevelEnabled() returns true for enabled levels", () => {
    const logger = createLogger("info");
    expect(logger.isLevelEnabled("info")).toBe(true);
    expect(logger.isLevelEnabled("warn")).toBe(true);
    expect(logger.isLevelEnabled("error")).toBe(true);
    expect(logger.isLevelEnabled("fatal")).toBe(true);
  });

  it("isLevelEnabled() returns false for disabled levels", () => {
    const logger = createLogger("info");
    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
  });

  it("getContext() returns the current merged context", () => {
    const logger = createLogger();
    const child = logger.child({ correlationId: "123", service: "test" });
    expect(child.getContext()).toEqual({ correlationId: "123", service: "test" });
  });

  it("time() executes the function and returns result", () => {
    const logger = createLogger();
    const result = logger.time("op", () => 42);
    expect(result).toBe(42);
  });

  it("time() logs at debug level on success with duration", () => {
    const logger = createLogger();
    logger.time("op", () => "ok");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("debug");
    expect(entries[0].message).toBe("op completed");
    expect(entries[0].annotations).toHaveProperty("duration");
    expect(typeof entries[0].annotations.duration).toBe("number");
  });

  it("time() logs at error level on failure with duration", () => {
    const logger = createLogger();
    try {
      logger.time("op", () => {
        throw new Error("fail");
      });
    } catch {
      // expected
    }

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("op failed");
    expect(entries[0].annotations).toHaveProperty("duration");
  });

  it("time() re-throws the error from the function", () => {
    const logger = createLogger();
    const err = new Error("boom");
    expect(() =>
      logger.time("op", () => {
        throw err;
      })
    ).toThrow(err);
  });

  it("timeAsync() executes async function and returns result", async () => {
    const logger = createLogger();
    const result = await logger.timeAsync("op", async () => 99);
    expect(result).toBe(99);
  });

  it("timeAsync() logs at debug level on success with duration", async () => {
    const logger = createLogger();
    await logger.timeAsync("op", async () => "done");

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("debug");
    expect(entries[0].message).toBe("op completed");
    expect(entries[0].annotations).toHaveProperty("duration");
  });

  it("timeAsync() logs at error level on failure with duration", async () => {
    const logger = createLogger();
    try {
      await logger.timeAsync("op", async () => {
        throw new Error("async fail");
      });
    } catch {
      // expected
    }

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("op failed");
    expect(entries[0].annotations).toHaveProperty("duration");
  });

  it("timeAsync() re-throws the error from the async function", async () => {
    const logger = createLogger();
    const err = new Error("async boom");
    await expect(
      logger.timeAsync("op", async () => {
        throw err;
      })
    ).rejects.toThrow(err);
  });

  it("error() with Error object stores error in LogEntry.error", () => {
    const logger = createLogger();
    const err = new Error("something broke");
    logger.error("failure", err);

    const entries = logger.getEntries();
    expect(entries[0].error).toBe(err);
  });

  it("error() without Error object has undefined LogEntry.error", () => {
    const logger = createLogger();
    logger.error("just a message");

    const entries = logger.getEntries();
    expect(entries[0].error).toBeUndefined();
  });

  it("fatal() with Error object stores error in LogEntry.error", () => {
    const logger = createLogger();
    const err = new Error("fatal error");
    logger.fatal("crash", err);

    const entries = logger.getEntries();
    expect(entries[0].error).toBe(err);
  });

  it("fatal() with Error and annotations stores both correctly", () => {
    const logger = createLogger();
    const err = new Error("fatal");
    logger.fatal("crash", err, { code: 500 });

    const entries = logger.getEntries();
    expect(entries[0].error).toBe(err);
    expect(entries[0].annotations).toMatchObject({ code: 500 });
  });

  it("Annotations from call site override base annotations on key collision", () => {
    const logger = createLogger();
    const annotated = logger.withAnnotations({ key: "base" });
    annotated.info("test", { key: "override" });

    const entries = logger.getEntries();
    expect(entries[0].annotations.key).toBe("override");
  });
});
