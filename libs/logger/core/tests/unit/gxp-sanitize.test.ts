/**
 * GxP sanitization tests for log injection prevention.
 *
 * Verifies sanitizeMessage strips ANSI escapes, escapes newlines,
 * strips control characters, and preserves normal/Unicode content.
 */

import { describe, it, expect } from "vitest";
import { sanitizeMessage, sanitizeStringValue } from "../../src/utils/sanitize.js";

describe("sanitizeMessage", () => {
  it("should escape newlines to literal \\n", () => {
    const result = sanitizeMessage("line1\nline2\nline3");
    expect(result).toBe("line1\\nline2\\nline3");
  });

  it("should strip ANSI escape codes", () => {
    const result = sanitizeMessage("\x1b[31mred text\x1b[0m");
    expect(result).toBe("red text");
  });

  it("should strip null bytes and control characters", () => {
    const result = sanitizeMessage("hello\x00world\x01test\x7f");
    expect(result).toBe("helloworldtest");
  });

  it("should escape carriage returns to literal \\r", () => {
    const result = sanitizeMessage("before\rafter");
    expect(result).toBe("before\\rafter");
  });

  it("should escape \\r\\n sequences to literal \\r\\n", () => {
    const result = sanitizeMessage("line1\r\nline2");
    expect(result).toBe("line1\\r\\nline2");
  });

  it("should preserve tab characters", () => {
    const result = sanitizeMessage("col1\tcol2\tcol3");
    expect(result).toBe("col1\tcol2\tcol3");
  });

  it("should preserve normal messages unchanged", () => {
    const message = "User logged in successfully with id=123";
    expect(sanitizeMessage(message)).toBe(message);
  });

  it("should preserve Unicode messages", () => {
    const message = "用户登录成功 ñ café 🎉";
    expect(sanitizeMessage(message)).toBe(message);
  });

  it("should prevent fake log line injection", () => {
    // Attacker tries to inject a fake log line
    const attack = "legitimate message\n[ERROR] Fake error injected by attacker";
    const result = sanitizeMessage(attack);
    // Should be a single line
    expect(result).not.toContain("\n");
    expect(result).toBe("legitimate message\\n[ERROR] Fake error injected by attacker");
  });
});

describe("sanitizeStringValue", () => {
  it("should apply same sanitization as sanitizeMessage", () => {
    const input = "value\nwith\x1b[31minjection\x1b[0m";
    expect(sanitizeStringValue(input)).toBe(sanitizeMessage(input));
  });
});
