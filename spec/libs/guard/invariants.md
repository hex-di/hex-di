# Invariants

> **Document Control**
>
> | Property         | Value                                                                                         |
> |------------------|-----------------------------------------------------------------------------------------------|
> | Document ID      | GUARD-INV                                                                                     |
> | Revision         | 5.0                                                                                           |
> | Effective Date   | 2026-02-20                                                                                    |
> | Status           | Effective                                                                                     |
> | Author           | HexDI Engineering                                                                             |
> | Reviewer         | GxP Compliance Review                                                                         |
> | Approved By      | Technical Lead, Quality Assurance Manager                                                     |
> | Classification   | GxP Functional Specification — Invariants                                                     |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)                                                       |
> | Change History   | 5.0 (2026-02-20): Added missing FM-N references to INV-GD-001, -002, -023, -024, -030, -031, -032 per CCR-GUARD-034 |
> |                  | 4.0 (2026-02-20): Corrected 3 incorrect FM-N references (INV-GD-001 FM-11→none, INV-GD-026 FM-01→FM-28, INV-GD-033 FM-08→FM-25); added missing FM-N references to 16 invariants per CCR-GUARD-030 |
> |                  | 3.0 (2026-02-19): Added canonical Source, Implication, and Related fields to all 37 invariants (CCR-GUARD-021) |
> |                  | 2.0 (2026-02-17): Added INV-GD-013 through INV-GD-037 covering error handling, electronic signatures, scope lifetime, ReBAC, async evaluation, field-level access, evaluation completeness, GxP subject validation, configuration validation, and async adapter lifetime (CCR-GUARD-018) |
> |                  | 1.0 (2026-02-17): Initial extraction from behavior specs (CCR-GUARD-018) |

## Runtime Guarantees

The following invariants MUST hold at all times in a correctly-configured guard system. Violation of any invariant is a bug in the implementation.

### INV-GD-001: Policy Immutability

All policy objects are frozen via `Object.freeze()` at construction time. No policy property can be mutated after creation.

**Source**: `src/policy/combinators.ts` — every combinator (`hasPermission`, `hasRole`, `allOf`, `anyOf`, `not`, `withLabel`, etc.) calls `Object.freeze()` on the returned policy node before returning it.

**Implication**: Consumers can safely share policy objects across scopes and requests without defensive copying. A policy value held in a `const` is guaranteed to be identical at all future reads; no third party can alter it between construction and evaluation.

