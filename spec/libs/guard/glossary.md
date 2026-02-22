# Glossary

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-GLOSSARY                           |
> | Revision         | 3.2                                      |
> | Effective Date   | 2026-02-20                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification — Glossary  |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 3.2 (2026-02-20): Corrected Document ID from GUARD-15-C to GUARD-GLOSSARY; updated title, classification, DMS reference, and removed appendix-style navigation to reflect root-level placement (CCR-GUARD-041) |
> |                  | 3.1 (2026-02-20): Added missing cross-reference links to 12 terms: Resource, Trace Digest, Field Mask, AttributeResolver, RelationshipResolver, Can, Cannot, useCan, usePolicies, Validation Runner, VMP, ReBAC (CCR-GUARD-039) |
> |                  | 3.0 (2026-02-20): Added flattenPermissions(), evaluateAsync(), Per-Pass Attribute Cache, Library Inspector Bridge to existing sections; added Clock Drift, Hash Chain, Scope to Audit Trail section; added gxp Mode to Regulatory & Validation; new React Integration section (createGuardHooks(), SubjectProvider, Can, Cannot, useCan, usePolicy, usePolicies, usePoliciesDeferred); new Testing Infrastructure section (SubjectFixture, PolicyFixture, BDD Matchers) per CCR-GUARD-035 |
> |                  | 2.0 (2026-02-20): Added PermissionRegistry, SubjectProviderPort, AccessDeniedError, Labeled Policy, policyHash, FieldMaskContextPort, AuditTrailPort, RBAC, ABAC, PolicyBundle, PolicySyncPort, EvaluationCachePort; fixed duplicate Audit Trail section heading; added Distributed & Ecosystem section (CCR-GUARD-031) |
> |                  | 1.1 (2026-02-20): Refactored from single table to ## Term sections to enable deep-linking from invariants and behavior specs (CCR-GUARD-025) |
> |                  | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

---

## Core Authorization Concepts

## Permission

