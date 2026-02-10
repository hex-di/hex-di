/**
 * Type-level tests for @hex-di/store
 */

import { describe, expectTypeOf, it } from "vitest";
import type { DeepReadonly, ActionReducer, AsyncDerivedSnapshot } from "../src/index.js";

// =============================================================================
// DeepReadonly
// =============================================================================

describe("DeepReadonly", () => {
  it("makes primitive types pass through", () => {
    expectTypeOf<DeepReadonly<string>>().toEqualTypeOf<string>();
    expectTypeOf<DeepReadonly<number>>().toEqualTypeOf<number>();
    expectTypeOf<DeepReadonly<boolean>>().toEqualTypeOf<boolean>();
  });

  it("makes object properties readonly", () => {
    type Input = { a: number; b: string };
    type Result = DeepReadonly<Input>;
    expectTypeOf<Result>().toEqualTypeOf<{ readonly a: number; readonly b: string }>();
  });

  it("makes nested objects deeply readonly", () => {
    type Input = { a: { b: { c: number } } };
    type Result = DeepReadonly<Input>;
    expectTypeOf<Result>().toEqualTypeOf<{
      readonly a: { readonly b: { readonly c: number } };
    }>();
  });

  it("makes arrays readonly", () => {
    type Input = number[];
    type Result = DeepReadonly<Input>;
    expectTypeOf<Result>().toEqualTypeOf<readonly number[]>();
  });

  it("preserves function types", () => {
    type Fn = (x: number) => string;
    type Result = DeepReadonly<Fn>;
    // Functions should pass through unchanged
    expectTypeOf<Result>().toMatchTypeOf<(x: number) => string>();
  });
});

// =============================================================================
// ActionReducer
// =============================================================================

describe("ActionReducer", () => {
  it("produces unary reducer for NoPayload", () => {
    type R = ActionReducer<number>;
    expectTypeOf<R>().toEqualTypeOf<(state: number) => number>();
  });

  it("produces binary reducer for explicit payload", () => {
    type R = ActionReducer<number, string>;
    expectTypeOf<R>().toEqualTypeOf<(state: number, payload: string) => number>();
  });
});

// =============================================================================
// AsyncDerivedSnapshot
// =============================================================================

describe("AsyncDerivedSnapshot", () => {
  it("idle variant has undefined data and error", () => {
    type Snap = Extract<AsyncDerivedSnapshot<string>, { status: "idle" }>;
    expectTypeOf<Snap["data"]>().toEqualTypeOf<undefined>();
    expectTypeOf<Snap["error"]>().toEqualTypeOf<undefined>();
    expectTypeOf<Snap["isLoading"]>().toEqualTypeOf<false>();
  });

  it("success variant has data", () => {
    type Snap = Extract<AsyncDerivedSnapshot<string>, { status: "success" }>;
    expectTypeOf<Snap["data"]>().toEqualTypeOf<DeepReadonly<string>>();
    expectTypeOf<Snap["error"]>().toEqualTypeOf<undefined>();
  });

  it("error variant with typed error", () => {
    type Snap = Extract<AsyncDerivedSnapshot<string, Error>, { status: "error" }>;
    expectTypeOf<Snap["error"]>().toEqualTypeOf<Error>();
    expectTypeOf<Snap["data"]>().toEqualTypeOf<undefined>();
  });
});
