# @hex-di/http-client — Traceability Matrix

Forward and backward traceability from user requirements to source modules, test files, invariants, FMEA failure modes, and definitions of done.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-TRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/traceability.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Traceability Overview

```
URS-HTTP-NNN (user requirement, 00-urs.md)
    ↓
§N (spec section — FS/DS combined chapters)
    ↓
INV-HC-N (invariant — invariants.md)
    ↓
FM-N (FMEA failure mode — risk-assessment.md)
    ↓
<PREFIX>-NNN (test ID — 17-definition-of-done.md)
    ↓
OQ-HT-NN (operational qualification check)
```

---

## Requirement Identification Convention

See [process/requirement-id-scheme.md](./process/requirement-id-scheme.md) for the full scheme table. Summary:

- `URS-HTTP-NNN` — User requirements (`00-urs.md`)
- `§N` — Spec sections (all chapters)
- `INV-HC-N` — Invariants (`invariants.md`)
- `ADR-HC-NNN` — Architecture decisions (`decisions/`)
- `<PREFIX>-NNN` — Test IDs (`17-definition-of-done.md`)
- `OQ-HT-NN` — Operational qualification checks

---

## Capability-Level Traceability

| # | Capability | Spec File | Source Modules (planned) | Risk Level | Subpath |
|---|-----------|-----------|--------------------------|-----------|---------|
| 1 | Core types (Headers, UrlParams, HttpBody) | `02-core-types.md` | `src/types/` | Medium | `@hex-di/http-client` |
| 2 | HttpRequest constructors & combinators | `03-http-request.md` | `src/request/` | Medium | `@hex-di/http-client` |
| 3 | HttpResponse body accessors & utilities | `04-http-response.md` | `src/response/` | High | `@hex-di/http-client` |
| 4 | Error types, constructors, guards | `05-error-types.md` | `src/errors/` | High | `@hex-di/http-client` |
| 5 | HttpClient interface & port | `06-http-client-port.md` | `src/ports/` | Medium | `@hex-di/http-client` |
| 6 | Client combinators | `07-client-combinators.md` | `src/combinators/` | Medium | `@hex-di/http-client` |
| 7 | Transport adapters | `08-transport-adapters.md` | `src/adapters/` (per package) | Low | `@hex-di/http-client-*` |
| 8 | Scoped clients | `09-scoped-clients.md` | `src/context/` | Low | `@hex-di/http-client` |
| 9 | DI ports & library inspector | `10-integration.md` | `src/ports/`, `src/inspection/` | Medium | `@hex-di/http-client` |
| 10 | HttpClientInspector API | `11-introspection.md` | `src/inspection/` | Low | `@hex-di/http-client` |
| 11 | Testing utilities & mock adapter | `12-testing.md` | `src/testing/` | Low | `@hex-di/http-client` |
| 12 | Advanced patterns | `13-advanced.md` | `src/interceptors/` | Low | `@hex-di/http-client` |
| 13 | API quick reference | `14-api-reference.md` | N/A (cross-reference only) | Low | N/A |
| 14 | HTTP transport security combinators | `16-http-transport-security.md` | `src/security/` (guard library) | High | `@hex-di/guard` |
| 15 | Informational appendices & operational runbooks | `15-appendices.md` | N/A (reference material) | Low | N/A |

---

## Requirement-Level Traceability

