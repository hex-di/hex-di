# 01 - Overview & Philosophy

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-01                                 |
| Revision         | 1.1                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.1 (2026-02-13): Added URS (User Requirement Specifications) section with URS-to-FS traceability (REQ-GUARD-072) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

## 1. Overview

`@hex-di/guard` provides compile-time-safe authorization for the HexDI ecosystem. Permissions and roles are branded nominal tokens. Policies are discriminated unions composed through algebraic combinators. Authorization decisions flow through the dependency graph -- visible in inspection, traceable in spans, and scoped to requests.

The core package ships the complete authorization engine: permission tokens, role tokens with DAG inheritance, a policy discriminated union with ten variants, a pure synchronous evaluator, a `guard()` adapter wrapper for container-level enforcement, and a `createPortGateHook` for coarse-grained port gating. No external authorization libraries are vendored or wrapped.

```typescript
import {
  createPermission,
  createPermissionGroup,
  createRole,
  hasPermission,
  hasRole,
  allOf,
  guard,
  evaluate,
} from "@hex-di/guard";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Define permission tokens
const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);

// 2. Define roles with inheritance
const Viewer = createRole({
  name: "viewer",
  permissions: [UserPerms.read],
});

const Editor = createRole({
  name: "editor",
  permissions: [UserPerms.write],
  inherits: [Viewer],
});

const Admin = createRole({
  name: "admin",
  permissions: [UserPerms.delete],
  inherits: [Editor],
});

// 3. Compose policies
const canManageUsers = allOf(hasPermission(UserPerms.write), hasRole("editor"));

// 4. Wrap an adapter with guard enforcement
const GuardedUserRepo = guard(UserRepoAdapter, {
  resolve: canManageUsers,
});

// 5. Build the graph and resolve
const graph = GraphBuilder.create()
  .provide(GuardedUserRepo)
  .provide(SubjectProviderAdapter)
  .provide(PolicyEngineAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
const scope = container.createScope();
const repo = scope.resolve(UserRepoPort); // policy evaluated here
```

### What this package provides

- **Permission tokens** -- branded nominal types with `Symbol.for()` structural compatibility across modules
- **Permission groups** -- mapped type factory for creating all permissions for a resource in one call
- **Role tokens** -- branded types with DAG inheritance and eager permission flattening at construction time
- **Cycle detection** -- compile-time via `ValidateRoleInheritance` type and runtime via visited-set + depth limit
- **Policy discriminated union** -- ten variants: `HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasSignature`, `HasRelationship`, `AllOf`, `AnyOf`, `Not`, `Labeled`
- **Policy combinators** -- `hasPermission()`, `hasRole()`, `hasAttribute()`, `hasResourceAttribute()`, `hasSignature()`, `hasRelationship()`, `allOf()`, `anyOf()`, `not()`, `withLabel()` builder functions
- **Matcher DSL** -- closed set of serializable matchers (`eq`, `neq`, `in`, `exists`) for attribute policies
- **Policy evaluator** -- pure synchronous `evaluate()` function returning `Result<Decision, PolicyEvaluationError>`
- **Guard adapter** -- `guard()` wraps any adapter with policy enforcement at resolution time
- **Port gate hook** -- `createPortGateHook()` for coarse-grained, subject-free port gating
- **Subject port** -- `SubjectProviderPort` as a scoped outbound port for per-request subject injection
- **Serialization** -- `serializePolicy()` and `deserializePolicy()` for JSON round-tripping
- **React integration** -- `SubjectProvider`, `<Can>`, `<Cannot>` (suspend on null subject), Suspense hooks (`useCan`, `usePolicy`, `useSubject`), deferred hooks (`useCanDeferred`, `usePolicyDeferred`, `useSubjectDeferred`), `CanResult`/`PolicyResult` types
- **Inspection** -- `GuardInspector` for runtime introspection of guard decisions
- **Electronic signature contract** -- `SignatureServicePort`, `SignatureService` interface, `hasSignature` policy variant, re-authentication types, and key management behavioral requirements for 21 CFR Part 11 compliance
- **Testing utilities** -- `createTestSubject`, `testPolicy`, custom matchers, memory adapters

