# 14 - API Reference

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-14                                 |
> | Revision         | 1.3                                      |
> | Effective Date   | 2026-02-14                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.3 (2026-02-14): Added GuardEventSinkPort, GuardSpanSinkPort, GuardEvent, GuardSpanSink, GuardSpanHandle, GuardSpanAttributes to Ports section (CCR-GUARD-008) |
> |                  | 1.2 (2026-02-14): Aligned PermissionGroupMap type definition with 02-permission-types.md (dual overload support), added PermissionOptions interface (CCR-GUARD-006) |
> |                  | 1.1 (2026-02-14): Added hash chain fields (sequenceNumber, integrityHash, previousHash, hashAlgorithm) to MetaAuditEntry interface per §52c REQUIREMENT (CCR-GUARD-005) |
> |                  | 1.0 (2026-02-13): Initial controlled release |

_Previous: [13 - Testing](./behaviors/12-testing.md)_

---

## 52. Core Types

### Permission Types

````typescript
/**
 * Brand symbol for Permission tokens.
 * Created via Symbol.for() for cross-realm compatibility.
 */
declare const PERMISSION_BRAND: unique symbol;

/**
 * A branded permission token with phantom type parameters.
 *
 * TResource and TAction are phantom types -- they exist only at
 * the type level for compile-time safety. At runtime, the permission
 * is a frozen object with resource and action string fields.
 *
 * Permissions are created via createPermission() or createPermissionGroup().
 * Raw construction is not supported.
 */
type Permission<TResource extends string, TAction extends string> = {
  readonly [PERMISSION_BRAND]: true;
  readonly [__resourceBrand]: TResource;
  readonly [__actionBrand]: TAction;
  readonly resource: TResource;
  readonly action: TAction;
};

/**
 * Constraint type that accepts any Permission regardless of type parameters.
 * Used in function signatures that operate on permissions generically.
 */
interface PermissionConstraint {
  readonly [PERMISSION_BRAND]: true;
  readonly resource: string;
  readonly action: string;
}

/**
 * Maps a set of action names to Permission types for a given resource.
 *
 * Used internally by both overloads of createPermissionGroup.
 *
 * @typeParam TResource - The resource string literal shared by all permissions
 * @typeParam TActions - Either a readonly tuple of action name strings,
 *                       or a record where keys are action names and values
 *                       are permission options objects
 *
 * @example
 * ```typescript
 * const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);
 * // UserPerms.read: Permission<"user", "read">
 * // UserPerms.write: Permission<"user", "write">
 * ```
 */
type PermissionGroupMap<
  TResource extends string,
  TActions extends readonly string[] | Record<string, PermissionOptions>,
> = {
  readonly [K in TActions extends readonly string[]
    ? TActions[number]
    : keyof TActions & string]: Permission<TResource, K>;
};

/**
 * Per-permission configuration options.
 *
 * Currently optional — most permissions need no metadata.
 * Extensible for future use (descriptions, categories, sensitivity flags).
 */
interface PermissionOptions {
  readonly description?: string;
  readonly effectiveDate?: string;   // ISO 8601
  readonly expirationDate?: string;  // ISO 8601
  readonly changeControlId?: string;
}
````

### Role Types

```typescript
/**
 * Brand symbol for Role tokens.
 */
declare const ROLE_BRAND: unique symbol;

/**
 * A branded role token with permission and inheritance tracking.
 *
 * TName is a phantom type for compile-time role differentiation.
 * At runtime, roles carry their name, direct permissions, and
 * inherited roles.
 */
type Role<TName extends string, TPermissions> = {
  readonly [ROLE_BRAND]: true;
  readonly [__roleNameBrand]: TName;
  readonly [__rolePermissionsBrand]: TPermissions;
  readonly name: TName;
  readonly permissions: ReadonlyArray<PermissionConstraint>;
  readonly inherits: ReadonlyArray<RoleConstraint>;
};

/**
 * Constraint type that accepts any Role regardless of type parameter.
 */
interface RoleConstraint {
  readonly [ROLE_BRAND]: true;
  readonly name: string;
  readonly permissions: readonly PermissionConstraint[];
  readonly inherits: readonly RoleConstraint[];
}
```

### Policy Types

```typescript
/**
 * Discriminated union of all policy variants.
 *
 * Each variant has a `kind` discriminant that enables exhaustive
 * pattern matching and deterministic serialization.
 */
type Policy =
  | HasPermissionPolicy<PermissionConstraint>
  | HasRolePolicy<string>
  | HasAttributePolicy<string>
  | HasSignaturePolicy<string>
  | HasRelationshipPolicy<string>
  | AllOfPolicy<readonly PolicyConstraint[]>
  | AnyOfPolicy<readonly PolicyConstraint[]>
  | NotPolicy<PolicyConstraint>;

/**
 * Literal union of all policy kind discriminants.
 */
type PolicyKind =
  | "hasPermission"
  | "hasRole"
  | "hasAttribute"
  | "hasSignature"
  | "hasRelationship"
  | "allOf"
  | "anyOf"
  | "not";

/**
 * Structural constraint matching ANY policy type.
 *
 * Uses `{ readonly kind: PolicyKind }` as the minimal structural shape.
 * This avoids circular reference issues that would arise if Policy
 * referred to itself directly in AllOfPolicy/AnyOfPolicy constraints.
 */
interface PolicyConstraint {
  readonly kind: PolicyKind;
}

/**
 * Checks whether a subject has a specific permission.
 */
interface HasPermissionPolicy<TPermission extends PermissionConstraint> {
  readonly kind: "hasPermission";
  readonly permission: TPermission;
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Checks whether a subject has a specific role.
 */
interface HasRolePolicy<TRoleName extends string = string> {
  readonly kind: "hasRole";
  readonly roleName: TRoleName;
}

/**
 * Checks a subject or resource attribute against a matcher.
 */
interface HasAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasAttribute";
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Requires a validated electronic signature with a specific meaning.
 * Used for 21 CFR Part 11 compliance workflows.
 *
 * @typeParam TMeaning - Literal string for the required signature meaning
 */
interface HasSignaturePolicy<TMeaning extends string = string> {
  readonly kind: "hasSignature";
  readonly meaning: TMeaning;
  readonly signerRole?: string;
}

/**
 * Requires a relationship between subject and resource (ReBAC).
 *
 * @typeParam TRelation - Literal string for the required relationship type
 */
interface HasRelationshipPolicy<TRelation extends string = string> {
  readonly kind: "hasRelationship";
  readonly relation: TRelation;
  /** Restrict to relationships with this resource type. */
  readonly resourceType?: string;
  /** Maximum traversal depth. Default: 1 (direct only). */
  readonly depth?: number;
  /** Optional field-level restriction. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Strategy for merging visibleFields across child policies.
 * - "intersection": Only fields allowed by ALL children (default for allOf)
 * - "union": Fields allowed by ANY child
 * - "first": First-allowing child's fields (default for anyOf)
 */
type FieldStrategy = "intersection" | "union" | "first";

/**
 * Optional configuration for composite policy combinators.
 */
interface CombinatorOptions {
  readonly fieldStrategy?: FieldStrategy;
}

/**
 * Requires ALL child policies to pass.
 *
 * @typeParam TPolicies - Readonly tuple of child policies (order preserved)
 */
interface AllOfPolicy<TPolicies extends readonly PolicyConstraint[]> {
  readonly kind: "allOf";
  readonly policies: TPolicies;
  /** Field merging strategy. Default: "intersection". */
  readonly fieldStrategy?: FieldStrategy;
}

/**
 * Requires ANY child policy to pass.
 *
 * @typeParam TPolicies - Readonly tuple of child policies
 */
interface AnyOfPolicy<TPolicies extends readonly PolicyConstraint[]> {
  readonly kind: "anyOf";
  readonly policies: TPolicies;
  /** Field merging strategy. Default: "first". anyOf with "union" disables short-circuit. */
  readonly fieldStrategy?: FieldStrategy;
}

/**
 * Inverts a single child policy.
 *
 * @typeParam TPolicy - The policy being negated
 */
interface NotPolicy<TPolicy extends PolicyConstraint> {
  readonly kind: "not";
  readonly policy: TPolicy;
}
```