**Related**: [BEH-GD-009](behaviors/03-policy-types.md), [ADR-GD-013](decisions/013-frozen-policy-objects.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-002: Permission Brand Integrity

Permission tokens are branded nominal types. A `Permission<R, A>` cannot be confused with a plain string or a differently-typed permission at compile time. Runtime brand checks via `Symbol.for()`.

**Source**: `src/tokens/permission.ts` — `PERMISSION_BRAND = Symbol.for("@hex-di/guard/permission")` is stamped on every token returned by `createPermission()`; `isPermission()` checks for the symbol at runtime.

**Implication**: Consumer code that accepts `Permission<"user","read">` cannot accidentally receive a plain string or a `Permission<"user","write">`. Typos in resource or action names are caught at compile time; the brand check provides a runtime guard against values from untyped boundaries.

**Related**: [BEH-GD-001](behaviors/01-permission-types.md), [BEH-GD-002](behaviors/01-permission-types.md), [ADR-GD-001](decisions/001-branded-permission-tokens.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-003: Role DAG Acyclicity

Role inheritance forms a directed acyclic graph. `flattenPermissions()` detects cycles at runtime and returns `Err<CircularRoleInheritanceError>`.

**Source**: `src/utils/flatten.ts` — DAG traversal uses a `visited: Set<string>` to track role names already on the current path; when a role name is encountered a second time the function returns `Err(new CircularRoleInheritanceError(roleName, cyclePath))` without further recursion.

**Implication**: Consumers can call `flattenPermissions()` on any `Role` and trust that it terminates. A `CircularRoleInheritanceError` (ACL002) is returned rather than hanging or exhausting the call stack. Role graphs with cycles are rejected at the call site, not silently ignored.

**Related**: [BEH-GD-005](behaviors/02-role-types.md), [BEH-GD-008](behaviors/02-role-types.md), [ADR-GD-002](decisions/002-role-dag-cycle-detection.md).

---

### INV-GD-004: Subject Immutability Within Scope

Once resolved, a subject is immutable for the lifetime of its scope. No mid-request permission changes. Prevents TOCTOU bugs.

**Source**: `src/subject/adapter.ts` — `createSubjectAdapter()` resolves the subject once per DI scope and stores an `Object.freeze()`-d copy; subsequent `getSubject()` calls within the same scope return the identical frozen reference without re-invoking the IdP.

**Implication**: Any code running within a request scope can call `SubjectProviderPort.getSubject()` multiple times and receive the same identity. A mid-request role change in an external IdP cannot affect an in-flight evaluation or produce different decisions for different callers within the same scope.

**Related**: [BEH-GD-020](behaviors/05-subject.md), [BEH-GD-024](behaviors/05-subject.md), [ADR-GD-009](decisions/009-immutable-subject-within-scope.md), FM-08, FM-18 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-005: Deny-Overrides Resolution

If any applicable policy denies, the final decision is Deny. This is the default conflict resolution strategy.

**Source**: `src/evaluator/evaluate.ts` — `evaluate()` short-circuits and returns `Deny` as soon as any child policy produces a deny verdict; the `allOf` branch propagates the first `Deny` without evaluating remaining children.

**Implication**: Consumers writing `allOf([hasPermission(A), hasPermission(B)])` get fail-safe semantics: if either permission is missing the request is denied. There is no way for a later allow to override an earlier deny within the same evaluation pass.

**Related**: [BEH-GD-015](behaviors/04-policy-evaluator.md), [ADR-GD-004](decisions/004-deny-overrides-conflict-resolution.md), FM-01, FM-02 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-006: Audit Trail Completeness

Every `guard()` call produces exactly one audit entry. If `failOnAuditError` is true (default), a failed audit write blocks the guarded operation.

**Source**: `src/guard/guard.ts` — the guard wrapper calls `AuditTrailPort.record()` at step 5 (before allowing or denying at step 6); when `failOnAuditError: true`, a write error propagates as `AuditTrailWriteError` (ACL008) and the guarded operation is not invoked.

**Implication**: Every authorization decision — allow or deny — is recorded. Consumers can reconstruct a complete authorization history from the audit trail without gaps. No decision is taken silently; any audit write failure in GxP mode surfaces immediately rather than being swallowed.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-012](decisions/012-mandatory-audit-trail-port.md), [ADR-GD-027](decisions/027-fail-on-audit-error-default.md), FM-03, FM-15, FM-21, FM-26 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-007: Hash Chain Integrity

When GxP mode is enabled, audit entries form a hash chain covering all required fields. Chain breaks are detectable via integrity verification.

**Source**: `src/ports/audit-trail.ts` — the GxP audit trail implementation computes `SHA-256(canonicalFields || previousHash)` and stores the result in `AuditEntry.integrityHash`; `verifyAuditChain()` re-computes each hash and compares with the stored value, returning `Err` on any mismatch.

**Implication**: Any post-persistence modification of an audit entry (field value change, deletion, reordering) breaks the hash chain and is detected by `verifyAuditChain()`. The chain provides a tamper-evident audit log meeting 21 CFR 11.10(e) record integrity requirements.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-029](decisions/029-hash-chain-all-fields.md), [compliance/gxp.md](compliance/gxp.md), FM-05, FM-14, FM-16, FM-23, FM-32 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-008: Per-Scope Chain Ordering

Each scope maintains its own hash chain with monotonic sequence numbers. Gap detection is O(1).

**Source**: `src/ports/audit-trail.ts` — the audit trail adapter maintains a per-`scopeId` counter; `sequenceNumber` is incremented atomically before each `record()` call; the WAL stores the expected next sequence number so that a gap can be detected in O(1) without scanning the full log.

**Implication**: Concurrent requests in separate scopes cannot interleave their audit chains. A gap in the sequence number for a given scope is immediately detectable without scanning the full log. Per-scope chains also enable efficient parallel audit review by scope.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-030](decisions/030-per-scope-chains-sequence-numbers.md), [compliance/gxp.md](compliance/gxp.md), FM-04, FM-22 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-009: Policy Serialization Round-Trip

`deserializePolicy(serializePolicy(p))` deep-equals `p` for all valid policies. Policies are pure data — no callbacks, no closures.

**Source**: `src/serialization/serialize.ts` and `src/serialization/deserialize.ts` — `serializePolicy` produces a plain JSON-serializable record with `kind` and all required fields; `deserializePolicy` validates the `kind` discriminant and reconstructs the typed union; no methods, prototypes, or closure references are carried through the round-trip.

