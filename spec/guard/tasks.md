# @hex-di/guard -- Implementation Tasks

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-TASKS                              |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead                           |
| Classification   | Implementation Task List                 |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

Detailed implementation task breakdown grouped by 20 roadmap items. Each task group has a parent task with roadmap item reference, 3-8 subtasks with acceptance criteria, dependencies on previous groups, and spec section references.

---

## Task Group 1: Permission Tokens

**Roadmap:** Item 1 | **Spec:** Sections 5-8 | **Dependencies:** None

### 1.1 Define Permission brand and type

- Create `PERMISSION_BRAND` via `Symbol.for("@hex-di/guard/permission")`
- Define `Permission<TResource, TAction>` interface with phantom type brands
- Define `PermissionConstraint` type alias
- Acceptance: `expectTypeOf` tests pass for branding, phantom types, and constraint compatibility

### 1.2 Implement createPermission factory

- `createPermission({ resource, action })` returns branded, frozen `Permission<TResource, TAction>`
- Validate resource and action are non-empty strings
- Return frozen object with `PERMISSION_BRAND`, `resource`, and `action` fields
- Acceptance: Unit test confirms brand present, object frozen, correct resource/action values

### 1.3 Implement createPermissionGroup factory

- `createPermissionGroup(resource, actions)` returns frozen `PermissionGroupMap<TResource, TActions>`
- Two overloads: array form (`["read", "write"]`) and object form (`{ read: {}, write: { description: "..." } }`)
- Array form: iterate over array elements, create `Permission<TResource, K>` for each
- Object form: iterate over object keys, create `Permission<TResource, K>` for each, preserve `PermissionOptions` metadata
- Return frozen map object
- Acceptance: Unit tests confirm both overloads produce correct typed entries, all values are branded Permissions, map is frozen

### 1.4 Implement isPermission type guard

- `isPermission(value): value is PermissionConstraint` checks for `PERMISSION_BRAND` symbol
- Returns `false` for plain strings, plain objects, null, undefined, numbers
- Acceptance: Unit test covers all value types

### 1.5 Implement duplicate permission detection

- Track created permissions in a module-level `Map<string, boolean>`
- Emit `DuplicatePermissionWarning` (ACL006) when same `"resource:action"` created twice
- Warning is informational, does not throw
- Acceptance: Unit test creates same permission twice, verifies warning emitted

### 1.6 Write Permission type tests

- `permission-branding.test-d.ts` with `expectTypeOf` assertions
- Test: `Permission<"user","read">` not assignable to `Permission<"user","write">`
- Test: `InferResource`, `InferAction`, `FormatPermission`, `PermissionEquals`
- Test: Plain string not assignable to `Permission<string>`
- Acceptance: `pnpm test:types` passes with all 8 type tests green

---

## Task Group 2: Role Tokens

**Roadmap:** Item 2 | **Spec:** Sections 9-12 | **Dependencies:** Task Group 1

### 2.1 Define Role brand and type

- Create `ROLE_BRAND` via `Symbol.for("@hex-di/guard/role")`
- Define `Role<TName, TPermissions>` type with name, permissions, inherits
- Define `RoleConstraint` type alias
- Acceptance: `expectTypeOf` tests pass for branding and name inference

### 2.2 Implement createRole factory

- `createRole({ name, permissions, inherits? })` returns branded, frozen `Role<TName, TPermissions>`
- Validate name is non-empty string
- Validate permissions are all branded Permission tokens (using isPermission)
- Validate inherited roles are all branded Role tokens (using isRole)
- Return frozen object
- Acceptance: Unit test confirms brand, freezing, correct fields

### 2.3 Implement isRole type guard

- `isRole(value): value is RoleConstraint` checks for `ROLE_BRAND` symbol
- Returns `false` for non-role values
- Acceptance: Unit test covers positive and negative cases

### 2.4 Implement flattenPermissions

- Walk the role's inheritance DAG, collecting all permissions
- Use a visited set for cycle detection
- Return `Result<ReadonlyArray<PermissionConstraint>, CircularRoleInheritanceError>`
- Deduplicate by permission reference
- Acceptance: Unit tests for linear chain, DAG (diamond), cycle detection, dedup

### 2.5 Define CircularRoleInheritanceError

- Error class with `code: "ACL002"`, `message`, and `roleName: string`
- Cycle array contains role names in the cycle path
- Acceptance: Unit test verifies error shape and cycle path

### 2.6 Write Role type tests

- `role-inference.test-d.ts` with `expectTypeOf` assertions
- Test: `InferRoleName`, `FlattenRolePermissions`, `ValidateRoleInheritance`
- Test: Different role names produce incompatible types
- Acceptance: `pnpm test:types` passes with all 10 type tests green

---

## Task Group 3: Policy Data Types

**Roadmap:** Item 3 | **Spec:** Sections 13-17 | **Dependencies:** Task Groups 1, 2

### 3.1 Define Policy discriminated union

- Define `Policy` as union of 7 variants
- Each variant interface with literal `kind` discriminant
- Define `PolicyKind` literal union
- Define `PolicyConstraint` type alias
- Acceptance: Exhaustive switch compiles with all 7 kinds

### 3.2 Define HasPermissionPolicy

- `{ kind: "hasPermission"; permission: PermissionConstraint }`
- Acceptance: Type test confirms kind literal

### 3.3 Define HasRolePolicy

- `{ kind: "hasRole"; roleName: string }`
- Acceptance: Type test confirms kind literal

### 3.4 Define HasAttributePolicy

- `{ kind: "hasAttribute"; attribute: string; matcher: MatcherExpression }`
- Define `MatcherExpression` type (eq, neq, in, exists)
- Acceptance: Type test confirms kind literal and matcher shape

### 3.5 Define AllOfPolicy and AnyOfPolicy

- `AllOfPolicy: { kind: "allOf"; policies: ReadonlyArray<PolicyConstraint> }`
- `AnyOfPolicy: { kind: "anyOf"; policies: ReadonlyArray<PolicyConstraint> }`
- Acceptance: Type test confirms kind literals and policies array type

### 3.6 Define NotPolicy

- `{ kind: "not"; policy: PolicyConstraint }`
- Acceptance: Type test confirms kind literal and single policy field

### 3.7 Write Policy type tests

- `policy-types.test-d.ts` with `expectTypeOf` assertions
- Test: Policy is union of all variants
- Test: Each variant has literal kind
- Test: `InferPolicyRequirements` extracts permissions from composite policies
- Acceptance: `pnpm test:types` passes with all 12 type tests green

---

## Task Group 4: Policy Combinators

**Roadmap:** Item 4 | **Spec:** Sections 13-14 | **Dependencies:** Task Group 3

### 4.1 Implement hasPermission combinator

- `hasPermission(permission)` returns frozen `HasPermissionPolicy`
- Validate input is a branded Permission
- Acceptance: Unit test confirms correct kind and frozen output

### 4.2 Implement hasRole combinator

- `hasRole(roleName)` accepts a string or a branded Role token (extracts the name)
- String overload validates non-empty; Role overload validates via isRole
- Acceptance: Unit test confirms correct kind and frozen output

### 4.3 Implement hasAttribute combinator

- `hasAttribute(attribute, matcher)` returns frozen `HasAttributePolicy`
- Validate attribute is non-empty string
- Acceptance: Unit test confirms correct kind, attribute, and matcher

### 4.4 Implement allOf combinator

- `allOf(...policies)` returns frozen `AllOfPolicy`
- Accept variadic policy arguments
- Handle empty argument list (returns always-allow)
- Acceptance: Unit test confirms kind, policies array, freezing, empty edge case

### 4.5 Implement anyOf combinator

- `anyOf(...policies)` returns frozen `AnyOfPolicy`
- Accept variadic policy arguments
- Handle empty argument list (returns always-deny)
- Acceptance: Unit test confirms kind, policies array, freezing, empty edge case

### 4.6 Implement not combinator

- `not(policy)` returns frozen `NotPolicy`
- Accept exactly one policy argument
- Acceptance: Unit test confirms kind, single policy field, freezing

### 4.7 Test deep composition

- Test composing combinators to 3+ levels deep
- `allOf(hasPermission(p), anyOf(hasRole(r), not(hasPermission(q))))`
- Acceptance: Composed policy has correct nested structure

---

## Task Group 5: Policy Evaluator

**Roadmap:** Item 5 | **Spec:** Sections 18-21 | **Dependencies:** Task Groups 3, 4

### 5.1 Define Decision and EvaluationTrace types

- `Decision: { kind, reason, policy, trace, evaluationId, evaluatedAt, subjectId }`
- `Allow` and `Deny` convenience types
- `EvaluationTrace: { policyKind, label, decision, durationMs, children }`
- Acceptance: Type tests pass

### 5.2 Implement evaluate function

