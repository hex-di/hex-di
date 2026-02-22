# 05 - Policy Evaluator

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-05                                 |
| Revision         | 1.1                                      |
| Effective Date   | 2026-02-21                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.1 (2026-02-21): §74 → §86 (evaluateBatch — Server-Side Batch Evaluation) — resolve section number collision with roadmap/ecosystem-extensions.md §74 (CCR-GUARD-045) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [04 - Policy Types](./04-policy-types.md)_

---

## 18. evaluate() Function

The `evaluate()` function is the core of the authorization engine. It is a synchronous function, deterministic with respect to policy logic, that traverses a policy tree and produces a `Result<Decision, PolicyEvaluationError>`.

### Signature

```typescript
/**
 * Evaluates an authorization policy against a subject and optional resource context.
 *
 * This function is deterministic with respect to policy logic. It does
 * not resolve subjects from containers, does not create tracing spans,
 * and does not log decisions. Those concerns belong to the guard()
 * wrapper and the calling infrastructure.
 *
 * @param policy - The policy tree to evaluate
 * @param context - The evaluation context containing subject and resource
 * @returns Result containing the Decision (Allow or Deny) or a PolicyEvaluationError
 */
export function evaluate(
  policy: PolicyConstraint,
  context: EvaluationContext
): Result<Decision, PolicyEvaluationError>;

/**
 * Arbitrary resource attributes for attribute-based policies.
 *
 * A plain key-value bag describing the resource being accessed.
 * The matcher DSL resolves attribute values by path against this object.
 */
export type Resource = Readonly<Record<string, unknown>>;

/**
 * The context provided to the evaluate function.
 */
export interface EvaluationContext {
  /** The authorization subject being checked. */
  readonly subject: AuthSubject;
  /** Optional resource context for attribute-based policies. */
  readonly resource?: Resource;
  /**
   * Optional validated signatures for hasSignature policies (21 CFR Part 11).
   *
   * An array to support maker-checker workflows where multiple distinct
   * signatures are required (e.g., one "authored" + one "verified").
   * Each entry corresponds to a different `meaning` captured via the
   * sequential signature flow described in 07-guard-adapter.md section 28.
   *
   * When a single signature is needed, the array contains one element.
   * When no signatures are needed (no hasSignature in the policy tree),
   * this field is omitted entirely.
   */
  readonly signatures?: ReadonlyArray<ValidatedSignature>;
  /**
   * Pre-generated evaluation ID from the guard wrapper.
   * When omitted, the evaluator generates a UUID v4 as fallback.
   * The guard wrapper SHOULD supply this from a CSPRNG source.
   */
  readonly evaluationId?: string;
  /**
   * Pre-generated timestamp from the guard wrapper's ClockSource.
   * When omitted, the evaluator uses new Date().toISOString() as fallback.
   * The guard wrapper SHOULD supply this from the configured ClockSource.
   */
  readonly evaluatedAt?: string;
}

/**
 * A validated electronic signature attached to the evaluation context.
 *
 * Populated by the guard wrapper when a hasSignature policy is in the
 * policy tree and SignatureServicePort is available. Each signature has
 * already been captured and validated before evaluation begins.
 *
 * For maker-checker workflows, the guard wrapper captures signatures
 * sequentially — one per distinct `meaning` in the policy tree.
 * See 07-guard-adapter.md section 28 (execution flow step 3a) for
 * the sequential capture process.
 */
export interface ValidatedSignature {
  /** The ID of the signer (must match a known subject). */
  readonly signerId: string;
  /** ISO 8601 timestamp of when the signature was applied. */
  readonly signedAt: string;
  /** The meaning of the signature (e.g., "approved", "reviewed"). */
  readonly meaning: string;
  /** Whether the cryptographic signature was validated successfully. */
  readonly validated: boolean;
  /** Whether the signer re-authenticated before signing (11.100 requirement). */
  readonly reauthenticated: boolean;
  /**
   * The signer's roles at signature capture time.
   *
   * Used by `hasSignature` evaluation when `signerRole` is specified.
   * In counter-signing workflows the signer may be a different person
   * than the subject, so the signer's own roles (captured at signing
   * time) must be checked — not the subject's roles.
   */
  readonly signerRoles?: ReadonlyArray<string>;
}
```

### Synchronous Evaluation