### What this package does NOT provide

- No authentication -- this library does not handle login, sessions, tokens, or identity verification
- No policy persistence -- storing and loading policies from databases is the application's responsibility
- No network-level enforcement -- no HTTP middleware, WebSocket interceptors, or GraphQL directives
- No multi-tenancy primitives -- tenant isolation uses hex-di scopes, composed with guard policies
- No admin UI -- policies are code or serialized data, not a visual editor
- No `custom(fn)` escape hatch in v1 -- every policy is serializable JSON data, period
- No `any` types in the public API surface
- No type casting internally

### 0.1.0 Scope

- Core types: `Permission`, `PermissionGroup`, `Role`, `Policy` (10 variants), `Decision`, `EvaluationTrace`, `ValidatedSignature`, `SignatureCaptureRequest`, `ReauthenticationChallenge`, `ReauthenticationToken`, `SignatureValidationResult`
- Ports: `PolicyEnginePort`, `SubjectProviderPort`, `AuditTrailPort`, `SignatureServicePort` (optional)
- Interfaces: `PolicyEngine`, `SubjectProvider`, `AuthSubject`, `AuditTrail`, `SignatureService`
- Factories: `createPermission`, `createPermissionGroup`, `createRole`, `guard`
- Combinators: `hasPermission`, `hasRole`, `hasAttribute`, `hasSignature`, `allOf`, `anyOf`, `not`
- Matchers: `eq`, `neq`, `inArray`, `exists`, `subject`, `resource`, `literal`
- Evaluator: `evaluate`
- Serialization: `serializePolicy`, `deserializePolicy`, `explainPolicy`
- Hook: `createPortGateHook`
- Utility types: `InferResource`, `InferAction`, `FormatPermission`, `InferPermissions`, `InferPolicyRequirements`, `FlattenRolePermissions`, `ValidateRoleInheritance`, `GuardedAdapter`, `AppendAclPorts`
- Error types: `NotAPermissionError`, `NotARoleError`, `CircularRoleInheritanceError`, `PolicyEvaluationError`, `AccessDeniedError`, `AuditTrailWriteError`, `SignatureError`
- Testing: `@hex-di/guard-testing` with `createTestSubject`, `testPolicy`, `setupGuardMatchers`, memory adapters, conformance suites (AuditTrail + SubjectProvider)
- React: `integrations/react-guard` with `SubjectProvider`, `Can`, `Cannot`, `useCan`, `usePolicy`, `useSubject`, `useCanDeferred`, `usePolicyDeferred`, `useSubjectDeferred`, `CanResult`, `PolicyResult`

## 2. Philosophy

### Zero dependencies

The core `@hex-di/guard` package depends only on `@hex-di/core` as a peer dependency. No external authorization libraries (casl, casbin, accesscontrol) are vendored, wrapped, or imported. The branding machinery, policy data structures, and evaluation engine are built from scratch using TypeScript's type system and the hex-di architectural patterns.

```
@hex-di/guard  (zero external deps)
  |
  +-- @hex-di/core (peer dependency)
```

### Branded nominal tokens

Permissions and roles are branded types following the same `Symbol.for()` + phantom brand pattern used by `Port` and `Adapter` in `@hex-di/core`. A typo in a permission name is a type error, not a silent runtime failure.

```typescript
const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

// Type error: Permission<'user', 'read'> is not assignable to Permission<'user', 'write'>
const policy: HasPermissionPolicy<typeof WriteUser> = hasPermission(ReadUser);
```

Unlike Ports (which use `unique symbol` for nominal typing), Permissions use `Symbol.for()` for structural compatibility: two `Permission<'user', 'read'>` values created independently in different modules are the same type. This is intentional -- `user:read` means the same thing everywhere.