- `evaluate(policy, context, options?)` returns `Result<Decision, PolicyEvaluationError>`
- `EvaluateOptions` with `maxDepth?: number` (default 64); returns `Err(PolicyEvaluationError)` with code ACL003 when depth exceeded
- Dispatch on `policy.kind` to specific evaluator functions
- Measure duration via `performance.now()` or monotonic time
- Acceptance: Returns correct verdict for each policy kind, depth-limit enforcement rejects trees exceeding maxDepth

### 5.3 Implement hasPermission evaluation

- Check `context.subject.permissions` Set for the permission
- O(1) lookup via `Set.has()`
- Acceptance: Allow when present, deny when absent, correct reason string

### 5.4 Implement hasRole evaluation

- Check `context.subject.roles` array for the role via `Array.includes()`
- Acceptance: Allow when present, deny when absent, correct reason string

### 5.5 Implement hasAttribute evaluation

- Extract attribute from `context.resource`
- Apply matcher against attribute value and subject
- Acceptance: Allow when matcher passes, deny when it fails, correct reason

### 5.6 Implement allOf evaluation

- Evaluate all children sequentially
- Short-circuit on first deny
- Build trace tree with all evaluated children
- Acceptance: Denies when any child denies, allows when all allow, trace shows short-circuit

### 5.7 Implement anyOf evaluation

- Evaluate children sequentially
- Short-circuit on first allow
- Build trace tree with all evaluated children
- Acceptance: Allows when any child allows, denies when all deny, trace shows short-circuit

### 5.8 Implement not evaluation

- Evaluate child, invert verdict
- Acceptance: Inverts allow to deny and vice versa, correct reason

### 5.9 Implement maxDepth boundary tests

- Test: Policy tree at depth 63 (under default) evaluates successfully
- Test: Policy tree at depth 64 (at default) evaluates successfully
- Test: Policy tree at depth 65 (over default) returns Err(ACL003)
- Test: Custom maxDepth of 10 rejects tree at depth 11
- Test: maxDepth below RECOMMENDED minimum of 10 still works (no hard floor)
- Acceptance: All 5 boundary tests pass

---

## Task Group 6: Subject Port

**Roadmap:** Item 6 | **Spec:** Sections 22-24 | **Dependencies:** Task Groups 1, 2

### 6.1 Define SubjectProviderPort

- Well-known outbound port with scoped lifetime
- Name: `"SubjectProvider"`
- Acceptance: Port definition matches spec

### 6.2 Implement createSubjectAdapter

- `createSubjectAdapter(factory)` creates adapter providing SubjectProviderPort
- Lifetime: scoped
- Factory wraps user-provided function
- Acceptance: Adapter resolves correctly in a scoped container

### 6.3 Implement PrecomputedSubject

- On subject creation, flatten permissions via `flattenPermissions`
- Store as `ReadonlySet<string>` with `"resource:action"` keys
- Acceptance: Precomputed set matches manual Set construction from flattenPermissions result

---

## Task Group 7: Guard Adapter

**Roadmap:** Item 7 | **Spec:** Sections 25-28 | **Dependencies:** Task Groups 4, 5, 6

### 7.1 Implement guard() wrapper function

- `guard(adapter, { resolve, methodPolicies? })` returns `GuardedAdapter`
- Preserves inner adapter's provides port
- Adds `SubjectProviderPort` to requires (with dedup)
- Stores guard metadata on the returned adapter
- Acceptance: GuardedAdapter provides same port, requires includes SubjectProviderPort

### 7.2 Implement type transformation

- `GuardedAdapter<TPort, TRequires>` type preserves port, unions requires
- `AppendAclPorts<TRequires>` utility type
- Acceptance: Type tests confirm provides preserved, requires includes SubjectProviderPort

### 7.3 Implement port gate hook

- `createPortGateHook(container, options?)` installs resolution hook
- `beforeResolve`: check if port has guard metadata, evaluate policy
- On deny: throw `AccessDeniedError` (ACL001)
- On allow: proceed to factory
- Returns cleanup function
- Acceptance: Integration test confirms deny prevents resolution, allow permits it

### 7.4 Implement method-level policies

- `methodPolicies` option overrides adapter-level policy for specific methods
- Falls back to adapter-level policy for methods without override
- Acceptance: Integration test confirms method-specific policy used when present

### 7.5 Define AccessDeniedError

- Error class with `code: "ACL001"`, `message`, `decision`, `portName`, `subjectId`
- Acceptance: Error shape matches spec, carries full Decision

### 7.6 Write guard integration tests

- Full container setup with graph, guard adapter, scoped subject
- Test: admin resolves successfully
- Test: viewer denied resolution
- Test: different scopes get different subjects
- Test: guard decisions appear in tracing spans (if wired)
- Acceptance: All 25 integration tests pass

### 7.7 Write guard type tests

- `guard-types.test-d.ts` with `expectTypeOf` assertions
- Test: GuardedAdapter preserves provides
- Test: GuardedAdapter unions requires
- Test: `AppendAclPorts` adds correct ports
- Acceptance: `pnpm test:types` passes with all 10 type tests green

---

## Task Group 8: Policy Serialization

**Roadmap:** Item 8 | **Spec:** Sections 31-33 | **Dependencies:** Task Groups 3, 4, 5

### 8.1 Implement serializePolicy

- Recursive serialization dispatching on `policy.kind`
- Deterministic key ordering (kind first, then alphabetical)
- Permission serialized as `"resource:action"` string
- Acceptance: Snapshot tests for all 7 policy kinds

### 8.2 Implement deserializePolicy

- `deserializePolicy(json)` returns `Result<Policy, PolicyParseError>`
- JSON.parse with error handling
- Validate kind discriminant against known variants
- Validate required fields for each variant
- Reconstruct branded Permission/Role tokens
- Acceptance: Round-trip test for all 7 kinds, error cases for invalid input

### 8.3 Define PolicyParseError

- Error with `code: "ACL007"`, `message`, `path`, `value`, `category`
- Categories: `invalid_json`, `unknown_kind`, `missing_field`, `invalid_format`, `schema_mismatch`
- Acceptance: Error shape matches spec

### 8.4 Implement explainPolicy

- Recursive explanation builder dispatching on `policy.kind`
- Format: `"{VERDICT}: {kind} {passed|failed} -- {detail}"`
- Indented child explanations for composite policies
- Acceptance: Snapshot tests for single and composite policy explanations

### 8.5 Write round-trip tests

- For each policy kind: serialize, deserialize, compare structure
- For nested composite policies: serialize, deserialize, compare
- Acceptance: All 20 serialization tests pass

---

## Task Group 9: React SubjectProvider

**Roadmap:** Item 9 | **Spec:** Section 38 | **Dependencies:** Task Group 6

### 9.1 Create SubjectContext

- `React.createContext<PrecomputedSubject | null>(null)`
- Internal context, not exported
- Acceptance: Context created with null default

### 9.2 Implement SubjectProvider component

- Accepts `subject: AuthSubject | null` prop
- When subject is non-null, precompute permission set
- Provide `PrecomputedSubject | null` via context
- Acceptance: Children receive correct context value

### 9.3 Implement MissingSubjectProviderError

- Thrown when hooks used outside SubjectProvider tree
- Message: `"useCan/usePolicy/useSubject called outside SubjectProvider. Wrap your component tree in <SubjectProvider>."`
- Acceptance: Hooks throw with correct message when provider missing

### 9.4 Write SubjectProvider tests

- Test: children receive subject via context
- Test: null subject propagates as null
- Test: subject change updates context
- Test: hooks throw when provider missing
- Acceptance: All 8 tests pass

---

## Task Group 10: React Can/Cannot Components

**Roadmap:** Item 10 | **Spec:** Sections 39-42 | **Dependencies:** Task Group 9

### 10.1 Implement Can component

- Reads subject from context via `useCan` or `usePolicy`
- Permission prop: uses useCan for O(1) check
- Policy prop: uses usePolicy for full evaluation
- **Suspends** when subject is null (throws pending promise for Suspense protocol)
- Renders children when authorized, `fallback` when denied
- `fallback` prop is exclusively for the denied case, not loading
- Acceptance: Renders correctly for all behavior matrix states including suspension

### 10.2 Implement Cannot component

- Inverse of Can: renders children when denied, `fallback` when authorized
- **Suspends** when subject is null (throws pending promise for Suspense protocol)
- `fallback` prop is exclusively for the authorized case, not loading
- Acceptance: Renders correctly for all behavior matrix states including suspension

### 10.3 Implement fallback prop

- Both Can and Cannot accept optional `fallback: ReactNode`
- Default fallback: `null`
- `fallback` is for denied/authorized case only -- loading is handled by `<Suspense>` boundaries
- Acceptance: Fallback renders when appropriate, null by default, not rendered during loading

### 10.4 Write Can/Cannot tests

- Test: renders children when authorized
- Test: does not render when unauthorized
- Test: renders fallback when denied
- Test: suspends when subject is null (throws pending promise)
- Test: `<Suspense>` boundary renders its fallback during suspension
- Test: `fallback` prop is not rendered during loading
- Test: policy prop evaluates complex policies
- Acceptance: All 25 tests pass