| Spec File | Section Range | Test ID Range | Count |
|-----------|--------------|---------------|-------|
| `02-core-types.md` | §1–§8 | CT-001 – CT-017 | 17 |
| `03-http-request.md` | §9–§14 | RQ-001 – RQ-020 | 20 |
| `04-http-response.md` | §15–§18 | RS-001 – RS-011 | 11 |
| `05-error-types.md` | §19–§24 | ER-001 – ER-015, EF-001 – EF-005 | 20 |
| `06-http-client-port.md` | §25–§28 | PT-001 – PT-005 | 5 |
| `07-client-combinators.md` | §29–§38 | CC-001 – CC-030 | 30 |
| `08-transport-adapters.md` | §39–§44 | FA-001 – FA-010, AX-001 – AX-010, GT-001 – GT-010, KY-001 – KY-010, OF-001 – OF-010 | 50 |
| `09-scoped-clients.md` | §45–§48 | SC-001 – SC-010 | 10 |
| `10-integration.md` | §49–§53 | IT-001 – IT-011 | 11 |
| `11-introspection.md` | §54–§57 | IN-001 – IN-014, AI-001 – AI-010, AS-001 – AS-006, MT-001 – MT-009, LI-001 – LI-012, CS-001 – CS-007, HL-001 – HL-008, CH-001 – CH-006, MR-001 – MR-009 | 81 |
| `12-testing.md` | §58–§63 | TU-001 – TU-015 | 15 |
| `13-advanced.md` | §64–§69 | A2-001 – A2-002, IC-001 – IC-005, CB-001 – CB-008, RL-001 – RL-004, RC-001 – RC-005 | 24 |
| `14-api-reference.md` | §70–§78 | cross-reference only³ | 0 |
| `compliance/gxp.md` | §79–§109 | GX-001 – GX-038 | 38 |
| `16-http-transport-security.md` | §84–§90d | SEC-001 – SEC-050 | 50 |
| `15-appendices.md` | — | `[OPERATIONAL]` requirements only² | 0 |
| **Total** | | | **382**⁴ |

> ² All requirements in `15-appendices.md` are tagged `[OPERATIONAL]` (deployment procedures, training records, incident response runbooks, migration procedures). No automated tests apply; these are verified by operational qualification review.
>
> ³ `14-api-reference.md` is a consolidated API quick-reference chapter. Its sections §70–§78 are cross-references to API defined in other chapters (§1–§69). No independent requirements or test IDs are assigned here.
>
> ⁴ This table counts only requirement-mapped tests (those that trace to a specific spec section §N). An additional 34 cross-cutting tests are enumerated in `17-definition-of-done.md` but span multiple sections: 12 type-level tests (TL-001–TL-012, verifying public API return types across §2–§28) and 22 E2E tests (E2E-001–E2E-022, exercising the full pipeline end-to-end). Including cross-cutting tests, the full DoD enumeration totals **416** (382 + 34).

---

## Invariant Traceability

| Invariant | Risk | Unit Tests | Type Tests | GxP Tests | Mutation Tests | FM-N | DoD Reference |
|-----------|------|-----------|-----------|-----------|----------------|------|--------------|
| INV-HC-1: Request immutability | Medium | `request.test.ts` (RQ-004), `request-combinators.test.ts` | `http-request.test-d.ts` | — | — | FM-1 | `17-definition-of-done.md` DoD 2 |
| INV-HC-2: Body caching | Low | `response.test.ts` (RS-004) | — | — | — | FM-2 | `17-definition-of-done.md` DoD 3 |
| INV-HC-3: Body single-consumption | **High** | `response.test.ts` (RS-005) | `errors.test-d.ts` | `gxp-body-consumption.test.ts` | ≥ 95% on `src/response/` | FM-3 | `17-definition-of-done.md` DoD 3 |
| INV-HC-4: Error immutability | Low | `errors.test.ts` (ER-001–003) | — | `gxp-error-freeze.test.ts`³ | — | FM-4 | `17-definition-of-done.md` DoD 4 |
| INV-HC-5: Populate-freeze-return | Negligible | `error-freezing.test.ts` (EF-001–EF-005)⁴ | — | — | — | FM-5 | `17-definition-of-done.md` DoD 11 |
| INV-HC-6: Error discriminant | Negligible | — (compile-time) | `errors.test-d.ts` | — | — | FM-6 | — |
| INV-HC-7: Never-throw contract | Medium | `port.test.ts` (PT-001–PT-004), `graph-integration.test.ts` (PT-005) | `http-client-port.test-d.ts` | — | — | FM-7 | `17-definition-of-done.md` DoD 5 |
| INV-HC-8: Response back-reference | Medium | `response.test.ts` (RS-011) | — | — | — | FM-8 | `17-definition-of-done.md` DoD 3 |
| INV-HC-9: Combinator order | Low | `combinators.test.ts` (CC-001+) | — | — | — | FM-9 | `17-definition-of-done.md` DoD 6 |
| INV-HC-10: Header case-normalization | Medium | `headers.test.ts` (CT-001, CT-004, CT-006) | — | — | — | FM-10 | `17-definition-of-done.md` DoD 1 |