The `evaluate()` function is synchronous by design. This is a critical architectural decision (see architecture-review #3):

1. **The subject is pre-resolved.** By the time `evaluate()` is called, the subject's permissions are already flattened into a `ReadonlySet<string>`. No async lookup needed.
2. **The policy is in-memory data.** Policy trees are plain frozen objects -- no promises, no remote calls.
3. **The matcher DSL is synchronous.** All matchers (`eq`, `neq`, `in`, `exists`) perform simple comparisons on in-memory data.
4. **Synchronous guard preserves adapter lifetimes.** If `evaluate()` were async, guarded adapters would need async factories, which forces singleton lifetime. Scoped and transient adapters -- the most common candidates for guarding -- would be incompatible.

### Tree Traversal Algorithm

```typescript
function evaluateNode(
  policy: PolicyConstraint,
  context: EvaluationContext
): Result<Decision, PolicyEvaluationError> {
  const start = performance.now();
  const evaluationId = context.evaluationId ?? crypto.randomUUID();
  const evaluatedAt = context.evaluatedAt ?? new Date().toISOString();
  const subjectId = context.subject.id;

  switch (policy.kind) {
    case "hasPermission": {
      const perm = policy.permission;
      const key = `${perm.resource}:${perm.action}`;
      const allowed = context.subject.permissions.has(key);

      return ok({
        kind: allowed ? "allow" : "deny",
        policy: `hasPermission(${key})`,
        reason: allowed ? "" : `Subject lacks permission ${key}`,
        evaluationId,
        evaluatedAt,
        subjectId,
        visibleFields: allowed && policy.fields ? new Set(policy.fields) : undefined,
        trace: {
          policyKind: "hasPermission",
          label: `hasPermission(${key})`,
          decision: allowed ? "allow" : "deny",
          durationMs: performance.now() - start,
          children: [],
        },
      });
    }

    case "hasRole": {
      const hasIt = context.subject.roles.includes(policy.roleName);

      return ok({
        kind: hasIt ? "allow" : "deny",
        policy: `hasRole(${policy.roleName})`,
        reason: hasIt ? "" : `Subject lacks role ${policy.roleName}`,
        evaluationId,
        evaluatedAt,
        subjectId,
        trace: {
          policyKind: "hasRole",
          label: `hasRole(${policy.roleName})`,
          decision: hasIt ? "allow" : "deny",
          durationMs: performance.now() - start,
          children: [],
        },
      });
    }

    case "hasAttribute": {
      const attrValue = resolveAttribute(policy.attribute, context);
      const matched = evaluateMatcher(policy.matcher, attrValue, context);

      return ok({
        kind: matched ? "allow" : "deny",
        policy: `hasAttribute(${policy.attribute})`,
        reason: matched ? "" : `Attribute check failed for ${policy.attribute}`,
        evaluationId,
        evaluatedAt,
        subjectId,
        visibleFields: matched && policy.fields ? new Set(policy.fields) : undefined,
        trace: {
          policyKind: "hasAttribute",
          label: `hasAttribute(${policy.attribute})`,
          decision: matched ? "allow" : "deny",
          durationMs: performance.now() - start,
          children: [],
        },
      });
    }

    case "hasResourceAttribute": {
      // Reads from EvaluationContext.resource, not subject.attributes.
      // Missing resource → clean deny (same behaviour as missing subject attribute).
      const resourceValue = context.resource?.[policy.attribute];
      const matched = evaluateMatcher(policy.matcher, resourceValue, context);

      return ok({
        kind: matched ? "allow" : "deny",
        policy: `hasResourceAttribute(${policy.attribute})`,
        reason: matched ? "" : `Resource attribute check failed for ${policy.attribute}`,
        evaluationId,
        evaluatedAt,
        subjectId,
        visibleFields: matched && policy.fields ? new Set(policy.fields) : undefined,
        trace: {
          policyKind: "hasResourceAttribute",
          label: `hasResourceAttribute(${policy.attribute})`,
          decision: matched ? "allow" : "deny",
          durationMs: performance.now() - start,
          children: [],
        },
      });
    }

    case "labeled": {
      // Transparent wrapper: evaluate the inner policy, then replace the trace label.
      const innerResult = evaluateNode(policy.policy, context);
      if (innerResult.isErr()) return innerResult;
      const inner = innerResult.value;
      return ok({
        ...inner,
        trace: {
          ...inner.trace,
          policyKind: "labeled",
          label: policy.label,
        },
      });
    }

    case "hasSignature": {
      const signatures = context.signatures;
      const meaning = policy.meaning;
      const signerRole = policy.signerRole;

      // Deny if no signatures array in context
      if (!signatures || signatures.length === 0) {
        return ok({
          kind: "deny",
          policy: `hasSignature(${meaning})`,
          reason: `No signatures provided for required meaning '${meaning}'`,
          evaluationId,
          evaluatedAt,
          subjectId,
          trace: {
            policyKind: "hasSignature",
            label: `hasSignature(${meaning})`,
            decision: "deny",
            durationMs: performance.now() - start,
            children: [],
          },
        });
      }

      // Find a signature with the matching meaning
      const sig = signatures.find(s => s.meaning === meaning);

      // Deny if no signature with this meaning found
      if (!sig) {
        return ok({
          kind: "deny",
          policy: `hasSignature(${meaning})`,
          reason: `No signature with meaning '${meaning}' found in ${signatures.length} provided signature(s)`,
          evaluationId,
          evaluatedAt,
          subjectId,
          trace: {
            policyKind: "hasSignature",
            label: `hasSignature(${meaning})`,
            decision: "deny",
            durationMs: performance.now() - start,
            children: [],
          },
        });
      }

      // Deny if signerRole specified but signer lacks role
      if (signerRole && !(sig.signerRoles ?? []).includes(signerRole)) {
        return ok({
          kind: "deny",
          policy: `hasSignature(${meaning})`,
          reason: `Signer '${sig.signerId}' lacks required role '${signerRole}' (signer's roles: [${(sig.signerRoles ?? []).join(", ")}])`,
          evaluationId,
          evaluatedAt,
          subjectId,
          trace: {
            policyKind: "hasSignature",
            label: `hasSignature(${meaning}, signerRole=${signerRole})`,
            decision: "deny",
            durationMs: performance.now() - start,
            children: [],
          },
        });
      }

      // Deny if signature not validated
      if (!sig.validated) {
        return ok({
          kind: "deny",
          policy: `hasSignature(${meaning})`,
          reason: `Signature for '${meaning}' failed cryptographic validation`,
          evaluationId,
          evaluatedAt,
          subjectId,
          trace: {
            policyKind: "hasSignature",
            label: `hasSignature(${meaning})`,
            decision: "deny",
            durationMs: performance.now() - start,
            children: [],
          },
        });
      }

      // Allow: signature present, meaning matches, validated, role (if required) present
      return ok({
        kind: "allow",
        policy: `hasSignature(${meaning})`,
        reason: "",
        evaluationId,
        evaluatedAt,
        subjectId,
        trace: {
          policyKind: "hasSignature",
          label: `hasSignature(${meaning})`,
          decision: "allow",
          durationMs: performance.now() - start,
          children: [],
        },
      });
    }

    case "allOf": {
      const childTraces: EvaluationTrace[] = [];
      const childDecisions: Decision[] = [];
      for (const child of policy.policies) {
        const childResult = evaluateNode(child, context);
        if (childResult.isErr()) return childResult;
        childTraces.push(childResult.value.trace);
        if (childResult.value.kind === "deny") {
          return ok({
            kind: "deny",
            policy: "allOf",
            reason: childResult.value.reason,
            evaluationId,
            evaluatedAt,
            subjectId,
            trace: {
              policyKind: "allOf",
              label: "allOf",
              decision: "deny",
              durationMs: performance.now() - start,
              children: childTraces,
            },
          });
        }
        childDecisions.push(childResult.value);
      }

      // Intersect visibleFields from all allowing children
      const mergedFields = intersectVisibleFields(childDecisions);

      return ok({
        kind: "allow",
        policy: "allOf",
        reason: "",
        evaluationId,
        evaluatedAt,
        subjectId,
        visibleFields: mergedFields,
        trace: {
          policyKind: "allOf",
          label: "allOf",
          decision: "allow",
          durationMs: performance.now() - start,
          children: childTraces,
        },
      });
    }

    case "anyOf": {
      const childTraces: EvaluationTrace[] = [];
      for (const child of policy.policies) {
        const childResult = evaluateNode(child, context);
        if (childResult.isErr()) return childResult;
        childTraces.push(childResult.value.trace);
        if (childResult.value.kind === "allow") {
          return ok({
            kind: "allow",
            policy: "anyOf",
            reason: "",
            evaluationId,
            evaluatedAt,
            subjectId,
            visibleFields: childResult.value.visibleFields,
            trace: {
              policyKind: "anyOf",
              label: "anyOf",
              decision: "allow",
              durationMs: performance.now() - start,
              children: childTraces,
            },
          });
        }
      }
      return ok({
        kind: "deny",
        policy: "anyOf",
        reason: "No child policy allowed",
        evaluationId,
        evaluatedAt,
        subjectId,
        trace: {
          policyKind: "anyOf",
          label: "anyOf",
          decision: "deny",
          durationMs: performance.now() - start,
          children: childTraces,
        },
      });
    }

    case "not": {
      const innerResult = evaluateNode(policy.policy, context);
      if (innerResult.isErr()) return innerResult;
      const inverted = innerResult.value.kind === "allow" ? "deny" : "allow";
      return ok({
        kind: inverted,
        policy: "not",
        reason: inverted === "deny" ? `Negated policy allowed (inverting to deny)` : "",
        evaluationId,
        evaluatedAt,
        subjectId,
        trace: {
          policyKind: "not",
          label: "not",
          decision: inverted,
          durationMs: performance.now() - start,
          children: [innerResult.value.trace],
        },
      });
    }
  }
}
```

### evaluateMatcher — Array Matcher Extensions (v2)

The `evaluateMatcher` function dispatches on `MatcherExpression.kind`. The `hasAttribute` case above calls `evaluateMatcher(policy.matcher, attrValue, context)`. The following pseudocode extends the matcher switch with the v2 array matchers:

```typescript
// Extension to evaluateMatcher() for v2 array matchers
// (called from the hasAttribute case in evaluateNode)

