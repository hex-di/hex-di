# 16 - Definition of Done

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-16                                 |
| Revision         | 2.2                                      |
| Effective Date   | 2026-02-21                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Verification Specification           |
| DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
| Change History   | 2.2 (2026-02-21): DoD 5 add §86 (evaluateBatch renumbered from §74); DoD 21 04(§71)→04(§71,§84,§85) (hasResourceAttribute §72→§84, withLabel §73→§85 resolved collisions) (CCR-GUARD-045) |
|                  | 2.1 (2026-02-20): Fixed DoD 9 §41→§38, DoD 10 §42-45→§39, DoD 11 §43-45→§40-42,73, DoD 21 14(§71)→04(§71) — all stale from pre-renumbering of react sections (CCR-GUARD-045) |
|                  | 2.0 (2026-02-20): Revised all DoD sections — removed Test Counts blocks, added Files references, converted Verification checklists to numbered test tables with type annotations, added mutation score targets (CCR-GUARD-002) |
|                  | 1.0 (2026-02-13): Initial controlled release — DoD 1–29 covering all features in scope (CCR-GUARD-001) |
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
- `PermissionRegistry` interface with `register()` and `getAll()` methods for centralized permission catalog
- Registry required for IQ/OQ qualification in GxP environments (permission enumeration)


**Files:** `libs/guard/tests/unit/permission-types.test.ts`, `libs/guard/tests/permission-types.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `createPermission` returns frozen object with brand | unit |
| 2 | `createPermissionGroup` array overload returns frozen map with correct typed entries | unit |
| 3 | `createPermissionGroup` object overload returns frozen map with correct typed entries | unit |
| 4 | `createPermissionGroup` object overload preserves `PermissionOptions` metadata | unit |
| 5 | `isPermission` returns `true` for branded tokens, `false` for plain objects and strings | unit |
| 6 | Phantom types prevent assigning `Permission<"user", "read">` to `Permission<"user", "write">` | type |
| 7 | Duplicate permission warning emitted for same resource:action pair | unit |
| 8 | `PermissionRegistry.register()` adds permission to centralized catalog | unit |
| 9 | `PermissionRegistry.getAll()` returns all registered permissions as frozen array | unit |
| 10 | `PermissionRegistry.getAll()` returns empty array when no permissions registered | unit |
| 11 | Registry is idempotent: duplicate `register()` calls do not create duplicate entries | unit |

**Target: ≥90% mutation score.**

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
- `MutuallyExclusiveRoles` constraint with `_tag`, `roles`, and `reason` for separation of duties (SoD) enforcement
- `validateSoDConstraints(subject, constraints)` validates that a subject does not hold conflicting roles
- GxP RECOMMENDED: define `MutuallyExclusiveRoles` for roles with different authorization levels


**Files:** `libs/guard/tests/unit/role-types.test.ts`, `libs/guard/tests/role-types.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `createRole` returns frozen object with brand | unit |
| 2 | `flattenPermissions` returns all transitive permissions for linear chain | unit |
| 3 | `flattenPermissions` returns all transitive permissions for DAG (diamond inheritance) | unit |
| 4 | `flattenPermissions` returns `Err` for circular inheritance | unit |
| 5 | Deduplicated permission set (no duplicates in flattened result) | unit |
| 6 | Type-level `ValidateRoleInheritance` detects cycles | type |
| 7 | `MutuallyExclusiveRoles` interface has `_tag`, `roles`, and `reason` fields | unit |
| 8 | `MutuallyExclusiveRoles` object is frozen | unit |
| 9 | `validateSoDConstraints(subject, constraints)` returns empty array when no conflicts | unit |
| 10 | `validateSoDConstraints(subject, constraints)` returns conflict list when subject holds mutually exclusive roles | unit |
| 11 | `validateSoDConstraints` reports the `reason` from the violated constraint | unit |

**Target: ≥90% mutation score.**

---

## DoD 3: Policy Data Types

**Spec Sections:** 13-17 | **Roadmap Item:** 3

### Requirements

- `Policy` discriminated union with 10 variants
- Each variant has a literal `kind` discriminant
- `PolicyKind` literal union type
- All policy objects are frozen (Object.freeze)
- `PolicyConstraint` accepts any Policy variant
- Exhaustive switch/case on `kind` is compile-time checked
- `hashPolicy(policy)` produces deterministic SHA-256 content hash via canonical JSON serialization (sorted keys)
- `hashPolicy` is collision-resistant: structurally different policies produce different hashes


**Files:** `libs/guard/tests/unit/policy-types.test.ts`, `libs/guard/tests/policy-types.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Each policy variant has correct `kind` literal | unit |
| 2 | All policy objects are frozen | unit |
| 3 | TypeScript exhaustive check compiles for all 10 kinds (including `hasSignature`, `hasResourceAttribute`, `hasRelationship`, `labeled`) | type |
| 4 | Policy is a proper discriminated union (switch/case narrows type) | unit |
| 5 | `InferPolicyRequirements` extracts permissions and roles from composite policies | type |
| 6 | `hashPolicy(policy)` returns deterministic SHA-256 hex string | unit |
| 7 | `hashPolicy()` produces identical output for structurally equal policies created independently | unit |
| 8 | `hashPolicy()` produces different output for policies differing in any field (kind, permission, role, matcher, children) | unit |
| 9 | `hashPolicy()` uses canonical JSON serialization (sorted keys) before hashing | unit |
| 10 | `hashPolicy()` handles composite policies recursively (allOf, anyOf, not with nested children) | unit |

**Target: ≥90% mutation score.**

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


**Files:** `libs/guard/tests/unit/policy-combinators.test.ts`, `libs/guard/tests/policy-combinators.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Each combinator returns correct policy variant | unit |
| 2 | Combinators compose to arbitrary depth | unit |
| 3 | Empty `allOf()` and `anyOf()` handle edge cases | unit |
| 4 | `not()` wraps exactly one policy | unit |
| 5 | All returned objects are frozen | unit |

**Target: ≥90% mutation score.**

---

## DoD 5: Policy Evaluator

**Spec Sections:** 18-21, 86 | **Roadmap Item:** 5

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


**Files:** `libs/guard/tests/unit/policy-evaluator.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `hasPermission` allows when subject has permission, denies otherwise | unit |
| 2 | `hasRole` allows when subject has role, denies otherwise | unit |
| 3 | `hasAttribute` evaluates matcher against resource attribute | unit |
| 4 | `hasSignature` denies when no signatures in context (empty or missing array) | unit |
| 5 | `hasSignature` finds matching signature via `signatures.find(s => s.meaning === meaning)` | unit |
| 6 | `hasSignature` denies when no signature with required meaning found in array | unit |
| 7 | `hasSignature` denies when signer lacks required role | unit |
| 8 | `hasSignature` denies when signature not validated | unit |
| 9 | `hasSignature` allows when matching signature found with correct meaning, role, and validation | unit |
| 10 | `hasSignature` works with multi-signature arrays (maker-checker: two different meanings both present) | unit |
| 11 | `hasSignature` deny reason is context-aware ("No signatures provided" vs "No signature with meaning X found in N provided signature(s)") | unit |
| 12 | `allOf` denies on first failing child, includes all evaluated children in trace | unit |
| 13 | `anyOf` allows on first passing child, includes all evaluated children in trace | unit |
| 14 | `not` inverts verdict | unit |
| 15 | Decision includes accurate reason string | unit |
| 16 | Trace tree structure matches policy tree structure | unit |
| 17 | Duration is measured in milliseconds (durationMs via performance.now()) | unit |
| 18 | Decision includes evaluationId (UUID v4) for audit correlation | unit |
| 19 | Decision includes evaluatedAt (ISO 8601) timestamp | unit |
| 20 | Decision includes subjectId matching the evaluated subject | unit |
| 21 | `hasPermission` with `fields` produces Allow with `visibleFields` set | unit |
| 22 | `hasAttribute` with `fields` produces Allow with `visibleFields` set when matcher passes | unit |
| 23 | `fieldMatch` matcher evaluates correctly against resource attribute | unit |
| 24 | `allOf` intersects `visibleFields` across all allowing children (least privilege) | unit |
| 25 | `anyOf` propagates first-allowing child's `visibleFields` directly | unit |
| 26 | `intersectVisibleFields` treats `undefined` as identity element (universal set) | unit |
| 27 | `intersectVisibleFields` returns `undefined` when no children have field restrictions | unit |
| 28 | Empty `visibleFields` set means complete field-level denial (no fields visible) | unit |
| 29 | Temporal authorization: `hasAttribute` with `gte`/`lt` matchers on hour-of-day attribute allows within bounds | unit |
| 30 | Temporal authorization: `hasAttribute` with `gte`/`lt` matchers on hour-of-day attribute denies outside bounds | unit |
| 31 | Temporal authorization: `hasAttribute` with day-of-week matcher allows on matching days | unit |
| 32 | Temporal authorization: `hasAttribute` with day-of-week matcher denies on non-matching days | unit |

**Target: 100% mutation score.**

---

## DoD 6: Subject Port

**Spec Sections:** 22-24 | **Roadmap Item:** 6

### Requirements

- `SubjectProviderPort` is a well-known outbound port with scoped lifetime
- `createSubjectAdapter(factory)` creates an adapter providing SubjectProviderPort
- Subject resolved once per scope and cached (immutable within scope)
- `PrecomputedSubject` includes flattened permission set for O(1) lookups


**Files:** `libs/guard/tests/unit/subject.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `SubjectProviderPort` has correct name, direction, and category | unit |
| 2 | `createSubjectAdapter` returns valid adapter with scoped lifetime | unit |
| 3 | Subject is resolved once per scope (factory called once per scope) | unit |
| 4 | Precomputed permission set is a `ReadonlySet<string>` | unit |
| 5 | Precomputed set matches `flattenPermissions` result | unit |
| 6 | AuthSubject includes authenticationMethod field | unit |
| 7 | AuthSubject includes authenticatedAt field (ISO 8601) | unit |
| 8 | createTestSubject provides default authenticationMethod and authenticatedAt | unit |
| 9 | `createSubjectProviderConformanceSuite` runs 12 conformance tests against adapter | conformance |
| 10 | Conformance suite validates subject structure, immutability, and idempotency | conformance |
| 11 | Attribute sanitization REQUIRED when `gxp: true` (1024 char max, control character replacement with U+FFFD) (R2) | unit |

**Target: ≥90% mutation score.**

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


**Files:** `libs/guard/tests/unit/guard-adapter.test.ts`, `libs/guard/tests/guard-adapter.test-d.ts`, `libs/guard/tests/integration/guard-adapter.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `guard()` preserves the inner adapter's provides port | unit |
| 2 | `guard()` adds `SubjectProviderPort` to requires | unit |
| 3 | `guard()` deduplicates if `SubjectProviderPort` already in requires | unit |
| 4 | Resolution denied when subject lacks permissions | unit |
| 5 | Resolution allowed when subject has permissions | unit |
| 6 | Method-level policies override adapter-level policy | unit |
| 7 | `AccessDeniedError` carries the Decision | unit |
| 8 | Different scopes get different subjects | unit |
| 9 | guard() adapter requires AuditTrailPort in its requires tuple | unit |
| 10 | Every guard evaluation (allow and deny) records to AuditTrailPort | unit |
| 11 | NoopAuditTrail adapter discards entries without error | unit |
| 12 | AuditEntry includes evaluationId matching the Decision | unit |
| 13 | MemoryAuditTrail has validateAuditEntry() and assertAllEntriesValid() methods | unit |
| 14 | AuditTrail.record() returns Result<void, AuditTrailWriteError> | unit |
| 15 | NoopAuditTrail.record() returns ok(undefined) | unit |
| 16 | Guard wrapper logs warning on audit write failure but does not block resolution | unit |
| 17 | AuditEntry has optional `integrityHash`, `previousHash`, and `signature` fields | unit |
| 18 | ElectronicSignature type defined with signerId, signedAt, meaning, value, algorithm | unit |
| 19 | Non-regulated AuditTrail adapters omit integrity/signature fields without error | unit |
| 20 | createGuardGraph() requires auditTrailAdapter (not optional) | unit |
| 21 | createNoopAuditTrailAdapter() factory exists for explicit opt-in | unit |
| 22 | NoopAuditTrail has GxP warning in JSDoc | unit |
| 23 | `SignatureServicePort` defined as optional outbound port (category: compliance) | unit |
| 24 | `createGuardGraph()` accepts optional `signatureAdapter` parameter | unit |
| 25 | NoopSignatureService returns Err for all operations with GxP warning | unit |
| 26 | Guard wrapper resolves SignatureServicePort only when hasSignature is in policy tree | unit |
| 27 | `failOnAuditError: true` (default) causes AuditTrailWriteError (ACL008) to throw on audit write failure | unit |
| 28 | `failOnAuditError: false` (explicit opt-in) logs warning on audit write failure without blocking resolution | unit |
| 29 | `GxPAuditEntry` interface extends `AuditEntry` with non-optional `integrityHash`, `previousHash`, `signature` | unit |
| 30 | Guard wrapper captures signatures sequentially (one per distinct meaning) for multi-signature policies | unit |
| 31 | Each signature capture in a multi-signature flow triggers independent re-authentication | unit |
| 32 | `FieldMaskContextPort` registered in scope when Allow decision carries `visibleFields` | unit |
| 33 | `FieldMaskContext.visibleFields` matches the Allow decision's `visibleFields` | unit |
| 34 | `FieldMaskContext.evaluationId` matches the Allow decision's `evaluationId` | unit |
| 35 | `FieldMaskContextPort` NOT registered when Allow decision has no `visibleFields` | unit |
| 36 | AuditEntry field size: `reason` exceeding 2048 chars truncated with "…[truncated]" suffix and WARNING log | unit |
| 37 | AuditEntry field size: non-reason fields exceeding max length return `Err(AuditTrailWriteError)` | unit |
| 38 | `GxPAuditEntry` strict subtype enforced at compile time for GxP audit trail adapters | unit |
| 39 | `ElectronicSignature.signerName` populated during capture; GxP rejects empty signerName (ACL008) | unit |
| 40 | Scope expiry: `ScopeExpiredError` (ACL013) returned when scope exceeds `maxScopeLifetimeMs` | unit |
| 41 | Scope expiry: no audit entry recorded for expired scope evaluations | unit |
| 42 | Scope expiry: WARNING log emitted with scopeId, elapsedMs, maxLifetimeMs | unit |
| 43 | Scope expiry: `maxScopeLifetimeMs` REQUIRED when `gxp: true` (type error and runtime ConfigurationError) | unit |
| 44 | Rate limiting: `RateLimitExceededError` (ACL015) returned when rate exceeded | unit |
| 45 | Rate limiting: no audit entry recorded for rate-limited evaluations | unit |
| 46 | Rate limiting: WARNING log emitted on rate limit activation | unit |

**Target: ≥95% mutation score.**

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


**Files:** `libs/guard/tests/unit/serialization.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Each policy kind serializes to correct JSON shape | unit |
| 2 | Composite policies serialize children recursively | unit |
| 3 | Deserialization validates kind discriminant | unit |
| 4 | Deserialization returns `Err` for unknown kinds, missing fields, malformed JSON | unit |
| 5 | Round-trip produces structurally equal policies | unit |
| 6 | `explainPolicy` produces correct output for allow and deny | unit |
| 7 | `explainPolicy` handles composite policies with nested explanations | unit |
| 8 | `serializeAuditEntry` produces deterministic JSON (alphabetical key order) | unit |
| 9 | `deserializeAuditEntry` validates all required fields | unit |
| 10 | `deserializeAuditEntry` rejects unknown schemaVersion with `AuditEntryParseError` (ACL014) | unit |
| 11 | Audit entry serialize/deserialize round-trip produces structurally equal entries | unit |
| 12 | `createAuditExportManifest` computes SHA-256 checksum over export content | unit |
| 13 | Export manifest includes correct entryCount, scopeIds, hashAlgorithms | unit |
| 14 | Export manifest `chainIntegrityVerified` reflects `verifyAuditChain()` result | unit |