### Subject and Decision Types

```typescript
/**
 * The authorization subject: the "who" being evaluated.
 *
 * Roles are string identifiers. Permissions are a ReadonlySet of
 * string tokens (formatted as "resource:action"). Attributes are a
 * readonly record for ABAC policies.
 *
 * Every subject must declare its authentication provenance via
 * authenticationMethod and authenticatedAt for audit compliance.
 */
interface AuthSubject {
  readonly id: string;
  readonly roles: readonly string[];
  readonly permissions: ReadonlySet<string>;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly authenticationMethod: string;
  readonly authenticatedAt: string; // ISO 8601
}

/**
 * The result of a policy evaluation.
 *
 * Each Decision carries a unique evaluationId (UUID v4) for audit
 * trail correlation, the evaluatedAt timestamp (ISO 8601), and the
 * subjectId of the evaluated subject. The trace array records the
 * full evaluation tree for debugging and inspection.
 */
interface Decision {
  readonly kind: "allow" | "deny";
  readonly reason: string;
  /** Label of the policy that produced this decision. */
  readonly policy: string;
  readonly trace: EvaluationTrace;
  readonly evaluationId: string; // UUID v4
  readonly evaluatedAt: string; // ISO 8601
  readonly subjectId: string;
}

/**
 * Convenience type for an allowed decision.
 * The reason field is always the empty string literal type.
 */
interface Allow extends Decision {
  readonly kind: "allow";
  readonly reason: "";
  /**
   * Fields visible to the subject after policy evaluation.
   * undefined means all fields are visible (no field restriction).
   * An empty set means no fields are visible (complete field-level denial).
   */
  readonly visibleFields?: ReadonlySet<string>;
}

/**
 * Convenience type for a denied decision.
 */
interface Deny extends Decision {
  readonly kind: "deny";
}

/**
 * A node in the policy evaluation trace tree.
 *
 * Each trace node records the policy kind evaluated, the decision
 * reached, a human-readable label, the evaluation duration in
 * milliseconds, and any child traces for composite policies.
 */
interface EvaluationTrace {
  readonly policyKind: PolicyKind;
  readonly decision: "allow" | "deny";
  readonly label: string;
  readonly durationMs: number;
  readonly children: ReadonlyArray<EvaluationTrace>;
}

/**
 * A validated electronic signature attached to the evaluation context.
 * Used by hasSignature policy evaluation.
 */
interface ValidatedSignature {
  readonly signerId: string;
  readonly signedAt: string;
  readonly meaning: string;
  readonly validated: boolean;
  readonly reauthenticated: boolean;
  /**
   * The signer's roles at signature capture time.
   * Used by `hasSignature` evaluation when `signerRole` is specified.
   * In counter-signing workflows, the signer may differ from the subject.
   */
  readonly signerRoles?: ReadonlyArray<string>;
}

/**
 * Request to capture an electronic signature.
 */
interface SignatureCaptureRequest {
  readonly signerId: string;
  readonly meaning: string;
  readonly reauthToken: ReauthenticationToken;
  readonly payload: string;
}

/**
 * Challenge for re-authentication before signing (11.100).
 */
interface ReauthenticationChallenge {
  readonly signerId: string;
  readonly credential: string;
  readonly method: string;
}

/**
 * Time-limited token issued after successful re-authentication.
 */
interface ReauthenticationToken {
  readonly signerId: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly tokenValue: string;
}

/**
 * Result of validating an electronic signature.
 */
interface SignatureValidationResult {
  readonly valid: boolean;
  readonly bindingIntact: boolean;
  readonly keyActive: boolean;
  readonly summary: string;
}
```

### Clock Source

```typescript
/**
 * ISO 8601 bridge over `ClockPort.wallClockNow()` from `@hex-di/clock`.
 *
 * Converts epoch-millisecond wall-clock time to ISO 8601 UTC strings.
 * Created by `createClockSourceBridge()` (spec/clock/07-integration.md §24).
 * The default standalone implementation uses `new Date().toISOString()`.
 *
 * See section 62 (compliance/gxp.md) for guard-specific
 * timestamp fields and ordering. See spec/clock/compliance/gxp.md
 * section 18 for NTP synchronization requirements. See section 25
 * (07-guard-adapter.md) for usage in createGuardGraph().
 */
interface ClockSource {
  /** Returns the current time as an ISO 8601 UTC string. */
  readonly now: () => string;
}
```

---

## 53. Factory Functions

### Permission Factories

```typescript
/**
 * Creates a single permission token.
 *
 * @param options - Resource and action strings
 * @returns A branded, frozen Permission token
 */
function createPermission<const TResource extends string, const TAction extends string>(options: {
  readonly resource: TResource;
  readonly action: TAction;
}): Permission<TResource, TAction>;

/**
 * Creates a group of permission tokens for a resource.
 *
 * Supports two calling conventions:
 * 1. Array form — just action names, no metadata
 * 2. Object form — action names as keys with optional PermissionOptions
 *
 * @param resource - The resource name
 * @param actions - Array of action names or object whose keys become action names
 * @returns A frozen map of action names to Permission tokens
 */

// Overload 1: Array of action names
function createPermissionGroup<
  const TResource extends string,
  const TActions extends readonly string[],
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;

// Overload 2: Object with optional per-permission metadata
function createPermissionGroup<
  const TResource extends string,
  const TActions extends Record<string, PermissionOptions>,
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;
```

### Role Factories

```typescript
/**
 * Creates a role token with direct permissions and optional inheritance.
 *
 * @param config - Role name, permissions, and optional inherited roles
 * @returns A branded, frozen Role token
 */
function createRole<
  const TName extends string,
  const TPermissions extends readonly PermissionConstraint[],
  const TInherits extends readonly RoleConstraint[],
>(config: {
  readonly name: TName;
  readonly permissions: TPermissions;
  readonly inherits?: TInherits;
}): Role<
  TName,
  | TPermissions[number]
  | FlattenRolePermissions<TInherits extends readonly RoleConstraint[] ? TInherits : readonly []>
>;
```

### Policy Combinators