---

## Task Group 11: React Hooks

**Roadmap:** Item 11 | **Spec:** Sections 40-42 | **Dependencies:** Task Groups 9, 10

### 11.1 Implement useCan hook (Suspense)

- Returns `boolean` -- **suspends** when subject is null (throws pending promise)
- O(1) lookup via precomputed permission set
- Memoized by `[permission, precomputedSubject]`
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns `true`/`false` when subject loaded, suspends when null

### 11.1b Implement useCanDeferred hook (Non-Suspense)

- Returns `CanResult` discriminated union -- never suspends
- `{ status: "pending" }` when subject is null
- `{ status: "allowed" }` when subject has permission
- `{ status: "denied", reason: string }` when subject lacks permission
- O(1) lookup via precomputed permission set
- Memoized by `[permission, precomputedSubject]`
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns correct discriminated union for all three states

### 11.2 Implement usePolicy hook (Suspense)

- Returns `Decision` -- **suspends** when subject is null (throws pending promise)
- Calls `evaluate()` memoized by `[policy, subject]`
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns full Decision when subject loaded, suspends when null

### 11.2b Implement usePolicyDeferred hook (Non-Suspense)

- Returns `PolicyResult` discriminated union -- never suspends
- `{ status: "pending" }` when subject is null
- `{ status: "resolved", decision: Decision }` when subject is loaded
- Calls `evaluate()` memoized by `[policy, subject]`
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns correct discriminated union for both states

### 11.3 Implement useSubject hook (Suspense)

- Returns `AuthSubject` -- **suspends** when subject is null (throws pending promise)
- Direct context access
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns AuthSubject when loaded, suspends when null

### 11.3b Implement useSubjectDeferred hook (Non-Suspense)

- Returns `AuthSubject | null` -- never suspends
- Direct context access
- Throws MissingSubjectProviderError outside provider
- Acceptance: Returns AuthSubject when loaded, null when not

### 11.4 Implement createGuardHooks factory

- Creates isolated React context
- Returns `{ SubjectProvider, Can, Cannot, useCan, usePolicy, useSubject, useCanDeferred, usePolicyDeferred, useSubjectDeferred }` (9 members)
- Multiple instances are independent
- Follows `createTypedHooks()` pattern from `integrations/react/src/factories/create-typed-hooks.tsx`
- Acceptance: Two instances with different subjects do not interfere

### 11.5 Export default hooks and types

- Create default hooks via `createGuardHooks()`
- Export individual components and all 6 hooks as named exports
- Export `CanResult` and `PolicyResult` types
- Acceptance: `import { SubjectProvider, useCan, useCanDeferred, CanResult, PolicyResult } from "@hex-di/guard/react"` works

### 11.6 Write hook tests

- Test useCan: suspends on null, true/false when loaded
- Test useCanDeferred: pending/allowed/denied states
- Test usePolicy: suspends on null, Decision when loaded
- Test usePolicyDeferred: pending/resolved states
- Test useSubject: suspends on null, AuthSubject when loaded
- Test useSubjectDeferred: null/AuthSubject states
- Test createGuardHooks: isolation between instances (9 members)
- Test memoization: same result across renders with same inputs
- Acceptance: All 28 tests pass

---

## Task Group 12: DevTools Integration

**Roadmap:** Item 12 | **Spec:** Sections 43-44 | **Dependencies:** Task Groups 5, 7

### 12.1 Implement GuardInspector

- Implements `LibraryInspector` protocol from `@hex-di/core`
- Emits `guard.evaluate`, `guard.allow`, `guard.deny` events
- Maintains snapshot state: active policies, recent decisions, permission stats
- Acceptance: Events emitted correctly, snapshot reflects evaluation history

### 12.2 Implement ring buffer for recent decisions

- Fixed-size buffer (configurable, default 100)
- RECOMMENDED minimums: 100 default, 200 production, 500-1000 high-throughput
- Oldest entry evicted when full
- Acceptance: Buffer never exceeds max size, minimum size guidance documented

### 12.3 Implement permission statistics

- Track allow/deny counts: total, per-port, per-subject
- Update on each evaluation
- Acceptance: Stats match manual count of evaluations

### 12.4 Implement active policies tracking

- Register policies when guard adapters are installed
- Map of port name to serialized policy string
- Acceptance: Active policies map reflects all guarded ports

### 12.5 Implement clear method

- Resets recent decisions, permission stats
- Does not clear active policies (those are structural)
- Acceptance: Clear resets counts and buffer, preserves policy map

### 12.6 Write inspector tests

- Test event emission for evaluate/allow/deny
- Test ring buffer eviction
- Test statistics aggregation
- Test clear behavior
- Acceptance: All 10 tests pass

---

## Task Group 13: GxP Compliance

**Roadmap:** Cross-cutting | **Spec:** 17-gxp-compliance.md | **Dependencies:** Task Groups 7, 12

### 13.1 Implement complete AuditEntry construction

- Guard wrapper constructs `AuditEntry` from `Decision` with all required fields:
  - `evaluationId`, `timestamp`, `subjectId`, `authenticationMethod`, `policy`, `decision`, `portName`, `scopeId`, `reason`, `durationMs`
- `reason` is empty string for Allow (not undefined)
- Audit recording happens BEFORE the allow/deny action
- Acceptance: Unit test verifies all required fields populated for both Allow and Deny

### 13.2 Implement traceDigest computation

- Compact string summarizing the evaluation trace tree for audit review
- Format: `"allOf[deny] > hasPermission(user:read)[allow], hasRole(admin)[deny]"`
- Acceptance: Snapshot test for single and composite policy trace digests

### 13.3 Implement MemoryAuditTrail with chain verification

- `MemoryAuditTrail` in `@hex-di/guard-testing` with:
  - `getEntries()` returns entries in insertion order
  - `validateEntry(index)` checks hash against predecessor
  - `validateChain()` verifies full chain from genesis
  - `assertAllEntriesValid()` throws on first invalid
  - `query(predicate)` filters entries
- Acceptance: Chain validation passes for sequential writes, fails for tampered entries

### 13.4 Implement integrity hash computation

- SHA-256 hash chain: `hash(evaluationId + timestamp + subjectId + authenticationMethod + policy + decision + portName + scopeId + reason + String(durationMs) + previousHash)`
- `hashAlgorithm` field on `AuditEntry` (optional) and `GxPAuditEntry` (required) records the algorithm used
- Genesis entry uses empty string as previousHash
- Acceptance: Deterministic hash output for known inputs, chain validates end-to-end, hashAlgorithm field populated on every entry

### 13.5 Write GxP integration tests

- Test: All required AuditEntry fields populated for Allow decision
- Test: All required AuditEntry fields populated for Deny decision
- Test: Audit recording happens before AccessDeniedError throw
- Test: AuditTrail write failure does not block resolution
- Test: Hash chain integrity validates after 100 sequential evaluations
- Test: NoopAuditTrail discards entries without error
- Acceptance: All 6 GxP integration tests pass

### 13.6 Write ClockSource tests

- Test: SystemClock produces ISO 8601 UTC format
- Test: Injectable clock produces deterministic timestamps
- Test: createGuardGraph uses SystemClock when clock option omitted
- Acceptance: All 3 clock tests pass

---

## Task Group 14: Vision Integration

**Roadmap:** Cross-cutting | **Spec:** 01-overview.md section 5, 12-inspection.md sections 44c-44d | **Dependencies:** Task Group 12

### 14.1 Define MCP resource response types

- TypeScript interfaces for each MCP resource response:
  - `GuardSnapshotResponse`, `GuardPoliciesResponse`, `GuardDecisionsResponse`, `GuardStatsResponse`, `GuardAuditResponse`
- Acceptance: Types defined and exported from `@hex-di/guard`

### 14.2 Define A2A skill input/output types

- TypeScript interfaces for each A2A skill:
  - `InspectPoliciesInput/Output`, `AuditReviewInput/Output`, `ExplainDecisionInput/Output`
- Acceptance: Types defined and exported from `@hex-di/guard`

### 14.3 Implement guard.explain-decision A2A skill

- Given an evaluationId or subject+port, returns human-readable explanation
- Uses `explainPolicy()` for text rendering and `EvaluationTrace` for structured data
- Supports simulation: evaluate a policy against a hypothetical subject
- Acceptance: Correct explanation for Allow, Deny, and composite policies

### 14.4 Write MCP/A2A type tests

- Type tests verifying that response types match the JSON schemas in 12-inspection.md
- Acceptance: `pnpm test:types` passes

---

## Task Group 15: Electronic Signatures

**Roadmap:** Cross-cutting | **Spec:** 04 (HasSignaturePolicy), 05 (hasSignature evaluation), 07 (SignatureServicePort), 09 (serialization), 17 sections 65a-65d | **Dependencies:** Task Groups 3, 4, 5, 7, 13