**Target: ≥95% mutation score.**

---

## DoD 9: React SubjectProvider

**Spec Section:** 38 | **Roadmap Item:** 9

### Requirements

- `SubjectProvider` component accepts `subject: AuthSubject | null`
- `null` means subject not loaded (loading state)
- Creates React context (not DI scope)
- SSR: must be present in server render tree
- `MissingSubjectProviderError` thrown when hooks used outside provider


**Files:** `libs/guard/tests/unit/react-subject-provider.test.tsx`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Children can access subject via context | unit |
| 2 | `null` subject propagates as loading state | unit |
| 3 | No DI scope created | integration |
| 4 | Hooks throw `MissingSubjectProviderError` when provider missing | unit |
| 5 | SSR: no client-only APIs used | unit |
| 6 | SubjectProvider calls Object.freeze() on non-null subjects before storing in context | unit |
| 7 | Frozen subjects cause TypeError on mutation in strict mode | unit |

**Target: ≥90% mutation score.**

---

## DoD 10: React Can/Cannot

**Spec Sections:** 39 | **Roadmap Item:** 10

### Requirements

- `<Can permission={p}>` renders children when subject has permission
- `<Cannot permission={p}>` renders children when subject lacks permission
- Both accept `policy` prop for complex policies
- `fallback` prop is exclusively for the **denied** case, not loading
- `<Can>` and `<Cannot>` **suspend** when subject is null (Suspense protocol)
- Loading UI is handled by `<Suspense>` boundaries, not by `fallback`


**Files:** `libs/guard/tests/unit/react-can-cannot.test.tsx`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `<Can>` renders children when subject has permission | unit |
| 2 | `<Can>` renders fallback when subject lacks permission | unit |
| 3 | `<Can>` suspends when subject is null (throws pending promise) | unit |
| 4 | `<Cannot>` renders children when subject lacks permission | unit |
| 5 | `<Cannot>` renders fallback when subject has permission | unit |
| 6 | `<Cannot>` suspends when subject is null (throws pending promise) | unit |
| 7 | Policy prop evaluates complex policies | unit |
| 8 | `<Suspense>` boundary renders its fallback during suspension | unit |
| 9 | `fallback` prop is not rendered during loading (only on denial) | unit |

**Target: ≥90% mutation score.**

---

## DoD 11: React Hooks

**Spec Sections:** 40-42, 73 | **Roadmap Item:** 11

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

- `createGuardHooks()` returns 11 members: `SubjectProvider`, `Can`, `Cannot`, `useCan`, `usePolicy`, `useSubject`, `useCanDeferred`, `usePolicyDeferred`, `useSubjectDeferred`, `usePolicies`, `usePoliciesDeferred`
- Memoization: `useCan`/`useCanDeferred` is O(1) via precomputed set
- `usePolicies` evaluates a named map of policies and returns `PoliciesDecisions<M>` (suspending)
- `usePoliciesDeferred` evaluates a named map of policies and returns `PoliciesResult<M>` (non-suspending)


**Files:** `libs/guard/tests/unit/react-hooks.test.tsx`

| #  | Test Description | Type |
| --- | --- | --- |

**Suspense hooks:**

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `useCan` suspends when subject is null (throws pending promise) | unit |
| 2 | `useCan` returns `true` when subject has permission | unit |
| 3 | `useCan` returns `false` when subject lacks permission | unit |
| 4 | `usePolicy` suspends when subject is null | unit |
| 5 | `usePolicy` returns full Decision object when subject is loaded | unit |
| 6 | `useSubject` suspends when subject is null | unit |
| 7 | `useSubject` returns AuthSubject when subject is loaded | unit |

**Deferred hooks:**

| #  | Test Description | Type |
| --- | --- | --- |
| 8 | `useCanDeferred` returns `{ status: "pending" }` when subject is null | unit |
| 9 | `useCanDeferred` returns `{ status: "allowed" }` when subject has permission | unit |
| 10 | `useCanDeferred` returns `{ status: "denied", reason }` when subject lacks permission | unit |
| 11 | `usePolicyDeferred` returns `{ status: "pending" }` when subject is null | unit |
| 12 | `usePolicyDeferred` returns `{ status: "resolved", decision }` when subject is loaded | unit |
| 13 | `useSubjectDeferred` returns `null` when subject is null | unit |
| 14 | `useSubjectDeferred` returns `AuthSubject` when subject is loaded | unit |

**Factory and isolation:**

| #  | Test Description | Type |
| --- | --- | --- |
| 15 | `createGuardHooks` returns object with 11 members | unit |
| 16 | Multiple `createGuardHooks` instances are independent | unit |
| 17 | Default exports include all 8 hooks + `CanResult` and `PolicyResult` types | unit |
| 18 | `usePolicies` suspends when subject is null (throws pending promise) | unit |
| 19 | `usePolicies` returns `PoliciesDecisions<M>` with one Decision per key when subject is loaded | unit |
| 20 | `usePoliciesDeferred` returns `{ status: "pending" }` when subject is null | unit |
| 21 | `usePoliciesDeferred` returns `{ status: "resolved", decisions: PoliciesDecisions<M> }` when subject is loaded | unit |
| 22 | `usePolicies` memoizes by subject identity + policies map reference + enricher + resource | unit |

**Target: ≥90% mutation score.**

---

## DoD 12: DevTools Integration

**Spec Sections:** 47-48 | **Roadmap Item:** 12

### Requirements

- `GuardInspector` implements `LibraryInspector` protocol
- Emits events: `guard.evaluate`, `guard.allow`, `guard.deny`
- Snapshot includes: active policies, recent decisions (ring buffer), permission statistics
- Events appear in unified DevTools snapshot


**Files:** `libs/guard/tests/unit/devtools.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Inspector emits `guard.evaluate` at start of evaluation | unit |
| 2 | Inspector emits `guard.allow` or `guard.deny` at end | unit |
| 3 | Snapshot includes active policies map | unit |
| 4 | Recent decisions ring buffer respects max size | unit |
| 5 | Permission stats aggregate correctly (per-port, per-subject) | unit |
| 6 | `clear()` resets all state | unit |
| 7 | GuardLibraryInspectorPort defined with category "library-inspector" | unit |
| 8 | createGuardLibraryInspector() bridge function follows established pattern | unit |
| 9 | GuardLibraryInspectorAdapter is a frozen singleton | unit |
| 10 | Auto-discovery works: container's afterResolve hook registers the inspector | integration |
| 11 | MCP resource URIs documented: hexdi://guard/snapshot, /policies, /decisions, /stats, /audit | unit |
| 12 | A2A skills documented: guard.inspect-policies, guard.audit-review, guard.explain-decision | unit |
| 13 | When `gxp: true`, MCP resource invocations (`hexdi://guard/audit`, `/decisions`, `/stats`) recorded in meta-audit log | unit |
| 14 | Meta-audit entries include requestor identity, timestamp, resource accessed, query parameters, result summary | unit |
| 15 | When `gxp: true`, A2A `guard.audit-review` invocations recorded in meta-audit log | unit |
| 16 | Meta-audit log maintains own tamper-evident hash chain (`sequenceNumber`, `integrityHash`, `previousHash`) | unit |
| 17 | `checkGxPReadiness()` warns when `maxRecentDecisions` < 200 in GxP environments (R4) | unit |

**Target: ≥90% mutation score.**

---

## DoD 13: GxP Compliance

**Spec Sections:** 17 (sections 59-69) | **Roadmap Item:** Cross-cutting

### Requirements

