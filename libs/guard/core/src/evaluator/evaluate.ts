import { ok, err, assertNever, fromThrowable } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { PolicyConstraint } from "../policy/constraint.js";
import type { Policy } from "../policy/types.js";
import { isPolicy } from "../policy/types.js";
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
  MatcherExpression,
} from "../policy/types.js";
import type { AuthSubject } from "../subject/auth-subject.js";
import type { PolicyEvaluationError } from "../errors/types.js";
import type { Decision, Allow, Deny, EvaluationTrace } from "./decision.js";
import { buildTrace } from "./trace.js";
import { createPolicyEvaluationError } from "./errors.js";
import { formatPermission } from "../tokens/permission.js";
import type { RelationshipResolver } from "./rebac.js";
import type { FieldStrategy } from "../policy/types.js";

/** Arbitrary resource attributes for attribute-based policies. */
export type Resource = Readonly<Record<string, unknown>>;

/**
 * A validated electronic signature attached to the evaluation context.
 */
export interface ValidatedSignature {
  readonly signerId: string;
  readonly signedAt: string;
  readonly meaning: string;
  readonly validated: boolean;
  readonly reauthenticated: boolean;
  readonly signerRoles?: ReadonlyArray<string>;
}

/**
 * The context provided to the evaluate function.
 */
export interface EvaluationContext {
  readonly subject: AuthSubject;
  readonly resource?: Resource;
  readonly signatures?: ReadonlyArray<ValidatedSignature>;
  readonly evaluationId?: string;
  readonly evaluatedAt?: string;
  /** Optional relationship resolver for ReBAC policies. */
  readonly relationshipResolver?: RelationshipResolver;
}

/**
 * Options for evaluation behavior.
 */
export interface EvaluateOptions {
  readonly maxDepth?: number;
}

/**
 * A record mapping named keys to policies.
 */
export type PoliciesMap = Readonly<Record<string, PolicyConstraint>>;

const DEFAULT_MAX_DEPTH = 64;

/**
 * Returns true if v is a plain (non-null, non-array) object.
 * Enables property access as Record<string, unknown> without casts.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Computes the intersection of two visible field sets.
 * `undefined` is treated as the universal set (all fields allowed).
 * The intersection of universal and any set S is S.
 * The intersection of two concrete sets is their overlap.
 */
export function intersectVisibleFields(
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const setB = new Set(b);
  return a.filter((f) => setB.has(f));
}

/**
 * Merges multiple visible field sets using the specified strategy.
 *
 * - `"intersection"`: fields present in ALL non-undefined sets
 * - `"union"`: fields present in ANY set
 * - `"first"`: first non-undefined set
 *
 * `undefined` is treated as the universal set (all fields allowed).
 */
export function mergeVisibleFields(
  strategy: FieldStrategy,
  ...fieldSets: ReadonlyArray<ReadonlyArray<string> | undefined>
): ReadonlyArray<string> | undefined {
  switch (strategy) {
    case "intersection": {
      return fieldSets.reduce<ReadonlyArray<string> | undefined>(
        (acc, cur) => intersectVisibleFields(acc, cur),
        undefined,
      );
    }
    case "union": {
      const merged = new Set<string>();
      let hasAnyDefined = false;
      for (const set of fieldSets) {
        if (set !== undefined) {
          hasAnyDefined = true;
          for (const f of set) merged.add(f);
        }
      }
      // If no set is defined, treat as universal (undefined)
      return hasAnyDefined ? Object.freeze([...merged]) : undefined;
    }
    case "first": {
      for (const set of fieldSets) {
        if (set !== undefined) return set;
      }
      return undefined;
    }
    default: {
      return assertNever(strategy);
    }
  }
}

/**
 * Evaluates an authorization policy against a subject and optional resource context.
 *
 * Returns Result<Decision, PolicyEvaluationError>. This function is synchronous
 * and deterministic with respect to policy logic.
 */