### Discriminated unions for policies

Every policy node has a `readonly kind` field. The full policy type is a union of ten variants. Pattern matching via `switch (policy.kind)` is exhaustive. No callbacks, no `evaluate` methods on objects, no class hierarchies.

```typescript
function describePolicy(policy: Policy): string {
  switch (policy.kind) {
    case "hasPermission":
      return `requires permission ${policy.permission.resource}:${policy.permission.action}`;
    case "hasRole":
      return `requires role ${policy.roleName}`;
    case "hasAttribute":
      return `checks attribute ${policy.attribute}`;
    case "hasSignature":
      return `requires signature with meaning ${policy.meaning}`;
    case "allOf":
      return `all of [${policy.policies.map(describePolicy).join(", ")}]`;
    case "anyOf":
      return `any of [${policy.policies.map(describePolicy).join(", ")}]`;
    case "not":
      return `not (${describePolicy(policy.policy)})`;
  }
}
```

### Result type for evaluation

Policy evaluation returns `Result<Decision, PolicyEvaluationError>`, not a boolean. The `Decision` is a discriminated union on `kind: "allow" | "deny"`. A `Deny` is a valid, expected outcome -- not an error. Errors (ACL003-ACL007) represent situations where evaluation itself fails: missing subject, unconfigured engine, invalid policy structure. The decision carries a full `EvaluationTrace` -- which sub-policies passed, which failed, and why.

### Container integration via guard wrapper

The `guard()` function wraps an adapter, injecting `PolicyEnginePort` and `SubjectProviderPort` into its `requires` tuple. Authorization is checked inside the factory at resolution time, not at the route level. A guarded port cannot be resolved without passing its policy. The guard is synchronous: the subject is pre-resolved (scoped, cached), and the policy evaluator operates on in-memory data only.

```typescript
const GuardedRepo = guard(UserRepoAdapter, {
  resolve: hasPermission(UserPerms.read),
});
// GuardedRepo.requires = [...originalRequires, PolicyEnginePort, SubjectProviderPort]
```

### Scope-per-request subject

The authorization subject (user, service account, API key) is provided via a scoped adapter. Each request scope gets its own subject. No global mutable state. On the server side, the subject is resolved from the request context (JWT, session, headers). On the React side, the subject is provided via pure React context -- not a DI scope.

```typescript
// Server: scoped adapter resolves subject from decoded JWT (closure)
const decoded = verifyJwt(token);
const SubjectAdapter = createSubjectAdapter(() => ({
  id: decoded.sub,
  roles: decoded.roles,
  permissions: new Set(decoded.permissions),
  attributes: { department: decoded.department },
  authenticationMethod: "jwt",
  authenticatedAt: new Date(decoded.iat * 1000).toISOString(),
}));

// React: pure React context, no DI scope
<SubjectProvider subject={currentUser}>
  <App />
</SubjectProvider>
```

## 3. Package Structure

