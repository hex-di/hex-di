import { describe, it, expect } from "vitest";
import {
  mergeContext,
  extractContextFromHeaders,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from "../../src/index.js";

describe("mergeContext", () => {
  it("merges empty contexts", () => {
    const result = mergeContext({}, {});
    expect(result).toEqual({});
  });

  it("preserves base context values", () => {
    const result = mergeContext({ service: "api" }, {});
    expect(result).toEqual({ service: "api" });
  });

  it("adds override values", () => {
    const result = mergeContext({}, { userId: "u1" });
    expect(result).toEqual({ userId: "u1" });
  });

  it("override replaces base values", () => {
    const result = mergeContext({ service: "old", userId: "u1" }, { service: "new" });
    expect(result).toEqual({ service: "new", userId: "u1" });
  });

  it("ignores undefined override values", () => {
    const result = mergeContext({ service: "api" }, { service: undefined });
    expect(result).toEqual({ service: "api" });
  });
});

describe("extractContextFromHeaders", () => {
  it("extracts correlation ID", () => {
    const result = extractContextFromHeaders({
      [CORRELATION_ID_HEADER]: "abc-123",
    });
    expect(result.correlationId).toBe("abc-123");
  });

  it("extracts request ID", () => {
    const result = extractContextFromHeaders({
      [REQUEST_ID_HEADER]: "req-456",
    });
    expect(result.requestId).toBe("req-456");
  });

  it("extracts both headers", () => {
    const result = extractContextFromHeaders({
      [CORRELATION_ID_HEADER]: "abc",
      [REQUEST_ID_HEADER]: "def",
    });
    expect(result.correlationId).toBe("abc");
    expect(result.requestId).toBe("def");
  });

  it("handles missing headers", () => {
    const result = extractContextFromHeaders({});
    expect(result.correlationId).toBeUndefined();
    expect(result.requestId).toBeUndefined();
  });

  it("handles undefined header values", () => {
    const result = extractContextFromHeaders({
      [CORRELATION_ID_HEADER]: undefined,
    });
    expect(result.correlationId).toBeUndefined();
  });
});
