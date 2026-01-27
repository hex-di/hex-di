import { describe, expectTypeOf, it } from "vitest";
import type { DirectAdapterLifetime } from "../src/builder/types/state.js";

describe("DirectAdapterLifetime", () => {
  it("extracts valid lifetimes correctly", () => {
    expectTypeOf<DirectAdapterLifetime<{ lifetime: "singleton" }>>().toEqualTypeOf<"singleton">();
    expectTypeOf<DirectAdapterLifetime<{ lifetime: "scoped" }>>().toEqualTypeOf<"scoped">();
    expectTypeOf<DirectAdapterLifetime<{ lifetime: "transient" }>>().toEqualTypeOf<"transient">();
  });

  it("returns error type for invalid lifetime", () => {
    type Result = DirectAdapterLifetime<{ lifetime: "invalid" }>;
    type IsError = Result extends `ERROR[HEX015]: ${string}` ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns error type for missing lifetime", () => {
    type Result = DirectAdapterLifetime<{}>;
    type IsError = Result extends `ERROR[HEX015]: ${string}` ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });
});
