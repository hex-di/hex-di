import type { PermissionConstraint } from "../tokens/permission.js";
import type { PolicyConstraint } from "./constraint.js";

/**
 * Strategy for merging visible field sets in composite policies.
 *
 * - `"intersection"`: fields visible in ALL allowing children (least-privilege, default for allOf)
 * - `"union"`: fields visible in ANY allowing child (maximum visibility, used with anyOf)
 * - `"first"`: fields from the first allowing child (short-circuit, default for anyOf)
 */
export type FieldStrategy = "intersection" | "union" | "first";

// ── Matcher expression types ─────────────────────────────────────────────────

export type SubjectRef = { readonly kind: "subject"; readonly path: string };
export type ResourceRef = { readonly kind: "resource"; readonly path: string };
export type LiteralRef = { readonly kind: "literal"; readonly value: unknown };

export type ValueRef = SubjectRef | ResourceRef | LiteralRef;

export type EqMatcher = { readonly kind: "eq"; readonly ref: ValueRef };
export type NeqMatcher = { readonly kind: "neq"; readonly ref: ValueRef };
export type InMatcher = { readonly kind: "in"; readonly values: readonly unknown[] };
export type ExistsMatcher = { readonly kind: "exists" };
export type FieldMatchMatcher = {
  readonly kind: "fieldMatch";
  readonly field: string;
  readonly matcher: MatcherExpression;
};
export type GteMatcher = { readonly kind: "gte"; readonly value: number };
export type LtMatcher = { readonly kind: "lt"; readonly value: number };
export type SomeMatchMatcher = {
  readonly kind: "someMatch";
  readonly matcher: MatcherExpression;
};
export type ContainsMatcher = { readonly kind: "contains"; readonly value: unknown };
export type EveryMatchMatcher = {
  readonly kind: "everyMatch";
  readonly matcher: MatcherExpression;
};
export type SizeMatcher = { readonly kind: "size"; readonly matcher: MatcherExpression };

export type MatcherExpression =
  | EqMatcher
  | NeqMatcher
  | InMatcher
  | ExistsMatcher
  | FieldMatchMatcher
  | GteMatcher
  | LtMatcher
  | SomeMatchMatcher
  | ContainsMatcher
  | EveryMatchMatcher
  | SizeMatcher;

// ── Leaf Policy Interfaces ───────────────────────────────────────────────────

export interface HasPermissionPolicy<TPermission extends PermissionConstraint = PermissionConstraint> {
  readonly kind: "hasPermission";
  readonly permission: TPermission;
  readonly fields?: ReadonlyArray<string>;
}

export interface HasRolePolicy<TRoleName extends string = string> {
  readonly kind: "hasRole";
  readonly roleName: TRoleName;
}

export interface HasAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasAttribute";
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
  readonly fields?: ReadonlyArray<string>;
}

export interface HasResourceAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasResourceAttribute";
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
  readonly fields?: ReadonlyArray<string>;
}

export interface HasSignaturePolicy<TMeaning extends string = string> {
  readonly kind: "hasSignature";
  readonly meaning: TMeaning;
  readonly signerRole?: string;
}

export interface HasRelationshipPolicy<TRelation extends string = string> {
  readonly kind: "hasRelationship";
  readonly relation: TRelation;
  readonly resourceType?: string;
  readonly depth?: number;
  readonly fields?: ReadonlyArray<string>;
}

// ── Composite Policy Interfaces ──────────────────────────────────────────────

export interface AllOfPolicy<TPolicies extends readonly PolicyConstraint[] = readonly PolicyConstraint[]> {
  readonly kind: "allOf";
  readonly policies: TPolicies;
  /** Field merge strategy. Default: "intersection" (least-privilege). */
  readonly fieldStrategy?: FieldStrategy;
}

export interface AnyOfPolicy<TPolicies extends readonly PolicyConstraint[] = readonly PolicyConstraint[]> {
  readonly kind: "anyOf";
  readonly policies: TPolicies;
  /**
   * Field merge strategy. Default: "first" (short-circuit).
   * Use "union" to evaluate ALL children and merge their field sets.
   */
  readonly fieldStrategy?: FieldStrategy;
}

export interface NotPolicy<TPolicy extends PolicyConstraint = PolicyConstraint> {
  readonly kind: "not";
  readonly policy: TPolicy;
}

export interface LabeledPolicy<TPolicy extends PolicyConstraint = PolicyConstraint> {
  readonly kind: "labeled";
  readonly label: string;
  readonly policy: TPolicy;
}

/**
 * Union of all policy types.
 */
export type Policy =
  | HasPermissionPolicy
  | HasRolePolicy
  | HasAttributePolicy
  | HasResourceAttributePolicy
  | HasSignaturePolicy
  | HasRelationshipPolicy
  | AllOfPolicy
  | AnyOfPolicy
  | NotPolicy
  | LabeledPolicy;

/**
 * Type guard: narrows a PolicyConstraint to the full Policy discriminated union.
 * Enables switch-case exhaustiveness checking without casts.
 */
export function isPolicy(p: PolicyConstraint): p is Policy {
  return (
    p.kind === "hasPermission" ||
    p.kind === "hasRole" ||
    p.kind === "hasAttribute" ||
    p.kind === "hasResourceAttribute" ||
    p.kind === "hasSignature" ||
    p.kind === "hasRelationship" ||
    p.kind === "allOf" ||
    p.kind === "anyOf" ||
    p.kind === "not" ||
    p.kind === "labeled"
  );
}
