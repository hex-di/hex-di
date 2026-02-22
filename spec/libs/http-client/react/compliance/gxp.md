# @hex-di/http-client-react — GxP Compliance

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-GXP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/compliance/gxp.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## GAMP 5 Software Classification

| Field | Value |
|-------|-------|
| **Category** | Category 5 — Custom Software |
| **Sub-classification** | React integration layer for a Category 5 library |
| **Rationale** | `@hex-di/http-client-react` is bespoke integration code that wraps the `HttpClientPort` abstraction in React-specific constructs (Context, hooks). It is not configurable infrastructure (Category 4) nor an off-the-shelf product (Category 3). All custom logic executes in the browser/SSR runtime and is subject to full change control per GAMP 5 §D.5. |
| **Validation Approach** | Proportionate per ICH Q9 and GAMP 5 §5.1 — the React layer carries no independent GxP risk surface (see Residual Risk Statement below). Qualification is achieved by delegating to the parent `@hex-di/http-client` qualification protocols and verifying the React binding layer via `05-definition-of-done.md` (44 specified tests). |

---

## GxP Compliance Scope

`@hex-di/http-client-react` is a **pure React integration layer** that exposes the `HttpClient` port to React component trees via `HttpClientProvider` and hooks (`useHttpClient`, `useHttpRequest`, `useHttpMutation`). It contains no HTTP transport logic, no request construction, and no data persistence.

The React integration layer has **no independent GxP regulatory surface**. All GxP-relevant behaviour (audit trails, HTTPS enforcement, electronic signatures, credential protection, ALCOA+ data integrity) originates in `@hex-di/http-client` (the core package) and its transport adapters.

---

## Delegation to Parent Specification

All GxP compliance requirements for this package are governed by the parent `@hex-di/http-client` specification:

| Topic | Governing Document |
|-------|--------------------|
| GAMP 5 classification (primary) | [`../compliance/gxp.md`](../compliance/gxp.md) §GAMP 5 Software Classification |
| ALCOA+ principle mapping | [`../compliance/gxp.md`](../compliance/gxp.md) §ALCOA+ Principle Mapping |
| Audit trail port | [`../../10-integration.md`](../../10-integration.md) §§50–§51 |
| HTTPS enforcement | [`../compliance/gxp.md`](../compliance/gxp.md) §HTTPS Enforcement |
| Electronic signature adapter | [`../compliance/gxp.md`](../compliance/gxp.md) §Electronic Signature |
| Credential protection | [`../compliance/gxp.md`](../compliance/gxp.md) §Credential Protection |
| FMEA / risk assessment | [`../risk-assessment.md`](../risk-assessment.md) |
| Cross-cutting GxP methodology | [`spec/cross-cutting/gxp/`](../../../../cross-cutting/gxp/) |

---

## Cross-Cutting GxP Reference Table

The following cross-cutting GxP documents apply to this package. References follow the canonical cross-cutting spec structure at `spec/cross-cutting/gxp/`.

| Cross-Cutting Document | Applicability to React Layer | Notes |
|------------------------|------------------------------|-------|
| `01-regulatory-framework.md` — Regulatory Framework Overview | Indirect — React layer inherits regulatory obligations from the HTTP client it wraps | No direct regulatory interaction in the React layer |
| `02-alcoa-plus.md` — ALCOA+ Data Integrity | Not applicable to the React layer directly — ALCOA+ governs data at rest and in transit, not UI bindings | `@hex-di/http-client` satisfies ALCOA+ for the data channel; INV-HCR-1 (Client Passthrough) ensures the React layer does not alter data |
| `03-audit-trail.md` — Audit Trail Architecture | Not applicable — the React layer does not emit audit entries | Audit entries are emitted by the `HttpAuditTrailPort` adapter at the `HttpClient` level, not by the React hooks |
| `04-change-control.md` — Change Control Process | Applicable — changes to the React layer follow the same SemVer-to-revalidation mapping | See `process/change-control.md` for React-layer-specific change classification |
| `05-fmea-methodology.md` — FMEA Methodology | Applicable — React-layer FMEA uses the same S×O×D scoring methodology | See [`risk-assessment.md`](../risk-assessment.md) for the React-layer per-invariant FMEA |
| `06-validation-protocols.md` — IQ/OQ/PQ Framework | Applicable via delegation — React layer is verified within the parent package qualification protocols | `05-definition-of-done.md` provides the React-specific OQ test enumeration (44 tests) |

---

## Qualification Protocol Coverage

The `@hex-di/http-client-react` package participates in qualification only as a **test fixture layer**:

| Protocol | React Sub-Spec Role | Governing Document |
|----------|--------------------|--------------------|
| **IQ** (Installation Qualification) | Verified as a peer dependency of `@hex-di/http-client` | Parent `compliance/gxp.md` §IQ |
| **OQ** (Operational Qualification) | React hooks verified via `05-definition-of-done.md` (44 specified tests) | [`../compliance/gxp.md`](../compliance/gxp.md) §OQ |
| **PQ** (Performance Qualification) | No independent PQ scope — React hook overhead is negligible | Parent `compliance/gxp.md` §PQ |

---

## Residual Risk Statement

No residual GxP risk is introduced by this package independently. The React integration layer is a thin adapter that:

1. Does not modify `HttpClient` instances in transit (INV-HCR-1 — Client Passthrough).
2. Does not suppress or transform errors (INV-HCR-2 — Never-Throw Hook Contract).
3. Does not store request data outside React component state.
4. Does not retain any GxP-relevant data after component unmount (INV-HCR-4 — Abort on Unmount).

Any GxP risk introduced by this layer would manifest as incorrect data flow to/from the `HttpClient`, which is covered by the FMEA in [`risk-assessment.md`](../risk-assessment.md) (all failure modes rated Low/Medium, maximum RPN 112 for INV-HCR-4).
