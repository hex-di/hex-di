# 16 - Definition of Done

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-16                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Verification Specification           |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [15 - Appendices](./15-appendices.md) | Next: [17 - GxP Compliance Guide](./17-gxp-compliance.md)_

---

## DoD 1: Permission Tokens

**Spec Sections:** 5-8 | **Roadmap Item:** 1

### Requirements

- `PERMISSION_BRAND` via `Symbol.for("@hex-di/guard/permission")`
- `Permission<TResource, TAction>` interface with phantom type brands
- `createPermission({ resource, action })` factory returns branded, frozen token
- `createPermissionGroup(resource, actions)` factory returns frozen `PermissionGroupMap` — supports both array form (`["read", "write"]`) and object form (`{ read: {}, write: { description: "..." } }`)
- `isPermission(value)` type guard checks for brand symbol
- Duplicate detection: warn via `DuplicatePermissionWarning` (ACL006) when same resource:action created twice

### Test Counts

| Category   | Count | Description                                                                                               |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------- |
| Unit tests | ~18   | createPermission, createPermissionGroup (array + object overloads), isPermission, freezing, dedup warning |
| Type tests | ~8    | Permission branding, phantom types, InferResource, InferAction, FormatPermission, PermissionEquals        |

### Verification

- [ ] `createPermission` returns frozen object with brand
- [ ] `createPermissionGroup` array overload returns frozen map with correct typed entries
- [ ] `createPermissionGroup` object overload returns frozen map with correct typed entries
- [ ] `createPermissionGroup` object overload preserves `PermissionOptions` metadata
- [ ] `isPermission` returns `true` for branded tokens, `false` for plain objects and strings
- [ ] Phantom types prevent assigning `Permission<"user", "read">` to `Permission<"user", "write">`
- [ ] Duplicate permission warning emitted for same resource:action pair

---

## DoD 2: Role Tokens

**Spec Sections:** 9-12 | **Roadmap Item:** 2

### Requirements

- `ROLE_BRAND` via `Symbol.for("@hex-di/guard/role")`
- `Role<TName, TPermissions>` type with name, permissions, and inherits
- `createRole({ name, permissions, inherits? })` factory returns branded, frozen token
- `flattenPermissions(role)` resolves transitive permissions via DAG walk
- Cycle detection: returns `Err<CircularRoleInheritanceError>` (ACL002)
- `isRole(value)` type guard checks for brand symbol

### Test Counts

| Category   | Count | Description                                                                   |
| ---------- | ----- | ----------------------------------------------------------------------------- |
| Unit tests | ~20   | createRole, flattenPermissions, cycle detection, isRole, inheritance chains   |
| Type tests | ~10   | Role branding, InferRoleName, FlattenRolePermissions, ValidateRoleInheritance |

### Verification

- [ ] `createRole` returns frozen object with brand
- [ ] `flattenPermissions` returns all transitive permissions for linear chain
- [ ] `flattenPermissions` returns all transitive permissions for DAG (diamond inheritance)
- [ ] `flattenPermissions` returns `Err` for circular inheritance
- [ ] Deduplicated permission set (no duplicates in flattened result)
- [ ] Type-level `ValidateRoleInheritance` detects cycles

---

## DoD 3: Policy Data Types

**Spec Sections:** 13-17 | **Roadmap Item:** 3

### Requirements

- `Policy` discriminated union with 7 variants
- Each variant has a literal `kind` discriminant
- `PolicyKind` literal union type
- All policy objects are frozen (Object.freeze)
- `PolicyConstraint` accepts any Policy variant
- Exhaustive switch/case on `kind` is compile-time checked

### Test Counts

| Category   | Count | Description                                                                                                                                            |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests | ~28   | All 7 policy variants, freezing, kind discriminants, toString, fields on HasPermissionPolicy, fields on HasAttributePolicy, fieldMatch variant         |
| Type tests | ~14   | Policy union exhaustiveness, each variant kind literal, InferPolicyRequirements, fields type on HasPermissionPolicy, fields type on HasAttributePolicy |

### Verification

- [ ] Each policy variant has correct `kind` literal
- [ ] All policy objects are frozen
- [ ] TypeScript exhaustive check compiles for all 7 kinds (including `hasSignature`)
- [ ] Policy is a proper discriminated union (switch/case narrows type)
- [ ] `InferPolicyRequirements` extracts permissions and roles from composite policies

---

## DoD 4: Policy Combinators

**Spec Sections:** 13-14 | **Roadmap Item:** 4

### Requirements

- `hasPermission(permission)` creates `HasPermissionPolicy`
- `hasRole(role)` creates `HasRolePolicy`
- `hasAttribute(attribute, matcher)` creates `HasAttributePolicy`
- `hasSignature(meaning, options?)` creates `HasSignaturePolicy`
- `allOf(...policies)` creates `AllOfPolicy`
- `anyOf(...policies)` creates `AnyOfPolicy`
- `not(policy)` creates `NotPolicy`
- All combinators return frozen objects
- Combinators compose: `allOf(hasPermission(p), anyOf(hasRole(r), not(hasPermission(q))))`

### Test Counts

| Category   | Count | Description                                                            |
| ---------- | ----- | ---------------------------------------------------------------------- |
| Unit tests | ~15   | Each combinator, composition, freezing, edge cases (empty allOf/anyOf) |
| Type tests | ~5    | Combinator return types, variadic allOf/anyOf, not wrapping            |

### Verification

- [ ] Each combinator returns correct policy variant
- [ ] Combinators compose to arbitrary depth
- [ ] Empty `allOf()` and `anyOf()` handle edge cases
- [ ] `not()` wraps exactly one policy
- [ ] All returned objects are frozen

---

## DoD 5: Policy Evaluator

**Spec Sections:** 18-21 | **Roadmap Item:** 5

### Requirements

- `evaluate(policy, context)` returns `Result<Decision, PolicyEvaluationError>`
- Decision carries `kind`, `reason`, `policy`, `trace`, `evaluationId`, `evaluatedAt`, `subjectId`
- `EvaluationTrace` is a recursive tree of trace nodes
- `hasPermission` checks `subject.permissions` via Set.has()
- `hasRole` checks `subject.roles` via Array.includes()
- `hasAttribute` checks resource attributes via matcher
- `hasSignature` checks signature in context: meaning match, signer role (if specified), validated flag
- `allOf` requires all children to allow (short-circuits on first deny)
- `anyOf` requires any child to allow (short-circuits on first allow)
- `not` inverts the child's verdict

### Test Counts

| Category   | Count | Description                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~44   | Each policy kind evaluation, composite policies, trace tree structure, short-circuiting, error cases, evaluationId/evaluatedAt/subjectId verification, multi-signature array evaluation, visibleFields on Allow, field merging in allOf (intersection), field merging in anyOf (propagation), fieldMatch matcher evaluation, intersectVisibleFields helper, empty set intersection |

### Verification

- [ ] `hasPermission` allows when subject has permission, denies otherwise
- [ ] `hasRole` allows when subject has role, denies otherwise
- [ ] `hasAttribute` evaluates matcher against resource attribute
- [ ] `hasSignature` denies when no signatures in context (empty or missing array)
- [ ] `hasSignature` finds matching signature via `signatures.find(s => s.meaning === meaning)`
- [ ] `hasSignature` denies when no signature with required meaning found in array
- [ ] `hasSignature` denies when signer lacks required role
- [ ] `hasSignature` denies when signature not validated
- [ ] `hasSignature` allows when matching signature found with correct meaning, role, and validation
- [ ] `hasSignature` works with multi-signature arrays (maker-checker: two different meanings both present)
- [ ] `hasSignature` deny reason is context-aware ("No signatures provided" vs "No signature with meaning X found in N provided signature(s)")
- [ ] `allOf` denies on first failing child, includes all evaluated children in trace
- [ ] `anyOf` allows on first passing child, includes all evaluated children in trace
- [ ] `not` inverts verdict
- [ ] Decision includes accurate reason string
- [ ] Trace tree structure matches policy tree structure
- [ ] Duration is measured in milliseconds (durationMs via performance.now())
- [ ] Decision includes evaluationId (UUID v4) for audit correlation
- [ ] Decision includes evaluatedAt (ISO 8601) timestamp
- [ ] Decision includes subjectId matching the evaluated subject
- [ ] `hasPermission` with `fields` produces Allow with `visibleFields` set
- [ ] `hasAttribute` with `fields` produces Allow with `visibleFields` set when matcher passes
- [ ] `fieldMatch` matcher evaluates correctly against resource attribute
- [ ] `allOf` intersects `visibleFields` across all allowing children (least privilege)
- [ ] `anyOf` propagates first-allowing child's `visibleFields` directly
- [ ] `intersectVisibleFields` treats `undefined` as identity element (universal set)
- [ ] `intersectVisibleFields` returns `undefined` when no children have field restrictions
- [ ] Empty `visibleFields` set means complete field-level denial (no fields visible)

---

## DoD 6: Subject Port

**Spec Sections:** 22-24 | **Roadmap Item:** 6

### Requirements

- `SubjectProviderPort` is a well-known outbound port with scoped lifetime
- `createSubjectAdapter(factory)` creates an adapter providing SubjectProviderPort
- Subject resolved once per scope and cached (immutable within scope)
- `PrecomputedSubject` includes flattened permission set for O(1) lookups

### Test Counts

| Category   | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~27   | Port definition, adapter creation, scope caching, precomputation, authenticationMethod/authenticatedAt fields, SubjectProvider conformance suite (12 tests: getSubject returns AuthSubject, non-empty id, roles array, permissions ReadonlySet, attributes record, authenticationMethod, authenticatedAt ISO 8601 UTC, synchronous return, idempotent within scope, subject is frozen, permissions resource:action format, IdP field mapping) |

### Verification

- [ ] `SubjectProviderPort` has correct name, direction, and category
- [ ] `createSubjectAdapter` returns valid adapter with scoped lifetime
- [ ] Subject is resolved once per scope (factory called once per scope)
- [ ] Precomputed permission set is a `ReadonlySet<string>`
- [ ] Precomputed set matches `flattenPermissions` result
- [ ] AuthSubject includes authenticationMethod field
- [ ] AuthSubject includes authenticatedAt field (ISO 8601)
- [ ] createTestSubject provides default authenticationMethod and authenticatedAt
- [ ] `createSubjectProviderConformanceSuite` runs 12 conformance tests against adapter
- [ ] Conformance suite validates subject structure, immutability, and idempotency
- [ ] Attribute sanitization REQUIRED when `gxp: true` (1024 char max, control character replacement with U+FFFD) (R2)

