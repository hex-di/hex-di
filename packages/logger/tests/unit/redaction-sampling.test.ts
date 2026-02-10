import { describe, it, expect, vi } from "vitest";
import { createMemoryLogger, withRedaction, withSampling, withRateLimit } from "../../src/index.js";

describe("withRedaction", () => {
  it("redacts exact field name in annotations", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, { paths: ["password"] });

    logger.info("login", { username: "alice", password: "secret123" });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({
      username: "alice",
      password: "[REDACTED]",
    });
  });

  it("redacts wildcard field in nested annotations", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, { paths: ["*.secret"] });

    logger.info("data", {
      db: { secret: "dbpass", host: "localhost" },
      cache: { secret: "cachepass" },
      secret: "top-level-should-not-match",
    });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({
      db: { secret: "[REDACTED]", host: "localhost" },
      cache: { secret: "[REDACTED]" },
      secret: "top-level-should-not-match",
    });
  });

  it("does not modify non-matching fields", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, { paths: ["password"] });

    logger.info("safe", { name: "alice", role: "admin" });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({ name: "alice", role: "admin" });
  });

  it("uses custom censor function", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, {
      paths: ["ssn"],
      censor: value => {
        if (typeof value === "string" && value.length > 4) {
          return `***${value.slice(-4)}`;
        }
        return "***";
      },
    });

    logger.info("user", { ssn: "123-45-6789", name: "Bob" });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({
      ssn: "***6789",
      name: "Bob",
    });
  });

  it("default censor is [REDACTED]", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, { paths: ["token"] });

    logger.info("auth", { token: "abc123" });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({ token: "[REDACTED]" });
  });

  it("child loggers preserve redaction", () => {
    const memLogger = createMemoryLogger();
    const logger = withRedaction(memLogger, { paths: ["password"] });
    const child = logger.child({ service: "auth" });

    child.info("login", { password: "secret" });

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations).toEqual({ password: "[REDACTED]" });
    expect(entries[0].context).toEqual({ service: "auth" });
  });
});

describe("withSampling", () => {
  it("with rate 1.0 logs all entries", () => {
    const memLogger = createMemoryLogger();
    const logger = withSampling(memLogger, { rate: 1.0 });

    for (let i = 0; i < 100; i++) {
      logger.info(`msg-${i}`);
    }

    expect(memLogger.getEntries()).toHaveLength(100);
  });

  it("with rate 0.0 logs no entries (except errors)", () => {
    const memLogger = createMemoryLogger();
    const logger = withSampling(memLogger, { rate: 0.0 });

    for (let i = 0; i < 50; i++) {
      logger.info(`msg-${i}`);
      logger.debug(`debug-${i}`);
      logger.trace(`trace-${i}`);
      logger.warn(`warn-${i}`);
    }

    expect(memLogger.getEntries()).toHaveLength(0);
  });

  it("with alwaysLogErrors always logs error level", () => {
    const memLogger = createMemoryLogger();
    const logger = withSampling(memLogger, {
      rate: 0.0,
      alwaysLogErrors: true,
    });

    logger.error("critical issue");
    logger.error("another error");

    expect(memLogger.getEntries()).toHaveLength(2);
    expect(memLogger.getEntries().every(e => e.level === "error")).toBe(true);
  });

  it("with alwaysLogErrors always logs fatal level", () => {
    const memLogger = createMemoryLogger();
    const logger = withSampling(memLogger, {
      rate: 0.0,
      alwaysLogErrors: true,
    });

    logger.fatal("system down");
    logger.fatal("total failure");

    expect(memLogger.getEntries()).toHaveLength(2);
    expect(memLogger.getEntries().every(e => e.level === "fatal")).toBe(true);
  });

  it("respects per-level rate overrides", () => {
    const memLogger = createMemoryLogger();
    // Global rate 0.0, but warn is 1.0
    const logger = withSampling(memLogger, {
      rate: 0.0,
      perLevel: { warn: 1.0 },
      alwaysLogErrors: false,
    });

    for (let i = 0; i < 20; i++) {
      logger.info(`info-${i}`);
      logger.warn(`warn-${i}`);
    }

    const entries = memLogger.getEntries();
    expect(entries).toHaveLength(20);
    expect(entries.every(e => e.level === "warn")).toBe(true);
  });
});

describe("withRateLimit", () => {
  it("allows entries within the limit", () => {
    const memLogger = createMemoryLogger();
    const logger = withRateLimit(memLogger, {
      maxEntries: 10,
      windowMs: 60_000,
    });

    for (let i = 0; i < 10; i++) {
      logger.info(`msg-${i}`);
    }

    expect(memLogger.getEntries()).toHaveLength(10);
  });

  it("drops entries exceeding the limit", () => {
    const memLogger = createMemoryLogger();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const logger = withRateLimit(memLogger, {
      maxEntries: 5,
      windowMs: 60_000,
    });

    for (let i = 0; i < 20; i++) {
      logger.info(`msg-${i}`);
    }

    expect(memLogger.getEntries()).toHaveLength(5);

    vi.restoreAllMocks();
  });
});
