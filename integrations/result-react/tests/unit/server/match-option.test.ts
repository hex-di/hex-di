// @traces BEH-R07-003 INV-R5
import { describe, it, expect } from "vitest";
import { some, none } from "@hex-di/result";
import { matchOption } from "../../../src/server/index.js";

describe("matchOption (BEH-R07-003)", () => {
  it("calls some handler on Some", () => {
    const option = some(42);
    const output = matchOption(option, {
      some: (value) => `value: ${value}`,
      none: () => "nothing",
    });
    expect(output).toBe("value: 42");
  });

  it("calls none handler on None", () => {
    const option = none();
    const output = matchOption(option, {
      some: (value) => `value: ${value}`,
      none: () => "nothing",
    });
    expect(output).toBe("nothing");
  });
});