**Implication**: Policies can be safely stored in a database, sent over the network, or cached in Redis and rehydrated without loss of semantics. Consumers can use policy serialization as a stable interchange format between services or across process restarts.

**Related**: [BEH-GD-032](behaviors/08-serialization.md), [BEH-GD-033](behaviors/08-serialization.md), [ADR-GD-003](decisions/003-policy-discriminated-unions.md), FM-11, FM-33, FM-35 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-010: WAL Enforcement in GxP Mode

When `gxp: true`, a Write-Ahead Log wraps the audit trail adapter. Crash between evaluate() and record() does not lose the audit entry.

**Source**: `src/ports/audit-trail.ts` — `createWalAuditTrail()` wraps any `AuditTrail` adapter; on entry to `record()`, a WAL intent is persisted synchronously using `evaluationId` as the deduplication key; after successful `adapter.record()`, the WAL intent is marked complete; startup recovery replays orphaned intents.

**Implication**: In GxP deployments, no authorization decision is lost due to process crash, OOM kill, or power failure between evaluation and audit persistence. The WAL provides crash-consistent audit trail writes as required by GAMP 5 Category 5 validation.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-032](decisions/032-built-in-wal-gxp-enforcement.md), [compliance/gxp.md](compliance/gxp.md), FM-15, FM-17 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-011: Permission Set Precomputation

When a subject is created, `flattenPermissions()` resolves the full transitive permission set once. All subsequent permission checks are O(1) Set.has() lookups.

**Source**: `src/subject/auth-subject.ts` — `PrecomputedSubject` stores a `permissionSet: ReadonlySet<string>` populated at construction time by running `flattenPermissions()` across all of the subject's roles; `hasPermission(p)` calls `this.permissionSet.has(formatPermission(p))`.

**Implication**: No matter how many roles a user holds or how deep the inheritance graph, each individual `hasPermission` policy evaluation is O(1). High-frequency authorization checks (e.g., per-field or per-row ACL enforcement) do not degrade with role or inheritance complexity.

**Related**: [BEH-GD-020](behaviors/05-subject.md), [BEH-GD-021](behaviors/05-subject.md), [ADR-GD-010](decisions/010-permission-set-precomputation.md).

---

### INV-GD-012: Evaluation Determinism

Given the same policy, subject, and context, `evaluate()` always returns the same decision. No hidden state, no random behavior.

**Source**: `src/evaluator/evaluate.ts` — `evaluate()` is a pure function taking `(policy, subject, context?)` and returning `Decision`; it reads no module-level mutable state, no timestamps, and no random values during evaluation; the result depends only on its arguments.

**Implication**: Consumers can snapshot a `(policy, subject, context)` triple and replay it to reproduce any authorization decision. Tests can assert exact decisions without mocking time or randomness. Evaluation results are safe to cache for the lifetime of the scope.

**Related**: [BEH-GD-015](behaviors/04-policy-evaluator.md), [BEH-GD-016](behaviors/04-policy-evaluator.md), [ADR-GD-004](decisions/004-deny-overrides-conflict-resolution.md), [ADR-GD-007](decisions/007-evaluate-returns-result.md), [ADR-GD-048](decisions/048-async-evaluation-wraps-sync.md), FM-01, FM-02, FM-27, FM-28, FM-36 in [risk-assessment.md](risk-assessment.md).

---

## Error Handling & Access Denial

### INV-GD-013: Guard Throws on Deny

When `guard()` evaluates a policy to `Deny`, it throws `AccessDeniedError` (code ACL001) immediately. Denial is never silent.

**Source**: `src/guard/guard.ts` — after the audit write at step 5, when `decision.kind === "deny"`, the wrapper throws `new AccessDeniedError(decision.reason, "ACL001")`; no return value is produced for denied evaluations.

**Implication**: Callers cannot accidentally ignore a denial by forgetting to check a return value. The only way to handle a denial is to catch `AccessDeniedError`. This makes authorization failures impossible to silently discard through inattention.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-007](decisions/007-evaluate-returns-result.md), [ADR-GD-008](decisions/008-guard-wraps-at-adapter-level.md), [ADR-GD-012](decisions/012-mandatory-audit-trail-port.md), FM-12, FM-20, FM-31, FM-34 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-014: Audit Before Throw

Audit recording (step 5) happens BEFORE the allow/deny action (step 6). Denied attempts are always recorded even if the `AccessDeniedError` is caught.