---

## DoD 7: Guard Adapter

**Spec Sections:** 25-28 | **Roadmap Item:** 7

### Requirements

- `guard(adapter, { resolve, methodPolicies? })` returns `GuardedAdapter`
- GuardedAdapter provides the same port as the inner adapter
- GuardedAdapter adds `SubjectProviderPort` to requires (deduplication if already present)
- Resolution-time policy check via guard wrapper (factory-level evaluation)
- Optional per-method policies via `methodPolicies`
- `AccessDeniedError` (ACL001) thrown on denial
- FieldMaskContextPort auto-registered in scope when Allow decision carries `visibleFields`

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | ~57   | guard() wrapper, type transformation, requires dedup, policy evaluation, audit trail recording, failOnAuditError (default true), GxPAuditEntry, policySnapshot, traceDigest format, multi-signature capture, FieldMaskContext registration, FieldMaskContext NOT registered without visibleFields, AuditEntry field size enforcement (reason truncation, non-reason rejection), GxPAuditEntry compile-time enforcement, signerName GxP validation, WAL integration, GxP mode type rejection, createWalAuditTrail, WAL intent lifecycle, scope expiry (ScopeExpiredError ACL013 returned, no audit entry, WARNING log, elapsedMs/maxLifetimeMs fields, GxP requires maxScopeLifetimeMs, ConfigurationError on missing), rate limiting (RateLimitExceededError ACL015, no audit entry, WARNING log, currentRate/maxRate fields) |
| Type tests        | ~10   | GuardedAdapter type, AppendAclPorts, provides preservation, requires union                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Integration tests | ~34   | Container-level guard enforcement, scope isolation, tracing integration, AuditTrailPort integration, failOnAuditError default-true behavior, ReauthenticationToken replay protection, multi-signature flow, FieldMaskContext scope propagation, WAL crash recovery, GxP mode enforcement, WAL + audit trail integration, WAL pending intent recovery, concurrent WAL + audit, scope expiry in container (expired scope returns ACL013), rate limit in container (exceeded rate returns ACL015), rate limit resets after window                                                                                                                                                                                                                                                                                                |

### Verification

- [ ] `guard()` preserves the inner adapter's provides port
- [ ] `guard()` adds `SubjectProviderPort` to requires
- [ ] `guard()` deduplicates if `SubjectProviderPort` already in requires
- [ ] Resolution denied when subject lacks permissions
- [ ] Resolution allowed when subject has permissions
- [ ] Method-level policies override adapter-level policy
- [ ] `AccessDeniedError` carries the Decision
- [ ] Different scopes get different subjects
- [ ] guard() adapter requires AuditTrailPort in its requires tuple
- [ ] Every guard evaluation (allow and deny) records to AuditTrailPort
- [ ] NoopAuditTrail adapter discards entries without error
- [ ] AuditEntry includes evaluationId matching the Decision
- [ ] MemoryAuditTrail has validateAuditEntry() and assertAllEntriesValid() methods
- [ ] AuditTrail.record() returns Result<void, AuditTrailWriteError>
- [ ] NoopAuditTrail.record() returns ok(undefined)
- [ ] Guard wrapper logs warning on audit write failure but does not block resolution
- [ ] AuditEntry has optional `integrityHash`, `previousHash`, and `signature` fields
- [ ] ElectronicSignature type defined with signerId, signedAt, meaning, value, algorithm
- [ ] Non-regulated AuditTrail adapters omit integrity/signature fields without error
- [ ] createGuardGraph() requires auditTrailAdapter (not optional)
- [ ] createNoopAuditTrailAdapter() factory exists for explicit opt-in
- [ ] NoopAuditTrail has GxP warning in JSDoc
- [ ] `SignatureServicePort` defined as optional outbound port (category: compliance)
- [ ] `createGuardGraph()` accepts optional `signatureAdapter` parameter
- [ ] NoopSignatureService returns Err for all operations with GxP warning
- [ ] Guard wrapper resolves SignatureServicePort only when hasSignature is in policy tree
- [ ] `failOnAuditError: true` (default) causes AuditTrailWriteError (ACL008) to throw on audit write failure
- [ ] `failOnAuditError: false` (explicit opt-in) logs warning on audit write failure without blocking resolution
- [ ] `GxPAuditEntry` interface extends `AuditEntry` with non-optional `integrityHash`, `previousHash`, `signature`
- [ ] Guard wrapper captures signatures sequentially (one per distinct meaning) for multi-signature policies
- [ ] Each signature capture in a multi-signature flow triggers independent re-authentication
- [ ] `FieldMaskContextPort` registered in scope when Allow decision carries `visibleFields`
- [ ] `FieldMaskContext.visibleFields` matches the Allow decision's `visibleFields`
- [ ] `FieldMaskContext.evaluationId` matches the Allow decision's `evaluationId`
- [ ] `FieldMaskContextPort` NOT registered when Allow decision has no `visibleFields`
- [ ] AuditEntry field size: `reason` exceeding 2048 chars truncated with "…[truncated]" suffix and WARNING log
- [ ] AuditEntry field size: non-reason fields exceeding max length return `Err(AuditTrailWriteError)`
- [ ] `GxPAuditEntry` strict subtype enforced at compile time for GxP audit trail adapters
- [ ] `ElectronicSignature.signerName` populated during capture; GxP rejects empty signerName (ACL008)
- [ ] Scope expiry: `ScopeExpiredError` (ACL013) returned when scope exceeds `maxScopeLifetimeMs`
- [ ] Scope expiry: no audit entry recorded for expired scope evaluations
- [ ] Scope expiry: WARNING log emitted with scopeId, elapsedMs, maxLifetimeMs
- [ ] Scope expiry: `maxScopeLifetimeMs` REQUIRED when `gxp: true` (type error and runtime ConfigurationError)
- [ ] Rate limiting: `RateLimitExceededError` (ACL015) returned when rate exceeded
- [ ] Rate limiting: no audit entry recorded for rate-limited evaluations
- [ ] Rate limiting: WARNING log emitted on rate limit activation

---

## DoD 8: Policy Serialization

**Spec Sections:** 31-36 | **Roadmap Item:** 8

### Requirements

- `serializePolicy(policy)` produces deterministic JSON
- `deserializePolicy(json)` returns `Result<Policy, PolicyParseError>`
- Round-trip guarantee: `deserializePolicy(serializePolicy(p))` structurally equals `p`
- `explainPolicy(policy, subject)` produces human-readable explanation
- Schema versioning for forward compatibility
- `serializeAuditEntry(entry)` produces deterministic JSON (alphabetical key order)
- `deserializeAuditEntry(json)` returns `Result<AuditEntry, AuditEntryParseError>`
- Round-trip guarantee for audit entries
- `createAuditExportManifest()` produces export manifest with SHA-256 checksum
- AuditEntry JSON Schema (2020-12) for cross-system interoperability

### Test Counts

| Category   | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~34   | Serialize all 7 policy kinds, deserialize, round-trip, error cases, explain output, fields serialization, fieldMatch serialization, deserialization with fields, fields validation, serializeAuditEntry deterministic output, deserializeAuditEntry valid entry, deserializeAuditEntry missing field (ACL014), deserializeAuditEntry unknown schemaVersion, deserializeAuditEntry invalid UUID, deserializeAuditEntry field too long, serializeAuditEntry+deserializeAuditEntry round-trip, createAuditExportManifest checksum, export manifest entryCount, export manifest scopeIds, export manifest chainIntegrityVerified |

### Verification

- [ ] Each policy kind serializes to correct JSON shape
- [ ] Composite policies serialize children recursively
- [ ] Deserialization validates kind discriminant
- [ ] Deserialization returns `Err` for unknown kinds, missing fields, malformed JSON
- [ ] Round-trip produces structurally equal policies
- [ ] `explainPolicy` produces correct output for allow and deny
- [ ] `explainPolicy` handles composite policies with nested explanations
- [ ] `serializeAuditEntry` produces deterministic JSON (alphabetical key order)
- [ ] `deserializeAuditEntry` validates all required fields
- [ ] `deserializeAuditEntry` rejects unknown schemaVersion with `AuditEntryParseError` (ACL014)
- [ ] Audit entry serialize/deserialize round-trip produces structurally equal entries
- [ ] `createAuditExportManifest` computes SHA-256 checksum over export content
- [ ] Export manifest includes correct entryCount, scopeIds, hashAlgorithms
- [ ] Export manifest `chainIntegrityVerified` reflects `verifyAuditChain()` result

---

## DoD 9: React SubjectProvider

**Spec Section:** 38 | **Roadmap Item:** 9

### Requirements

- `SubjectProvider` component accepts `subject: AuthSubject | null`
- `null` means subject not loaded (loading state)
- Creates React context (not DI scope)
- SSR: must be present in server render tree
- `MissingSubjectProviderError` thrown when hooks used outside provider

### Test Counts

| Category   | Count | Description                                                                                                                   |
| ---------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~10   | Provider rendering, null subject, context propagation, missing provider error, onDecision callback, ClientDecisionEvent shape |

### Verification

- [ ] Children can access subject via context
- [ ] `null` subject propagates as loading state
- [ ] No DI scope created
- [ ] Hooks throw `MissingSubjectProviderError` when provider missing
- [ ] SSR: no client-only APIs used
- [ ] SubjectProvider calls Object.freeze() on non-null subjects before storing in context
- [ ] Frozen subjects cause TypeError on mutation in strict mode

---

## DoD 10: React Can/Cannot

**Spec Sections:** 39-42 | **Roadmap Item:** 10

### Requirements

- `<Can permission={p}>` renders children when subject has permission
- `<Cannot permission={p}>` renders children when subject lacks permission
- Both accept `policy` prop for complex policies
- `fallback` prop is exclusively for the **denied** case, not loading
- `<Can>` and `<Cannot>` **suspend** when subject is null (Suspense protocol)
- Loading UI is handled by `<Suspense>` boundaries, not by `fallback`

### Test Counts

| Category   | Count | Description                                                                                                                      |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~25   | Can/Cannot rendering, permission check, policy check, denied fallback, suspension on null subject, Suspense boundary integration |

### Verification

- [ ] `<Can>` renders children when subject has permission
- [ ] `<Can>` renders fallback when subject lacks permission
- [ ] `<Can>` suspends when subject is null (throws pending promise)
- [ ] `<Cannot>` renders children when subject lacks permission
- [ ] `<Cannot>` renders fallback when subject has permission
- [ ] `<Cannot>` suspends when subject is null (throws pending promise)
- [ ] Policy prop evaluates complex policies
- [ ] `<Suspense>` boundary renders its fallback during suspension
- [ ] `fallback` prop is not rendered during loading (only on denial)

