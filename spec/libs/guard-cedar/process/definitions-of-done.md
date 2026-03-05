# Definitions of Done — @hex-di/guard-cedar

## Document Control

| Field       | Value                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| Document ID | SPEC-CD-PRC-003                                                                     |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/definitions-of-done.md` |
| Status      | Effective                                                                           |

---

Per-feature acceptance criteria for `@hex-di/guard-cedar`. The detailed test enumeration (67 tests across 8 files) is maintained in [09-definition-of-done.md](../09-definition-of-done.md).

---

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Spec section updated with requirement IDs (CD-{DOMAIN}-NNN format)
- [ ] New invariants added to invariants.md with INV-CD-N identifier
- [ ] ADR created if architectural decision was made
- [ ] Glossary terms updated
- [ ] overview.md API tables updated

### 2. Unit Tests

- [ ] Runtime tests in appropriate `tests/unit/*.test.ts` file
- [ ] Success and error paths both covered
- [ ] Edge cases covered (missing fields, unmappable types, empty policies, invalid schemas)
- [ ] Line coverage > 95%, branch coverage > 90%

### 3. Type Tests

- [ ] Type tests in `tests/cedar-policy.test-d.ts`
- [ ] All exported interfaces verified
- [ ] `cedarPolicy` return type verified as `PolicyConstraint`
- [ ] Error type discriminant narrowing verified

### 4. Mutation Tests

- [ ] Mutation score > 80% for entity mapping code
- [ ] Mutation score > 80% for decision mapping code
- [ ] No surviving mutants in security-critical paths (entity UID construction, decision kind mapping)

### 5. Integration Tests

- [ ] Cedar + Guard end-to-end evaluation works
- [ ] Cedar policies compose with native Guard policies
- [ ] Field visibility flows through composed evaluation
- [ ] Evaluation trace includes Cedar diagnostics

### 6. Traceability

- [ ] Every new requirement ID maps to at least one test
- [ ] Requirement counts in process/requirement-id-scheme.md updated

### 7. Build

- [ ] `tsc -p tsconfig.build.json` succeeds
- [ ] No unintended new exports
- [ ] WASM module loads without error in test environment
