/**
 * Tests for src/util/unreachable.ts
 * Covers that unreachable always throws with the provided message.
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import { unreachable } from "../src/util/unreachable.js";

describe("unreachable", () => {
  it("throws an Error with the provided message", () => {
    expect(() => unreachable("this should not happen")).toThrow("this should not happen");
  });

  it("throws an Error (not other type)", () => {
    expect(() => unreachable("test")).toThrow(Error);
  });

  it("throws with exact message match", () => {
    try {
      unreachable("exact message");
      // Should not reach here
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toBe("exact message");
    }
  });

  it("throws with empty string message", () => {
    expect(() => unreachable("")).toThrow("");
  });
});