---

## DoD 11: React Hooks

**Spec Sections:** 40-42 | **Roadmap Item:** 11

### Requirements

**Suspense hooks** (default API -- clean return types, suspend on null subject):

- `useCan(permission)` returns `boolean` -- suspends when subject is null
- `usePolicy(policy)` returns `Decision` -- suspends when subject is null
- `useSubject()` returns `AuthSubject` -- suspends when subject is null

**Deferred hooks** (escape hatch -- discriminated unions, never suspend):

- `useCanDeferred(permission)` returns `CanResult` discriminated union (`pending | allowed | denied`)
- `usePolicyDeferred(policy)` returns `PolicyResult` discriminated union (`pending | resolved`)
- `useSubjectDeferred()` returns `AuthSubject | null`

**Types:**

- `CanResult` type: `{ status: "pending" } | { status: "allowed" } | { status: "denied"; reason: string }`
- `PolicyResult` type: `{ status: "pending" } | { status: "resolved"; decision: Decision }`

**Factory:**

- `createGuardHooks()` returns 9 members: `SubjectProvider`, `Can`, `Cannot`, `useCan`, `usePolicy`, `useSubject`, `useCanDeferred`, `usePolicyDeferred`, `useSubjectDeferred`
- Memoization: `useCan`/`useCanDeferred` is O(1) via precomputed set

### Test Counts

| Category   | Count | Description                                                                                                                                                                                                                |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests | ~28   | useCan (suspend + boolean), useCanDeferred (3 states), usePolicy (suspend + Decision), usePolicyDeferred (2 states), useSubject (suspend), useSubjectDeferred (null), createGuardHooks (9 members, isolation), memoization |

### Verification

**Suspense hooks:**

- [ ] `useCan` suspends when subject is null (throws pending promise)
- [ ] `useCan` returns `true` when subject has permission
- [ ] `useCan` returns `false` when subject lacks permission
- [ ] `usePolicy` suspends when subject is null
- [ ] `usePolicy` returns full Decision object when subject is loaded
- [ ] `useSubject` suspends when subject is null
- [ ] `useSubject` returns AuthSubject when subject is loaded

**Deferred hooks:**

- [ ] `useCanDeferred` returns `{ status: "pending" }` when subject is null
- [ ] `useCanDeferred` returns `{ status: "allowed" }` when subject has permission
- [ ] `useCanDeferred` returns `{ status: "denied", reason }` when subject lacks permission
- [ ] `usePolicyDeferred` returns `{ status: "pending" }` when subject is null
- [ ] `usePolicyDeferred` returns `{ status: "resolved", decision }` when subject is loaded
- [ ] `useSubjectDeferred` returns `null` when subject is null
- [ ] `useSubjectDeferred` returns `AuthSubject` when subject is loaded

**Factory and isolation:**

- [ ] `createGuardHooks` returns object with 9 members
- [ ] Multiple `createGuardHooks` instances are independent
- [ ] Default exports include all 6 hooks + `CanResult` and `PolicyResult` types

---

## DoD 12: DevTools Integration

**Spec Sections:** 43-44 | **Roadmap Item:** 12

### Requirements

- `GuardInspector` implements `LibraryInspector` protocol
- Emits events: `guard.evaluate`, `guard.allow`, `guard.deny`
- Snapshot includes: active policies, recent decisions (ring buffer), permission statistics
- Events appear in unified DevTools snapshot

### Test Counts

| Category   | Count | Description                                                                                                                                                  |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests | ~12   | Event emission, snapshot structure, ring buffer eviction, statistics aggregation, dataSource indicator in AuditReviewOutput, ring buffer WARNING enforcement |

### Verification

- [ ] Inspector emits `guard.evaluate` at start of evaluation
- [ ] Inspector emits `guard.allow` or `guard.deny` at end
- [ ] Snapshot includes active policies map
- [ ] Recent decisions ring buffer respects max size
- [ ] Permission stats aggregate correctly (per-port, per-subject)
- [ ] `clear()` resets all state
- [ ] GuardLibraryInspectorPort defined with category "library-inspector"
- [ ] createGuardLibraryInspector() bridge function follows established pattern
- [ ] GuardLibraryInspectorAdapter is a frozen singleton
- [ ] Auto-discovery works: container's afterResolve hook registers the inspector
- [ ] MCP resource URIs documented: hexdi://guard/snapshot, /policies, /decisions, /stats, /audit
- [ ] A2A skills documented: guard.inspect-policies, guard.audit-review, guard.explain-decision
- [ ] When `gxp: true`, MCP resource invocations (`hexdi://guard/audit`, `/decisions`, `/stats`) recorded in meta-audit log
- [ ] Meta-audit entries include requestor identity, timestamp, resource accessed, query parameters, result summary
- [ ] When `gxp: true`, A2A `guard.audit-review` invocations recorded in meta-audit log
- [ ] Meta-audit log maintains own tamper-evident hash chain (`sequenceNumber`, `integrityHash`, `previousHash`)
- [ ] `checkGxPReadiness()` warns when `maxRecentDecisions` < 200 in GxP environments (R4)

---

## DoD 13: GxP Compliance

**Spec Sections:** 17 (sections 59-69) | **Roadmap Item:** Cross-cutting

### Requirements