function evaluateMatcher(
  matcher: MatcherExpression,
  attrValue: unknown,
  context: EvaluationContext,
): boolean {
  switch (matcher.kind) {
    // ... existing v1 cases (eq, neq, in, exists, fieldMatch, gte, lt) ...

    case "someMatch": {
      if (attrValue === undefined) {
        // Missing attribute → clean deny (not an error)
        return false;
      }
      if (!Array.isArray(attrValue)) {
        throw new PolicyEvaluationError(
          "ACL003",
          `someMatch: attribute value is not an array (got ${typeof attrValue})`
        );
      }
      return attrValue.some(item => {
        if (!isRecord(item)) return false;
        return Object.entries(matcher.matcher).every(([field, fieldMatcher]) => {
          const fieldValue = item[field];
          return evaluateMatcher(fieldMatcher, fieldValue, context);
        });
      });
    }

    case "contains": {
      if (!Array.isArray(attrValue)) {
        throw new PolicyEvaluationError(
          "ACL003",
          `contains: attribute value is not an array (got ${typeof attrValue})`
        );
      }
      const target = resolveReference(matcher.ref, context);
      return attrValue.includes(target);
    }

    case "everyMatch": {
      if (attrValue === undefined) {
        // Missing attribute → clean deny (not an error)
        return false;
      }
      if (!Array.isArray(attrValue)) {
        throw new PolicyEvaluationError(
          "ACL003",
          `everyMatch: attribute value is not an array (got ${typeof attrValue})`
        );
      }
      // Empty array → deny. No vacuous truth in authorization.
      if (attrValue.length === 0) return false;
      return attrValue.every(item => {
        if (!isRecord(item)) return false;
        return Object.entries(matcher.matcher).every(([field, fieldMatcher]) => {
          const fieldValue = item[field];
          return evaluateMatcher(fieldMatcher, fieldValue, context);
        });
      });
    }

    case "size": {
      if (!Array.isArray(attrValue)) {
        throw new PolicyEvaluationError(
          "ACL003",
          `size: attribute value is not an array (got ${typeof attrValue})`
        );
      }
      // Delegate to the inner matcher with the array length as the value.
      return evaluateMatcher(matcher.matcher, attrValue.length, context);
    }
  }
}

