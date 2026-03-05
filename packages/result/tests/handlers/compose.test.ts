import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ok, err } from "../../src/index.js";
import type { EffectHandler } from "../../src/handlers/types.js";
import { composeHandlers, identityHandler } from "../../src/handlers/compose.js";
import { transformEffects } from "../../src/handlers/transform.js";
import type { Result } from "../../src/core/types.js";

// ---------------------------------------------------------------------------
// Test helpers: concrete tagged errors and handlers
// ---------------------------------------------------------------------------

type NotFoundError = { readonly _tag: "NotFound"; readonly id: string };
type ValidationError = { readonly _tag: "Validation"; readonly field: string };
type TimeoutError = { readonly _tag: "Timeout"; readonly ms: number };

const notFoundHandler: EffectHandler<NotFoundError, string> = Object.freeze({
  _tag: "notFound",
  tags: ["NotFound"],
  handle(error: NotFoundError): Result<string, never> {
    return ok(`default-for-${error.id}`);
  },
});

const validationHandler: EffectHandler<ValidationError, string> = Object.freeze({
  _tag: "validation",
  tags: ["Validation"],
  handle(error: ValidationError): Result<string, never> {
    return ok(`fixed-${error.field}`);
  },
});

const timeoutHandler: EffectHandler<TimeoutError, number> = Object.freeze({
  _tag: "timeout",
  tags: ["Timeout"],
  handle(error: TimeoutError): Result<number, never> {
    return ok(error.ms * 2);
  },
});

// ---------------------------------------------------------------------------
// composeHandlers — basic composition
// ---------------------------------------------------------------------------

describe("composeHandlers", () => {
  it("composes two handlers with different tags", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);

    expect(composed._tag).toBe("notFound+validation");
    expect(composed.tags).toEqual(["NotFound", "Validation"]);
  });

  it("delegates to h1 when error matches h1 tags", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);
    const error: NotFoundError = { _tag: "NotFound", id: "42" };
    const result = composed.handle(error);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("default-for-42");
  });

  it("delegates to h2 when error matches h2 tags", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);
    const error: ValidationError = { _tag: "Validation", field: "email" };
    const result = composed.handle(error);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("fixed-email");
  });

  it("is left-biased: when both handle same tag, h1 wins", () => {
    const h1: EffectHandler<NotFoundError, string> = Object.freeze({
      _tag: "h1",
      tags: ["NotFound"],
      handle(): Result<string, never> {
        return ok("from-h1");
      },
    });

    const h2: EffectHandler<NotFoundError, string> = Object.freeze({
      _tag: "h2",
      tags: ["NotFound"],
      handle(): Result<string, never> {
        return ok("from-h2");
      },
    });

    const composed = composeHandlers(h1, h2);

    // Only h1's tag should appear (deduplicated)
    expect(composed.tags).toEqual(["NotFound"]);

    const result = composed.handle({ _tag: "NotFound", id: "1" });
    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("from-h1");
  });

  it("composing with itself works", () => {
    const composed = composeHandlers(notFoundHandler, notFoundHandler);
    expect(composed.tags).toEqual(["NotFound"]);

    const result = composed.handle({ _tag: "NotFound", id: "x" });
    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("default-for-x");
  });

  it("composed handler is frozen", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);
    expect(Object.isFrozen(composed)).toBe(true);
    expect(Object.isFrozen(composed.tags)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// identityHandler
// ---------------------------------------------------------------------------

describe("identityHandler", () => {
  it("has empty tags", () => {
    expect(identityHandler.tags).toEqual([]);
  });

  it("has _tag 'identity'", () => {
    expect(identityHandler._tag).toBe("identity");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(identityHandler)).toBe(true);
  });

  it("composes with a handler without changing behavior (left identity)", () => {
    const composed = composeHandlers(identityHandler, notFoundHandler);
    const error: NotFoundError = { _tag: "NotFound", id: "99" };
    const result = composed.handle(error);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("default-for-99");
  });

  it("composes with a handler without changing behavior (right identity)", () => {
    const composed = composeHandlers(notFoundHandler, identityHandler);
    const error: NotFoundError = { _tag: "NotFound", id: "99" };
    const result = composed.handle(error);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe("default-for-99");
  });
});

// ---------------------------------------------------------------------------
// transformEffects
// ---------------------------------------------------------------------------

describe("transformEffects", () => {
  it("returns Ok unchanged", () => {
    const result = ok(42);
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isOk()).toBe(true);
    expect(transformed.isOk() && transformed.value).toBe(42);
  });

  it("applies matching handler to Err", () => {
    const result = err({ _tag: "NotFound" as const, id: "123" });
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isOk()).toBe(true);
    expect(transformed.isOk() && transformed.value).toBe("default-for-123");
  });

  it("tries handlers in order, applies first match", () => {
    const result = err({ _tag: "Validation" as const, field: "name" });
    const transformed = transformEffects(result, notFoundHandler, validationHandler);

    expect(transformed.isOk()).toBe(true);
    expect(transformed.isOk() && transformed.value).toBe("fixed-name");
  });

  it("returns original Err if no handler matches", () => {
    const error = { _tag: "Unknown" as const, detail: "oops" };
    const result = err(error);
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isErr()).toBe(true);
    expect(transformed.isErr() && transformed.error).toEqual(error);
  });

  it("handles errors without _tag gracefully", () => {
    const result = err("plain string error");
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isErr()).toBe(true);
    expect(transformed.isErr() && transformed.error).toBe("plain string error");
  });

  it("handles null error gracefully", () => {
    const result = err(null);
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isErr()).toBe(true);
  });

  it("applies chain of multiple handlers", () => {
    const result1 = err({ _tag: "NotFound" as const, id: "1" });
    const result2 = err({ _tag: "Timeout" as const, ms: 5000 });

    const t1 = transformEffects(result1, notFoundHandler, timeoutHandler);
    const t2 = transformEffects(result2, notFoundHandler, timeoutHandler);

    expect(t1.isOk()).toBe(true);
    expect(t1.isOk() && t1.value).toBe("default-for-1");

    expect(t2.isOk()).toBe(true);
    expect(t2.isOk() && t2.value).toBe(10000);
  });

  it("works with composed handlers", () => {
    const composed = composeHandlers(notFoundHandler, validationHandler);
    const result = err({ _tag: "Validation" as const, field: "age" });
    const transformed = transformEffects(result, composed);

    expect(transformed.isOk()).toBe(true);
    expect(transformed.isOk() && transformed.value).toBe("fixed-age");
  });
});

