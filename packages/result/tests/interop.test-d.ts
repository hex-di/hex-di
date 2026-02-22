import { describe, it, expectTypeOf } from "vitest";
import { ok, err, fromJSON, toSchema } from "../src/index.js";
import type { Result } from "../src/index.js";
import type { ResultJSON } from "../src/interop/from-json.js";
import type { StandardSchemaV1 } from "../src/interop/to-schema.js";
import { fromOptionJSON } from "../src/option/from-option-json.js";
import type { OptionJSON } from "../src/option/from-option-json.js";
import type { Option } from "../src/option/types.js";

// BEH-13-001, BEH-13-002
describe("Interop - Type Level", () => {
  it("ResultJSON<T, E> is a tagged union of Ok and Err shapes", () => {
    type J = ResultJSON<number, string>;
    expectTypeOf<J>().toMatchTypeOf<
      | { _tag: "Ok"; value: number }
      | { _tag: "Err"; error: string }
    >();
  });

  it("fromJSON returns Result<T, E>", () => {
    const json: ResultJSON<number, string> = { _tag: "Ok", value: 42 };
    const result = fromJSON(json);
    // Verify it has Result shape — _tag and methods
    expectTypeOf(result._tag).toEqualTypeOf<"Ok" | "Err">();
    expectTypeOf(result.isOk).toBeFunction();
    expectTypeOf(result.map).toBeFunction();
  });

  it("toSchema returns StandardSchemaV1<unknown, T>", () => {
    const schema = toSchema((input: unknown) => {
      if (typeof input === "number") return ok(input);
      return err("not a number" as const);
    });
    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, number>>();
  });

  it("StandardSchemaV1 has ~standard property with version and vendor", () => {
    const schema = toSchema((input: unknown) => ok(String(input)));
    expectTypeOf(schema["~standard"].version).toEqualTypeOf<1>();
    expectTypeOf(schema["~standard"].vendor).toEqualTypeOf<"@hex-di/result">();
    expectTypeOf(schema["~standard"].validate).toBeFunction();
  });

  it("StandardSchemaV1.validate returns value or issues", () => {
    const schema = toSchema((input: unknown) => ok(String(input)));
    const result = schema["~standard"].validate("test");
    expectTypeOf(result).toMatchTypeOf<
      | { readonly value: string }
      | { readonly issues: ReadonlyArray<{ readonly message: string }> }
    >();
  });

  it("OptionJSON<T> is a tagged union of Some and None shapes", () => {
    type J = OptionJSON<number>;
    expectTypeOf<J>().toMatchTypeOf<
      | { _tag: "Some"; value: number }
      | { _tag: "None" }
    >();
  });

  it("fromOptionJSON returns Option<T>", () => {
    const json: OptionJSON<number> = { _tag: "Some", value: 42 };
    const result = fromOptionJSON(json);
    expectTypeOf(result).toMatchTypeOf<Option<number>>();
  });
});