// Helper: returns true if value is a non-null, non-array object
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

> **Note:** The `someMatch` case uses `attrValue === undefined` for a clean deny (missing attribute is not an error, unlike a non-array value). The `contains` case uses `Array.prototype.includes()` which employs the SameValueZero algorithm (equivalent to `===` for scalars).

> **Note:** `evaluatedAt` uses the guard's clock source (see section 25, Clock Source). In production, this is `SystemClock` (`new Date().toISOString()`). In tests, an injectable clock source enables deterministic timestamps.

```
REQUIREMENT: The guard() wrapper (07-guard-adapter.md section 25) MUST supply
             evaluationId and evaluatedAt on the EvaluationContext before calling
             evaluate(). evaluationId MUST be generated from a CSPRNG source
             (crypto.randomUUID()). evaluatedAt MUST be obtained from the
             configured ClockSource. The inline fallback generation in the
             evaluate() pseudocode (crypto.randomUUID() / new Date().toISOString())
             is a defensive fallback only — production guard evaluations MUST NOT
             rely on it.
             Reference: 21 CFR 11.10(e) (audit trail timestamps),
             ALCOA+ Contemporaneous principle.
```

> **Short-circuit trace completeness:** When `allOf` short-circuits on the first denying child, the trace tree only contains children evaluated _up to and including_ the denying child. Subsequent children do not appear. Similarly, when `anyOf` short-circuits on the first allowing child, subsequent children are absent from the trace. This is by design -- the trace records _what was evaluated_, not _what could have been evaluated_. Consumers MUST NOT assume all children of a composite policy appear in the trace. Use the `complete` field on `EvaluationTrace` to determine whether all children were evaluated.

```
RECOMMENDED: When allOf contains multiple field-restricted policies, the intersection
             of their visibleFields sets may produce an empty set (no fields visible).
             Implementations SHOULD log a WARNING when this occurs, as it likely
             indicates a policy composition error rather than intentional behavior.
             The warning SHOULD include the policy labels and their respective field
             sets for diagnostic clarity.
```

### Maximum Evaluation Depth

Deeply nested policy trees (e.g., `allOf(anyOf(allOf(anyOf(...))))`) can cause stack overflow or excessive evaluation time. The evaluator supports a configurable maximum depth:

