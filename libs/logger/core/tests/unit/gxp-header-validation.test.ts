/**
 * GxP header validation tests.
 *
 * Verifies sanitization of correlation/request IDs extracted
 * from HTTP headers for safe use in log context.
 */

import { describe, it, expect } from "vitest";
import { extractContextFromHeaders } from "../../src/utils/context.js";

describe("extractContextFromHeaders - header validation", () => {
  it("should accept normal correlation ID", () => {
    const ctx = extractContextFromHeaders({
      "x-correlation-id": "abc-123-def-456",
    });
    expect(ctx.correlationId).toBe("abc-123-def-456");
  });

  it("should truncate oversized correlation ID to 256 chars", () => {
    const longId = "a".repeat(500);
    const ctx = extractContextFromHeaders({
      "x-correlation-id": longId,
    });
    const result = ctx.correlationId as string;
    expect(result.length).toBeLessThanOrEqual(256);
  });

  it("should sanitize control characters in ID", () => {
    const ctx = extractContextFromHeaders({
      "x-correlation-id": "valid\x00part\nnewline",
    });
    const result = ctx.correlationId as string;
    // Control characters and newlines should be replaced with underscores
    expect(result).not.toContain("\x00");
    expect(result).not.toContain("\n");
  });

  it("should ignore empty ID", () => {
    const ctx = extractContextFromHeaders({
      "x-correlation-id": "",
    });
    expect(ctx.correlationId).toBeUndefined();
  });

  it("should also sanitize request IDs", () => {
    const ctx = extractContextFromHeaders({
      "x-request-id": "req<script>alert(1)</script>",
    });
    const result = ctx.requestId as string;
    // Unsafe characters should be replaced
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});