```
packages/guard/
  src/
    tokens/
      permission.ts          # Permission type, PERMISSION_BRAND, createPermission
      permission-group.ts    # PermissionGroupMap, createPermissionGroup
      role.ts                # Role type, ROLE_BRAND, createRole
      index.ts
    policy/
      types.ts               # Policy union, PolicyKind, all 10 variants
      combinators.ts         # hasPermission, hasRole, hasAttribute, hasResourceAttribute, hasRelationship, withLabel, hasSignature, allOf, anyOf, not
      constraint.ts          # PolicyConstraint interface
      matchers.ts            # eq, neq, inArray, exists, subject, resource, literal
      index.ts
    evaluator/
      evaluate.ts            # evaluate() pure function
      decision.ts            # Decision, Allow, Deny types
      trace.ts               # EvaluationTrace type
      errors.ts              # PolicyEvaluationError, AccessDeniedError
      index.ts
    guard/
      guard.ts               # guard() wrapper function
      types.ts               # GuardedAdapter, AppendAclPorts, HasPortNamed
      index.ts
    subject/
      auth-subject.ts        # AuthSubject, PrecomputedSubject interfaces
      provider-port.ts       # SubjectProviderPort definition
      adapter.ts             # createSubjectAdapter helper
      index.ts
    hook/
      port-gate.ts           # createPortGateHook
      index.ts
    serialization/
      serialize.ts           # serializePolicy
      deserialize.ts         # deserializePolicy
      explain.ts             # explainPolicy
      index.ts
    inspection/
      inspector.ts           # GuardInspector interface
      events.ts              # GuardInspectorEvent types
      index.ts
    signature/
      types.ts               # ElectronicSignature, SignatureCaptureRequest, ReauthenticationChallenge, ReauthenticationToken, SignatureValidationResult, SignatureError
      port.ts                # SignatureServicePort, SignatureService interface, NoopSignatureService
      meanings.ts            # SignatureMeanings constants
      index.ts
    errors/
      codes.ts               # Error code allocation ACL001-ACL009
      types.ts               # NotAPermissionError, NotARoleError, etc.
      index.ts
    utils/
      flatten.ts             # flattenPermissions runtime function
      inference.ts           # InferResource, InferAction, FormatPermission, etc.
      index.ts
    index.ts                 # Public API

packages/guard-testing/
  src/
    subject.ts               # createTestSubject, resetSubjectCounter
    fixtures.ts              # Pre-built permissions, roles, subjects
    policy.ts                # testPolicy
    guard.ts                 # testGuard
    matchers.ts              # setupGuardMatchers (toAllow, toDeny, etc.)
    react.tsx                # createTestGuardWrapper
    memory-policy-engine.ts  # createMemoryPolicyEngine
    static-subject-provider.ts
    conformance.ts           # createAuditTrailConformanceSuite (17 test cases), createSubjectProviderConformanceSuite (12 test cases)
    index.ts

packages/guard-validation/
  src/
    iq.ts              # runIQ() — installation qualification
    oq.ts              # runOQ() — operational qualification
    pq.ts              # runPQ() — performance qualification (soak test)
    traceability.ts    # generateTraceabilityMatrix()
    types.ts           # QualificationCheck, IQResult, OQResult, PQResult, TraceabilityMatrix
    index.ts

integrations/react-guard/
  src/
    providers/
      subject-provider.tsx   # SubjectProvider (React context, not DI scope, Suspense support)
    components/
      can.tsx                # Can conditional rendering component (suspends on null)
      cannot.tsx             # Cannot conditional rendering component (suspends on null)
    hooks/
      use-can.ts             # useCan(permission) -> boolean (suspends)
      use-can-deferred.ts    # useCanDeferred(permission) -> CanResult (never suspends)
      use-policy.ts          # usePolicy(policy) -> Decision (suspends)
      use-policy-deferred.ts # usePolicyDeferred(policy) -> PolicyResult (never suspends)
      use-subject.ts         # useSubject() -> AuthSubject (suspends)
      use-subject-deferred.ts # useSubjectDeferred() -> AuthSubject | null (never suspends)
      use-policies.ts        # usePolicies(map) -> PoliciesDecisions<M> (suspends)
      use-policies-deferred.ts # usePoliciesDeferred(map) -> PoliciesResult<M> (never suspends)
    factories/
      create-guard-hooks.tsx # createGuardHooks() factory (11 members)
    context/
      subject-context.ts     # React context for AuthSubject + pending promise
    types.ts                 # CanResult, PolicyResult discriminated unions
    index.ts
```

## 4. Architecture Diagram