```typescript
/**
 * Options for the policy evaluator.
 */
export interface EvaluateOptions {
  /**
   * Maximum nesting depth for policy tree traversal.
   *
   * When the evaluator descends past this depth, it returns
   * Err(PolicyEvaluationError) with code ACL003 and a message
   * indicating the depth limit was exceeded.
   *
   * Default: 64.
   */
  readonly maxDepth?: number;
}

export function evaluate(
  policy: PolicyConstraint,
  context: EvaluationContext,
  options?: EvaluateOptions
): Result<Decision, PolicyEvaluationError>;
```

```
RECOMMENDED: Production deployments SHOULD configure maxDepth based on
             the complexity of their policy trees. The default of 64 is
             sufficient for the vast majority of authorization models.
             Organizations with deeply nested policy structures (e.g.,
             generated policies from external policy engines) SHOULD
             increase the limit and document the justification. Organizations
             SHOULD NOT set maxDepth below 10 to avoid rejecting reasonable
             policy compositions. The configured maxDepth SHOULD be included
             in the OQ evidence for boundary condition testing (OQ-12).
             Reference: EU GMP Annex 11 Section 4.7 (system parameter limits).
```

```
REQUIREMENT: The policy evaluator MUST enforce a maximum evaluation depth. When the
             evaluator descends past maxDepth (default: 64), it MUST return
             Err(PolicyEvaluationError) with code "ACL003" and a message indicating
             the depth at which the limit was hit. The configured maxDepth MUST be
             greater than or equal to the deserialization depth limit (50, section 32
             in 09-serialization.md) to ensure that any policy that can be deserialized
             can also be evaluated. Callers MAY override maxDepth via EvaluateOptions.
             Reference: EU GMP Annex 11 Section 7 (data storage and integrity),
             OWASP Input Validation.
```

### Field Merging Semantics

When policies carry `fields` restrictions, the evaluator produces a `visibleFields` set on `Allow` decisions. The merging rules differ by combinator:

**`allOf` — Intersection:** When all children allow, their `visibleFields` sets are intersected. This follows the principle of least privilege: a subject sees only the fields permitted by _every_ policy in the conjunction. If any child has `visibleFields`, the result is the intersection of all non-undefined sets. If no children have `visibleFields`, the result is `undefined` (no restriction).

**`anyOf` — First-allowing child propagation:** When a child allows, its `visibleFields` is propagated directly to the `anyOf` result. Only the first-allowing child's fields matter because `anyOf` short-circuits.

**`not` — No field propagation:** `not` inverts the verdict but does not propagate `visibleFields`. A `not` decision never carries field restrictions.

**`undefined` as identity:** `undefined` means "all fields visible" and acts as the identity element in intersection. When intersecting `undefined` with `Set(["a", "b"])`, the result is `Set(["a", "b"])`.

```typescript
/**
 * Intersects visibleFields from multiple Allow decisions.
 *
 * undefined means "all fields visible" (identity in intersection).
 * If all decisions have undefined visibleFields, returns undefined.
 * If any decision has a set, returns the intersection of all sets
 * (treating undefined as the universal set).
 */
function intersectVisibleFields(
  decisions: ReadonlyArray<Decision>
): ReadonlySet<string> | undefined {
  let result: Set<string> | undefined = undefined;

  for (const d of decisions) {
    if (d.kind !== "allow" || d.visibleFields === undefined) continue;

    if (result === undefined) {
      result = new Set(d.visibleFields);
    } else {
      // Intersect: keep only fields present in both sets
      for (const field of result) {
        if (!d.visibleFields.has(field)) {
          result.delete(field);
        }
      }
    }
  }

  return result;
}
```

### Usage

```typescript
import { evaluate, hasPermission, allOf, hasRole } from "@hex-di/guard";

const policy = allOf(hasPermission(ReadUser), hasRole("editor"));

const context: EvaluationContext = {
  subject: {
    id: "user-1",
    roles: ["editor"],
    permissions: new Set(["user:read"]),
    attributes: {},
    authenticationMethod: "password",
    authenticatedAt: "2024-01-15T10:30:00.000Z",
  },
};

const result = evaluate(policy, context);

if (result.isOk()) {
  const decision = result.value;
  switch (decision.kind) {
    case "allow":
      console.log("Access granted");
      break;
    case "deny":
      console.log(`Access denied: ${decision.reason}`);
      break;
  }
}
```

## 19. Decision Type

The `Decision` type is a discriminated union on `kind`. It is NOT a `Result` -- a `Deny` is a valid, expected outcome, not an error. The `Result` wrapper around `evaluate()` is for situations where evaluation itself fails.

### Type Definitions