**Source**: `src/guard/guard.ts` — execution order is fixed: (1) resolve subject, (2) evaluate policy, (3) build audit entry, (4) write WAL intent (GxP only), (5) call `AuditTrailPort.record()`, (6) throw `AccessDeniedError` or invoke the guarded adapter; step 5 precedes step 6 unconditionally.

**Implication**: Attackers who catch and discard `AccessDeniedError` still produce an audit record. Compliance reviewers can detect repeated denial events even when the application does not surface them to end users. Denial patterns are always visible in the audit trail.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-008](decisions/008-guard-wraps-at-adapter-level.md), [ADR-GD-027](decisions/027-fail-on-audit-error-default.md), FM-03, FM-15 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-015: failOnAuditError GxP Enforcement

When `gxp: true`, `failOnAuditError` MUST be true. Setting `failOnAuditError: false` with `gxp: true` produces a compile-time error.

**Source**: `src/guard/guard.ts` — `GuardOptions` uses a conditional type that makes `failOnAuditError: false` incompatible with `gxp: true`; the TypeScript compiler rejects the combination before any runtime code executes.

**Implication**: No GxP-configured guard instance can silently discard audit write failures. The compile-time check eliminates the entire class of misconfiguration where audit errors are swallowed in production GxP environments.

**Related**: [BEH-GD-026](behaviors/06-guard-adapter.md), FM-03, FM-13 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-016: NoopAuditTrail Rejection in GxP

When `gxp: true`, `createGuardGraph()` throws `ConfigurationError` (ACL012) if the AuditTrail adapter is NoopAuditTrail.

**Source**: `src/guard/guard.ts` — `createGuardGraph()` checks `options.gxp && auditTrailAdapter instanceof NoopAuditTrail` at startup and throws `new ConfigurationError("ACL012", "NoopAuditTrail is not permitted in GxP mode")` before any adapter is wired into the container.

**Implication**: A GxP guard graph will never silently discard audit entries because `NoopAuditTrail` was left as a placeholder. Deployment without a real audit trail adapter fails fast at graph construction time, not at the first production request.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), FM-13 in [risk-assessment.md](risk-assessment.md).

---

## Electronic Signatures & Re-authentication

### INV-GD-017: Signature Reauthentication Requirement

In GxP environments, `ElectronicSignature.reauthenticated` MUST be true for all new signatures captured. Proves the signer re-authenticated before signing (21 CFR 11.100).

**Source**: `src/signature/port.ts` — `SignatureService.capture()` validates that `ReauthenticationToken.tokenValue` is present and non-expired before setting `reauthenticated: true` on the returned `ElectronicSignature`; any missing or expired token returns `Err(new SignatureError("ACL020", "Re-authentication required"))`.

**Implication**: Every electronic signature in the audit trail provably originates from a user who re-confirmed their identity immediately before signing. Signatures cannot be captured by replaying a stale session or by an attacker holding an old authentication token.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-024](decisions/024-re-auth-on-signature-service.md), [ADR-GD-038](decisions/038-asymmetric-algorithms-gxp.md), [ADR-GD-040](decisions/040-minimum-cryptographic-key-sizes.md), [ADR-GD-043](decisions/043-hsm-required-gxp-key-storage.md), [compliance/gxp.md](compliance/gxp.md), FM-06, FM-07, FM-29, FM-30 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-018: Signature Replay Prevention

`SignatureService.capture()` implements replay protection: a consumed `ReauthenticationToken.tokenValue` is rejected with `SignatureError`. Tokens are one-time-use and session-bound.

**Source**: `src/signature/port.ts` — the `SignatureService` interface contract requires implementors to track consumed `tokenValue` strings in a session-scoped set; presenting an already-consumed `tokenValue` returns `Err(new SignatureError("ACL021", "Re-authentication token already consumed"))`.

**Implication**: An attacker who intercepts a re-authentication token cannot reuse it to forge additional signatures within the same session. Each distinct signature capture requires a fresh re-authentication challenge-response cycle.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-039](decisions/039-max-reauth-token-lifetime.md), [compliance/gxp.md](compliance/gxp.md), FM-06 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-019: Signature Binding Atomicity

The signature binding payload is a hash/digest of the audit entry (not the full entry), computed deterministically. Signed audit entries cannot be altered post-capture.

