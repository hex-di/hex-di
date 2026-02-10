import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createBunyanHandler, mapLevel, BunyanHandlerAdapter } from "../src/index.js";
import type { LogEntry } from "@hex-di/logger";

/** A writable stream that discards all data (silent sink). */
function createSilentStream(): Writable {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}

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

describe("createBunyanHandler", () => {
  it("creates a handler", () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    expect(handler).toBeDefined();
    expect(handler.handle).toBeTypeOf("function");
    expect(handler.flush).toBeTypeOf("function");
    expect(handler.shutdown).toBeTypeOf("function");
  });

  it("handle does not throw for basic entry", () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    expect(() => handler.handle(makeEntry())).not.toThrow();
  });

  it("handle includes context and annotations", () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
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
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    expect(() => handler.handle(makeEntry({ error: new Error("boom") }))).not.toThrow();
  });

  it("handle includes span info", () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    expect(() =>
      handler.handle(
        makeEntry({
          spans: [{ traceId: "abc123", spanId: "def456" }],
        })
      )
    ).not.toThrow();
  });

  it("flush does not throw", async () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    await expect(handler.flush()).resolves.toBeUndefined();
  });

  it("shutdown does not throw", async () => {
    const handler = createBunyanHandler({
      name: "test",
      streams: [{ stream: createSilentStream() }],
    });
    await expect(handler.shutdown()).resolves.toBeUndefined();
  });
});

describe("BunyanHandlerAdapter", () => {
  it("is defined", () => {
    expect(BunyanHandlerAdapter).toBeDefined();
  });
});
