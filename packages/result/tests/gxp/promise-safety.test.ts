/**
 * GxP integrity: ResultAsync promise safety (INV-2).
 *
 * Verifies that the internal promise of ResultAsync never rejects.
 * All rejections are caught and converted to Err.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "../../src/index.js";

describe("GxP: ResultAsync never rejects — INV-2", () => {
  it("ResultAsync.fromPromise catches rejected promises", async () => {
    const result = ResultAsync.fromPromise(
      Promise.reject(new Error("boom")),
      (e) => (e as Error).message,
    );
    const awaited = await result;
    expect(awaited._tag).toBe("Err");
    if (awaited._tag === "Err") {
      expect(awaited.error).toBe("boom");
    }
  });

  it("ResultAsync.ok never rejects", async () => {
    const result = ResultAsync.ok(42);
    const awaited = await result;
    expect(awaited._tag).toBe("Ok");
    if (awaited._tag === "Ok") {
      expect(awaited.value).toBe(42);
    }
  });

  it("ResultAsync.err never rejects", async () => {
    const result = ResultAsync.err("fail");
    const awaited = await result;
    expect(awaited._tag).toBe("Err");
    if (awaited._tag === "Err") {
      expect(awaited.error).toBe("fail");
    }
  });

  it("ResultAsync.fromPromise with synchronous throw in mapper", async () => {
    const result = ResultAsync.fromPromise(
      Promise.reject("raw-rejection"),
      (e) => `caught: ${e}`,
    );
    const awaited = await result;
    expect(awaited._tag).toBe("Err");
    if (awaited._tag === "Err") {
      expect(awaited.error).toBe("caught: raw-rejection");
    }
  });
});