> ³ INV-HC-4 (Low risk) has a GxP test assigned as defense-in-depth beyond the Low-risk minimum. See [FM-4 Low-Risk Justification](./risk-assessment.md#fm-4--inv-hc-4-error-mutation-low--rpn-36).
>
> ⁴ INV-HC-5 (Negligible) has unit tests (EF-001–EF-005 in `error-freezing.test.ts`) assigned as defense-in-depth. The populate-freeze-return sequence is enforced by code structure (Negligible classification stands), but the tests verify correct implementation of the pattern. See [FM-5](./risk-assessment.md#fm-5-zero-mutation-window-violation).

---

## ADR Traceability

| ADR | Decision | Affected Invariants | Affected Spec Sections |
|-----|---------|--------------------|-----------------------|
| ADR-HC-001 | Combinator composition over middleware | INV-HC-9 | §29–§38 |
| ADR-HC-002 | Frozen value objects for requests | INV-HC-1 | §9–§14 |
| ADR-HC-003 | Result-only error channel | INV-HC-7 | §25 |
| ADR-HC-004 | `bodyJson` returns Result | INV-HC-7 | §13 |
| ADR-HC-005 | Lazy body accessors with caching | INV-HC-2, INV-HC-3 | §15–§16 |
| ADR-HC-006 | Error freezing for ALCOA+ | INV-HC-4, INV-HC-5 | §23 |
| ADR-HC-007 | Transport adapters as separate packages | — | §39–§44 |
| ADR-HC-008 | Back-reference from response to request | INV-HC-8 | §15, §20, §21 |
| ADR-HC-009 | Scoped clients design (`ScopedHttpClient`) | — | §45–§48 |
| ADR-HC-010 | Introspection port architecture | — | §54–§57 |

---

## Test File Map

Backward traceability: test file → spec coverage → test level.

| Test File | Spec Coverage | Level |
|-----------|--------------|-------|
| `tests/unit/headers.test.ts` | `02-core-types.md` §1–§8 (CT-001–CT-007) | Unit |
| `tests/unit/url-params.test.ts` | `02-core-types.md` §1–§8 (CT-008–CT-013) | Unit |
| `tests/unit/body.test.ts` | `02-core-types.md` §1–§8 (CT-014–CT-017) | Unit |
| `tests/unit/request.test.ts` | `03-http-request.md` §9–§10 (RQ-001–RQ-004, RQ-018) | Unit |
| `tests/unit/request-combinators.test.ts` | `03-http-request.md` §11–§14 (RQ-005–RQ-020) | Unit |
| `tests/unit/response.test.ts` | `04-http-response.md` §15–§16 (RS-001–RS-005, RS-011) | Unit |
| `tests/unit/response-status.test.ts` | `04-http-response.md` §17 (RS-006–RS-008) | Unit |
| `tests/unit/response-headers.test.ts` | `04-http-response.md` §18 (RS-009–RS-010) | Unit |
| `tests/unit/errors.test.ts` | `05-error-types.md` §23 (ER-001–ER-003) | Unit |
| `tests/unit/error-guards.test.ts` | `05-error-types.md` §23 (ER-004–ER-014) | Unit |
| `tests/unit/error-codes.test.ts` | `05-error-types.md` §23 (ER-015) | Unit |
| `tests/unit/error-freezing.test.ts` | `05-error-types.md` §23 (EF-001–EF-005) | Unit |
| `tests/unit/port.test.ts` | `06-http-client-port.md` §25–§27 (PT-001–PT-004) | Unit |
| `tests/unit/combinators.test.ts` | `07-client-combinators.md` §29–§38 (CC-001–CC-013, CC-029–CC-030) | Unit |
| `tests/unit/retry.test.ts` | `07-client-combinators.md` §33 (CC-014–CC-023) | Unit |
| `tests/unit/timeout.test.ts` | `07-client-combinators.md` §34 (CC-024–CC-025) | Unit |
| `tests/unit/error-recovery.test.ts` | `07-client-combinators.md` §35 (CC-026–CC-027) | Unit |
| `tests/unit/combinator-composition.test.ts` | `07-client-combinators.md` §29–§38 (CC-028) | Unit |
| `tests/unit/scoped-client.test.ts` | `09-scoped-clients.md` §45–§48 (SC-001–SC-003, SC-007–SC-010) | Unit |
| `tests/unit/registry.test.ts` | `11-introspection.md` §54–§57 (IN-001–IN-003) | Unit |
| `tests/unit/inspector.test.ts` | `11-introspection.md` §54–§57 (IN-004–IN-014) | Unit |
| `tests/unit/audit-integrity.test.ts` | `11-introspection.md` §54–§57 (AI-001–AI-010, GX-037–GX-038) | Unit |
| `tests/unit/audit-sink.test.ts` | `11-introspection.md` §54–§57 (AS-001–AS-006, GX-013–GX-015) | Unit |
| `tests/unit/monotonic-timing.test.ts` | `11-introspection.md` §54–§57 (MT-001–MT-005) | Unit |
| `tests/unit/audit-warning.test.ts` | `11-introspection.md` §54–§57 (MT-006–MT-009) | Unit |
| `tests/unit/library-inspector-bridge.test.ts` | `11-introspection.md` §54–§57 (LI-001–LI-012) | Unit |
| `tests/unit/combinator-state.test.ts` | `11-introspection.md` §54–§57 (CS-001–CS-007) | Unit |
| `tests/unit/health.test.ts` | `11-introspection.md` §54–§57 (HL-001–HL-008) | Unit |
| `tests/unit/combinator-chain.test.ts` | `11-introspection.md` §54–§57 (CH-001–CH-006) | Unit |
| `tests/unit/mcp-resources.test.ts` | `11-introspection.md` §54–§57 (MR-001–MR-009) | Unit |
| `tests/unit/mock-client.test.ts` | `12-testing.md` (TU-001–TU-005) | Unit |
| `tests/unit/recording-client.test.ts` | `12-testing.md` (TU-006–TU-009) | Unit |
| `tests/unit/response-factory.test.ts` | `12-testing.md` (TU-010–TU-011) | Unit |
| `tests/unit/mock-adapter.test.ts` | `12-testing.md` (TU-012) | Unit |
| `tests/unit/matchers.test.ts` | `12-testing.md` (TU-013–TU-015) | Unit |
| `tests/unit/a2a-skills.test.ts` | `13-advanced.md` §69 (A2-001–A2-002) | Unit |
| `tests/unit/interceptor-chain.test.ts` | `13-advanced.md` §64 (IC-001–IC-005) | Unit — Pending⁵ |
| `tests/unit/circuit-breaker.test.ts` | `13-advanced.md` §65 (CB-001–CB-008) | Unit — Pending⁵ |
| `tests/unit/rate-limiter.test.ts` | `13-advanced.md` §66 (RL-001–RL-004) | Unit — Pending⁵ |
| `tests/unit/cache.test.ts` | `13-advanced.md` §67 (RC-001–RC-005) | Unit — Pending⁵ |
| `tests/unit/transport-security.test.ts` | `16-http-transport-security.md` §85 (SEC-001–SEC-008) | Unit |
| `tests/unit/payload-integrity.test.ts` | `16-http-transport-security.md` §86 (SEC-009–SEC-015) | Unit |
| `tests/unit/credential-protection.test.ts` | `16-http-transport-security.md` §87 (SEC-016–SEC-022) | Unit |
| `tests/unit/payload-validation.test.ts` | `16-http-transport-security.md` §89 (SEC-023–SEC-028) | Unit |
| `tests/unit/token-lifecycle.test.ts` | `16-http-transport-security.md` §90 (SEC-029–SEC-035) | Unit |
| `tests/unit/ssrf-protection.test.ts` | `16-http-transport-security.md` §90a (SEC-036–SEC-040) | Unit |
| `tests/unit/hsts-csrf.test.ts` | `16-http-transport-security.md` §90c–§90d (SEC-041–SEC-046) | Unit |
| `tests/unit/gxp-body-consumption.test.ts` | `04-http-response.md` §15 (INV-HC-3 / FM-3) | GxP |
| `tests/unit/gxp-error-freeze.test.ts` | `05-error-types.md` §23 (INV-HC-4, INV-HC-5 / FM-4, FM-5) | GxP |
| `tests/unit/gxp-compliance.test.ts` | `compliance/gxp.md` §79–§109 (GX-001–GX-003, GX-010) | GxP |
| `tests/unit/gxp-audit-bridge.test.ts` | `compliance/gxp.md` §79–§109 (GX-004–GX-006) | GxP |
| `tests/unit/gxp-schema-versioning.test.ts` | `compliance/gxp.md` §79–§109 (GX-007–GX-009) | GxP |
| `tests/unit/gxp-available.test.ts` | `compliance/gxp.md` §79–§109 (GX-012) | GxP |
| `tests/unit/gxp-fail-fast.test.ts` | `compliance/gxp.md` §79–§109 (GX-016–GX-019) | GxP |
| `tests/unit/gxp-sink-retry.test.ts` | `compliance/gxp.md` §79–§109 (GX-020–GX-023) | GxP |
| `tests/unit/gxp-body-snapshot.test.ts` | `compliance/gxp.md` §79–§109 (GX-024–GX-029) | GxP |
| `tests/unit/gxp-eviction.test.ts` | `compliance/gxp.md` §79–§109 (GX-030–GX-036) | GxP |
| `tests/unit/gxp-scope-lifecycle.test.ts` | `09-scoped-clients.md` §45–§46 (SC-004–SC-006) | GxP |
| `tests/integration/fetch-adapter.test.ts` | `08-transport-adapters.md` §39–§44 (FA-001–FA-010) | Integration |
| `tests/integration/axios-adapter.test.ts` | `08-transport-adapters.md` §39–§44 (AX-001–AX-010) | Integration |
| `tests/integration/got-adapter.test.ts` | `08-transport-adapters.md` §39–§44 (GT-001–GT-010) | Integration |
| `tests/integration/ky-adapter.test.ts` | `08-transport-adapters.md` §39–§44 (KY-001–KY-010) | Integration |
| `tests/integration/ofetch-adapter.test.ts` | `08-transport-adapters.md` §39–§44 (OF-001–OF-010) | Integration |
| `tests/integration/graph-integration.test.ts` | `06-http-client-port.md` §25–§28, `10-integration.md` §49–§53 (PT-005, IT-004) | Integration |
| `tests/integration/container-integration.test.ts` | `10-integration.md` §49–§53 (IT-001) | Integration |
| `tests/integration/scoped-client.test.ts` | `09-scoped-clients.md` §45–§48 (IT-002–IT-003) | Integration |
| `tests/integration/inspector-integration.test.ts` | `11-introspection.md` §54–§57 (IT-005) | Integration |
| `tests/integration/tracing-integration.test.ts` | `10-integration.md` §49–§53 (IT-006) | Integration |
| `tests/integration/mock-adapter-integration.test.ts` | `12-testing.md` (IT-007) | Integration |
| `tests/integration/cross-library.test.ts` | `10-integration.md` §49–§53 (IT-008) | Integration |
| `tests/integration/library-inspector-integration.test.ts` | `11-introspection.md` §54–§57 (IT-009) | Integration |
| `tests/integration/audit-sink-integration.test.ts` | `11-introspection.md` §54–§57 (IT-010) | Integration |
| `tests/integration/audit-warning-integration.test.ts` | `11-introspection.md` §54–§57 (IT-011) | Integration |
| `tests/integration/gxp-security-pipeline.test.ts` | `16-http-transport-security.md` §84–§90d (SEC-047–SEC-050) | Integration |
| `tests/integration/gxp-enduring.test.ts` | `compliance/gxp.md` §79–§109 (GX-011) | Integration |
| `tests/http-client-port.test-d.ts` | `06-http-client-port.md` §25–§28 (TL-001–TL-003) | Type |
| `tests/http-request.test-d.ts` | `03-http-request.md` §9–§14 (TL-004–TL-006) | Type |
| `tests/combinators.test-d.ts` | `07-client-combinators.md` §29–§38 (TL-007–TL-009) | Type |
| `tests/http-response.test-d.ts` | `04-http-response.md` §15–§18 (TL-010–TL-011) | Type |
| `tests/error-types.test-d.ts` | `05-error-types.md` §19 (TL-012, INV-HC-6) | Type |
| `tests/e2e/e2e-pipeline.test.ts` | §9–§38 (E2E-001) | E2E |
| `tests/e2e/e2e-resilience.test.ts` | §29–§38 (E2E-002) | E2E |
| `tests/e2e/e2e-scoped.test.ts` | §45–§48 (E2E-003) | E2E |
| `tests/e2e/e2e-errors.test.ts` | §19–§24 (E2E-004) | E2E |
| `tests/e2e/e2e-interceptors.test.ts` | §29–§38 (E2E-005) | E2E |
| `tests/e2e/e2e-gxp-pipeline.test.ts` | §79–§109 (E2E-006) | E2E |
| `tests/e2e/e2e-audit-chain.test.ts` | §54–§57, §79–§109 (E2E-007) | E2E |
| `tests/e2e/e2e-transport-security.test.ts` | §84–§90d (E2E-008) | E2E |
| `tests/e2e/e2e-cross-correlation.test.ts` | §79–§109 (E2E-009) | E2E |
| `tests/e2e/e2e-cert-pinning.test.ts` | §84–§89 (E2E-010) | E2E |
| `tests/e2e/e2e-wal-recovery.test.ts` | §79–§109 (E2E-011) | E2E |
| `tests/e2e/e2e-token-lifecycle.test.ts` | §90 (E2E-012) | E2E |
| `tests/e2e/e2e-ssrf-protection.test.ts` | §90a (E2E-013) | E2E |
| `tests/e2e/e2e-electronic-signature.test.ts` | §79–§109 (E2E-014) | E2E |
| `tests/e2e/e2e-scope-isolation.test.ts` | §45–§48, §54–§57 (E2E-015) | E2E |
| `tests/e2e/e2e-payload-validation.test.ts` | §89 (E2E-016) | E2E |
| `tests/e2e/e2e-hsts.test.ts` | §90c (E2E-017) | E2E |
| `tests/e2e/e2e-body-snapshot.test.ts` | §79–§109 (E2E-018) | E2E |
| `tests/e2e/e2e-encryption.test.ts` | §79–§109 (E2E-019) | E2E |
| `tests/e2e/e2e-degraded-mode.test.ts` | §54–§57, §79–§109 (E2E-020) | E2E |
| `tests/e2e/e2e-config-change-control.test.ts` | §79–§109 (E2E-021) | E2E |
| `tests/e2e/e2e-auth-strength.test.ts` | §90–§90d (E2E-022) | E2E |

> ⁵ **Pending implementation**: these four test files cover `13-advanced.md` §64–§67 (interceptor chains IC-001–IC-005, circuit breaker CB-001–CB-008, rate limiter RL-001–RL-004, response caching RC-001–RC-005). The features are specified but not yet implemented. The verification script skips rather than fails for these entries. Remove the corresponding `PENDING_TESTS` entries in `scripts/verify-traceability.sh` when each file is created.

---

## DoD Traceability

| DoD Item | Spec Section(s) | Verified By |
|----------|-----------------|-------------|
| Core types (CT-001–CT-017) | `02-core-types.md` §1–§8 | `headers.test.ts`, `url-params.test.ts`, `body.test.ts` |
| HttpRequest (RQ-001–RQ-020) | `03-http-request.md` §9–§14 | `request.test.ts`, `request-combinators.test.ts` |
| HttpResponse (RS-001–RS-011) | `04-http-response.md` §15–§18 | `response.test.ts`, `response-status.test.ts`, `response-headers.test.ts` |
| Error types (ER-001–ER-015) | `05-error-types.md` §19–§23 | `errors.test.ts`, `error-guards.test.ts`, `error-codes.test.ts` |
| Error freezing (EF-001–EF-005) | `05-error-types.md` §23 | `error-freezing.test.ts` |
| HTTP Client Port (PT-001–PT-005) | `06-http-client-port.md` §25–§27 | `port.test.ts` (PT-001–PT-004), `graph-integration.test.ts` (PT-005) |
| Combinators (CC-001–CC-030) | `07-client-combinators.md` §29–§38 | `combinators.test.ts`, `retry.test.ts`, `timeout.test.ts`, `error-recovery.test.ts`, `combinator-composition.test.ts` |
| Fetch adapter (FA-001–FA-010) | `08-transport-adapters.md` §39–§44 | `fetch-adapter.test.ts` |
| Axios adapter (AX-001–AX-010) | `08-transport-adapters.md` §39–§44 | `axios-adapter.test.ts` |
| Got adapter (GT-001–GT-010) | `08-transport-adapters.md` §39–§44 | `got-adapter.test.ts` |
| Ky adapter (KY-001–KY-010) | `08-transport-adapters.md` §39–§44 | `ky-adapter.test.ts` |
| Ofetch adapter (OF-001–OF-010) | `08-transport-adapters.md` §39–§44 | `ofetch-adapter.test.ts` |
| Introspection registry and API (IN-001–IN-014) | `11-introspection.md` §54–§57 | `registry.test.ts`, `inspector.test.ts` |
| Audit chain integrity (AI-001–AI-010) | `11-introspection.md` §54–§57 | `audit-integrity.test.ts` |
| Audit sink (AS-001–AS-006) | `11-introspection.md` §54–§57 | `audit-sink.test.ts` |
| Monotonic timing and warnings (MT-001–MT-009) | `11-introspection.md` §54–§57 | `monotonic-timing.test.ts`, `audit-warning.test.ts` |
| Library inspector bridge (LI-001–LI-012) | `11-introspection.md` §54–§57 | `library-inspector-bridge.test.ts` |
| Combinator state (CS-001–CS-007) | `11-introspection.md` §54–§57 | `combinator-state.test.ts` |
| Health abstraction (HL-001–HL-008) | `11-introspection.md` §54–§57 | `health.test.ts` |
| Combinator chain (CH-001–CH-006) | `11-introspection.md` §54–§57 | `combinator-chain.test.ts` |
| MCP resources (MR-001–MR-009) | `11-introspection.md` §54–§57 | `mcp-resources.test.ts` |
| Testing utilities (TU-001–TU-015) | `12-testing.md` | `mock-client.test.ts`, `recording-client.test.ts`, `response-factory.test.ts`, `mock-adapter.test.ts`, `matchers.test.ts` |
| A2A skills (A2-001–A2-002) | `13-advanced.md` §69 | `a2a-skills.test.ts` |
| Interceptor chains (IC-001–IC-005) | `13-advanced.md` §64 | `interceptor-chain.test.ts` ⁵ |
| Circuit breaker (CB-001–CB-008) | `13-advanced.md` §65 | `circuit-breaker.test.ts` ⁵ |
| Rate limiting (RL-001–RL-004) | `13-advanced.md` §66 | `rate-limiter.test.ts` ⁵ |
| Response caching (RC-001–RC-005) | `13-advanced.md` §67 | `cache.test.ts` ⁵ |
| Transport security (SEC-001–SEC-050) | `16-http-transport-security.md` §84–§90d | `transport-security.test.ts`, `payload-integrity.test.ts`, `credential-protection.test.ts`, `payload-validation.test.ts`, `token-lifecycle.test.ts`, `ssrf-protection.test.ts`, `hsts-csrf.test.ts`, `gxp-security-pipeline.test.ts` |
| GxP compliance (GX-001–GX-038) | `compliance/gxp.md` §79–§109 | `gxp-body-consumption.test.ts`, `gxp-error-freeze.test.ts`, `gxp-compliance.test.ts`, `gxp-audit-bridge.test.ts`, `gxp-schema-versioning.test.ts`, `gxp-available.test.ts`, `gxp-enduring.test.ts`, `gxp-fail-fast.test.ts`, `gxp-sink-retry.test.ts`, `gxp-body-snapshot.test.ts`, `gxp-eviction.test.ts`, `audit-integrity.test.ts` (GX-037–GX-038), `audit-sink.test.ts` (GX-013–GX-015) |
| Type-level tests (TL-001–TL-012) | All chapters (type contracts) | `http-client-port.test-d.ts`, `http-request.test-d.ts`, `combinators.test-d.ts`, `http-response.test-d.ts`, `error-types.test-d.ts` |
| Scoped clients (SC-001–SC-010) | `09-scoped-clients.md` §45–§48 | `scoped-client.test.ts`, `gxp-scope-lifecycle.test.ts` |
| Integration tests (IT-001–IT-011) | `10-integration.md` §49–§53, `09-scoped-clients.md` §45–§48 | `container-integration.test.ts`, `scoped-client.test.ts`, `graph-integration.test.ts`, `inspector-integration.test.ts`, `tracing-integration.test.ts`, `mock-adapter-integration.test.ts`, `cross-library.test.ts`, `library-inspector-integration.test.ts`, `audit-sink-integration.test.ts`, `audit-warning-integration.test.ts` |
| E2E tests (E2E-001–E2E-022) | All chapters | `e2e-pipeline.test.ts`, `e2e-resilience.test.ts`, `e2e-scoped.test.ts`, `e2e-errors.test.ts`, `e2e-interceptors.test.ts`, `e2e-gxp-pipeline.test.ts`, `e2e-audit-chain.test.ts`, `e2e-transport-security.test.ts`, `e2e-cross-correlation.test.ts`, `e2e-cert-pinning.test.ts`, `e2e-wal-recovery.test.ts`, `e2e-token-lifecycle.test.ts`, `e2e-ssrf-protection.test.ts`, `e2e-electronic-signature.test.ts`, `e2e-scope-isolation.test.ts`, `e2e-payload-validation.test.ts`, `e2e-hsts.test.ts`, `e2e-body-snapshot.test.ts`, `e2e-encryption.test.ts`, `e2e-degraded-mode.test.ts`, `e2e-config-change-control.test.ts`, `e2e-auth-strength.test.ts` |
| API reference (§70–§78) | `14-api-reference.md` | cross-reference only — no independent tests; covered by tests of the chapters being referenced |
| Appendices operational requirements | `15-appendices.md` | `[OPERATIONAL]` — verified by deployment procedure review, not automated tests |

> ⁵ Pending implementation — see footnote above the Test File Map.

---

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|-----------------|
| Line coverage | ≥ 95% | GAMP 5 Category 5 |
| Branch coverage | ≥ 90% | GAMP 5 Category 5 |
| Mutation score (aggregate) | ≥ 88% | ICH Q9 risk-proportionate |
| Mutation score (High-risk) | ≥ 95% | ICH Q9 High-risk threshold |
| Type test coverage | 100% of public API types | ADR-HC-003 |