// ---------------------------------------------------------------------------
// Handler algebra laws (property-based)
// ---------------------------------------------------------------------------

describe("Handler algebra laws", () => {
  // Arbitrary tagged error
  const tagArb = fc.constantFrom("NotFound", "Validation", "Timeout");
  const errorArb = tagArb.map(tag => ({
    _tag: tag,
    id: "test",
    field: "test",
    ms: 1000,
  }));

  // Helper: apply a handler to an error and get the result.
  // Uses EffectHandler<never, unknown> which is the variance-correct bound.
  function applyHandler(
    handler: EffectHandler<never, unknown>,
    error: { readonly _tag: string }
  ): Result<unknown, unknown> {
    if (handler.tags.includes(error._tag)) {
      const handleFn = handler.handle as (e: { readonly _tag: string }) => Result<unknown, never>;
      return handleFn(error);
    }
    return err(error);
  }

  it("left identity: composeHandlers(identityHandler, h) behaves like h", () => {
    fc.assert(
      fc.property(errorArb, error => {
        const composed = composeHandlers(identityHandler, notFoundHandler);
        const composedResult = applyHandler(composed, error);
        const directResult = applyHandler(notFoundHandler, error);

        if (composedResult.isOk() && directResult.isOk()) {
          expect(composedResult.value).toEqual(directResult.value);
        } else if (composedResult.isErr() && directResult.isErr()) {
          expect(composedResult.error).toEqual(directResult.error);
        } else {
          expect(composedResult.isOk()).toBe(directResult.isOk());
        }
      })
    );
  });

  it("right identity: composeHandlers(h, identityHandler) behaves like h", () => {
    fc.assert(
      fc.property(errorArb, error => {
        const composed = composeHandlers(notFoundHandler, identityHandler);
        const composedResult = applyHandler(composed, error);
        const directResult = applyHandler(notFoundHandler, error);

        if (composedResult.isOk() && directResult.isOk()) {
          expect(composedResult.value).toEqual(directResult.value);
        } else if (composedResult.isErr() && directResult.isErr()) {
          expect(composedResult.error).toEqual(directResult.error);
        } else {
          expect(composedResult.isOk()).toBe(directResult.isOk());
        }
      })
    );
  });

  it("associativity: compose(compose(a, b), c) behaves like compose(a, compose(b, c))", () => {
    fc.assert(
      fc.property(errorArb, error => {
        const leftAssoc = composeHandlers(
          composeHandlers(notFoundHandler, validationHandler),
          timeoutHandler
        );
        const rightAssoc = composeHandlers(
          notFoundHandler,
          composeHandlers(validationHandler, timeoutHandler)
        );

        const leftResult = applyHandler(leftAssoc, error);
        const rightResult = applyHandler(rightAssoc, error);

        if (leftResult.isOk() && rightResult.isOk()) {
          expect(leftResult.value).toEqual(rightResult.value);
        } else if (leftResult.isErr() && rightResult.isErr()) {
          expect(leftResult.error).toEqual(rightResult.error);
        } else {
          expect(leftResult.isOk()).toBe(rightResult.isOk());
        }
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("handler with empty tags never matches", () => {
    const emptyHandler: EffectHandler<never, string> = Object.freeze({
      _tag: "empty",
      tags: [],
      handle(): Result<string, never> {
        return ok("should not reach");
      },
    });

    const result = err({ _tag: "NotFound" as const, id: "1" });
    const transformed = transformEffects(result, emptyHandler);

    expect(transformed.isErr()).toBe(true);
  });

  it("handler with multiple tags matches any of them", () => {
    const multiHandler: EffectHandler<NotFoundError | ValidationError, string> = Object.freeze({
      _tag: "multi",
      tags: ["NotFound", "Validation"],
      handle(error: NotFoundError | ValidationError): Result<string, never> {
        return ok(`handled-${error._tag}`);
      },
    });

    const r1 = transformEffects(err({ _tag: "NotFound" as const, id: "1" }), multiHandler);
    const r2 = transformEffects(err({ _tag: "Validation" as const, field: "x" }), multiHandler);

    expect(r1.isOk() && r1.value).toBe("handled-NotFound");
    expect(r2.isOk() && r2.value).toBe("handled-Validation");
  });

  it("transformEffects with no handlers returns result unchanged", () => {
    const okResult = ok(42);
    const errResult = err({ _tag: "NotFound" as const, id: "1" });

    const t1 = transformEffects(okResult);
    const t2 = transformEffects(errResult);

    expect(t1.isOk()).toBe(true);
    expect(t1.isOk() && t1.value).toBe(42);
    expect(t2.isErr()).toBe(true);
  });

  it("error with non-string _tag is not matched", () => {
    const result = err({ _tag: 123 });
    const transformed = transformEffects(result, notFoundHandler);

    expect(transformed.isErr()).toBe(true);
  });
});