```typescript
/**
 * Creates a hasPermission policy.
 *
 * @param permission - The permission to check
 * @returns A frozen HasPermissionPolicy
 */
function hasPermission<P extends PermissionConstraint>(
  permission: P,
  options?: { readonly fields?: ReadonlyArray<string> }
): HasPermissionPolicy<P>;

/**
 * Creates a hasRole policy from a role name string.
 *
 * @param roleName - The role name to check (inferred as literal type)
 * @returns A frozen HasRolePolicy with the literal role name
 */
function hasRole<const N extends string>(roleName: N): HasRolePolicy<N>;

/**
 * Creates a hasRole policy from a Role token (extracts the name).
 *
 * @param role - The Role token (name is extracted via InferRoleName)
 * @returns A frozen HasRolePolicy with the inferred role name
 */
function hasRole<R extends RoleConstraint>(role: R): HasRolePolicy<InferRoleName<R>>;

/**
 * Creates a hasAttribute policy.
 *
 * @param attribute - The attribute key to check (inferred as literal type)
 * @param matcher - The matcher to apply
 * @returns A frozen HasAttributePolicy with the literal attribute key
 */
function hasAttribute<const A extends string>(
  attribute: A,
  matcher: MatcherExpression,
  options?: { readonly fields?: ReadonlyArray<string> }
): HasAttributePolicy<A>;

/**
 * Creates an allOf policy (logical AND).
 *
 * When the last argument has a `fieldStrategy` property but no `kind` property,
 * it is treated as CombinatorOptions. The fieldStrategy is stored on the policy.
 *
 * @param policies - Variadic policies that must ALL pass (tuple type preserved)
 * @param options - Optional CombinatorOptions as last argument
 * @returns A frozen AllOfPolicy with the exact tuple of child policies
 */
function allOf<const T extends readonly PolicyConstraint[]>(...policies: T): AllOfPolicy<T>;
function allOf<const T extends readonly PolicyConstraint[]>(
  ...args: readonly [...T, CombinatorOptions]
): AllOfPolicy<T>;

/**
 * Creates an anyOf policy (logical OR).
 *
 * When the last argument has a `fieldStrategy` property but no `kind` property,
 * it is treated as CombinatorOptions. When fieldStrategy is "union", the resulting
 * anyOf policy will evaluate ALL children (no short-circuit) during evaluation.
 *
 * @param policies - Variadic policies where ANY must pass (tuple type preserved)
 * @param options - Optional CombinatorOptions as last argument
 * @returns A frozen AnyOfPolicy with the exact tuple of child policies
 */
function anyOf<const T extends readonly PolicyConstraint[]>(...policies: T): AnyOfPolicy<T>;
function anyOf<const T extends readonly PolicyConstraint[]>(
  ...args: readonly [...T, CombinatorOptions]
): AnyOfPolicy<T>;

/**
 * Creates a not policy (logical negation).
 *
 * @param policy - The policy to negate
 * @returns A frozen NotPolicy preserving the child policy type
 */
function not<P extends PolicyConstraint>(policy: P): NotPolicy<P>;

/**
 * Creates a hasSignature policy requiring a validated electronic signature.
 *
 * @param meaning - The required signature meaning (inferred as literal type)
 * @param options - Optional: signerRole restricts which roles can sign
 * @returns A frozen HasSignaturePolicy with the literal meaning
 */
function hasSignature<const M extends string>(
  meaning: M,
  options?: { readonly signerRole?: string }
): HasSignaturePolicy<M>;

/**
 * Creates a hasRelationship policy for ReBAC.
 *
 * @param relation - The required relationship type (inferred as literal type)
 * @param options - Optional: resourceType, depth, fields
 * @returns A frozen HasRelationshipPolicy with the literal relation
 */
function hasRelationship<const R extends string>(
  relation: R,
  options?: {
    readonly resourceType?: string;
    readonly depth?: number;
    readonly fields?: ReadonlyArray<string>;
  }
): HasRelationshipPolicy<R>;

/**
 * Creates a fieldMatch matcher for attribute-based field visibility.
 *
 * @param fields - The field names the subject is authorized to see
 * @param ref - The matcher reference to compare against
 * @returns A MatcherExpression with kind "fieldMatch"
 */
function fieldMatch(fields: ReadonlyArray<string>, ref: MatcherReference): MatcherExpression;

/**
 * Creates a greater-than-or-equal matcher for numeric comparisons.
 * Supports temporal authorization patterns (e.g., business-hours policies).
 *
 * @param ref - The matcher reference to compare against
 * @returns A MatcherExpression with kind "gte"
 */
function gte(ref: MatcherReference): MatcherExpression;

/**
 * Creates a less-than matcher for numeric comparisons.
 * Supports temporal authorization patterns (e.g., business-hours policies).
 *
 * @param ref - The matcher reference to compare against
 * @returns A MatcherExpression with kind "lt"
 */
function lt(ref: MatcherReference): MatcherExpression;
```

### Guard and Subject Factories

```typescript
/**
 * Creates a guarded adapter that wraps an inner adapter with authorization policies.
 *
 * @param options - Inner adapter, resolve policy, and optional method policies
 * @returns A GuardedAdapter with the same provides port
 */
/** A map of method names to their per-method authorization policies. */
type MethodPolicyMap<TKeys extends string = string> = Readonly<
  Partial<Record<TKeys, PolicyConstraint>>
>;

function guard<A extends AdapterConstraint>(
  adapter: A,
  options: {
    readonly resolve: PolicyConstraint;
    readonly methodPolicies?: MethodPolicyMap;
  }
): GuardedAdapter<A>;

/**
 * Creates an async guarded adapter. Forces singleton lifetime.
 * Supports on-demand attribute resolution via evaluateAsync().
 *
 * @param adapter - The adapter to wrap (must have singleton lifetime)
 * @param options - Resolve policy, async configuration
 * @returns A GuardedAsyncAdapter (singleton) with augmented requires
 */
function guardAsync<A extends AdapterConstraint & { lifetime: "singleton" }>(
  adapter: A,
  options: {
    readonly resolve: PolicyConstraint;
    readonly methodPolicies?: MethodPolicyMap;
    readonly resolverTimeoutMs?: number;
    readonly maxConcurrentResolutions?: number;
  }
): GuardedAsyncAdapter<A>;

/**
 * Creates a SubjectProvider adapter for the DI container.
 *
 * @param factory - A function that returns the current AuthSubject
 * @returns An adapter that provides SubjectProviderPort
 */
function createSubjectAdapter(
  factory: () => AuthSubject
): Adapter<typeof SubjectProviderPort, never>;

/**
 * Creates a port gate hook that intercepts resolution and evaluates guard policies.
 *
 * @param config - Port gate configuration (container, audit trail, tracing bridge, logger)
 * @returns A ResolutionHook
 */
function createPortGateHook(config: PortGateConfig): ResolutionHook;

/**
 * Creates a map of port names to policies for bulk registration.
 *
 * @param entries - Array of [PortName, Policy] tuples
 * @returns A frozen ReadonlyMap
 */
function createPolicyMap(
  entries: ReadonlyArray<readonly [string, PolicyConstraint]>
): ReadonlyMap<string, PolicyConstraint>;

/**
 * Creates a graph fragment with the default guard infrastructure adapters.
 *
 * Includes PolicyEngineAdapter, AuditTrailAdapter (user-provided),
 * and a SubjectProviderAdapter slot (user must provide).
 *
 * @param options - Configuration including subject adapter, audit trail adapter,
 *   optional clock source, optional signature adapter, and optional failOnAuditError flag
 * @returns A graph fragment to merge into the application graph
 */
function createGuardGraph(options: {
  readonly subjectAdapter: Adapter<typeof SubjectProviderPort>;
  readonly auditTrailAdapter: Adapter<typeof AuditTrailPort>;
  readonly clock?: ClockSource;
  readonly signatureAdapter?: Adapter<typeof SignatureServicePort>;
  readonly failOnAuditError?: boolean;
  /** When true, enforces GxP-grade controls: walStore required, NoopAuditTrail rejected. */
  readonly gxp?: boolean;
  /** Required when gxp is true. WAL store for crash recovery. */
  readonly walStore?: WalStore;
  /** Maximum scope lifetime in milliseconds. Required when gxp is true (FM-19 mitigation). */
  readonly maxScopeLifetimeMs?: number;
  /** Maximum evaluations per second across all scopes (FM-20 mitigation). */
  readonly maxEvaluationsPerSecond?: number;
}): GraphFragment;

/**
 * Creates a NoopAuditTrail adapter for explicit opt-in.
 *
 * @warning Do NOT use in GxP-regulated environments.
 * @returns An adapter providing AuditTrailPort with NoopAuditTrail
 */
function createNoopAuditTrailAdapter(): Adapter<typeof AuditTrailPort>;
```

---

## 54. Ports

### PolicyEnginePort

```typescript
/**
 * Well-known outbound port for the policy evaluation engine.
 *
 * Direction: outbound
 * Category: guard/policy-engine
 * Lifetime: singleton (stateless evaluator)
 */
const PolicyEnginePort: Port<PolicyEngine, "PolicyEngine">;

interface PolicyEngine {
  /** Evaluates a policy against the current subject and optional resource. */
  evaluate(
    policy: PolicyConstraint,
    context: EvaluationContext
  ): Result<Decision, PolicyEvaluationError>;
}

/** Arbitrary resource attributes for attribute-based policies. */
type Resource = Readonly<Record<string, unknown>>;

interface EvaluationContext {
  readonly subject: AuthSubject;
  readonly resource?: Resource;
  /** Optional validated signatures for hasSignature policies (21 CFR Part 11). Array supports maker-checker workflows. */
  readonly signatures?: ReadonlyArray<ValidatedSignature>;
}
```