**Source**: `src/signature/port.ts` and `src/ports/audit-trail.ts` — `capture()` receives a stable `bindingPayload` string (SHA-256 of canonical audit entry fields, excluding `integrityHash` and `previousHash` per [ADR-GD-047](decisions/047-signature-payload-excludes-previous-hash.md)); the signature is stored alongside the audit entry; `verifySignature()` recomputes the digest and compares.

**Implication**: Any post-capture modification to the audit entry (altering the decision, subject id, timestamp, or any canonical field) invalidates the embedded signature. Tampering is detectable independently of the hash chain, providing two independent integrity mechanisms.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-028](decisions/028-signer-role-from-validated-signature.md), [ADR-GD-047](decisions/047-signature-payload-excludes-previous-hash.md), FM-05, FM-29, FM-30 in [risk-assessment.md](risk-assessment.md).

---

## Scope Lifetime & Session Freshness

### INV-GD-020: Scope Lifetime Enforcement

When `maxScopeLifetimeMs` is configured, the guard checks scope age before every evaluation. Expired scopes produce `ScopeExpiredError` (ACL013). When `gxp: true`, `maxScopeLifetimeMs` is mandatory.

**Source**: `src/guard/guard.ts` — the wrapper reads `scope.createdAt` and compares against `Date.now()` at the start of each evaluation; if `Date.now() - scope.createdAt > maxScopeLifetimeMs`, it throws `new ScopeExpiredError("ACL013")` before policy evaluation begins.

**Implication**: Long-lived scopes (e.g., abandoned server-sent-event connections or leaked DI containers) cannot accumulate authorization decisions indefinitely with a stale subject. GxP deployments enforce a hard upper bound on how long a subject remains authoritative.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-045](decisions/045-max-scope-lifetime-gxp.md), FM-08, FM-19 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-021: Subject Authentication Staleness

In GxP mode, `authenticatedAt` MUST be within a configurable staleness window (default 24h). Subjects with stale timestamps are denied before policy evaluation.

**Source**: `src/guard/guard.ts` — when `gxp: true`, the wrapper checks `Date.now() - subject.authenticatedAt.getTime() > maxSubjectAgeMs` (default 86 400 000 ms); stale subjects produce `Err(new AccessDeniedError("ACL014", "Subject authentication expired"))` before the policy is evaluated.

**Implication**: Users who authenticated many hours ago and have not refreshed their session cannot continue to pass authorization checks in GxP deployments. Authentication freshness is enforced as a mandatory prerequisite to authorization, not an application-layer concern.

**Related**: [BEH-GD-022](behaviors/05-subject.md), [ADR-GD-016](decisions/016-auth-subject-authentication-fields.md), [ADR-GD-045](decisions/045-max-scope-lifetime-gxp.md), FM-08, FM-19 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-022: Anonymous Subject Rejection

When `gxp: true`, subjects with `authenticationMethod` of `'none'` or `'anonymous'` are rejected before policy evaluation begins.

**Source**: `src/guard/guard.ts` — the wrapper inspects `subject.authenticationMethod` before evaluation; the value set `{"none","anonymous"}` triggers immediate `Err(new AccessDeniedError("ACL015", "Anonymous subjects not permitted in GxP mode"))` before any policy is evaluated.

**Implication**: GxP deployments cannot issue authorization decisions for unidentified users. Every audit entry in a GxP context is attributable to a specifically authenticated identity, satisfying ALCOA+ Attributable at the structural level.

**Related**: [BEH-GD-022](behaviors/05-subject.md), [ADR-GD-016](decisions/016-auth-subject-authentication-fields.md), FM-08 in [risk-assessment.md](risk-assessment.md).

---

## Relationship-Based Access Control (ReBAC)

### INV-GD-023: ReBAC Depth Limiting

`RelationshipResolver.check()` and `checkAsync()` respect the `depth` parameter. Traversal never exceeds the specified depth, preventing unexpectedly distant relationship grants.

**Source**: `src/subject/relationship-resolver.ts` — the `RelationshipResolver` interface contract requires implementors to accept `depth: number` and halt traversal at the specified level; the `hasRelationship` combinator passes `policy.depth` directly to the resolver call on each invocation.

**Implication**: A policy granting access based on direct ownership (`depth: 1`) cannot accidentally grant access to indirect owners at depth 3 or beyond. Depth is enforced per-policy-instance, allowing different policies in the same tree to use different traversal depths.

