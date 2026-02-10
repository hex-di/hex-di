import { describe, it, expect } from "vitest";
import { assertLogEntry, createMemoryLogger } from "../../src/index.js";

describe("assertLogEntry", () => {
  it("finds entry by level", () => {
    const logger = createMemoryLogger();
    logger.info("msg");
    logger.warn("msg2");

    const entry = assertLogEntry(logger.getEntries(), { level: "warn" });
    expect(entry.message).toBe("msg2");
  });

  it("finds entry by message string", () => {
    const logger = createMemoryLogger();
    logger.info("first");
    logger.info("second");

    const entry = assertLogEntry(logger.getEntries(), { message: "second" });
    expect(entry.level).toBe("info");
  });

  it("finds entry by message regex", () => {
    const logger = createMemoryLogger();
    logger.info("Order 12345 processed");

    const entry = assertLogEntry(logger.getEntries(), { message: /Order \d+ processed/ });
    expect(entry.message).toBe("Order 12345 processed");
  });

  it("finds entry by annotations", () => {
    const logger = createMemoryLogger();
    logger.info("a", { key: "first" });
    logger.info("b", { key: "second" });

    const entry = assertLogEntry(logger.getEntries(), {
      annotations: { key: "second" },
    });
    expect(entry.message).toBe("b");
  });

  it("finds entry by context", () => {
    const logger = createMemoryLogger();
    const child = logger.child({ service: "test-svc" });
    logger.info("parent");
    child.info("child");

    const entry = assertLogEntry(logger.getEntries(), {
      context: { service: "test-svc" },
    });
    expect(entry.message).toBe("child");
  });

  it("finds entry by hasError: true", () => {
    const logger = createMemoryLogger();
    logger.info("no error");
    logger.error("has error", new Error("boom"));

    const entry = assertLogEntry(logger.getEntries(), { hasError: true });
    expect(entry.level).toBe("error");
  });

  it("finds entry by hasError: false", () => {
    const logger = createMemoryLogger();
    logger.error("has error", new Error("boom"));
    logger.info("no error");

    const entry = assertLogEntry(logger.getEntries(), { hasError: false });
    expect(entry.level).toBe("info");
  });

  it("throws when no entry matches", () => {
    const logger = createMemoryLogger();
    logger.info("msg");

    expect(() => assertLogEntry(logger.getEntries(), { level: "fatal" })).toThrow(
      "No log entry matching"
    );
  });

  it("combines multiple matcher criteria", () => {
    const logger = createMemoryLogger();
    logger.info("msg", { key: "val" });
    logger.warn("msg", { key: "val" });

    const entry = assertLogEntry(logger.getEntries(), {
      level: "warn",
      message: "msg",
      annotations: { key: "val" },
    });
    expect(entry.level).toBe("warn");
  });
});