export function evaluate(
  policy: PolicyConstraint,
  context: EvaluationContext,
  options?: EvaluateOptions,
): Result<Decision, PolicyEvaluationError> {
  if (!isPolicy(policy)) {
    return err(createPolicyEvaluationError(policy, new Error(`Unknown policy kind: ${policy.kind}`)));
  }

  const evaluationId = context.evaluationId ?? crypto.randomUUID();
  const evaluatedAt = context.evaluatedAt ?? new Date().toISOString();
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const overallStart = performance.now();

  const traceResult = evaluateNode(policy, context, maxDepth, 0);
  if (traceResult.isErr()) return err(traceResult.error);

  const trace = traceResult.value;
  const durationMs = performance.now() - overallStart;

  if (trace.result === "allow") {
    const decision: Allow = Object.freeze({
      kind: "allow",
      evaluationId,
      evaluatedAt,
      subjectId: context.subject.id,
      policy,
      trace,
      durationMs,
      ...(trace.visibleFields !== undefined ? { visibleFields: trace.visibleFields } : {}),
    });
    return ok(decision);
  } else {
    const decision: Deny = Object.freeze({
      kind: "deny",
      evaluationId,
      evaluatedAt,
      subjectId: context.subject.id,
      policy,
      trace,
      durationMs,
      reason: trace.reason ?? "Denied by policy",
    });
    return ok(decision);
  }
}

/**
 * Evaluates a named map of policies and returns a decisions record.
 */
export function evaluateBatch(
  policies: PoliciesMap,
  context: EvaluationContext,
  options?: EvaluateOptions,
): Readonly<Record<string, Result<Decision, PolicyEvaluationError>>> {
  const result: Record<string, Result<Decision, PolicyEvaluationError>> = {};
  for (const key of Object.keys(policies)) {
    result[key] = evaluate(policies[key], context, options);
  }
  return result;
}

// ── Internal evaluation tree traversal ───────────────────────────────────────

function evaluateNode(
  policy: Policy,
  context: EvaluationContext,
  maxDepth: number,
  depth: number,
): Result<EvaluationTrace, PolicyEvaluationError> {
  if (depth > maxDepth) {
    return err(
      createPolicyEvaluationError(
        policy,
        new Error(`Policy tree exceeds maximum depth of ${maxDepth}`),
      ),
    );
  }

  const start = performance.now();

  switch (policy.kind) {
    case "hasPermission":
      return ok(evaluateHasPermission(policy, context, start));
    case "hasRole":
      return ok(evaluateHasRole(policy, context, start));
    case "hasAttribute":
      return ok(evaluateHasAttribute(policy, context, start));
    case "hasResourceAttribute":
      return ok(evaluateHasResourceAttribute(policy, context, start));
    case "hasSignature":
      return ok(evaluateHasSignature(policy, context, start));
    case "hasRelationship":
      return ok(evaluateHasRelationship(policy, context, start));
    case "allOf":
      return evaluateAllOf(policy, context, maxDepth, depth, start);
    case "anyOf":
      return evaluateAnyOf(policy, context, maxDepth, depth, start);
    case "not":
      return evaluateNot(policy, context, maxDepth, depth, start);
    case "labeled":
      return evaluateLabeled(policy, context, maxDepth, depth, start);
    default:
      return assertNever(policy);
  }
}

function evaluateHasPermission(
  policy: HasPermissionPolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const key = formatPermission(policy.permission);
  const allowed = context.subject.permissions.has(key);
  const durationMs = performance.now() - start;

  return buildTrace({
    policyKind: "hasPermission",
    result: allowed ? "allow" : "deny",
    reason: allowed ? undefined : `Subject lacks permission ${key}`,
    durationMs,
    visibleFields: allowed ? policy.fields : undefined,
  });
}

function evaluateHasRole(
  policy: HasRolePolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const allowed = context.subject.roles.includes(policy.roleName);
  const durationMs = performance.now() - start;

  return buildTrace({
    policyKind: "hasRole",
    result: allowed ? "allow" : "deny",
    reason: allowed ? undefined : `Subject lacks role '${policy.roleName}'`,
    durationMs,
  });
}