### SubjectProviderPort

```typescript
/**
 * Well-known outbound port for the subject provider.
 *
 * Direction: outbound
 * Category: guard/subject
 * Lifetime: scoped (one subject per scope/request)
 */
const SubjectProviderPort: Port<SubjectProvider, "SubjectProvider">;

interface SubjectProvider {
  /** Returns the current authorization subject for this scope. */
  getSubject(): AuthSubject;
}
```

### AuditTrailPort

```typescript
import { createPort } from "@hex-di/core";

/**
 * Well-known outbound port for the audit trail.
 *
 * Direction: outbound
 * Category: guard/audit-trail
 * Lifetime: singleton
 *
 * Every guard() call requires AuditTrailPort to be available.
 * Use NoopAuditTrail for non-regulated environments where audit
 * persistence is not required.
 *
 * **GxP Contract:** In regulated environments, adapters MUST implement
 * append-only storage, atomic writes, completeness (no filtering),
 * and NTP-synchronized timestamps. See compliance/gxp.md section 61.
 */
const AuditTrailPort = createPort<"AuditTrail", AuditTrail>({
  name: "AuditTrail",
  direction: "outbound",
  category: "guard/audit-trail",
  description: "Records authorization decisions for audit compliance",
});

interface AuditTrail {
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
}

interface AuditEntry {
  // ── Required Fields ─────────────────────────────────────────────
  readonly evaluationId: string; // UUID v4, matches Decision.evaluationId
  readonly timestamp: string; // ISO 8601 UTC (NTP-synchronized in production)
  readonly subjectId: string;
  readonly authenticationMethod: string;
  readonly policy: string;
  readonly decision: "allow" | "deny";
  readonly portName: string;
  readonly scopeId: string;
  readonly reason: string; // Human-readable reason (empty for Allow)
  readonly durationMs: number; // Evaluation duration in milliseconds
  readonly schemaVersion: number; // Schema version (current: 1)

  // ── Optional GxP Fields ─────────────────────────────────────────
  /** Compact digest of the evaluation trace tree for audit review. */
  readonly traceDigest?: string;
  /** Chained hash for tamper detection (SHA-256). */
  readonly integrityHash?: string;
  /** Hash of the previous audit entry (empty string for genesis). */
  readonly previousHash?: string;
  /** Identifier of the hash algorithm used (e.g., "sha256", "hmac-sha256"). */
  readonly hashAlgorithm?: string;
  /** Electronic signature for 21 CFR Part 11 compliance. */
  readonly signature?: ElectronicSignature;
  /** Monotonically increasing sequence number within a scope for gap detection and concurrent write ordering. */
  readonly sequenceNumber?: number;
  /** Git SHA or content hash of the policy definition at evaluation time. Enables change-control traceability. */
  readonly policySnapshot?: string;

  // ── Optional Metadata Fields ────────────────────────────────────────
  /**
   * Organization-specific risk classification label for this audit entry
   * (e.g., "gxp-critical", "operational", "diagnostic"). Enables risk-based
   * review frequency assignment per section 64. Max 64 characters.
   *
   * This field does NOT participate in hash chain computation — it is
   * metadata for review workflow categorization, not integrity data.
   */
  readonly dataClassification?: string;
}

interface ElectronicSignature {
  readonly signerId: string;
  readonly signedAt: string;
  readonly meaning: string;
  readonly value: string;
  readonly algorithm: string;
  /**
   * The signer's printed (human-readable) name at the time of signing.
   * Supports 21 CFR 11.50 manifestation.
   *
   * **GxP REQUIRED:** In GxP environments, signerName MUST be non-empty
   * when a signature is present. This is REQUIRED by 21 CFR 11.50 for
   * printed name manifestation on electronic signatures.
   */
  readonly signerName?: string;
  readonly reauthenticated: boolean;
}

/**
 * Strict subtype of AuditEntry for GxP-regulated environments.
 *
 * Makes integrityHash, previousHash, and signature required (non-optional),
 * giving GxP adapter implementations compile-time guarantees.
 * See ADR #26 ([Appendix A](./appendices/architectural-decisions.md)).
 */
interface GxPAuditEntry extends AuditEntry {
  readonly integrityHash: string;
  readonly previousHash: string;
  /** Identifier of the hash algorithm used. Always populated in GxP environments. */
  readonly hashAlgorithm: string;
  /** Compact digest of the evaluation trace tree. Always populated in GxP environments. */
  readonly traceDigest: string;
  readonly signature: ElectronicSignature;
  /** Monotonically increasing sequence number. Always populated in GxP environments. */
  readonly sequenceNumber: number;
  /** Git SHA or content hash of the policy definition at evaluation time. Always populated in GxP environments. */
  readonly policySnapshot: string;
}
```

### Administrative Audit Types

```typescript
/**
 * Audit entry recorded when a policy configuration change occurs.
 * Used by the change control process (section 64a) to create an
 * immutable record of policy modifications.
 *
 * Behavioral contract: compliance/gxp.md §64a-1
 */
interface PolicyChangeAuditEntry {
  readonly changeId: string;
  readonly timestamp: string;
  readonly changedBy: string;
  readonly changeType: "add" | "modify" | "remove" | "rollback";
  readonly affectedPorts: readonly string[];
  readonly policySnapshotBefore: string;
  readonly policySnapshotAfter: string;
  readonly changeReason: string;
  readonly changeRequestId: string;
  readonly impactAnalysis: string;
}

/**
 * Extended audit entry for GxP environments. Participates in the
 * hash chain and includes a diff report checksum for integrity.
 *
 * Behavioral contract: compliance/gxp.md §64a-1
 */
interface GxPPolicyChangeAuditEntry extends PolicyChangeAuditEntry {
  readonly integrityHash: string;
  readonly previousHash: string;
  readonly hashAlgorithm: string;
  readonly sequenceNumber: number;
  readonly diffReportChecksum: string;
  readonly approvedBy: string;
}
```

### SignatureServicePort

```typescript
/**
 * Optional outbound port for the electronic signature service.
 *
 * Direction: outbound
 * Category: compliance
 * Lifetime: singleton
 *
 * Only required when hasSignature policies are used in the policy tree.
 * When absent, NoopSignatureService is used (all operations return Err).
 */
const SignatureServicePort: Port<SignatureService, "SignatureService">;

interface SignatureService {
  capture(request: SignatureCaptureRequest): Result<ElectronicSignature, SignatureError>;
  validate(
    signature: ElectronicSignature,
    entry: Readonly<Record<string, unknown>>
  ): Result<SignatureValidationResult, SignatureError>;
  reauthenticate(
    challenge: ReauthenticationChallenge
  ): Result<ReauthenticationToken, SignatureError>;
}
```

### FieldMaskContextPort

```typescript
/**
 * Outbound port providing field-level visibility mask from guard evaluation.
 *
 * Direction: outbound
 * Category: guard/field-mask
 * Lifetime: scoped (one per guard evaluation)
 *
 * Registered in the scope when the Allow decision carries visibleFields.
 * Downstream adapters resolve this to apply field masking.
 */
const FieldMaskContextPort: Port<FieldMaskContext, "FieldMaskContext">;

interface FieldMaskContext {
  /** The set of field names the subject is authorized to see. undefined means all fields visible. */
  readonly visibleFields: ReadonlySet<string> | undefined;
  /** The evaluationId from the guard evaluation, for audit correlation. */
  readonly evaluationId: string;
}
```

### GuardLibraryInspectorPort

```typescript
/**
 * Well-known port for auto-discovery of the GuardLibraryInspector.
 *
 * Direction: outbound
 * Category: library-inspector (triggers auto-discovery via afterResolve hook)
 * Lifetime: singleton
 */
const GuardLibraryInspectorPort = createLibraryInspectorPort({
  name: "GuardLibraryInspector",
});
```