### 15.1 Define SignatureService interface and types

- Define `SignatureService` interface with `capture()`, `validate()`, `reauthenticate()` methods
- Define `ElectronicSignature` with `reauthenticated` field
- Define `SignatureCaptureRequest`, `ReauthenticationChallenge`, `ReauthenticationToken`, `SignatureValidationResult` types
- Define `SignatureError` with `code: "ACL009"` and 7 category discriminants
- Acceptance: All types compile, type tests pass

### 15.2 Define SignatureServicePort

- Create optional outbound port (category: "compliance", lifetime: singleton)
- Name: `"SignatureService"`
- Acceptance: Port definition matches spec, port is optional (not in base requires)

### 15.3 Define HasSignaturePolicy and hasSignature combinator

- Add `HasSignaturePolicy<TMeaning>` to Policy discriminated union (7th variant)
- Fields: `kind: "hasSignature"`, `meaning: TMeaning`, `signerRole?: string`
- `hasSignature(meaning, options?)` returns frozen `HasSignaturePolicy`
- Update `PolicyKind` to include `"hasSignature"`
- Acceptance: Exhaustive switch compiles with all 7 kinds, combinator returns correct shape

### 15.4 Implement hasSignature evaluation

- Add `ValidatedSignature` to `EvaluationContext` as optional field
- Add `case "hasSignature"` to evaluator tree traversal:
  - Deny if no signature in context
  - Deny if meaning mismatch
  - Deny if signerRole specified but signer lacks role
  - Deny if validated === false
  - Allow otherwise
- Acceptance: Unit tests cover all 5 evaluation paths

### 15.5 Implement serialization for hasSignature

- Add `hasSignature` row to JSON schema table
- `serializePolicy` produces `{ kind: "hasSignature", meaning, signerRole? }`
- `deserializePolicy` validates required `meaning` field and optional `signerRole`
- `explainPolicy` produces human-readable output for hasSignature
- Acceptance: Round-trip serialization test passes, explain output correct

### 15.6 Define SignatureMeanings constants

- `SignatureMeanings` frozen object with 5 entries: AUTHORED, REVIEWED, APPROVED, VERIFIED, REJECTED
- `SignatureMeaning` type as union of const values
- Acceptance: Constants exported, type infers correct literal union

### 15.7 Implement MemorySignatureService

- `createMemorySignatureService(options?)` with HMAC-SHA256 via Node.js `crypto`
- Token validity configurable (default 5 min)
- Operation tracking: `getOperations()`, `getOperationsByKind()`
- `revokeKey(keyId)`: prevents capture, marks validate as keyActive: false
- `clear()`: resets all state
- Acceptance: Unit tests verify real crypto, operation tracking, key revocation, clear

### 15.8 Implement NoopSignatureServiceAdapter

- `NoopSignatureService` returns Err for all operations with category "missing_service"
- GxP warning in JSDoc
- `createNoopSignatureServiceAdapter()` factory
- Acceptance: All operations return Err(SignatureError), warning present

### 15.9 Update createGuardGraph

- Accept optional `signatureAdapter` parameter
- When `signatureAdapter` is provided, register `SignatureServicePort` in the graph
- When absent and `hasSignature` is in policy tree, use `NoopSignatureService`
- Guard wrapper resolves `SignatureServicePort` only when `hasSignature` is in the policy tree
- Acceptance: Integration test confirms optional registration and fallback behavior

### 15.10 Write electronic signature integration tests

- Test: Full signature workflow (reauthenticate -> capture -> validate)
- Test: hasSignature policy with valid signature -> allow
- Test: hasSignature policy with no signature -> deny
- Test: hasSignature policy with wrong meaning -> deny
- Test: hasSignature policy with expired reauth token -> deny
- Test: Key rotation: old signatures still validate, new captures use new key
- Test: Key revocation: capture fails, validate returns keyActive: false
- Test: NoopSignatureService denies all hasSignature policies
- Test: Audit trail includes signature data when present
- Test: Guard inspection events for signature operations
- Acceptance: All 10 integration tests pass

### 15.11 Implement account lockout for SignatureService.reauthenticate()

- Define `AccountLockoutPolicy` with `maxAttempts`, `lockoutDurationMs`, `resetAfterMs` fields
- `reauthenticate()` tracks consecutive failure count per signerId
- After `maxAttempts` consecutive failures, reject with `SignatureError` category `"reauth_locked_out"`
- Lockout auto-expires after `lockoutDurationMs`
- Successful reauthentication resets the failure counter
- Lockout events produce audit entries (via the guard audit trail)
- Acceptance: Unit tests verify lockout trigger, auto-expiry, reset on success, audit entry production

---

## Task Group 16: GxP Spec Fixes

**Roadmap:** Cross-cutting | **Spec:** 05, 07, 13, 14, 15, 16, 17 | **Dependencies:** Task Groups 7, 13, 15

> **Note:** These tasks describe the spec changes applied in the GxP minor-gap fix round. Implementation follows the same acceptance criteria — the code must match the updated spec definitions.

### 16.1 Update EvaluationContext to signatures array

- Change `readonly signature?: ValidatedSignature` to `readonly signatures?: ReadonlyArray<ValidatedSignature>` in `05-policy-evaluator.md`
- Update JSDoc to explain array semantics for maker-checker workflows
- Rewrite `case "hasSignature"` to use `context.signatures?.find(s => s.meaning === meaning)`
- Update deny reason to be context-aware ("No signatures provided" vs "No signature with meaning X found in N provided signature(s)")
- Acceptance: All `hasSignature` evaluation paths work with array, no remaining `context.signature` references

### 16.2 Document counter-signing workflow

- Add "Counter-Signing and Witness Signatures" subsection to `17-gxp-compliance/07-electronic-signatures.md` section 65d
- Include code example with `allOf(hasSignature(AUTHORED, {signerRole:"author"}), hasSignature(VERIFIED, {signerRole:"witness"}))`
- Document sequential capture, independent re-auth, separation of duties constraint
- Acceptance: Counter-signing subsection exists with code example and behavioral description

### 16.3 Define GxPAuditEntry type

- Add `interface GxPAuditEntry extends AuditEntry` to `07-guard-adapter.md` with non-optional `integrityHash`, `previousHash`, `signature`, `hashAlgorithm`
- Add JSDoc referencing ADR #26
- Mirror definition in `14-api-reference.md`
- Acceptance: `GxPAuditEntry` appears in both files with matching definitions

### 16.4 Add failOnAuditError option

- Add `readonly failOnAuditError?: boolean` to both `createGuardGraph` signatures in `07-guard-adapter.md`
- Add JSDoc explaining default `true` behavior and explicit opt-in `false` behavior
- Update execution flow step 5 to branch on `failOnAuditError`
- Add edge case row for `failOnAuditError: true` and audit write failure
- Mirror in `14-api-reference.md` createGuardGraph signature
- Acceptance: `failOnAuditError` documented in both files and in execution flow

### 16.5 Document dual-timing strategy

- Add "Timing Strategy: Dual-Clock Architecture" subsection to `17-gxp-compliance/03-clock-synchronization.md` section 62
- Include comparison table: ClockSource.now() vs performance.now()
- Cross-reference authoritative source locations
- Acceptance: Timing strategy subsection exists with table and cross-references

### 16.6 Sync API reference

- Fix `EvaluationContext` in `14-api-reference.md` to include `signatures` field (INCON-A)
- Fix `createGuardGraph` in `14-api-reference.md` to use options-object signature (INCON-B)
- Add `GxPAuditEntry` to `14-api-reference.md`
- Acceptance: No remaining inconsistencies between API reference and spec files

### 16.7 Update Definition of Done

- Add 3 verification items to DoD 5 (multi-signature array evaluation)
- Add 5 verification items to DoD 7 (failOnAuditError, GxPAuditEntry, multi-signature capture)
- Add 2 items to DoD 15 (counter-signing)
- Add 5 GxP compliance checklist items
- Update test counts: DoD 5 unit 35→38, DoD 7 unit 30→33 + integration 20→23, DoD 15 integration 10→12
- Update totals: unit 263→269, integration 36→41, grand total 353→364
- Acceptance: All test counts consistent, all new verification items present

### 16.8 Update glossary, ADRs, and type diagram

- Add ADRs #26 (GxPAuditEntry) and #27 (failOnAuditError) to `15-appendices.md`
- Add GxPAuditEntry, Counter-Signing, Dual-Timing Strategy to glossary
- Add `GxPAuditEntry extends AuditEntry` block to type diagram
- Update `ValidatedSignature` note in diagram to reference `signatures` array
- Update MemoryAuditTrail note in `13-testing.md` for GxP compatibility
- Acceptance: ADR table has 29 rows, glossary has 3 new entries, diagram updated

### 16.9 Change failOnAuditError default to true

