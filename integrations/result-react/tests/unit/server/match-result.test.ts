// @traces BEH-R07-001 INV-R5 INV-R10
import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { matchResult } from "../../../src/server/index.js";

describe("matchResult (BEH-R07-001)", () => {
  it("calls ok handler on Ok", () => {
    const result = ok(42);
    const output = matchResult(result, {
      ok: (value) => `value: ${value}`,
      err: (error) => `error: ${error}`,
    });
    expect(output).toBe("value: 42");
  });

  it("calls err handler on Err", () => {
    const result = err("not found");
    const output = matchResult(result, {
      ok: (value) => `value: ${value}`,
      err: (error) => `error: ${error}`,
    });
    expect(output).toBe("error: not found");
  });

  it("passes through complex types", () => {
    const result = ok({ name: "Alice", age: 30 });
    const output = matchResult(result, {
      ok: (user) => user.name,
      err: () => "unknown",
    });
    expect(output).toBe("Alice");
  });
});
