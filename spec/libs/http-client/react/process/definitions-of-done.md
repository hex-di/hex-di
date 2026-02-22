# @hex-di/http-client-react — Feature Definition of Done

Per-feature acceptance criteria. The detailed test enumeration (44 tests across 5 files) is maintained in [05-definition-of-done.md](../05-definition-of-done.md).

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Spec section updated with requirement IDs (`§N`)
- [ ] New invariants added to `invariants.md` with `INV-HCR-N` identifier
- [ ] ADR created if architectural decision was made
- [ ] `README.md` packages table and ToC updated if new export added
- [ ] `01-overview.md` API surface tables updated

### 2. Unit Tests

- [ ] Runtime tests in appropriate `*.test.ts` or `*.test.tsx` file
- [ ] Missing-provider error path tested for every hook
- [ ] All `HttpRequestStatus` transitions tested
- [ ] Loading state and abort-on-unmount tested
- [ ] Line coverage ≥ 95%, branch coverage ≥ 90%

### 3. Type Tests

- [ ] Type tests in `tests/http-client-react.test-d.ts`
- [ ] Generic type parameter narrowing verified (e.g., `UseHttpRequestState<E>`)
- [ ] Return types of all hooks verified

### 4. Integration Tests

- [ ] Full render cycle tested with `createHttpClientTestProvider` + real mock adapter
- [ ] Error state render cycle tested

### 5. Mutation Tests

- [ ] Mutation score ≥ 88% aggregate
- [ ] Mutation score ≥ 95% for `useHttpRequest` state transition logic (reactive state is High-risk)

### 6. Traceability

- [ ] Every new requirement ID maps to at least one test in `05-definition-of-done.md`
- [ ] `invariants.md` updated with `**Related**` links if new invariant added

### 7. Build

- [ ] `tsc -p tsconfig.build.json` succeeds
- [ ] No unintended new exports
- [ ] Peer dependency (`react >= 18.0`) declared correctly

### 8. Changeset

- [ ] `pnpm changeset` run; changeset file present in `.changeset/`
