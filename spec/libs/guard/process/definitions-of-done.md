# @hex-di/guard — Feature Definition of Done

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-PRC-DOD                            |
> | Revision         | 2.4                                      |
> | Effective Date   | 2026-02-21                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Verification Specification (Process) |
> | Change History   | 2.4 (2026-02-21): DoD 5 §74→§86, DoD 21 add §84,§85 — section renumbering to resolve collisions (CCR-GUARD-045) |
> |                  | 2.3 (2026-02-20): DoD 18 §34–37→§37–40 (was using legacy 10-cross-library.md numbers; canonical behaviors/09 uses §37–40); DoD 9 §38, DoD 10 §39, DoD 11 §40–42,§73 added to summary; fixed DoD 18 heading (CCR-GUARD-045) |
|                  | 2.2 (2026-02-20): DoD 18 renamed from "Cross-Library Integration" to "Guard Integration Contracts" to match 16-definition-of-done.md heading (CCR-GUARD-045) |
> |                  | 2.1 (2026-02-20): Summary table: added DoD 20–22 and 25–29 (were present in 16-definition-of-done.md but omitted from Summary); added corresponding feature sections (CCR-GUARD-045) |
> |                  | 2.0 (2026-02-19): Rewritten as PR acceptance checklist; test enumeration moved exclusively to 16-definition-of-done.md (CCR-GUARD-023) |
> |                  | 1.0 (2026-02-13): Initial controlled release — near-duplicate of 16-definition-of-done.md (deprecated format) |

Per-feature acceptance criteria for `@hex-di/guard`. This document is the **PR acceptance gate** — a feature is done when every item in the relevant DoD section below is checked.

The detailed test enumeration (test file names, per-test tables, exact counts, mutation targets) is maintained in [16-definition-of-done.md](../16-definition-of-done.md).

---

## Summary

| DoD Group | Spec Sections | Status |
|-----------|--------------|--------|
| DoD 1: Permission Tokens | §5–8 | Pending |
| DoD 2: Role Tokens | §9–12 | Pending |
| DoD 3: Policy Data Types | §13–17 | Pending |
| DoD 4: Policy Combinators | §14 | Pending |
| DoD 5: Policy Evaluator | §18–21, §86 | Pending |
| DoD 6: Subject Port | §22–24, §72 | Pending |
| DoD 7: Guard Adapter | §25–28 | Pending |
| DoD 8: Policy Serialization | §31–33c | Pending |
| DoD 9: React SubjectProvider | §38 | Pending |
| DoD 10: React Can/Cannot | §39 | Pending |
| DoD 11: React Hooks | §40–42, §73 | Pending |
| DoD 12: DevTools Integration | §43–44d | Pending |
| DoD 13: GxP Compliance | §59–70 | Pending |
| DoD 14: Vision Integration | §44b–44d | Pending |
| DoD 15: Electronic Signatures | §65–65d | Pending |
| DoD 16: Validation Tooling | §67e | Pending |
| DoD 17: Port Gate Hook | §29–30 | Pending |
| DoD 18: Guard Integration Contracts | §37–40 | Pending |
| DoD 19: Testing Infrastructure | §45–51a | Pending |
| DoD 20: Array Matchers | §66–70 | Pending |
| DoD 21: API Ergonomics | §23a, §42a, §71, §74, §84, §85 | Pending |
| DoD 22: Cucumber BDD Acceptance Tests | §57 | Pending |
| DoD 23: Meta-Audit Logging | §61.4–61.5 | Pending |
| DoD 24: System Decommissioning | §70 | Pending |
| DoD 25: Async Evaluation | §21a, §22a, §25a | Pending |
| DoD 26: Field-Level Union Strategy | §13a, §19 | Pending |
| DoD 27: ReBAC (Relationship-Based Access Control) | §1, §22b | Pending |
| DoD 28: Ecosystem Extensions | §74–78 | Pending |
| DoD 29: Developer Experience | §79–83 | Pending |

---

## Feature Definition of Done

A feature is **done** when all of the following acceptance gates are satisfied for the relevant DoD group(s).

### 1. Specification

- [ ] Spec section updated with requirement IDs (`BEH-GD-NNN` in `behaviors/`, `REQ-GUARD-NNN` in numbered chapters)
- [ ] New invariants added to `invariants.md` with `INV-GD-N` identifier and `Source`, `Implication`, `Related` fields
- [ ] ADR created in `decisions/NNN-*.md` if an architectural decision was made
- [ ] Glossary updated for any new domain terms
- [ ] `overview.md` API surface tables updated
- [ ] `traceability.md` capability table and requirement counts updated
- [ ] Document control headers updated (Revision, Effective Date, Change History) on all modified spec files