```
+------------------------------------------------------------------+
|                      Application Code                            |
|                                                                  |
|  const perms = createPermissionGroup("user", ["read", "write"])  |
|  const Editor = createRole({ name: "editor", ... });             |
|  const policy = allOf(hasPermission(perms.read), hasRole("ed")); |
|  const Guarded = guard(UserRepoAdapter, { resolve: policy });    |
|                                                                  |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                      @hex-di/guard                               |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  Permission / Role Tokens                                  |  |
|  |  createPermission, createPermissionGroup, createRole       |  |
|  |  PERMISSION_BRAND (Symbol.for), ROLE_BRAND (Symbol.for)    |  |
|  +------------------------------------------------------------+  |
|                                |                                 |
|                                v                                 |
|  +------------------------------------------------------------+  |
|  |  Policy Combinators                                        |  |
|  |  hasPermission, hasRole, hasAttribute, hasSignature,       |  |
|  |  allOf, anyOf, not                                        |  |
|  |  Matcher DSL: eq, neq, inArray, exists                     |  |
|  +------------------------------------------------------------+  |
|                                |                                 |
|                                v                                 |
|  +------------------------------------------------------------+  |
|  |  PolicyEngine evaluate()                                   |  |
|  |  Pure function: (policy, context) -> Result<Decision, Err> |  |
|  |  Synchronous. Tree traversal. Returns EvaluationTrace.     |  |
|  +------------------------------------------------------------+  |
|                                |                                 |
|                                v                                 |
|  +---------------------------+  +-----------------------------+  |
|  |  guard() Wrapper          |  |  createPortGateHook         |  |
|  |  Wraps adapter factory.   |  |  Coarse beforeResolve hook. |  |
|  |  Injects PolicyEnginePort |  |  Static allow/deny map.     |  |
|  |  + SubjectProviderPort.   |  |  No subject, no resource.   |  |
|  |  Throws AccessDeniedError |  |  Feature flags / env gates. |  |
|  |  on denial.               |  |                             |  |
|  +---------------------------+  +-----------------------------+  |
|                                |                                 |
|                                v                                 |
|  +------------------------------------------------------------+  |
|  |  Container Resolution                                      |  |
|  |  resolve(port) -> service (or AccessDeniedError)           |  |
|  |  tryResolve(port) -> Result<service, ContainerError>       |  |
|  +------------------------------------------------------------+  |
|                                |                                 |
|                                v                                 |
|  +------------------------------------------------------------+  |
|  |  Decision (Allow | Deny)                                   |  |
|  |  + EvaluationTrace tree for debugging / auditing           |  |
|  +------------------------------------------------------------+  |
|                                |                                 |
|               +----------------+----------------+                |
|               |                                 |                |
|               v                                 v                |
|  +------------------------+  +---------------------------+       |
|  |  @hex-di/logger         |  |  @hex-di/tracing          |      |
|  |  Structured log entry   |  |  Span: guard:PortName     |      |
|  |  with decision details  |  |  attrs: outcome, policy,  |      |
|  +------------------------+  |         reason, duration   |      |
|                               +---------------------------+      |
|                                                                  |
+------------------------------------------------------------------+
```

### Dependency Graph

```
            @hex-di/guard  (zero external deps)
                    |
           +--------+--------+------------------+
           |                 |                   |
           v                 v                   v
     @hex-di/core     @hex-di/guard-testing   @hex-di/guard-validation
                      (vitest peer dep)       (@hex-di/guard, vitest peer deps)
                             |
                             v
                    integrations/react-guard
                    (react, @hex-di/react peer deps)
```

### Package Dependencies

| Package                    | Dependencies | Peer Dependencies                         |
| -------------------------- | ------------ | ----------------------------------------- |
| `@hex-di/guard`            | none         | `@hex-di/core`                            |
| `@hex-di/guard-testing`    | none         | `@hex-di/guard`, `vitest`                 |
| `@hex-di/guard-validation` | none         | `@hex-di/guard`, `vitest`                 |
| `integrations/react-guard` | none         | `@hex-di/guard`, `@hex-di/react`, `react` |

## Vision Alignment

Guard is a **sensory nerve** in the HexDI nervous system architecture (VISION.md section 4). It reports authorization knowledge to the central nerve cluster (DI container) through the `LibraryInspector` protocol, making the application aware of its own security posture.