function evaluateHasAttribute(
  policy: HasAttributePolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const attributeValue = context.subject.attributes[policy.attribute];
  const allowed = evalMatcher(policy.matcher, attributeValue, context);
  const durationMs = performance.now() - start;

  return buildTrace({
    policyKind: "hasAttribute",
    result: allowed ? "allow" : "deny",
    reason: allowed
      ? undefined
      : `Subject attribute '${policy.attribute}' does not satisfy matcher`,
    durationMs,
    visibleFields: allowed ? policy.fields : undefined,
  });
}

function evaluateHasResourceAttribute(
  policy: HasResourceAttributePolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const resourceObj = context.resource;
  if (resourceObj === undefined) {
    const durationMs = performance.now() - start;
    return buildTrace({
      policyKind: "hasResourceAttribute",
      result: "deny",
      reason: `No resource in context for attribute '${policy.attribute}'`,
      durationMs,
    });
  }
  const attributeValue = resourceObj[policy.attribute];
  const allowed = evalMatcher(policy.matcher, attributeValue, context);
  const durationMs = performance.now() - start;

  return buildTrace({
    policyKind: "hasResourceAttribute",
    result: allowed ? "allow" : "deny",
    reason: allowed
      ? undefined
      : `Resource attribute '${policy.attribute}' does not satisfy matcher`,
    durationMs,
  });
}

function evaluateHasSignature(
  policy: HasSignaturePolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const signatures = context.signatures;
  const durationMs = performance.now() - start;

  if (signatures === undefined || signatures.length === 0) {
    return buildTrace({
      policyKind: "hasSignature",
      result: "deny",
      reason: `No signatures in context for meaning '${policy.meaning}'`,
      durationMs,
    });
  }

  const matchingSig = signatures.find(
    (sig) =>
      sig.meaning === policy.meaning &&
      sig.validated &&
      sig.reauthenticated &&
      (policy.signerRole === undefined ||
        (sig.signerRoles !== undefined && sig.signerRoles.includes(policy.signerRole))),
  );

  return buildTrace({
    policyKind: "hasSignature",
    result: matchingSig !== undefined ? "allow" : "deny",
    reason:
      matchingSig !== undefined
        ? undefined
        : `No valid signature for meaning '${policy.meaning}'${policy.signerRole !== undefined ? ` with role '${policy.signerRole}'` : ""}`,
    durationMs,
  });
}

function evaluateHasRelationship(
  policy: HasRelationshipPolicy,
  context: EvaluationContext,
  start: number,
): EvaluationTrace {
  const durationMs = performance.now() - start;

  const rawId = context.resource !== undefined ? context.resource["id"] : undefined;
  const resourceId = typeof rawId === "string" ? rawId : undefined;

  if (resourceId === undefined) {
    return buildTrace({
      policyKind: "hasRelationship",
      result: "deny",
      reason: `No resource.id in context for relationship '${policy.relation}' (ACL030)`,
      durationMs,
    });
  }

  if (context.relationshipResolver === undefined) {
    return buildTrace({
      policyKind: "hasRelationship",
      result: "deny",
      reason: `RelationshipResolverPort not wired for relation '${policy.relation}' (ACL028)`,
      durationMs,
    });
  }

  const resolver = context.relationshipResolver;
  const checkResult = fromThrowable(
    () =>
      resolver.check(
        context.subject.id,
        policy.relation,
        resourceId,
        policy.depth !== undefined ? { depth: policy.depth } : undefined,
      ),
    (cause): { readonly message: string } => ({
      message: `Relationship check failed for '${policy.relation}' (ACL022): ${cause instanceof Error ? cause.message : String(cause)}`,
    }),
  );

  if (checkResult.isErr()) {
    return buildTrace({
      policyKind: "hasRelationship",
      result: "deny",
      reason: checkResult.error.message,
      durationMs,
    });
  }

  const allowed = checkResult.value;
  return buildTrace({
    policyKind: "hasRelationship",
    result: allowed ? "allow" : "deny",
    reason: allowed
      ? undefined
      : `Subject '${context.subject.id}' lacks relation '${policy.relation}' to resource '${resourceId}'`,
    durationMs,
    visibleFields: allowed ? policy.fields : undefined,
  });
}