### 2. Unit Tests

- [ ] Runtime tests in appropriate `*.test.ts` file under `tests/unit/`
- [ ] Both success and error paths covered
- [ ] Edge cases covered (null, undefined, empty, circular references, frozen inputs)
- [ ] Line coverage > 95%, branch coverage > 90%
- [ ] Test file includes `@spec-ref` annotations linking tests to spec section IDs

### 3. Type Tests

- [ ] Type-level tests in `*.test-d.ts` file using `expectTypeOf`
- [ ] Branded type safety verified (assignment blocking between distinct branded types)
- [ ] Return types verified for all public functions

### 4. GxP Tests (if applicable)

- [ ] If feature affects a High-risk invariant (`INV-GD-*` with risk level High in `risk-assessment.md`), corresponding `tests/unit/gxp-*.test.ts` test updated
- [ ] If feature implements an ALCOA+ property (see `compliance/gxp.md`), corresponding GxP integrity assertion added

### 5. Mutation Tests

- [ ] Mutation score ≥ 95% for GxP-critical code paths (hash chain, WAL recovery, signature verification, chain break logic, serialization)
- [ ] Mutation score ≥ 90% for remaining code paths (React components, guard sink ports, inspector/DevTools)
- [ ] Mutation score 100% for policy evaluation core and combinators (see `16-definition-of-done.md` Mutation Testing Strategy)
- [ ] No surviving mutants in security-critical comparison code (constant-time pad, chain break detection)

### 6. Traceability

- [ ] Every new `BEH-GD-NNN` / `REQ-GUARD-NNN` requirement ID maps to at least one test
- [ ] `traceability.md` §6 Invariant Traceability updated for any new/modified invariants
- [ ] `traceability.md` §8 Test File Map updated for any new test files
- [ ] `traceability.md` §9 DoD Traceability updated

### 7. Build

- [ ] `tsc -p tsconfig.build.json` succeeds with no new errors
- [ ] `pnpm lint` passes for all modified packages
- [ ] No unintended new exports in `src/index.ts`

### 8. GxP Compliance Review (if applicable)

- [ ] If feature adds or modifies audit trail behavior, `compliance/gxp.md` ALCOA+ mapping reviewed
- [ ] If feature adds or modifies electronic signature behavior, `17-gxp-compliance/07-electronic-signatures.md` updated
- [ ] If feature adds a new FMEA failure mode, `risk-assessment.md` updated with `FM-N` entry
- [ ] If feature changes IQ/OQ/PQ protocol coverage, `17-gxp-compliance/09-validation-plan.md` updated

### 9. Changeset

- [ ] Changeset created (`pnpm changeset`) with appropriate bump type (patch/minor/major)
- [ ] Changeset description references the spec section(s) implemented
- [ ] If breaking change: `BREAKING CHANGE` noted in changeset with migration guidance

---

## Per-DoD Acceptance Checklist

Use this section as a quick-reference gate during PR review. For the complete test enumeration (exact test file names and per-test tables), see [16-definition-of-done.md](../16-definition-of-done.md).

### DoD 1: Permission Tokens (§5–8)

