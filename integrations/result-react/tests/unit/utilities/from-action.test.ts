// @traces BEH-R04-001
import { describe, it, expect } from "vitest";
import { fromAction } from "../../../src/utilities/from-action.js";

describe("fromAction (BEH-R04-001)", () => {
  it("wraps successful action in Ok via ResultAsync", async () => {
    const action = async (x: number) => x * 2;
    const safe = fromAction(action, (e) => String(e));
    const result = await safe(21);
    expect(result).toBeOk(42);
  });

  it("wraps failed action in Err via ResultAsync", async () => {
    const action = async () => {
      throw new Error("boom");
    };
    const safe = fromAction(action, (e) => (e as Error).message);
    const result = await safe();
    expect(result).toBeErr("boom");
  });

  it("preserves argument types", async () => {
    const action = async (name: string, age: number) => ({ name, age });
    const safe = fromAction(action, () => "error");
    const result = await safe("Alice", 30);
    expect(result).toBeOk({ name: "Alice", age: 30 });
  });
});
