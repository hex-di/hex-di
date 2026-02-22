import { expectTypeOf, describe, it } from "vitest";
import {
  someMatch,
  contains,
  everyMatch,
  size,
} from "../src/policy/matchers.js";
import type {
  SomeMatchMatcher,
  ContainsMatcher,
  EveryMatchMatcher,
  SizeMatcher,
  MatcherExpression,
} from "../src/policy/types.js";

describe("Array matcher builder — type-level tests", () => {
  it("someMatch returns SomeMatchMatcher", () => {
    expectTypeOf(someMatch).returns.toEqualTypeOf<SomeMatchMatcher>();
  });

  it("someMatch accepts a MatcherExpression", () => {
    expectTypeOf(someMatch).parameter(0).toEqualTypeOf<MatcherExpression>();
  });

  it("contains returns ContainsMatcher", () => {
    expectTypeOf(contains).returns.toEqualTypeOf<ContainsMatcher>();
  });

  it("contains accepts an unknown value", () => {
    expectTypeOf(contains).parameter(0).toEqualTypeOf<unknown>();
  });

  it("everyMatch returns EveryMatchMatcher", () => {
    expectTypeOf(everyMatch).returns.toEqualTypeOf<EveryMatchMatcher>();
  });

  it("everyMatch accepts a MatcherExpression", () => {
    expectTypeOf(everyMatch).parameter(0).toEqualTypeOf<MatcherExpression>();
  });

  it("size returns SizeMatcher", () => {
    expectTypeOf(size).returns.toEqualTypeOf<SizeMatcher>();
  });

  it("size accepts a MatcherExpression", () => {
    expectTypeOf(size).parameter(0).toEqualTypeOf<MatcherExpression>();
  });
});