> **GxP WARNING:** The GuardLibraryInspector's `recentDecisions` ring buffer is an **in-memory, lossy** data structure intended for real-time DevTools display and operational debugging. It is **NOT** an audit trail and **MUST NOT** be used as compliance evidence. Entries are evicted when the buffer is full and are lost on process restart. For GxP-compliant audit records, use the `AuditTrailPort` with a persistent adapter (see 07-guard-adapter.md section 25 and compliance/gxp.md section 61). See 12-inspection.md for the full ring buffer specification.

### GuardEventSinkPort

```typescript
/**
 * Optional outbound port for guard event emission.
 *
 * Direction: outbound
 * Category: guard/event-sink
 * Lifetime: singleton
 *
 * When no adapter is registered, guard evaluation proceeds with
 * zero overhead. Consuming libraries (e.g., @hex-di/logger, SIEM systems)
 * provide adapters.
 */
const GuardEventSinkPort: Port<GuardEventSink, "GuardEventSink">;

interface GuardEventSink {
  /** Emit a guard event. Implementations MUST NOT throw. */
  readonly emit: (event: GuardEvent) => void;
}

type GuardEvent = GuardAllowEvent | GuardDenyEvent | GuardErrorEvent;

interface GuardAllowEvent {
  readonly kind: "guard.allow";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly policy: string;
  readonly durationMs: number;
  readonly timestamp: string;
}

interface GuardDenyEvent {
  readonly kind: "guard.deny";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly policy: string;
  readonly reason: string;
  readonly durationMs: number;
  readonly timestamp: string;
}

interface GuardErrorEvent {
  readonly kind: "guard.error";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly errorCode: string;
  readonly errorCategory: string;
  readonly message: string;
  readonly timestamp: string;
}
```

### GuardSpanSinkPort

```typescript
/**
 * Optional outbound port for guard span emission.
 *
 * Direction: outbound
 * Category: guard/span-sink
 * Lifetime: singleton
 *
 * When no adapter is registered, guard evaluation proceeds with
 * zero overhead. Consuming libraries (e.g., @hex-di/tracing) provide
 * adapters that translate guard spans into OTel-compatible spans.
 */
const GuardSpanSinkPort: Port<GuardSpanSink, "GuardSpanSink">;

interface GuardSpanSink {
  /** Start a named span with attributes. Returns a handle to end the span. */
  readonly startSpan: (
    name: string,
    attributes: GuardSpanAttributes
  ) => GuardSpanHandle;
}

interface GuardSpanHandle {
  /** Mark the span as completed successfully. */
  readonly end: () => void;
  /** Mark the span as completed with an error status. */
  readonly setError: (message: string) => void;
  /** Add or update a span attribute after creation. */
  readonly setAttribute: (key: string, value: string | number | boolean) => void;
}

interface GuardSpanAttributes {
  readonly "hex-di.guard.policy": string;
  readonly "hex-di.guard.subject": string;
  readonly "hex-di.guard.port": string;
  readonly "hex-di.guard.evaluationId": string;
  readonly "hex-di.guard.decision"?: string;
  readonly "hex-di.guard.reason"?: string;
  readonly "hex-di.guard.durationMs"?: number;
  readonly "hex-di.guard.asyncResolution"?: boolean;
  readonly "hex-di.guard.resolutionDurationMs"?: number;
  readonly "hex-di.guard.relationshipChecks"?: number;
}
```

---

## 55. Evaluation API

### evaluate

```typescript
/**
 * Pure function that evaluates a policy against a context.
 *
 * This is the core evaluation engine. It recursively walks the policy
 * tree, evaluating each node against the subject and resource context.
 *
 * Returns Result to handle evaluation errors (e.g., missing attributes,
 * circular role references).
 *
 * @param policy - The policy to evaluate
 * @param context - Subject and optional resource
 * @returns Result containing Decision or PolicyEvaluationError
 */
function evaluate(
  policy: PolicyConstraint,
  context: EvaluationContext
): Result<Decision, PolicyEvaluationError>;

/**
 * Async variant of evaluate() with on-demand attribute resolution.
 *
 * Wraps the sync evaluate(), resolving missing attributes via
 * AttributeResolver before evaluation. When no attribute resolution
 * is needed, completes in a single microtask with no overhead.
 *
 * @param policy - The policy to evaluate
 * @param context - Subject and optional resource
 * @param resolver - Optional attribute resolver for missing attributes
 * @param options - Async evaluation options (timeout, concurrency)
 * @returns Promise of Result containing Decision or PolicyEvaluationError
 */
function evaluateAsync(
  policy: PolicyConstraint,
  context: EvaluationContext,
  resolver?: AttributeResolver,
  options?: AsyncEvaluateOptions
): Promise<Result<Decision, PolicyEvaluationError>>;

/**
 * Options for async policy evaluation.
 */
interface AsyncEvaluateOptions {
  /** Timeout for individual attribute resolution calls. Default: 5000ms. */
  readonly resolverTimeoutMs?: number;
  /** Maximum concurrent attribute resolution calls. Default: 10. */
  readonly maxConcurrentResolutions?: number;
}

/**
 * Resolver for on-demand attribute resolution in async evaluation.
 */
interface AttributeResolver {
  resolve(
    subjectId: string,
    attribute: string,
    resource?: Resource
  ): Promise<unknown>;
}

/**
 * Resolver for relationship-based access control (ReBAC).
 */
interface RelationshipResolver {
  check(
    subjectId: string,
    relation: string,
    resourceId: string,
    options?: RelationshipCheckOptions
  ): boolean;
  checkAsync(
    subjectId: string,
    relation: string,
    resourceId: string,
    options?: RelationshipCheckOptions
  ): Promise<boolean>;
}

interface RelationshipCheckOptions {
  readonly resourceType?: string;
  readonly depth?: number;
}
```

### serializePolicy

```typescript
/**
 * Serializes a policy tree to a deterministic JSON string.
 * See section 31 for details.
 */
function serializePolicy(policy: PolicyConstraint): string;
```

### deserializePolicy

```typescript
/**
 * Deserializes a JSON string into a Policy data structure.
 * See section 32 for details.
 */
function deserializePolicy(json: string): Result<Policy, PolicyParseError>;
```

### explainPolicy

```typescript
/**
 * Produces a human-readable explanation of a policy evaluation.
 * See section 33 for details.
 */
function explainPolicy(policy: PolicyConstraint, subject: AuthSubject): string;
```

### flattenPermissions

```typescript
/**
 * Resolves all permissions for a role, including inherited permissions.
 *
 * Walks the role inheritance DAG, collecting all permissions from
 * the role and its ancestors. Detects and reports circular inheritance.
 *
 * @param role - The role to flatten
 * @returns Result containing the deduplicated permission array or a CircularRoleInheritanceError
 */
function flattenPermissions(
  role: RoleConstraint,
  options?: { readonly maxDepth?: number }
): Result<ReadonlyArray<PermissionConstraint>, CircularRoleInheritanceError>;
```

---

## 56. Error Types and Codes

### Error Code Allocation Table

