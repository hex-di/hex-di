# 09 — Definition of Done

Test enumeration for `@hex-di/guard-cedar`. The detailed test descriptions below define the acceptance criteria for each feature area.

---

## Summary

| Metric          | Value |
| --------------- | ----- |
| Total DoD items | 8     |
| Total tests     | 67    |
| Done            | 0     |
| Pending         | 67    |

---

## DoD 1: Cedar Engine Port (Spec §02)

**File:** `tests/unit/engine.test.ts`

| #   | Test Description                                                        | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | isAuthorized returns allow when permit policy matches                   | unit |
| 2   | isAuthorized returns deny when no permit policy matches (default deny)  | unit |
| 3   | isAuthorized returns deny when forbid overrides permit                  | unit |
| 4   | isAuthorized skips policy with condition error (skip-on-error)          | unit |
| 5   | isAuthorized includes determining policy IDs in diagnostics             | unit |
| 6   | isAuthorized includes policy errors in diagnostics                      | unit |
| 7   | validate returns valid for correct policies against schema              | unit |
| 8   | validate returns errors for policies referencing undefined entity types | unit |
| 9   | validate returns warnings without failing validation                    | unit |

**Target: >95% mutation score.**

---

## DoD 2: Entity Mapping (Spec §04)

**File:** `tests/unit/entity-mapper.test.ts`

| #   | Test Description                                                 | Type |
| --- | ---------------------------------------------------------------- | ---- |
| 1   | mapSubjectToPrincipal creates entity with correct UID            | unit |
| 2   | mapSubjectToPrincipal maps roles to parent entities              | unit |
| 3   | mapSubjectToPrincipal maps string attributes                     | unit |
| 4   | mapSubjectToPrincipal maps number attributes                     | unit |
| 5   | mapSubjectToPrincipal maps boolean attributes                    | unit |
| 6   | mapSubjectToPrincipal maps array attributes to sets              | unit |
| 7   | mapSubjectToPrincipal omits null/undefined attributes            | unit |
| 8   | mapSubjectToPrincipal omits unmappable attributes with warning   | unit |
| 9   | mapResourceToEntity creates entity from resource record          | unit |
| 10  | mapResourceToEntity uses \_\_type field as entity type           | unit |
| 11  | mapResourceToEntity returns error for missing resource ID        | unit |
| 12  | mapResourceToEntity returns error for missing resource type      | unit |
| 13  | mapResourceToEntity strips \_\_type and id from attrs            | unit |
| 14  | mapAction parses fully-qualified Cedar UID                       | unit |
| 15  | mapAction prepends default action type for plain strings         | unit |
| 16  | buildEntitySlice includes principal, resource, and role entities | unit |
| 17  | buildEntitySlice deduplicates entities by UID                    | unit |
| 18  | buildEntitySlice merges attributes for duplicate entities        | unit |

**Target: >95% mutation score.**

---

## DoD 3: Schema Management (Spec §05)

**File:** `tests/unit/schema-loader.test.ts`

| #   | Test Description                                               | Type |
| --- | -------------------------------------------------------------- | ---- |
| 1   | loadSchema accepts JSON object                                 | unit |
| 2   | loadSchema accepts JSON string                                 | unit |
| 3   | loadSchema returns error for invalid JSON string               | unit |
| 4   | loadSchema freezes the schema object                           | unit |
| 5   | validatePoliciesAgainstSchema passes for valid policies        | unit |
| 6   | validatePoliciesAgainstSchema fails for undefined entity types | unit |
| 7   | validateMappingConfig passes when config matches schema        | unit |
| 8   | validateMappingConfig fails for unknown principal type         | unit |
| 9   | validateMappingConfig fails for unknown resource type          | unit |

**Target: >95% mutation score.**

---

## DoD 4: Policy Store (Spec §03)

**File:** `tests/unit/policy-store.test.ts`