```typescript
/**
 * A trace node recording how a policy was evaluated.
 * (defined here for completeness; detailed in section 20)
 */
export interface EvaluationTrace {
  readonly policyKind: PolicyKind;
  readonly label: string;
  readonly decision: "allow" | "deny";
  /**
   * Evaluation duration in milliseconds, measured via performance.now().
   *
   * durationMs uses performance.now() for relative performance measurement only.
   * For audit-grade absolute timestamps, use Decision.evaluatedAt.
   */
  readonly durationMs: number;
  readonly children: readonly EvaluationTrace[];
}

/**
 * An allow decision.
 *
 * Contains the policy label that caused the allow and the full
 * evaluation trace for auditing.
 */
export interface Allow {
  readonly kind: "allow";
  /**
   * Always the empty string for Allow decisions.
   *
   * Present for structural consistency with Deny, enabling
   * `decision.reason !== ""` as a Deny discriminant and uniform
   * serialization of all Decision objects.
   */
  readonly reason: "";
  /** Label of the policy that produced this decision. */
  readonly policy: string;
  /** UUID v4 for audit correlation. Generated via crypto.randomUUID(). */
  readonly evaluationId: string;
  /** ISO 8601 timestamp of when the decision was made. */
  readonly evaluatedAt: string;
  /** The subject's ID for audit correlation. */
  readonly subjectId: string;
  /** Full evaluation tree. */
  readonly trace: EvaluationTrace;
  /**
   * Fields visible to the subject after policy evaluation.
   * undefined means all fields are visible (no field restriction).
   * An empty set means no fields are visible (complete field-level denial).
   */
  readonly visibleFields?: ReadonlySet<string>;
}

/**
 * A deny decision.
 *
 * Contains the policy label, a human-readable reason, and the full
 * evaluation trace for debugging.
 */
export interface Deny {
  readonly kind: "deny";
  /** Label of the policy that produced this decision. */
  readonly policy: string;
  /** Human-readable reason for denial. */
  readonly reason: string;
  /** UUID v4 for audit correlation. Generated via crypto.randomUUID(). */
  readonly evaluationId: string;
  /** ISO 8601 timestamp of when the decision was made. */
  readonly evaluatedAt: string;
  /** The subject's ID for audit correlation. */
  readonly subjectId: string;
  /** Full evaluation tree. */
  readonly trace: EvaluationTrace;
}

/**
 * The result of evaluating an authorization policy.
 *
 * Discriminated on `kind`:
 * - `'allow'`: Subject has the required authorization
 * - `'deny'`: Subject does not have the required authorization
 */
export type Decision = Allow | Deny;
```

### Why Not `Result<Allow, Deny>`?

Using the hex-di `Result` type was considered but rejected for three reasons:

1. **`Decision` is not an error/success pair.** A `Deny` is a valid, expected outcome -- not an error. Using `Result` would conflate "the authorization check worked correctly and the answer is no" with "the authorization check failed."

2. **`Decision` carries domain-specific fields.** The `reason` field on `Deny` and the `trace` field on both `Allow` and `Deny` do not fit naturally into `Result.Err` or `Result.Ok`.

3. **The `Decision` discriminant is domain-appropriate.** `kind: 'allow' | 'deny'` communicates intent more clearly than `_tag: 'Ok' | 'Err'`.

### Handling Decisions

```typescript
function handleDecision(decision: Decision): void {
  switch (decision.kind) {
    case "allow":
      // Proceed with operation
      break;
    case "deny":
      // Log denial reason and reject
      logger.warn("Authorization denied", {
        policy: decision.policy,
        reason: decision.reason,
        evaluationId: decision.evaluationId,
        evaluatedAt: decision.evaluatedAt,
        subjectId: decision.subjectId,
      });
      break;
  }
}
```

## 20. EvaluationTrace

The `EvaluationTrace` is a recursive tree structure that records how each policy node was evaluated. It is used for debugging, auditing, and DevTools display.

### Type Definition

```typescript
/**
 * A trace node recording how a single policy was evaluated.
 *
 * Forms a tree structure: composite policies (allOf, anyOf) have
 * `children` traces, leaf policies (hasPermission, hasRole, hasSignature) do not.
 */
export interface EvaluationTrace {
  /** The policy kind that was evaluated. */
  readonly policyKind: PolicyKind;
  /** Human-readable label (e.g., "hasPermission(user:read)"). */
  readonly label: string;
  /** The decision for this specific node. */
  readonly decision: "allow" | "deny";
  /**
   * Evaluation duration in milliseconds, measured via performance.now().
   *
   * durationMs uses performance.now() for relative performance measurement only.
   * For audit-grade absolute timestamps, use Decision.evaluatedAt.
   */
  readonly durationMs: number;
  /** Child traces for composite policies. Empty for leaf policies. */
  readonly children: readonly EvaluationTrace[];
  /**
   * Whether all children of this composite policy were evaluated.
   *
   * `true` when all children were evaluated (no short-circuit).
   * `false` when the composite policy short-circuited (allOf on first deny,
   * anyOf on first allow). Always `true` for leaf policies.
   *
   * Consumers MUST check this field before assuming the trace tree is exhaustive.
   */
  readonly complete: boolean;
}
```