| Code   | Name                           | Category      | Description                                       |
| ------ | ------------------------------ | ------------- | ------------------------------------------------- |
| ACL001 | `AccessDeniedError`            | Authorization | Policy evaluation resulted in denial              |
| ACL002 | `CircularRoleInheritanceError` | Configuration | Role inheritance graph contains a cycle           |
| ACL003 | `PolicyEvaluationError`        | Evaluation    | Policy evaluation failed due to runtime error     |
| ACL004 | `NotAPermissionError`          | Type          | Value passed is not a branded Permission token    |
| ACL005 | `NotARoleError`                | Type          | Value passed is not a branded Role token          |
| ACL006 | `DuplicatePermissionWarning`   | Configuration | Same permission registered under different names  |
| ACL007 | `PolicyParseError`             | Serialization | Policy deserialization failed                     |
| ACL008 | `AuditTrailWriteError`         | Compliance    | Audit trail write failed                          |
| ACL009 | `SignatureError`               | Compliance    | Electronic signature operation failed             |
| ACL010 | `WalError`                     | WAL           | Write-ahead log operation failed                  |
| ACL011 | `ConfigurationError`           | Configuration | GxP mode requires failOnAuditError: true          |
| ACL012 | `ConfigurationError`           | Configuration | NoopAuditTrail not permitted in GxP mode          |
| ACL013 | `ScopeExpiredError`            | Authorization | Scope lifetime exceeded maxScopeLifetimeMs        |
| ACL014 | `AuditEntryParseError`         | Serialization | Audit entry deserialization failed                |
| ACL015 | `RateLimitExceededError`       | Authorization | Evaluation rate exceeded maxEvaluationsPerSecond  |
| ACL016 | `AuditTrailReadError`          | Audit Trail   | Audit trail read/query operation failed           |
| ACL017 | `AdminOperationDeniedError`    | Authorization | Administrative operation not authorized           |
| ACL018 | `HashChainBreakError`          | Audit Trail   | Hash chain integrity break detected               |
| ACL019 | `ClockSynchronizationError`    | Clock         | Clock synchronization drift or NTP unavailability |
| ACL020 | _reserved_                     | --            | Reserved for future use                           |
| ACL021 | _reserved_                     | --            | Reserved for future use                           |
| ACL022 | _reserved_                     | --            | Reserved for future use                           |
| ACL023 | _reserved_                     | --            | Reserved for future use                           |
| ACL024 | _reserved_                     | --            | Reserved for future use                           |
| ACL025 | _reserved_                     | --            | Reserved for future use                           |
| ACL026 | `AttributeResolutionTimeoutError` | Evaluation | Attribute resolution timed out (evaluateAsync)    |
| ACL027 | `AttributeResolutionError`     | Evaluation    | Attribute resolution failed (evaluateAsync)       |
| ACL028 | `MissingRelationshipResolver`  | Configuration | hasRelationship policy requires resolver          |
| ACL029 | `RelationshipResolutionError`  | Evaluation    | Relationship resolution failed                    |
| ACL030 | `MissingResourceId`            | Evaluation    | hasRelationship requires resource with `id`       |

### Error Types

```typescript
/**
 * Thrown when a guard denies access during resolution or method invocation.
 */
interface AccessDeniedError {
  readonly code: "ACL001";
  readonly message: string;
  /** The policy that was evaluated. */
  readonly policy: PolicyConstraint;
  /** The full decision including trace. */
  readonly decision: Deny;
  readonly portName: string;
  readonly subjectId: string;
}

/**
 * Thrown when flattenPermissions detects a cycle in role inheritance.
 */
interface CircularRoleInheritanceError {
  readonly code: "ACL002";
  readonly message: string;
  readonly roleName: string;
}

/**
 * Returned when policy evaluation fails due to a runtime error.
 */
interface PolicyEvaluationError {
  readonly code: "ACL003";
  readonly message: string;
  readonly policy: PolicyConstraint;
  readonly cause: unknown;
}

/**
 * Thrown when a value expected to be a Permission is not branded.
 */
interface NotAPermissionError {
  readonly code: "ACL004";
  readonly message: string;
  readonly value: unknown;
}

/**
 * Thrown when a value expected to be a Role is not branded.
 */
interface NotARoleError {
  readonly code: "ACL005";
  readonly message: string;
  readonly value: unknown;
}

/**
 * Warning emitted when the same resource:action pair is registered
 * by different createPermission calls.
 */
interface DuplicatePermissionWarning {
  readonly code: "ACL006";
  readonly message: string;
  readonly permission: string;
}

/**
 * Returned when deserializePolicy encounters malformed input.
 */
interface PolicyParseError {
  readonly code: "ACL007";
  readonly message: string;
  readonly path: string;
  readonly value: unknown;
  readonly category:
    | "invalid_json"
    | "unknown_kind"
    | "missing_field"
    | "invalid_format"
    | "schema_mismatch"
    | "input_too_large"
    | "max_depth_exceeded";
}

/**
 * Returned when the audit trail fails to persist a record.
 * The guard decision was made but the audit record could not be persisted.
 */
interface AuditTrailWriteError {
  readonly code: "ACL008";
  readonly message: string;
  readonly evaluationId: string;
  readonly cause: unknown;
}

/**
 * Returned when an electronic signature operation fails.
 * Covers capture, validation, and re-authentication failures.
 */
interface SignatureError {
  readonly code: "ACL009";
  readonly message: string;
  readonly category:
    | "capture_failed"
    | "validation_failed"
    | "reauth_failed"
    | "reauth_expired"
    | "key_revoked"
    | "binding_broken"
    | "missing_service";
}

/**
 * Returned when a write-ahead log operation fails.
 * Covers writeIntent, markCompleted, and getPendingIntents failures.
 */
interface WalError {
  readonly code: "ACL010";
  readonly message: string;
  readonly cause: unknown;
}

/**
 * A write-ahead log intent for crash recovery.
 */
interface WalIntent {
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly timestamp: string;
  readonly status: "pending" | "completed" | "evaluation_failed";
}

/**
 * Durable storage for WAL intents.
 * MUST be backed by durable storage in production (not in-memory).
 */
interface WalStore {
  writeIntent(intent: WalIntent): Result<void, WalError>;
  markCompleted(evaluationId: string): Result<void, WalError>;
  getPendingIntents(): Result<ReadonlyArray<WalIntent>, WalError>;
  /**
   * Remove WAL intents older than the given ISO 8601 timestamp.
   *
   * Used for WAL housekeeping: completed and evaluation_failed intents
   * older than the retention period can be safely pruned. Pending intents
   * MUST NOT be pruned (they indicate unresolved crash recovery).
   *
   * @param before - ISO 8601 timestamp; intents older than this are removed
   * @returns The number of pruned intents, or Err on storage failure
   */
  prune(before: string): Result<number, WalError>;
}

/**
 * Returned when a guard graph configuration is invalid.
 * Covers GxP mode constraint violations (e.g., missing failOnAuditError,
 * NoopAuditTrail in GxP mode, missing maxScopeLifetimeMs when gxp: true).
 */
interface ConfigurationError {
  readonly code: "ACL011" | "ACL012";
  readonly message: string;
}

/**
 * Returned when a guard evaluation is attempted in an expired scope.
 * The scope has exceeded the configured maxScopeLifetimeMs.
 */
interface ScopeExpiredError {
  readonly code: "ACL013";
  readonly message: string;
  readonly scopeId: string;
  readonly elapsedMs: number;
  readonly maxLifetimeMs: number;
}

/**
 * Returned when audit entry deserialization fails.
 */
interface AuditEntryParseError {
  readonly code: "ACL014";
  readonly message: string;
  readonly field: string;
  readonly category:
    | "missing_field"
    | "invalid_type"
    | "invalid_format"
    | "unknown_version"
    | "field_too_long"
    | "invalid_json";
}

/**
 * Returned when the evaluation rate limit is exceeded.
 * The evaluation was not performed; retry after the rate window resets.
 */
interface RateLimitExceededError {
  readonly code: "ACL015";
  readonly message: string;
  readonly currentRate: number;
  readonly maxRate: number;
}
/**
 * Extended audit trail with query capabilities for GxP environments.
 *
 * The base AuditTrail is write-only (append-only). QueryableAuditTrail
 * adds read operations for audit review and cross-correlation.
 */
interface QueryableAuditTrail extends AuditTrail {
  readonly query: (
    filter: AuditQueryFilter
  ) => Result<ReadonlyArray<AuditEntry>, AuditTrailReadError>;
  readonly getByEvaluationId: (evaluationId: string) => Result<AuditEntry, AuditTrailReadError>;
  readonly getByScope: (scopeId: string) => Result<ReadonlyArray<AuditEntry>, AuditTrailReadError>;
}

interface AuditQueryFilter {
  readonly subjectId?: string;
  readonly decision?: "allow" | "deny";
  readonly portName?: string;
  readonly scopeId?: string;
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
  readonly limit?: number;
  readonly offset?: number;
}

interface AuditTrailReadError {
  readonly code: "ACL016";
  readonly message: string;
  readonly cause: unknown;
}

/**
 * Thrown when an administrative operation on the guard infrastructure
 * is denied. The subject does not have the required administrative
 * role per AdminGuardConfig (section 64g).
 */
interface AdminOperationDeniedError {
  readonly code: "ACL017";
  readonly message: string;
  /** The administrative operation that was attempted. */
  readonly operation: AdminOperation;
  /** The subject who attempted the operation. */
  readonly subjectId: string;
  /** The policy that governed the denial. */
  readonly policy: PolicyConstraint;
}

/**
 * Strict GxP variant of ElectronicSignature where optional fields
 * are required. For use in GxP adapters that MUST capture complete
 * signature records per 21 CFR 11.50/11.70.
 */
interface GxPElectronicSignature extends ElectronicSignature {
  readonly signerName: string;
  readonly reauthenticated: boolean;
}

/**
 * Creates a completeness monitor that tracks resolution-vs-audit-entry
 * counts per guarded port.
 *
 * @returns A CompletenessMonitor instance with queryCompleteness() and
 *          integration with createGuardHealthCheck()
 */
function createCompletenessMonitor(options?: {
  /** Tolerance for in-flight evaluations. Default: 0. */
  readonly tolerance?: number;
}): CompletenessMonitor;

interface CompletenessMonitor {
  /** Record a resolution event for a guarded port. */
  readonly recordResolution: (portName: string) => void;
  /** Record an audit write event for a guarded port. */
  readonly recordAuditWrite: (portName: string) => void;
  /** Query completeness for a specific port. */
  readonly queryCompleteness: (portName: string) => {
    readonly resolutions: number;
    readonly auditEntries: number;
    readonly discrepancy: number;
  };
  /** Query completeness for all monitored ports. */
  readonly queryAll: () => ReadonlyArray<{
    readonly portName: string;
    readonly resolutions: number;
    readonly auditEntries: number;
    readonly discrepancy: number;
  }>;
}

/**
 * Records access to the audit trail for meta-level auditing.
 */
interface MetaAuditEntry {
  readonly _tag: "MetaAuditEntry";
  readonly metaAuditId: string;
  readonly timestamp: string;
  readonly actorId: string;
  readonly accessType: "query" | "export" | "view" | "verify_chain" | "simulation";
  readonly description: string;
  readonly entryCount: number;
  readonly simulated: boolean;
  readonly scope: string;

  // ── Hash Chain Fields (tamper-evident meta-audit trail per §48c) ──
  /** Monotonically increasing sequence number (no gaps). */
  readonly sequenceNumber: number;
  /** SHA-256 hash computed over this entry's fields. */
  readonly integrityHash: string;
  /** integrityHash of the preceding meta-audit entry (empty string for genesis). */
  readonly previousHash: string;
  /** Identifier of the hash algorithm used (e.g., "sha256"). */
  readonly hashAlgorithm: string;
}

/**
 * Port for recording meta-audit trail entries.
 */
interface MetaAuditTrailPort {
  readonly _tag: "MetaAuditTrailPort";
  readonly recordAccess: (entry: MetaAuditEntry) => Result<void, AuditTrailWriteError>;
}
```