### Three Layers of Self-Knowledge

Guard contributes to all three self-knowledge layers defined in VISION.md section 3:

| Layer         | Question                        | Guard's Contribution                                                                                                                         |
| ------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure** | "What am I made of?"            | Active policies per port, permission/role token registry, policy tree topology, guard adapter dependency edges                               |
| **State**     | "What is my current condition?" | Recent authorization decisions (ring buffer), permission statistics (allow/deny counts per port, per subject), current subject in each scope |
| **Behavior**  | "What am I doing right now?"    | Evaluation traces (which sub-policies passed/failed), decision history timeline, tracing spans for each evaluation, structured log entries   |

### Nervous System Integration Points

```
Guard as Sensory Nerve:
  |
  +-- GuardInspector implements LibraryInspector protocol
  |     |
  |     +-- Reports structure: active policies map, permission registry
  |     +-- Reports state: decision ring buffer, permission stats
  |     +-- Reports behavior: evaluation traces, allow/deny timeline
  |
  +-- Guard events flow to Central Nerve Cluster (Container)
  |     |
  |     +-- guard.evaluate -> evaluation started
  |     +-- guard.allow   -> authorization granted
  |     +-- guard.deny    -> authorization denied
  |
  +-- Diagnostic Ports expose guard data to external consumers
        |
        +-- MCP Resources: hexdi://guard/snapshot, /policies, /decisions, /stats, /audit
        +-- A2A Skills: guard.inspect-policies, guard.audit-review
        +-- OTel Spans: guard.evaluate spans with decision attributes
```

### MAPE-K Loop Mapping

The MAPE-K (Monitor-Analyze-Plan-Execute-Knowledge) loop from VISION.md applies to guard:

| Phase         | Guard's Role                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monitor**   | GuardInspector continuously captures every authorization decision, building permission statistics and decision history                                          |
| **Analyze**   | MCP/A2A consumers analyze patterns: "which subjects are repeatedly denied?", "which ports have the most restrictive policies?", "are there unused permissions?" |
| **Plan**      | AI agents can recommend policy adjustments: "subject X never uses `delete` permission -- suggest removal", "port Y has 100% allow rate -- is guard necessary?"  |
| **Execute**   | Policy changes are code changes (version-controlled), deployed through normal CI/CD. Guard does not self-modify at runtime                                      |
| **Knowledge** | Audit trail provides the historical knowledge base. Policy snapshots (git history) provide the structural knowledge base                                        |

### Diagnostic Protocol Resources

Guard exposes its self-knowledge through standardized diagnostic protocols. See section 47 (12-inspection.md) for concrete MCP resource schemas and A2A skill definitions.

### Roadmap Phase Alignment

| Vision Phase               | Guard Contribution                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1: Structure**     | Policy tree topology, permission registry, guard adapter dependency edges in the graph                                                                                                                                                                                                                                              |
| **Phase 2: Awareness**     | GuardInspector, evaluation traces, decision history, permission statistics                                                                                                                                                                                                                                                          |
| **Phase 3: Communication** | MCP resources, A2A skills, OTel span export, structured logging                                                                                                                                                                                                                                                                     |
| **Phase 4: Autonomy**      | AI-driven policy recommendations (future), adaptive authorization patterns. **REQUIREMENT:** AI-recommended policy changes MUST go through the same change control process as human-authored changes (section 64a). AI recommendations MUST be recorded in the meta-audit trail with `simulated: true` until a human approves them. |
| **Phase 5: Learning**      | Historical audit analysis, permission usage patterns, policy optimization suggestions                                                                                                                                                                                                                                               |

## Multi-Tenancy Authorization Patterns

Guard supports multi-tenant applications through the existing scope and subject model:

1. **Tenant isolation via scopes:** Each tenant request creates a DI scope. The `scopeId` field on audit entries identifies the tenant. Per-scope hash chains provide independent audit trails per tenant.

