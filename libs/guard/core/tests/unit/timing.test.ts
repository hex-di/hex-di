import { describe, it, expect } from "vitest";
import { createNodeHashDigest } from "@hex-di/crypto-node";

const digest = createNodeHashDigest();

describe("timingSafeEqual (via HashDigest)", () => {
  it("returns true for identical strings", () => {
    expect(digest.timingSafeEqual("hello-world", "hello-world")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(digest.timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(digest.timingSafeEqual("", "")).toBe(true);
  });

  it("returns false for different-length strings", () => {
    expect(digest.timingSafeEqual("short", "a-much-longer-string")).toBe(false);
  });

  it("returns false when strings differ only in last character", () => {
    expect(digest.timingSafeEqual("abcdefg", "abcdefh")).toBe(false);
  });

  it("is deterministic (same result on repeated calls)", () => {
    const a = "deterministic-test-value";
    const b = "deterministic-test-value";
    const results = Array.from({ length: 10 }, () => digest.timingSafeEqual(a, b));
    expect(results.every(r => r === true)).toBe(true);

    const c = "different-value";
    const falseResults = Array.from({ length: 10 }, () => digest.timingSafeEqual(a, c));
    expect(falseResults.every(r => r === false)).toBe(true);
  });
});