- [ ] All items in §1 Specification gate satisfied
- [ ] All items in §2 Unit Tests gate satisfied (~22 unit tests, ~9 type tests)
- [ ] `createPermission`, `createPermissionGroup` (both overloads), `isPermission`, `PermissionRegistry` implemented
- [ ] Duplicate permission warning (ACL006) emitted for same resource:action pair
- [ ] See [16-definition-of-done.md §DoD 1](../16-definition-of-done.md#dod-1-permission-tokens) for full test list

### DoD 2: Role Tokens (§9–12)

- [ ] All items in §1 Specification gate satisfied
- [ ] All items in §2 Unit Tests gate satisfied (~25 unit tests, ~12 type tests)
- [ ] `createRole`, `flattenPermissions` (DAG walk + cycle detection), `isRole`, `MutuallyExclusiveRoles`, `validateSoDConstraints` implemented
- [ ] See [16-definition-of-done.md §DoD 2](../16-definition-of-done.md#dod-2-role-tokens) for full test list

### DoD 3: Policy Data Types (§13–17)

- [ ] All 10 policy variants implemented as frozen discriminated union members
- [ ] `hashPolicy()` returns deterministic SHA-256 hex string
- [ ] ~40 unit tests, ~18 type tests
- [ ] See [16-definition-of-done.md §DoD 3](../16-definition-of-done.md#dod-3-policy-data-types) for full test list

### DoD 4: Policy Combinators (§14)

- [ ] All 8 combinator factories (`allOf`, `anyOf`, `not`, `hasPermission`, `hasRole`, `hasAttribute`, `hasSignature`, `withLabel`) implemented and frozen
- [ ] See [16-definition-of-done.md §DoD 4](../16-definition-of-done.md#dod-4-policy-combinators) for full test list

### DoD 5: Policy Evaluator (§18–21, §86)

- [ ] `evaluate(policy, subject)` and `evaluateBatch(policies, subject)` implemented
- [ ] Mutation score 100% for evaluation core and combinators
- [ ] GxP constant-time padding implemented when `gxp: true`
- [ ] See [16-definition-of-done.md §DoD 5](../16-definition-of-done.md#dod-5-policy-evaluator) for full test list

### DoD 6: Subject Port (§22–24, §72)

- [ ] `SubjectProviderPort`, scoped subject adapter, `withAttributes`, `getAttribute` implemented
- [ ] See [16-definition-of-done.md §DoD 6](../16-definition-of-done.md#dod-6-subject-port) for full test list

### DoD 7: Guard Adapter (§25–28)

- [ ] `guard(adapter, { resolve })` wraps adapter with policy enforcement
- [ ] `GuardedAdapter<A>` type transformation extends `requires` tuple at compile time
- [ ] See [16-definition-of-done.md §DoD 7](../16-definition-of-done.md#dod-7-guard-adapter) for full test list

### DoD 8: Policy Serialization (§31–33c)

- [ ] `serializePolicy`, `deserializePolicy`, `explainPolicy` implemented
- [ ] Audit entry serialization and JSON schema validated
- [ ] Mutation score ≥ 95% for serialization
- [ ] See [16-definition-of-done.md §DoD 8](../16-definition-of-done.md#dod-8-policy-serialization) for full test list

### DoD 9: React SubjectProvider (§38)

- [ ] `SubjectProvider` sets subject in React context (not DI scope)
- [ ] See [16-definition-of-done.md §DoD 9](../16-definition-of-done.md#dod-9-react-subjectprovider) for full test list

### DoD 10: React Can/Cannot (§39)

- [ ] `<Can>` and `<Cannot>` conditional rendering components implemented
- [ ] See [16-definition-of-done.md §DoD 10](../16-definition-of-done.md#dod-10-react-cancannot) for full test list

### DoD 11: React Hooks (§40–42, §73)

- [ ] `useCan`, `usePolicy`, `useSubject`, `usePolicies`, `usePoliciesDeferred` implemented
- [ ] `PoliciesDecisions<M>` mapped type preserves input key names in return type
- [ ] See [16-definition-of-done.md §DoD 11](../16-definition-of-done.md#dod-11-react-hooks) for full test list

### DoD 12: DevTools Integration (§43–44d)

- [ ] `GuardInspector`, `GuardLibraryInspectorPort`, MCP resources, A2A skills implemented
- [ ] See [16-definition-of-done.md §DoD 12](../16-definition-of-done.md#dod-12-devtools-integration) for full test list

### DoD 13: GxP Compliance (§59–70)

- [ ] AuditTrailPort implementation contract, hash chain, WAL, clock injection implemented
- [ ] Mutation score ≥ 95% for hash chain, WAL recovery, chain break logic
- [ ] GxP tests updated (see §4 GxP Tests gate)
- [ ] See [16-definition-of-done.md §DoD 13](../16-definition-of-done.md#dod-13-gxp-compliance) for full test list

### DoD 14: Vision Integration (§44b–44d)

- [ ] Guard events flow to central nerve cluster; MCP/A2A schemas defined
- [ ] See [16-definition-of-done.md §DoD 14](../16-definition-of-done.md#dod-14-vision-integration) for full test list

### DoD 15: Electronic Signatures (§65–65d)

- [ ] `hasSignature` policy, `SignatureService`, re-authentication enforcement, key management contract implemented
- [ ] Constant-time comparison for signature validation and reauth tokens (GxP requirement)
- [ ] See [16-definition-of-done.md §DoD 15](../16-definition-of-done.md#dod-15-electronic-signatures) for full test list

### DoD 16: Validation Tooling (§67e)

- [ ] Programmatic IQ/OQ/PQ runners in `@hex-di/guard-validation` package
- [ ] See [16-definition-of-done.md §DoD 16](../16-definition-of-done.md#dod-16-validation-tooling) for full test list

### DoD 17: Port Gate Hook (§29–30)

- [ ] `createPortGateHook` coarse-grained and fine-grained enforcement implemented
- [ ] Mutation score 100% for port gate hook
- [ ] See [16-definition-of-done.md §DoD 17](../16-definition-of-done.md#dod-17-port-gate-hook) for full test list

### DoD 18: Guard Integration Contracts (§37–40)

- [ ] Logger, tracing, query/store, saga/flow integration adapters implemented
- [ ] See [16-definition-of-done.md §DoD 18](../16-definition-of-done.md#dod-18-guard-integration-contracts) for full test list

### DoD 19: Testing Infrastructure (§45–51a)

- [ ] `@hex-di/guard-testing`: memory adapters, Vitest matchers, subject fixtures, `testPolicy`, security test plan
- [ ] See [16-definition-of-done.md §DoD 19](../16-definition-of-done.md#dod-19-testing-infrastructure) for full test list

### DoD 23: Meta-Audit Logging (§61.4–61.5)

- [ ] Guard sink ports emit operational events; rate limiting, scope expiry, clock drift events implemented
- [ ] See [16-definition-of-done.md §DoD 23](../16-definition-of-done.md#dod-23-meta-audit-logging) for full test list

### DoD 24: System Decommissioning (§70)

- [ ] Decommissioning utilities: evidence package, scope isolation, archive tooling
- [ ] See [16-definition-of-done.md §DoD 24](../16-definition-of-done.md#dod-24-system-decommissioning) for full test list

### DoD 20: Array Matchers (§66–70)

- [ ] `hasPermissions([...])`, `hasRoles([...])`, `hasAttributes([...])` array-accepting matchers implemented
- [ ] Partial-match (`some`), all-match (`every`), none-match (`none`) semantics covered
- [ ] See [16-definition-of-done.md §DoD 20](../16-definition-of-done.md#dod-20-array-matchers) for full test list

### DoD 21: API Ergonomics (§23a, §42a, §71, §74, §84, §85)

- [ ] Fluent policy builder API (`policy().hasPermission(...).or.hasRole(...)`) implemented
- [ ] `useGuard()` hook shorthand, `<Can>` JSX shorthand for common patterns
- [ ] See [16-definition-of-done.md §DoD 21](../16-definition-of-done.md#dod-21-api-ergonomics) for full test list

### DoD 22: Cucumber BDD Acceptance Tests (§57)

- [ ] Gherkin step definitions for `hasPermission`, `hasRole`, `hasAttribute`, `allOf`, `anyOf`, `not`
- [ ] BDD test runner integration (Cucumber.js or vitest-cucumber) passing
- [ ] See [16-definition-of-done.md §DoD 22](../16-definition-of-done.md#dod-22-cucumber-bdd-acceptance-tests) for full test list

### DoD 25: Async Evaluation (§21a, §22a, §25a)

- [ ] `evaluateAsync()` and `isAllowedAsync()` support `Promise`-returning attribute/relationship resolvers
- [ ] Async subject provider port and adapter implemented
- [ ] See [16-definition-of-done.md §DoD 25](../16-definition-of-done.md#dod-25-async-evaluation) for full test list

### DoD 26: Field-Level Union Strategy (§13a, §19)

- [ ] Field-level permission union type: `PermissionUnion<P>` distinguishes individual vs. grouped grants
- [ ] Evaluator resolves union permissions without false-negative on partial grants
- [ ] See [16-definition-of-done.md §DoD 26](../16-definition-of-done.md#dod-26-field-level-union-strategy) for full test list

### DoD 27: ReBAC — Relationship-Based Access Control (§1, §22b)

- [ ] `hasRelationship(relation, resource)` policy kind evaluated against relationship resolver
- [ ] `RelationshipResolverPort` adapter contract and memory adapter provided
- [ ] See [16-definition-of-done.md §DoD 27](../16-definition-of-done.md#dod-27-rebac-relationship-based-access-control) for full test list

### DoD 28: Ecosystem Extensions (§74–78)

- [ ] `@hex-di/guard-hono`, `@hex-di/guard-express`, `@hex-di/guard-trpc` middleware adapters scaffolded
- [ ] Framework integration tests pass for each adapter
- [ ] See [16-definition-of-done.md §DoD 28](../16-definition-of-done.md#dod-28-ecosystem-extensions) for full test list

### DoD 29: Developer Experience (§79–83)

- [ ] CLI diagnostic tool (`guard-check`) reports misconfigured policies, missing adapters, type errors
- [ ] VS Code extension / language server support for policy autocompletion scaffolded
- [ ] See [16-definition-of-done.md §DoD 29](../16-definition-of-done.md#dod-29-developer-experience) for full test list

---

_See also: [16-definition-of-done.md](../16-definition-of-done.md) — full test enumeration with per-test tables and mutation targets_
_See also: [traceability.md](../traceability.md) — DoD-to-spec cross-reference matrix_
_See also: [test-strategy.md](./test-strategy.md) — test pyramid and coverage targets_
