import { describe, it, expect } from "vitest";
import { assertLogEntry, createMemoryLogger } from "../src/index.js";

describe("assertLogEntry", () => {
  it("returns matching entry", () => {
    const logger = createMemoryLogger();
    logger.info("found it");
    const entry = assertLogEntry(logger.getEntries(), { message: "found it" });
    expect(entry.message).toBe("found it");
  });

  it("throws when no match", () => {
    const logger = createMemoryLogger();
    logger.info("something");
    expect(() => assertLogEntry(logger.getEntries(), { message: "nonexistent" })).toThrow();
  });

  it("matches by level", () => {
    const logger = createMemoryLogger();
    logger.info("a");
    logger.warn("b");
    const entry = assertLogEntry(logger.getEntries(), { level: "warn" });
    expect(entry.message).toBe("b");
  });

  it("matches by exact message", () => {
    const logger = createMemoryLogger();
    logger.info("exact match");
    logger.info("other");
    const entry = assertLogEntry(logger.getEntries(), { message: "exact match" });
    expect(entry.message).toBe("exact match");
  });

  it("matches by RegExp", () => {
    const logger = createMemoryLogger();
    logger.info("operation completed in 50ms");
    const entry = assertLogEntry(logger.getEntries(), { message: /completed in \d+ms/ });
    expect(entry.message).toContain("completed");
  });

  it("matches by annotation subset", () => {
    const logger = createMemoryLogger();
    logger.info("msg", { code: 200, extra: "val" });
    const entry = assertLogEntry(logger.getEntries(), { annotations: { code: 200 } });
    expect(entry.annotations.code).toBe(200);
  });

  it("matches by context subset", () => {
    const logger = createMemoryLogger();
    const child = logger.child({ service: "api", correlationId: "abc" });
    child.info("req");
    const entry = assertLogEntry(logger.getEntries(), { context: { service: "api" } });
    expect(entry.context.service).toBe("api");
  });

  it("matches by hasError true", () => {
    const logger = createMemoryLogger();
    logger.error("oops", new Error("e"));
    logger.info("ok");
    const entry = assertLogEntry(logger.getEntries(), { hasError: true });
    expect(entry.error).toBeInstanceOf(Error);
  });

  it("matches by hasError false", () => {
    const logger = createMemoryLogger();
    logger.error("oops", new Error("e"));
    logger.info("ok");
    const entry = assertLogEntry(logger.getEntries(), { hasError: false });
    expect(entry.error).toBeUndefined();
  });

  it("empty matcher matches first entry", () => {
    const logger = createMemoryLogger();
    logger.info("first");
    logger.info("second");
    const entry = assertLogEntry(logger.getEntries(), {});
    expect(entry.message).toBe("first");
  });

  it("error message includes available entries for debugging", () => {
    const logger = createMemoryLogger();
    logger.info("entry-one");
    logger.warn("entry-two");

    try {
      assertLogEntry(logger.getEntries(), { message: "nonexistent" });
      expect.fail("should have thrown");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toContain("entry-one");
      expect(msg).toContain("entry-two");
      expect(msg).toContain("Available entries");
    }
  });
});

describe("createMemoryLogger defaults", () => {
  it('defaults to "trace" level', () => {
    const logger = createMemoryLogger();
    expect(logger.isLevelEnabled("trace")).toBe(true);
    logger.trace("visible");
    expect(logger.getEntries()).toHaveLength(1);
  });

  it('createMemoryLogger("warn") suppresses trace, debug, info', () => {
    const logger = createMemoryLogger("warn");
    logger.trace("no");
    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");
    logger.fatal("yes");
    expect(logger.getEntries()).toHaveLength(3);
    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
    expect(logger.isLevelEnabled("info")).toBe(false);
  });
});
