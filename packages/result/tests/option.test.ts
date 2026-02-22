import { describe, it, expect } from "vitest";
import { some, none, isOption, fromNullable, fromOptionJSON, OPTION_BRAND } from "../src/option/index.js";
import { UnwrapError } from "../src/unsafe/unwrap-error.js";
import { ok, err } from "../src/core/result.js";
import type { Option } from "../src/option/types.js";

describe("Option", () => {
  // =========================================================================
  // BEH-09-001: OPTION_BRAND unique symbol
  // =========================================================================
  describe("BEH-09-001: OPTION_BRAND unique symbol for Option identity", () => {
    it("OPTION_BRAND is a symbol", () => {
      expect(typeof OPTION_BRAND).toBe("symbol");
    });

    it("OPTION_BRAND description is 'Option'", () => {
      expect(OPTION_BRAND.description).toBe("Option");
    });
  });

  // =========================================================================
  // Type guards (isSome / isNone)
  // =========================================================================
  describe("BEH-09-002: Some<T> / BEH-09-003: None – isSome / isNone type guards", () => {
    it("some(42).isSome() returns true", () => {
      expect(some(42).isSome()).toBe(true);
    });

    it("some(42).isNone() returns false", () => {
      expect(some(42).isNone()).toBe(false);
    });

    it("none().isSome() returns false", () => {
      expect(none().isSome()).toBe(false);
    });

    it("none().isNone() returns true", () => {
      expect(none().isNone()).toBe(true);
    });
  });

  // =========================================================================
  // isSomeAnd
  // =========================================================================
  describe("BEH-09-002: isSomeAnd – Some conditional guard / BEH-09-003: None returns false", () => {
    it("some(5).isSomeAnd(v => v > 3) returns true", () => {
      expect(some(5).isSomeAnd(v => v > 3)).toBe(true);
    });

    it("some(1).isSomeAnd(v => v > 3) returns false", () => {
      expect(some(1).isSomeAnd(v => v > 3)).toBe(false);
    });

    it("none().isSomeAnd() returns false", () => {
      const opt: Option<number> = none();
      expect(opt.isSomeAnd(v => v > 3)).toBe(false);
    });
  });

  // =========================================================================
  // Frozen (INV-10)
  // =========================================================================
  describe("INV-10: frozen instances – all Option instances are Object.freeze()d", () => {
    it("some(42) is frozen", () => {
      expect(Object.isFrozen(some(42))).toBe(true);
    });

    it("none() is frozen", () => {
      expect(Object.isFrozen(none())).toBe(true);
    });
  });

  // =========================================================================
  // Brand / isOption (BEH-09-007, INV-11)
  // =========================================================================
  describe("BEH-09-007 / INV-11: isOption – brand-based type guard and forgery prevention", () => {
    it("isOption(some(1)) returns true", () => {
      expect(isOption(some(1))).toBe(true);
    });

    it("isOption(none()) returns true", () => {
      expect(isOption(none())).toBe(true);
    });

    it("isOption rejects fake object without brand", () => {
      expect(isOption({ _tag: "Some", value: 1 })).toBe(false);
    });

    it("isOption(null) returns false", () => {
      expect(isOption(null)).toBe(false);
    });

    it("isOption(undefined) returns false", () => {
      expect(isOption(undefined)).toBe(false);
    });

    it("isOption('string') returns false", () => {
      expect(isOption("string")).toBe(false);
    });

    it("isOption(42) returns false", () => {
      expect(isOption(42)).toBe(false);
    });

    it("brand symbol is present on some()", () => {
      expect(OPTION_BRAND in some(1)).toBe(true);
    });

    it("brand symbol is present on none()", () => {
      expect(OPTION_BRAND in none()).toBe(true);
    });
  });

  // =========================================================================
  // none() singleton (BEH-09-006)
  // =========================================================================
  describe("BEH-09-006: none() returns frozen None singleton with OPTION_BRAND", () => {
    it("none() always returns the same instance", () => {
      expect(none()).toBe(none());
    });
  });

  // =========================================================================
  // map
  // =========================================================================
  describe("BEH-09-002: map – Some transformation / BEH-09-003: None passthrough", () => {
    it("some(2).map(x => x * 3) returns some(6)", () => {
      const result = some(2).map(x => x * 3);
      expect(result._tag).toBe("Some");
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe(6);
      }
    });

    it("none().map(x => x * 3) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.map(x => x * 3);
      expect(result._tag).toBe("None");
      expect(result.isNone()).toBe(true);
    });
  });

  // =========================================================================
  // andThen
  // =========================================================================
  describe("BEH-09-002: andThen – Some chaining / BEH-09-003: None passthrough", () => {
    it("some(2).andThen(x => some(x * 3)) returns some(6)", () => {
      const result = some(2).andThen(x => some(x * 3));
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(6);
      }
    });

    it("some(2).andThen(() => none()) returns none", () => {
      const result = some(2).andThen(() => none());
      expect(result._tag).toBe("None");
    });

    it("none().andThen(x => some(x)) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.andThen(x => some(x));
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // filter
  // =========================================================================
  describe("BEH-09-002: filter – Some filtering / BEH-09-003: None passthrough", () => {
    it("some(4).filter(x => x > 2) returns some(4)", () => {
      const result = some(4).filter(x => x > 2);
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(4);
      }
    });

    it("some(1).filter(x => x > 2) returns none", () => {
      const result = some(1).filter(x => x > 2);
      expect(result._tag).toBe("None");
    });

    it("none().filter() returns none", () => {
      const opt: Option<number> = none();
      const result = opt.filter(x => x > 2);
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // unwrapOr
  // =========================================================================
  describe("BEH-09-002: unwrapOr – Some extraction / BEH-09-003: None default", () => {
    it("some(42).unwrapOr(0) returns 42", () => {
      expect(some(42).unwrapOr(0)).toBe(42);
    });

    it("none().unwrapOr(0) returns 0", () => {
      expect(none().unwrapOr(0)).toBe(0);
    });
  });

  // =========================================================================
  // match
  // =========================================================================
  describe("BEH-09-002: match – Some/BEH-09-003: None pattern matching", () => {
    it("some(5).match returns onSome result", () => {
      const result = some(5).match(
        v => v * 2,
        () => 0,
      );
      expect(result).toBe(10);
    });

    it("none().match returns onNone result", () => {
      const opt: Option<number> = none();
      const result = opt.match(
        v => v * 2,
        () => 0,
      );
      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // toResult
  // =========================================================================
  describe("BEH-09-002: toResult – Some conversion / BEH-09-003: None conversion", () => {
    it("some(42).toResult() returns ok(42)", () => {
      const result = some(42).toResult(() => "missing");
      expect(result._tag).toBe("Ok");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("none().toResult(() => 'missing') returns err('missing')", () => {
      const opt: Option<number> = none();
      const result = opt.toResult(() => "missing");
      expect(result._tag).toBe("Err");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("missing");
      }
    });
  });

  // =========================================================================
  // fromNullable
  // =========================================================================
  describe("BEH-09-008: fromNullable – converts nullable to Option", () => {
    it("fromNullable(null) returns none", () => {
      const result = fromNullable(null);
      expect(result._tag).toBe("None");
      expect(result.isNone()).toBe(true);
    });

    it("fromNullable(undefined) returns none", () => {
      const result = fromNullable(undefined);
      expect(result._tag).toBe("None");
      expect(result.isNone()).toBe(true);
    });

    it("fromNullable(42) returns some(42)", () => {
      const result = fromNullable(42);
      expect(result._tag).toBe("Some");
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe(42);
      }
    });

    it("fromNullable('hello') returns some('hello')", () => {
      const result = fromNullable("hello");
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe("hello");
      }
    });

    it("fromNullable(0) returns some(0) (falsy but not null/undefined)", () => {
      const result = fromNullable(0);
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe(0);
      }
    });

    it("fromNullable('') returns some('') (falsy but not null/undefined)", () => {
      const result = fromNullable("");
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe("");
      }
    });

    it("fromNullable(false) returns some(false) (falsy but not null/undefined)", () => {
      const result = fromNullable(false);
      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value).toBe(false);
      }
    });
  });

  // =========================================================================
  // flatten
  // =========================================================================
  describe("BEH-09-002: flatten – Some chaining / BEH-09-003: None passthrough", () => {
    it("some(some(42)).flatten() returns some(42)", () => {
      const nested = some(some(42));
      const result = nested.flatten();
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(42);
      }
    });

    it("some(none()).flatten() returns none", () => {
      const nested = some(none());
      const result = nested.flatten();
      expect(result._tag).toBe("None");
    });

    it("none().flatten() returns none", () => {
      const opt: Option<Option<number>> = none();
      const result = opt.flatten();
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // zip
  // =========================================================================
  describe("BEH-09-002: zip – Some combining / BEH-09-003: None passthrough", () => {
    it("some(1).zip(some('a')) returns some([1, 'a'])", () => {
      const result = some(1).zip(some("a"));
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toEqual([1, "a"]);
      }
    });

    it("some(1).zip(none()) returns none", () => {
      const result = some(1).zip(none());
      expect(result._tag).toBe("None");
    });

    it("none().zip(some(1)) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.zip(some(1));
      expect(result._tag).toBe("None");
    });

    it("none().zip(none()) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.zip(none());
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // zipWith
  // =========================================================================
  describe("BEH-09-002: zipWith – Some combining / BEH-09-003: None passthrough", () => {
    it("some(1).zipWith(some(2), (a, b) => a + b) returns some(3)", () => {
      const result = some(1).zipWith(some(2), (a, b) => a + b);
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(3);
      }
    });

    it("some(1).zipWith(none(), (a, b) => a + b) returns none", () => {
      const result = some(1).zipWith(none() as Option<number>, (a, b) => a + b);
      expect(result._tag).toBe("None");
    });

    it("none().zipWith(some(1), f) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.zipWith(some(1), (_a, _b) => 0);
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // toJSON (BEH-09-009)
  // =========================================================================
  describe("BEH-09-009: toJSON – serializes Option to JSON with _schemaVersion", () => {
    it("some(42).toJSON() returns correct structure", () => {
      expect(some(42).toJSON()).toEqual({
        _tag: "Some",
        _schemaVersion: 1,
        value: 42,
      });
    });

    it("none().toJSON() returns correct structure", () => {
      expect(none().toJSON()).toEqual({
        _tag: "None",
        _schemaVersion: 1,
      });
    });

    it("JSON.stringify integration with Some", () => {
      const json = JSON.stringify(some({ name: "Alice" }));
      const parsed = JSON.parse(json) as { _tag: string; _schemaVersion: number; value: unknown };
      expect(parsed._tag).toBe("Some");
      expect(parsed._schemaVersion).toBe(1);
      expect(parsed.value).toEqual({ name: "Alice" });
    });

    it("JSON.stringify integration with None", () => {
      const json = JSON.stringify(none());
      const parsed = JSON.parse(json) as { _tag: string; _schemaVersion: number };
      expect(parsed._tag).toBe("None");
      expect(parsed._schemaVersion).toBe(1);
    });
  });

  // =========================================================================
  // expect
  // =========================================================================
  describe("BEH-09-002: expect – Some extraction / BEH-09-003: None throws", () => {
    it("some(42).expect('msg') returns 42", () => {
      expect(some(42).expect("should have value")).toBe(42);
    });

    it("none().expect('msg') throws UnwrapError", () => {
      expect(() => none().expect("value was missing")).toThrow(UnwrapError);
      expect(() => none().expect("value was missing")).toThrow("value was missing");
    });
  });

  // =========================================================================
  // orElse
  // =========================================================================
  describe("BEH-09-002: orElse – Some passthrough / BEH-09-003: None fallback", () => {
    it("some(1).orElse(() => some(2)) returns some(1)", () => {
      const result = some(1).orElse(() => some(2));
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(1);
      }
    });

    it("none().orElse(() => some(2)) returns some(2)", () => {
      const opt: Option<number> = none();
      const result = opt.orElse(() => some(2));
      expect(result._tag).toBe("Some");
      if (result.isSome()) {
        expect(result.value).toBe(2);
      }
    });

    it("none().orElse(() => none()) returns none", () => {
      const opt: Option<number> = none();
      const result = opt.orElse(() => none());
      expect(result._tag).toBe("None");
    });
  });

  // =========================================================================
  // toNullable / toUndefined
  // =========================================================================
  describe("BEH-09-002: toNullable – Some extraction / BEH-09-003: None returns null", () => {
    it("some(42).toNullable() returns 42", () => {
      expect(some(42).toNullable()).toBe(42);
    });

    it("none().toNullable() returns null", () => {
      expect(none().toNullable()).toBeNull();
    });
  });

  describe("BEH-09-002: toUndefined – Some extraction / BEH-09-003: None returns undefined", () => {
    it("some(42).toUndefined() returns 42", () => {
      expect(some(42).toUndefined()).toBe(42);
    });

    it("none().toUndefined() returns undefined", () => {
      expect(none().toUndefined()).toBeUndefined();
    });
  });

  // =========================================================================
  // transpose (bridge)
  // =========================================================================
  describe("BEH-09-002: transpose – Some bridge / BEH-09-003: None bridge", () => {
    it("some(ok(42)).transpose() returns ok(some(42))", () => {
      const opt = some(ok(42));
      const result = opt.transpose();
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        const inner = result.value;
        expect(inner._tag).toBe("Some");
        if (inner.isSome()) {
          expect(inner.value).toBe(42);
        }
      }
    });

    it("some(err('fail')).transpose() returns err('fail')", () => {
      const opt = some(err("fail"));
      const result = opt.transpose();
      expect(result._tag).toBe("Err");
      if (result.isErr()) {
        expect(result.error).toBe("fail");
      }
    });

    it("none().transpose() returns ok(none())", () => {
      const opt: Option<ReturnType<typeof ok<number>>> = none();
      const result = opt.transpose();
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value._tag).toBe("None");
      }
    });
  });

  // =========================================================================
  // fromOptionJSON (BEH-09-010)
  // =========================================================================
  describe("BEH-09-010: fromOptionJSON – deserializes JSON back to branded frozen Option", () => {
    it("round-trips some(42) through toJSON/fromOptionJSON", () => {
      const original = some(42);
      const restored = fromOptionJSON(original.toJSON());
      expect(restored._tag).toBe("Some");
      if (restored.isSome()) {
        expect(restored.value).toBe(42);
      }
    });

    it("round-trips none() through toJSON/fromOptionJSON", () => {
      const original = none();
      const restored = fromOptionJSON(original.toJSON());
      expect(restored._tag).toBe("None");
      expect(restored.isNone()).toBe(true);
    });

    it("accepts legacy format without _schemaVersion", () => {
      const restored = fromOptionJSON({ _tag: "Some", value: "hello" });
      expect(restored._tag).toBe("Some");
      if (restored.isSome()) {
        expect(restored.value).toBe("hello");
      }
    });

    it("accepts legacy None format without _schemaVersion", () => {
      const restored = fromOptionJSON({ _tag: "None" });
      expect(restored._tag).toBe("None");
    });

    it("throws TypeError for invalid _tag", () => {
      expect(() => fromOptionJSON({ _tag: "Invalid" } as never)).toThrow(TypeError);
    });

    it("restored Option is frozen", () => {
      const restored = fromOptionJSON({ _tag: "Some", _schemaVersion: 1, value: 99 });
      expect(Object.isFrozen(restored)).toBe(true);
    });

    it("restored Option is a genuine Option (isOption)", () => {
      const restored = fromOptionJSON({ _tag: "Some", _schemaVersion: 1, value: 1 });
      expect(isOption(restored)).toBe(true);
    });
  });

  // =========================================================================
  // _tag discriminant
  // =========================================================================
  describe("BEH-09-004: _tag discriminant – Option<T> discriminated union (Some | None)", () => {
    it("some() has _tag 'Some'", () => {
      expect(some(1)._tag).toBe("Some");
    });

    it("none() has _tag 'None'", () => {
      expect(none()._tag).toBe("None");
    });
  });

  // =========================================================================
  // value property
  // =========================================================================
  describe("BEH-09-005: value property – some(value) creates frozen Some instance with OPTION_BRAND", () => {
    it("some(42) has value 42", () => {
      expect(some(42).value).toBe(42);
    });

    it("some('hello') has value 'hello'", () => {
      expect(some("hello").value).toBe("hello");
    });
  });
});
