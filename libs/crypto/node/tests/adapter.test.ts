import { describe, it, expect } from "vitest";
import { createNodeHashDigest } from "../src/adapter.js";

describe("createNodeHashDigest", () => {
  const digest = createNodeHashDigest();

  describe("sha256Hex", () => {
    it("returns a 64-character hex string", () => {
      const hash = digest.sha256Hex("hello");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", () => {
      const hash1 = digest.sha256Hex("test-data");
      const hash2 = digest.sha256Hex("test-data");
      expect(hash1).toBe(hash2);
    });

    it("different inputs produce different hashes", () => {
      const hash1 = digest.sha256Hex("input-a");
      const hash2 = digest.sha256Hex("input-b");
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string", () => {
      const hash = digest.sha256Hex("");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("timingSafeEqual", () => {
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
  });

  it("is frozen", () => {
    expect(Object.isFrozen(digest)).toBe(true);
  });
});
