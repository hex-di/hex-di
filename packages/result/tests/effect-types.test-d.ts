import { describe, it, expectTypeOf } from "vitest";
import type { Result } from "../src/core/types.js";
import type { ResultAsync } from "../src/core/types.js";
import type {
  EffectOf,
  PureResult,
  EffectfulResult,
  MaskEffects,
  LiftEffect,
  IsEffectFree,
  EffectUnion,
} from "../src/effect-types.js";

// EffectOf
describe("EffectOf", () => {
  it("extracts error from Result", () => {
    type R = Result<string, Error>;
    expectTypeOf<EffectOf<R>>().toEqualTypeOf<Error>();
  });

  it("extracts error from ResultAsync", () => {
    type R = ResultAsync<string, Error>;
    expectTypeOf<EffectOf<R>>().toEqualTypeOf<Error>();
  });

  it("returns never for non-Result", () => {
    expectTypeOf<EffectOf<string>>().toEqualTypeOf<never>();
  });

  it("returns never for pure Result", () => {
    type R = Result<string, never>;
    expectTypeOf<EffectOf<R>>().toEqualTypeOf<never>();
  });
});

// PureResult
describe("PureResult", () => {
  it("is Result with never error", () => {
    expectTypeOf<PureResult<string>>().toEqualTypeOf<Result<string, never>>();
  });
});

// EffectfulResult
describe("EffectfulResult", () => {
  it("returns Result for non-never error", () => {
    expectTypeOf<EffectfulResult<string, Error>>().toEqualTypeOf<Result<string, Error>>();
  });

  it("returns never for never error", () => {
    expectTypeOf<EffectfulResult<string, never>>().toEqualTypeOf<never>();
  });
});

// MaskEffects
describe("MaskEffects", () => {
  type NotFound = { _tag: "NotFound" };
  type Timeout = { _tag: "Timeout" };
  type Forbidden = { _tag: "Forbidden" };

  it("removes specific effect", () => {
    type R = Result<string, NotFound | Timeout | Forbidden>;
    type Masked = MaskEffects<R, Timeout>;
    expectTypeOf<Masked>().toEqualTypeOf<Result<string, NotFound | Forbidden>>();
  });

  it("removes all effects", () => {
    type R = Result<string, NotFound | Timeout>;
    type Masked = MaskEffects<R, NotFound | Timeout>;
    expectTypeOf<Masked>().toEqualTypeOf<Result<string, never>>();
  });
});

// LiftEffect
describe("LiftEffect", () => {
  type NotFound = { _tag: "NotFound" };
  type Timeout = { _tag: "Timeout" };

  it("adds effect to error type", () => {
    type R = Result<string, NotFound>;
    type Lifted = LiftEffect<R, Timeout>;
    expectTypeOf<Lifted>().toEqualTypeOf<Result<string, NotFound | Timeout>>();
  });
});

// IsEffectFree
describe("IsEffectFree", () => {
  it("returns true for pure", () => {
    expectTypeOf<IsEffectFree<Result<string, never>>>().toEqualTypeOf<true>();
  });

  it("returns false for effectful", () => {
    expectTypeOf<IsEffectFree<Result<string, Error>>>().toEqualTypeOf<false>();
  });
});

// EffectUnion
describe("EffectUnion", () => {
  type NotFound = { _tag: "NotFound" };
  type Timeout = { _tag: "Timeout" };
  type Forbidden = { _tag: "Forbidden" };

  it("unions all effects from tuple", () => {
    type Rs = [Result<string, NotFound>, Result<number, Timeout>, Result<boolean, Forbidden>];
    expectTypeOf<EffectUnion<Rs>>().toEqualTypeOf<NotFound | Timeout | Forbidden>();
  });
});
