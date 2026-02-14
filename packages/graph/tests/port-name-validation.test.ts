/**
 * Tests for port name validation.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { validatePortName } from "../src/validation/port-name-validation.js";

describe("validatePortName", () => {
  it("rejects empty string", () => {
    const result = validatePortName("");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("empty");
  });

  it("rejects whitespace-only", () => {
    const result = validatePortName("  ");
    expect(result.valid).toBe(false);
  });

  it("rejects control characters", () => {
    const result = validatePortName("Port\x00Name");
    expect(result.valid).toBe(false);
  });

  it("rejects starting with digit", () => {
    const result = validatePortName("1Port");
    expect(result.valid).toBe(false);
  });

  it("accepts standard names", () => {
    expect(validatePortName("Logger").valid).toBe(true);
    expect(validatePortName("UserService").valid).toBe(true);
    expect(validatePortName("$config").valid).toBe(true);
    expect(validatePortName("_private").valid).toBe(true);
  });

  it("accepts names with dots and hyphens", () => {
    expect(validatePortName("my.service").valid).toBe(true);
    expect(validatePortName("my-port").valid).toBe(true);
    expect(validatePortName("com.example.Logger").valid).toBe(true);
  });

  it("rejects overly long names", () => {
    const longName = "A".repeat(257);
    const result = validatePortName(longName);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("maximum length");
  });

  it("accepts max-length names", () => {
    const maxName = "A".repeat(256);
    const result = validatePortName(maxName);
    expect(result.valid).toBe(true);
  });

  it("rejects names with path separators", () => {
    expect(validatePortName("path/to/service").valid).toBe(false);
    expect(validatePortName("path\\to\\service").valid).toBe(false);
  });

  it("rejects names with spaces", () => {
    expect(validatePortName("My Service").valid).toBe(false);
  });

  it("rejects names with special characters", () => {
    expect(validatePortName("Port@Name").valid).toBe(false);
    expect(validatePortName("Port#Name").valid).toBe(false);
    expect(validatePortName("Port!Name").valid).toBe(false);
  });
});
