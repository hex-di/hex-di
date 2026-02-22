# 06 - Subject

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-06                                 |
> | Revision         | 1.1                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

> |                  | 1.1 (2026-02-19): Added BEH-GD-NNN requirement identifiers to section headings (CCR-GUARD-020) |
_Previous: [05 - Policy Evaluator](./04-policy-evaluator.md)_

---

## BEH-GD-020: AuthSubject Interface (§22)

> **Invariants:**
> - [INV-GD-004](../invariants.md) — Subject Immutability Within Scope
> - [INV-GD-011](../invariants.md) — Permission Set Precomputation
> - [INV-GD-022](../invariants.md) — Anonymous Subject Rejection (GxP)
> - [INV-GD-033](../invariants.md) — GxP Subject Identity Validation
> - and others; see [invariants](../invariants.md)
> **See:** [ADR-GD-009](../decisions/009-immutable-subject-within-scope.md) — Immutable subject within scope, [ADR-GD-016](../decisions/016-auth-subject-authentication-fields.md) — Auth subject authentication fields
> **DoD:** [DoD 6: Subject Port](../16-definition-of-done.md#dod-6-subject-port)

The `AuthSubject` is the entity being authorized -- the "who" in "who can do what." It carries the subject's identity, roles, permissions, and arbitrary attributes for ABAC policies.

### Type Definition

```typescript
/**
 * The authorization subject -- the entity being authorized.
 *
 * Contains the subject's identity, roles, permissions, and attributes.
 * This is the data that policies evaluate against.
 */
export interface AuthSubject {
  /** Unique identifier for the subject. */
  readonly id: string;
  /** Role names assigned to the subject. */
  readonly roles: readonly string[];
  /** Flattened permission set for O(1) lookup at evaluation time. */
  readonly permissions: ReadonlySet<string>;
  /** Arbitrary attributes for attribute-based policies. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /**
   * How the subject authenticated.
   *
   * Examples: "password", "mfa", "certificate", "api-key", "sso", "anonymous".
   * Non-authenticated contexts use "none".
   * This field is required for audit compliance -- every authorization
   * decision must record the authentication method of the subject.
   */
  readonly authenticationMethod: string;
  /**
   * ISO 8601 timestamp of when the subject's authentication occurred.
   *
   * Example: "2024-01-15T10:30:00.000Z"
   * Used for audit trail correlation and session freshness checks.
   * Non-authenticated contexts set this to the current time.
   */
  readonly authenticatedAt: string;
  /**
   * Identity provider that authenticated the subject.
   *
   * Examples: "okta", "azure-ad", "internal-ldap", "local".
   * Used for audit trail provenance and cross-IdP correlation.
   */
  readonly identityProvider?: string;
  /**
   * Session identifier linking this subject to a specific session.
   *
   * Enables correlation between authorization decisions and the
   * session lifecycle (login, refresh, logout). Used for audit trail
   * queries such as "show all decisions made in session X."
   */
  readonly sessionId?: string;
}
```

```
REQUIREMENT: In GxP environments (gxp: true), AuthSubject fields MUST satisfy
             the following minimum identity claim requirements:

             1. **id (globally unique + IdP-traceable):** The id field MUST be
                globally unique within the deployment and MUST be traceable to a
                specific identity record in the Identity Provider (IdP). Transient
                or session-scoped identifiers (e.g., opaque session tokens) MUST
                NOT be used as subjectId in GxP environments.

             2. **authenticationMethod (controlled vocabulary):** The
                authenticationMethod field MUST use a value from the controlled
                vocabulary defined below. Site-specific extensions are permitted
                but MUST be documented in the validation plan (section 67).

             3. **authenticatedAt (staleness window):** The authenticatedAt
                timestamp MUST be within a configurable staleness window
                (default: 24 hours) of the current time at the point of guard
                evaluation. Subjects with authenticatedAt older than the staleness
                window MUST be rejected with a Deny decision and reason "GxP:
                authentication timestamp exceeds staleness window".

             Reference: 21 CFR 11.10(d), 21 CFR 11.100(a), ALCOA+ Attributable.
```

```
RECOMMENDED: The authenticationMethod field SHOULD use values from the following
             controlled vocabulary:

             | Value         | Description                                              |
             |---------------|----------------------------------------------------------|
             | `password`    | Username and password authentication                     |
             | `mfa`         | Multi-factor authentication (password + second factor)   |
             | `certificate` | X.509 client certificate authentication                  |
             | `api-key`     | API key or service account credential                    |
             | `sso`         | Single sign-on via SAML, OIDC, or similar federation     |
             | `kerberos`    | Kerberos ticket-based authentication                     |
             | `biometric`   | Biometric authentication (fingerprint, facial, etc.)     |
             | `none`        | No authentication (rejected in GxP mode per section 22)  |

             This vocabulary is extensible. Organizations MAY define site-specific
             values (e.g., "smartcard", "hardware-token") provided they are
             documented in the validation plan and consistently applied across
             all SubjectProviderPort adapters.
```

```
RECOMMENDED: SubjectProviderPort adapters SHOULD sanitize AuthSubject attribute
             values before returning the subject for policy evaluation:

             1. **Maximum value length:** Each attribute value SHOULD NOT exceed
                1024 characters. Values exceeding this limit SHOULD be truncated
                with a "[truncated]" suffix appended. A WARNING-level log MUST be
                emitted when truncation occurs, including the attribute key,
                original length, and truncated length.

             2. **Character restrictions:** Attribute values SHOULD contain only
                printable UTF-8 characters. Control characters (U+0000 through
                U+001F and U+007F through U+009F) SHOULD NOT appear in attribute
                values, with the exception of newline (U+000A) and horizontal tab
                (U+0009) which are permitted. Disallowed control characters SHOULD
                be replaced with the Unicode replacement character (U+FFFD). A
                WARNING-level log MUST be emitted when character replacement
                occurs, including the attribute key and the count of replaced
                characters.

             These sanitization rules prevent injection of control characters into
             audit trail entries and ensure consistent serialization across storage
             backends.
```

```
REQUIREMENT: When gxp is true, SubjectProviderPort adapters MUST sanitize AuthSubject
             attribute values before returning the subject for policy evaluation:

             1. Maximum value length: Each attribute value MUST NOT exceed 1024
                characters. Values exceeding this limit MUST be truncated with a
                "[truncated]" suffix. A WARNING-level log MUST be emitted when
                truncation occurs, including the attribute key, original length,
                and truncated length.
             2. Character restrictions: Attribute values MUST contain only printable
                UTF-8 characters. Control characters (U+0000 through U+001F and
                U+007F through U+009F), except newline (U+000A) and horizontal tab
                (U+0009), MUST be replaced with the Unicode replacement character
                (U+FFFD). A WARNING-level log MUST be emitted when character
                replacement occurs.

             These controls prevent injection of control characters into audit trail
             entries, which could compromise audit trail legibility (ALCOA+ Legible)
             or corrupt serialization (ALCOA+ Complete). IdP attribute values are an
             external input boundary and require validation in GxP environments.

             ALCOA+ Original Consideration: The U+FFFD replacement is a deliberate
             data quality control. The original unsanitized value is intentionally NOT
             preserved because control characters in authorization attributes indicate
             an upstream data quality issue in the Identity Provider (IdP) integration.
             The WARNING-level log emitted during replacement records the attribute key
             and replacement count, providing an investigation trail. The sanitized
             value (with U+FFFD) is the "original" record from the guard library's
             perspective — the library receives and records what the SubjectProviderPort
             adapter provides after sanitization. Organizations requiring preservation
             of raw IdP attribute values SHOULD log the pre-sanitization values in a
             separate diagnostic log (not the audit trail) for forensic purposes.

             Reference: 21 CFR 11.10(e), ALCOA+ Legible principle, ALCOA+ Original
             principle, EU GMP Annex 11 section 9.
```

### Design Decisions

**Permissions as `ReadonlySet<string>` at runtime.** At compile time, permissions are branded `Permission<TResource, TAction>` tokens. At runtime, the subject's permission set stores them as `"resource:action"` strings in a `ReadonlySet`. The evaluator compares by name string. This is intentional:

1. Branded tokens provide compile-time safety for policy _definition_ (you cannot pass a typo to `hasPermission()`)
2. Runtime evaluation operates on the flattened string set for O(1) lookup performance
3. Dynamic permissions (from databases) degrade naturally to string representation

**Roles as `readonly string[]`.** Role names are stored as an array of strings. The evaluator checks membership via `.includes()`. For most applications, role lists are small (3-10 entries), so linear scan is fast enough. If performance is a concern, the `PrecomputedSubject` converts this to a `ReadonlySet<string>`.

**Attributes as `Readonly<Record<string, unknown>>.`** Attributes are an open-ended bag of key-value pairs. The matcher DSL (section 16) resolves attribute values by path. Common attributes include `department`, `organization`, `clearanceLevel`, `ipAddress`, `timeZone`.

**Authentication provenance on every AuthSubject.** Every AuthSubject must declare its authentication provenance for audit compliance (see [ADR #16](../decisions/016-auth-subject-authentication-fields.md)). Non-GxP users set `authenticationMethod` to `"none"` and `authenticatedAt` to the current time. This ensures that every authorization decision in the audit trail can be traced back to a specific authentication event, satisfying regulatory traceability requirements.

```
REQUIREMENT: SubjectProviderPort adapters MUST provide authenticatedAt in ISO 8601 UTC
             format with the "Z" designator (e.g., "2024-01-15T10:30:00.000Z"). Local
             timezone offsets (e.g., "+05:30") MUST NOT be used. This ensures timestamp
             consistency with all other guard timestamps (Decision.evaluatedAt,
             AuditEntry.timestamp, ElectronicSignature.signedAt) and prevents ambiguity
             during cross-timezone audit trail review.
             Reference: ALCOA+ Contemporaneous and Consistent principles.
```

```
REQUIREMENT: When gxp is true, the guard evaluator MUST reject subjects whose
             authenticationMethod is "none" or "anonymous" before policy evaluation
             begins. The rejection MUST produce a Deny decision with reason
             "GxP: anonymous or unauthenticated subjects are not permitted" and
             the decision MUST be recorded in the audit trail. This prevents
             unauthenticated access to GxP-protected resources.
             Reference: 21 CFR 11.10(d), 21 CFR 11.100(a).
```

```typescript
/**
 * A GxP-validated AuthSubject that has passed identity verification.
 * When `gxp: true`, all subjects MUST be validated via validateGxPSubject()
 * before entering the guard evaluation pipeline.
 */
interface GxPAuthSubject extends AuthSubject {
  readonly _brand: "GxPAuthSubject";
  /** The subject has been validated: subjectId is non-empty, authenticationMethod is non-anonymous. */
  readonly validated: true;
}

/**
 * Validates an AuthSubject for GxP compliance.
 * Rejects anonymous subjects (empty subjectId or authenticationMethod === "anonymous").
 * Returns a branded GxPAuthSubject on success.
 */
function validateGxPSubject(subject: AuthSubject): Result<GxPAuthSubject, AccessDeniedError>;
```

```
REQUIREMENT: When gxp is true, validateGxPSubject() MUST reject subjects where
             subjectId is empty or authenticationMethod is "anonymous". The
             rejection MUST return Err(AccessDeniedError) with code ACL014 and
             reason "GxP mode requires authenticated, non-anonymous subjects".
             The validated GxPAuthSubject type provides compile-time assurance
             that downstream guard evaluation only processes verified subjects.
             Reference: 21 CFR 11.10(d), ALCOA+ Attributable.
```

```
REQUIREMENT: SubjectProvider adapters MUST validate the structural integrity of
             AuthSubject fields before returning the subject for policy evaluation:
             - `id` MUST be a non-empty string
             - `roles` MUST be an array (may be empty for direct-permission models)
             - `permissions` MUST be a Set (may be empty if all grants come from roles)
             - `authenticationMethod` MUST be a non-empty string
             - `authenticatedAt` MUST be a valid ISO 8601 UTC timestamp with the "Z"
               designator (consistent with section 22 timestamp requirements)
             If any field fails validation, the SubjectProvider MUST reject the subject
             with a descriptive error (e.g., "SubjectProvider: id must be a non-empty
             string") before policy evaluation begins. Invalid subjects MUST NOT reach
             the guard evaluator.
             Reference: EU GMP Annex 11 §6 (accuracy checks on data input).
```

> **React integration guidance:** When `useCan()` returns `undefined` (subject still loading), consuming components in security-sensitive contexts SHOULD treat this as a deny. Rendering protected content while the subject is unknown creates a window where unauthorized users may see GxP data. See section 44 for the `<Can>` component's `fallback` prop, which handles this case in JSX.

### PrecomputedSubject

```typescript
/**
 * A subject with precomputed lookup structures for fast evaluation.
 *
 * Created by SubjectProvider at subject-creation time. All downstream
 * consumers use the precomputed form. The permission set is already
 * flattened from roles, and roles are stored as a Set for O(1) lookup.
 */
export interface PrecomputedSubject extends AuthSubject {
  /** Role names as a Set for O(1) membership check. */
  readonly roleSet: ReadonlySet<string>;
  /** Flattened permission strings ("resource:action") for O(1) lookup. */
  readonly permissionSet: ReadonlySet<string>;
}
```

The `PrecomputedSubject` is created once when the subject enters the system (e.g., when the JWT is decoded or the session is loaded). The precomputation includes:

1. Flattening all role permissions via `flattenPermissions()` and merging with direct grants
2. Storing the result as a `ReadonlySet<string>` for O(1) `has()` checks
3. Converting the role array to a `ReadonlySet<string>` for O(1) role membership checks

```typescript
function precomputeSubject(raw: AuthSubject): PrecomputedSubject {
  return {
    ...raw,
    roleSet: new Set(raw.roles),
    permissionSet: flattenPermissions(raw.roles, raw.permissions),
  };
}
```

### Usage

```typescript
// Constructing a subject from a decoded JWT
const subject: AuthSubject = {
  id: decoded.sub,
  roles: decoded.roles,
  permissions: new Set(decoded.permissions),
  attributes: {
    department: decoded.department,
    organization: decoded.org,
    email: decoded.email,
  },
  authenticationMethod: "jwt",
  authenticatedAt: decoded.iat
    ? new Date(decoded.iat * 1000).toISOString()
    : new Date().toISOString(),
};

// Precompute for fast evaluation
const precomputed = precomputeSubject(subject);

// Evaluate a policy
const result = evaluate(policy, { subject: precomputed });
```

## BEH-GD-021: SubjectProviderPort (§23)

The `SubjectProviderPort` is an outbound port with scoped lifetime. It provides the current authorization subject from the execution context. On the server side, this means extracting the subject from the HTTP request (JWT, session, headers). On the React side, the subject flows through React context instead (see section 24).

### Port Definition

```typescript
import { createPort } from "@hex-di/core";

/**
 * Service interface for providing the current authorization subject.
 *
 * The subject provider resolves the "who" for authorization checks.
 * It is a scoped port: each request scope gets its own subject.
 */
export interface SubjectProvider {
  /** Returns the current authorization subject. */
  getSubject(): AuthSubject;
}

/**
 * Port for the subject provider.
 *
 * This is a well-known outbound port. The guard() wrapper injects
 * this dependency to obtain the current authorization subject.
 */
export const SubjectProviderPort = createPort<"SubjectProvider", SubjectProvider>({
  name: "SubjectProvider",
  direction: "outbound",
  category: "guard/subject",
  description: "Provides the current authorization subject from execution context",
});
```

### Why a Port?

The subject provider is a port (not a function or a global) because:

1. **Testability.** In tests, provide a `MemorySubjectProvider` that returns a fixed subject. No mocking.
2. **Scope isolation.** Each request scope resolves its own subject. No global mutable state.
3. **Graph visibility.** The subject provider appears in the dependency graph. The inspector can see which adapters depend on it.
4. **Swappable.** Server-side: JWT adapter. Test: static adapter. Development: hardcoded admin adapter.

### Synchronous `getSubject()`

The `getSubject()` method is synchronous. This is critical for the guard architecture (architecture-review #3):

- The subject is resolved once when the scope is created (from the request context)
- Subsequent calls return the cached value
- The guard wrapper calls `getSubject()` inside the factory, which must be synchronous to preserve adapter lifetimes

If the subject requires an async lookup (e.g., database query), that lookup must happen before the scope is created. The `createSubjectAdapter` helper (section 24) accepts a synchronous factory for this reason.

## BEH-GD-022: Scoped Subject Adapter (§24)

### Server-Side: Scoped Adapter

On the server side, the subject is resolved from the request context. The `createSubjectAdapter` helper creates a scoped adapter that calls a factory function to produce the subject.

```typescript
/**
 * Creates a scoped adapter for SubjectProviderPort.
 *
 * The factory function receives the resolution context and returns
 * the AuthSubject for the current scope. It is called once per scope
 * (scoped lifetime caching ensures this).
 *
 * @param factory - Synchronous function that produces the AuthSubject
 * @returns An adapter for SubjectProviderPort with scoped lifetime
 */
export function createSubjectAdapter(
  factory: () => AuthSubject
): Adapter<typeof SubjectProviderPort>;
```

### Usage: Express/Hono/Server

```typescript
import { createSubjectAdapter } from "@hex-di/guard";

// In a Hono middleware or request handler:
function createRequestScope(request: Request, container: Container): Scope {
  const scope = container.createScope();

  // Decode the JWT from the request headers
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const decoded = verifyJwt(token);

  // Register the subject adapter for this scope
  const subjectAdapter = createSubjectAdapter(() => ({
    id: decoded.sub,
    roles: decoded.roles,
    permissions: new Set(decoded.permissions),
    attributes: {
      department: decoded.department,
      organization: decoded.org,
    },
    authenticationMethod: "jwt",
    authenticatedAt: decoded.iat
      ? new Date(decoded.iat * 1000).toISOString()
      : new Date().toISOString(),
  }));

  // Provide the adapter in the scope's graph
  scope.provide(subjectAdapter);

  return scope;
}

// Later, when resolving a guarded port:
const userRepo = scope.resolve(UserRepoPort);
// guard() calls SubjectProviderPort.getSubject() inside the factory
// The subject comes from the JWT decoded above
```

```
RECOMMENDED: When creating successive scopes for the same subjectId (e.g., on
             token refresh or role change), SubjectProviderPort adapters SHOULD
             log permission set changes between scope creations. The log entry
             SHOULD include:
             - subjectId
             - timestamp (ISO 8601 UTC)
             - added permissions (set difference: new − previous)
             - removed permissions (set difference: previous − new)
             - change attribution (e.g., token refresh, admin action, role sync)

             This provides visibility into permission grants and revocations for
             ALCOA+ Complete compliance. Permission change logging enables
             auditors to reconstruct the full history of a subject's effective
             permissions without querying external identity providers.
             Reference: ALCOA+ Complete, 21 CFR 11.10(e).
```

### React-Side: Pure React Context (NOT DI Scope)

On the React side, the subject is provided via pure React context. It does NOT create a DI scope. This is a critical architectural decision (architecture-review #5):

**Why NOT a DI scope in React?**

1. The existing React integration already has `HexDiAutoScopeProvider` for managing DI scopes. Adding another scope just for the subject creates unnecessary nesting.
2. The subject is an authorization concept, not a DI lifecycle concept. It should flow through React context, not through the container.
3. `useCan()` performs an in-memory set lookup -- it does not need to resolve anything from the container.

```typescript
// React-side: SubjectProvider is a React context provider
import { SubjectProvider } from "@hex-di/guard/react";

function App({ currentUser }: { currentUser: AuthSubject }) {
  return (
    <SubjectProvider subject={currentUser}>
      <Dashboard />
    </SubjectProvider>
  );
}
```

### Comparison: Server vs React

| Aspect            | Server-Side                      | React-Side                              |
| ----------------- | -------------------------------- | --------------------------------------- |
| Subject source    | JWT, session, headers            | Props or API response                   |
| Mechanism         | Scoped adapter via DI            | React context provider                  |
| Creates DI scope? | No (uses existing request scope) | No                                      |
| Evaluation        | `guard()` inside factory         | `useCan()` / `usePolicy()` in component |
| Subject lifetime  | Request scope                    | React component tree lifetime           |
| Type              | `SubjectProviderPort` (DI port)  | `SubjectContext` (React context)        |

### Loading State

On the React side, the subject may not be available immediately (e.g., fetched from an API after mount). The `SubjectProvider` accepts `AuthSubject | null`:

```typescript
function App() {
  const [subject, setSubject] = useState<AuthSubject | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setSubject);
  }, []);

  return (
    <SubjectProvider subject={subject}>
      <Dashboard />
    </SubjectProvider>
  );
}
```

When `subject` is `null`:

- `useCan()` returns `undefined` (not `false` -- `undefined` means "loading")
- `<Can>` renders its `fallback` prop (default: `null`)
- `useSubject()` returns `null`
- `usePolicy()` returns `undefined`

This three-state model prevents the "flash of unauthorized content" problem (architecture-review #9).

### Session Lifecycle Patterns

```
RECOMMENDED: Organizations deploying @hex-di/guard in environments with long-lived
             sessions (WebSocket connections, background workers, single-page applications)
             SHOULD implement the following session lifecycle controls:

             1. **Inactivity timeout:** Delegate session timeout enforcement to the
                Identity Provider (IdP). Configure maxScopeLifetimeMs on the guard
                graph to bound the maximum scope duration independently of IdP session
                lifetime. This provides defense-in-depth: the IdP handles session
                expiration, while guard bounds the authorization scope lifetime.

             2. **Concurrent session alerting:** When the same subjectId appears in
                multiple active scopes simultaneously, the guard system SHOULD emit
                a WARNING-level alert if the concurrent scope count exceeds a
                configurable threshold (default: 2). This detects potential credential
                sharing or session hijacking. The alert SHOULD include:
                - subjectId
                - current concurrent scope count
                - scope creation timestamps
                - threshold that was exceeded
                The alert is advisory — it does NOT block scope creation. Organizations
                SHOULD define escalation procedures for concurrent session alerts in
                their security operations playbook.

             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
RECOMMENDED: When maxScopeLifetimeMs expires, subsequent guard evaluations
             within the expired scope SHOULD receive Deny with error code
             ACL013 (ScopeExpiredError). In-flight evaluations that began
             before expiry SHOULD be allowed to complete. A WARNING-level
             log SHOULD be emitted on scope expiry including the scopeId,
             subject identity, and elapsed scope lifetime. Scope expiry
             SHOULD trigger chain verification for the expiring scope
             (cross-reference: 02-audit-trail-contract.md §61.4, chain
             verification at scope disposal).
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

## BEH-GD-023: AttributeResolverPort (§22a)

The `AttributeResolverPort` is an optional outbound infrastructure port for on-demand attribute resolution in async evaluation paths. It enables dynamic ABAC where not all subject attributes are known at scope creation time.

```typescript
import { port } from "@hex-di/core";

/**
 * Port for on-demand attribute resolution.
 *
 * Used by evaluateAsync() when an attribute referenced by a HasAttributePolicy
 * is missing from the subject's attributes. The resolver fetches the attribute
 * value from an external source (identity provider, database, API).
 *
 * This port is OPTIONAL. When absent, evaluateAsync() behaves identically
 * to evaluate() — all attributes must be pre-populated on the subject.
 */
export interface AttributeResolver {
  /**
   * Resolves a single attribute value for a subject.
   *
   * @param subjectId - The subject's identifier
   * @param attribute - The attribute name to resolve
   * @param resource - Optional resource context for context-dependent attributes
   * @returns The attribute value, or undefined if the attribute does not exist
   */
  resolve(
    subjectId: string,
    attribute: string,
    resource?: Resource
  ): Promise<unknown>;
}

export const AttributeResolverPort = port<AttributeResolver>()({
  name: "AttributeResolverPort",
  direction: "outbound",
  category: "guard/attribute-resolver",
});
```

```
REQUIREMENT: The AttributeResolver MUST NOT cache attribute values across evaluation
             passes. Each evaluateAsync() invocation starts with a fresh resolution
             cache. Within a single evaluation pass, resolved attributes ARE cached
             (a second hasAttribute policy referencing the same attribute reuses the
             first resolution's value). This prevents stale attributes from affecting
             subsequent evaluations while avoiding redundant calls within a single pass.
             Reference: ADR #48.
```

## BEH-GD-024: RelationshipResolverPort (§22b)

The `RelationshipResolverPort` is an optional outbound infrastructure port for relationship-based access control (ReBAC). It enables the `hasRelationship` policy kind to check relationships between subjects and resources.

```typescript
import { port } from "@hex-di/core";

/**
 * Port for relationship resolution in ReBAC policies.
 *
 * Used by evaluate() (sync) and evaluateAsync() (async) when a
 * hasRelationship policy is in the policy tree. The resolver checks
 * whether the subject has the required relationship to the resource.
 *
 * This port is OPTIONAL. When absent and a hasRelationship policy is
 * encountered, the evaluator returns Err(MissingRelationshipResolver)
 * with code ACL028.
 *
 * Implementations may back this port with:
 * - In-memory adjacency lists (for testing or small datasets)
 * - Graph databases (Neo4j, Amazon Neptune)
 * - Dedicated ReBAC services (SpiceDB, OpenFGA)
 * - SQL queries against a relationship table
 */
export const RelationshipResolverPort = port<RelationshipResolver>()({
  name: "RelationshipResolverPort",
  direction: "outbound",
  category: "guard/relationship-resolver",
});
```

```
REQUIREMENT: RelationshipResolver.check() and checkAsync() MUST respect the `depth`
             parameter. depth=1 checks only direct relationships (single hop).
             depth=2 follows one intermediate relationship (two hops). Implementations
             MUST NOT traverse beyond the specified depth. When depth is not specified,
             it defaults to 1 (direct relationships only).
             Reference: ADR #54.

REQUIREMENT: RelationshipResolver implementations MUST handle cycles in the
             relationship graph gracefully. A subject with a circular relationship
             chain (A→B→C→A) MUST NOT cause infinite traversal. Implementations
             SHOULD use visited-set tracking to detect and break cycles.

RECOMMENDED: For GxP environments, RelationshipResolver implementations SHOULD log
             all relationship checks (subjectId, relation, resourceId, result, durationMs)
             for audit trail completeness. Relationship checks that contribute to
             authorization decisions are part of the decision provenance.
             Reference: ALCOA+ Attributable, 21 CFR 11.10(e).
```

---

## Subject Enrichment Utilities

### withAttributes

```typescript
/**
 * Returns a new AuthSubject with additional attributes merged in.
 *
 * The original subject is not mutated. The returned subject inherits
 * all fields from the original and has the new attributes merged into
 * its existing attributes (new keys take precedence on conflict).
 *
 * Primary use: inject computed context (e.g., scope match booleans,
 * time-of-day values) before calling evaluate() when the matcher DSL
 * cannot express the computation natively.
 *
 * @param subject    - The base subject to augment
 * @param attributes - Additional attributes to merge
 * @returns A new AuthSubject with merged attributes
 */
export function withAttributes(
  subject: AuthSubject,
  attributes: Readonly<Record<string, unknown>>,
): AuthSubject;
```

#### Usage

```typescript
// Inject a precomputed boolean for policies that use hasAttribute()
const enriched = withAttributes(subject, {
  isBusinessHours: currentHour >= 9 && currentHour < 17,
})

const result = evaluate(canApproveContent, { subject: enriched })
```

```
REQUIREMENT: withAttributes() MUST return a new object; it MUST NOT mutate
             the input subject. The returned object MUST satisfy all structural
             checks of AuthSubject. If the subject is a PrecomputedSubject,
             the returned object MUST preserve roleSet and permissionSet.
```

---

### getAttribute

```typescript
/**
 * Type-safe attribute accessor with runtime validation.
 *
 * Returns the attribute value if it exists and passes the validator,
 * or undefined otherwise. Eliminates inline type guards for
 * subject.attributes access.
 *
 * @param subject   - The subject to read from
 * @param key       - The attribute key
 * @param validate  - Type guard for the expected value type
 * @returns The typed value, or undefined if absent or invalid
 */
export function getAttribute<T>(
  subject: AuthSubject,
  key: string,
  validate: (value: unknown) => value is T,
): T | undefined;
```

#### Usage

```typescript
// Before: manual type guard inline
const rawScopes = subject.attributes['scopes']
const userScopes = isUserScopeArray(rawScopes) ? rawScopes : []

// After: named accessor
const userScopes = getAttribute(subject, 'scopes', isUserScopeArray) ?? []
```

---

### AuthSubjectAttributes Module Augmentation

Applications MAY declare their attribute schema via module augmentation to enable compile-time type checking for `subject.attributes` field access.

```typescript
/**
 * Applications MAY declare their attribute schema via module augmentation
 * to enable compile-time type checking for subject.attributes field access.
 *
 * This is an opt-in pattern. The augmentation does NOT change runtime behavior.
 */

// In your app's type declarations (e.g., src/types/guard.d.ts):
declare module '@hex-di/guard' {
  interface AuthSubjectAttributes {
    email: string
    scopes: UserScope[]
  }
}
// After augmentation: subject.attributes.scopes is typed as UserScope[]
// No getAttribute() call needed.
```

The `AuthSubjectAttributes` interface is declared but empty by default in `@hex-di/guard`. Consumers augment it to add application-specific fields:

```typescript
// In @hex-di/guard — empty by default, extended by consumers
export interface AuthSubjectAttributes {}

export interface AuthSubject {
  readonly attributes: Readonly<Record<string, unknown> & AuthSubjectAttributes>;
  // ...
}
```

> **Note:** This module augmentation pattern is an ergonomic opt-in for applications with a stable, well-typed attribute schema. It does NOT replace `getAttribute()` for dynamic or partially-known schemas. The augmentation only affects TypeScript — it does not change any runtime validation.

---

_Next: [07 - Guard Adapter](./06-guard-adapter.md)_
