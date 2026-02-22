/**
 * GxP integrity: ResultAsync structural guard (INV-9).
 *
 * Verifies that isResultAsync() identifies genuine ResultAsync instances
 * and rejects non-ResultAsync values. Currently uses structural checking
 * (then + match methods). Brand-based checking is specified by INV-9 but
 * not yet implemented.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync, isResultAsync } from "../../src/index.js";

describe("GxP: ResultAsync guard — INV-9", () => {
  it("ResultAsync.ok() is recognized", () => {
    const ra = ResultAsync.ok(42);
    expect(isResultAsync(ra)).toBe(true);
  });

  it("ResultAsync.err() is recognized", () => {
    const ra = ResultAsync.err("fail");
    expect(isResultAsync(ra)).toBe(true);
  });

  it("ResultAsync.fromPromise() is recognized", () => {
    const ra = ResultAsync.fromPromise(
      Promise.resolve(42),
      () => "error",
    );
    expect(isResultAsync(ra)).toBe(true);
  });

  it("rejects a plain Promise (no match method)", () => {
    expect(isResultAsync(Promise.resolve(42))).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isResultAsync(null)).toBe(false);
    expect(isResultAsync(undefined)).toBe(false);
  });

  it("rejects a plain object without then", () => {
    expect(isResultAsync({ match: () => {} })).toBe(false);
  });
});
