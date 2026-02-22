import type { PermissionConstraint } from "../tokens/permission.js";
import type { RoleConstraint } from "../tokens/role.js";
import type { PolicyConstraint } from "./constraint.js";
import type { MatcherExpression, FieldStrategy } from "./types.js";
import type {
  HasPermissionPolicy,
  HasRolePolicy,
  HasAttributePolicy,
  HasResourceAttributePolicy,
  HasSignaturePolicy,
  HasRelationshipPolicy,
  AllOfPolicy,
  AnyOfPolicy,
  NotPolicy,
  LabeledPolicy,
} from "./types.js";

export type { FieldStrategy };

/**
 * Options for combinator policies (allOf, anyOf).
 */
export interface CombinatorOptions {
  /** Strategy for merging visible field sets across child policies. */
  readonly fieldStrategy?: FieldStrategy;
}

/**
 * Type guard: returns true if the value is a CombinatorOptions, not a PolicyConstraint.
 */
function isCombinatorOptions(
  value: PolicyConstraint | CombinatorOptions | undefined,
): value is CombinatorOptions {
  if (value === undefined || value === null || typeof value !== "object") return false;
  return !("kind" in value) && "fieldStrategy" in value;
}

/**
 * Creates a hasPermission policy.
 */
export function hasPermission<TPermission extends PermissionConstraint>(
  permission: TPermission,
  options?: { readonly fields?: ReadonlyArray<string> },
): HasPermissionPolicy<TPermission> {
  const policy: HasPermissionPolicy<TPermission> = {
    kind: "hasPermission",
    permission,
    fields: options?.fields !== undefined ? Object.freeze([...options.fields]) : undefined,
  };
  return Object.freeze(policy);
}

/**
 * Creates a hasRole policy.
 */
export function hasRole<const TRoleName extends string>(
  roleName: TRoleName,
): HasRolePolicy<TRoleName> {
  const policy: HasRolePolicy<TRoleName> = { kind: "hasRole", roleName };
  return Object.freeze(policy);
}

/**
 * Creates a hasAttribute policy using the matcher DSL.
 */
export function hasAttribute<const TAttribute extends string>(
  attribute: TAttribute,
  matcher: MatcherExpression,
  options?: { readonly fields?: ReadonlyArray<string> },
): HasAttributePolicy<TAttribute> {
  const policy: HasAttributePolicy<TAttribute> = {
    kind: "hasAttribute",
    attribute,
    matcher,
    fields: options?.fields !== undefined ? Object.freeze([...options.fields]) : undefined,
  };
  return Object.freeze(policy);
}

/**
 * Creates a hasResourceAttribute policy using the matcher DSL.
 */
export function hasResourceAttribute<const TAttribute extends string>(
  attribute: TAttribute,
  matcher: MatcherExpression,
  options?: { readonly fields?: ReadonlyArray<string> },
): HasResourceAttributePolicy<TAttribute> {
  const policy: HasResourceAttributePolicy<TAttribute> = {
    kind: "hasResourceAttribute",
    attribute,
    matcher,
    fields: options?.fields !== undefined ? Object.freeze([...options.fields]) : undefined,
  };
  return Object.freeze(policy);
}

/**
 * Creates a hasSignature policy for 21 CFR Part 11 compliance.
 */
export function hasSignature<const TMeaning extends string>(
  meaning: TMeaning,
  options?: { readonly signerRole?: string },
): HasSignaturePolicy<TMeaning> {
  const policy: HasSignaturePolicy<TMeaning> = {
    kind: "hasSignature",
    meaning,
    signerRole: options?.signerRole,
  };
  return Object.freeze(policy);
}

/**
 * Creates a hasRelationship policy for graph-traversal relationship checks.
 */