A branded token representing authorization for a specific resource:action pair (e.g., `user:delete`). Permissions use structural typing so that two independently created `Permission<'user', 'read'>` tokens are type-compatible. See [behaviors/01-permission-types.md](behaviors/01-permission-types.md) and [INV-GD-002](invariants.md#inv-gd-002).

## Role

A branded token representing a named collection of permissions with optional inheritance from other roles. Role hierarchies form a directed acyclic graph (DAG); `flattenPermissions` walks the DAG to collect all transitively granted permissions. See [behaviors/02-role-types.md](behaviors/02-role-types.md) and [INV-GD-003](invariants.md#inv-gd-003).

## PermissionRegistry

A compile-time registry mapping permission token types to their metadata (name, resource, action, description). Enables exhaustiveness checking at the type level, deduplication detection (two permissions with identical `resource:action` are flagged), and tooling autocomplete in the VS Code extension and CLI. Created by `createPermissionRegistry()`. Included in `PolicyBundle` for distributed evaluation so that receiving nodes can validate permission references. See [behaviors/01-permission-types.md](behaviors/01-permission-types.md) and [INV-GD-005](invariants.md#inv-gd-005).

## Resource

Type alias for `Readonly<Record<string, unknown>>`. An arbitrary key-value bag describing the resource being accessed, used by the matcher DSL in attribute-based policies. Passed to the policy evaluator alongside the subject to enable fine-grained attribute comparisons. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md) for `hasResourceAttribute` usage context and [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md) for how the resource parameter flows through `evaluate()`.

## Policy

A discriminated union data structure expressing an authorization rule. One of: `hasPermission`, `hasRole`, `hasAttribute`, `hasResourceAttribute`, `hasSignature`, `hasRelationship`, `allOf`, `anyOf`, `not`, `labeled`. All policy objects are frozen at creation time. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md) and [INV-GD-004](invariants.md#inv-gd-004).

## Decision

The result of evaluating a policy against a subject: `{ kind: "allow" | "deny", reason, policy, trace, evaluationId, evaluatedAt, subjectId }`. The `evaluationId` (UUID v4) uniquely identifies each evaluation for audit correlation. The `evaluatedAt` field records the ISO 8601 timestamp of the evaluation. See [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md).

## Subject

The entity being authorized (the "who"). Carries `id`, `roles`, `permissions`, `attributes`, `authenticationMethod`, and `authenticatedAt`. Provided to the policy evaluator via the `SubjectProviderPort`. See [behaviors/05-subject.md](behaviors/05-subject.md) and [INV-GD-007](invariants.md#inv-gd-007).

## SubjectProviderPort

An inbound DI port that supplies the current `Subject` to policy evaluation. Implemented by consumers (e.g., per-request scope middleware that extracts the authenticated user from the request context) and consumed internally by the guard system. The `guard()` wrapper automatically adds `SubjectProviderPort` to the adapter's `requires` tuple at the type level, ensuring the subject is resolved before the protected factory runs. See [behaviors/05-subject.md](behaviors/05-subject.md) and [INV-GD-007](invariants.md#inv-gd-007).

## Guard

A wrapper around an adapter that enforces a policy before the adapter's factory runs. Created by the `guard()` higher-order function. The wrapped adapter's `requires` tuple is extended at compile time to include the `SubjectProviderPort`. See [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md) and [INV-GD-009](invariants.md#inv-gd-009).

## AccessDeniedError

The error thrown by a guard-wrapped adapter when the policy evaluator returns a `Deny` decision. Carries `evaluationId`, `portName`, `policy`, and `decision` fields for debugging and audit correlation. Framework adapters translate `AccessDeniedError` to appropriate protocol responses: HTTP 403, `TRPCError(FORBIDDEN)`, `GraphQLError(FORBIDDEN)`, or `ForbiddenException`. See [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md).

## PolicyEvaluationError

An error returned by `evaluate()` or `evaluateAsync()` when the evaluation cannot complete due to a structural problem with the policy or subject data — for example, an incompatible matcher operand type or a missing required attribute. Distinct from a `deny` decision: a `deny` is a successful evaluation with a negative outcome; a `PolicyEvaluationError` indicates the evaluation itself failed. See [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md) and [FM-27](risk-assessment.md).

## flattenPermissions()

A function that recursively walks a role's inheritance DAG, transitively collecting all directly and transitively granted permissions into a deduplicated flat set. Called once during guard initialization — not per evaluation — to pre-compute each role's effective permission set. This pre-computation strategy is the source of [INV-GD-011](invariants.md#inv-gd-011). See [Role](#role) and [behaviors/02-role-types.md](behaviors/02-role-types.md).

---

## Evaluation

## Policy Engine

The stateless evaluation engine that recursively evaluates policies against a subject and resource context. Implements `evaluate(policy, subject, resource?)` and `evaluateBatch(policies, subject, resource?)`. Short-circuits `anyOf` on first allow and `allOf` on first deny. See [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md).

## Evaluation Trace

A tree of trace nodes recording which policies were evaluated and their individual decisions. Each node carries `policyHash`, `kind`, `decision`, and optional `children`. Embedded in the `Decision` result under the `trace` field. See [ADR-GD-007](decisions/007-evaluate-returns-result.md).

## Trace Digest

A compact string summarizing the evaluation trace tree for audit review without the full nested structure. Produced by `digestTrace(trace)`. Used in audit entries when the full trace is too verbose for storage. See [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md) and [behaviors/08-serialization.md](behaviors/08-serialization.md).

## policyHash

A SHA-256 content hash of a policy tree, produced by `hashPolicy(policy): string`. Enables change detection (detecting when a policy has been modified between evaluations) and deduplication across distributed nodes. Included as `contentHash` in `PolicyBundle` and embedded in `EvaluationTrace` nodes. `hashPolicy` is deterministic: structurally identical policies always produce the same hash regardless of object identity. See [behaviors/08-serialization.md](behaviors/08-serialization.md) and [ADR-GD-018](decisions/018-optional-integrity-hashing.md).

## Matcher DSL

The set of attribute comparison operators used in `hasAttribute` and `hasResourceAttribute` policies: `eq`, `neq`, `in`, `notIn`, `exists`, `notExists`, `gt`, `gte`, `lt`, `lte`. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md).

## FieldStrategy

Enum controlling how `visibleFields` are merged across child policies in composite combinators: `"intersection"` (default for `allOf`), `"union"`, `"first"` (default for `anyOf`). Allows fine-grained control over which fields a subject can see on an allowed resource. See [ADR-GD-050](decisions/050-field-strategy-per-combinator.md).

## Field Mask

A set of field names that a subject is authorized to see on a resource. Produced by `visibleFields` on `Allow` decisions. Propagated via `FieldMaskContextPort`. `undefined` means all fields are visible (no restriction). An empty set means no fields are visible. See [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md) for propagation semantics and [FieldStrategy](#fieldstrategy) for merge rules across composite policies.

## Labeled Policy

A `labeled` policy wraps any other policy with a human-readable `name` string. The label is embedded in the evaluation trace at that node, enabling trace viewers, DevTools, and logs to display meaningful names instead of anonymous structural nodes. Labels do not affect evaluation semantics — removing a `labeled` wrapper from around a policy produces identical `Allow`/`Deny` decisions. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md).

## evaluateAsync()

The async variant of `evaluate()` that supports on-demand attribute resolution via `AttributeResolver`. Called when a policy includes `hasAttribute` or `hasResourceAttribute` conditions whose values may not be pre-loaded in the subject's attribute map. Maintains a [Per-Pass Attribute Cache](#per-pass-attribute-cache) to avoid duplicate resolver calls within a single evaluation pass. Returns a `Promise<Decision>`. See [AttributeResolver](#attributeresolver), [INV-GD-025](invariants.md#inv-gd-025), and [INV-GD-026](invariants.md#inv-gd-026).

## Per-Pass Attribute Cache

A short-lived cache scoped to a single `evaluateAsync()` call that memoizes resolved attribute values, preventing duplicate calls to `AttributeResolver` for the same attribute key during one evaluation pass. The cache is discarded after the call completes and is never reused across evaluation passes. Ensures deterministic resolver call counts in composite policies. See [INV-GD-026](invariants.md#inv-gd-026) and [evaluateAsync()](#evaluateasync).

---

## Infrastructure Ports

## GuardEvent

A discriminated union type (`GuardAllowEvent | GuardDenyEvent | GuardErrorEvent`) emitted through `GuardEventSinkPort`. Each event carries structured fields (`evaluationId`, `portName`, `subjectId`, `timestamp`) for operational monitoring and SIEM integration. See [behaviors/09-cross-library.md](behaviors/09-cross-library.md) §37.

## GuardEventSinkPort

Optional outbound port for guard event emission. Consuming libraries (e.g., `@hex-di/logger`, SIEM systems) provide adapters. When no adapter is registered, zero overhead — the guard checks for port presence before emitting. See [behaviors/09-cross-library.md](behaviors/09-cross-library.md) §37.

## GuardSpanHandle

Handle returned by `GuardSpanSink.startSpan()` for controlling span lifecycle. Provides `end()`, `setError(message)`, and `setAttribute(key, value)` methods. Consuming libraries (e.g., `@hex-di/tracing`) translate these into OTel-compatible span operations. See [behaviors/09-cross-library.md](behaviors/09-cross-library.md) §38.

## GuardSpanSinkPort

Optional outbound port for guard span emission. Consuming libraries (e.g., `@hex-di/tracing`) provide adapters that translate guard spans into OTel-compatible spans. When no adapter is registered, zero overhead. See [behaviors/09-cross-library.md](behaviors/09-cross-library.md) §38.

## Port Gate Hook

A resolution hook that intercepts port resolution to evaluate guard policies before the adapter factory executes. Created by `createPortGateHook()`. Supports both coarse-grained (single policy for all ports) and fine-grained (per-port policy map) enforcement. See [behaviors/07-port-gate-hook.md](behaviors/07-port-gate-hook.md).

## AttributeResolver

Service interface for on-demand attribute resolution in async evaluation paths. Fetches attribute values from external sources when they are missing from the subject's pre-populated attributes. Consumed by the async evaluator path in `evaluateAsync()`. See [behaviors/05-subject.md](behaviors/05-subject.md) for port definition and [evaluateAsync()](#evaluateasync) for call semantics.

## RelationshipResolver

Service interface for checking relationships between subjects and resources. Supports both sync (`check()`) and async (`checkAsync()`) methods. Implementations may be backed by in-memory stores, graph databases, or dedicated ReBAC services. Used by the `hasRelationship` policy kind. See [behaviors/05-subject.md](behaviors/05-subject.md) for port definition and [behaviors/03-policy-types.md](behaviors/03-policy-types.md) for `hasRelationship` semantics.

## FieldMaskContextPort

An optional outbound DI port for propagating field masks through the call stack. When an `Allow` decision carries a non-empty `visibleFields` set, the guard system writes the mask to `FieldMaskContextPort`. Downstream adapters read the mask to filter which resource fields are returned to the caller. When no adapter is registered, zero overhead. See [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md) and [Field Mask](#field-mask).

## Library Inspector Bridge

An adapter implementing `LibraryInspectorBridgePort` that exposes guard runtime diagnostics — active policies, recent evaluation history, and audit trail health — to the `@hex-di/devtools` inspection system and optional MCP/A2A diagnostic endpoints. Enables real-time policy debugging without exposing sensitive subject data. When no bridge adapter is registered, zero overhead is incurred. See §48a–48e and [behaviors/11-inspection.md](behaviors/11-inspection.md).

---

## React Integration

## createGuardHooks()

Factory function that produces the complete set of React integration members for a guard-enabled DI graph. Returns 11 members: `{ SubjectProvider, Can, Cannot, useCan, usePolicy, usePolicies, usePoliciesDeferred, useSubject, useGuardPortGate, useGuardError, usePermissions }`. Wires the guard library's ports and adapters to React context without leaking DI concerns into component code. See §14–16 and [behaviors/10-react-integration.md](behaviors/10-react-integration.md).

## SubjectProvider

React context provider component that makes the current `Subject` available to all descendant components via the injected `SubjectProviderPort`. Must wrap the component subtree that contains `Can`, `Cannot`, or any guard hook calls. Distinct from `SubjectProviderPort` — this is the React component; the port is the DI interface. See [SubjectProviderPort](#subjectproviderport) and §14.

## Can

React component that renders its `children` only when the provided `policy` evaluates to `Allow` for the current subject. Accepts optional `resource` and `fallback` props. Intended for presentation-layer UI gating; not a security boundary. See [behaviors/10-react-integration.md](behaviors/10-react-integration.md) §39.

## Cannot

React component that renders its `children` only when the provided `policy` evaluates to `Deny` for the current subject. The inverse of `Can`. Used to render alternative content (e.g., upgrade prompts, disabled states) when access is denied. See [behaviors/10-react-integration.md](behaviors/10-react-integration.md) §39.

## useCan

React hook that evaluates a policy against the current subject and returns a `boolean` (`true` if the decision is `Allow`). Suitable for conditional rendering and disabling interactive controls. See [behaviors/10-react-integration.md](behaviors/10-react-integration.md) §40.

## usePolicy

React hook that returns the full `Decision` object — including evaluation trace, `evaluationId`, and `evaluatedAt` — for a policy evaluated against the current subject. Use `useCan` when only the boolean result is needed; use `usePolicy` when the trace is needed for display or debugging. See §15 and [Decision](#decision).

## usePolicies

React hook that evaluates an array of policies against the current subject in a single call and returns a corresponding array of `Decision` results. Useful when multiple guards must be computed in one render cycle. See [behaviors/10-react-integration.md](behaviors/10-react-integration.md) §73.

## usePoliciesDeferred

Async variant of `usePolicies` that uses `evaluateAsync()` for policies requiring external attribute resolution. Returns a deferred result backed by a promise. See §15 and [evaluateAsync()](#evaluateasync).

---

## Audit Trail & GxP Data Integrity

## AuditTrailPort

An outbound DI port that records guard evaluations to an audit trail. Implementations include in-memory (`createMemoryAuditTrail`), WAL-backed GxP (`createWalAuditTrail`), Postgres, and SQLite adapters. All implementations MUST pass `createAuditTrailConformanceSuite()` (17 standardized test cases). GxP adapters MUST additionally satisfy the behavioral contract in [compliance/gxp.md](compliance/gxp.md) §61. See [INV-GD-013](invariants.md#inv-gd-013), [INV-GD-014](invariants.md#inv-gd-014), and [ADR-GD-036](decisions/036-audit-trail-conformance-suite.md).

## Audit Trail

A structured, append-only record of every guard evaluation. Implemented via `AuditTrailPort`. GxP-compliant adapters must satisfy the behavioral contract in [compliance/gxp.md](compliance/gxp.md) §61. See [INV-GD-013](invariants.md#inv-gd-013) and [INV-GD-014](invariants.md#inv-gd-014).

## AuditEntry

The record type produced by every guard evaluation. Contains: `evaluationId` (UUID v4), `subjectId`, `authenticationMethod`, `decision` (`"allow"` | `"deny"`), `reason`, `policy`, `trace`, `timestamp` (ISO 8601 UTC), `durationMs`, `scope`, and optional `integrityHash`, `previousHash`, `sequenceNumber`, and `signature` fields. Every call to `evaluate()` produces exactly one `AuditEntry`. See [GxPAuditEntry](#gxpauditentry) for the strict subtype used in regulated environments, [INV-GD-013](invariants.md#inv-gd-013), and [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md).

## GxPAuditEntry

Strict subtype of `AuditEntry` where `integrityHash`, `previousHash`, and `signature` are required (non-optional). Used by GxP-regulated audit trail adapters for compile-time guarantees that hash chain and signature fields are always populated. See [ADR-GD-026](decisions/026-gxp-audit-entry-subtype.md).

## Sequence Number

A monotonically increasing integer assigned per scope to each audit entry before hash computation. Enables O(1) gap detection and ensures deterministic ordering of concurrent writes within a scope. See [ADR-GD-030](decisions/030-per-scope-chains-sequence-numbers.md) and [compliance/gxp.md](compliance/gxp.md) §61.4a.

## Hash Chain

A cryptographic linked list of audit entries where each entry's `integrityHash` is computed over its content plus the `previousHash` of the preceding entry. Enables tamper detection: any modification to a historical entry invalidates all subsequent hash links. Chains are partitioned per [Scope](#scope) and verified via `verifyChainIntegrity()`. Required when `gxp: true`. See [INV-GD-017](invariants.md#inv-gd-017), [GxPAuditEntry](#gxpauditentry), and [compliance/gxp.md](compliance/gxp.md) §61.

## Scope

The authorization scope that partitions an audit trail hash chain and per-scope sequence counter. Each scope maintains its own [Sequence Number](#sequence-number) and [Hash Chain](#hash-chain), isolating concurrent access patterns (e.g., one scope per HTTP request, workflow instance, or user session). The maximum scope lifetime is configurable via `maxScopeLifetimeMs`. Scope boundaries are enforced by the WAL store. See [INV-GD-018](invariants.md#inv-gd-018) and [compliance/gxp.md](compliance/gxp.md) §61.

## WAL (Write-Ahead Log)

A durable intent log written before an operation to ensure recoverability after crashes. In guard, the WAL records evaluation intent before `evaluate()` runs. Managed via the `WalStore` interface. Mandatory when `gxp: true` via `createWalAuditTrail()`. See [INV-GD-016](invariants.md#inv-gd-016).

## Durability Tier

Classification of an `AuditTrail.record()` adapter's persistence guarantee: `"Durable Ok"` (synchronous commit, survives crash) or `"Buffered Ok"` (accepted into buffer, requires WAL for crash recovery when `gxp: true`). Each adapter MUST document its tier. See [ADR-GD-035](decisions/035-record-durability-tiers.md) and [compliance/gxp.md](compliance/gxp.md) §61.3a.

## Export Manifest

A metadata block included with audit trail exports containing: total entry count, first/last integrity hashes, scope IDs, SHA-256 checksum of the export file, and export timestamp. Recipients verify the manifest before using the export as compliance evidence. See [compliance/gxp.md](compliance/gxp.md) §64.

## Conformance Suite

A reusable parameterized test harness (`createAuditTrailConformanceSuite`) that validates any `AuditTrailPort` adapter against the GxP behavioral invariants (append-only, atomic writes, completeness, hash chain integrity, no silent defaults, concurrency, field limits, durability, boundary-exact values, Unicode integrity) via 17 standardized test cases. See [ADR-GD-036](decisions/036-audit-trail-conformance-suite.md) and [behaviors/12-testing.md](behaviors/12-testing.md).

## Health Check

A runtime canary function (`createGuardHealthCheck`) that evaluates a known policy, writes a canary audit entry, and verifies recent hash chain integrity. Used for scheduled (e.g., daily) monitoring to detect silent pipeline degradation. See [ADR-GD-037](decisions/037-guard-health-check.md) and [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md).

## ClockSource

An interface providing `now(): string` that returns an ISO 8601 UTC timestamp. Injected into the guard adapter as a DI port so that audit entry timestamps are deterministic in tests and auditable in production. GxP deployments MUST use an NTP-synchronized `ClockSource` implementation; clock drift exceeding 1 second must trigger a health check failure. See [Dual-Timing Strategy](#dual-timing-strategy), [Clock Drift](#clock-drift), and [compliance/gxp.md](compliance/gxp.md) §62.

## Dual-Timing Strategy

The guard system's use of two distinct clocks: `ClockSource.now()` (absolute, NTP-synchronized, for audit timestamps) and `performance.now()` (relative, monotonic, for `durationMs`). Using the wrong clock for either purpose is a GxP data integrity violation. See [compliance/gxp.md](compliance/gxp.md) §62.

## Clock Drift

The divergence between a node's local system clock and the authoritative NTP time source. In GxP environments, clock drift must be monitored and bounded: `createGuardHealthCheck` includes a drift verification step, and `ClockSource` adapters must be NTP-synchronized. Excessive drift causes audit timestamp inaccuracies, violating the ALCOA+ Contemporaneous principle. See [Dual-Timing Strategy](#dual-timing-strategy), [Health Check](#health-check), and [compliance/gxp.md](compliance/gxp.md) §62.

---

## Electronic Signatures

## Electronic Signature

A cryptographic signature bound to an audit entry, capturing who signed, when, the meaning, and the algorithm used. Defined by the `ElectronicSignature` type. Required for 21 CFR Part 11 compliance where records require human attestation. See [compliance/gxp.md](compliance/gxp.md) §65.

## Re-authentication

The process of verifying a signer's identity immediately before signature capture. Uses two-component identification: `signerId` (identification) + `credential` (verification). Required by 21 CFR Part 11 §11.100. See [compliance/gxp.md](compliance/gxp.md) §65b.

## ReauthenticationToken

A time-bounded proof of identity issued after a successful credential verification, required before `capture()` accepts an electronic signature. Contains `signerId`, `credentialType`, `issuedAt`, and `expiresAt`. The `capture()` function rejects tokens where `expiresAt` has passed. The maximum lifetime is configurable via `maxReauthTokenLifetimeMs`; GxP deployments SHOULD enforce a 5-minute maximum per [ADR-GD-039](decisions/039-max-reauth-token-lifetime.md). See [Re-authentication](#re-authentication) and [compliance/gxp.md](compliance/gxp.md) §65b.

## Signature Meaning

A string describing the intent of a signature (e.g., `"authored"`, `"reviewed"`, `"approved"`). Standard meanings are defined in `SignatureMeanings` constants. Used by `hasSignature` policies to require specific signature types. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md).

## SignatureService

The service interface for electronic signature operations: `capture()`, `validate()`, `reauthenticate()`. Consumer adapters implement the actual cryptography. See [INV-GD-020](invariants.md#inv-gd-020).

## Counter-Signing

GxP pattern where multiple signers independently attest to a record (e.g., author + witness). Expressed via `allOf` with multiple `hasSignature` policies using distinct `signerRole` values. Each signer re-authenticates independently. See [compliance/gxp.md](compliance/gxp.md) §65d.

## Non-Repudiation

The assurance that the signer of a record cannot deny having signed it. Achieved through asymmetric cryptographic algorithms (RSA, ECDSA) where only the signer holds the private key. Symmetric algorithms (HMAC) do NOT provide non-repudiation because both signer and verifier share the same key. Required for GxP compliance evidence. See [ADR-GD-038](decisions/038-asymmetric-algorithms-gxp.md) and [compliance/gxp.md](compliance/gxp.md) §65c.

## Account Lockout

A security control that disables a signer's ability to re-authenticate after a configurable number of consecutive failed attempts. Prevents brute-force attacks on signer credentials. REQUIRED for `SignatureService.reauthenticate()` implementations per 21 CFR Part 11 §11.300(d). See [compliance/gxp.md](compliance/gxp.md) §65b.

---

## Regulatory & Validation

## GxP

Good Practice regulations: FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5. Guard's compliance guide is in [compliance/gxp.md](compliance/gxp.md).

## ALCOA+

Data integrity framework: **A**ttributable, **L**egible, **C**ontemporaneous, **O**riginal, **A**ccurate + **C**omplete, **C**onsistent, **E**nduring, **A**vailable. See [compliance/gxp.md](compliance/gxp.md) §60 for guard's per-feature mapping.

## FMEA

Failure Mode and Effects Analysis. A systematic risk assessment technique that identifies potential failure modes, their causes, effects, and mitigations. In guard, scored using Severity, Occurrence, and Detectability (each on a 1–10 scale, max RPN = 1000) to produce a Risk Priority Number. See [risk-assessment.md](risk-assessment.md).

## RPN (Risk Priority Number)

Numerical risk score calculated as `Severity × Occurrence × Detectability` (each 1–10, max 1000). Thresholds: 1–60 Acceptable, 61–99 Conditionally acceptable (requires documented QA Reviewer acceptance), 100+ Unacceptable (mandatory corrective action). Used in FMEA to prioritize mitigations. See [risk-assessment.md](risk-assessment.md).

## Closed System

An environment in which system access is controlled by persons who are responsible for the content of electronic records. Per 21 CFR Part 11 §11.3(b)(4). In closed systems, a SHA-256 checksum alone is sufficient for audit trail export integrity verification. See [compliance/gxp.md](compliance/gxp.md) §36.

## Open System

An environment in which system access is NOT controlled by persons responsible for the content of electronic records. Per 21 CFR Part 11 §11.3(b)(9). Open systems require additional controls including digital signatures on audit trail export manifests and encrypted transport. See [compliance/gxp.md](compliance/gxp.md) §63.

## IQ (Installation Qualification)

Documented verification that the system is installed correctly per its specification. Checks package version, dependencies, compiler, and lint compliance. See [compliance/gxp.md](compliance/gxp.md) §67a and [process/test-strategy.md](process/test-strategy.md).

## OQ (Operational Qualification)

Documented verification that the system operates correctly within its specified operating ranges. Exercises the full test suite and mutation testing. See [compliance/gxp.md](compliance/gxp.md) §67b and [process/test-strategy.md](process/test-strategy.md).

## PQ (Performance Qualification)

Documented verification that the system meets performance requirements under production-representative conditions. Measures latency, throughput, and memory stability. See [compliance/gxp.md](compliance/gxp.md) §67c and [process/test-strategy.md](process/test-strategy.md).

## GxP Readiness

A pre-deployment diagnostic (`checkGxPReadiness`) that inspects a guard graph configuration for 15 GxP prerequisites (gxp flag, non-Noop audit trail, failOnAuditError, WalStore, policies, SignatureService, ClockSource, asymmetric algorithm check, clock drift monitoring, maxScopeLifetimeMs verification, port gate hook detection, etc.). Returns a structured report with pass/warn/fail items. See [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md).

## gxp Mode

The `gxp: true` configuration flag that activates the full GxP compliance profile for a guard adapter: (1) audit trail adapter must be non-Noop, (2) `failOnAuditError` is enforced, (3) WAL pre-write is required, (4) electronic signature operations are available, (5) `EvaluationCachePort` is rejected at compile time (violates ALCOA+ Contemporaneous), (6) `ClockSource` must be NTP-synchronized, and (7) `checkGxPReadiness` verifies 15 prerequisites before deployment. See [INV-GD-021](invariants.md#inv-gd-021), [GxP Readiness](#gxp-readiness), [EvaluationCachePort](#evaluationcacheport), and [compliance/gxp.md](compliance/gxp.md).

## Traceability Matrix

A document mapping regulatory requirements to spec sections, test cases, and verification evidence. Provides end-to-end traceability from regulation to implementation. The guard RTM is maintained in [traceability.md](traceability.md). See [compliance/gxp.md](compliance/gxp.md) §69.

## Validation Runner

A programmatic utility that executes IQ, OQ, or PQ checks and produces structured qualification reports. Shipped in `@hex-di/guard-validation`. `runIQ()` checks installation, `runOQ()` runs the test suite, `generateTraceabilityMatrix()` produces the regulatory mapping. See [overview.md](overview.md) for the `@hex-di/guard-validation` API surface and [process/test-strategy.md](process/test-strategy.md) for qualification protocol references.

## VMP (Validation Master Plan)

An organizational document defining the validation strategy, scope, responsibilities, and schedule for all computerized systems. The guard Validation Plan is the system-specific instance within the VMP framework. See [17-gxp-compliance/09-validation-plan.md](17-gxp-compliance/09-validation-plan.md) §67 and [compliance/gxp.md](compliance/gxp.md) §67.

## UAT (User Acceptance Testing)

Testing conducted by the end-user organization to verify that the deployed system meets their specific operational requirements. For guard, UAT validates the guard configuration against the site's access control requirements using representative subject scenarios. UAT is a consumer responsibility, separate from the library-level OQ testing. See [compliance/gxp.md](compliance/gxp.md) §67 and EU GMP Annex 11 §4.4.

## Data Redundancy

A storage architecture property where data is maintained on multiple physical storage devices simultaneously (e.g., RAID, database replication, cloud multi-AZ deployment). Required for the primary audit trail backing store in GxP environments to survive a single physical storage failure without data loss. See [ADR-GD-042](decisions/042-audit-trail-storage-redundancy.md) and [compliance/gxp.md](compliance/gxp.md) §63.

---

## Access Control Models

## RBAC

Role-Based Access Control. An authorization model where access decisions are based on roles assigned to the subject. Supported via `hasRole` policies and the `Role` token system with DAG inheritance. The primary model for most applications. Roles may inherit permissions from parent roles, enabling hierarchical permission structures. See [behaviors/02-role-types.md](behaviors/02-role-types.md).

## ABAC

Attribute-Based Access Control. An authorization model where access decisions depend on attributes of the subject or resource. Supported via `hasAttribute` and `hasResourceAttribute` policies using the matcher DSL (`eq`, `neq`, `in`, `notIn`, `exists`, `notExists`, `gt`, `gte`, `lt`, `lte`). Enables fine-grained, context-sensitive authorization rules beyond what roles alone can express. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md).

## ReBAC

Relationship-Based Access Control. An authorization model where access decisions depend on relationships between subjects and resources (e.g., `"owner"`, `"viewer"`, `"member"`). Supported via the `hasRelationship` policy kind and `RelationshipResolver` port. See [behaviors/03-policy-types.md](behaviors/03-policy-types.md) for `hasRelationship` semantics and [behaviors/05-subject.md](behaviors/05-subject.md) for the `RelationshipResolver` port definition.

---

## Testing Infrastructure

## SubjectFixture

A test helper that creates pre-configured `Subject` objects for use in unit and integration tests. Provides factory methods for common subject patterns (admin, read-only, unauthenticated, etc.) and a fluent builder for custom attribute and role combinations. Shipped in `@hex-di/guard-testing`. See [behaviors/12-testing.md](behaviors/12-testing.md).

## PolicyFixture

A test helper that provides pre-built policy trees for common authorization scenarios, reducing test boilerplate. Includes fixtures for RBAC, ABAC, ReBAC, composite, GxP, and field-level security patterns. Shipped in `@hex-di/guard-testing`. See [behaviors/12-testing.md](behaviors/12-testing.md).

## BDD Matchers

Custom Vitest/Jest assertion matchers for guard evaluation results: `toAllow()`, `toDeny()`, `toHaveTrace()`, `toHavePermission()`, and others. Enable behavior-driven test assertions that read as readable specifications. Shipped in `@hex-di/guard-testing`. See [behaviors/12-testing.md](behaviors/12-testing.md) and [Conformance Suite](#conformance-suite).

---

## Distributed & Ecosystem

## PolicyBundle

A versioned, signed artifact containing a policy tree, permission registry, and role definitions, ready for distribution across nodes. Carries `contentHash`, `permissionRegistry`, role definitions, and the policy tree. Bundles are signed for authenticity verification at receiving nodes. Used by the `PolicySyncPort` for distributed policy propagation and by `guard-wasm` for edge compilation. See [roadmap.md](roadmap.md) §74.

## PolicySyncPort

An outbound DI port for publishing and subscribing to `PolicyBundle` artifacts across distributed nodes. Enables eventual-consistency policy synchronization. Official adapters: Redis Pub/Sub and NATS. See [roadmap.md](roadmap.md) §74.

## EvaluationCachePort

An outbound DI port for caching authorization decisions keyed by `policyHash + subjectId + resourceHash`. Improves throughput for hot evaluation paths by returning cached `Decision` objects. **Incompatible with `gxp: true`** at compile time — the TypeScript compiler rejects configurations that combine `gxpMode: true` with `EvaluationCachePort`, because caching violates the ALCOA+ Contemporaneous principle. Official adapters: Redis cache and in-process LRU cache. See [roadmap.md](roadmap.md) §74 and [INV-GD-026](invariants.md#inv-gd-026).

---

_Previous: [Appendix B: Competitive Comparison](./comparisons/competitors.md) | Next: [Appendix D: Type Relationship Diagram](./appendices/type-relationship-diagram.md)_
