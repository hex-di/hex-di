# 09 — Definition of Done

Test enumeration for `@hex-di/guard-rego`. The detailed test descriptions below define the acceptance criteria for each feature area.

---

## Summary

| Metric          | Value |
| --------------- | ----- |
| Total DoD items | 8     |
| Total tests     | 72    |
| Done            | 0     |
| Pending         | 72    |

---

## DoD 1: Rego Engine Port / HTTP Client (Spec §02)

**File:** `tests/unit/client.test.ts`

| #   | Test Description                                                          | Type |
| --- | ------------------------------------------------------------------------- | ---- |
| 1   | query sends POST to /v1/data/{path} with input body                       | unit |
| 2   | query returns OpaQueryResponse on HTTP 200                                | unit |
| 3   | query returns result: undefined for empty 200 body                        | unit |
| 4   | query returns http-error for HTTP 400                                     | unit |
| 5   | query returns opa-error with code and errors array for OPA error response | unit |
| 6   | query returns timeout error when request exceeds timeout                  | unit |
| 7   | query returns network-error for fetch failure                             | unit |
| 8   | query retries on network error (retries: 1)                               | unit |
| 9   | query does NOT retry on OPA 4xx error                                     | unit |
| 10  | query sends custom headers                                                | unit |
| 11  | query appends ?metrics=true when configured                               | unit |
| 12  | query appends ?provenance=true when configured                            | unit |
| 13  | health returns healthy status on 200                                      | unit |
| 14  | health returns opa-unreachable on network error                           | unit |
| 15  | health returns bundlesReady from health response                          | unit |

**Target: >95% mutation score.**

---

## DoD 2: Input Document Mapping (Spec §04)

**File:** `tests/unit/input-mapper.test.ts`

| #   | Test Description                                                                | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | mapSubjectToInput maps all AuthSubject fields                                   | unit |
| 2   | mapSubjectToInput converts permissions Set to sorted array                      | unit |
| 3   | mapSubjectToInput omits undefined optional fields                               | unit |
| 4   | mapResourceToInput passes resource record through                               | unit |
| 5   | mapResourceToInput returns undefined for undefined resource                     | unit |
| 6   | mapResourceToInput warns for non-serializable values                            | unit |
| 7   | buildInputDocument produces correct top-level shape                             | unit |
| 8   | buildInputDocument merges additionalInput                                       | unit |
| 9   | buildInputDocument ignores additionalInput keys conflicting with reserved names | unit |
| 10  | buildInputDocument freezes the result                                           | unit |
| 11  | buildInputDocument produces deterministic JSON for same inputs                  | unit |

**Target: >95% mutation score.**

---

## DoD 3: Decision Mapping — Boolean (Spec §06)

**File:** `tests/unit/decision-mapper.test.ts`

| #   | Test Description                                       | Type |
| --- | ------------------------------------------------------ | ---- |
| 1   | maps boolean true to Guard allow                       | unit |
| 2   | maps boolean false to Guard deny                       | unit |
| 3   | maps undefined/null result to Guard deny               | unit |
| 4   | includes evaluationId from context                     | unit |
| 5   | includes subjectId from context                        | unit |
| 6   | includes durationMs timing                             | unit |
| 7   | boolean deny sets reason "OPA rule evaluated to false" | unit |
| 8   | undefined deny sets reason "OPA rule is undefined"     | unit |
| 9   | freezes the returned decision                          | unit |

**Target: >95% mutation score.**

---

## DoD 4: Decision Mapping — Structured (Spec §06)

**File:** `tests/unit/decision-mapper.test.ts` (continued)

| #   | Test Description                                                   | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 1   | maps structured { allow: true } to Guard allow                     | unit |
| 2   | maps structured { allow: false, reason } to Guard deny with reason | unit |
| 3   | uses default deny reason when reason field is absent               | unit |
| 4   | extracts visibleFields from structured decision                    | unit |
| 5   | omits visibleFields when absent                                    | unit |
| 6   | filters non-string entries from visibleFields                      | unit |
| 7   | returns parse error for object missing allow field                 | unit |
| 8   | returns parse error for non-boolean/non-object result              | unit |
| 9   | propagates OPA decisionId to trace                                 | unit |
| 10  | propagates OPA metrics to trace                                    | unit |
| 11  | propagates policy metadata to trace                                | unit |
| 12  | navigates decisionPath into nested result                          | unit |

**Target: >95% mutation score.**

---

## DoD 5: Error Handling (Spec §07)

**File:** `tests/unit/errors.test.ts`

| #   | Test Description                                             | Type |
| --- | ------------------------------------------------------------ | ---- |
| 1   | every error type has unique \_tag                            | unit |
| 2   | all errors are frozen                                        | unit |
| 3   | RegoEngineCreationError includes baseUrl                     | unit |
| 4   | RegoEngineError http-error includes status and body          | unit |
| 5   | RegoEngineError opa-error includes code and source locations | unit |
| 6   | RegoEngineError timeout includes timeoutMs                   | unit |
| 7   | RegoAdapterError wraps cause error                           | unit |
| 8   | evaluation-denied-on-error wraps engine error                | unit |

**Target: >95% mutation score.**

---

## DoD 6: Configuration & Factory (Spec §08)

**File:** `tests/unit/factory.test.ts`

| #   | Test Description                                           | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | createRegoAdapter succeeds with valid config               | unit |
| 2   | createRegoAdapter validates baseUrl                        | unit |
| 3   | createRegoAdapter performs health check on create          | unit |
| 4   | createRegoAdapter fails when OPA is unreachable            | unit |
| 5   | createRegoAdapter skips health check when disabled         | unit |
| 6   | evaluate builds input and queries OPA                      | unit |
| 7   | evaluate merges default and per-evaluation additionalInput | unit |
| 8   | evaluate applies per-evaluation timeout                    | unit |

**Target: >95% mutation score.**

---

## DoD 7: Fail-Closed Behavior (Spec §07, §08)

**File:** `tests/unit/failover.test.ts`

| #   | Test Description                                       | Type |
| --- | ------------------------------------------------------ | ---- |
| 1   | network error produces deny decision                   | unit |
| 2   | timeout produces deny decision                         | unit |
| 3   | deny includes error details in reason                  | unit |
| 4   | deny includes original error as cause in adapter error | unit |

**Target: >95% mutation score.**

---

## DoD 8: Guard Integration (Spec §08, end-to-end)

**File:** `tests/integration/rego-guard.test.ts`

| #   | Test Description                                         | Type        |
| --- | -------------------------------------------------------- | ----------- |
| 1   | regoPolicy composes with allOf native policy             | integration |
| 2   | regoPolicy composes with anyOf native policy             | integration |
| 3   | regoPolicy composes with not combinator                  | integration |
| 4   | regoPolicy requires evaluateAsync (sync evaluate errors) | integration |
| 5   | field visibility flows through composed evaluation       | integration |
| 6   | evaluation trace includes OPA metadata                   | integration |
| 7   | OPA failure with anyOf fallback to native policy         | integration |

**Target: >90% line coverage.**

---

## Type Tests

**File:** `tests/rego-policy.test-d.ts`

| #   | Test Description                                 | Type |
| --- | ------------------------------------------------ | ---- |
| 1   | RegoEnginePort interface is structurally correct | type |
| 2   | OpaQueryRequest requires path and input          | type |
| 3   | OpaDecisionDocument requires allow field         | type |
| 4   | regoPolicy return type is PolicyConstraint       | type |
| 5   | RegoAdapterConfig requires baseUrl               | type |
