import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../../src/index.js";
import type { Result } from "../../src/core/types.js";
import type {
  EffectHandler,
  InputOf,
  OutputOf,
  ComposeHandlers,
  NarrowedError,
} from "../../src/handlers/types.js";
import { composeHandlers, identityHandler } from "../../src/handlers/compose.js";
import { transformEffects } from "../../src/handlers/transform.js";

// ---------------------------------------------------------------------------
// Test error types
// ---------------------------------------------------------------------------

type NotFoundError = { readonly _tag: "NotFound"; readonly id: string };
type ValidationError = { readonly _tag: "Validation"; readonly field: string };
type TimeoutError = { readonly _tag: "Timeout"; readonly ms: number };

type AppError = NotFoundError | ValidationError | TimeoutError;

// Test handlers
declare const notFoundHandler: EffectHandler<NotFoundError, string>;
declare const validationHandler: EffectHandler<ValidationError, number>;
declare const timeoutHandler: EffectHandler<TimeoutError, boolean>;

// ---------------------------------------------------------------------------
// InputOf / OutputOf
// ---------------------------------------------------------------------------

describe("InputOf / OutputOf type extraction", () => {
  it("InputOf extracts the error input type", () => {
    expectTypeOf<InputOf<typeof notFoundHandler>>().toEqualTypeOf<NotFoundError>();
  });

  it("OutputOf extracts the recovery output type", () => {
    expectTypeOf<OutputOf<typeof notFoundHandler>>().toEqualTypeOf<string>();
  });

  it("InputOf on identity handler is never", () => {
    expectTypeOf<InputOf<typeof identityHandler>>().toEqualTypeOf<never>();
  });

  it("OutputOf on identity handler is never", () => {
    expectTypeOf<OutputOf<typeof identityHandler>>().toEqualTypeOf<never>();
  });
});

// ---------------------------------------------------------------------------
// ComposeHandlers
// ---------------------------------------------------------------------------

describe("ComposeHandlers type composition", () => {
  it("ComposeHandlers produces union of inputs and outputs", () => {
    type Composed = ComposeHandlers<typeof notFoundHandler, typeof validationHandler>;

    expectTypeOf<InputOf<Composed>>().toEqualTypeOf<NotFoundError | ValidationError>();
    expectTypeOf<OutputOf<Composed>>().toEqualTypeOf<string | number>();
  });

  it("composeHandlers return type matches ComposeHandlers", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);

    expectTypeOf(composed).toMatchTypeOf<
      EffectHandler<NotFoundError | ValidationError, string | number>
    >();
  });

  it("composing with identity preserves the handler type", () => {
    const composed = composeHandlers(identityHandler, notFoundHandler);

    // Input: never | NotFoundError = NotFoundError
    // Output: never | string = string
    expectTypeOf(composed).toMatchTypeOf<EffectHandler<NotFoundError, string>>();
  });
});

// ---------------------------------------------------------------------------
// NarrowedError
// ---------------------------------------------------------------------------

describe("NarrowedError removes handled tags", () => {
  it("removes a single tag from the union", () => {
    type Narrowed = NarrowedError<AppError, "NotFound">;
    expectTypeOf<Narrowed>().toEqualTypeOf<ValidationError | TimeoutError>();
  });

  it("removes multiple tags from the union", () => {
    type Narrowed = NarrowedError<AppError, "NotFound" | "Validation">;
    expectTypeOf<Narrowed>().toEqualTypeOf<TimeoutError>();
  });

  it("removing all tags produces never", () => {
    type Narrowed = NarrowedError<AppError, "NotFound" | "Validation" | "Timeout">;
    expectTypeOf<Narrowed>().toEqualTypeOf<never>();
  });

  it("removing no tags preserves the original union", () => {
    type Narrowed = NarrowedError<AppError, never>;
    expectTypeOf<Narrowed>().toEqualTypeOf<AppError>();
  });
});

// ---------------------------------------------------------------------------
// transformEffects type inference
// ---------------------------------------------------------------------------

describe("transformEffects type inference", () => {
  it("Ok result widens value type to include handler outputs", () => {
    const result = ok(42);
    const transformed = transformEffects(result, notFoundHandler);

    // Value type: number | string (original T | handler output)
    expectTypeOf(transformed).toMatchTypeOf<Result<number | string, unknown>>();
  });

  it("transforms Result with matching handler", () => {
    const result: Result<number, NotFoundError | ValidationError> = err({
      _tag: "NotFound",
      id: "1",
    });

    const transformed = transformEffects(result, notFoundHandler);

    // After handling NotFound, error narrows to ValidationError
    expectTypeOf(transformed).toMatchTypeOf<Result<number | string, ValidationError>>();
  });

  it("multiple handlers narrow error type progressively", () => {
    const result: Result<number, AppError> = err({ _tag: "NotFound", id: "1" });

    const transformed = transformEffects(result, notFoundHandler, validationHandler);

    // Both NotFound and Validation are handled, only Timeout remains
    expectTypeOf(transformed).toMatchTypeOf<Result<number | string | number, TimeoutError>>();
  });
});