2. **Tenant-scoped policies:** Use `hasAttribute("tenantId", eq(literal("tenant-123")))` to create tenant-specific policy rules. Policies can reference both the subject's tenant membership and the resource's tenant ownership.

3. **Cross-tenant access control:** For operations that span tenants (e.g., admin dashboards), use `anyOf` to compose tenant-specific policies with admin-level policies.

4. **Tenant-scoped audit:** Each tenant's audit entries form an independent hash chain (per-scope chain architecture, section 61.4a). This enables per-tenant audit trail export and verification without exposing other tenants' data.

```
RECOMMENDED: Multi-tenant GxP deployments SHOULD use the per-scope chain architecture
             (section 61.4a) with tenant ID as the scope identifier. This ensures
             audit trail isolation between tenants and supports per-tenant export for
             regulatory submissions.
```

## Data Classification Conventions

Guard does not enforce data classification directly, but policies can reference classification levels as attributes:

| Classification               | Description                           | Recommended Policy Pattern                                                  |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| **Public**                   | Non-sensitive, publicly accessible    | No guard required                                                           |
| **Internal**                 | Internal use only                     | `hasRole("employee")`                                                       |
| **Confidential**             | Restricted access, business-sensitive | `allOf(hasPermission(resource.read), hasRole("authorized"))`                |
| **GxP-Critical**             | Regulatory data subject to 21 CFR 11  | `allOf(hasPermission(...), guard() with gxp: true, failOnAuditError: true)` |
| **GxP-Critical + Signature** | Data requiring electronic signatures  | `allOf(hasPermission(...), hasSignature("reviewed"))`                       |

```
RECOMMENDED: Organizations SHOULD establish a data classification scheme and map each
             classification level to a corresponding authorization policy pattern.
             The mapping SHOULD be documented in the organization's security policy
             and referenced in the validation plan (section 67).
```

## URS. User Requirement Specifications

Per GAMP 5 guidance, regulated computerized systems require User Requirement Specifications (URS) that define what the system must do from the user's perspective, separate from the Functional Specification (FS) that defines how the system achieves those requirements, and the Design Specification (DS) that defines implementation details.

This specification combines URS, FS, and DS content in a single document set (chapters 01-17) for practical reasons: `@hex-di/guard` is a library (not a standalone system), and the user requirements, functional design, and implementation design are tightly coupled. The URS requirements below extract the user-facing needs from the broader specification to provide explicit URS-to-FS traceability as recommended by GAMP 5 Appendix D4.

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST
             maintain URS-to-FS traceability demonstrating that every user
             requirement is addressed by one or more functional specification
             sections, and every functional specification section traces back
             to a user requirement. The URS Registry table below provides the
             library-level traceability. Consumer organizations MUST extend
             this with site-specific user requirements (e.g., specific role
             hierarchies, policy structures, integration points) and map them
             to the corresponding spec sections and OQ test cases.
             Reference: GAMP 5 Appendix D4, WHO TRS 996 Annex 5
             (bi-directional traceability).
             REQ-GUARD-072.
