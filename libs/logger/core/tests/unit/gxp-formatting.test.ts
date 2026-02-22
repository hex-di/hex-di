/**
 * GxP formatting error handling tests.
 *
 * Verifies JSON formatter handles non-serializable values
 * gracefully with fallback serialization.
 */

import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/utils/formatting.js";
import type { LogEntry } from "../../src/types/log-entry.js";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: 1700000000000,
    sequence: 0,
    context: {},
    annotations: {},
    ...overrides,
  };
}

describe("JSON formatter - error handling", () => {
  it("should handle circular reference in annotations", () => {
    const formatter = getFormatter("json");
    const circular: Record<string, unknown> = { name: "test" };
    circular.self = circular;

    const entry = makeEntry({ annotations: circular });
    const output = formatter.format(entry);

    // Should produce valid JSON (either normal or fallback)
    expect(() => JSON.parse(output)).not.toThrow();
    // If fallback was triggered, it should have _serializationError
    const parsed = JSON.parse(output);
    if (parsed._serializationError) {
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("test message");
    }
  });

  it("should handle BigInt in annotations", () => {
    const formatter = getFormatter("json");
    // BigInt cannot be serialized by JSON.stringify
    const entry = makeEntry({
      annotations: { value: BigInt(999) as unknown as string },
    });
    const output = formatter.format(entry);

    // Should produce valid JSON via fallback
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("should format normal entries correctly", () => {
    const formatter = getFormatter("json");
    const entry = makeEntry({
      annotations: { key: "value", count: 42 },
    });
    const output = formatter.format(entry);
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.sequence).toBe(0);
    expect(parsed.key).toBe("value");
    expect(parsed.count).toBe(42);
  });

  it("should include sequence number in JSON output", () => {
    const formatter = getFormatter("json");
    const entry = makeEntry({ sequence: 42 });
    const output = formatter.format(entry);
    const parsed = JSON.parse(output);

    expect(parsed.sequence).toBe(42);
  });
});
