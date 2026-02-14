/**
 * ConsoleInterceptor tests.
 *
 * Covers spec Section 44.8 items 5-6:
 * 5. Console level filter hides/shows entries
 * 6. Console auto-scroll (entry accumulation and limits)
 */

import { describe, it, expect, vi } from "vitest";
import {
  createConsoleInterceptor,
  serializeConsoleArg,
  MAX_ENTRIES,
} from "../../src/console/console-interceptor.js";

describe("createConsoleInterceptor", () => {
  it("captures log calls as ConsoleEntry objects", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("hello", "world");

    expect(listener).toHaveBeenCalledTimes(1);
    const entry = listener.mock.calls[0][0];
    expect(entry.type).toBe("log");
    expect(entry.level).toBe("log");
    expect(entry.args).toHaveLength(2);
    expect(entry.args[0].value).toBe("hello");
    expect(entry.args[1].value).toBe("world");
    expect(typeof entry.timestamp).toBe("number");
  });

  it("captures all log levels", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("log");
    interceptor.console.warn("warn");
    interceptor.console.error("error");
    interceptor.console.info("info");
    interceptor.console.debug("debug");

    expect(listener).toHaveBeenCalledTimes(5);
    expect(listener.mock.calls[0][0].level).toBe("log");
    expect(listener.mock.calls[1][0].level).toBe("warn");
    expect(listener.mock.calls[2][0].level).toBe("error");
    expect(listener.mock.calls[3][0].level).toBe("info");
    expect(listener.mock.calls[4][0].level).toBe("debug");
  });

  it("getEntries returns accumulated entries", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("a");
    interceptor.console.warn("b");
    interceptor.console.error("c");

    const entries = interceptor.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].type).toBe("log");
  });

  it("clear removes all entries", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("a");
    interceptor.console.log("b");
    expect(interceptor.getEntries()).toHaveLength(2);

    interceptor.clear();
    expect(interceptor.getEntries()).toHaveLength(0);
  });

  it("addEntry adds non-log entries", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.addEntry({
      type: "status",
      message: "Compiling...",
      variant: "info",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(interceptor.getEntries()).toHaveLength(1);
    expect(interceptor.getEntries()[0].type).toBe("status");
  });

  it("enforces MAX_ENTRIES limit", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    // Add more than MAX_ENTRIES
    for (let i = 0; i < MAX_ENTRIES + 50; i++) {
      interceptor.console.log(`entry ${i}`);
    }

    const entries = interceptor.getEntries();
    expect(entries.length).toBe(MAX_ENTRIES);
    // Oldest entries should have been removed -- newest should be last
    const lastEntry = entries[entries.length - 1];
    expect(lastEntry.type).toBe("log");
    if (lastEntry.type === "log") {
      expect(lastEntry.args[0].value).toBe(`entry ${MAX_ENTRIES + 49}`);
    }
  });

  it("serializes various argument types", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("text", 42, true, null, undefined);

    const entry = listener.mock.calls[0][0];
    expect(entry.args[0].type).toBe("string");
    expect(entry.args[1].type).toBe("number");
    expect(entry.args[2].type).toBe("boolean");
    expect(entry.args[3].type).toBe("null");
    expect(entry.args[4].type).toBe("undefined");
  });

  it("getEntries returns a copy (not a reference)", () => {
    const listener = vi.fn();
    const interceptor = createConsoleInterceptor(listener);

    interceptor.console.log("a");
    const entries1 = interceptor.getEntries();

    interceptor.console.log("b");
    const entries2 = interceptor.getEntries();

    expect(entries1).toHaveLength(1);
    expect(entries2).toHaveLength(2);
  });
});

describe("serializeConsoleArg", () => {
  it("truncates long strings", () => {
    const longString = "x".repeat(20_000);
    const result = serializeConsoleArg(longString);
    expect(result.type).toBe("string");
    expect(result.value.length).toBeLessThan(longString.length);
    expect(result.value).toContain("... (truncated)");
  });

  it("truncates deeply nested objects", () => {
    // Create an object nested 7 levels deep
    let obj: Record<string, unknown> = { value: "leaf" };
    for (let i = 0; i < 7; i++) {
      obj = { nested: obj };
    }

    const result = serializeConsoleArg(obj);
    // The result should contain [Object] for deeply nested parts
    expect(result.value).toContain("[Object]");
  });

  it("handles primitive values", () => {
    expect(serializeConsoleArg(42).type).toBe("number");
    expect(serializeConsoleArg("hello").type).toBe("string");
    expect(serializeConsoleArg(true).type).toBe("boolean");
    expect(serializeConsoleArg(null).type).toBe("null");
    expect(serializeConsoleArg(undefined).type).toBe("undefined");
  });

  it("handles arrays", () => {
    const result = serializeConsoleArg([1, 2, 3]);
    expect(result.type).toBe("array");
  });

  it("handles objects", () => {
    const result = serializeConsoleArg({ a: 1, b: "two" });
    expect(result.type).toBe("object");
  });
});
