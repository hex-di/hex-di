// @traces BEH-R04-001
import { describe, it, expectTypeOf } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { fromAction } from "../../src/utilities/from-action.js";

describe("fromAction types (BEH-R04-001)", () => {
  it("preserves argument types and infers return type", () => {
    const wrapped = fromAction(
      async (name: string, age: number) => ({ name, age }),
      (e) => String(e),
    );
    expectTypeOf(wrapped).toEqualTypeOf<
      (name: string, age: number) => ResultAsync<{ name: string; age: number }, string>
    >();
  });

  it("zero-arg action", () => {
    const wrapped = fromAction(
      async () => 42,
      () => "error",
    );
    expectTypeOf(wrapped).toEqualTypeOf<() => ResultAsync<number, string>>();
  });

  // @ts-expect-error mapErr must return the error type, not accept extra args
  fromAction(async () => 42, (_e: unknown, _extra: string) => "error");
});
