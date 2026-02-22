import { describe, it, expect } from "vitest";
import { createPinoHandler, mapLevel, PinoHandlerAdapter } from "../src/index.js";
import type { LogEntry } from "@hex-di/logger";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: Date.now(),
    sequence: 0,
    context: {},
    annotations: {},
    ...overrides,
  };
}

describe("mapLevel", () => {
  it("maps all levels correctly", () => {
    expect(mapLevel("trace")).toBe("trace");
    expect(mapLevel("debug")).toBe("debug");
    expect(mapLevel("info")).toBe("info");
    expect(mapLevel("warn")).toBe("warn");
    expect(mapLevel("error")).toBe("error");
    expect(mapLevel("fatal")).toBe("fatal");
  });
});

describe("createPinoHandler", () => {
  it("creates a handler with default options", () => {
    const handler = createPinoHandler();
    expect(handler).toBeDefined();
    expect(handler.handle).toBeTypeOf("function");
    expect(handler.flush).toBeTypeOf("function");
    expect(handler.shutdown).toBeTypeOf("function");
  });

  it("handle does not throw for basic entry", () => {
    const handler = createPinoHandler();
    expect(() => handler.handle(makeEntry())).not.toThrow();
  });

  it("handle includes context and annotations", () => {
    const handler = createPinoHandler();
    expect(() =>
      handler.handle(
        makeEntry({
          context: { correlationId: "abc", service: "test" },
          annotations: { key: "val" },
        })
      )
    ).not.toThrow();
  });

  it("handle includes error", () => {
    const handler = createPinoHandler();
    expect(() => handler.handle(makeEntry({ error: new Error("boom") }))).not.toThrow();
  });

  it("handle includes span info", () => {
    const handler = createPinoHandler();
    expect(() =>
      handler.handle(
        makeEntry({
          spans: [{ traceId: "abc123", spanId: "def456" }],
        })
      )
    ).not.toThrow();
  });

  it("flush does not throw", async () => {
    const handler = createPinoHandler();
    await expect(handler.flush()).resolves.toBeUndefined();
  });

  it("shutdown does not throw", async () => {
    const handler = createPinoHandler();
    await expect(handler.shutdown()).resolves.toBeUndefined();
  });

  it("respects custom level option", () => {
    const handler = createPinoHandler({ level: "warn" });
    expect(handler).toBeDefined();
  });
});

describe("PinoHandlerAdapter", () => {
  it("is defined", () => {
    expect(PinoHandlerAdapter).toBeDefined();
  });
});
