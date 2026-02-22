import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "../../src/utils/timing.js";

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("hello-world", "hello-world")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false for different-length strings", () => {
    expect(timingSafeEqual("short", "a-much-longer-string")).toBe(false);
  });

  it("returns false when strings differ only in last character", () => {
    expect(timingSafeEqual("abcdefg", "abcdefh")).toBe(false);
  });

  it("is deterministic (same result on repeated calls)", () => {
    const a = "deterministic-test-value";
    const b = "deterministic-test-value";
    const results = Array.from({ length: 10 }, () => timingSafeEqual(a, b));
    expect(results.every((r) => r === true)).toBe(true);

    const c = "different-value";
    const falseResults = Array.from({ length: 10 }, () => timingSafeEqual(a, c));
    expect(falseResults.every((r) => r === false)).toBe(true);
  });
});