---

## 56a. Audit Entry Serialization API

Functions for serializing, deserializing, and exporting audit entries. See 09-serialization.md sections 34-36 for full specification.

```typescript
/**
 * Serializes an AuditEntry to a deterministic JSON string.
 * Field ordering is deterministic (alphabetical) for hash chain verification.
 */
function serializeAuditEntry(entry: AuditEntry): string;

/**
 * Deserializes a JSON string into an AuditEntry with full validation.
 * Validates all required fields, schemaVersion, formats, and field size limits.
 */
function deserializeAuditEntry(json: string): Result<AuditEntry, AuditEntryParseError>;

/**
 * Creates an export manifest from a set of audit entries.
 * Computes SHA-256 checksum, collects metadata, verifies chain integrity.
 */
function createAuditExportManifest(
  entries: ReadonlyArray<AuditEntry>,
  exportContent: string,
  format: "json" | "csv",
  clock: ClockSource
): AuditExportManifest;
```

---

## 57. Utility Types

Type-level utilities for compile-time validation and inference.

### Permission Utility Types

```typescript
/**
 * Extracts the resource string from a Permission type.
 */
type InferResource<P> =
  P extends Permission<infer TResource, infer _TAction> ? TResource : NotAPermissionError<P>;

/**
 * Extracts the action string from a Permission type.
 */
type InferAction<P> =
  P extends Permission<infer _TResource, infer TAction> ? TAction : NotAPermissionError<P>;

/**
 * Formats a Permission type as a "resource:action" string literal.
 */
type FormatPermission<P> = P extends Permission<infer R, infer A> ? `${R}:${A}` : never;

/**
 * Extracts the union of all Permission types from a PermissionGroupMap.
 */
type PermissionGroupValues<TGroup> =
  TGroup extends PermissionGroupMap<infer _R, infer _A> ? TGroup[keyof TGroup] : never;
```

### Role Utility Types

```typescript
/**
 * Extracts the name string from a Role type.
 */
type InferRoleName<T extends RoleConstraint> = T extends Role<infer N, unknown> ? N : never;

/**
 * Extracts the permission union from a Role type.
 *
 * Because permissions are eagerly flattened at role creation time, this
 * simply extracts the TPermissions phantom parameter.
 */
type InferPermissions<R> =
  R extends Role<infer _TName, infer TPermissions> ? TPermissions : NotARoleError<R>;

/**
 * Extracts the requirements for a policy -- which permissions and roles
 * must exist for the policy to be evaluable.
 */
type InferPolicyRequirements<T extends PolicyConstraint> = T extends HasPermissionPolicy
  ? T["permission"]
  : T extends HasRolePolicy
    ? T["roleName"]
    : T extends AllOfPolicy
      ? InferPolicyRequirements<T["policies"][number]>
      : T extends AnyOfPolicy
        ? InferPolicyRequirements<T["policies"][number]>
        : T extends NotPolicy
          ? InferPolicyRequirements<T["policy"]>
          : never;

/**
 * Flattens a role's permission inheritance at the type level.
 *
 * Uses Peano counter (TDepth), visited set (TVisited), and accumulator (TAcc)
 * to prevent TS2589 depth limit errors on real hierarchies.
 * See 03-role-types.md section 11 for the full 4-parameter implementation.
 */
type FlattenRolePermissions<
  TRoles extends readonly RoleConstraint[],
  TAcc = never,
  TVisited extends string = never,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends RoleFlattenMaxDepth
  ? TAcc
  : TRoles extends readonly [infer TFirst, ...infer TRest extends readonly RoleConstraint[]]
    ? TFirst extends Role<infer TName, infer TPerms>
      ? TName extends TVisited
        ? FlattenRolePermissions<TRest, TAcc, TVisited, TDepth>
        : TFirst extends { readonly inherits: infer TInherits extends readonly RoleConstraint[] }
          ? FlattenRolePermissions<
              readonly [...TInherits, ...TRest],
              TAcc | TPerms,
              TVisited | TName,
              [...TDepth, unknown]
            >
          : FlattenRolePermissions<TRest, TAcc | TPerms, TVisited | TName, [...TDepth, unknown]>
      : FlattenRolePermissions<TRest, TAcc, TVisited, [...TDepth, unknown]>
    : TAcc;

/**
 * Validates that a role inheritance chain has no cycles at the type level.
 * Returns `true` for valid hierarchies, or a `CircularRoleInheritanceError`
 * template literal with the cycle path for circular ones.
 *
 * See 03-role-types.md section 12 for the full implementation with
 * Peano depth guard and ValidateRoleInheritanceList helper.
 */
type ValidateRoleInheritance<
  TRole,
  TPath extends string = "",
  TVisited extends string = never,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends RoleFlattenMaxDepth
  ? true
  : TRole extends Role<infer TName, infer _TPerms>
    ? TName extends TVisited
      ? CircularRoleInheritanceError<`${TPath} -> ${TName}`>
      : TRole extends { readonly inherits: infer TInherits extends readonly RoleConstraint[] }
        ? ValidateRoleInheritanceList<
            TInherits,
            TPath extends "" ? TName : `${TPath} -> ${TName}`,
            TVisited | TName,
            [...TDepth, unknown]
          >
        : true
    : true;
```