| #   | Test Description                             | Type |
| --- | -------------------------------------------- | ---- |
| 1   | load parses valid Cedar policy text          | unit |
| 2   | load returns error for invalid syntax        | unit |
| 3   | add assigns policy ID                        | unit |
| 4   | add returns error for duplicate policy ID    | unit |
| 5   | getPolicies returns concatenated policy text | unit |
| 6   | getPolicyIds returns all loaded policy IDs   | unit |
| 7   | clear resets to empty state                  | unit |

**Target: >95% mutation score.**

---

## DoD 5: Decision Mapping (Spec §06)

**File:** `tests/unit/decision-mapper.test.ts`

| #   | Test Description                                    | Type |
| --- | --------------------------------------------------- | ---- |
| 1   | maps Cedar allow to Guard allow decision            | unit |
| 2   | maps Cedar deny to Guard deny decision              | unit |
| 3   | includes evaluationId from context                  | unit |
| 4   | includes subjectId from context                     | unit |
| 5   | includes durationMs timing                          | unit |
| 6   | propagates determining policy IDs to trace          | unit |
| 7   | propagates policy errors to trace                   | unit |
| 8   | sets deny reason from Cedar diagnostics             | unit |
| 9   | sets default deny reason when no diagnostics        | unit |
| 10  | extracts visibleFields from policy annotation       | unit |
| 11  | merges visibleFields from multiple policies (union) | unit |
| 12  | omits visibleFields when no annotation present      | unit |
| 13  | freezes the returned decision object                | unit |

**Target: >95% mutation score.**

---

## DoD 6: Error Handling (Spec §07)

**File:** `tests/unit/errors.test.ts`

| #   | Test Description                                    | Type |
| --- | --------------------------------------------------- | ---- |
| 1   | every error type has unique \_tag                   | unit |
| 2   | all errors are frozen                               | unit |
| 3   | CedarEngineCreationError includes WASM init details | unit |
| 4   | CedarPolicyParseError includes line/column          | unit |
| 5   | EntityMappingError includes attribute key           | unit |
| 6   | CedarAdapterError wraps cause error                 | unit |

**Target: >95% mutation score.**

---

## DoD 7: Configuration & Factory (Spec §08)

**File:** `tests/unit/factory.test.ts`

| #   | Test Description                                           | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | createCedarAdapter succeeds with valid config              | unit |
| 2   | createCedarAdapter validates schema on load                | unit |
| 3   | createCedarAdapter fails for invalid schema                | unit |
| 4   | createCedarAdapter fails for invalid policies              | unit |
| 5   | createCedarAdapter validates mapping config against schema | unit |
| 6   | evaluate delegates to Cedar engine                         | unit |
| 7   | evaluate merges default and per-evaluation context         | unit |
| 8   | evaluate appends additional entities to slice              | unit |

**Target: >95% mutation score.**

---

## DoD 8: Guard Integration (Spec §08, end-to-end)

**File:** `tests/integration/cedar-guard.test.ts`

| #   | Test Description                                       | Type        |
| --- | ------------------------------------------------------ | ----------- |
| 1   | cedarPolicy composes with allOf native policy          | integration |
| 2   | cedarPolicy composes with anyOf native policy          | integration |
| 3   | cedarPolicy composes with not combinator               | integration |
| 4   | cedarPolicy deny overrides native allow                | integration |
| 5   | Cedar forbid overrides Cedar permit in composed policy | integration |
| 6   | field visibility flows through composed evaluation     | integration |
| 7   | evaluation trace includes Cedar diagnostics            | integration |

**Target: >90% line coverage.**

---

## Type Tests

**File:** `tests/cedar-policy.test-d.ts`

| #   | Test Description                                        | Type |
| --- | ------------------------------------------------------- | ---- |
| 1   | CedarEnginePort interface is structurally correct       | type |
| 2   | CedarAuthorizationRequest requires all mandatory fields | type |
| 3   | CedarValue union accepts all Cedar value types          | type |
| 4   | cedarPolicy return type is PolicyConstraint             | type |
| 5   | CedarAdapterConfig requires schema and policies         | type |