```

### URS Registry

| URS ID        | User Requirement                                                                                               | FS Section(s)                                                            | REQ-GUARD ID(s)                             | OQ Evidence                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------- |
| URS-GUARD-001 | The system SHALL enforce permission-based access control on protected operations                               | §25-28 (07-guard-adapter.md), §05 (05-policy-evaluator.md)               | REQ-GUARD-037, REQ-GUARD-038                | OQ-1, OQ-3                                                 |
| URS-GUARD-002 | The system SHALL record every authorization decision (allow and deny) in an immutable audit trail              | §61 (02-audit-trail-contract.md)                                         | REQ-GUARD-005, REQ-GUARD-006                | OQ-6, OQ-7                                                 |
| URS-GUARD-003 | The system SHALL identify the person performing each recorded action (Attributable per ALCOA+)                 | §60 (01-regulatory-context.md), §22 (06-subject.md)                      | REQ-GUARD-004                               | OQ-7, OQ-26                                                |
| URS-GUARD-004 | The system SHALL use synchronized timestamps for all audit entries (Contemporaneous per ALCOA+)                | §62 (03-clock-synchronization.md)                                        | REQ-GUARD-014, REQ-GUARD-015                | OQ-17, PQ-6                                                |
| URS-GUARD-005 | The system SHALL detect any modification to audit trail records (data integrity)                               | §61.4 (02-audit-trail-contract.md)                                       | REQ-GUARD-010, REQ-GUARD-013                | OQ-6, OQ-27                                                |
| URS-GUARD-006 | The system SHALL support electronic signatures with re-authentication for GxP-critical operations              | §65 (07-electronic-signatures.md)                                        | REQ-GUARD-028, REQ-GUARD-029                | OQ-8, OQ-10                                                |
| URS-GUARD-007 | The system SHALL enforce separation of duties for counter-signing workflows                                    | §65d (07-electronic-signatures.md), §64a (06-administrative-controls.md) | REQ-GUARD-036, REQ-GUARD-065                | OQ-10, OQ-23                                               |
| URS-GUARD-008 | The system SHALL retain audit records for the minimum regulatory retention period                              | §63 (04-data-retention.md)                                               | REQ-GUARD-016, REQ-GUARD-017                | IQ, documented retention policy                            |
| URS-GUARD-009 | The system SHALL provide formal validation procedures (IQ/OQ/PQ) per GAMP 5                                    | §67 (09-validation-plan.md)                                              | REQ-GUARD-038, REQ-GUARD-039, REQ-GUARD-042 | IQ-1 through IQ-12, OQ-1 through OQ-42, PQ-1 through PQ-10 |
| URS-GUARD-010 | The system SHALL restrict administrative operations to authorized personnel                                    | §64g (06-administrative-controls.md)                                     | REQ-GUARD-026, REQ-GUARD-027                | OQ-34, OQ-35                                               |
| URS-GUARD-011 | The system SHALL support risk-based periodic review of authorization decisions                                 | §64 (05-audit-trail-review.md)                                           | REQ-GUARD-019                               | Annual OQ re-verification                                  |
| URS-GUARD-012 | The system SHALL manage policy changes through a controlled change process                                     | §64a (06-administrative-controls.md)                                     | REQ-GUARD-020, REQ-GUARD-021                | OQ-23, OQ-31                                               |
| URS-GUARD-013 | The system SHALL protect signing keys using hardware security or equivalent controls                           | §65c (07-electronic-signatures.md)                                       | REQ-GUARD-032, REQ-GUARD-033                | IQ-10, OQ-8                                                |
| URS-GUARD-014 | The system SHALL support backup, restore, and disaster recovery of audit data                                  | §63 (04-data-retention.md), §67f (09-validation-plan.md)                 | REQ-GUARD-018                               | OQ-18, OQ-29, DR test procedure                            |
| URS-GUARD-015 | The system SHALL document applicable predicate rules before GxP deployment                                     | §59 (01-regulatory-context.md)                                           | REQ-GUARD-003, REQ-GUARD-067                | OQ-38                                                      |
| URS-GUARD-016 | The system SHALL validate policy input data types before authorization evaluation                              | §59 (01-regulatory-context.md, Annex 11 §5)                              | REQ-GUARD-070                               | OQ-41                                                      |
| URS-GUARD-017 | The system SHALL check resource attribute accuracy and freshness for time-sensitive decisions                  | §59 (01-regulatory-context.md, Annex 11 §6)                              | REQ-GUARD-071                               | OQ-42                                                      |
| URS-GUARD-018 | The system SHALL manage certificate lifecycle and support algorithm migration for long-term signature validity | §65c-3, §65c-4 (07-electronic-signatures.md)                             | REQ-GUARD-068, REQ-GUARD-069                | OQ-39, OQ-40                                               |

---

_Next: [02 - Permission Types](./02-permission-types.md)_
