import { describe, it, expect } from "vitest";
import winston from "winston";
import { createWinstonHandler, WinstonHandlerAdapter } from "../src/index.js";
import type { LogEntry } from "@hex-di/logger";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: Date.now(),
    context: {},
    annotations: {},
    ...overrides,
  };
}

describe("createWinstonHandler", () => {
  it("creates a handler with default options", () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    expect(handler).toBeDefined();
    expect(handler.handle).toBeTypeOf("function");
    expect(handler.flush).toBeTypeOf("function");
    expect(handler.shutdown).toBeTypeOf("function");
  });

  it("handle does not throw for basic entry", () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    expect(() => handler.handle(makeEntry())).not.toThrow();
  });

  it("handle includes context and annotations", () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    expect(() =>
      handler.handle(
        makeEntry({
          context: { correlationId: "abc" },
          annotations: { key: "val" },
        })
      )
    ).not.toThrow();
  });

  it("handle includes error", () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    expect(() => handler.handle(makeEntry({ error: new Error("boom") }))).not.toThrow();
  });

  it("handle includes span info", () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    expect(() =>
      handler.handle(
        makeEntry({
          spans: [{ traceId: "abc123", spanId: "def456" }],
        })
      )
    ).not.toThrow();
  });

  it("shutdown does not throw", async () => {
    const handler = createWinstonHandler({
      transports: [new winston.transports.Console({ silent: true })],
    });
    await expect(handler.shutdown()).resolves.toBeUndefined();
  });
});

describe("WinstonHandlerAdapter", () => {
  it("is defined", () => {
    expect(WinstonHandlerAdapter).toBeDefined();
  });
});