function evaluateAllOf(
  policy: AllOfPolicy,
  context: EvaluationContext,
  maxDepth: number,
  depth: number,
  start: number,
): Result<EvaluationTrace, PolicyEvaluationError> {
  const fieldStrategy: FieldStrategy = policy.fieldStrategy ?? "intersection";
  const children: EvaluationTrace[] = [];
  const allowedFieldSets: Array<ReadonlyArray<string> | undefined> = [];

  for (const child of policy.policies) {
    if (!isPolicy(child)) continue;
    const childResult = evaluateNode(child, context, maxDepth, depth + 1);
    if (childResult.isErr()) return childResult;
    const childTrace = childResult.value;
    children.push(childTrace);
    // Short-circuit on deny (regardless of fieldStrategy)
    if (childTrace.result === "deny") {
      const durationMs = performance.now() - start;
      return ok(
        buildTrace({
          policyKind: "allOf",
          result: "deny",
          reason: childTrace.reason,
          durationMs,
          children,
        }),
      );
    }
    allowedFieldSets.push(childTrace.visibleFields);
  }

  const durationMs = performance.now() - start;
  const visibleFields = mergeVisibleFields(fieldStrategy, ...allowedFieldSets);
  return ok(
    buildTrace({
      policyKind: "allOf",
      result: "allow",
      durationMs,
      children,
      visibleFields,
    }),
  );
}

function evaluateAnyOf(
  policy: AnyOfPolicy,
  context: EvaluationContext,
  maxDepth: number,
  depth: number,
  start: number,
): Result<EvaluationTrace, PolicyEvaluationError> {
  const fieldStrategy: FieldStrategy = policy.fieldStrategy ?? "first";
  const children: EvaluationTrace[] = [];
  let lastReason: string | undefined;

  if (fieldStrategy === "union") {
    // Evaluate ALL children even after first allow, to collect all field sets
    const allowedFieldSets: Array<ReadonlyArray<string> | undefined> = [];
    let anyAllow = false;

    for (const child of policy.policies) {
      if (!isPolicy(child)) continue;
      const childResult = evaluateNode(child, context, maxDepth, depth + 1);
      if (childResult.isErr()) return childResult;
      const childTrace = childResult.value;
      children.push(childTrace);
      if (childTrace.result === "allow") {
        anyAllow = true;
        allowedFieldSets.push(childTrace.visibleFields);
      } else {
        lastReason = childTrace.reason;
      }
    }

    const durationMs = performance.now() - start;
    if (anyAllow) {
      const visibleFields = mergeVisibleFields("union", ...allowedFieldSets);
      return ok(
        buildTrace({
          policyKind: "anyOf",
          result: "allow",
          durationMs,
          children,
          visibleFields,
        }),
      );
    }

    return ok(
      buildTrace({
        policyKind: "anyOf",
        result: "deny",
        reason: lastReason ?? "No policies matched",
        durationMs,
        children,
      }),
    );
  }

  // "first" strategy: short-circuit on first allow
  for (const child of policy.policies) {
    if (!isPolicy(child)) continue;
    const childResult = evaluateNode(child, context, maxDepth, depth + 1);
    if (childResult.isErr()) return childResult;
    const childTrace = childResult.value;
    children.push(childTrace);
    if (childTrace.result === "allow") {
      const durationMs = performance.now() - start;
      return ok(
        buildTrace({
          policyKind: "anyOf",
          result: "allow",
          durationMs,
          children,
          visibleFields: childTrace.visibleFields,
        }),
      );
    }
    lastReason = childTrace.reason;
  }

  const durationMs = performance.now() - start;
  return ok(
    buildTrace({
      policyKind: "anyOf",
      result: "deny",
      reason: lastReason ?? "No policies matched",
      durationMs,
      children,
    }),
  );
}