export function hasRelationship<const TRelation extends string>(
  relation: TRelation,
  options?: {
    readonly resourceType?: string;
    readonly depth?: number;
    readonly fields?: ReadonlyArray<string>;
  },
): HasRelationshipPolicy<TRelation> {
  const policy: HasRelationshipPolicy<TRelation> = {
    kind: "hasRelationship",
    relation,
    resourceType: options?.resourceType,
    depth: options?.depth,
    fields: options?.fields !== undefined ? Object.freeze([...options.fields]) : undefined,
  };
  return Object.freeze(policy);
}

/**
 * Creates an allOf policy: ALL child policies must pass.
 * Accepts an optional trailing CombinatorOptions to configure field strategy.
 */
export function allOf<const TPolicies extends readonly PolicyConstraint[]>(
  ...policies: TPolicies
): AllOfPolicy<TPolicies>;
export function allOf<const TPolicies extends readonly PolicyConstraint[]>(
  ...args: [...TPolicies, CombinatorOptions]
): AllOfPolicy<TPolicies>;
export function allOf(
  ...args: readonly (PolicyConstraint | CombinatorOptions)[]
): AllOfPolicy<readonly PolicyConstraint[]> {
  const lastArg = args[args.length - 1];
  const hasOptions = isCombinatorOptions(lastArg);

  const policyArgs = hasOptions ? args.slice(0, -1) : args;
  const policies: PolicyConstraint[] = [];
  for (const arg of policyArgs) {
    if ("kind" in arg) {
      policies.push(arg);
    }
  }

  const result: AllOfPolicy<readonly PolicyConstraint[]> = {
    kind: "allOf",
    policies: Object.freeze(policies),
    fieldStrategy: hasOptions ? lastArg.fieldStrategy : undefined,
  };
  return Object.freeze(result);
}

/**
 * Creates an anyOf policy: ANY child policy must pass.
 * Accepts an optional trailing CombinatorOptions to configure field strategy.
 * With `fieldStrategy: "union"`, evaluates ALL children even after first allow.
 */
export function anyOf<const TPolicies extends readonly PolicyConstraint[]>(
  ...policies: TPolicies
): AnyOfPolicy<TPolicies>;
export function anyOf<const TPolicies extends readonly PolicyConstraint[]>(
  ...args: [...TPolicies, CombinatorOptions]
): AnyOfPolicy<TPolicies>;
export function anyOf(
  ...args: readonly (PolicyConstraint | CombinatorOptions)[]
): AnyOfPolicy<readonly PolicyConstraint[]> {
  const lastArg = args[args.length - 1];
  const hasOptions = isCombinatorOptions(lastArg);

  const policyArgs = hasOptions ? args.slice(0, -1) : args;
  const policies: PolicyConstraint[] = [];
  for (const arg of policyArgs) {
    if ("kind" in arg) {
      policies.push(arg);
    }
  }

  const result: AnyOfPolicy<readonly PolicyConstraint[]> = {
    kind: "anyOf",
    policies: Object.freeze(policies),
    fieldStrategy: hasOptions ? lastArg.fieldStrategy : undefined,
  };
  return Object.freeze(result);
}

/**
 * Creates a not policy: negates the child policy.
 */
export function not<const TPolicy extends PolicyConstraint>(
  policy: TPolicy,
): NotPolicy<TPolicy> {
  const result: NotPolicy<TPolicy> = { kind: "not", policy };
  return Object.freeze(result);
}

/**
 * Creates a labeled policy: wraps a policy with a human-readable name.
 */
export function withLabel<const TPolicy extends PolicyConstraint>(
  label: string,
  policy: TPolicy,
): LabeledPolicy<TPolicy> {
  const result: LabeledPolicy<TPolicy> = { kind: "labeled", label, policy };
  return Object.freeze(result);
}

/**
 * Creates an anyOf policy from a list of roles.
 * The subject must have at least one of the listed roles.
 * Accepts either role names (strings) or role tokens.
 */
export function anyOfRoles(
  roles: readonly (string | RoleConstraint)[],
): AnyOfPolicy<readonly HasRolePolicy[]> {
  const policies = roles.map((r) =>
    hasRole(typeof r === "string" ? r : r.name),
  );
  return anyOf(...policies);
}
