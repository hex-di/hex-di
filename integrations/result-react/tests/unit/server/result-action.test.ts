// @traces BEH-R07-004 INV-R10
import { describe, it, expect } from "vitest";
import { resultAction } from "../../../src/server/index.js";

describe("resultAction (BEH-R07-004)", () => {
  it("returns Ok on successful action", async () => {
    const action = async (x: number) => x * 2;
    const safe = resultAction(action, (e) => String(e));
    const result = await safe(21);
    expect(result).toBeOk(42);
  });

  it("returns Err on rejected action", async () => {
    const action = async () => {
      throw new Error("boom");
    };
    const safe = resultAction(action, (e) => (e as Error).message);
    const result = await safe();
    expect(result).toBeErr("boom");
  });

  it("preserves argument types", async () => {
    const action = async (name: string, age: number) => ({ name, age });
    const safe = resultAction(action, () => "error");
    const result = await safe("Alice", 30);
    expect(result).toBeOk({ name: "Alice", age: 30 });
  });
});