function evaluateNot(
  policy: NotPolicy,
  context: EvaluationContext,
  maxDepth: number,
  depth: number,
  start: number,
): Result<EvaluationTrace, PolicyEvaluationError> {
  const childPolicy = policy.policy;
  let childTrace: EvaluationTrace;

  if (isPolicy(childPolicy)) {
    const childResult = evaluateNode(childPolicy, context, maxDepth, depth + 1);
    if (childResult.isErr()) return childResult;
    childTrace = childResult.value;
  } else {
    childTrace = buildTrace({
      policyKind: childPolicy.kind,
      result: "deny",
      reason: "Unknown policy kind",
      durationMs: 0,
    });
  }

  const negated = childTrace.result === "deny" ? "allow" : "deny";
  const durationMs = performance.now() - start;

  return ok(
    buildTrace({
      policyKind: "not",
      result: negated,
      reason:
        negated === "deny"
          ? `Negated policy passed: ${childTrace.reason ?? "allowed"}`
          : undefined,
      durationMs,
      children: [childTrace],
    }),
  );
}

function evaluateLabeled(
  policy: LabeledPolicy,
  context: EvaluationContext,
  maxDepth: number,
  depth: number,
  start: number,
): Result<EvaluationTrace, PolicyEvaluationError> {
  const childPolicy = policy.policy;
  let childTrace: EvaluationTrace;

  if (isPolicy(childPolicy)) {
    const childResult = evaluateNode(childPolicy, context, maxDepth, depth + 1);
    if (childResult.isErr()) return childResult;
    childTrace = childResult.value;
  } else {
    childTrace = buildTrace({
      policyKind: childPolicy.kind,
      result: "deny",
      reason: "Unknown policy kind",
      durationMs: 0,
    });
  }

  const durationMs = performance.now() - start;

  return ok(
    buildTrace({
      policyKind: "labeled",
      label: policy.label,
      result: childTrace.result,
      reason: childTrace.reason,
      durationMs,
      children: [childTrace],
      visibleFields: childTrace.visibleFields,
    }),
  );
}

// ── Matcher evaluation ────────────────────────────────────────────────────────

function evalMatcher(
  matcher: MatcherExpression,
  value: unknown,
  context: EvaluationContext,
): boolean {
  switch (matcher.kind) {
    case "eq":
      return value === resolveRef(matcher.ref, context);
    case "neq":
      return value !== resolveRef(matcher.ref, context);
    case "in":
      return matcher.values.includes(value);
    case "exists":
      return value !== null && value !== undefined;
    case "fieldMatch": {
      if (!isPlainObject(value)) return false;
      const fieldValue = value[matcher.field];
      return evalMatcher(matcher.matcher, fieldValue, context);
    }
    case "gte":
      return typeof value === "number" && value >= matcher.value;
    case "lt":
      return typeof value === "number" && value < matcher.value;
    case "someMatch":
      return Array.isArray(value) && value.some((item) => evalMatcher(matcher.matcher, item, context));
    case "contains": {
      if (Array.isArray(value)) return value.includes(matcher.value);
      if (typeof value === "string" && typeof matcher.value === "string") {
        return value.includes(matcher.value);
      }
      return false;
    }
    case "everyMatch":
      return Array.isArray(value) && value.every((item) => evalMatcher(matcher.matcher, item, context));
    case "size": {
      const len = Array.isArray(value)
        ? value.length
        : typeof value === "string"
          ? value.length
          : undefined;
      if (len === undefined) return false;
      return evalMatcher(matcher.matcher, len, context);
    }
    default:
      return assertNever(matcher);
  }
}

function resolveRef(
  ref: { readonly kind: "subject" | "resource" | "literal"; readonly path?: string; readonly value?: unknown },
  context: EvaluationContext,
): unknown {
  switch (ref.kind) {
    case "subject":
      return getByPath(context.subject, ref.path ?? "");
    case "resource":
      return getByPath(context.resource, ref.path ?? "");
    case "literal":
      return ref.value;
    default:
      return assertNever(ref.kind);
  }
}

function getByPath(obj: unknown, path: string): unknown {
  if (path === "") return obj;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}