### Trace Tree Example

For the policy `allOf(hasPermission(ReadUser), hasRole("editor"))` evaluated against a subject with `ReadUser` but not the `editor` role:

```
allOf [deny] (0.15ms)
  +-- hasPermission(user:read) [allow] (0.02ms)
  +-- hasRole(editor) [deny] (0.01ms)
```

The trace data structure:

```typescript
const trace: EvaluationTrace = {
  policyKind: "allOf",
  label: "allOf",
  decision: "deny",
  durationMs: 0.15,
  children: [
    {
      policyKind: "hasPermission",
      label: "hasPermission(user:read)",
      decision: "allow",
      durationMs: 0.02,
      children: [],
    },
    {
      policyKind: "hasRole",
      label: "hasRole(editor)",
      decision: "deny",
      durationMs: 0.01,
      children: [],
    },
  ],
};
```

### Use Cases

| Consumer  | How trace is used                                                            |
| --------- | ---------------------------------------------------------------------------- |
| Debugging | Developer inspects the trace to see which sub-policy caused denial           |
| Auditing  | Compliance reviewer exports the trace to verify authorization decisions      |
| DevTools  | The hex-di inspector displays the trace tree in the guard panel              |
| Logging   | The guard wrapper includes the trace in structured log entries               |
| Testing   | The `toHaveEvaluated` matcher traverses the trace to verify evaluation paths |

## 21. Evaluation Errors

Evaluation errors represent situations where evaluation itself fails -- distinct from a clean `Deny` decision. A `Deny` means "the check succeeded and the answer is no." An error means "the check could not be performed."

### PolicyEvaluationError

```typescript
/**
 * Error returned when policy evaluation fails.
 *
 * This is NOT a deny decision. It represents a failure in the
 * evaluation mechanism itself: invalid policy structure, missing
 * attributes, or unconfigured infrastructure.
 */
export interface PolicyEvaluationError {
  readonly code: "ACL003";
  readonly message: string;
  readonly policy: PolicyConstraint;
  readonly cause: unknown;
}
```

### Error Code Allocation

| Code   | Category      | Description                                                                           |
| ------ | ------------- | ------------------------------------------------------------------------------------- |
| ACL001 | Authorization | Access denied — policy evaluation resulted in denial                                  |
| ACL002 | Configuration | Circular role inheritance — role inheritance graph contains a cycle                   |
| ACL003 | Evaluation    | Policy evaluation threw an exception                                                  |
| ACL004 | Type          | Value passed to `InferResource`/`InferAction` is not a Permission                     |
| ACL005 | Type          | Value passed to `InferPermissions`/`InferRoleName` is not a Role                      |
| ACL006 | Configuration | Duplicate permission warning: same resource:action pair registered by different calls |
| ACL007 | Serialization | Policy deserialization failed                                                         |
| ACL008 | Compliance    | Audit trail write failed                                                              |
| ACL009 | Compliance    | Electronic signature operation failed                                                 |
| ACL010 | WAL           | Write-ahead log operation failed                                                      |

> **Note:** Missing infrastructure ports (SubjectProvider, PolicyEngine, AuditTrail) produce standard container "missing dependency" errors (HEX errors), not guard-specific error codes. Guard error codes are reserved for guard-domain problems.

> **Cross-reference (FMEA):** For severity scoring and incident response guidance per error code, see Appendix F (15-appendices.md) which extends the error code table with FMEA-aligned severity scores (S=1 to S=5) and incident response actions. Error code severity aligns with the corresponding failure mode severity in the FMEA (section 68 in 17-gxp-compliance/10-risk-assessment.md). For example, ACL008 (audit trail write failure) maps to FM-03 (S=5, Critical), ACL010 (WAL failure) maps to FM-15 (S=5, Critical), and ACL012 (NoopAuditTrail in GxP) maps to FM-13 (S=5, Critical).

### AccessDeniedError

The `AccessDeniedError` is thrown by the `guard()` wrapper when a policy evaluates to `Deny`. It extends `ContainerError` so it flows through the existing container error model.

```typescript
/**
 * Error thrown when guard() denies access during adapter resolution.
 *
 * Extends ContainerError so it is caught by resolve() and wrapped
 * in FactoryError. Users who prefer Result-based error handling
 * use tryResolve() to get Result<Service, ContainerError>.
 */
export interface AccessDeniedError {
  readonly code: "ACL001";
  readonly message: string;
  /** The policy that was evaluated. */
  readonly policy: PolicyConstraint;
  /** The full decision including trace. */
  readonly decision: Deny;
  /** The port that was being resolved. */
  readonly portName: string;
  /** The subject's ID for audit correlation. */
  readonly subjectId: string;
}
```

