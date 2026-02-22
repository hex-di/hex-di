import type {
  MatcherExpression,
  SubjectRef,
  ResourceRef,
  LiteralRef,
  EqMatcher,
  NeqMatcher,
  InMatcher,
  ExistsMatcher,
  FieldMatchMatcher,
  GteMatcher,
  LtMatcher,
  SomeMatchMatcher,
  ContainsMatcher,
  EveryMatchMatcher,
  SizeMatcher,
} from "./types.js";

/** Creates a reference to a subject field by dot-path. */
export function subject(path: string): SubjectRef {
  const ref: SubjectRef = { kind: "subject", path };
  return Object.freeze(ref);
}

/** Creates a reference to a resource field by dot-path. */
export function resource(path: string): ResourceRef {
  const ref: ResourceRef = { kind: "resource", path };
  return Object.freeze(ref);
}

/** Creates a literal value reference. */
export function literal(value: unknown): LiteralRef {
  const ref: LiteralRef = { kind: "literal", value };
  return Object.freeze(ref);
}

/** Creates an equality matcher: attribute === ref value. */
export function eq(ref: SubjectRef | ResourceRef | LiteralRef): EqMatcher {
  const matcher: EqMatcher = { kind: "eq", ref };
  return Object.freeze(matcher);
}

/** Creates an inequality matcher: attribute !== ref value. */
export function neq(ref: SubjectRef | ResourceRef | LiteralRef): NeqMatcher {
  const matcher: NeqMatcher = { kind: "neq", ref };
  return Object.freeze(matcher);
}

/** Creates an inclusion matcher: attribute is in the given values array. */
export function inArray(values: readonly unknown[]): InMatcher {
  const matcher: InMatcher = { kind: "in", values: Object.freeze([...values]) };
  return Object.freeze(matcher);
}

/** Creates an existence matcher: attribute is not null or undefined. */
export function exists(): ExistsMatcher {
  const matcher: ExistsMatcher = { kind: "exists" };
  return Object.freeze(matcher);
}

/** Creates a field-match matcher: matches a nested field of an object attribute. */
export function fieldMatch(field: string, matcher: MatcherExpression): FieldMatchMatcher {
  const m: FieldMatchMatcher = { kind: "fieldMatch", field, matcher };
  return Object.freeze(m);
}

/** Creates a >= numeric matcher. */
export function gte(value: number): GteMatcher {
  const matcher: GteMatcher = { kind: "gte", value };
  return Object.freeze(matcher);
}

/** Creates a < numeric matcher. */
export function lt(value: number): LtMatcher {
  const matcher: LtMatcher = { kind: "lt", value };
  return Object.freeze(matcher);
}

/** Creates a some-match matcher for arrays: any element satisfies the matcher. */
export function someMatch(matcher: MatcherExpression): SomeMatchMatcher {
  const m: SomeMatchMatcher = { kind: "someMatch", matcher };
  return Object.freeze(m);
}

/** Creates a contains matcher: array/string contains the value. */
export function contains(value: unknown): ContainsMatcher {
  const matcher: ContainsMatcher = { kind: "contains", value };
  return Object.freeze(matcher);
}

/** Creates an every-match matcher for arrays: all elements satisfy the matcher. */
export function everyMatch(matcher: MatcherExpression): EveryMatchMatcher {
  const m: EveryMatchMatcher = { kind: "everyMatch", matcher };
  return Object.freeze(m);
}

/** Creates a size matcher: applies matcher to the length of an array or string. */
export function size(matcher: MatcherExpression): SizeMatcher {
  const m: SizeMatcher = { kind: "size", matcher };
  return Object.freeze(m);
}