- Update `createGuardGraph` in `07-guard-adapter.md`: change `Default: false` to `Default: true`
- Swap bullet order: `true` (default) first, `false` (explicit opt-in) second
- Add GxP note about 21 CFR 11.10(e) completeness requirement
- Update execution flow step 5: `true` listed first as default
- Update edge case table: add "(default)" annotation to the `true` row
- Mirror in `14-api-reference.md`
- Acceptance: All `failOnAuditError` references consistently show `true` as default

### 16.10 ReauthenticationToken security requirements and session interruption detection

- Insert "ReauthenticationToken Security Requirements" subsection in `07-guard-adapter.md` after the interface definition
- 5 REQUIREMENT blocks: CSPRNG generation, one-time-use/session-bound, no plaintext disk storage, no plaintext network transmission, replay protection
- Implementation guidance for single-process (in-memory Set) and distributed (Redis/Memcached)
- 4 concrete session interruption detection strategies: idle timeout, OS lock-screen detection, heartbeat monitoring, Browser Visibility API
- Acceptance: Security requirements subsection exists with 5 REQUIREMENTs and implementation guidance, session interruption strategies documented

### 16.11 Hash chain delimiter and HMAC option

- Fix hash chain formula in `07-guard-adapter.md` to use `[...fields].join("|")` instead of raw concatenation
- Add `const FIELD_DELIMITER = "|"` with comment explaining ambiguity prevention in `17-gxp-compliance.md`
- Fix all hash chain code blocks (genesis, subsequent, verification) in both files
- Add "HMAC-SHA256 Option" subsection with key management requirements (HSM/keystore)
- Add HMAC non-repudiation note after algorithms table in section 65c
- Acceptance: All hash formulas use `join("|")`, HMAC option documented with key storage requirements

### 16.12 policySnapshot field and traceDigest format

- Add `readonly policySnapshot?: string` to `AuditEntry` in `07-guard-adapter.md`
- Add `readonly policySnapshot: string` to `GxPAuditEntry`
- Replace terse `traceDigest` JSDoc with format spec: `policyLabel[verdict]` pattern with 3 examples
- Acceptance: `policySnapshot` field present on both types, `traceDigest` format documented

### 16.13 Separation of duties REQUIREMENT

- Replace informal paragraph in `17-gxp-compliance/07-electronic-signatures.md` section 65 with formal REQUIREMENT block
- Require `SignatureService.capture()` to reject same-signer duplicates within an evaluation
- Add RECOMMENDED note about optional `enforceSeparation: boolean` parameter
- Add consumer implementation note referencing `evaluationId` for per-evaluation tracking
- Add checklist items to section 66
- Acceptance: Separation of duties is a formal REQUIREMENT with per-evaluationId enforcement

### 16.14 Policy change control process (section 64a)

- Insert new section "64a. Policy Change Control" in `17-gxp-compliance/06-administrative-controls.md` between sections 64 and 65
- Significant change criteria table (6 criteria)
- Minimum documentation artifacts (5 REQUIREMENT items)
- Policy change log guidance (RECOMMENDED: git commit history)
- Re-validation triggers (6 REQUIREMENT triggers for full OQ)
- Update traceability matrix 11.10(e) row to reference section 64a
- Acceptance: Section 67a exists with change criteria, documentation requirements, and re-validation triggers

### 16.15 GxP warnings in inspection, React, and port-gate files

- Add ring buffer WARNING in `12-inspection.md` section 43
- Add MCP `hexdi://guard/audit` WARNING in `12-inspection.md`
- Add A2A `guard.audit-review` WARNING and `dataSource` field in `12-inspection.md`
- Add "GxP Compliance Warning" section in `11-react-integration.md` (5 things React gates do NOT do)
- Add optional `onDecision` callback with `ClientDecisionEvent` interface
- Add GxP suitability note in `08-port-gate-hook.md`
- Acceptance: All 3 files have appropriate GxP warnings/caveats

### 16.16 FMEA counts fix and FM-15

- Add FM-15 row: crash between evaluation and audit write (S=5, L=1, D=4, RPN=20, mitigated to 10)
- Fix risk summary counts: High=6, Medium=7, Low=2 (total 15)
- Update prose: "All 20 failure modes..."
- Update FMEA references in DoD 13 to 20
- Acceptance: FMEA table has 15 rows, summary counts are arithmetically correct

### 16.17 Jurisdiction retention and HMAC non-repudiation note

- Add jurisdiction-specific retention table (7 rows) in section 63
- Add RECOMMENDED note to consult site compliance team
- Add HMAC non-repudiation blockquote after algorithms table in section 65c
- Acceptance: Retention table with 7 jurisdictions, non-repudiation note present

### 16.18 Security testing considerations and test count updates

- Add "Security Testing Considerations" subsection in `16-definition-of-done.md`
- 3 RECOMMENDED items: timing attack resistance, constant-time signature comparison, constant-time token comparison
- Update test counts: DoD 7 (35/25), DoD 9 (10), DoD 12 (12), DoD 13 (16/12), DoD 15 (14 integration)
- Update grand total: 281 unit + 54 type + 51 integration = 386 total
- Add 9 new verification checklist items
- Acceptance: Security testing section exists, all test counts updated consistently

---

## Task Group 17: GxP Validation, Risk, and Traceability

**Roadmap:** Cross-cutting | **Spec:** Sections 58.4a, 64-66 | **Dependencies:** Task Groups 13, 15, 16

### 17.1 Add sequenceNumber to AuditEntry and GxPAuditEntry

- Add `readonly sequenceNumber?: number` to `AuditEntry` (optional)
- Add `readonly sequenceNumber: number` to `GxPAuditEntry` (required)
- Mirror in `14-api-reference.md`
- Acceptance: Both types compile, sequenceNumber optional in base, required in GxP subtype

### 17.2 Document concurrent audit trail strategy (section 61.4a)

- Add subsection 4a "Concurrent Write Ordering" to section 61
- Document per-scope chain architecture
- Include deployment model table (single-process, concurrent scopes, multi-process, distributed)
- Reference ADR #30
- Acceptance: Section 61.4a exists with requirements, table, and ADR reference

### 17.3 Add ADR #30 to appendices

- Add row 30 to ADR table in `15-appendices.md`
- Update summary text from "29 key decisions" to "30 key decisions"
- Acceptance: ADR table has 30 rows

### 17.4 Write Validation Plan (section 67)

- Add IQ checklist (7 items) with IQ report template
- Add OQ checklist (10 items) with OQ report template
- Add PQ checklist (7 items) with PQ report template; PQ-7 has configurable soak duration
- Add Validation Report template
- Acceptance: Section 67 with 4 subsections (67a-67d) exists in 17-gxp-compliance/09-validation-plan.md

### 17.5 Write Risk Assessment FMEA (section 68)

- Add scoring methodology (Severity, Likelihood, Detectability)
- Add 20 failure modes with pre-mitigation and post-mitigation RPN
- Include mitigation text referencing specific spec sections and ADRs
- Add risk summary table
- Acceptance: Section 68 with 20 failure modes, all RPN >= 15 mitigated to <= 10

### 17.6 Write Traceability Matrix (section 69)

- Add FDA 21 CFR Part 11 table (10 rows)
- Add EU GMP Annex 11 table (7 rows)
- Add ALCOA+ table (9 rows)
- Each row references spec sections, DoD items, and test counts
- Acceptance: Section 69 with 26 total rows across 3 tables

### 17.7 Add glossary terms to appendices

- Add 8 new terms: IQ, OQ, PQ, FMEA, RPN, Traceability Matrix, Sequence Number, VMP
- Each term references the corresponding section
- Acceptance: Appendix C glossary has 8 new entries

### 17.8 Update DoD 13 and test counts

- Add sequenceNumber, concurrent chains, validation plan, FMEA, traceability matrix to DoD 13 requirements
- Update DoD 13 test counts: unit 10→14, integration 6→10 (total 16→24)
- Add 12 new verification checklist items
- Update grand totals: unit 269→281, integration 41→51, total 364→386
- Acceptance: All test counts sum correctly, verification items present

### 17.9 Implement concurrent chain tests in MemoryAuditTrail

- Test: 10 concurrent scopes x 100 entries each, all chains validate independently
- Test: sequenceNumber monotonically increasing within each scope
- Test: Gap detection identifies missing sequence number
- Test: Cross-scope ordering not required (scopes are independent)
- Acceptance: All 4 concurrent chain tests pass

---

## Task Group 18: Field-Level Access Control

**Roadmap:** Cross-cutting | **Spec:** 04, 05, 07, 09, 14 | **Dependencies:** Task Groups 3, 5, 7, 8

### 18.1 Add fields to HasPermissionPolicy and HasAttributePolicy

- Add `readonly fields?: ReadonlyArray<string>` to `HasPermissionPolicy` and `HasAttributePolicy` interfaces
- Fields represent the set of resource fields this policy grants visibility to
- When omitted, the policy grants visibility to all fields (backward compatible)
- Acceptance: Type tests confirm optional fields property on both policy variants, existing policies without fields still compile

