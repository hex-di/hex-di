# @hex-di/http-client — Feature Definition of Done

Per-feature acceptance criteria. The detailed test enumeration (416 test IDs across 33 domain groups) is maintained in [17-definition-of-done.md](../17-definition-of-done.md).

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-002 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/definitions-of-done.md` |
| Status | Effective |

---

## Feature Definition of Done

A feature is **done** when **all** of the following criteria are satisfied. Check each box before merging a pull request.

---

### 1. Specification

- [ ] Relevant spec chapter (`02-` through `14-`) updated with requirement IDs (`§N` section references)
- [ ] New invariants (if any) added to [`invariants.md`](../invariants.md) with `INV-HC-N` identifier and `**Related**` links to FMEA and spec sections
- [ ] ADR created in [`decisions/`](../decisions/) if an architectural decision was made
- [ ] Glossary terms updated in [`glossary.md`](../glossary.md)
- [ ] [`risk-assessment.md`](../risk-assessment.md) FMEA table updated if a new invariant was added or a risk score changed
- [ ] [`traceability.md`](../traceability.md) capability and invariant tables updated
- [ ] `17-definition-of-done.md` test tables updated with new test IDs
- [ ] If feature is GxP-relevant: [`compliance/gxp.md`](../compliance/gxp.md) ALCOA+ mapping and qualification protocol tables updated

---

### 2. Unit Tests

- [ ] Runtime tests in the appropriate `tests/unit/*.test.ts` file
- [ ] Success path covered (happy path with valid inputs)
- [ ] Error path covered (all `Err` variants for the feature)
- [ ] Edge cases covered (empty inputs, boundary values, concurrent calls where applicable)
- [ ] Line coverage ≥ 95%, branch coverage ≥ 90%
- [ ] Test IDs in `17-definition-of-done.md` match the tests in the file

---

### 3. Type Tests

- [ ] Compile-time type assertions in `tests/*.test-d.ts`
- [ ] Return types verified for all public functions
- [ ] Error type exhaustiveness verified for all `HttpClientError` variants involved
- [ ] `InferHttpClient` / port inference utilities verified if port-level types changed

---

### 4. GxP Tests (High-risk invariants only)

- [ ] If feature affects **INV-HC-3** (body single-consumption): `tests/unit/gxp-body-consumption.test.ts` updated
- [ ] If feature introduces a new **High-risk invariant**: a new `tests/unit/gxp-<feature>.test.ts` file created
- [ ] GxP test verifies `Object.isFrozen` behavior where applicable
- [ ] GxP test documents the ALCOA+ principle being verified in a comment

---

### 5. Mutation Tests

- [ ] Mutation score ≥ 88% aggregate (per `17-definition-of-done.md` target)
- [ ] For High-risk invariants: mutation score ≥ 95% on the relevant source file
- [ ] No surviving mutants in error constructor code paths

---

### 6. Traceability

- [ ] Every new test ID in `17-definition-of-done.md` maps to a spec section (`§N` reference in the DoD table)
- [ ] Every new `INV-HC-N` in `invariants.md` has a corresponding row in the Invariant Traceability table in `traceability.md`
- [ ] Every new ADR has a row in the ADR Traceability table in `traceability.md`
- [ ] Total test count in `17-definition-of-done.md` summary is updated

---

### 7. Build and Lint

- [ ] `tsc -p tsconfig.build.json` exits with no errors
- [ ] `pnpm lint` exits with no errors
- [ ] No unintended new exports added to `src/index.ts`
- [ ] Bundle size delta is within acceptable range (no accidental new dependencies)

---

### 8. Changeset

- [ ] `pnpm changeset` used to record the change type (patch/minor/major)
- [ ] Changeset description references the spec section(s) the change implements

---

## DoD Item Status Tracking

Cross-reference with [`17-definition-of-done.md`](../17-definition-of-done.md):

| Domain | Prefix | Count | Status |
|--------|--------|-------|--------|
| Core Types | CT | 17 | Pending |
| HttpRequest | RQ | 20 | Pending |
| HttpResponse | RS | 11 | Pending |
| Error Types | ER | 15 | Pending |
| Error Freezing | EF | 5 | Pending |
| HTTP Client Port | PT | 5 | Pending |
| Client Combinators | CC | 30 | Pending |
| Transport Adapters (Fetch) | FA | 10 | Pending |
| Transport Adapters (Axios) | AX | 10 | Pending |
| Transport Adapters (Got) | GT | 10 | Pending |
| Transport Adapters (Ky) | KY | 10 | Pending |
| Transport Adapters (Ofetch) | OF | 10 | Pending |
| Scoped Clients | SC | 10 | Pending |
| Introspection | IN | 14 | Pending |
| Audit Integrity | AI | 10 | Pending |
| Audit Sink | AS | 6 | Pending |
| Monotonic Timing | MT | 9 | Pending |
| Testing Utilities | TU | 15 | Pending |
| Library Inspector Bridge | LI | 12 | Pending |
| Combinator State | CS | 7 | Pending |
| Health Abstraction | HL | 8 | Pending |
| Combinator Chain | CH | 6 | Pending |
| MCP Resource Mapping | MR | 9 | Pending |
| A2A Skills | A2 | 2 | Pending |
| Interceptor Chains | IC | 5 | Pending |
| Circuit Breaker | CB | 8 | Pending |
| Rate Limiting | RL | 4 | Pending |
| Response Caching | RC | 5 | Pending |
| Transport Security | SEC | 50 | Pending |
| GxP Compliance | GX | 38 | Pending |
| Type-level tests | TL | 12 | Pending |
| Integration tests | IT | 11 | Pending |
| E2E tests | E2E | 22 | Pending |
| **Total** | | **416** | **Pending** |
