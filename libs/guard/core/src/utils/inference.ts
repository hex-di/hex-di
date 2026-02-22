import type { Permission, PermissionConstraint } from "../tokens/permission.js";
import type { Role, RoleConstraint } from "../tokens/role.js";
import type { PolicyConstraint } from "../policy/constraint.js";
import type {
  HasPermissionPolicy,
  HasRolePolicy,
  AllOfPolicy,
  AnyOfPolicy,
  NotPolicy,
  LabeledPolicy,
} from "../policy/types.js";

/**
 * Infers the resource type from a Permission token.
 */
export type InferResource<P extends PermissionConstraint> =
  P extends Permission<infer R, string> ? R : never;

/**
 * Infers the action type from a Permission token.
 */
export type InferAction<P extends PermissionConstraint> =
  P extends Permission<string, infer A> ? A : never;

/**
 * Formats a Permission type as "resource:action" literal.
 */
export type FormatPermission<P extends PermissionConstraint> =
  P extends Permission<infer R, infer A> ? `${R}:${A}` : never;

/**
 * Infers all permissions from a Role token.
 */
export type InferPermissions<R extends RoleConstraint> =
  R extends Role<string, infer P, readonly RoleConstraint[]> ? P[number] : never;

/**
 * Infers the role name from a Role token.
 */
export type InferRoleName<R extends RoleConstraint> =
  R extends Role<infer N, readonly PermissionConstraint[], readonly RoleConstraint[]> ? N : never;

/**
 * Extracted requirements from a composite policy tree.
 */
export interface PolicyRequirements {
  readonly permissions: readonly PermissionConstraint[];
  readonly roleNames: readonly string[];
}

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

/**
 * Extracts all permission and role requirements from a composite policy tree
 * at the type level.
 */
export type InferPolicyRequirements<
  P extends PolicyConstraint,
  TDepth extends number = 20,
> = [TDepth] extends [never]
  ? PolicyRequirements
  : P extends HasPermissionPolicy<infer TPerm>
    ? { readonly permissions: readonly [TPerm]; readonly roleNames: readonly [] }
    : P extends HasRolePolicy<infer TRole>
      ? { readonly permissions: readonly []; readonly roleNames: readonly [TRole] }
      : P extends AllOfPolicy<infer TPolicies>
        ? TPolicies extends readonly [infer H, ...infer Tail]
          ? H extends PolicyConstraint
            ? Tail extends readonly PolicyConstraint[]
              ? MergePolicyRequirements<
                  InferPolicyRequirements<H, Prev[TDepth]>,
                  InferPolicyRequirements<AllOfPolicy<Tail>, Prev[TDepth]>
                >
              : InferPolicyRequirements<H, Prev[TDepth]>
            : PolicyRequirements
          : { readonly permissions: readonly []; readonly roleNames: readonly [] }
        : P extends AnyOfPolicy<infer TPolicies>
          ? TPolicies extends readonly [infer H, ...infer Tail]
            ? H extends PolicyConstraint
              ? Tail extends readonly PolicyConstraint[]
                ? MergePolicyRequirements<
                    InferPolicyRequirements<H, Prev[TDepth]>,
                    InferPolicyRequirements<AnyOfPolicy<Tail>, Prev[TDepth]>
                  >
                : InferPolicyRequirements<H, Prev[TDepth]>
              : PolicyRequirements
            : { readonly permissions: readonly []; readonly roleNames: readonly [] }
          : P extends NotPolicy<infer TInner>
            ? InferPolicyRequirements<TInner, Prev[TDepth]>
            : P extends LabeledPolicy<infer TInner>
              ? InferPolicyRequirements<TInner, Prev[TDepth]>
              : PolicyRequirements;

type MergePolicyRequirements<A extends PolicyRequirements, B extends PolicyRequirements> = {
  readonly permissions: readonly [...A["permissions"], ...B["permissions"]];
  readonly roleNames: readonly [...A["roleNames"], ...B["roleNames"]];
};