### 18.2 Add fieldMatch to MatcherKind and MatcherExpression

- Add `"fieldMatch"` to `MatcherKind` literal union
- Add `FieldMatchExpression: { kind: "fieldMatch"; fields: ReadonlyArray<string> }` to `MatcherExpression` union
- Implement `fieldMatch(fields)` builder returning frozen `FieldMatchExpression`
- Validate fields array is non-empty
- Acceptance: Exhaustive switch compiles with fieldMatch, builder returns correct shape, empty array rejected

### 18.3 Update hasPermission and hasAttribute combinators with fields option

- Add optional `options?: { fields?: ReadonlyArray<string> }` parameter to `hasPermission()` combinator
- Add optional `options?: { fields?: ReadonlyArray<string> }` parameter to `hasAttribute()` combinator
- When `fields` provided, set `fields` on the returned policy object
- When omitted, returned policy has no `fields` property
- Acceptance: Unit tests confirm fields propagated when provided, absent when omitted

### 18.4 Add visibleFields to Allow interface on Decision

- Add `readonly visibleFields?: ReadonlyArray<string>` to `Allow` type
- When present, indicates the intersection of fields the subject is allowed to see
- When absent, the subject has access to all fields
- Acceptance: Type test confirms visibleFields is optional on Allow, not present on Deny

### 18.5 Implement visibleFields propagation in evaluator

- In `hasPermission` evaluation: when policy has `fields` and decision is Allow, set `visibleFields` to policy's `fields`
- In `hasAttribute` evaluation: when policy has `fields` and decision is Allow, set `visibleFields` to policy's `fields`
- When policy has no `fields`, Allow decision has no `visibleFields` (full access)
- Acceptance: Unit tests confirm visibleFields set on Allow when policy has fields, absent when policy has no fields

### 18.6 Implement intersectVisibleFields for allOf and anyOf field merging

- `intersectVisibleFields(decisions: ReadonlyArray<Allow>): ReadonlyArray<string> | undefined`
- For `allOf`: intersection of all children's visibleFields (most restrictive)
- For `anyOf`: union of all children's visibleFields (most permissive)
- When any child has no visibleFields (full access): allOf uses the other children's fields, anyOf returns undefined (full access)
- When all children have no visibleFields: return undefined
- Acceptance: Unit tests for intersection, union, mixed full-access/restricted, all-full-access cases

### 18.7 Define FieldMaskContextPort and FieldMaskContext

- Define `FieldMaskContext: { readonly visibleFields: ReadonlyArray<string> }`
- Define `FieldMaskContextPort` as optional outbound port (category: "access-control", lifetime: scoped)
- When Allow decision has `visibleFields`, register `FieldMaskContext` in scope
- Consumers can resolve `FieldMaskContextPort` to filter response fields
- Acceptance: Integration test confirms FieldMaskContext available in scope after Allow with visibleFields

### 18.8 Add fields serialization and deserialization

- Update `serializePolicy` to include `fields` array when present on HasPermissionPolicy and HasAttributePolicy
- Update `deserializePolicy` to parse and validate optional `fields` array (must be array of strings if present)
- Update `fieldMatch` matcher serialization/deserialization
- Add `fieldMatch` to validation (PolicyParseError for invalid fields)
- Acceptance: Round-trip tests for policies with and without fields, fieldMatch matcher round-trip, validation error for non-array fields

---

## Task Group 19: Write-Ahead Log (WAL)

**Roadmap:** Cross-cutting | **Spec:** 07, 13, 17 | **Dependencies:** Task Groups 7, 13

### 19.1 Define WalIntent, WalStore, and WalError interfaces

- Define `WalIntent: { readonly intentId: string; readonly evaluationId: string; readonly auditEntry: AuditEntry; readonly status: "pending" | "committed" | "failed"; readonly createdAt: string }`
- Define `WalStore` interface with `write(intent): Result<void, WalError>`, `commit(intentId): Result<void, WalError>`, `recover(): Result<ReadonlyArray<WalIntent>, WalError>`, `prune(before: string): Result<number, WalError>`
- Define `WalError` with `code: "ACL010"` and categories: `write_failed`, `commit_failed`, `recovery_failed`, `prune_failed`, `duplicate_intent`
- Acceptance: All types compile, type tests pass for discriminated WalError categories

### 19.2 Implement createWalAuditTrail wrapping factory

- `createWalAuditTrail(inner: AuditTrail, walStore: WalStore): AuditTrail`
- Write flow: WAL write → inner audit write → WAL commit
- On inner write failure: WAL intent remains pending for crash recovery
- On WAL write failure: propagate error (audit not attempted)
- Acceptance: Unit tests confirm write-commit sequence, inner failure leaves pending intent, WAL failure propagates

### 19.3 Add gxp and walStore options to createGuardGraph

- Add `readonly gxp?: boolean` to `createGuardGraph` options
- Add `readonly walStore?: WalStore` to `createGuardGraph` options
- When `gxp: true` and `walStore` provided: wrap audit trail with `createWalAuditTrail`
- When `gxp: true` and `walStore` omitted: type error (walStore required when gxp is true)
- When `gxp: false` or omitted: walStore is optional, ignored if provided
- Acceptance: Integration test confirms WAL wrapping when gxp + walStore, type test confirms walStore required when gxp true

### 19.4 Implement type-level GxP enforcement

- When `gxp: true`: reject `NoopAuditTrail` as auditTrail option (type error)
- When `gxp: true`: require `walStore` option (type error if omitted)
- When `gxp: true`: require `failOnAuditError: true` (type error if set to false)
- Use conditional types to narrow the options interface based on `gxp` flag
- Acceptance: Type tests confirm all 3 constraints enforced at compile time, non-gxp mode unrestricted

### 19.5 Implement createMemoryWalStore in guard-testing

- `createMemoryWalStore(): WalStore & { getIntents(): ReadonlyArray<WalIntent>; getPendingIntents(): ReadonlyArray<WalIntent>; clear(): void }`
- In-memory Map<string, WalIntent> storage
- `recover()` returns all pending intents
- `prune(before)` removes committed intents older than threshold
- Acceptance: Unit tests for write/commit/recover/prune lifecycle, getIntents inspection

### 19.6 Add WAL crash recovery tests

- Test: Normal flow — intent written, audit committed, intent committed
- Test: Crash simulation — intent written, audit committed, commit skipped → recovery finds pending intent
- Test: Duplicate intent detection — same intentId rejected
- Test: Startup recovery — recover pending intents, replay to inner audit trail
- Test: Prune removes only committed intents older than threshold
- Test: Concurrent intents from different scopes do not interfere
- Acceptance: All 6 crash recovery tests pass

### 19.7 Update GxP compliance documentation

- Elevate RECOMMENDED items to REQUIREMENT when `gxp: true` mode is active
- Document WAL behavioral contract: write-before-commit, crash recovery, at-least-once delivery
- Add WAL to FMEA (FM-16: WAL write failure, FM-17: WAL recovery failure)
- Update traceability matrix with WAL coverage for 21 CFR 11.10(e) completeness
- Acceptance: GxP docs updated, FMEA has 20 failure modes, traceability matrix references WAL

---

## Task Group 20: Validation Runners

**Roadmap:** Cross-cutting | **Spec:** 01, 17 (section 67e) | **Dependencies:** Task Groups 13, 17

### 20.1 Create guard-validation package scaffold

- Create `packages/guard-validation/` with `package.json`, `tsconfig.json`, `eslint.config.js`
- Package name: `@hex-di/guard-validation`
- Dependencies: `@hex-di/guard`, `@hex-di/guard-testing`, `vitest` (peer)
- Export entry point: `src/index.ts`
- Acceptance: Package builds, lints, and is recognized by pnpm workspace

### 20.2 Define validation types

- `QualificationCheck: { readonly name: string; readonly status: "pass" | "fail" | "skip"; readonly detail: string; readonly duration?: number }`
- `IQResult: { readonly checks: ReadonlyArray<QualificationCheck>; readonly passed: boolean; readonly timestamp: string; readonly version: string }`
- `OQResult: { readonly checks: ReadonlyArray<QualificationCheck>; readonly passed: boolean; readonly timestamp: string; readonly testSuites: ReadonlyArray<string>; readonly totalTests: number; readonly failedTests: number }`
- `TraceabilityMatrix: { readonly rows: ReadonlyArray<TraceabilityRow>; readonly generatedAt: string; readonly specVersion: string }`
- `TraceabilityRow: { readonly regulation: string; readonly clause: string; readonly requirement: string; readonly specSections: ReadonlyArray<string>; readonly dodItems: ReadonlyArray<string>; readonly testCount: number }`
- Acceptance: All types compile, type tests pass

### 20.3 Implement runIQ