**Related**: [BEH-GD-023](behaviors/05-subject.md), [ADR-GD-054](decisions/054-transitive-depth-per-policy.md), [ADR-GD-052](decisions/052-has-relationship-policy-kind.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-024: ReBAC Cycle Tolerance

`RelationshipResolver` implementations handle cycles in the relationship graph gracefully using visited-set tracking. Cyclic graphs do not cause infinite traversal or stack overflow.

**Source**: `src/subject/relationship-resolver.ts` — the interface contract requires implementations to maintain a `visited: Set<string>` keyed on canonical `(subjectId, resourceId, relation)` tuples; revisiting a tuple terminates the branch and returns `false` without error.

**Implication**: Consumers can safely model bidirectional relationships (e.g., mutual collaboration between A and B) without risking infinite loops. The resolver always terminates, and cyclic graphs are treated as finite structures rather than errors.

**Related**: [BEH-GD-023](behaviors/05-subject.md), [ADR-GD-053](decisions/053-relationship-resolver-sync-async.md), FM-11 in [risk-assessment.md](risk-assessment.md).

---

## Async Evaluation

### INV-GD-025: Async Evaluation Timestamp Capture

`evaluateAsync()` captures `evaluatedAt` timestamp BEFORE any async attribute resolution begins. Audit timestamps reflect evaluation initiation, not completion (ALCOA+ Contemporaneous).

**Source**: `src/evaluator/evaluate.ts` — `evaluateAsync()` calls `clockSource.now()` as its very first operation, before invoking any `AttributeResolver`; the captured timestamp is stored in a local `const` and included verbatim in the resulting `AuditEntry`.

**Implication**: Audit timestamps accurately reflect when the authorization decision was requested, not when slow attribute resolvers finished. This satisfies ALCOA+ Contemporaneous even when resolver latency is significant (e.g., a remote database call taking hundreds of milliseconds).

**Related**: [BEH-GD-017](behaviors/04-policy-evaluator.md), [ADR-GD-017](decisions/017-iso-8601-timestamps.md), [ADR-GD-019](decisions/019-injectable-clock-source.md), [ADR-GD-046](decisions/046-empty-string-response-timestamp.md), FM-09, FM-10 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-026: Per-Pass Attribute Cache

`evaluateAsync()` caches resolved attributes within a single evaluation pass. The cache does NOT persist across invocations — each call starts fresh.

**Source**: `src/evaluator/evaluate.ts` — `evaluateAsync()` constructs a `new Map<string, unknown>()` at the start of each invocation and passes it by reference through recursive evaluation calls; the map is a local variable, not stored at module scope or on any shared object.

**Implication**: Calling `evaluateAsync()` twice with the same arguments does not reuse attribute values from the first call. Consumers relying on attribute freshness (e.g., real-time inventory or quota checks) are not surprised by stale cached values from a previous request.

**Related**: [BEH-GD-017](behaviors/04-policy-evaluator.md), FM-28 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-027: Attribute Resolver Timeout

When the attribute resolver exceeds `resolverTimeoutMs` (default 5000ms), the evaluator returns `Err` with code `ACL026`. Slow resolvers cannot hang the authorization system.

**Source**: `src/evaluator/evaluate.ts` — `evaluateAsync()` wraps each `AttributeResolver.resolve()` call in `Promise.race([resolver.resolve(...), rejectAfter(resolverTimeoutMs)])` where `rejectAfter` creates a timeout rejection; on timeout the race rejects and the evaluator returns `Err(new PolicyEvaluationError("ACL026", "Attribute resolver timed out"))`.

**Implication**: A slow or unresponsive attribute resolver (e.g., a database under load or a network partition) does not cause authorization calls to hang indefinitely. The guard returns a determinate error within the configured budget, which callers can surface as a 503 or service degradation signal.

**Related**: [BEH-GD-017](behaviors/04-policy-evaluator.md), [BEH-GD-019](behaviors/04-policy-evaluator.md).

---

## Field-Level Access Control

### INV-GD-028: Field Intersection Semantics

In `allOf`, `visibleFields` is the intersection of all allowing children's field sets (principle of least privilege). All policies must allow a field for it to be visible.

**Source**: `src/evaluator/evaluate.ts` — the `allOf` branch collects `visibleFields` from each child `Allow` verdict and computes the intersection using `Set` operations; a field absent from any single child's `visibleFields` is excluded from the final `Allow.visibleFields`.

**Implication**: Combining two field-restricting policies with `allOf` always produces a result at least as restrictive as each individual policy. Adding more conditions to an `allOf` can only reduce or maintain the set of visible fields, never expand it — enforcing least-privilege field exposure.

**Related**: [BEH-GD-018](behaviors/04-policy-evaluator.md), [ADR-GD-050](decisions/050-field-strategy-per-combinator.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-029: Field Union Completeness

When `anyOf` has `fieldStrategy: "union"`, ALL child policies are evaluated (no short-circuit). `visibleFields` is the union of all allowing children's fields.

**Source**: `src/evaluator/evaluate.ts` — the `anyOf` branch checks `policy.fieldStrategy === "union"` and, when true, iterates all children unconditionally, accumulating each allowing child's `visibleFields` into a running `Set` union rather than stopping at the first allow.

**Implication**: With `fieldStrategy: "union"`, a user satisfying any one of several policies gets access to the union of fields permitted by each passing policy. Full evaluation also ensures the `EvaluationTrace.complete` flag is always `true`, giving compliance reviewers complete audit visibility into which policies contributed.

**Related**: [BEH-GD-018](behaviors/04-policy-evaluator.md), [ADR-GD-051](decisions/051-anyof-union-full-evaluation.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-030: Not Policy Field Nullification

`not` inverts the verdict but does not propagate `visibleFields`. A `not` decision never carries field restrictions — `visibleFields` is always `undefined` (all fields visible).

**Source**: `src/evaluator/evaluate.ts` — the `not` branch discards `visibleFields` from the inner verdict before inverting the allow/deny decision; the resulting `Allow` or `Deny` is constructed without a `visibleFields` property, meaning all fields are implicitly visible.

**Implication**: `not(hasPermission(X))` grants access when the user does NOT hold permission X, without implying any field restrictions. Consumers who need field-scoped `not` semantics must compose explicitly with an enclosing `allOf`.

**Related**: [BEH-GD-018](behaviors/04-policy-evaluator.md), [ADR-GD-050](decisions/050-field-strategy-per-combinator.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

## Policy Evaluation Completeness

### INV-GD-031: anyOf Union Full Evaluation

When `anyOf` has `fieldStrategy: "union"`, the `complete` flag on `EvaluationTrace` is always `true` — all children appear in the trace.

**Source**: `src/evaluator/evaluate.ts` — the union `anyOf` path sets `trace.complete = true` after iterating all children; the standard short-circuit `anyOf` path sets `trace.complete = false` when it stops at the first allowing child.

**Implication**: Compliance reviewers auditing field-visibility decisions can always see which child policies contributed to the union result. Partial traces (where some children are skipped) only occur in standard non-union `anyOf` evaluations, and the `complete` flag distinguishes the two cases unambiguously.

**Related**: [BEH-GD-016](behaviors/04-policy-evaluator.md), [BEH-GD-018](behaviors/04-policy-evaluator.md), [ADR-GD-051](decisions/051-anyof-union-full-evaluation.md), FM-01 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-032: Policy Evaluation Depth Limit

The policy evaluator enforces `maxDepth` (default 64). Exceeding it returns `Err(PolicyEvaluationError)` with code `ACL003`, preventing stack overflow on deeply nested trees.

**Source**: `src/evaluator/evaluate.ts` — the internal `evaluateNode(policy, subject, ctx, depth)` function receives an integer depth counter; when `depth > maxDepth`, it returns `Err(new PolicyEvaluationError("ACL003", "Policy tree exceeds maximum depth"))` without recursing further.

**Implication**: Adversarially crafted or accidentally deeply-nested policy trees (e.g., 1000-level `allOf` chains) cannot crash the evaluator via call stack exhaustion. The error is recoverable and produces a determinate audit entry rather than an unhandled exception.

**Related**: [BEH-GD-019](behaviors/04-policy-evaluator.md), FM-11 in [risk-assessment.md](risk-assessment.md).

---

## GxP Subject Validation

### INV-GD-033: GxP Subject Identity Validation

In GxP environments, `AuthSubject.id` MUST be globally unique and IdP-traceable. No transient session tokens — every authorization decision is attributable to a specific identity.

**Source**: `src/guard/guard.ts` — when `gxp: true`, the wrapper validates that `subject.id` matches the configured `idFormat` pattern (e.g., UUID v4 regex or LDAP DN pattern) before policy evaluation; non-conforming IDs return `Err(new AccessDeniedError("ACL016", "Subject ID does not meet GxP identity requirements"))`.

**Implication**: Every audit entry in a GxP deployment contains a verifiable, globally unique subject identifier that can be cross-referenced against the organization's identity provider. ALCOA+ Attributable is satisfied at the structural level — no audit entry can exist without a traceable identity.

**Related**: [BEH-GD-022](behaviors/05-subject.md), [ADR-GD-016](decisions/016-auth-subject-authentication-fields.md), FM-25 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-034: GxP Subject Attribute Sanitization

When `gxp: true`, `SubjectProviderPort` adapters sanitize attribute values: max 1024 chars, printable UTF-8 only, control characters replaced with U+FFFD.

**Source**: `src/subject/provider-port.ts` — the `SubjectProviderPort` contract requires that when `gxp: true`, the adapter implementation passes `subject.attributes` through `sanitizeAttributes()` before returning; `sanitizeAttributes` truncates values at 1024 characters and replaces control characters (U+0000–U+001F, U+007F) with U+FFFD.

**Implication**: Audit entries in GxP mode cannot contain null bytes, control characters, or overlong strings that would corrupt log storage, break audit report rendering, or create injection vectors in downstream audit review tooling. Subject attribute data is safe for inclusion in structured records.

**Related**: [BEH-GD-022](behaviors/05-subject.md), FM-24 in [risk-assessment.md](risk-assessment.md).

---

## Configuration Validation

### INV-GD-035: Policy Tree Scan for SignaturePolicy

`guard()` scans the policy tree at construction time for `hasSignature` policies. If found and `gxp: true`, verifies a real (non-Noop) `SignatureServicePort` is configured.

**Source**: `src/guard/guard.ts` — `guard()` calls `containsSignaturePolicy(policy)` (a depth-first tree walk) synchronously during adapter construction; if a `hasSignature` node is found and `options.gxp === true`, it checks whether the wired `signatureServiceAdapter instanceof NoopSignatureService` and throws `ConfigurationError` (ACL011) if true.

**Implication**: A guard configured with `hasSignature` in its policy cannot be silently degraded to no-op signature capture by leaving `NoopSignatureService` as a default. The failure is detected at adapter construction time, not at the first signature-requiring request in production.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [BEH-GD-026](behaviors/06-guard-adapter.md), [ADR-GD-023](decisions/023-optional-signature-service.md), FM-07, FM-29 in [risk-assessment.md](risk-assessment.md).

---

### INV-GD-036: NoopSignatureService Rejection

When `gxp: true` and the policy tree contains `hasSignature`, `createGuardGraph()` rejects `NoopSignatureService` with `ConfigurationError` (ACL011).

**Source**: `src/guard/guard.ts` — `createGuardGraph()` performs the same `containsSignaturePolicy` scan as `guard()` and additionally validates via the DI container that the adapter wired to `SignatureServicePort` is not `NoopSignatureService`; rejection happens before the graph is returned to the caller.

**Implication**: No GxP guard graph containing `hasSignature` policies can be assembled without a real cryptographic signature service. The graph-factory-level enforcement catches misconfiguration even when individual `guard()` calls are constructed with factory-supplied options that might otherwise bypass the single-adapter check.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [ADR-GD-038](decisions/038-asymmetric-algorithms-gxp.md), [ADR-GD-043](decisions/043-hsm-required-gxp-key-storage.md), FM-07, FM-13 in [risk-assessment.md](risk-assessment.md).

---

## Async Adapter Lifetime

### INV-GD-037: guardAsync Singleton Lifetime

`guardAsync()` rejects adapters with non-singleton lifetime at compile time. The `GuardedAsyncAdapter` conditional type produces a compile-error for non-singleton factories.

**Source**: `src/guard/types.ts` — `GuardedAsyncAdapter<A>` is a conditional type that checks the adapter factory's `lifetime` field against `"singleton"`; when the adapter's lifetime is `"scoped"` or `"transient"`, the conditional resolves to `never`, causing a compile-time error at any call site that attempts to use `guardAsync` with such an adapter.

**Implication**: Async guard adapters cannot be accidentally configured with scoped or transient lifetimes, which would create per-request guard instances with independent initialization state (e.g., separate WAL connections, separate token replay sets). All `guardAsync` wrappers share a single initialized instance across all requests.

**Related**: [BEH-GD-025](behaviors/06-guard-adapter.md), [BEH-GD-029](behaviors/06-guard-adapter.md), [ADR-GD-049](decisions/049-async-guards-singleton-lifetime.md).
