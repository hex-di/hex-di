# Definitions of Done — @hex-di/guard-rego

## Document Control

| Field       | Value                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| Document ID | SPEC-RG-PRC-003                                                                     |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/definitions-of-done.md` |
| Status      | Effective                                                                           |

---

Per-feature acceptance criteria for `@hex-di/guard-rego`. The detailed test enumeration (72 tests across 8 files) is maintained in [09-definition-of-done.md](../09-definition-of-done.md).

---

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Spec section updated with requirement IDs (RG-{DOMAIN}-NNN format)
- [ ] New invariants added to invariants.md with INV-RG-N identifier
- [ ] ADR created if architectural decision was made
- [ ] Glossary terms updated
- [ ] overview.md API tables updated

### 2. Unit Tests

- [ ] Runtime tests in appropriate `tests/unit/*.test.ts` file
- [ ] Success and error paths both covered
- [ ] Edge cases covered (OPA down, timeout, malformed response, empty result, non-JSON body)
- [ ] Line coverage > 95%, branch coverage > 90%

### 3. Type Tests

- [ ] Type tests in `tests/rego-policy.test-d.ts`
- [ ] All exported interfaces verified
- [ ] `regoPolicy` return type verified as `PolicyConstraint`
- [ ] Error type discriminant narrowing verified

### 4. Mutation Tests

- [ ] Mutation score > 80% for input mapping code
- [ ] Mutation score > 80% for decision mapping code
- [ ] Mutation score > 90% for fail-closed behavior
- [ ] No surviving mutants in security-critical paths (decision kind mapping, fail-closed deny)

### 5. Integration Tests

- [ ] Rego + Guard end-to-end evaluation works (via msw-mocked OPA)
- [ ] Rego policies compose with native Guard policies
- [ ] Field visibility flows through composed evaluation
- [ ] Evaluation trace includes OPA metadata
- [ ] Fail-closed with anyOf fallback works

### 6. Traceability

- [ ] Every new requirement ID maps to at least one test
- [ ] Requirement counts in process/requirement-id-scheme.md updated

### 7. Build

- [ ] `tsc -p tsconfig.build.json` succeeds
- [ ] No unintended new exports
- [ ] No runtime dependency on OPA (HTTP-only communication)