- `runIQ(): Promise<IQResult>` — Installation Qualification
- Checks: package version present, dependencies resolve, TypeScript compiler version, ESLint config present, no known vulnerabilities (optional), Node.js version compatible, build artifacts exist
- Each check returns QualificationCheck with pass/fail/skip
- Acceptance: Unit tests for each check path (pass and fail), overall result aggregation

### 20.4 Implement runOQ

- `runOQ(options?: { testGlobs?: ReadonlyArray<string> }): Promise<OQResult>` — Operational Qualification
- Integrates with vitest Node API to run test suites programmatically
- Reports per-suite pass/fail with test counts
- Aggregates total/failed counts
- Default glob: `"**/*.test.ts"` within guard packages
- Acceptance: Integration test confirms vitest invocation, result aggregation, pass/fail reporting

### 20.5 Implement generateTraceabilityMatrix

- `generateTraceabilityMatrix(): TraceabilityMatrix`
- Generates 26-row regulatory mapping across 3 tables:
  - FDA 21 CFR Part 11 (10 rows)
  - EU GMP Annex 11 (7 rows)
  - ALCOA+ (9 rows)
- Each row maps regulation clause → spec sections → DoD items → test count
- Acceptance: Matrix has 26 rows, all spec section references valid, test counts match DoD

### 20.6 Implement runPQ

- `runPQ(options?: { soakDurationMs?: number }): Promise<PQResult>` — Performance Qualification
- Runs 8 PQ checks programmatically (PQ-1 through PQ-8)
- PQ-7 soak duration configurable via soakDurationMs (default: 3_600_000 = 1 hour)
- RECOMMENDED: 8-24 hours for mission-critical, 72 hours for 24/7 systems
- Reports per-check pass/fail with measured values
- Acceptance: PQ-1 through PQ-8 execute, soakDurationMs parameter accepted, PQ-7 runs for the configured duration

## Task Group 21: GxP Runtime Utilities

**Roadmap:** Cross-cutting | **Spec:** 07 (guard adapter), 12 (inspection), 17 (GxP compliance) | **Dependencies:** Task Groups 7, 13, 19

### 21.1 Implement checkGxPReadiness() enhancements

- Add item 13 check: ports with PortGateHook but no guard() wrapper
- When `gxp: true`, reject at construction time (ConfigurationError) for missing guard wrappers
- Add item 14 check: SignatureServicePort presence when hasSignature policies exist (ACL011)
- Acceptance: checkGxPReadiness detects both conditions, ConfigurationError thrown in GxP mode

### 21.2 Implement createGuardHealthCheck() extensions

- Include completeness monitor results in health check response
- Include WAL pending intent count in health check response
- Include clock drift check result
- Acceptance: Health check reports completeness discrepancies and WAL orphans

### 21.3 Implement createCompletenessMonitor()

- Per-port resolution and audit write counters
- `queryCompleteness(portName)` method returning `{ resolutions, auditEntries, discrepancy }`
- `queryAll()` method returning all monitored ports
- Integration with `createGuardHealthCheck()`
- Configurable tolerance for in-flight evaluations
- WARNING log on discrepancy exceeding tolerance
- Acceptance: Unit tests verify counter tracking, discrepancy detection, tolerance, health check integration

### 21.4 Implement MetaAuditTrailPort and MetaAuditEntry

- Define `MetaAuditEntry` type matching 12-inspection.md and 14-api-reference.md
- Define `MetaAuditTrailPort` with `recordAccess()` method
- Integrate with QueryableAuditTrail: every query/export/verification produces a meta-audit entry
- Integrate with A2A `guard.explain-decision`: simulations produce `simulated: true` entries
- Require authentication on MCP/A2A endpoints when `gxp: true`
- Acceptance: Meta-audit entries produced for all audit trail access types, simulation flag works

---

## Task Group 22: System Decommissioning Tooling

**Roadmap:** Cross-cutting | **Spec:** 15 (appendices), 17 (GxP compliance section 70) | **Dependencies:** Task Groups 13, 19, 21

### 22.1 Document decommissioning checklist

- Create decommissioning procedure in 15-appendices.md
- Include: notification period, data export, chain verification, archive storage, access revocation
- Define retention period per regulatory framework
- Acceptance: Checklist documented, referenced from DoD 24

### 22.2 Implement audit trail archival export

- Export function produces a complete audit trail archive with manifest
- Chain integrity verification before archival (reject if gaps or integrity violations)
- Decommissioning event recorded as final audit entry
- Archive manifest includes entry count, date range, chain status, hash algorithm
- Acceptance: End-to-end archival workflow test passes

### 22.3 Implement archive verification

- Re-import function loads archived audit trail
- Chain verification on imported data
- Report any gaps, integrity violations, or missing entries
- Acceptance: Round-trip test (export → re-import → verify) passes

---

## Task Group 23: GxP Compliance Gap Remediation (Round 2)

**Roadmap:** Cross-cutting | **Spec:** Sections 04, 07, 15, 16, 17 | **Dependencies:** Groups 13, 16, 17

### 23.1 Implement automated capacity monitoring adapter contract

- Define capacity monitoring callback interface for audit trail adapters
- Implement hourly check scheduling with configurable interval (max 1 hour)
- Three threshold levels: WARNING (70%), CRITICAL (85%), EMERGENCY (95%)
- Structured event emission at each threshold crossing
- Acceptance: Unit tests verify threshold detection, event structure, and configurable intervals

### 23.2 Integrate capacity status into health check

- Add `storageUtilizationPct` and `capacityStatus` fields to `GuardHealthCheckResult`
- `createGuardHealthCheck()` reads most recent capacity status from adapter
- Null values when capacity monitoring is not configured
- Acceptance: Health check returns correct capacity fields; null when unconfigured

### 23.3 Implement scope disposal chain verification

- When `gxp: true`, scope disposal hook invokes `verifyAuditChain()` on scope's entries
- Verification failure emits structured diagnostic event (does not throw)
- When `gxp: false`, disposal skips chain verification
- Acceptance: Unit tests for gxp:true disposal, gxp:false skip, and failure diagnostic

### 23.4 Implement predicate rule mapping validation

- Validate that GxP deployments have a predicate rule mapping document reference
- Configuration option for predicate rule mapping document identifier
- Warning at startup if `gxp: true` but no predicate rule mapping configured
- Acceptance: Unit test verifies startup warning when mapping is missing

### 23.5 Implement temporal scope lifetime validation

- When `gxp: true`, validate `maxScopeLifetimeMs` against temporal policy granularity
- Hour-based policies: max 3,600,000ms; minute-based: max 60,000ms; day-based: max 86,400,000ms
- `ConfigurationError` if `maxScopeLifetimeMs` exceeds the ceiling for the active temporal policies
- Acceptance: Unit tests for each granularity level and error on violation

### 23.6 Implement schema version increment tracking

- `schemaVersion` defaults to 1 on all new audit entry types
- Cross-version chain verification uses per-entry schema version for hash computation
- Export manifests include `schemaVersions` array listing all versions in export
- Acceptance: Unit tests for default version, cross-version verification, manifest inclusion

### 23.7 Update OQ test suite for new checks

- Add OQ-20 test: capacity monitoring threshold verification
- Extend OQ-6 test: include disposal-triggered chain verification scenario
- Update OQ baseline documentation to reflect 20 checks
- Acceptance: All 20 OQ checks pass; documentation references updated

---

## Task Summary

| Group     | Name                                     | Subtasks | Dependencies      | Spec Sections                 |
| --------- | ---------------------------------------- | -------- | ----------------- | ----------------------------- |
| 1         | Permission Tokens                        | 6        | None              | 5-8                           |
| 2         | Role Tokens                              | 6        | Group 1           | 9-12                          |
| 3         | Policy Data Types                        | 7        | Groups 1, 2       | 13-17                         |
| 4         | Policy Combinators                       | 7        | Group 3           | 13-14                         |
| 5         | Policy Evaluator                         | 9        | Groups 3, 4       | 18-21                         |
| 6         | Subject Port                             | 3        | Groups 1, 2       | 22-24                         |
| 7         | Guard Adapter                            | 7        | Groups 4, 5, 6    | 25-28                         |
| 8         | Policy Serialization                     | 5        | Groups 3, 4, 5    | 31-33                         |
| 9         | React SubjectProvider                    | 4        | Group 6           | 38                            |
| 10        | React Can/Cannot                         | 4        | Group 9           | 39-42                         |
| 11        | React Hooks                              | 9        | Groups 9, 10      | 40-42                         |
| 12        | DevTools Integration                     | 6        | Groups 5, 7       | 43-44                         |
| 13        | GxP Compliance                           | 6        | Groups 7, 12      | 56-63                         |
| 14        | Vision Integration                       | 4        | Group 12          | 5, 44c-44d                    |
| 15        | Electronic Signatures                    | 11       | Groups 3,4,5,7,13 | 04,05,07,09,17                |
| 16        | GxP Spec Fixes                           | 18       | Groups 7, 13, 15  | 05,07,08,11,12,13,14,15,16,17 |
| 17        | GxP Validation, Risk, and Traceability   | 9        | Groups 13, 15, 16 | 58.4a, 64-66                  |
| 18        | Field-Level Access Control               | 8        | Groups 3, 5, 7, 8 | 04, 05, 07, 09, 14            |
| 19        | Write-Ahead Log (WAL)                    | 7        | Groups 7, 13      | 07, 13, 17                    |
| 20        | Validation Runners                       | 6        | Groups 13, 17     | 01, 17 (64e)                  |
| 21        | GxP Runtime Utilities                    | 4        | Groups 7, 13, 19  | 07, 12, 17                    |
| 22        | System Decommissioning Tooling           | 3        | Groups 13, 19, 21 | 15, 17                        |
| 23        | GxP Compliance Gap Remediation (Round 2) | 7        | Groups 13, 16, 17 | 04, 07, 15, 16, 17            |
| **Total** |                                          | **156**  |                   |                               |

