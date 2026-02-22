/**
 * GxP integrity: Error suppression in tee operations (INV-5).
 *
 * Verifies that andTee() and orTee() catch and suppress all exceptions
 * thrown by the side-effect function, returning the original Result unchanged.
 */

import { describe, it, expect } from "vitest";
import { ok, err, ResultAsync } from "../../src/index.js";

describe("GxP: andTee error suppression — INV-5", () => {
  it("ok().andTee(throwing fn) returns Ok unchanged", () => {
    const result = ok(42).andTee(() => {
      throw new Error("side effect exploded");
    });
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(42);
    }
  });

  it("err().andTee(throwing fn) returns Err unchanged (fn not called)", () => {
    const result = err("fail").andTee(() => {
      throw new Error("should not reach");
    });
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error).toBe("fail");
    }
  });
});

describe("GxP: orTee error suppression — INV-5", () => {
  it("err().orTee(throwing fn) returns Err unchanged", () => {
    const result = err("fail").orTee(() => {
      throw new Error("side effect exploded");
    });
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error).toBe("fail");
    }
  });

  it("ok().orTee(throwing fn) returns Ok unchanged (fn not called)", () => {
    const result = ok(42).orTee(() => {
      throw new Error("should not reach");
    });
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(42);
    }
  });
});

describe("GxP: async tee error suppression — INV-5", () => {
  it("ResultAsync andTee suppresses async errors", async () => {
    const result = await ResultAsync.ok(42).andTee(async () => {
      throw new Error("async side effect exploded");
    });
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(42);
    }
  });

  it("ResultAsync orTee suppresses async errors", async () => {
    const result = await ResultAsync.err("fail").orTee(async () => {
      throw new Error("async side effect exploded");
    });
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error).toBe("fail");
    }
  });
});
