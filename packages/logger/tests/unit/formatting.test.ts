import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/index.js";
import type { LogEntry } from "../../src/index.js";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: new Date("2024-01-15T10:30:00.000Z").getTime(),
    context: {},
    annotations: {},
    ...overrides,
  };
}

describe("getFormatter('json')", () => {
  const formatter = getFormatter("json");

  it("returns valid JSON", () => {
    const output = formatter.format(makeEntry());
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
  });

  it("includes context fields", () => {
    const output = formatter.format(makeEntry({ context: { correlationId: "abc" } }));
    const parsed = JSON.parse(output);
    expect(parsed.correlationId).toBe("abc");
  });

  it("includes annotations", () => {
    const output = formatter.format(makeEntry({ annotations: { key: "val" } }));
    const parsed = JSON.parse(output);
    expect(parsed.key).toBe("val");
  });

  it("includes error info", () => {
    const output = formatter.format(makeEntry({ error: new Error("boom") }));
    const parsed = JSON.parse(output);
    expect(parsed.error.name).toBe("Error");
    expect(parsed.error.message).toBe("boom");
  });

  it("includes trace span info", () => {
    const output = formatter.format(
      makeEntry({
        spans: [{ traceId: "abc123", spanId: "def456" }],
      })
    );
    const parsed = JSON.parse(output);
    expect(parsed.traceId).toBe("abc123");
    expect(parsed.spanId).toBe("def456");
  });
});

describe("getFormatter('pretty')", () => {
  const formatter = getFormatter("pretty");

  it("includes level label and message", () => {
    const output = formatter.format(makeEntry());
    expect(output).toContain("INFO");
    expect(output).toContain("test message");
  });

  it("includes timestamp", () => {
    const output = formatter.format(makeEntry());
    expect(output).toContain("2024-01-15");
  });

  it("includes annotations as JSON", () => {
    const output = formatter.format(makeEntry({ annotations: { key: "val" } }));
    expect(output).toContain('"key":"val"');
  });
});

describe("getFormatter('minimal')", () => {
  const formatter = getFormatter("minimal");

  it("only includes level and message", () => {
    const output = formatter.format(makeEntry());
    expect(output).toBe("[ INFO] test message");
  });

  it("works for all levels", () => {
    expect(formatter.format(makeEntry({ level: "error" }))).toContain("ERROR");
    expect(formatter.format(makeEntry({ level: "warn" }))).toContain("WARN");
    expect(formatter.format(makeEntry({ level: "debug" }))).toContain("DEBUG");
  });
});