### Error Flow

```
evaluate()
  |
  +-- Returns Result<Decision, PolicyEvaluationError>
  |     |
  |     +-- Ok(Allow) --> guard() proceeds, calls original factory
  |     +-- Ok(Deny)  --> guard() throws AccessDeniedError
  |     +-- Err(...)   --> guard() propagates as PolicyEvaluationError
  |
resolve(port)
  |
  +-- Factory runs guard wrapper
  |     |
  |     +-- AccessDeniedError thrown
  |           |
  |           +-- resolve() wraps in FactoryError, re-throws
  |           +-- tryResolve() returns Err(ContainerError)
```

### Practical Example

```typescript
import { evaluate, hasPermission } from "@hex-di/guard";

const policy = hasPermission(ReadUser);
const context: EvaluationContext = {
  subject: {
    id: "user-1",
    roles: [],
    permissions: new Set<string>(), // empty -- no permissions
    attributes: {},
    authenticationMethod: "password",
    authenticatedAt: "2024-01-15T10:30:00.000Z",
  },
};

const result = evaluate(policy, context);

if (result.isOk()) {
  const decision = result.value;
  if (decision.kind === "deny") {
    console.log(decision.reason);
    // "Subject lacks permission user:read"

    console.log(decision.trace.policyKind);
    // "hasPermission"

    console.log(decision.trace.durationMs);
    // 0.02

    console.log(decision.evaluationId);
    // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    console.log(decision.evaluatedAt);
    // "2024-01-15T10:30:05.123Z"

    console.log(decision.subjectId);
    // "user-1"
  }
}

if (result.isErr()) {
  const error = result.error;
  console.log(error.code);
  // "ACL003" (evaluation threw an exception)
  console.log(error.message);
  // "Policy evaluation failed for 'hasPermission(user:read)'"
}
```

## 86. evaluateBatch — Server-Side Batch Evaluation

The `evaluateBatch()` function is the server-side counterpart of `usePolicies` / `usePoliciesDeferred` in React. It evaluates a named map of policies in a single call, returning a typed record of decisions. This avoids repetitive `evaluate()` calls in REST middleware, SSR handlers, and non-React runtimes.

### Signature

```typescript
/**
 * Evaluates a named map of policies and returns a typed decisions record.
 *
 * All policies share the same EvaluationContext. evaluate() is called once
 * per key, synchronously. Keys with PolicyEvaluationError return Err in the
 * inner Result — the map itself always resolves successfully.
 *
 * @param policies - Named map of policies to evaluate
 * @param context  - Shared evaluation context (subject, resource, etc.)
 * @param options  - Optional EvaluateOptions applied to every policy
 * @returns A record mapping each key to Result<Decision, PolicyEvaluationError>
 */
export function evaluateBatch<M extends PoliciesMap>(
  policies: M,
  context: EvaluationContext,
  options?: EvaluateOptions,
): { readonly [K in keyof M]: Result<Decision, PolicyEvaluationError> };
```

### PoliciesMap Type

```typescript
/**
 * A record mapping named keys to policies.
 * Same type used by usePolicies/usePoliciesDeferred in React.
 */
export type PoliciesMap = Readonly<Record<string, PolicyConstraint>>;
```

### Usage

```typescript
import { evaluateBatch, hasPermission, allOf, hasRole } from "@hex-di/guard";

const ContentPerms = createPermissionGroup("content", ["read", "create", "publish"]);

const decisions = evaluateBatch(
  {
    canRead:    hasPermission(ContentPerms.read),
    canCreate:  allOf(hasPermission(ContentPerms.create), hasRole("editor")),
    canPublish: allOf(hasPermission(ContentPerms.publish), hasRole("publisher")),
  },
  { subject, resource: { id: articleId, status: "draft" } }
);

// Each value is Result<Decision, PolicyEvaluationError>
const canReadDecision = decisions.canRead.unwrap(); // Decision

// Equivalent to:
// { canRead: evaluate(policies.canRead, context), ... }
```

### Invariants

```
REQUIREMENT: evaluateBatch MUST call evaluate() once per key in insertion order.
             Errors from individual evaluate() calls MUST be captured in the
             corresponding Err result — they MUST NOT cause other evaluations
             to abort. A single malformed policy MUST NOT prevent the remaining
             policies from being evaluated.

REQUIREMENT: evaluateBatch MUST be the server-side structural mirror of
             usePolicies/usePoliciesDeferred in React. Both accept a PoliciesMap;
             both produce one Decision per key. Applications MAY share a single
             PoliciesMap object between server calls and React hooks.
```

---

_Next: [06 - Subject](./06-subject.md)_