---

## Dependency Graph

```
Group 1 (Permission Tokens)
  |
  +---> Group 2 (Role Tokens)
  |       |
  |       +---> Group 3 (Policy Data Types)
  |       |       |
  |       |       +---> Group 4 (Policy Combinators)
  |       |       |       |
  |       |       |       +---> Group 5 (Policy Evaluator)
  |       |       |       |       |
  |       |       |       |       +---> Group 7 (Guard Adapter)
  |       |       |       |       |       |
  |       |       |       |       |       +---> Group 12 (DevTools)
  |       |       |       |       |       |       |
  |       |       |       |       |       |       +---> Group 13 (GxP Compliance)
  |       |       |       |       |       |       |       |
  |       |       |       |       |       |       |       +---> Group 15 (Electronic Signatures)
  |       |       |       |       |       |       |       |       |
  |       |       |       |       |       |       |       |       +---> Group 16 (GxP Spec Fixes)
  |       |       |       |       |       |       |       |       |       |
  |       |       |       |       |       |       |       |       |       +---> Group 17 (GxP Validation, Risk, Traceability)
  |       |       |       |       |       |       |       |       |               |
  |       |       |       |       |       |       |       |       |               +---> Group 19 (Write-Ahead Log)
  |       |       |       |       |       |       |       |       |               |
  |       |       |       |       |       |       |       |       |               +---> Group 20 (Validation Runners)
  |       |       |       |       |       |       |       |       |               |
  |       |       |       |       |       |       |       |       |               +---> Group 23 (GxP Gap Remediation R2)
  |       |       |       |       |       |       |
  |       |       |       |       |       |       +---> Group 14 (Vision Integration)
  |       |       |       |       |       |
  |       |       |       |       |       +---> Group 13 (GxP Compliance)
  |       |       |       |       |       |
  |       |       |       |       |       +---> Group 18 (Field-Level Access Control)
  |       |       |       |       |
  |       |       |       |       +---> Group 8 (Serialization)
  |       |       |       |               |
  |       |       |       |               +---> Group 18 (Field-Level Access Control)
  |       |       |       |
  |       |       |       +---> Group 8 (Serialization)
  |       |
  |       +---> Group 6 (Subject Port)
  |               |
  |               +---> Group 7 (Guard Adapter)
  |               |
  |               +---> Group 9 (React SubjectProvider)
  |                       |
  |                       +---> Group 10 (React Can/Cannot)
  |                       |       |
  |                       |       +---> Group 11 (React Hooks)
  |                       |
  |                       +---> Group 11 (React Hooks)
```

---

## Implementation Order (Recommended)

The recommended implementation order follows the dependency graph, implementing foundational types first:

1. **Phase 1 -- Core Types** (Groups 1-3): Permission tokens, role tokens, policy data types
2. **Phase 2 -- Evaluation** (Groups 4-6): Policy combinators, evaluator, subject port
3. **Phase 3 -- Integration** (Groups 7-8): Guard adapter, policy serialization
4. **Phase 4 -- React** (Groups 9-11): SubjectProvider, Can/Cannot, hooks
5. **Phase 5 -- DevTools** (Group 12): Inspector, snapshot, events
6. **Phase 6 -- Compliance & Vision** (Groups 13-14): GxP audit trail, MCP/A2A types
7. **Phase 7 -- Electronic Signatures** (Group 15): SignatureService, hasSignature policy, re-authentication, key management
8. **Phase 8 -- GxP Spec Fixes** (Group 16): Multi-signature context, GxPAuditEntry, failOnAuditError, counter-signing docs, timing docs, API reference sync
9. **Phase 9 -- GxP Validation & Risk** (Group 17): Sequence numbers, concurrent chains, IQ/OQ/PQ validation plan, FMEA risk assessment, regulatory traceability matrix
10. **Phase 10 -- Field-Level Access** (Group 18): Fields on policies, fieldMatch matcher, visibleFields on Allow, field merging semantics, FieldMaskContextPort
11. **Phase 11 -- Write-Ahead Log** (Group 19): WalStore, WalIntent, createWalAuditTrail, GxP mode enforcement, crash recovery
12. **Phase 12 -- Validation Runners** (Group 20): guard-validation package, runIQ, runOQ, generateTraceabilityMatrix
13. **Phase 13 -- GxP Gap Remediation R2** (Group 23): Capacity monitoring, disposal chain verification, predicate rule mapping, temporal scope validation, schema versioning

---

## GxP Compliance Gap Remediation

A GxP compliance review identified 12 findings (3 Major, 9 Minor) plus 38 deeper gaps across the guard spec. The root cause for most gaps was that controls were documented as RECOMMENDED (SHOULD) but needed to be REQUIREMENT (MUST) for GxP environments. The following remediation was applied across 7 spec files:

**Files modified:** 07-guard-adapter.md, 12-inspection.md, 14-api-reference.md, 15-appendices.md, 16-definition-of-done.md, 17-gxp-compliance.md, tasks.md

**Major findings addressed:**

- GMP-06: Business continuity plan elevated from RECOMMENDED to REQUIREMENT
- GMP-14: Incident classification matrix elevated from RECOMMENDED to REQUIREMENT with escalation SLAs
- CROSS-07: MCP/A2A meta-audit logging elevated from RECOMMENDED to REQUIREMENT for gxp:true

**Minor findings addressed:**

- CFR-04: `signerName` field added to `ElectronicSignature`
- CFR-07: IdP password quality controls documented as consumer REQUIREMENT
- CFR-09: Open/closed system classification with REQUIREMENT for TLS 1.2+ on open systems
- GMP-13: AuditEntry field size limits table with validation REQUIREMENT
- GAMP-04: Validation plan VMP linkage elevated to REQUIREMENT
- GAMP-05: Open-source supplier qualification guidance (Appendix G, ADR #34)
- ALCOA-08: Retention period mapping elevated to REQUIREMENT
- CROSS-04: FM-17 (buffer-flush window) added to FMEA
- CROSS-08: `enforceSeparation` elevated to non-overridable REQUIREMENT for gxp:true

### Round 2 Findings

A follow-up GxP compliance review identified 2 Major and 4 Minor findings. One minor finding (I-2: re-authentication window) was already addressed by existing spec content. The remaining 5 findings were remediated with documentation-only changes across 6 spec files.

**Files modified:** 04-policy-types.md, 07-guard-adapter.md, 15-appendices.md, 16-definition-of-done.md, 17-gxp-compliance.md, tasks.md

**Major findings addressed:**

- M-1: Audit trail capacity monitoring — elevated from RECOMMENDED capacity planning to REQUIREMENT for automated monitoring with thresholds (70%/85%/95%), integrated into `createGuardHealthCheck()` via `storageUtilizationPct` and `capacityStatus` fields. OQ-20 added.
- M-2: Scope disposal chain verification — added REQUIREMENT for `verifyAuditChain()` invocation at scope disposal when `gxp: true`. DoD 13 updated with test counts (unit ~54, integration ~18) and verification checklist. OQ-6 scope note added.

**Minor findings addressed:**

- I-1: Predicate rule mapping — elevated from RECOMMENDED to REQUIREMENT for GxP environments (21 CFR 11.2, 21 CFR 11.1(b), GAMP 5 §4.4)
- I-2: Re-authentication window — no action needed (already addressed by existing `ReauthenticationToken.expiresAt` and 15-minute ceiling REQUIREMENT)
- I-3: Temporal scope lifetime — added REQUIREMENT linking `maxScopeLifetimeMs` to temporal policy granularity (ALCOA+ Contemporaneous)
- I-4: Schema version increment policy — added Appendix J with MAJOR/MINOR/PATCH rules, initial version matrix, cross-version compatibility, and migration guidance

**OQ count updates:** OQ table expanded from 19 to 20 checks; all stale count references updated across 15-appendices.md, 16-definition-of-done.md, and 17-gxp-compliance.md