### Guard Utility Types

```typescript
/**
 * The type of an adapter after being wrapped with guard().
 *
 * Takes a single TAdapter parameter and destructures it to preserve all
 * 6 type variables (provides, requires, lifetime, factoryKind, clonable,
 * requiresTuple), augmenting requires with ACL infrastructure ports.
 *
 * See 07-guard-adapter.md section 27 for the full implementation.
 */
type GuardedAdapter<TAdapter> =
  TAdapter extends Adapter<
    infer TProvides,
    infer _TRequires,
    infer TLifetime,
    infer TFactoryKind,
    infer TClonable,
    infer TRequiresTuple extends readonly Port<unknown, string>[]
  >
    ? Adapter<
        TProvides,
        TupleToUnion<AppendAclPorts<TRequiresTuple>>,
        TLifetime,
        TFactoryKind,
        TClonable,
        AppendAclPorts<TRequiresTuple>
      >
    : NotAnAdapterError<TAdapter>;

/**
 * Appends ACL ports to a requires tuple, skipping duplicates.
 *
 * For each ACL port, checks if a port with the same name already
 * exists in the original requires tuple. If so, it is not added.
 *
 * See 07-guard-adapter.md section 27 for the full recursive implementation.
 */
type AppendAclPorts<
  TOriginal extends readonly Port<unknown, string>[],
  TToAdd extends readonly Port<unknown, string>[] = AclPorts,
> = TToAdd extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? HasPortNamed<TOriginal, InferPortName<THead> & string> extends true
    ? AppendAclPorts<TOriginal, TRest>
    : AppendAclPorts<readonly [...TOriginal, THead], TRest>
  : TOriginal;

/**
 * Checks if a port name is already present in a port tuple.
 */
type HasPortNamed<
  TTuple extends readonly Port<unknown, string>[],
  TName extends string,
> = TTuple extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? InferPortName<THead> extends TName
    ? true
    : HasPortNamed<TRest, TName>
  : false;

/**
 * Compares two Permission types for structural equality.
 */
type PermissionEquals<A extends PermissionConstraint, B extends PermissionConstraint> = [
  InferResource<A>,
  InferAction<A>,
] extends [InferResource<B>, InferAction<B>]
  ? [InferResource<B>, InferAction<B>] extends [InferResource<A>, InferAction<A>]
    ? true
    : false
  : false;

/**
 * Debug utility: resolves permission inference to a readable string.
 */
type DebugInferPermissions<
  T extends PermissionGroupMap<string, Record<string, Record<string, never>>>,
> = {
  [K in keyof T]: FormatPermission<T[K]>;
};
```

### Pre-Deployment Compliance Types

```typescript
/**
 * A single pre-deployment compliance check result.
 */
interface PreDeploymentComplianceItem {
  readonly id: string;
  readonly description: string;
  readonly status: "pass" | "warn" | "fail";
  readonly detail: string;
}

/**
 * Result of running pre-deployment compliance checks.
 */
interface PreDeploymentComplianceReport {
  readonly items: ReadonlyArray<PreDeploymentComplianceItem>;
  readonly compliant: boolean;
  readonly summary: {
    readonly pass: number;
    readonly warn: number;
    readonly fail: number;
  };
}

/**
 * Configuration for pre-deployment compliance validation.
 * Each field references a documentation artifact or configuration
 * that must exist for GxP compliance.
 */
interface PreDeploymentComplianceConfig {
  readonly retentionPolicyRef?: string;
  readonly changeControlProcedureRef?: string;
  readonly trainingRecordsRef?: string;
  readonly inspectorAccessProcedureRef?: string;
  readonly periodicReviewScheduleDefined?: boolean;
  readonly sbomRef?: string;
  readonly backupDrDocumentationRef?: string;
  readonly riskBasedReviewFrequencyDefined?: boolean;
}

/**
 * Validates static configuration artifacts and procedural documentation
 * against the compliance verification checklist (section 66).
 * Complements checkGxPReadiness() which validates runtime configuration.
 *
 * See 07-guard-adapter.md for the full 8-item check specification.
 */
function checkPreDeploymentCompliance(
  config: PreDeploymentComplianceConfig
): PreDeploymentComplianceReport;
```

---

## 58. React Integration API (`@hex-di/guard/react`)

### Hook Signatures

```typescript
/**
 * Checks if the current subject has the specified permission.
 * **Suspends** when the subject is null.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useCan(permission: PermissionConstraint): boolean;

/**
 * Evaluates a policy against the current subject.
 * **Suspends** when the subject is null.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePolicy(policy: PolicyConstraint): Decision;

/**
 * Returns the current authorization subject.
 * **Suspends** when the subject is null.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useSubject(): AuthSubject;

/**
 * Checks if the current subject has the specified permission
 * without suspending. Returns a discriminated union.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useCanDeferred(permission: PermissionConstraint): CanResult;

/**
 * Evaluates a policy against the current subject without suspending.
 * Returns a discriminated union with the full Decision.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function usePolicyDeferred(policy: PolicyConstraint): PolicyResult;

/**
 * Returns the current authorization subject without suspending.
 * Returns null when the subject is not yet loaded.
 *
 * @throws MissingSubjectProviderError if called outside SubjectProvider tree
 */
function useSubjectDeferred(): AuthSubject | null;
```

### React Result Types

```typescript
/**
 * Discriminated union for deferred permission check results.
 */
type CanResult =
  | { readonly status: "pending" }
  | { readonly status: "allowed" }
  | { readonly status: "denied"; readonly reason: string };

/**
 * Discriminated union for deferred policy evaluation results.
 * Carries the full Decision object to avoid field duplication.
 */
type PolicyResult =
  | { readonly status: "pending" }
  | { readonly status: "resolved"; readonly decision: Decision };
```

### createGuardHooks Factory

```typescript
/**
 * Creates an isolated set of guard hooks and components.
 * Each call creates a new React context, so multiple instances
 * are independent.
 */
function createGuardHooks(): GuardHooks;

interface GuardHooks {
  readonly SubjectProvider: ComponentType<SubjectProviderProps>;
  readonly Can: ComponentType<CanProps>;
  readonly Cannot: ComponentType<CannotProps>;
  readonly useCan: (permission: PermissionConstraint) => boolean;
  readonly usePolicy: (policy: PolicyConstraint) => Decision;
  readonly useSubject: () => AuthSubject;
  readonly useCanDeferred: (permission: PermissionConstraint) => CanResult;
  readonly usePolicyDeferred: (policy: PolicyConstraint) => PolicyResult;
  readonly useSubjectDeferred: () => AuthSubject | null;
}
```

### Component Props

```typescript
interface SubjectProviderProps {
  readonly subject: AuthSubject | null;
  readonly children: ReactNode;
  readonly onDecision?: (event: ClientDecisionEvent) => void;
}

interface CanProps {
  readonly permission?: PermissionConstraint;
  readonly policy?: PolicyConstraint;
  readonly children: ReactNode;
  /** Rendered when denied. Default: null. Loading handled by Suspense. */
  readonly fallback?: ReactNode;
}

interface CannotProps {
  readonly permission?: PermissionConstraint;
  readonly policy?: PolicyConstraint;
  readonly children: ReactNode;
  /** Rendered when authorized. Default: null. Loading handled by Suspense. */
  readonly fallback?: ReactNode;
}
```

---

_Previous: [13 - Testing](./behaviors/12-testing.md) | Next: [15 - Appendices](./appendices/README.md)_
