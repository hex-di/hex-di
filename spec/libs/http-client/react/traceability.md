# @hex-di/http-client-react — Traceability Matrix

Forward and backward traceability from requirements to source modules, test files, invariants, FMEA failure modes, and definitions of done.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-TRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/traceability.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Traceability Overview

```
§N (spec section — chapter files 02–04)
    ↓
INV-HCR-N (invariant — invariants.md)
    ↓
FM-HCR-N (FMEA failure mode — risk-assessment.md)
    ↓
<TEST-ID> (test enumeration — 05-definition-of-done.md)
    ↓
DoD group (acceptance criteria — process/definitions-of-done.md)
```

---

## Requirement Identification Convention

See [process/requirement-id-scheme.md](./process/requirement-id-scheme.md) for the full scheme. Summary:

- `§N` — Spec sections (chapters 01–05; e.g., `§9.1`, `§15.4`)
- `INV-HCR-N` — Invariants (`invariants.md`)
- `ADR-HCR-NNN` — Architecture decisions (`decisions/`)
- Test IDs are grouped by DoD number (DoD 1–5) in `05-definition-of-done.md`

---

## Capability-Level Traceability

| # | Capability | Spec File | Source Modules | Risk Level | Package |
|---|-----------|-----------|----------------|-----------|---------|
| 1 | HttpClientProvider component | `02-provider.md` | `src/provider.tsx`, `src/context.ts` | Low | `@hex-di/http-client-react` |
| 2 | `useHttpClient` hook | `03-hooks.md §13` | `src/hooks/use-http-client.ts` | Low | `@hex-di/http-client-react` |
| 3 | `useHttpRequest` hook + state machine | `03-hooks.md §14–§15, §18` | `src/hooks/use-http-request.ts` | **High** | `@hex-di/http-client-react` |
| 4 | `useHttpMutation` hook + state machine | `03-hooks.md §16–§17, §18` | `src/hooks/use-http-mutation.ts` | Medium | `@hex-di/http-client-react` |
| 5 | Testing utilities | `04-testing.md` | `src/testing.ts` | Low | `@hex-di/http-client-react` |
| 6 | State types | `03-hooks.md §14, §16` | `src/types.ts` | Medium | `@hex-di/http-client-react` |

---

## Requirement-Level Traceability

| Spec File | Section Range | DoD Group | Test Count |
|-----------|--------------|-----------|------------|
| `02-provider.md` | §9–§12 | DoD 1 | 12 |
| `03-hooks.md` | §13 | DoD 2 | 6 |
| `03-hooks.md` | §14–§15, §18 | DoD 3 | 16 |
| `03-hooks.md` | §16–§17, §18 | DoD 4 | 12 |
| `04-testing.md` | §20–§22 | DoD 5 | 2 |
| `01-overview.md` | §1–§8 | — (spec-only) | — |
| **Total** | | | **48** (44 unique) |

---

## Invariant Traceability

| Invariant | Risk | Unit Tests | Type Tests | FM-N | DoD Reference |
|-----------|------|-----------|-----------|------|--------------|
| INV-HCR-1: Client Passthrough | Low | `provider.test.tsx` (tests 3, 5) | `test-d.ts` (test 9) | FM-HCR-1 | DoD 1 |
| INV-HCR-2: Never-Throw Hook Contract | Medium | `use-http-request.test.ts` (test 21), `use-http-mutation.test.ts` (test 40) | `test-d.ts` | FM-HCR-2 | DoD 3, DoD 4 |
| INV-HCR-3: Innermost Provider Wins | Low | `provider.test.tsx` (test 2) | — | FM-HCR-3 | DoD 1 |
| INV-HCR-4: Abort on Unmount | **High** | `use-http-request.test.ts` (tests 24, 25), `use-http-mutation.test.ts` (test 43) | — | FM-HCR-4 | DoD 3, DoD 4 |
| INV-HCR-5: Stable Context Value | Low | `provider.test.tsx` (test 7) | — | FM-HCR-5 | DoD 1 |

---

## ADR Traceability

| ADR | Decision | Affected Invariants | Affected Spec Sections |
|-----|---------|--------------------|-----------------------|
| ADR-HCR-001 | Context API over prop-drilling | INV-HCR-1, INV-HCR-3 | §9–§12 |
| ADR-HCR-002 | Result-typed hook state | INV-HCR-2 | §14–§18 |
| ADR-HCR-003 | No default/global client instance | INV-HCR-1 | §9, §11 |
| ADR-HCR-004 | AbortController lifecycle management | INV-HCR-4 | §15.5, §17.8, §18.1–§18.4 |
| ADR-HCR-005 | SSR handling — client-only execution | — | §9, §01-overview.md §7 |
| ADR-HCR-006 | Concurrent rendering safety | INV-HCR-4, INV-HCR-5 | §15.5, §17.8, §12.1–§12.2 |

---

## Test File Map

Backward traceability: test file → spec coverage → test level.

| Test File | Spec Coverage | Level |
|-----------|--------------|-------|
| `tests/unit/provider.test.tsx` | `02-provider.md` §9–§12 (DoD 1, tests 1–8) | Unit |
| `tests/unit/use-http-client.test.ts` | `03-hooks.md` §13 (DoD 2, tests 13–16) | Unit |
| `tests/unit/use-http-request.test.ts` | `03-hooks.md` §14–§15, §18 (DoD 3, tests 19–32) | Unit |
| `tests/unit/use-http-mutation.test.ts` | `03-hooks.md` §16–§17, §18 (DoD 4, tests 37–44) | Unit |
| `tests/unit/testing-utils.test.ts` | `04-testing.md` §20 (DoD 5, tests 49–50) | Unit |
| `tests/integration/provider-integration.test.tsx` | `02-provider.md` §9–§12 (DoD 1, tests 11–12) | Integration |
| `tests/integration/hooks-integration.test.tsx` | `03-hooks.md` §15, §17 (DoD 3 tests 35–36, DoD 4 tests 47–48) | Integration |
| `tests/http-client-react.test-d.ts` | `02-provider.md` §9, `03-hooks.md` §13–§17 (DoD 1 tests 9–10, DoD 2 tests 17–18, DoD 3 tests 33–34, DoD 4 tests 45–46) | Type |

---

## DoD Traceability

| DoD Group | Spec Section(s) | Test Files | Test Count |
|-----------|-----------------|------------|------------|
| DoD 1 — HttpClientProvider | `02-provider.md` §9–§12 | `provider.test.tsx`, `test-d.ts`, `provider-integration.test.tsx` | 12 |
| DoD 2 — useHttpClient | `03-hooks.md` §13 | `use-http-client.test.ts`, `test-d.ts` | 6 |
| DoD 3 — useHttpRequest | `03-hooks.md` §14–§15, §18 | `use-http-request.test.ts`, `test-d.ts`, `hooks-integration.test.tsx` | 16 |
| DoD 4 — useHttpMutation | `03-hooks.md` §16–§17, §18 | `use-http-mutation.test.ts`, `test-d.ts`, `hooks-integration.test.tsx` | 12 |
| DoD 5 — Testing Utilities | `04-testing.md` §20–§22 | `testing-utils.test.ts` | 2 |

---

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|-----------------|
| Line coverage | ≥ 95% | GAMP 5 Category 5 |
| Branch coverage | ≥ 90% | GAMP 5 Category 5 |
| Mutation score (aggregate) | ≥ 88% | ICH Q9 risk-proportionate testing |
| Mutation score (`useHttpRequest` state transitions) | ≥ 95% | High-risk invariant INV-HCR-4 |
| Type test coverage | 100% of public API types | ADR-HCR-002 |