- Complete `AuditEntry` construction from `Decision` with all 10 required fields
- `traceDigest` compact string summarizing the evaluation trace tree
- `MemoryAuditTrail` with hash chain verification (`validateEntry`, `validateChain`, `assertAllEntriesValid`, `query`)
- SHA-256 integrity hash computation covering all 10 required `AuditEntry` fields + `schemaVersion` + `sequenceNumber` + `traceDigest` + `policySnapshot` (ADR #29, #30)
- Genesis entry uses empty string as `previousHash`
- `ClockSource` interface with NTP requirement for production
- `sequenceNumber` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- Per-scope concurrent chain support with monotonic sequence numbers (section 61.4a, ADR #30)
- Validation Plan (IQ/OQ/PQ) documented (section 67)
- FMEA risk assessment with 31 failure modes (section 68)
- Regulatory traceability matrix with 72 rows across 7 frameworks (section 69)
- `createAuditTrailConformanceSuite()` in `@hex-di/guard-testing` with 17 test cases (section 13)
- `createGuardHealthCheck()` for runtime canary evaluation (section 07-guard-adapter.md)
- Scope disposal hook: when `gxp: true`, scope disposal MUST invoke `verifyAuditChain()` on the scope's audit entries before releasing scope resources (section 61)

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests        | ~64   | AuditEntry construction, traceDigest format, integrity hash (pipe-delimited, includes schemaVersion), HMAC option, clock source, sequenceNumber assignment, gap detection, policySnapshot field, WAL intent lifecycle, WAL crash simulation, WAL deduplication, WAL + audit trail integration, conformance suite test cases (17), completeness monitor counters, completeness monitor discrepancy detection, clock drift alert, Performance.now exclusion, retention period enforcement, GDPR pseudonymization, export manifest, constant-time signature comparison, constant-time reauth comparison, key size enforcement, separation config enforcement, reauth rate limiting, schemaVersion set to 1 on new entries, hash chain includes schemaVersion field, scope disposal triggers verifyAuditChain, disposal skips verification when gxp:false, disposal verification failure emits diagnostic event, NTP unavailability fallback (OQ-21), WAL backlog latency (PQ-9), multi-region deduplication (FM-22), reference adapter conformance meta-tests (MemoryAuditTrail, BufferedExample, DurableExample), PolicyChangeAuditEntry construction (createPolicyChangeAuditEntry helper), PolicyChangeAuditEntry separation of duties (approverId ≠ actorId rejection), PolicyChangeAuditEntry changeRequestId non-empty validation (GxP), PolicyChangeAuditEntry hash computation via hashPolicy(), createTestPolicyChangeAuditEntry defaults, PolicyChangeAuditEntry \_tag discriminant |
| Integration tests | ~23   | All required fields for Allow/Deny, audit before AccessDeniedError, write failure handling (default true), hash chain integrity (pipe-delimited), NoopAuditTrail, concurrent scope chains, sequence monotonicity, crash window mitigation, GxP mode enforcement, WAL persistence, WAL recovery on startup, concurrent WAL + audit, scope disposal chain verification end-to-end (gxp:true), disposal with corrupted chain entry detected, guard-sqlite conformance suite passage (durable tier), guard-sqlite GxPAuditEntry support, guard-sqlite schema migration chain integrity, PolicyChangeAuditEntry hash chain participation (same chain as AuditEntry), runtime policy change recording (deserializePolicy triggers entry), PolicyChangeAuditEntry recorded before policy activation, SBOM IQ check verification (runIQ validates IQ-12 SBOM generation when gxp:true)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Verification

- [ ] `AuditEntry` includes all 10 required fields for Allow decisions
- [ ] `AuditEntry` includes all 10 required fields for Deny decisions
- [ ] `AuditEntry.reason` is empty string (not undefined) for Allow decisions
- [ ] Audit recording happens BEFORE the allow/deny action in the guard wrapper
- [ ] AuditTrail write failure throws AuditTrailWriteError when `failOnAuditError` is `true` (default)
- [ ] AuditTrail write failure logs warning but does not block resolution when `failOnAuditError` is `false` (explicit opt-in)
- [ ] Hash chain integrity validates after 100 sequential evaluations
- [ ] Hash chain covers all 10 required fields + schemaVersion + sequenceNumber + traceDigest + policySnapshot (ADR #29, #30)
- [ ] NoopAuditTrail discards entries without error
- [ ] `SystemClock` produces ISO 8601 UTC format
- [ ] Injectable clock produces deterministic timestamps
- [ ] `sequenceNumber` is monotonically increasing within a scope
- [ ] Gap detection: missing sequence number detectable in O(1)
- [ ] Concurrent scope chains: 10 scopes x 100 entries each validate independently
- [ ] Per-scope chain verification: `verifyAuditChain(entries.filter(e => e.scopeId === scope))` passes
- [ ] IQ checklist items are verifiable via automated tooling (IQ-1 through IQ-12)
- [ ] OQ checklist items map to existing test suite (727 tests across 21 DoD items)
- [ ] PQ checklist items have measurable pass criteria
- [ ] FMEA covers all 31 failure modes with mitigations (FM-01 through FM-31)
- [ ] All failure modes with pre-mitigation RPN >= 15 have residual RPN <= 10
- [ ] Traceability matrix has 72 rows (19 FDA + 18 EU GMP + 9 ALCOA+ + 7 GAMP5 + 10 ICH/PIC/S + 3 WHO + 6 MHRA)
- [ ] AuditEntry.schemaVersion set to 1 on all new entries
- [ ] Hash chain computation includes String(entry.schemaVersion) in pipe-delimited field list
- [ ] Every traceability matrix row references a specific DoD item and test count
- [ ] ADR #30 documented in 15-appendices.md
- [ ] `createAuditTrailConformanceSuite()` runs 17 test cases against `MemoryAuditTrail`
- [ ] Conformance suite validates append-only, atomic writes, completeness, hash chain, and no silent defaults
- [ ] `createGuardHealthCheck()` returns `GuardHealthCheckResult` with policyEvaluationOk, auditTrailResponsive, chainIntegrityOk
- [ ] Health check canary evaluation produces a valid audit entry and verifies chain integrity
- [ ] `createCompletenessMonitor()` tracks per-port resolution vs audit entry counts
- [ ] `queryCompleteness(portName)` returns `{ resolutions, auditEntries, discrepancy }`
- [ ] `createCompletenessMonitor()` REQUIRED when `gxp: true` — mechanism deployed with health check integration (R1)
- [ ] UTF-8 BOM in CSV exports when non-ASCII audit trail content present (G1)

**Reference Adapter Validation (§61, §13-testing.md):**

- [ ] `MemoryAuditTrail` passes `createAuditTrailConformanceSuite()` in CI on every commit
- [ ] `BufferedAuditTrailExample` passes `createAuditTrailConformanceSuite()` in CI on every commit
- [ ] `DurableAuditTrailExample` passes `createAuditTrailConformanceSuite()` in CI on every commit
- [ ] `@hex-di/guard-sqlite` passes `createAuditTrailConformanceSuite()` with `durabilityTier: "durable"` in CI

**Policy Change Audit Entry (§64a-1):**

- [ ] `PolicyChangeAuditEntry` type defined with all required fields (\_tag, changeId, timestamp, actorId, portName, previousPolicyHash, newPolicyHash, reason, applied, changeRequestId, approverId, approvedAt)
- [ ] `GxPPolicyChangeAuditEntry` extends `PolicyChangeAuditEntry` with hash chain fields (sequenceNumber, integrityHash, previousHash, hashAlgorithm)
- [ ] `createPolicyChangeAuditEntry()` helper computes hashes via `hashPolicy()` and validates separation of duties
- [ ] `PolicyChangeAuditEntry` recorded before policy activation when `gxp: true`
- [ ] `PolicyChangeAuditEntry` participates in same hash chain as regular `AuditEntry` (no separate chain)
- [ ] `approverId` !== `actorId` enforced on `PolicyChangeAuditEntry` (separation of duties)
- [ ] `changeRequestId` MUST be non-empty when `gxp: true`
- [ ] `createTestPolicyChangeAuditEntry()` test helper in `@hex-di/guard-testing` with sensible defaults

**AdminGuard Conformance Suite (§13-testing.md, §64a-64g):**

- [ ] `createAdminGuardConformanceSuite()` runs 14 test cases against AdminGuardConfig
- [ ] Conformance suite validates deny-by-default, admin role authorization, policy change recording, admin activity monitoring, separation of duties, and emergency bypass
- [ ] `createAdminGuardConformanceSuite()` runs in CI alongside AuditTrail, SignatureService, and SubjectProvider conformance suites
- [ ] Conformance suite failures block merge
- [ ] Conformance suite `cleanup` parameter invoked after each test case for resource teardown

**Scope Disposal Chain Verification (§61):**

- [ ] When `gxp: true`, scope disposal invokes `verifyAuditChain()` on the scope's audit entries
- [ ] Scope disposal chain verification failure emits a structured diagnostic event (not a thrown error) to avoid blocking disposal
- [ ] When `gxp: false`, scope disposal does NOT invoke `verifyAuditChain()` (no performance penalty for non-GxP)
- [ ] Scope disposal chain verification is covered by OQ-6 (at least one disposal-triggered verification scenario)

**Clock & Timestamps (§62):**

- [ ] Clock drift exceeding 1 second triggers operational alert
- [ ] `Performance.now()` NOT used for audit-grade timestamps (only for `durationMs`)
- [ ] ClockSource verifies RTC availability when `gxp: true` (plausible range, monotonic advance, ConfigurationError ACL009 on failure) (G4)

**Data Retention (§63):**

- [ ] Minimum retention periods enforced: 1yr allow, 3yr deny, lifetime signatures, lifetime hash chains, 5yr policy snapshots
- [ ] GDPR pseudonymization: `AuditEntry.subjectId` uses pseudonymized identifier when GDPR applies

**AuditQueryPort (§12-inspection, §64e):**

- [ ] `queryByEvaluationId()` returns matching entry or undefined for unknown ID
- [ ] `queryBySubjectId()` returns filtered entries within optional time range
- [ ] `queryByTimeRange()` returns entries within specified range with optional decision filter
- [ ] `queryByPortName()` returns filtered entries within optional time range
- [ ] `exportEntries()` produces valid JSON Lines output with AuditExportManifest
- [ ] `exportEntries()` produces valid RFC 4180 CSV output with AuditExportManifest

**Audit Trail Review & Exports (§64):**

- [ ] Audit data exports self-contained with manifest (entry count, hash values, checksums, export timestamp)

**GxP Regression Test Evidence (§67b):**

- [ ] Every GxP compliance finding remediation includes an OQ regression test traceable to the original finding identifier
- [ ] GxP regression tests are permanently retained in the OQ suite and MUST NOT be removed during test maintenance

**Policy Change Control (§64a):**

- [ ] Policy changes require documented change request, impact analysis, approval by non-requestor
- [ ] Framework version upgrades, adapter changes, infrastructure migrations trigger full OQ re-run

**Administrative Activity Monitoring (§64b):**

- [ ] Runtime guard config changes logged as administrative events in append-only log

**Re-Authentication (§65b):**

- [ ] `reauthenticate()` enforces rate limiting (RECOMMENDED: 5 attempts in 15 minutes)
- [ ] Failed re-authentication logged with signerId, timestamp, reason
- [ ] First signature in continuous session requires full re-authentication

**Constant-Time Comparison (§65b-1):**

- [ ] When `gxp: true`, `SignatureService.validate()` uses constant-time comparison for signature values
- [ ] When `gxp: true`, `ReauthenticationToken` comparison uses constant-time comparison

**Key Management (§65c):**

- [ ] GxP SignatureService enforces minimum key sizes at construction (RSA 2048, ECDSA P-256, HMAC 256-bit)
- [ ] Keys below minimum thresholds rejected at adapter construction with `ConfigurationError`
- [ ] GxP environments using `hasSignature` for compliance evidence use asymmetric algorithms (RSA/ECDSA)
- [ ] Key compromise triggers immediate revocation (within 1 hour) and notification

**Signature Meanings (§65d):**

- [ ] Five standard `SignatureMeaning` values MUST NOT be redefined or overloaded
- [ ] `capture()` rejects same-signer duplicates within single evaluation (separation of duties)
- [ ] When `gxp: true`, `enforceSeparation: false` produces `ConfigurationError`

**Validation Plan (§67):**

- [ ] IQ includes 11 specific checks (IQ-1 through IQ-11)
- [ ] OQ includes 42 specific checks (OQ-1 through OQ-42) with baseline test counts
- [ ] PQ includes 9 specific checks (PQ-1 through PQ-9) with latency/throughput thresholds

---

## DoD 14: Vision Integration

**Spec Sections:** 01-overview.md section 5, 12-inspection.md sections 44c-44d | **Roadmap Item:** Cross-cutting

### Requirements

- MCP resource response types defined (`GuardSnapshotResponse`, `GuardPoliciesResponse`, etc.)
- A2A skill input/output types defined (`InspectPoliciesInput/Output`, `AuditReviewInput/Output`, etc.)
- `guard.explain-decision` A2A skill implementation
- Guard snapshot appears in unified DevTools snapshot under `"guard"` key

### Test Counts

| Category   | Count | Description                                                    |
| ---------- | ----- | -------------------------------------------------------------- |
| Type tests | ~4    | MCP response types match JSON schemas, A2A skill types compile |

### Verification

- [ ] MCP resource response types exported from `@hex-di/guard`
- [ ] A2A skill input/output types exported from `@hex-di/guard`
- [ ] `guard.explain-decision` produces correct explanation for Allow, Deny, and composite policies
- [ ] Guard snapshot appears under `"guard"` key in unified snapshot

---

## DoD 15: Electronic Signatures

**Spec Sections:** 07 (SignatureService), 04 (HasSignaturePolicy), 05 (hasSignature evaluation), 09 (serialization), 17 sections 65a-65d | **Roadmap Item:** 15

### Requirements

- `SignatureService` interface with `capture()`, `validate()`, `reauthenticate()` methods
- `SignatureServicePort` as optional outbound port (category: compliance)
- `HasSignaturePolicy` as 7th policy variant with `meaning` and optional `signerRole`
- `hasSignature(meaning, options?)` combinator
- `ValidatedSignature` type in `EvaluationContext`
- `ReauthenticationChallenge`, `ReauthenticationToken`, `SignatureCaptureRequest`, `SignatureValidationResult` types
- `SignatureError` (ACL009) with 7 category discriminants
- `SignatureMeanings` constants: AUTHORED, REVIEWED, APPROVED, VERIFIED, REJECTED, RESPONSIBLE
- `NoopSignatureService` adapter (all ops return Err, GxP warning)
- `createMemorySignatureService()` for testing with HMAC-SHA256, operation tracking, `revokeKey()`, `clear()`
- Key management behavioral contracts documented in 17-gxp-compliance/07-electronic-signatures.md section 65c

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | ~32   | SignatureService methods, hasSignature evaluation, serialization, NoopSignatureService, SignatureMeanings, MemorySignatureService, key size enforcement, constant-time validation, constant-time reauth, signerName validation, same-signer rejection, enforceSeparation config, key compromise revocation                                                                                                            |
| Type tests        | ~5    | HasSignaturePolicy type, ValidatedSignature, SignatureError categories, SignatureMeanings const                                                                                                                                                                                                                                                                                                                       |
| Conformance       | 15    | SignatureService conformance suite (10 core: capture/validate round-trip, expired/missing reauth rejection, validate integrity, tampered payload detection, revoked key detection, revoked key capture rejection, two-component reauth, time-limited token, same-signer rejection; 5 GxP: constant-time signature, constant-time reauth, key size enforcement, signerName validation, enforceSeparation immutability) |
| Integration tests | ~14   | Guard with hasSignature policies, re-authentication flow, key rotation/revocation, audit trail with signatures, counter-signing flow, separation of duties enforcement, ReauthenticationToken security (CSPRNG, one-time-use)                                                                                                                                                                                         |

### Verification

- [ ] `SignatureService.capture()` returns `Result<ElectronicSignature, SignatureError>`
- [ ] `SignatureService.capture()` rejects expired `ReauthenticationToken`
- [ ] `SignatureService.capture()` populates `reauthenticated: true` on `ElectronicSignature`
- [ ] `SignatureService.validate()` checks crypto integrity, binding integrity, and key status
- [ ] `SignatureService.reauthenticate()` enforces two-component identification
- [ ] `ReauthenticationToken` has time-limited validity
- [ ] `hasSignature` policy denies when no signature in context
- [ ] `hasSignature` policy denies on meaning mismatch
- [ ] `hasSignature` policy denies when signer lacks required role
- [ ] `hasSignature` policy denies when signature not validated
- [ ] `hasSignature` policy allows when all conditions met
- [ ] `hasSignature` serializes/deserializes correctly
- [ ] `NoopSignatureService` returns Err for all operations with category "missing_service"
- [ ] `createMemorySignatureService()` generates real HMAC-SHA256 signatures
- [ ] `MemorySignatureService.revokeKey()` prevents new captures and marks validates as keyActive: false
- [ ] `SignatureMeanings` exports 6 constants
- [ ] Guard wrapper resolves `SignatureServicePort` only when `hasSignature` is in the policy tree
- [ ] Guard inspection events include `guard.signature.capture`, `guard.signature.validate`, `guard.reauthenticate`
- [ ] Counter-signing policy (`allOf` with multiple `hasSignature`) captures signatures sequentially with independent re-authentication
- [ ] Counter-signing enforces distinct `signerRole` values for separation of duties
- [ ] Multi-signature `allOf` capture order is deterministic (depth-first, left-to-right policy tree traversal) (G2)
- [ ] GxP SignatureService enforces minimum key sizes at adapter construction (RSA 2048, ECDSA P-256, HMAC 256-bit)
- [ ] When `gxp: true`, constant-time comparison used for signature validation (`validate()`)
- [ ] When `gxp: true`, constant-time comparison used for `ReauthenticationToken` comparison
- [ ] `ElectronicSignature.signerName` populated during capture; GxP rejects empty `signerName`
- [ ] `capture()` rejects same-signer within single evaluation (separation of duties enforcement)
- [ ] When `gxp: true`, `enforceSeparation: false` produces `ConfigurationError`
- [ ] Key compromise response: immediate revocation within 1 hour, notification, forensic analysis

**Conformance Suite (§13-testing.md):**

- [ ] `createSignatureServiceConformanceSuite()` registers 15 test cases (10 core + 5 GxP)
- [ ] Conformance suite validates all 10 core behavioral invariants of `SignatureService`
- [ ] Conformance suite validates all 5 GxP cryptographic requirements when `gxpMode: true`
- [ ] `MemorySignatureService` passes `createSignatureServiceConformanceSuite()` (10 core tests) in CI
- [ ] GxP adapter authors required to pass conformance suite with `gxpMode: true` and include as OQ evidence
- [ ] Constant-time timing tests (tests 11-12) use statistical analysis over 1000 iterations with 5% threshold
- [ ] Conformance suite `factory` parameter creates fresh adapter per test case (no shared state)
- [ ] Conformance suite `cleanup` parameter invoked after each test case for resource teardown

---

## DoD 16: Validation Tooling

**Spec Sections:** 17 (section 67e) | **Roadmap Item:** Cross-cutting

### Requirements

- `runIQ()` checks package version, dependencies, TypeScript version, lint
- `runOQ()` runs the full test suite, reports pass/fail counts
- `runPQ()` runs performance qualification including configurable soak test (PQ-1 through PQ-9)
- `generateTraceabilityMatrix()` produces the 72-row regulatory mapping
- All return structured result types (`IQResult`, `OQResult`, `PQResult`, `TraceabilityMatrix`)
- Package: `@hex-di/guard-validation` (separate from core guard)

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 23    | runIQ checks (version, deps, TS compiler, lint, vulnerabilities), runOQ checks (test execution, pass/fail reporting), runPQ checks (latency measurement, throughput, memory stability), traceability matrix generation (row count, column structure, regulatory mapping), checkPreDeploymentCompliance PDC-01 (retention policy ref), checkPreDeploymentCompliance PDC-02 (change control ref), checkPreDeploymentCompliance PDC-03 (training records ref), checkPreDeploymentCompliance PDC-04 (inspector access ref), checkPreDeploymentCompliance PDC-05 (periodic review schedule), checkPreDeploymentCompliance PDC-06 (SBOM ref), checkPreDeploymentCompliance PDC-07 (backup/DR ref), checkPreDeploymentCompliance PDC-08 (risk-based review frequency) |
| Integration tests | 12    | End-to-end IQ run, end-to-end OQ run, end-to-end PQ run (short soak), traceability output format, IQ failure scenarios, OQ failure scenarios, PQ failure scenarios, traceability completeness, combined IQ+OQ+PQ flow, report timestamp verification, checkPreDeploymentCompliance full pass (all 8 items), checkPreDeploymentCompliance mixed pass/fail scenarios                                                                                                                                                                                                                                                                                                                                                                                             |

### Verification

- [ ] `runIQ()` returns `IQResult` with `checks` array, `passed` boolean, and `summary` string
- [ ] `runIQ()` checks package version matches expected
- [ ] `runIQ()` checks all peer dependencies are installed
- [ ] `runIQ()` checks TypeScript compiler version meets minimum
- [ ] `runIQ()` checks ESLint configuration is present and valid
- [ ] `runOQ()` returns `OQResult` with `checks` array, `passed` boolean, `testCount`, `failedCount`, and `summary`
- [ ] `runOQ()` executes the full test suite programmatically
- [ ] `runPQ()` returns `PQResult` with `checks` array, `passed` boolean, `summary`, `soakDurationMs`, and `peakMemoryDeltaPercent`
- [ ] `runPQ()` accepts configurable `soakDurationMs`, `concurrentScopes`, and `entriesPerScope`
- [ ] `runPQ()` defaults to 4-hour soak when `gxp: true` on the guard graph (R3)
- [ ] `runPQ()` executes PQ-1 through PQ-9 checks
- [ ] `generateTraceabilityMatrix()` produces 72-row regulatory mapping
- [ ] Each `QualificationCheck` has `id`, `category`, `description`, `status`, `detail`, `durationMs`
- [ ] Package exports all types: `QualificationCheck`, `IQResult`, `OQResult`, `PQResult`, `TraceabilityMatrix`, `PreDeploymentComplianceItem`, `PreDeploymentComplianceReport`, `PreDeploymentComplianceConfig`
- [ ] `checkPreDeploymentCompliance()` returns `PreDeploymentComplianceReport` with `items` array, `compliant` boolean, and `summary` counts
- [ ] `checkPreDeploymentCompliance()` validates all 8 artifact references (PDC-01 through PDC-08)
- [ ] `checkPreDeploymentCompliance()` reports "fail" for missing required artifacts
- [ ] `checkPreDeploymentCompliance()` reports "pass" when all artifacts are referenced

---

## DoD 17: Port Gate Hook

**Spec Sections:** 29-30 | **Roadmap Item:** 7 (subsystem)

### Requirements

- `createPortGateHook(config: PortGateConfig): ResolutionHook` factory
- `PortGateConfig`: `Record<string, PortGateRule>` (readonly)
- `PortGateRule` union: `{ action: "deny"; reason: string } | { action: "allow" }`
- `PortGatedError` with code `"PORT_GATED"`, portName, reason
- O(1) map lookup; undefined rules = implicit allow
- Feature flag and environment-gating patterns
- Combined usage with `guard()`: hook at step 2, guard at step 3
- No AuditEntry produced, no subject resolution
- GxP warning in JSDoc: port gate hook is not suitable as sole GxP authorization mechanism

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests        | 14    | createPortGateHook factory, PortGateConfig validation, deny rule returns PortGatedError, allow rule passes through, undefined rule implicit allow, O(1) lookup verification, frozen config, PortGatedError code/portName/reason fields, empty config (all ports allowed), multiple rules in single config, reason string propagation, hook shape compliance, checkGxPReadiness item 13 detects gate-hook-only port (fail when gxp:true), checkGxPReadiness item 13 passes when port has both gate hook and guard() |
| Type tests        | 3     | PortGateConfig type, PortGateRule discriminated union, PortGatedError type narrowing                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Integration tests | 5     | Hook in container resolution pipeline, combined guard() + port gate hook ordering, feature flag toggling at runtime, environment-gating pattern (dev vs prod), multiple hooks with port gate as first                                                                                                                                                                                                                                                                                                              |

### Verification

- [ ] `createPortGateHook` returns a valid `ResolutionHook`
- [ ] Deny rule returns `PortGatedError` with code `"PORT_GATED"`
- [ ] `PortGatedError` includes `portName` and `reason` fields
- [ ] Allow rule permits resolution to proceed
- [ ] Undefined rule (port not in config) implicitly allows resolution
- [ ] Config is treated as readonly (frozen)
- [ ] O(1) map lookup (not iterating all rules)
- [ ] Combined with `guard()`: hook fires at step 2, guard evaluates at step 3
- [ ] No `AuditEntry` produced by port gate hook
- [ ] No subject resolution triggered by port gate hook
- [ ] GxP warning present in JSDoc
- [ ] Feature flag pattern: config swap without container rebuild
- [ ] `checkGxPReadiness()` item 13: detects ports with PortGateHook-only (no `guard()`) and emits fail
- [ ] `checkGxPReadiness()` item 13: passes when port has both gate hook and `guard()`

---

## DoD 18: Cross-Library Integration

**Spec Sections:** 34-37 | **Roadmap Item:** Cross-cutting

### Requirements

**Logger Integration (§34):**

- `instrumentGuard(container, { logger })` adds guard event logging
- `guard.allow` and `guard.deny` structured log entries with evaluationId, portName, subjectId, durationMs
- Logger is an optional dependency — guard operates without it

**Tracing Integration (§35):**

- `createGuardTracingBridge(tracer)` factory returns a tracing bridge
- Span with 7 `hex-di.guard.*` attributes: `hex-di.guard.policy`, `hex-di.guard.decision`, `hex-di.guard.evaluationId`, `hex-di.guard.portName`, `hex-di.guard.subjectId`, `hex-di.guard.durationMs`, `hex-di.guard.reason`
- `evaluationId` on span for audit correlation
- Bridge pattern: guard does not depend on tracing directly

**Query/Store Integration (§36):**

- `guard()` on query/store adapters enforces policy before data access
- `createGuardedStateAdapter` applies per-action guards to state operations
- Subject scope flows through query/store resolution chain

**Saga/Flow Integration (§37):**

- Guarded saga steps with compensation on denial
- `createGuardContext(subject)` creates a guard evaluation context for saga steps
- Flow transition gating: guard evaluation before state transitions
- Signature preservation in cross-library AuditEntry forwarding

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 10    | instrumentGuard setup, structured log entry shape (allow/deny), tracing bridge factory, span attribute population (7 attributes), evaluationId correlation, createGuardContext factory, guardedStateAdapter creation, logger optional dependency check, bridge pattern isolation, signature forwarding shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Integration tests | 20    | Logger + guard end-to-end (allow/deny log entries), tracing + guard span lifecycle, tracing bridge evaluationId matches audit, query adapter guarded resolution, store adapter per-action guard, subject scope propagation through query, subject scope propagation through store, saga step denial with compensation, saga guard context creation, flow transition gating, combined logger + tracing + guard, cross-library AuditEntry signature preservation, guard without logger operates normally, guard without tracing operates normally, guardedStateAdapter denies unauthorized action, guardedStateAdapter allows authorized action, saga multi-step guard evaluation, flow guard + audit trail integration, concurrent cross-library guard evaluations, cross-library evaluationId consistency |

### Verification

**Logger (§34):**

- [ ] `instrumentGuard(container, { logger })` registers guard event listeners
- [ ] `guard.allow` log entry includes evaluationId, portName, subjectId, durationMs
- [ ] `guard.deny` log entry includes evaluationId, portName, subjectId, durationMs, reason
- [ ] Guard operates normally when logger is not provided

**Tracing (§35):**

- [ ] `createGuardTracingBridge(tracer)` returns a valid bridge object
- [ ] Guard evaluation creates a span with all 7 `hex-di.guard.*` attributes
- [ ] Span `evaluationId` matches the `Decision.evaluationId`
- [ ] Span status reflects allow/deny outcome
- [ ] Guard operates normally when tracing bridge is not provided

**Query/Store (§36):**

- [ ] `guard()` on query adapter evaluates policy before query execution
- [ ] `createGuardedStateAdapter` evaluates per-action policy
- [ ] Subject scope propagates through query/store resolution chain
- [ ] Denial prevents data access (query not executed, state not mutated)

**Saga/Flow (§37):**

- [ ] Guarded saga step triggers compensation on denial
- [ ] `createGuardContext(subject)` returns valid evaluation context
- [ ] Flow transition gating prevents unauthorized state transitions
- [ ] Cross-library AuditEntry forwarding preserves original signature fields

---

## DoD 19: Testing Infrastructure

**Spec Sections:** 45-52 (excl. MemoryAuditTrail/conformance suite covered in DoD 13) | **Roadmap Item:** Cross-cutting

### Requirements

**Memory Adapters (§45):**

- `createMemoryPolicyEngine` for in-memory policy evaluation in tests
- `createStaticSubjectProvider` returns a fixed subject for all scopes
- `createCyclingSubjectProvider` cycles through a list of subjects per scope

**Custom Matchers (§46):**

- `setupGuardMatchers()` registers Vitest custom matchers
- `toAllow(subject)` asserts a policy allows the given subject
- `toDeny(subject)` asserts a policy denies the given subject
- `toDenyWith(subject, reason)` asserts denial with specific reason
- `toHaveEvaluated(count)` asserts evaluation count on a mock audit trail
- Vitest type augmentation for `expect(...).toAllow(...)` etc.

**Subject Fixtures (§47):**

- `createTestSubject(overrides?)` creates a subject with sensible defaults
- `resetSubjectCounter()` resets the internal counter for deterministic IDs
- Pre-built permission sets, roles, and subjects for common test scenarios

**Fluent Utilities (§48):**

- `testPolicy(policy).against(subject).expectAllow()` — pure policy evaluation
- `testPolicy(policy).against(subject).expectDeny(reason?)` — pure policy evaluation
- `testGuard(adapter).withSubject(subject).resolve(method?).expectAllow()` — method policy resolution
- `testGuard(adapter).withSubject(subject).resolve(method?).expectDeny(reason?)` — method policy resolution

**Anti-Patterns (§49):**

- 9 documented anti-patterns with explanations and correct alternatives
- Documentation only — no runtime code

**Policy Change Testing (§50):**

- `createPolicyDiffReport(before, after, subjects)` computes policy differences
- `PolicyDiffReport` type with `entries: PolicyDiffEntry[]`, `summary: string`
- `PolicyDiffEntry` type with `subject`, `permission`, `before: Decision`, `after: Decision`, `changed: boolean`

**GxP Test Data (§51):**

- REQUIREMENT: Test data factories must use synthetic data only (no production data)
- REQUIREMENT: Test audit entries must be distinguishable from production entries (e.g., `testMode: true` flag)

### Test Counts

| Category   | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests | 37    | createMemoryPolicyEngine evaluation, createStaticSubjectProvider returns fixed subject, createCyclingSubjectProvider cycles subjects, setupGuardMatchers registration, toAllow matcher (pass/fail), toDeny matcher (pass/fail), toDenyWith matcher (pass/fail/wrong reason), toHaveEvaluated matcher, createTestSubject defaults, createTestSubject with overrides, resetSubjectCounter determinism, pre-built permission sets, pre-built roles, testPolicy fluent allow, testPolicy fluent deny, testGuard fluent allow, testGuard fluent deny, testGuard with method policy, createPolicyDiffReport no changes, createPolicyDiffReport with changes, PolicyDiffReport summary, synthetic test data factories, test audit entry testMode flag, GxP test data distinguishability, policy diff entry structure, security: concurrent eval + subject mutation (frozen), security: TOCTOU permission revocation, security: concurrent audit writes monotonic sequence, security: ReauthToken replay rejection, security: AuditEntry duplicate evaluationId rejection, security: signature replay binding check, security: rogue adapter audit visibility, security: NoopAuditTrail swap rejection (gxp), security: guard bypass via direct resolution, security: oversized subjectId rejection, security: unicode normalization distinct subjects, security: deeply nested policy depth limit |
| Type tests | 5     | Vitest matcher type augmentation compiles, PolicyDiffReport type structure, PolicyDiffEntry type structure, testPolicy fluent chain types, testGuard fluent chain types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Verification

**Memory Adapters (§45):**

- [ ] `createMemoryPolicyEngine` evaluates policies in-memory
- [ ] `createStaticSubjectProvider` returns same subject for every scope
- [ ] `createCyclingSubjectProvider` returns subjects in round-robin order

**Custom Matchers (§46):**

- [ ] `setupGuardMatchers()` registers all 4 matchers with Vitest
- [ ] `toAllow(subject)` passes when policy allows subject
- [ ] `toAllow(subject)` fails with descriptive message when policy denies
- [ ] `toDeny(subject)` passes when policy denies subject
- [ ] `toDenyWith(subject, reason)` passes when denial reason matches
- [ ] `toHaveEvaluated(count)` passes when audit trail has expected count
- [ ] Vitest type augmentation compiles: `expect(policy).toAllow(subject)`

**Subject Fixtures (§47):**

- [ ] `createTestSubject()` returns subject with default permissions, roles, id
- [ ] `createTestSubject({ permissions })` overrides default permissions
- [ ] `resetSubjectCounter()` resets ID counter for deterministic test output
- [ ] Pre-built subjects include admin, reader, anonymous archetypes

**Fluent Utilities (§48):**

- [ ] `testPolicy(p).against(s).expectAllow()` passes for allowed subject
- [ ] `testPolicy(p).against(s).expectDeny()` passes for denied subject
- [ ] `testPolicy(p).against(s).expectDeny(reason)` checks reason string
- [ ] `testGuard(a).withSubject(s).resolve().expectAllow()` tests adapter-level policy
- [ ] `testGuard(a).withSubject(s).resolve(method).expectDeny()` tests method-level policy

**Anti-Patterns (§49):**

- [ ] 9 anti-patterns documented with problem description and correct alternative

**Policy Change Testing (§50):**

- [ ] `createPolicyDiffReport` detects added permissions
- [ ] `createPolicyDiffReport` detects removed permissions
- [ ] `createPolicyDiffReport` detects unchanged permissions
- [ ] `PolicyDiffReport.summary` describes changes in human-readable form

**GxP Test Data (§51):**

- [ ] Test data factories produce synthetic data only
- [ ] Test audit entries include `testMode: true` flag
- [ ] Test entries are distinguishable from production entries

**Security Tests (§52):**

- [ ] Race condition: frozen subject rejects mutation during evaluation
- [ ] Race condition: concurrent audit writes produce monotonic sequenceNumbers
- [ ] Replay: consumed ReauthenticationToken rejected on second use
- [ ] Replay: duplicate evaluationId rejected by audit trail
- [ ] Replay: copied signature fails binding integrity validation
- [ ] DI manipulation: NoopAuditTrail rejected at type and runtime in GxP mode
- [ ] DI manipulation: guarded port not resolvable without guard wrapper
- [ ] Input validation: oversized subjectId rejected by AuditTrail.record()
- [ ] Input validation: deeply nested policy returns PolicyEvaluationError at depth limit

## DoD 23: Meta-Audit Logging

**Spec Sections:** 12 (Meta-Audit Trail) | **Roadmap Item:** GxP Compliance (Audit Trail Access Logging)

### Requirements

- `MetaAuditEntry` type with `_tag`, `metaAuditId`, `timestamp`, `actorId`, `accessType`, `description`, `entryCount`, `simulated`, `scope` fields
- `MetaAuditTrailPort` outbound port with `recordAccess()` method
- Simulations via A2A `guard.explain-decision` skill logged with `simulated: true`
- MCP/A2A endpoints require authentication when `gxp: true`
- Meta-audit entries recorded for all audit trail queries, exports, and verifications

### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests        | ~8    | MetaAuditEntry construction, recordAccess success/failure, simulated flag propagation, accessType validation, MCP endpoint auth check, A2A endpoint auth check, unauthenticated request rejection, meta-audit entry for chain verification |
| Type tests        | ~3    | MetaAuditEntry discriminant, MetaAuditTrailPort interface, simulated field required                                                                                                                                                        |
| Integration tests | ~4    | Query audit trail produces meta-audit entry, export audit trail produces meta-audit entry, A2A simulation produces meta-audit entry with simulated: true, MCP endpoint rejects unauthenticated access in GxP mode                          |

**Total: ~15 tests**

### Verification

- [ ] `MetaAuditEntry` type defined in 12-inspection.md and 14-api-reference.md
- [ ] `MetaAuditTrailPort.recordAccess()` follows append-only contract
- [ ] A2A `guard.explain-decision` simulations produce meta-audit entry with `simulated: true`
- [ ] MCP tool endpoints reject unauthenticated access when `gxp: true`
- [ ] A2A skill endpoints reject unauthenticated access when `gxp: true`
- [ ] Audit trail queries produce meta-audit entries with `accessType: "query"`
- [ ] Audit trail exports produce meta-audit entries with `accessType: "export"`
- [ ] Chain verification produces meta-audit entry with `accessType: "verify_chain"`
- [ ] Inspector MCP access produces meta-audit entries (digital inspector access procedure, if provided) (G5)

---

## DoD 24: System Decommissioning

**Spec Sections:** 15 (Appendices) | **Roadmap Item:** GxP Compliance (Lifecycle Management)

### Requirements

- System decommissioning checklist documented in 15-appendices.md
- Audit trail archival procedure: export, verify chain integrity, store in long-term archive
- Chain verification before archival (confirm no gaps, no integrity violations)
- Retention period enforcement (audit entries MUST be retained for the regulatory minimum)
- Decommissioning event recorded as final audit entry

### Test Counts

| Category          | Count | Description                                                                                                                                                              |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests        | ~5    | Archival export with chain verification, retention period check, decommissioning audit entry creation, chain gap detection before archival, archival manifest generation |
| Type tests        | ~2    | Decommissioning checklist type, archival manifest type                                                                                                                   |
| Integration tests | ~3    | End-to-end decommissioning workflow, archival export round-trip (export + re-import + verify), chain verification failure blocks archival                                |

**Total: ~10 tests**

### Verification

- [ ] Decommissioning checklist documented in 15-appendices.md
- [ ] Audit trail can be exported with full chain integrity verification
- [ ] Chain gaps or integrity violations block archival with diagnostic error
- [ ] Decommissioning event recorded as final audit entry in the chain
- [ ] Archived audit trail can be re-imported and chain verified
- [ ] Retention period documented per regulatory framework
- [ ] Periodic archive readability verification procedure documented (at least annual verification throughout retention period) (G3)

---

## Test Count Summary

| DoD Item                      | Unit    | Type   | Integration | Total   |
| ----------------------------- | ------- | ------ | ----------- | ------- |
| 1: Permission Tokens          | 15      | 8      | --          | 23      |
| 2: Role Tokens                | 20      | 10     | --          | 30      |
| 3: Policy Data Types          | 28      | 14     | --          | 42      |
| 4: Policy Combinators         | 15      | 5      | --          | 20      |
| 5: Policy Evaluator           | 44      | --     | --          | 44      |
| 6: Subject Port               | 27      | --     | --          | 27      |
| 7: Guard Adapter              | 57      | 10     | 34          | 101     |
| 8: Policy Serialization       | 34      | --     | --          | 34      |
| 9: React SubjectProvider      | 10      | --     | --          | 10      |
| 10: React Can/Cannot          | 25      | --     | --          | 25      |
| 11: React Hooks               | 28      | --     | --          | 28      |
| 12: DevTools Integration      | 12      | --     | --          | 12      |
| 13: GxP Compliance            | 78      | --     | 23          | 101     |
| 14: Vision Integration        | --      | 4      | --          | 4       |
| 15: Electronic Signatures     | 32      | 5      | 14          | 66      |
| 16: Validation Tooling        | 23      | --     | 12          | 35      |
| 17: Port Gate Hook            | 14      | 3      | 5           | 22      |
| 18: Cross-Library Integration | 10      | --     | 20          | 30      |
| 19: Testing Infrastructure    | 37      | 5      | --          | 42      |
| 23: Meta-Audit Logging        | 8       | 3      | 4           | 15      |
| 24: System Decommissioning    | 5       | 2      | 3           | 10      |
| **Total**                     | **539** | **69** | **113**     | **727** |

---

## Code Coverage Thresholds

```
REQUIREMENT: GxP-critical code paths MUST meet the following minimum code coverage
             thresholds, measured by the project's coverage tooling (e.g., c8/istanbul
             via vitest --coverage). These thresholds apply to production code only
             (test files, test utilities, and type-test files are excluded).

             Branch coverage >= 95% for:
             - Policy evaluator (05-policy-evaluator.md)
             - Guard wrapper (07-guard-adapter.md, createGuardedPort)
             - Audit trail recording (AuditTrail.record path in guard wrapper)
             - Hash chain computation (integrityHash, previousHash, validateChain)
             - Electronic signature capture and validate (SignatureService)

             Line coverage >= 90% for:
             - All other production code in @hex-di/guard

             Mutation score >= 95% for GxP-critical code paths:
             - Hash chain computation (integrityHash, previousHash, validateChain)
             - WAL recovery (orphan detection, intent replay, crash recovery)
             - Electronic signature verification (SignatureService.validate, capture)
             - Chain break detection and quarantine logic
             - Re-authentication token validation (constant-time comparison)

             Mutation score >= 85% for non-GxP-critical code paths:
             - Policy combinators (allOf, anyOf, not, hasSignature)
             - Permission and role resolution (Set.has, role inheritance)
             - Serialization (serializePolicy, deserializePolicy)

             Coverage reports MUST be generated as part of CI and archived alongside
             test results. Coverage regressions below these thresholds MUST block
             merge and be treated as test deficiencies requiring remediation.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.
```

---

## Verification Checklist

### Code Quality

- [ ] All public API functions have JSDoc with `@param`, `@returns`, and `@example`
- [ ] All exported types have JSDoc descriptions
- [ ] All error codes (ACL001-ACL025) have corresponding error classes
- [ ] All factory functions return frozen objects
- [ ] All branded tokens use `Symbol.for()` for cross-realm compatibility
- [ ] No `any` types in production code
- [ ] No type casts (`as`) in production code
- [ ] No `eslint-disable` comments in production code
- [ ] No non-null assertions (`!`) in production code
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm test` passes with zero failures
- [ ] `pnpm test:types` passes with zero failures
- [ ] All public APIs listed in 14-api-reference.md are exported from package entry points
- [ ] Error code allocation table (ACL001-ACL025) complete and consistent with error class implementations

### GxP Compliance (17-gxp-compliance.md)

- [ ] `AuditEntry` includes all required fields: evaluationId, timestamp, subjectId, authenticationMethod, policy, decision, portName, scopeId, reason, durationMs
- [ ] `AuditEntry.reason` is empty string (not undefined) for Allow decisions
- [ ] `AuditEntry.timestamp` uses ISO 8601 UTC format
- [ ] `AuditTrail.record()` is called for every guard evaluation (both allow and deny)
- [ ] Audit recording happens BEFORE the allow/deny action in the guard wrapper
- [ ] `NoopAuditTrail` has GxP warning in JSDoc
- [ ] `createGuardGraph()` requires explicit `auditTrailAdapter` argument (no default)
- [ ] `ClockSource` interface has JSDoc mentioning NTP requirement for production
- [ ] `ElectronicSignature` type defined with all six fields (signerId, signedAt, meaning, value, algorithm, reauthenticated)
- [ ] Hash chain integrity is verifiable via `MemoryAuditTrail.validateChain()`
- [ ] `SignatureServicePort` is optional (only required for `hasSignature` policies)
- [ ] `SignatureService.capture()` rejects expired/missing `ReauthenticationToken`
- [ ] `SignatureService.validate()` checks crypto integrity, binding integrity, and key status
- [ ] `SignatureService.reauthenticate()` enforces two-component identification
- [ ] Key management behavioral contracts documented in 17-gxp-compliance/07-electronic-signatures.md section 65c
- [ ] `SignatureMeanings` constants defined (AUTHORED, REVIEWED, APPROVED, VERIFIED, REJECTED)
- [ ] `GxPAuditEntry` type defined with non-optional `integrityHash`, `previousHash`, `signature`
- [ ] `failOnAuditError` option documented and implemented in `createGuardGraph()`
- [ ] ADR #26 (GxPAuditEntry subtype rationale) documented in 15-appendices.md
- [ ] ADR #27 (failOnAuditError default-false rationale) documented in 15-appendices.md
- [ ] Counter-signing workflow documented with code example in 17-gxp-compliance/07-electronic-signatures.md section 65d
- [ ] Dual-timing strategy documented in 17-gxp-compliance/03-clock-synchronization.md section 62
- [ ] `sequenceNumber` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- [ ] ADR #30 (per-scope chains with monotonic sequence numbers) documented in 15-appendices.md
- [ ] Concurrent write ordering documented in 17-gxp-compliance/02-audit-trail-contract.md section 61.4a
- [ ] Hash chain computation uses pipe-delimited `join("|")` in all code examples (07 and 17)
- [ ] Validation Plan (IQ/OQ/PQ) documented in 17-gxp-compliance/09-validation-plan.md section 67
- [ ] FMEA risk assessment with 31 failure modes (FM-01 through FM-31) in 17-gxp-compliance/10-risk-assessment.md section 68
- [ ] All FMEA failure modes with RPN >= 15 mitigated to residual RPN <= 10
- [ ] FMEA risk summary counts: High=15, Medium=14, Low=2 pre-mitigation; High=0, Medium=0, Low=31 post-mitigation (total 31)
- [ ] Regulatory traceability matrix (72 rows) in 17-gxp-compliance/11-traceability-matrix.md section 69
- [ ] `failOnAuditError` default is `true` in all references (07, 17)
- [ ] `ReauthenticationToken` security requirements documented (CSPRNG, one-time-use, no plaintext storage/transmission, replay protection)
- [ ] `policySnapshot` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- [ ] `traceDigest` format documented with examples (policyLabel[verdict] pattern)
- [ ] Policy change control process documented in 17-gxp-compliance/06-administrative-controls.md section 64a
- [ ] Separation of duties elevated to REQUIREMENT in section 65 (same-signer rejection per evaluationId)
- [ ] Jurisdiction-specific retention periods table in section 63
- [ ] HMAC non-repudiation note in section 65c
- [ ] GxP compliance warnings in 12-inspection.md (ring buffer, MCP audit, A2A audit-review)
- [ ] GxP compliance warning in 11-react-integration.md (React gates are UI-only)
- [ ] GxP suitability note in 08-port-gate-hook.md (not suitable as sole GxP authorization)
- [ ] `gxp: true` forces `failOnAuditError: true` — compile-time error if false + gxp:true (07-guard-adapter.md)
- [ ] `gxp: true` rejects `NoopAuditTrail` at compile time (ACL012) and runtime (07-guard-adapter.md)
- [ ] `gxp: true` requires `walStore` — compile-time error if omitted (07-guard-adapter.md)
- [ ] `AuditEntry` field size limits table with max lengths documented (07-guard-adapter.md)
- [ ] `hashAlgorithm` field on `AuditEntry` (optional) and `GxPAuditEntry` (required) — synced across 07, 14, 17
- [ ] `signerName` field on `ElectronicSignature` (optional) — synced across 07, 14
- [ ] Business continuity plan elevated from RECOMMENDED to REQUIREMENT (17-gxp-compliance/02-audit-trail-contract.md §61)
- [ ] MCP/A2A meta-audit elevated from RECOMMENDED to REQUIREMENT for GxP (12-inspection.md, 17-gxp-compliance/05-audit-trail-review.md §64)
- [ ] Incident classification matrix elevated from RECOMMENDED to REQUIREMENT (17-gxp-compliance/10-risk-assessment.md §68)
- [ ] Open-source supplier qualification guidance in Appendix G (15-appendices.md) with ADR #34
- [ ] Chain break response timing SLA documented (1h alert, 4h quarantine, 24h report) in 17-gxp-compliance/02-audit-trail-contract.md §61
- [ ] GxP test data: synthetic factories only, no production data in test suites (§51)
- [ ] GxP test data: test audit entries distinguishable from production entries via `testMode` flag (§51)
- [ ] Port gate hook GxP warning in JSDoc: not suitable as sole GxP authorization mechanism (§30)
- [ ] Cross-library AuditEntry forwarding preserves original signature fields (§37)
- [ ] Branch coverage >= 95% for GxP-critical code paths (policy evaluator, guard wrapper, audit trail recording, hash chain, electronic signatures)
- [ ] Line coverage >= 90% for all other production code in @hex-di/guard
- [ ] Mutation score >= 85% for policy combinators, permission/role resolution, serialization
- [ ] Coverage reports generated in CI and archived alongside test results
- [ ] AuditEntry field size enforcement: `reason` truncated to 2048 chars with "…[truncated]" suffix and WARNING log
- [ ] AuditEntry field size enforcement: non-reason string fields exceeding maximum return `Err(AuditTrailWriteError)`
- [ ] `GxPAuditEntry` used as strict subtype constraint for GxP audit trail adapter implementations (compile-time)
- [ ] GxP mode rejects `ElectronicSignature` with missing or empty `signerName` via `AuditTrailWriteError` (ACL008)
- [ ] When `gxp: true`, `SignatureService.validate()` uses constant-time comparison (REQUIREMENT per §65b-1)
- [ ] When `gxp: true`, `ReauthenticationToken` comparison uses constant-time comparison (REQUIREMENT per §65b-1)
- [ ] When `gxp: true`, guard evaluation uses constant-time padding to normalize duration (REQUIREMENT per §65b-1, GCR-2026-001)
- [ ] Constant-time evaluation duration ceiling documented in validation plan and calibrated during PQ

### Operational Log Schema (Appendix R)

- [ ] All guard operational events conform to `GuardOperationalEvent` base schema (Appendix R)
- [ ] All operational events include `_tag`, `timestamp`, `severity`, `source`, `category` fields
- [ ] `GuardOperationalEventTag` discriminated union covers all 13 event types
- [ ] Rate limiting events emit `RateLimitActivatedEvent` and `RateLimitSummaryEvent`
- [ ] Scope expiry events emit `ScopeExpiredEvent` with `elapsedMs` and `maxLifetimeMs`
- [ ] Clock drift events emit `ClockDriftWarningEvent` with `driftMs` and `thresholdMs`
- [ ] Audit write failure events emit `AuditWriteFailureEvent` with `errorCode` and `evaluationId`
- [ ] WAL recovery events emit `WalRecoveryStartedEvent`, `WalOrphanDetectedEvent`, `WalRecoveryCompletedEvent`
- [ ] Field truncation events emit `FieldTruncatedEvent` with `originalLength` and `truncatedLength`
- [ ] CEF mapping documented for SIEM integration (Appendix R)

### Implementation Verification (Appendix T)

- [ ] Test files use `@spec-ref` annotations linking tests to spec sections
- [ ] CI includes spec-conformance stage verifying: conformance suites, coverage thresholds, @spec-ref resolution
- [ ] All REQUIREMENT blocks have at least one corresponding OQ test case
- [ ] Spec modification in CI flags test files with matching @spec-ref annotations for re-review
- [ ] Conformance report artifact generated with timestamp and commit SHA

### Document Control (GxP)

- [ ] All spec files carry document control headers (Document ID, Revision, Effective Date, Author, Reviewer, Approved By, Classification, Change History)
- [ ] Document IDs follow GUARD-NN convention (GUARD-01 through GUARD-17, GUARD-17-01 through GUARD-17-12)
- [ ] Approved By fields reference valid role titles from the Approval Authority Matrix (README.md)
- [ ] Classifications match the Document Classification Taxonomy (README.md)
- [ ] Revision management script (scripts/spec-revision.ts) automates revision bumping, date updates, and change history appending
- [ ] CI includes spec-revision-check stage validating header consistency (7 checks per Appendix T)
- [ ] Change History is append-only; prior entries never modified or removed
- [ ] Machine-readable spec-section index (spec/guard/section-index.json) exists and is validated in CI

### Vision Alignment (01-overview.md section 5)

- [ ] `GuardInspector` implements `LibraryInspector` protocol
- [ ] Guard events (guard.evaluate, guard.allow, guard.deny) flow to the central nerve cluster
- [ ] MCP resources have defined response schemas (12-inspection.md section 44c)
- [ ] A2A skills have defined input/output schemas (12-inspection.md section 44d)
- [ ] Guard snapshot appears in the unified DevTools snapshot under the `"guard"` key

---

## Mutation Testing Strategy

Mutation testing ensures that the test suite catches regressions. The guard library's mutation testing follows the same approach as `@hex-di/runtime`:

### Key Mutation Targets

1. **Policy evaluation logic**: Swap `allOf` to `anyOf`, `not` to identity, `allow` to `deny`
2. **Permission comparison**: Change `Set.has()` to always-true or always-false
3. **Role inheritance**: Skip parent roles, skip deduplication, skip cycle detection
4. **Serialization**: Omit fields, swap kind names, skip validation
5. **React hooks**: Return wrong state (always true, always false, wrong discriminated union status, suspend when shouldn't, fail to suspend when should)
6. **Port gate hook**: Swap deny→allow, remove undefined-rule early return (implicit allow becomes explicit deny), always-deny regardless of config
7. **Cross-library bridges**: Remove evaluationId from span, skip logger context fields, omit span status on deny, drop signature forwarding in cross-library AuditEntry
8. **Constant-time padding** (GxP): Remove padding, set ceiling to 0, bypass padding for deny path, bypass padding for allow path
9. **Operational log events**: Omit `_tag`, emit wrong `category`, skip event emission, wrong severity level

### Expected Mutation Kill Rate

| Category           | Target Kill Rate |
| ------------------ | ---------------- |
| Core evaluation    | 100%             |
| Combinators        | 100%             |
| Hash chain         | >= 95%           |
| WAL recovery       | >= 95%           |
| Signature verify   | >= 95%           |
| Chain break logic  | >= 95%           |
| Serialization      | >= 95%           |
| React components   | >= 90%           |
| Cross-library      | >= 90%           |
| Inspector/DevTools | >= 85%           |
| Port gate hook     | 100%             |
| Constant-time pad  | >= 95%           |
| Operational events | >= 90%           |

> **GxP Elevation:** The >= 95% thresholds for hash chain, WAL recovery, signature verification, and chain break logic reflect the heightened integrity requirements for GxP-critical code paths. A surviving mutation in these paths could mask a data integrity vulnerability that goes undetected until regulatory audit. These thresholds align with the serialization threshold and are mandated when `gxp: true`. Reference: GAMP 5 Category 5, 21 CFR 11.10(a).

### Security Testing Considerations

```
REQUIREMENT: When gxp: true, evaluation timing MUST be resistant to timing attacks.
             The guard wrapper MUST NOT return faster for "deny" than for "allow"
             when the timing difference could reveal information about the
             subject's permission set. Implementations MUST add constant-time
             padding to normalize evaluation duration to a configurable ceiling.
             The duration ceiling MUST be documented in the validation plan and
             calibrated during PQ (17-gxp-compliance/09-validation-plan.md section 67c).
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.

RECOMMENDED: In non-GxP environments, evaluation timing resistance remains
             RECOMMENDED. Organizations SHOULD implement constant-time padding
             if the existence or absence of specific permissions constitutes
             sensitive information.

REQUIREMENT: When gxp: true, electronic signature comparison in
             SignatureService.validate() MUST use constant-time comparison
             (e.g., crypto.timingSafeEqual) to prevent timing-based signature
             forgery attacks.
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.

RECOMMENDED: In non-GxP environments, constant-time signature comparison
             remains RECOMMENDED.

REQUIREMENT: When gxp: true, ReauthenticationToken comparison MUST use
             constant-time comparison to prevent timing-based token guessing
             attacks.
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.

RECOMMENDED: In non-GxP environments, constant-time token comparison
             remains RECOMMENDED.
```

> **GxP Elevation:** When `gxp: true`, ALL three security mitigations above (evaluation timing, signature comparison, and token comparison) are elevated to REQUIREMENT. Evaluation timing resistance is now REQUIRED in GxP mode (upgraded from RECOMMENDED per GxP compliance review finding GCR-2026-001). See 17-gxp-compliance/07-electronic-signatures.md section 65b-1 for the full rationale and regulatory references.

> **Non-GxP Deployments:** In non-GxP environments, all three mitigations remain RECOMMENDED. Organizations that choose not to implement constant-time padding SHOULD document this decision in their risk assessment.

### Surviving Mutations

Acceptable surviving mutations:

- Timing precision (microsecond vs millisecond)
- Log message formatting details
- DevTools event ordering within the same timestamp

---

_Previous: [15 - Appendices](./15-appendices.md) | Next: [17 - GxP Compliance Guide](./17-gxp-compliance.md)_