- Complete `AuditEntry` construction from `Decision` with all 10 required fields
- `traceDigest` compact string summarizing the evaluation trace tree
- `MemoryAuditTrail` with hash chain verification (`validateEntry`, `validateChain`, `assertAllEntriesValid`, `query`)
- SHA-256 integrity hash computation covering all 10 required `AuditEntry` fields + `schemaVersion` + `sequenceNumber` + `traceDigest` + `policySnapshot` ([ADR #29](decisions/029-hash-chain-all-fields.md), #30)
- Genesis entry uses empty string as `previousHash`
- `ClockSource` interface with NTP requirement for production
- `sequenceNumber` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- Per-scope concurrent chain support with monotonic sequence numbers (section 61.4a, [ADR #30](decisions/030-per-scope-chains-sequence-numbers.md))
- Validation Plan (IQ/OQ/PQ) documented (section 67)
- FMEA risk assessment with 36 failure modes (31 core + 5 ecosystem extension) and 39 STRIDE threats (section 68)
- Regulatory traceability matrix with 76 rows across 7 frameworks (section 69)
- `createAuditTrailConformanceSuite()` in `@hex-di/guard-testing` with 17 test cases (section 13)
- `createGuardHealthCheck()` for runtime canary evaluation (section behaviors/06-guard-adapter.md)
- Scope disposal hook: when `gxp: true`, scope disposal MUST invoke `verifyAuditChain()` on the scope's audit entries before releasing scope resources (section 61)
- Circuit breaker pattern for audit trail backend: CLOSED → OPEN (after threshold failures) → HALF-OPEN (after recovery timeout) → CLOSED (on success) (section 61.9)
- Multi-tenant audit trail isolation: each tenant's audit trail data logically or physically isolated (section 64)
- Temporal authorization GxP ceiling: `maxScopeLifetimeMs` aligned to temporal policy granularity (section 16 in behaviors/03-policy-types.md)


**Files:** `libs/guard/tests/unit/gxp-audit-trail.test.ts`, `libs/guard/tests/unit/gxp-clock.test.ts`, `libs/guard/tests/unit/gxp-completeness.test.ts`, `libs/guard/tests/integration/gxp-compliance.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `AuditEntry` includes all 10 required fields for Allow decisions | unit |
| 2 | `AuditEntry` includes all 10 required fields for Deny decisions | unit |
| 3 | `AuditEntry.reason` is empty string (not undefined) for Allow decisions | unit |
| 4 | Audit recording happens BEFORE the allow/deny action in the guard wrapper | unit |
| 5 | AuditTrail write failure throws AuditTrailWriteError when `failOnAuditError` is `true` (default) | unit |
| 6 | AuditTrail write failure logs warning but does not block resolution when `failOnAuditError` is `false` (explicit opt-in) | unit |
| 7 | Hash chain integrity validates after 100 sequential evaluations | unit |
| 8 | Hash chain covers all 10 required fields + schemaVersion + sequenceNumber + traceDigest + policySnapshot ([ADR #29](decisions/029-hash-chain-all-fields.md), #30) | unit |
| 9 | NoopAuditTrail discards entries without error | unit |
| 10 | `SystemClock` produces ISO 8601 UTC format | unit |
| 11 | Injectable clock produces deterministic timestamps | unit |
| 12 | `sequenceNumber` is monotonically increasing within a scope | unit |
| 13 | Gap detection: missing sequence number detectable in O(1) | unit |
| 14 | Concurrent scope chains: 10 scopes x 100 entries each validate independently | unit |
| 15 | Per-scope chain verification: `verifyAuditChain(entries.filter(e => e.scopeId === scope))` passes | unit |
| 16 | IQ checklist items are verifiable via automated tooling (IQ-1 through IQ-12) | unit |
| 17 | OQ checklist items map to existing test suite (1294 tests across 29 DoD items) | unit |
| 18 | PQ checklist items have measurable pass criteria | unit |
| 19 | FMEA covers all 36 failure modes with mitigations (FM-01 through FM-36, including 5 ecosystem extension FMs) | unit |
| 20 | All failure modes with pre-mitigation RPN >= 15 have residual RPN <= 10 | unit |
| 21 | Traceability matrix has 76 rows (19 FDA + 22 EU GMP + 9 ALCOA+ + 7 GAMP5 + 10 ICH/PIC/S + 3 WHO + 6 MHRA) | unit |
| 22 | AuditEntry.schemaVersion set to 1 on all new entries | unit |
| 23 | Hash chain computation includes String(entry.schemaVersion) in pipe-delimited field list | unit |
| 24 | Every traceability matrix row references a specific DoD item and test count | unit |
| 25 | [ADR #30](decisions/030-per-scope-chains-sequence-numbers.md) documented in appendices/ | unit |
| 26 | `createAuditTrailConformanceSuite()` runs 17 test cases against `MemoryAuditTrail` | conformance |
| 27 | Conformance suite validates append-only, atomic writes, completeness, hash chain, and no silent defaults | conformance |
| 28 | `createGuardHealthCheck()` returns `GuardHealthCheckResult` with policyEvaluationOk, auditTrailResponsive, chainIntegrityOk | unit |
| 29 | Health check canary evaluation produces a valid audit entry and verifies chain integrity | unit |
| 30 | `createCompletenessMonitor()` tracks per-port resolution vs audit entry counts | unit |
| 31 | `queryCompleteness(portName)` returns `{ resolutions, auditEntries, discrepancy }` | unit |
| 32 | `createCompletenessMonitor()` REQUIRED when `gxp: true` — mechanism deployed with health check integration (R1) | integration |
| 33 | UTF-8 BOM in CSV exports when non-ASCII audit trail content present (G1) | unit |

**Reference Adapter Validation (§61, §behaviors/12-testing.md):**

| #  | Test Description | Type |
| --- | --- | --- |
| 34 | `MemoryAuditTrail` passes `createAuditTrailConformanceSuite()` in CI on every commit | conformance |
| 35 | `BufferedAuditTrailExample` passes `createAuditTrailConformanceSuite()` in CI on every commit | conformance |
| 36 | `DurableAuditTrailExample` passes `createAuditTrailConformanceSuite()` in CI on every commit | conformance |
| 37 | `@hex-di/guard-sqlite` passes `createAuditTrailConformanceSuite()` with `durabilityTier: "durable"` in CI | conformance |

**Policy Change Audit Entry (§64a-1):**

| #  | Test Description | Type |
| --- | --- | --- |
| 38 | `PolicyChangeAuditEntry` type defined with all required fields (\_tag, changeId, timestamp, actorId, portName, previousPolicyHash, newPolicyHash, reason, applied, changeRequestId, approverId, approvedAt) | unit |
| 39 | `GxPPolicyChangeAuditEntry` extends `PolicyChangeAuditEntry` with hash chain fields (sequenceNumber, integrityHash, previousHash, hashAlgorithm) | unit |
| 40 | `createPolicyChangeAuditEntry()` helper computes hashes via `hashPolicy()` and validates separation of duties | unit |
| 41 | `PolicyChangeAuditEntry` recorded before policy activation when `gxp: true` | unit |
| 42 | `PolicyChangeAuditEntry` participates in same hash chain as regular `AuditEntry` (no separate chain) | unit |
| 43 | `approverId` !== `actorId` enforced on `PolicyChangeAuditEntry` (separation of duties) | unit |
| 44 | `changeRequestId` MUST be non-empty when `gxp: true` | unit |
| 45 | `createTestPolicyChangeAuditEntry()` test helper in `@hex-di/guard-testing` with sensible defaults | unit |

**AdminGuard Conformance Suite (§behaviors/12-testing.md, §64a-64g):**

| #  | Test Description | Type |
| --- | --- | --- |
| 46 | `createAdminGuardConformanceSuite()` runs 14 test cases against AdminGuardConfig | conformance |
| 47 | Conformance suite validates deny-by-default, admin role authorization, policy change recording, admin activity monitoring, separation of duties, and emergency bypass | conformance |
| 48 | `createAdminGuardConformanceSuite()` runs in CI alongside AuditTrail, SignatureService, and SubjectProvider conformance suites | conformance |
| 49 | Conformance suite failures block merge | conformance |
| 50 | Conformance suite `cleanup` parameter invoked after each test case for resource teardown | conformance |

**Scope Disposal Chain Verification (§61):**

| #  | Test Description | Type |
| --- | --- | --- |
| 51 | When `gxp: true`, scope disposal invokes `verifyAuditChain()` on the scope's audit entries | unit |
| 52 | Scope disposal chain verification failure emits a structured diagnostic event (not a thrown error) to avoid blocking disposal | unit |
| 53 | When `gxp: false`, scope disposal does NOT invoke `verifyAuditChain()` (no performance penalty for non-GxP) | unit |
| 54 | Scope disposal chain verification is covered by OQ-6 (at least one disposal-triggered verification scenario) | unit |

**Clock & Timestamps (§62):**

| #  | Test Description | Type |
| --- | --- | --- |
| 55 | Clock drift exceeding 1 second triggers operational alert | unit |
| 56 | `Performance.now()` NOT used for audit-grade timestamps (only for `durationMs`) | unit |
| 57 | ClockSource verifies RTC availability when `gxp: true` (plausible range, monotonic advance, ConfigurationError ACL009 on failure) (G4) | unit |

**Data Retention (§63):**

| #  | Test Description | Type |
| --- | --- | --- |
| 58 | Minimum retention periods enforced: 1yr allow, 3yr deny, lifetime signatures, lifetime hash chains, 5yr policy snapshots | unit |
| 59 | GDPR pseudonymization: `AuditEntry.subjectId` uses pseudonymized identifier when GDPR applies | unit |

**AuditQueryPort (§12-inspection, §64e):**

| #  | Test Description | Type |
| --- | --- | --- |
| 60 | `queryByEvaluationId()` returns matching entry or undefined for unknown ID | unit |
| 61 | `queryBySubjectId()` returns filtered entries within optional time range | unit |
| 62 | `queryByTimeRange()` returns entries within specified range with optional decision filter | unit |
| 63 | `queryByPortName()` returns filtered entries within optional time range | unit |
| 64 | `exportEntries()` produces valid JSON Lines output with AuditExportManifest | unit |
| 65 | `exportEntries()` produces valid RFC 4180 CSV output with AuditExportManifest | unit |

**Audit Trail Review & Exports (§64):**

| #  | Test Description | Type |
| --- | --- | --- |
| 66 | Audit data exports self-contained with manifest (entry count, hash values, checksums, export timestamp) | unit |

**GxP Regression Test Evidence (§67b):**

| #  | Test Description | Type |
| --- | --- | --- |
| 67 | Every GxP compliance finding remediation includes an OQ regression test traceable to the original finding identifier | unit |
| 68 | GxP regression tests are permanently retained in the OQ suite and MUST NOT be removed during test maintenance | unit |

**Policy Change Control (§64a):**

| #  | Test Description | Type |
| --- | --- | --- |
| 69 | Policy changes require documented change request, impact analysis, approval by non-requestor | unit |
| 70 | Framework version upgrades, adapter changes, infrastructure migrations trigger full OQ re-run | unit |

**Administrative Activity Monitoring (§64b):**

| #  | Test Description | Type |
| --- | --- | --- |
| 71 | Runtime guard config changes logged as administrative events in append-only log | unit |

**Re-Authentication (§65b):**

| #  | Test Description | Type |
| --- | --- | --- |
| 72 | `reauthenticate()` enforces rate limiting (RECOMMENDED: 5 attempts in 15 minutes) | unit |
| 73 | Failed re-authentication logged with signerId, timestamp, reason | unit |
| 74 | First signature in continuous session requires full re-authentication | unit |

**Constant-Time Comparison (§65b-1):**

| #  | Test Description | Type |
| --- | --- | --- |
| 75 | When `gxp: true`, `SignatureService.validate()` uses constant-time comparison for signature values | unit |
| 76 | When `gxp: true`, `ReauthenticationToken` comparison uses constant-time comparison | unit |

**Key Management (§65c):**

| #  | Test Description | Type |
| --- | --- | --- |
| 77 | GxP SignatureService enforces minimum key sizes at construction (RSA 2048, ECDSA P-256, HMAC 256-bit) | unit |
| 78 | Keys below minimum thresholds rejected at adapter construction with `ConfigurationError` | unit |
| 79 | GxP environments using `hasSignature` for compliance evidence use asymmetric algorithms (RSA/ECDSA) | unit |
| 80 | Key compromise triggers immediate revocation (within 1 hour) and notification | unit |

**Signature Meanings (§65d):**

| #  | Test Description | Type |
| --- | --- | --- |
| 81 | Five standard `SignatureMeaning` values MUST NOT be redefined or overloaded | unit |
| 82 | `capture()` rejects same-signer duplicates within single evaluation (separation of duties) | unit |
| 83 | When `gxp: true`, `enforceSeparation: false` produces `ConfigurationError` | unit |

**Validation Plan (§67):**

| #  | Test Description | Type |
| --- | --- | --- |
| 84 | IQ includes 12 specific checks (IQ-1 through IQ-12) | unit |
| 85 | OQ includes 47 specific checks (OQ-1 through OQ-43, plus OQ-19a; OQ-50 through OQ-52 adverse conditions) with baseline test counts | unit |
| 86 | PQ includes 10 specific checks (PQ-1 through PQ-10) with latency/throughput thresholds | unit |

**Circuit Breaker (§61.9):**

| #  | Test Description | Type |
| --- | --- | --- |
| 87 | Circuit breaker transitions CLOSED → OPEN after configurable failure threshold (default: 5 consecutive failures) | unit |
| 88 | Circuit breaker blocks all audit writes during OPEN state and returns structured error | unit |
| 89 | Circuit breaker transitions OPEN → HALF-OPEN after recovery timeout (default: 30 seconds) | unit |
| 90 | Successful write in HALF-OPEN state transitions circuit breaker to CLOSED | unit |
| 91 | Failed write in HALF-OPEN state transitions circuit breaker back to OPEN | unit |
| 92 | Circuit breaker exposes `circuitBreakerState`, `consecutiveFailures`, `lastTripTimestamp`, `totalTrips` metrics | unit |
| 93 | Circuit breaker configuration (failure threshold, recovery timeout) is immutable after construction | unit |
| 94 | Circuit breaker state transitions recorded as operational log events | unit |

**Multi-Tenant Audit Trail Isolation (§64):**

| #  | Test Description | Type |
| --- | --- | --- |
| 95 | Multi-tenant deployments: audit trail queries scoped to tenant boundary | unit |
| 96 | Multi-tenant deployments: cross-tenant audit data not accessible via standard query methods (`queryBySubjectId`, `queryByTimeRange`, etc.) | unit |

**Temporal Authorization GxP Ceiling (§16 in behaviors/03-policy-types.md):**

| #  | Test Description | Type |
| --- | --- | --- |
| 97 | GxP: `maxScopeLifetimeMs` <= 3600000 (1 hour) when hour-of-day temporal policies are active | unit |
| 98 | GxP: `maxScopeLifetimeMs` <= 86400000 (24 hours) when day-of-week temporal policies are active | unit |
| 99 | GxP: `checkGxPReadiness()` warns when `maxScopeLifetimeMs` exceeds temporal policy granularity ceiling | unit |

**Target: ≥95% mutation score.**

---

## DoD 14: Vision Integration

**Spec Sections:** 01-overview.md section 5, behaviors/11-inspection.md sections 48c-48d | **Roadmap Item:** Cross-cutting

### Requirements

- MCP resource response types defined (`GuardSnapshotResponse`, `GuardPoliciesResponse`, etc.)
- A2A skill input/output types defined (`InspectPoliciesInput/Output`, `AuditReviewInput/Output`, etc.)
- `guard.explain-decision` A2A skill implementation
- Guard snapshot appears in unified DevTools snapshot under `"guard"` key


**Files:** `libs/guard/tests/vision-integration.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | MCP resource response types exported from `@hex-di/guard` | unit |
| 2 | A2A skill input/output types exported from `@hex-di/guard` | unit |
| 3 | `guard.explain-decision` produces correct explanation for Allow, Deny, and composite policies | unit |
| 4 | Guard snapshot appears under `"guard"` key in unified snapshot | unit |

**Target: ≥90% mutation score.**

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
- Key management behavioral contracts documented in compliance/gxp.md section 65c


**Files:** `libs/guard/tests/unit/signatures.test.ts`, `libs/guard/tests/unit/gxp-signatures.test.ts`, `libs/guard/tests/signatures.test-d.ts`, `libs/guard/tests/integration/signatures.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `SignatureService.capture()` returns `Result<ElectronicSignature, SignatureError>` | unit |
| 2 | `SignatureService.capture()` rejects expired `ReauthenticationToken` | unit |
| 3 | `SignatureService.capture()` populates `reauthenticated: true` on `ElectronicSignature` | unit |
| 4 | `SignatureService.validate()` checks crypto integrity, binding integrity, and key status | unit |
| 5 | `SignatureService.reauthenticate()` enforces two-component identification | unit |
| 6 | `ReauthenticationToken` has time-limited validity | unit |
| 7 | `hasSignature` policy denies when no signature in context | unit |
| 8 | `hasSignature` policy denies on meaning mismatch | unit |
| 9 | `hasSignature` policy denies when signer lacks required role | unit |
| 10 | `hasSignature` policy denies when signature not validated | unit |
| 11 | `hasSignature` policy allows when all conditions met | unit |
| 12 | `hasSignature` serializes/deserializes correctly | unit |
| 13 | `NoopSignatureService` returns Err for all operations with category "missing_service" | unit |
| 14 | `createMemorySignatureService()` generates real HMAC-SHA256 signatures | unit |
| 15 | `MemorySignatureService.revokeKey()` prevents new captures and marks validates as keyActive: false | unit |
| 16 | `SignatureMeanings` exports 6 constants | unit |
| 17 | Guard wrapper resolves `SignatureServicePort` only when `hasSignature` is in the policy tree | unit |
| 18 | Guard inspection events include `guard.signature.capture`, `guard.signature.validate`, `guard.reauthenticate` | unit |
| 19 | Counter-signing policy (`allOf` with multiple `hasSignature`) captures signatures sequentially with independent re-authentication | unit |
| 20 | Counter-signing enforces distinct `signerRole` values for separation of duties | unit |
| 21 | Multi-signature `allOf` capture order is deterministic (depth-first, left-to-right policy tree traversal) (G2) | unit |
| 22 | GxP SignatureService enforces minimum key sizes at adapter construction (RSA 2048, ECDSA P-256, HMAC 256-bit) | unit |
| 23 | When `gxp: true`, constant-time comparison used for signature validation (`validate()`) | unit |
| 24 | When `gxp: true`, constant-time comparison used for `ReauthenticationToken` comparison | unit |
| 25 | `ElectronicSignature.signerName` populated during capture; GxP rejects empty `signerName` | unit |
| 26 | `capture()` rejects same-signer within single evaluation (separation of duties enforcement) | unit |
| 27 | When `gxp: true`, `enforceSeparation: false` produces `ConfigurationError` | unit |
| 28 | Key compromise response: immediate revocation within 1 hour, notification, forensic analysis | unit |

**Conformance Suite (§behaviors/12-testing.md):**

| #  | Test Description | Type |
| --- | --- | --- |
| 29 | `createSignatureServiceConformanceSuite()` registers 15 test cases (10 core + 5 GxP) | conformance |
| 30 | Conformance suite validates all 10 core behavioral invariants of `SignatureService` | conformance |
| 31 | Conformance suite validates all 5 GxP cryptographic requirements when `gxpMode: true` | conformance |
| 32 | `MemorySignatureService` passes `createSignatureServiceConformanceSuite()` (10 core tests) in CI | conformance |
| 33 | GxP adapter authors required to pass conformance suite with `gxpMode: true` and include as OQ evidence | conformance |
| 34 | Constant-time timing tests (tests 11-12) use statistical analysis over 1000 iterations with 5% threshold | conformance |
| 35 | Conformance suite `factory` parameter creates fresh adapter per test case (no shared state) | conformance |
| 36 | Conformance suite `cleanup` parameter invoked after each test case for resource teardown | conformance |

**Certificate Lifecycle Management (§65c-3, REQ-GUARD-068):**

| #  | Test Description | Type |
| --- | --- | --- |
| 37 | Certificate lifecycle states: creation, active, pending renewal, expired, revoked | unit |
| 38 | Expired certificate blocks `capture()` with `SignatureError` (category: "expired_certificate") | unit |
| 39 | Revocation checking via CRL or OCSP (REQUIREMENT when `gxp: true`) | unit |
| 40 | Revocation check failure (CRL/OCSP unavailable): fail-secure, log WARNING, emit operational event | unit |
| 41 | Grace period for pending renewal configurable, maximum 72 hours | unit |
| 42 | Revoked certificate blocks both `capture()` and `validate()` with `SignatureError` (category: "revoked_key") | unit |
| 43 | Revocation reason, timestamp, and CRL/OCSP source recorded in audit trail | unit |

**Signature Algorithm Migration (§65c-4, REQ-GUARD-069):**

| #  | Test Description | Type |
| --- | --- | --- |
| 44 | Algorithm migration follows epoch-based approach: old entries retain original algorithm, new entries use new algorithm | unit |
| 45 | Dual-signing during transition period: entries signed with both old and new algorithms | unit |
| 46 | Post-transition: new entries signed exclusively with new algorithm | unit |
| 47 | `verifyAuditChain()` handles cross-epoch chains with different algorithms per epoch | unit |
| 48 | Epoch boundaries recorded in chain metadata (algorithm ID, start sequence, end sequence) | unit |
| 49 | Algorithm migration testing included in periodic OQ re-verification | unit |

**Target: ≥95% mutation score.**

---

## DoD 16: Validation Tooling

**Spec Sections:** 17 (section 67e) | **Roadmap Item:** Cross-cutting

### Requirements

- `runIQ()` checks package version, dependencies, TypeScript version, lint
- `runOQ()` runs the full test suite, reports pass/fail counts
- `runPQ()` runs performance qualification including configurable soak test (PQ-1 through PQ-10)
- `generateTraceabilityMatrix()` produces the 72-row regulatory mapping
- All return structured result types (`IQResult`, `OQResult`, `PQResult`, `TraceabilityMatrix`)
- Package: `@hex-di/guard-validation` (separate from core guard)


**Files:** `libs/guard/tests/unit/validation-tooling.test.ts`, `libs/guard/tests/integration/validation-tooling.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `runIQ()` returns `IQResult` with `checks` array, `passed` boolean, and `summary` string | unit |
| 2 | `runIQ()` checks package version matches expected | unit |
| 3 | `runIQ()` checks all peer dependencies are installed | unit |
| 4 | `runIQ()` checks TypeScript compiler version meets minimum | unit |
| 5 | `runIQ()` checks ESLint configuration is present and valid | unit |
| 6 | `runOQ()` returns `OQResult` with `checks` array, `passed` boolean, `testCount`, `failedCount`, and `summary` | unit |
| 7 | `runOQ()` executes the full test suite programmatically | unit |
| 8 | `runPQ()` returns `PQResult` with `checks` array, `passed` boolean, `summary`, `soakDurationMs`, and `peakMemoryDeltaPercent` | unit |
| 9 | `runPQ()` accepts configurable `soakDurationMs`, `concurrentScopes`, and `entriesPerScope` | unit |
| 10 | `runPQ()` defaults to 4-hour soak when `gxp: true` on the guard graph (R3) | unit |
| 11 | `runPQ()` executes PQ-1 through PQ-10 checks | unit |
| 12 | `generateTraceabilityMatrix()` produces 72-row regulatory mapping | unit |
| 13 | Each `QualificationCheck` has `id`, `category`, `description`, `status`, `detail`, `durationMs` | unit |
| 14 | Package exports all types: `QualificationCheck`, `IQResult`, `OQResult`, `PQResult`, `TraceabilityMatrix`, `PreDeploymentComplianceItem`, `PreDeploymentComplianceReport`, `PreDeploymentComplianceConfig` | unit |
| 15 | `checkPreDeploymentCompliance()` returns `PreDeploymentComplianceReport` with `items` array, `compliant` boolean, and `summary` counts | unit |
| 16 | `checkPreDeploymentCompliance()` validates all 8 artifact references (PDC-01 through PDC-08) | unit |
| 17 | `checkPreDeploymentCompliance()` reports "fail" for missing required artifacts | unit |
| 18 | `checkPreDeploymentCompliance()` reports "pass" when all artifacts are referenced | unit |
| 19 | `checkGxPReadiness()` verifies audit trail adapter reports encryption-at-rest capability when `gxp: true` | unit |

**Target: ≥90% mutation score.**

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


**Files:** `libs/guard/tests/unit/port-gate-hook.test.ts`, `libs/guard/tests/port-gate-hook.test-d.ts`, `libs/guard/tests/integration/port-gate-hook.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `createPortGateHook` returns a valid `ResolutionHook` | unit |
| 2 | Deny rule returns `PortGatedError` with code `"PORT_GATED"` | unit |
| 3 | `PortGatedError` includes `portName` and `reason` fields | unit |
| 4 | Allow rule permits resolution to proceed | unit |
| 5 | Undefined rule (port not in config) implicitly allows resolution | unit |
| 6 | Config is treated as readonly (frozen) | unit |
| 7 | O(1) map lookup (not iterating all rules) | unit |
| 8 | Combined with `guard()`: hook fires at step 2, guard evaluates at step 3 | unit |
| 9 | No `AuditEntry` produced by port gate hook | unit |
| 10 | No subject resolution triggered by port gate hook | unit |
| 11 | GxP warning present in JSDoc | unit |
| 12 | Feature flag pattern: config swap without container rebuild | integration |
| 13 | `checkGxPReadiness()` item 13: detects ports with PortGateHook-only (no `guard()`) and emits fail | unit |
| 14 | `checkGxPReadiness()` item 13: passes when port has both gate hook and `guard()` | unit |

**Target: ≥90% mutation score.**

---

## DoD 18: Guard Integration Contracts

**Spec Sections:** 37-40 | **Roadmap Item:** Cross-cutting

### Requirements

**Guard Event Emission (§37):**

- `GuardEventSinkPort` defines the outbound port for guard event emission
- `GuardEventSink` interface with `emit(event: GuardEvent)` method
- `GuardEvent` discriminated union: `GuardAllowEvent`, `GuardDenyEvent`, `GuardErrorEvent`
- `NoopGuardEventSink` default for testing and explicit silent mode
- `MemoryGuardEventSink` in `@hex-di/guard-testing` for integration tests
- Zero overhead when no adapter is registered (port presence check before emitting)
- GxP REQUIREMENT: `GuardErrorEvent` emitted for ACL008, ACL018, ACL009, ACL014

**Guard Span Emission (§38):**

- `GuardSpanSinkPort` defines the outbound port for guard span emission
- `GuardSpanSink` interface with `startSpan(name, attributes) → GuardSpanHandle`
- `GuardSpanHandle` interface with `end()`, `setError(message)`, `setAttribute(key, value)`
- `GuardSpanAttributes` interface with 7+ `hex-di.guard.*` attributes
- `MemoryGuardSpanSink` in `@hex-di/guard-testing` for integration tests
- Zero overhead when no adapter is registered
- `evaluationId` on span for audit-span correlation

**Guard Composition Patterns (§39):**

- `guard()` works with any adapter regardless of library origin
- `methodPolicies` is the canonical per-method authorization pattern
- Subject scope flows through DI scope hierarchy
- Child scope inherits guard configuration with correct subject isolation

**Consumer Integration Guidelines (§40):**

- Consumer Responsibility Matrix documents guard-owned vs consumer-owned concerns
- Guard exposes ports and contracts; consumers provide adapters
- Electronic signature preservation in cross-library audit entry forwarding


**Files:** `libs/guard/tests/unit/cross-library.test.ts`, `libs/guard/tests/integration/cross-library.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |

**Guard Event Emission (§37):**

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `GuardEventSinkPort` is a valid port definition | unit |
| 2 | `GuardEventSink.emit()` receives `GuardAllowEvent` after allow evaluation | unit |
| 3 | `GuardEventSink.emit()` receives `GuardDenyEvent` after deny evaluation | unit |
| 4 | `GuardErrorEvent` emitted for ACL008, ACL018, ACL009, ACL014 when `gxp: true` | unit |
| 5 | Event emission failure does not affect guard evaluation outcome | unit |
| 6 | Guard operates normally when no `GuardEventSinkPort` adapter is registered | unit |

**Guard Span Emission (§38):**

| #  | Test Description | Type |
| --- | --- | --- |
| 7 | `GuardSpanSinkPort` is a valid port definition | unit |
| 8 | Guard evaluation creates a span with all required `hex-di.guard.*` attributes | unit |
| 9 | Span `hex-di.guard.evaluationId` matches `Decision.evaluationId` | unit |
| 10 | Span status is error on denial, ok on allow | unit |
| 11 | Guard operates normally when no `GuardSpanSinkPort` adapter is registered | unit |

**Guard Composition (§39):**

| #  | Test Description | Type |
| --- | --- | --- |
| 12 | `guard()` with `methodPolicies` evaluates correct per-method policy | unit |
| 13 | Subject scope propagates correctly through DI scope hierarchy | integration |
| 14 | Child scope's subject does not leak to parent scope evaluations | unit |

**Consumer Guidelines (§40):**

| #  | Test Description | Type |
| --- | --- | --- |
| 15 | Consumer Responsibility Matrix is consistent with port definitions | unit |
| 16 | Cross-library AuditEntry forwarding preserves original signature fields | unit |

**Target: ≥90% mutation score.**

---

## DoD 19: Testing Infrastructure

**Spec Sections:** 49-56 (excl. MemoryAuditTrail/conformance suite covered in DoD 13) | **Roadmap Item:** Cross-cutting

### Requirements

**Memory Adapters (§49):**

- `createMemoryPolicyEngine` for in-memory policy evaluation in tests
- `createStaticSubjectProvider` returns a fixed subject for all scopes
- `createCyclingSubjectProvider` cycles through a list of subjects per scope

**Custom Matchers (§50):**

- `setupGuardMatchers()` registers Vitest custom matchers
- `toAllow(subject)` asserts a policy allows the given subject
- `toDeny(subject)` asserts a policy denies the given subject
- `toDenyWith(subject, reason)` asserts denial with specific reason
- `toHaveEvaluated(count)` asserts evaluation count on a mock audit trail
- Vitest type augmentation for `expect(...).toAllow(...)` etc.

**Subject Fixtures (§51):**

- `createTestSubject(overrides?)` creates a subject with sensible defaults
- `resetSubjectCounter()` resets the internal counter for deterministic IDs
- Pre-built permission sets, roles, and subjects for common test scenarios

**Fluent Utilities (§52):**

- `testPolicy(policy).against(subject).expectAllow()` — pure policy evaluation
- `testPolicy(policy).against(subject).expectDeny(reason?)` — pure policy evaluation
- `testGuard(adapter).withSubject(subject).resolve(method?).expectAllow()` — method policy resolution
- `testGuard(adapter).withSubject(subject).resolve(method?).expectDeny(reason?)` — method policy resolution

**Anti-Patterns (§53):**

- 9 documented anti-patterns with explanations and correct alternatives
- Documentation only — no runtime code

**Policy Change Testing (§54):**

- `createPolicyDiffReport(before, after, subjects)` computes policy differences
- `PolicyDiffReport` type with `entries: PolicyDiffEntry[]`, `summary: string`
- `PolicyDiffEntry` type with `subject`, `permission`, `before: Decision`, `after: Decision`, `changed: boolean`

**GxP Test Data (§55):**

- REQUIREMENT: Test data factories must use synthetic data only (no production data)
- REQUIREMENT: Test audit entries must be distinguishable from production entries (e.g., `testMode: true` flag)


**Files:** `libs/guard/tests/unit/testing-infrastructure.test.ts`, `libs/guard/tests/testing-infrastructure.test-d.ts`

| #  | Test Description | Type |
| --- | --- | --- |

**Memory Adapters (§49):**

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `createMemoryPolicyEngine` evaluates policies in-memory | unit |
| 2 | `createStaticSubjectProvider` returns same subject for every scope | unit |
| 3 | `createCyclingSubjectProvider` returns subjects in round-robin order | unit |

**Custom Matchers (§50):**

| #  | Test Description | Type |
| --- | --- | --- |
| 4 | `setupGuardMatchers()` registers all 4 matchers with Vitest | unit |
| 5 | `toAllow(subject)` passes when policy allows subject | unit |
| 6 | `toAllow(subject)` fails with descriptive message when policy denies | unit |
| 7 | `toDeny(subject)` passes when policy denies subject | unit |
| 8 | `toDenyWith(subject, reason)` passes when denial reason matches | unit |
| 9 | `toHaveEvaluated(count)` passes when audit trail has expected count | unit |
| 10 | Vitest type augmentation compiles: `expect(policy).toAllow(subject)` | type |

**Subject Fixtures (§51):**

| #  | Test Description | Type |
| --- | --- | --- |
| 11 | `createTestSubject()` returns subject with default permissions, roles, id | unit |
| 12 | `createTestSubject({ permissions })` overrides default permissions | unit |
| 13 | `resetSubjectCounter()` resets ID counter for deterministic test output | unit |
| 14 | Pre-built subjects include admin, reader, anonymous archetypes | unit |

**Fluent Utilities (§52):**

| #  | Test Description | Type |
| --- | --- | --- |
| 15 | `testPolicy(p).against(s).expectAllow()` passes for allowed subject | unit |
| 16 | `testPolicy(p).against(s).expectDeny()` passes for denied subject | unit |
| 17 | `testPolicy(p).against(s).expectDeny(reason)` checks reason string | unit |
| 18 | `testGuard(a).withSubject(s).resolve().expectAllow()` tests adapter-level policy | unit |
| 19 | `testGuard(a).withSubject(s).resolve(method).expectDeny()` tests method-level policy | unit |

**Anti-Patterns (§53):**

| #  | Test Description | Type |
| --- | --- | --- |
| 20 | 9 anti-patterns documented with problem description and correct alternative | unit |

**Policy Change Testing (§54):**

| #  | Test Description | Type |
| --- | --- | --- |
| 21 | `createPolicyDiffReport` detects added permissions | unit |
| 22 | `createPolicyDiffReport` detects removed permissions | unit |
| 23 | `createPolicyDiffReport` detects unchanged permissions | unit |
| 24 | `PolicyDiffReport.summary` describes changes in human-readable form | unit |

**GxP Test Data (§55):**

| #  | Test Description | Type |
| --- | --- | --- |
| 25 | Test data factories produce synthetic data only | unit |
| 26 | Test audit entries include `testMode: true` flag | unit |
| 27 | Test entries are distinguishable from production entries | unit |

**Security Tests (§56):**

| #  | Test Description | Type |
| --- | --- | --- |
| 28 | Race condition: frozen subject rejects mutation during evaluation | unit |
| 29 | Race condition: concurrent audit writes produce monotonic sequenceNumbers | unit |
| 30 | Replay: consumed ReauthenticationToken rejected on second use | unit |
| 31 | Replay: duplicate evaluationId rejected by audit trail | unit |
| 32 | Replay: copied signature fails binding integrity validation | unit |
| 33 | DI manipulation: NoopAuditTrail rejected at type and runtime in GxP mode | unit |
| 34 | DI manipulation: guarded port not resolvable without guard wrapper | unit |
| 35 | Input validation: oversized subjectId rejected by AuditTrail.record() | unit |
| 36 | Input validation: deeply nested policy returns PolicyEvaluationError at depth limit | unit |

**Target: ≥90% mutation score.**

---

## DoD 20: Array Matchers

**Spec Sections:** 16 (§66-70) | **Roadmap Item:** 20

### Requirements

- `MatcherKind` extended with `"someMatch"`, `"contains"`, `"everyMatch"`, and `"size"` variants
- `ObjectMatcher` type: `Readonly<Record<string, MatcherExpression>>`
- `MatcherExpression` union extended with:
  - `{ kind: "someMatch", matcher: ObjectMatcher }` — at least one array element satisfies all matcher fields
  - `{ kind: "contains", ref: MatcherReference }` — array includes exact value (strict equality)
  - `{ kind: "everyMatch", matcher: ObjectMatcher }` — every array element satisfies all matcher fields
  - `{ kind: "size", min?: number, max?: number }` — array length within inclusive range
- `someMatch(matcher)`, `contains(ref)`, `everyMatch(matcher)`, `size(options)` builder functions return frozen `MatcherExpression`
- `someMatch` evaluation: missing attribute → deny (not error); non-array → `PolicyEvaluationError(ACL003)`; empty array → deny; allow when at least one item satisfies all fields
- `everyMatch` evaluation: non-array → `PolicyEvaluationError(ACL003)`; empty array → allow (vacuous truth); deny when any item fails
- `contains` evaluation: non-array → `PolicyEvaluationError(ACL003)`; strict equality (`===`) comparison
- `size` evaluation: non-array → `PolicyEvaluationError(ACL003)`; missing attribute → deny; allow when length is within [min, max]
- `resource()` references inside `ObjectMatcher` fields resolve against `EvaluationContext.resource` at evaluation time
- All four array matchers serialize and deserialize correctly via `serializePolicy` / `deserializePolicy`


**Files:** `libs/guard/tests/unit/array-matchers.test.ts`, `libs/guard/tests/array-matchers.test-d.ts`, `libs/guard/tests/integration/array-matchers.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `someMatch` returns deny when attribute is `undefined` (no error thrown) | unit |
| 2 | `someMatch` throws `PolicyEvaluationError(ACL003)` when attribute is not an Array | unit |
| 3 | `someMatch` returns deny for empty array (no items to satisfy) | unit |
| 4 | `someMatch` returns allow when at least one item satisfies all ObjectMatcher fields | unit |
| 5 | `someMatch` evaluates nested `MatcherExpression` recursively per ObjectMatcher field | integration |
| 6 | `everyMatch` returns allow for empty array (vacuous truth) | unit |
| 7 | `everyMatch` returns deny when any item fails the ObjectMatcher | unit |
| 8 | `everyMatch` throws `PolicyEvaluationError(ACL003)` when attribute is not an Array | unit |
| 9 | `contains` uses strict equality (`===`) for scalar comparison | unit |
| 10 | `contains` throws `PolicyEvaluationError(ACL003)` when attribute is not an Array | unit |
| 11 | `size` allows when array length >= min and <= max (inclusive) | unit |
| 12 | `size` returns deny when attribute is `undefined` | unit |
| 13 | `size` throws `PolicyEvaluationError(ACL003)` when attribute is not an Array | unit |
| 14 | `resource()` references inside `ObjectMatcher` fields resolve correctly against `EvaluationContext.resource` | unit |
| 15 | All four matchers produce correct serialized JSON via `serializePolicy` | unit |
| 16 | All four matchers round-trip correctly via `deserializePolicy` | unit |

**Target: ≥90% mutation score.**

---

## DoD 21: API Ergonomics

**Spec Sections:** 6 (§23a), 04 (§71, §84, §85), 18 (§74), 11 (§42a) | **Roadmap Item:** 21

### Requirements

**Subject Enrichment Utilities (§23a):**
- `withAttributes(subject, attributes)` returns a new frozen `AuthSubject` with the provided attributes merged in (original subject not mutated)
- `getAttribute<T>(subject, key)` returns the typed attribute value for `key`, or `undefined` if absent
- Both utilities are pure functions with no side effects

**createRoleGate Factory (§71):**
- `createRoleGate(role)` returns a `RoleGate` adapter that wraps an inner adapter and enforces `hasRole(role)` on every resolution
- `RoleGate` adds `SubjectProviderPort` to its requires tuple (deduplication if already present)
- `RoleGate` throws `AccessDeniedError(ACL001)` when the subject does not hold the specified role
- Intended for lightweight role enforcement without the full `guard()` setup

**evaluateBatch (§74):**
- `evaluateBatch(policies, context)` evaluates an array of policies against a single context in one call
- Returns `Result<BatchDecision[], PolicyEvaluationError>` where each `BatchDecision` corresponds to the input policy at the same index
- `BatchDecision` carries the same fields as `Decision` plus an `index` field
- Failure in one policy does not affect evaluation of the others (independent per-policy evaluation)
- Evaluation order is deterministic and matches the input array order

**`resource` Option on Single-Policy Hooks (§42a):**
- `useCan`, `usePolicy`, and `usePolicies` hooks accept an optional `resource` field on their options object
- When provided, `resource` is merged into `EvaluationContext.resource` for that evaluation
- `resource` option is reactive: changing `resource` triggers re-evaluation


**Files:** `libs/guard/tests/unit/api-ergonomics.test.ts`, `libs/guard/tests/api-ergonomics.test-d.ts`, `libs/guard/tests/integration/api-ergonomics.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `withAttributes(subject, attrs)` returns new frozen subject without mutating the original | unit |
| 2 | `withAttributes` merged attributes override conflicting keys from the original subject | unit |
| 3 | `getAttribute<T>(subject, key)` returns the typed value when key exists | unit |
| 4 | `getAttribute<T>(subject, key)` returns `undefined` when key is absent | unit |
| 5 | `createRoleGate(role)` wraps inner adapter and evaluates `hasRole(role)` on every resolution | unit |
| 6 | `createRoleGate` adds `SubjectProviderPort` to the adapter's requires | unit |
| 7 | `createRoleGate` deduplicates `SubjectProviderPort` if already in requires | unit |
| 8 | `createRoleGate` throws `AccessDeniedError(ACL001)` when subject lacks the role | unit |
| 9 | `evaluateBatch([p1, p2, p3], ctx)` returns exactly 3 `BatchDecision` entries | unit |
| 10 | Each `BatchDecision` has `index` matching its position in the input array | unit |
| 11 | Failure (error) in one policy in `evaluateBatch` does not prevent evaluation of remaining policies | unit |
| 12 | `evaluateBatch` evaluation order matches input array order (deterministic) | unit |
| 13 | `useCan(policy, { resource })` merges `resource` into `EvaluationContext.resource` | unit |
| 14 | Changing `resource` prop in `useCan` triggers re-evaluation | unit |
| 15 | `usePolicies(policies, { resource })` applies `resource` to all policies in the batch | unit |

**Target: ≥90% mutation score.**

---

## DoD 22: Cucumber BDD Acceptance Tests

**Spec Sections:** 13 (section 57) | **Roadmap Item:** GxP Compliance (Acceptance Test Layer)

### Requirements

- Standalone `@cucumber/cucumber` runner with `tsx` loader, strict mode, JSON+HTML report output
- `GuardCucumberWorld` class wrapping memory adapters, reset per scenario via `Before`/`After` hooks
- Step definitions use real evaluation (no mocks), reuse `@hex-di/guard-testing` utilities
- Tag taxonomy: `@gxp`, `@audit-trail`, `@hash-chain`, `@e-signature`, `@rbac`, `@separation-of-duties`, `@break-glass`, `@admin`, `@REQ-GUARD-xxx`, `@OQ-xx`, regulatory citation tags
- 23 feature files across 9 directories (`features/rbac/`, `features/audit-trail/`, `features/e-signature/`, `features/admin/`, `features/gxp/`, `features/rebac/`, `features/async/`, `features/field-union/`, `features/combined/`)
- CI integration: Cucumber suite executed on every commit, failures block merge, JSON report archived as OQ evidence
- Every `@gxp` scenario has at least one `@REQ-GUARD-xxx` tag for traceability


**Files:** `libs/guard/features/ (23 feature files across 9 directories)`, `libs/guard/features/step-definitions/`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | permission-evaluation.feature: RBAC permission evaluation scenarios (20 scenarios) | bdd |
| 2 | role-hierarchy.feature: Role hierarchy and inheritance scenarios (8 scenarios) | bdd |
| 3 | separation-of-duties.feature: Separation of duties enforcement scenarios (7 scenarios) | bdd |
| 4 | recording.feature: Audit trail recording scenarios (10 scenarios) | bdd |
| 5 | hash-chain-integrity.feature: Hash chain integrity verification scenarios (8 scenarios) | bdd |
| 6 | completeness.feature: Completeness monitoring scenarios (6 scenarios) | bdd |
| 7 | field-completeness.feature: Field-level completeness tracking scenarios (5 scenarios) | bdd |
| 8 | capture-and-validate.feature: Electronic signature capture and validation scenarios (8 scenarios) | bdd |
| 9 | re-authentication.feature: Re-authentication flow scenarios (5 scenarios) | bdd |
| 10 | counter-signing.feature: Counter-signing and multi-signature scenarios (6 scenarios) | bdd |
| 11 | emergency-bypass.feature: Emergency bypass authorization scenarios (5 scenarios) | bdd |
| 12 | policy-change-control.feature: Policy change control and approval scenarios (6 scenarios) | bdd |
| 13 | noop-audit-trail-rejection.feature: GxP NoopAuditTrail rejection scenarios (3 scenarios) | bdd |
| 14 | scope-disposal-chain-verification.feature: Scope disposal chain verification scenarios (4 scenarios) | bdd |
| 15 | wal-crash-recovery.feature: WAL crash recovery scenarios (4 scenarios) | bdd |
| 16 | relationship-evaluation.feature: Relationship-based access evaluation scenarios (6 scenarios) | bdd |
| 17 | transitive-relationships.feature: Transitive relationship resolution scenarios (4 scenarios) | bdd |
| 18 | relationship-field-access.feature: Relationship-level field access scenarios (4 scenarios) | bdd |
| 19 | async-attribute-resolution.feature: Async attribute resolution scenarios (5 scenarios) | bdd |
| 20 | async-timeout-handling.feature: Async timeout and error handling scenarios (3 scenarios) | bdd |
| 21 | field-strategy-union.feature: Field strategy union evaluation scenarios (4 scenarios) | bdd |
| 22 | field-strategy-intersection.feature: Field strategy intersection scenarios (3 scenarios) | bdd |
| 23 | rebac-async-field-union.feature: ReBAC + async + field union composition scenarios (4 scenarios) | bdd |

**Target: ≥90% mutation score.**

---

## DoD 23: Meta-Audit Logging

**Spec Sections:** 12 (Meta-Audit Trail) | **Roadmap Item:** GxP Compliance (Audit Trail Access Logging)

### Requirements

- `MetaAuditEntry` type with `_tag`, `metaAuditId`, `timestamp`, `actorId`, `accessType`, `description`, `entryCount`, `simulated`, `scope` fields
- `MetaAuditTrailPort` outbound port with `recordAccess()` method
- Simulations via A2A `guard.explain-decision` skill logged with `simulated: true`
- MCP/A2A endpoints require authentication when `gxp: true`
- Meta-audit entries recorded for all audit trail queries, exports, and verifications


**Files:** `libs/guard/tests/unit/meta-audit.test.ts`, `libs/guard/tests/meta-audit.test-d.ts`, `libs/guard/tests/integration/meta-audit.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `MetaAuditEntry` type defined in behaviors/11-inspection.md and 14-api-reference.md | unit |
| 2 | `MetaAuditTrailPort.recordAccess()` follows append-only contract | unit |
| 3 | A2A `guard.explain-decision` simulations produce meta-audit entry with `simulated: true` | unit |
| 4 | MCP tool endpoints reject unauthenticated access when `gxp: true` | unit |
| 5 | A2A skill endpoints reject unauthenticated access when `gxp: true` | unit |
| 6 | Audit trail queries produce meta-audit entries with `accessType: "query"` | unit |
| 7 | Audit trail exports produce meta-audit entries with `accessType: "export"` | unit |
| 8 | Chain verification produces meta-audit entry with `accessType: "verify_chain"` | unit |
| 9 | Inspector MCP access produces meta-audit entries (digital inspector access procedure, if provided) (G5) | unit |

**Data Classification Change Tracking (§61 in 02-audit-trail-contract.md):**

| #  | Test Description | Type |
| --- | --- | --- |
| 10 | `DataClassificationChangeEntry` interface has `_tag: "DataClassificationChange"`, `evaluationId`, `previousClassification`, `newClassification`, `actorId`, `timestamp`, `reason` | unit |
| 11 | When `gxp: true`, backfill of `dataClassification` on an existing audit entry writes `DataClassificationChangeEntry` to `MetaAuditTrailPort` | unit |
| 12 | `DataClassificationChangeEntry` includes the `evaluationId` of the modified entry | unit |
| 13 | `previousClassification` is empty string when `dataClassification` was previously unset | unit |

**Target: ≥90% mutation score.**

---

## DoD 24: System Decommissioning

**Spec Sections:** 15 (Appendices) | **Roadmap Item:** GxP Compliance (Lifecycle Management)

### Requirements

- System decommissioning checklist documented in appendices/
- Audit trail archival procedure: export, verify chain integrity, store in long-term archive
- Chain verification before archival (confirm no gaps, no integrity violations)
- Retention period enforcement (audit entries MUST be retained for the regulatory minimum)
- Decommissioning event recorded as final audit entry


**Files:** `libs/guard/tests/unit/decommissioning.test.ts`, `libs/guard/tests/decommissioning.test-d.ts`, `libs/guard/tests/integration/decommissioning.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | Decommissioning checklist documented in appendices/ | unit |
| 2 | Audit trail can be exported with full chain integrity verification | unit |
| 3 | Chain gaps or integrity violations block archival with diagnostic error | unit |
| 4 | Decommissioning event recorded as final audit entry in the chain | unit |
| 5 | Archived audit trail can be re-imported and chain verified | unit |
| 6 | Retention period documented per regulatory framework | unit |
| 7 | Periodic archive readability verification procedure documented (at least annual verification throughout retention period) (G3) | unit |

**Decommissioning Archive Schema (§70a):**

| #  | Test Description | Type |
| --- | --- | --- |
| 8 | JSON exports conform to `guard-audit-archive` JSON Schema v1.0.0 (`$id: "https://hex-di.dev/schemas/guard-audit-archive/v1.0.0"`) | unit |
| 9 | Archive includes `archiveVersion`, `metadata` (all required fields), `chains` (at least one), and optional `keyMaterial` | unit |
| 10 | Archive `metadata.checksum` is a valid SHA-256 checksum of the archive payload (excluding the checksum field itself) | unit |
| 11 | Archive `metadata` includes all required fields: `exportTimestamp`, `exporterIdentity`, `sourceSystem`, `guardVersion`, `schemaVersion`, `dateRangeStart`, `dateRangeEnd`, `totalEntryCount`, `scopeIds`, `hashAlgorithms`, `checksum` | unit |
| 12 | Each `AuditChain` entry includes `scopeId`, `hashAlgorithm`, `genesisHash`, `entryCount`, `entries` (all required) | unit |
| 13 | Each `ArchivedAuditEntry` includes all 14 required fields matching the schema `$defs` | unit |
| 14 | `ArchivedKey` entries include `keyId`, `algorithm`, `archivedAt` (required); `publicKey` for asymmetric, `secretKey` (encrypted) for HMAC | unit |
| 15 | Archive schema versioned with semver; breaking changes increment major version | unit |
| 16 | Archive consumer tooling (`verifyAuditChain()`) supports all previously released major schema versions | unit |
| 17 | Schema validation via JSON Schema 2020-12 validator (e.g., ajv) passes for all exports | unit |

**Target: ≥90% mutation score.**
## DoD 25: Async Evaluation

**Spec Sections:** 05 (§21a), 06 (§22a), 07 (§25a), 11, 12, 14, 15 | **Roadmap Item:** Async ABAC

### Requirements

- `evaluateAsync()` function wraps sync `evaluate()` with on-demand attribute resolution
- `AttributeResolver` interface with `resolve(subjectId, attribute, resource?): Promise<unknown>`
- `AttributeResolverPort` — optional outbound infrastructure port
- `AsyncEvaluateOptions` with `resolverTimeoutMs` (default 5000ms), `maxConcurrentResolutions` (default 10)
- `guardAsync()` factory — async variant of `guard()`, forces singleton lifetime
- Short-circuit preserved: allOf stops on first deny (no further async calls), anyOf stops on first allow
- Resolved attributes cached within single evaluation pass (no redundant calls)
- `evaluatedAt` timestamp captured BEFORE async resolution begins
- `AuditTrail.record()` remains synchronous even in async path
- `EvaluationTrace` gains optional `asyncResolution: boolean` and `resolutionDurationMs: number`
- Error codes: ACL026 (AttributeResolutionTimeoutError), ACL027 (AttributeResolutionError)


**Files:** `libs/guard/tests/unit/async-evaluation.test.ts`, `libs/guard/tests/async-evaluation.test-d.ts`, `libs/guard/tests/integration/async-evaluation.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `evaluateAsync()` produces identical decisions to `evaluate()` when all attributes pre-populated | unit |
| 2 | Missing attributes trigger resolver calls (lazy resolution) | unit |
| 3 | Resolved attributes cached within single evaluation pass | unit |
| 4 | Resolver timeout produces `Err(ACL026)` | unit |
| 5 | Resolver error produces `Err(ACL027)` | unit |
| 6 | `evaluatedAt` captured before async resolution begins | unit |
| 7 | Short-circuit preserved: no unnecessary async resolution after deny/allow | unit |
| 8 | `guardAsync()` rejects non-singleton adapters at compile time | unit |
| 9 | Trace includes `asyncResolution` and `resolutionDurationMs` when async used | unit |
| 10 | `AuditTrail.record()` called synchronously even in async evaluation path | unit |

**Target: ≥90% mutation score.**

---

## DoD 26: Field-Level Union Strategy

**Spec Sections:** 04 (§13a), 05 (§19), 09, 12, 14, 15 | **Roadmap Item:** Field Union

### Requirements

- `FieldStrategy` type: `"intersection" | "union" | "first"`
- `CombinatorOptions` interface with optional `fieldStrategy`
- `AllOfPolicy` and `AnyOfPolicy` gain optional `fieldStrategy` field
- `allOf()` and `anyOf()` accept optional `CombinatorOptions` as last argument
- `allOf` default field strategy: "intersection" (unchanged behavior)
- `anyOf` default field strategy: "first" (unchanged behavior)
- `anyOf` with `fieldStrategy: "union"` evaluates ALL children (no short-circuit)
- `allOf` with `fieldStrategy: "union"` unions fields instead of intersecting
- `mergeVisibleFields()` dispatches on strategy
- `fieldStrategy` serialized as plain string, omitted when default
- Trace label includes `fieldStrategy` when non-default


**Files:** `libs/guard/tests/unit/field-union.test.ts`, `libs/guard/tests/field-union.test-d.ts`, `libs/guard/tests/integration/field-union.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `allOf` default behavior unchanged (intersection) | unit |
| 2 | `anyOf` default behavior unchanged (first, short-circuit) | unit |
| 3 | `anyOf` with `fieldStrategy: "union"` evaluates ALL children | unit |
| 4 | `anyOf` with `fieldStrategy: "union"` trace has `complete: true` | unit |
| 5 | `allOf` with `fieldStrategy: "union"` unions field sets | unit |
| 6 | `fieldStrategy` serialized only when non-default | unit |
| 7 | `fieldStrategy` deserialization validates enum values | unit |
| 8 | Trace label includes `[fieldStrategy=...]` when non-default | unit |
| 9 | CombinatorOptions detected as last argument (distinguished from policy by absence of `kind`) | unit |
| 10 | Existing field-level access tests still pass (backward compatible) | unit |

**Target: ≥90% mutation score.**

---

## DoD 27: ReBAC (Relationship-Based Access Control)

**Spec Sections:** 01, 04, 05, 06 (§22b), 07, 09, 10, 11, 12, 14, 15 | **Roadmap Item:** ReBAC

### Requirements

- `hasRelationship` added to `PolicyKind` union (one of the 10 policy kinds)
- `HasRelationshipPolicy<TRelation>` with `kind`, `relation`, `resourceType?`, `depth?` (default 1), `fields?`
- `RelationshipResolver` interface with sync `check()` and async `checkAsync()`
- `RelationshipResolverPort` — optional outbound infrastructure port
- `hasRelationship(relation, options?)` combinator function
- `EvaluationContext` gains optional `relationshipResolver`
- Sync path calls `resolver.check(subjectId, relation, resourceId, options)`
- Async path calls `resolver.checkAsync(...)` via `evaluateAsync()`
- `resourceId` extracted from `context.resource?.id` (REQUIRED for relationship policies)
- Error codes: ACL028 (MissingRelationshipResolver), ACL029 (RelationshipResolutionError), ACL030 (MissingResourceId)
- Supported patterns: direct (depth 1), transitive (depth > 1), typed (resourceType), with fields
- `guard()` detects `hasRelationship` in policy tree, adds `RelationshipResolverPort` to `requires`


**Files:** `libs/guard/tests/unit/rebac.test.ts`, `libs/guard/tests/rebac.test-d.ts`, `libs/guard/tests/integration/rebac.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `PolicyKind` union has 10 members (exhaustive switch requires `hasRelationship` case) | unit |
| 2 | `hasRelationship("owner")` evaluates via `resolver.check()` | unit |
| 3 | `hasRelationship("member", { depth: 2 })` follows 2 hops | unit |
| 4 | `hasRelationship("viewer", { resourceType: "document" })` scoped to resource type | unit |
| 5 | `hasRelationship("viewer", { fields: ["title"] })` propagates visibleFields | unit |
| 6 | Missing resolver produces `Err(ACL028)` | unit |
| 7 | Missing `resource.id` produces `Err(ACL030)` | unit |
| 8 | Resolver error produces `Err(ACL029)` | unit |
| 9 | Async path uses `resolver.checkAsync()` | unit |
| 10 | Serialization round-trip preserves all hasRelationship fields | unit |
| 11 | `guard()` adds `RelationshipResolverPort` to `requires` when policy tree contains `hasRelationship` | unit |
| 12 | Trace label: `hasRelationship(owner, document)` format | unit |

**Target: ≥90% mutation score.**

---

## DoD 28: Ecosystem Extensions

**Spec Sections:** 18 (§74-78) | **Roadmap Item:** GUARD-18

### Requirements

- `PolicySyncPort` outbound port for policy distribution across nodes (§74a)
- `EvaluationCachePort` outbound port for caching evaluation decisions (§74b)
- `EvaluationCachePort` MUST NOT be registerable when `gxp: true` — compile-time error via conditional types, runtime `ConfigurationError` if bypassed (ALCOA+ Contemporaneous, ALCOA+ Complete)
- `PolicyBundle` format with `version`, `bundleId`, `contentHash`, `policies`, `permissionRegistry`, `roles`, optional `BundleSignature` (§74c)
- Bundle signature REQUIRED for cross-network-boundary distribution (RSA-SHA256 or ECDSA-P256); unsigned bundles rejected by receiving nodes
- Content hash validation on bundle receipt; hash mismatch emits `GuardErrorEvent` with `ACL031`
- Consistency model: eventual for policies, strong for subject/session (per-scope), best-effort for cache, strong for audit trail (§74d)
- Express/Connect middleware (`@hex-di/guard-express`): request-scoped DI container, subject extraction, 403 on denial, 401 on missing subject (§75a)
- Fastify plugin (`@hex-di/guard-fastify`): request decoration, scoped container, subject extraction (§75b)
- tRPC middleware (`@hex-di/guard-trpc`): context attachment, scope lifecycle (§75c)
- GraphQL directive (`@hex-di/guard-graphql`): field-level authorization, policy parsing at schema build time (§75d)
- NestJS guard decorator (`@hex-di/guard-nestjs`): method decorator, NestJS guard integration (§75e)
- All framework middleware adapters MUST create per-request DI scope and dispose on completion (even on throw)
- All framework middleware adapters MUST translate `AccessDeniedError` to framework-standard error (403, FORBIDDEN, GraphQLError, ForbiddenException)
- Postgres `AuditTrailPort` adapter with database-level INSERT-only permissions, hash chain verification, partitioning (§76a)
- SQLite `AuditTrailPort` adapter with WAL mode, trigger-based append-only enforcement (§76b)
- Postgres `RelationshipResolverPort` adapter with recursive CTE for transitive resolution (§76c)
- Drizzle `RelationshipResolverPort` adapter (ORM-agnostic) (§76d)
- Persistence adapters MUST pass `createAuditTrailConformanceSuite()` (17 conformance tests)
- `policyToFilter()` pure function: converts policy tree + subject into database-agnostic `PolicyFilter` (§77a)
- `policyToFilter()` returns `undefined` for non-convertible policies (`hasSignature`, `hasRelationship`)
- Prisma query adapter (`@hex-di/guard-prisma`): `policyToPrismaWhere()`, `policyToPrismaSelect()` (§77b)
- Drizzle query adapter (`@hex-di/guard-drizzle`): `policyToDrizzleWhere()` (§77c)
- `compilePolicyToWasm()` compiles policy bundle to WASM module (subset: no async, no signatures, no ReBAC) (§78)
- `loadWasmGuard()` loads WASM binary for edge evaluation (§78)
- WASM compilation MUST reject bundles containing `hasSignature` or `hasRelationship`
- WASM evaluation MUST NOT produce audit trail entries


**Files:** `libs/guard/tests/unit/ecosystem.test.ts`, `libs/guard/tests/ecosystem.test-d.ts`, `libs/guard/tests/integration/ecosystem.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `PolicySyncPort.publish()` distributes bundle to all subscribers | unit |
| 2 | `PolicySyncPort.subscribe()` receives bundles from remote publishers | unit |
| 3 | `EvaluationCachePort.get()` returns cached decision on hit, `undefined` on miss | unit |
| 4 | `EvaluationCachePort.invalidateByPolicy()` removes all decisions for a policy hash | unit |
| 5 | `EvaluationCachePort.invalidateBySubject()` removes all decisions for a subject | unit |
| 6 | GxP mode rejects `EvaluationCachePort` registration at compile time (conditional type error) | unit |
| 7 | GxP mode rejects `EvaluationCachePort` registration at runtime (`ConfigurationError`) | unit |
| 8 | `PolicyBundle.contentHash` validated against serialized policies on receipt | unit |
| 9 | Content hash mismatch rejects bundle and emits `GuardErrorEvent` with `ACL031` | unit |
| 10 | Unsigned bundles rejected by receiving nodes across network boundaries | unit |
| 11 | Signed bundles verified against public key; incorrect key produces rejection | unit |
| 12 | Express middleware creates request-scoped DI container attached to `req.scope` | integration |
| 13 | Express middleware returns 403 on `AccessDeniedError` | integration |
| 14 | Express middleware returns 401 when `extractSubject` returns `null` | integration |
| 15 | Express middleware disposes scope after response (even on handler throw) | integration |
| 16 | Fastify plugin creates scoped container on `request.scope` | integration |
| 17 | tRPC middleware attaches scope to `ctx.scope` | integration |
| 18 | All middleware adapters translate `AccessDeniedError` to framework-standard error | unit |
| 19 | Postgres audit trail adapter uses database-level INSERT-only permissions (REVOKE UPDATE, DELETE) | unit |
| 20 | Postgres audit trail adapter passes all 17 conformance suite tests | conformance |
| 21 | SQLite audit trail adapter enables WAL mode | unit |
| 22 | SQLite audit trail adapter creates triggers rejecting UPDATE/DELETE | unit |
| 23 | SQLite audit trail adapter passes all 17 conformance suite tests | conformance |
| 24 | Postgres relationship resolver handles direct lookups (depth 1) | unit |
| 25 | Postgres relationship resolver handles transitive lookups (depth > 1) via recursive CTE | unit |
| 26 | Postgres relationship resolver respects depth bound | unit |
| 27 | `policyToFilter()` is a pure function (no side effects, no external state) | unit |
| 28 | `policyToFilter()` converts `hasAttribute` with `eq(subject(...))` to `{ kind: "eq" }` filter | unit |
| 29 | `policyToFilter()` converts `allOf` to `{ kind: "and" }` filter | unit |
| 30 | `policyToFilter()` returns `undefined` for `hasSignature` and `hasRelationship` | unit |
| 31 | `policyToPrismaWhere()` produces valid Prisma where clause | unit |
| 32 | `policyToPrismaSelect()` produces valid Prisma select from `visibleFields` | unit |
| 33 | `policyToDrizzleWhere()` produces valid Drizzle SQL condition | unit |
| 34 | ORM adapters support `fieldMapping` parameter | unit |
| 35 | `compilePolicyToWasm()` rejects bundles containing `hasSignature` | unit |
| 36 | `compilePolicyToWasm()` rejects bundles containing `hasRelationship` | unit |
| 37 | `loadWasmGuard()` evaluates policies and returns `WasmDecision` | unit |
| 38 | WASM evaluation does NOT produce audit trail entries | unit |
| 39 | All 21 integration test scenarios (DE-1 through DE-5, FM-1 through FM-5, PS-1 through PS-5, QC-1 through QC-6) pass | integration |

**Target: ≥90% mutation score.**

---

## DoD 29: Developer Experience

**Spec Sections:** 19 (§79-83) | **Roadmap Item:** GUARD-19

### Requirements

- `guard` CLI tool (`@hex-di/guard-cli`) with commands: `init`, `check`, `test`, `explain`, `hash`, `audit verify`, `bundle pack`, `bundle verify`, `diff`, `migrate` (§79)
- `guard init` scaffolds guard configuration with `--template` option (basic, rbac, abac, gxp)
- `guard check` validates serialized policies against schema and permission registry
- `guard test` runs policy assertion tests with `testPolicy` utility and declarative API
- `guard explain` prints human-readable evaluation trace for policy against subject
- `guard hash` prints deterministic SHA-256 content hash for change detection
- `guard audit verify` verifies hash chain integrity of exported audit trail
- `guard bundle pack` creates signed policy bundle; `guard bundle verify` verifies integrity and signature
- CLI exit codes: 0 (success), 1 (validation errors), 2 (configuration error)
- Policy playground (`@hex-di/guard-playground`): web-based SPA with policy builder, subject editor, live evaluation, trace visualization, serialization preview, share URLs, example gallery, export (§80)
- Playground runs entirely in browser (no server-side evaluation)
- Playground state encoded in URL hash (pako-compressed, base64url-encoded `PlaygroundState`)
- GxP data classification: playground MUST display non-dismissible banner when processing GxP-origin policies (REQ-GUARD-080)
- GxP mode SHOULD disable share URL feature; SHOULD NOT persist data beyond current session
- VS Code extension (`hex-di-guard-vscode`): policy JSON schema, inline evaluation code lens, permission/role autocomplete, trace tree panel, policy diff view (§81)
- Policy coverage analysis (`@hex-di/guard-coverage`): node coverage, branch coverage, permission coverage, role coverage, decision coverage (§82)
- `createCoverageCollector()` instruments `evaluate()` calls and produces `CoverageReport`
- `--min-coverage` CI threshold enforcement
- Policy diff (`@hex-di/guard-diff`): `diffPolicies()` structural comparison, `analyzePolicyImpact()` impact analysis (§83)
- Policy migration (`@hex-di/guard-diff`): `migratePolicy()` schema version migration with `Result<string, PolicyMigrationError>`
- GxP policy changes MUST be recorded as `PolicyChangeAuditEntry` with CCR reference (REQ-GUARD-082)


**Files:** `libs/guard/tests/unit/developer-experience.test.ts`, `libs/guard/tests/developer-experience.test-d.ts`, `libs/guard/tests/integration/developer-experience.test.ts`

| #  | Test Description | Type |
| --- | --- | --- |
| 1 | `guard init --template rbac` creates `guard/` directory with `permissions.ts`, `roles.ts`, `policies.ts`, `guard.config.ts` | unit |
| 2 | `guard init` supports all 4 templates: basic, rbac, abac, gxp | unit |
| 3 | `guard check` returns exit code 0 for valid policies, exit code 1 for invalid policies with error message | unit |
| 4 | `guard check --strict` fails on warnings (unused permissions, unreachable policies) | unit |
| 5 | `guard test` runs policy assertions; all passing produces exit code 0 | unit |
| 6 | `guard test` with failing assertions produces exit code 1 with failure details | unit |
| 7 | `guard explain` outputs ALLOW/DENY verdict with indented evaluation trace tree | unit |
| 8 | `guard explain` supports text, json, and tree output formats | unit |
| 9 | `guard hash` produces deterministic output (identical hash for same policy hashed twice) | unit |
| 10 | `guard audit verify` passes for valid hash chain; fails with chain break location for tampered entries | unit |
| 11 | `guard bundle pack --sign` creates signed bundle with content hash and signature | unit |
| 12 | `guard bundle verify --public-key` verifies content hash and signature integrity | unit |
| 13 | CLI exit codes: 0 (success), 1 (errors), 2 (configuration error) | unit |
| 14 | Playground policy builder supports all policy kinds (hasPermission, hasRole, hasAttribute, hasSignature, hasRelationship, allOf, anyOf, not) | unit |
| 15 | Playground live evaluation updates decision and trace in real-time | unit |
| 16 | Playground share URLs encode state via pako compression + base64url in URL hash | unit |
| 17 | Playground displays non-dismissible GxP banner when `gxpMode: true` in state | unit |
| 18 | GxP banner uses visually distinct style (amber/yellow background) | unit |
| 19 | GxP banner remains visible for duration of session | unit |
| 20 | VS Code extension registers JSON schema for `*.guard.json` files | unit |
| 21 | VS Code code lens shows evaluation results inline above `guard()` calls | unit |
| 22 | VS Code provides autocomplete for `hasPermission()` and `hasRole()` arguments | unit |
| 23 | VS Code trace tree panel visualizes `EvaluationTrace` as interactive tree | unit |
| 24 | `createCoverageCollector()` instruments `evaluate()` and records coverage data | unit |
| 25 | `CoverageReport` includes node, branch, permission, role, and decision coverage metrics | unit |
| 26 | Uncovered nodes listed with port name, policy path, kind, and description | unit |
| 27 | `guard test --coverage --min-coverage 90` exits with code 1 when coverage below threshold | unit |
| 28 | `diffPolicies()` identifies unchanged, added, removed, and changed nodes | unit |
| 29 | `analyzePolicyImpact()` reports affected roles, added/removed permission references | unit |
| 30 | `migratePolicy()` migrates serialized policy between schema versions | unit |
| 31 | `migratePolicy()` returns `Err(PolicyMigrationError)` with breaking changes list on failure | unit |
| 32 | GxP policy changes recorded as `PolicyChangeAuditEntry` with CCR reference | unit |
| 33 | All 14 integration test scenarios (CL-1 through CL-7, CV-1 through CV-3, DF-1 through DF-4) pass | integration |

**Target: ≥90% mutation score.**

---

## Test Count Summary

> **Note:** Test counts in this table are specification targets (minimum expected counts). Individual DoD item descriptions may use `~` prefix to indicate approximate targets. Actual counts are recorded in the OQ report and MUST meet or exceed the OQ-1 baseline (currently 798 unit tests, 141 type tests, 340 integration tests, plus 15 conformance suite tests = 1,294 total). If implementation yields more tests than specified (e.g., due to additional edge cases discovered during development), the higher count becomes the new baseline per OQ-24 regression test permanence.

| DoD Item                        | Unit    | Type    | Integration | Conformance | Total     |
| ------------------------------- | ------- | ------- | ----------- | ----------- | --------- |
| 1: Permission Tokens            | 19      | 9       | --          | --          | 28        |
| 2: Role Tokens                  | 25      | 12      | --          | --          | 37        |
| 3: Policy Data Types            | 33      | 15      | --          | --          | 48        |
| 4: Policy Combinators           | 15      | 5       | --          | --          | 20        |
| 5: Policy Evaluator             | 48      | --      | --          | --          | 48        |
| 6: Subject Port                 | 27      | --      | --          | --          | 27        |
| 7: Guard Adapter                | 57      | 10      | 34          | --          | 101       |
| 8: Policy Serialization         | 34      | --      | --          | --          | 34        |
| 9: React SubjectProvider        | 10      | --      | --          | --          | 10        |
| 10: React Can/Cannot            | 25      | --      | --          | --          | 25        |
| 11: React Hooks                 | 28      | --      | --          | --          | 28        |
| 12: DevTools Integration        | 12      | --      | --          | --          | 12        |
| 13: GxP Compliance              | 86      | --      | 29          | --          | 115       |
| 14: Vision Integration          | --      | 4       | --          | --          | 4         |
| 15: Electronic Signatures       | 42      | 5       | 18          | 15          | 80        |
| 16: Validation Tooling          | 24      | --      | 12          | --          | 36        |
| 17: Port Gate Hook              | 14      | 3       | 5           | --          | 22        |
| 18: Guard Integration Contracts | 12      | --      | 18          | --          | 30        |
| 19: Testing Infrastructure      | 37      | 5       | --          | --          | 42        |
| 20: Array Matchers              | 38      | 18      | 10          | --          | 66        |
| 21: API Ergonomics              | 32      | 18      | 10          | --          | 60        |
| 22: Cucumber BDD Acceptance     | --      | --      | 118         | --          | 118       |
| 23: Meta-Audit Logging          | 11      | 3       | 5           | --          | 19        |
| 24: System Decommissioning      | 9       | 3       | 4           | --          | 16        |
| 25: Async Evaluation            | 25      | 5       | 15          | --          | 45        |
| 26: Field-Level Union           | 20      | 5       | 10          | --          | 35        |
| 27: ReBAC                       | 30      | 8       | 17          | --          | 55        |
| 28: Ecosystem Extensions        | 40      | 8       | 21          | --          | 69        |
| 29: Developer Experience        | 45      | 5       | 14          | --          | 64        |
| **Total**                       | **798** | **141** | **340**     | **15**      | **1294**  |

---

## Code Coverage Thresholds

```
REQUIREMENT: GxP-critical code paths MUST meet the following minimum code coverage
             thresholds, measured by the project's coverage tooling (e.g., c8/istanbul
             via vitest --coverage). These thresholds apply to production code only
             (test files, test utilities, and type-test files are excluded).

             Branch coverage >= 95% for:
             - Policy evaluator (behaviors/04-policy-evaluator.md)
             - Guard wrapper (behaviors/06-guard-adapter.md, createGuardedPort)
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
- [ ] All error codes (ACL001-ACL030) have corresponding error classes
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
- [ ] Error code allocation table (ACL001-ACL030) complete and consistent with error class implementations

### GxP Compliance (compliance/gxp.md)

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
- [ ] Key management behavioral contracts documented in compliance/gxp.md section 65c
- [ ] `SignatureMeanings` constants defined (AUTHORED, REVIEWED, APPROVED, VERIFIED, REJECTED)
- [ ] `GxPAuditEntry` type defined with non-optional `integrityHash`, `previousHash`, `signature`
- [ ] `failOnAuditError` option documented and implemented in `createGuardGraph()`
- [ ] [ADR #26](decisions/026-gxp-audit-entry-subtype.md) (GxPAuditEntry subtype rationale) documented in appendices/
- [ ] [ADR #27](decisions/027-fail-on-audit-error-default.md) (failOnAuditError default-false rationale) documented in appendices/
- [ ] Counter-signing workflow documented with code example in compliance/gxp.md section 65d
- [ ] Dual-timing strategy documented in compliance/gxp.md section 62
- [ ] `sequenceNumber` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- [ ] [ADR #30](decisions/030-per-scope-chains-sequence-numbers.md) (per-scope chains with monotonic sequence numbers) documented in appendices/
- [ ] Concurrent write ordering documented in compliance/gxp.md section 61.4a
- [ ] Hash chain computation uses pipe-delimited `join("|")` in all code examples (07 and 17)
- [ ] Validation Plan (IQ/OQ/PQ) documented in compliance/gxp.md section 67
- [ ] FMEA risk assessment with 36 failure modes (FM-01 through FM-36, 31 core + 5 ecosystem) in compliance/gxp.md section 68
- [ ] All FMEA failure modes with RPN >= 15 mitigated to residual RPN <= 10
- [ ] FMEA risk summary counts: High=18, Medium=15, Low=3 pre-mitigation; High=0, Medium=0, Low=36 post-mitigation (total 36)
- [ ] Regulatory traceability matrix (76 rows) in compliance/gxp.md section 69
- [ ] `failOnAuditError` default is `true` in all references (07, 17)
- [ ] `ReauthenticationToken` security requirements documented (CSPRNG, one-time-use, no plaintext storage/transmission, replay protection)
- [ ] `policySnapshot` field on `AuditEntry` (optional) and `GxPAuditEntry` (required)
- [ ] `traceDigest` format documented with examples (policyLabel[verdict] pattern)
- [ ] Policy change control process documented in compliance/gxp.md section 64a
- [ ] Separation of duties elevated to REQUIREMENT in section 65 (same-signer rejection per evaluationId)
- [ ] Jurisdiction-specific retention periods table in section 63
- [ ] HMAC non-repudiation note in section 65c
- [ ] GxP compliance warnings in behaviors/11-inspection.md (ring buffer, MCP audit, A2A audit-review)
- [ ] GxP compliance warning in behaviors/10-react-integration.md (React gates are UI-only)
- [ ] GxP suitability note in behaviors/07-port-gate-hook.md (not suitable as sole GxP authorization)
- [ ] `gxp: true` forces `failOnAuditError: true` — compile-time error if false + gxp:true (behaviors/06-guard-adapter.md)
- [ ] `gxp: true` rejects `NoopAuditTrail` at compile time (ACL012) and runtime (behaviors/06-guard-adapter.md)
- [ ] `gxp: true` requires `walStore` — compile-time error if omitted (behaviors/06-guard-adapter.md)
- [ ] `AuditEntry` field size limits table with max lengths documented (behaviors/06-guard-adapter.md)
- [ ] `hashAlgorithm` field on `AuditEntry` (optional) and `GxPAuditEntry` (required) — synced across 07, 14, 17
- [ ] `signerName` field on `ElectronicSignature` (optional) — synced across 07, 14
- [ ] Business continuity plan elevated from RECOMMENDED to REQUIREMENT (compliance/gxp.md §61)
- [ ] MCP/A2A meta-audit elevated from RECOMMENDED to REQUIREMENT for GxP (behaviors/11-inspection.md, compliance/gxp.md §64)
- [ ] Incident classification matrix elevated from RECOMMENDED to REQUIREMENT (compliance/gxp.md §68)
- [ ] Open-source supplier qualification guidance in Appendix G ([Open-Source Supplier Qualification](appendices/supplier-qualification.md)) with [ADR #34](decisions/034-open-source-supplier-qualification.md)
- [ ] Chain break response timing SLA documented (1h alert, 4h quarantine, 24h report) in compliance/gxp.md §61
- [ ] GxP test data: synthetic factories only, no production data in test suites (§55)
- [ ] GxP test data: test audit entries distinguishable from production entries via `testMode` flag (§55)
- [ ] Port gate hook GxP warning in JSDoc: not suitable as sole GxP authorization mechanism (§30)
- [ ] Cross-library AuditEntry forwarding preserves original signature fields (§40)
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
- [ ] Circuit breaker pattern implemented for audit trail backend with CLOSED → OPEN → HALF-OPEN state machine (§61.9)
- [ ] Multi-tenant audit trail isolation enforced: queries scoped to tenant boundary (§64)
- [ ] `dataClassification` backfill writes `DataClassificationChangeEntry` to `MetaAuditTrailPort` when `gxp: true` (§61)
- [ ] Certificate lifecycle management implemented per §65c-3 (REQ-GUARD-068)
- [ ] Signature algorithm migration follows epoch-based approach per §65c-4 (REQ-GUARD-069)
- [ ] Decommissioning archive exports conform to `guard-audit-archive` JSON Schema v1.0.0 (§70a)
- [ ] Temporal authorization: `maxScopeLifetimeMs` ceiling aligned to temporal policy granularity when `gxp: true` (§16)
- [ ] `PermissionRegistry` provides centralized permission catalog for IQ/OQ enumeration (§8)
- [ ] `MutuallyExclusiveRoles` constraint enforces role-level separation of duties (§12)
- [ ] `hashPolicy()` produces deterministic content hashes for policy change detection (§17)

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

### Error Recovery Runbook (Appendix S)

- [ ] Appendix S: Consolidated Error Recovery Runbook documented in appendices/
- [ ] Runbook includes recovery procedures for each ACL error code (ACL001-ACL030)
- [ ] Runbook includes circuit breaker recovery procedure (OPEN → HALF-OPEN → CLOSED)
- [ ] Runbook includes WAL orphan recovery procedure
- [ ] Runbook includes chain break quarantine and resolution procedure

### Implementation Verification (Appendix T)

- [ ] Test files use `@spec-ref` annotations linking tests to spec sections
- [ ] CI includes spec-conformance stage verifying: conformance suites, coverage thresholds, @spec-ref resolution
- [ ] All REQUIREMENT blocks have at least one corresponding OQ test case
- [ ] Spec modification in CI flags test files with matching @spec-ref annotations for re-review
- [ ] Conformance report artifact generated with timestamp and commit SHA

### Document Control (GxP)

- [ ] All spec files carry document control headers (Document ID, Revision, Effective Date, Author, Reviewer, Approved By, Classification, Change History)
- [ ] Document IDs follow GUARD-NN convention (GUARD-00, GUARD-00-URS, GUARD-01 through GUARD-19, GUARD-17-01 through GUARD-17-13)
- [ ] Approved By fields reference valid role titles from the Approval Authority Matrix (README.md)
- [ ] Classifications match the Document Classification Taxonomy (README.md)
- [ ] Revision management script (scripts/spec-revision.ts) automates revision bumping, date updates, and change history appending
- [ ] CI includes spec-revision-check stage validating header consistency (7 checks per Appendix T)
- [ ] Change History is append-only; prior entries never modified or removed
- [ ] Machine-readable spec-section index (spec/guard/section-index.json) exists and is validated in CI

### Vision Alignment (01-overview.md section 5)

- [ ] `GuardInspector` implements `LibraryInspector` protocol
- [ ] Guard events (guard.evaluate, guard.allow, guard.deny) flow to the central nerve cluster
- [ ] MCP resources have defined response schemas (behaviors/11-inspection.md section 48c)
- [ ] A2A skills have defined input/output schemas (behaviors/11-inspection.md section 48d)
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
7. **Guard sink ports**: Remove evaluationId from span attributes, skip event emission after evaluation, omit span error status on deny, drop signature forwarding in cross-library AuditEntry, emit exception not swallowed
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
| Guard sink ports   | >= 90%           |
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
             calibrated during PQ (compliance/gxp.md section 67c).
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

> **GxP Elevation:** When `gxp: true`, ALL three security mitigations above (evaluation timing, signature comparison, and token comparison) are elevated to REQUIREMENT. Evaluation timing resistance is now REQUIRED in GxP mode (upgraded from RECOMMENDED per GxP compliance review finding GCR-2026-001). See compliance/gxp.md section 65b-1 for the full rationale and regulatory references.

> **Non-GxP Deployments:** In non-GxP environments, all three mitigations remain RECOMMENDED. Organizations that choose not to implement constant-time padding SHOULD document this decision in their risk assessment.

### Surviving Mutations

Acceptable surviving mutations:

- Timing precision (microsecond vs millisecond)
- Log message formatting details
- DevTools event ordering within the same timestamp

---

_Previous: [15 - Appendices](./15-appendices.md) | Next: [17 - GxP Compliance Guide](./17-gxp-compliance.md)_
