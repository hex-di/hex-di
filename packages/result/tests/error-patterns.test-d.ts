import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { createError } from "../src/errors/create-error.js";
import { assertNever } from "../src/errors/assert-never.js";

describe("Error Patterns - Type Level", () => {
  // DoD 10 type #1
  it("createError('NotFound') return type has { readonly _tag: 'NotFound' }", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User" });
    expectTypeOf(error).toHaveProperty("_tag");
    expectTypeOf(error._tag).toEqualTypeOf<"NotFound">();
  });

  // DoD 10 type #2
  it("Factory with fields infers intersection of _tag and field types", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User", id: "123" });
    expectTypeOf(error).toMatchTypeOf<{
      readonly _tag: "NotFound";
      readonly resource: string;
      readonly id: string;
    }>();
  });

  // DoD 10 type #3
  it("assertNever parameter type is never (enforces exhaustive checks)", () => {
    expectTypeOf(assertNever).parameter(0).toEqualTypeOf<never>();
  });

  // DoD 10 type #4
  it("Error type union narrows correctly in switch on _tag", () => {
    type AppError = { _tag: "NotFound"; id: string } | { _tag: "Validation"; field: string };

    function handle(e: AppError): void {
      switch (e._tag) {
        case "NotFound":
          expectTypeOf(e).toMatchTypeOf<{ _tag: "NotFound"; id: string }>();
          break;
        case "Validation":
          expectTypeOf(e).toMatchTypeOf<{ _tag: "Validation"; field: string }>();
          break;
      }
    }
  });

  // DoD 10 type #5
  it("Error hierarchy type compositions resolve correctly", () => {
    type InfraError = { _tag: "Timeout"; ms: number } | { _tag: "ConnectionFailed"; host: string };

    type DomainError =
      | { _tag: "NotFound"; entity: string }
      | { _tag: "InfraFailure"; cause: InfraError };

    function infraStep(): Result<number, InfraError> {
      return ok(1);
    }

    function domainStep(n: number): Result<string, DomainError> {
      return ok(String(n));
    }

    const result = infraStep()
      .mapErr((e): DomainError => ({ _tag: "InfraFailure", cause: e }))
      .andThen(domainStep);

    expectTypeOf(result).toMatchTypeOf<Result<string, DomainError>>();
  });
});
