# @hex-di/http-client-react

React integration for `@hex-di/http-client` — provides `HttpClientProvider` and hooks (`useHttpClient`, `useHttpRequest`, `useHttpMutation`) for consuming the `HttpClientPort` in React component trees.

## Quick Start

```bash
npm install @hex-di/http-client @hex-di/http-client-react @hex-di/http-client-fetch @hex-di/graph
```

```tsx
import { GraphBuilder } from "@hex-di/graph";
import { HttpClientPort } from "@hex-di/http-client";
import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";
import { HttpClientProvider, useHttpRequest } from "@hex-di/http-client-react";

const graph = GraphBuilder.create().add(FetchHttpClientAdapter).build();
const container = graph.createContainer();
const http = container.resolve(HttpClientPort);

function UserList() {
  const request = HttpRequest.get("/api/users");
  const state = useHttpRequest(request);

  if (state.status === "loading") return <p>Loading…</p>;
  if (state.result?.isErr()) return <p>Error: {state.result.error.message}</p>;
  return <ul>{state.result?.value.body.json.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

function App() {
  return (
    <HttpClientProvider client={http}>
      <UserList />
    </HttpClientProvider>
  );
}
```

> See [02 — Provider](./02-provider.md) for full `HttpClientProvider` API.
> See [03 — Hooks](./03-hooks.md) for complete hook reference.

## Features

- **`HttpClientProvider`** — provides an `HttpClient` instance to the component tree via React Context
- **`useHttpClient()`** — resolves the `HttpClient` from the nearest `HttpClientProvider`
- **`useHttpRequest(request)`** — executes an HTTP request reactively with loading/error state
- **`useHttpMutation()`** — imperative mutation hook returning `[mutate, state]` for write operations
- **No framework leakage** — core `@hex-di/http-client` has zero React dependency
- **Result-typed state** — all responses typed as `Result<HttpResponse, HttpRequestError>`; never throws

## Packages

| Package | Description |
| --- | --- |
| `@hex-di/http-client` | Core types, port, request/response, error types, combinators |
| `@hex-di/http-client-react` | Provider component, reactive hooks, testing utilities |

## Table of Contents

### Core Specification

- [01 — Overview](./01-overview.md) — mission, scope, design philosophy
- [02 — Provider](./02-provider.md) — `HttpClientProvider` component
- [03 — Hooks](./03-hooks.md) — `useHttpClient`, `useHttpRequest`, `useHttpMutation`
- [04 — Testing](./04-testing.md) — test utilities and patterns for React hook tests
- [05 — Definition of Done](./05-definition-of-done.md) — test enumeration, verification checklist

### Governance

- [Overview (API surface)](./overview.md) — package metadata, API tables, source file map
- [Invariants](./invariants.md) — runtime guarantees (INV-HCR-1 through INV-HCR-5)
- [Traceability](./traceability.md) — forward/backward requirement traceability matrix
- [Risk Assessment](./risk-assessment.md) — FMEA per-invariant analysis
- [Glossary](./glossary.md) — domain terminology
- [Roadmap](./roadmap.md) — planned future work

### Compliance

- [GxP Compliance](./compliance/gxp.md) — GxP delegation statement; inherits all regulatory requirements from `@hex-di/http-client`

### Type System

- [State Generic Types](./type-system/state-generics.md) — generic error parameter `E`, `HttpRequestStatus` discriminant narrowing, structural incompatibility between `UseHttpRequestState` and `UseHttpMutationState` via `reset()`, consistent `E` across `mutate` return and state

### Decisions (ADRs)

- [ADR-HCR-001](./decisions/001-context-over-props.md) — Context over prop-drilling
- [ADR-HCR-002](./decisions/002-result-typed-state.md) — Result-typed hook state
- [ADR-HCR-003](./decisions/003-no-global-fetch.md) — No default/global client instance
- [ADR-HCR-004](./decisions/004-abort-controller-lifecycle.md) — AbortController lifecycle management
- [ADR-HCR-005](./decisions/005-ssr-handling.md) — SSR handling (client-only request execution)
- [ADR-HCR-006](./decisions/006-concurrent-rendering-safety.md) — Concurrent rendering safety

### Process Documents

- [Definition of Done](./process/definitions-of-done.md)
- [Test Strategy](./process/test-strategy.md)
- [Requirement ID Scheme](./process/requirement-id-scheme.md)
- [Change Control](./process/change-control.md)
- [CI Maintenance](./process/ci-maintenance.md)
- [Document Control Policy](./process/document-control-policy.md)

### Scripts

- [verify-traceability.sh](./scripts/verify-traceability.sh) — automated traceability consistency validator

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this specification are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## Dependencies

| Package | Dependencies | Peer Dependencies |
| --- | --- | --- |
| `@hex-di/http-client-react` | `@hex-di/http-client`, `@hex-di/result` | `react >= 18.0` |

## Release Scope

All sections (§1–§22) ship in version 0.1.0. Total: **44 specified tests**.

| Source | Unit | Type-Level | Integration | Total |
| --- | --- | --- | --- | --- |
| Provider (§1–§8) | 8 | 2 | 2 | 12 |
| useHttpClient (§9–§12) | 4 | 2 | — | 6 |
| useHttpRequest (§13–§18) | 8 | 2 | 2 | 12 |
| useHttpMutation (§19–§22) | 8 | 2 | 2 | 12 |
| Testing utilities | 2 | — | — | 2 |
| **Total** | **30** | **8** | **6** | **44** |

---

## Document Control

| Field | Value |
| --- | --- |
| **Document ID** | SPEC-HCR-001 |
| **Package** | `@hex-di/http-client-react` |
| **Specification Version** | 0.1.0 |
| **Document State** | Effective |
| **Effective Date** | 2026-02-20 |
| **Document Owner** | HexDI Architecture Team |

### Sub-Document Version Control

Individual chapter files (`01-overview.md` through `05-definition-of-done.md`) do **not** carry separate version numbers. The suite-level specification revision (`0.1.0`) is the authoritative version identifier for all contained documents.

### Version Relationship Policy

The specification revision track and the npm package version track are **independent**:

| Track | Format | Increments when |
| --- | --- | --- |
| Specification revision | `Major.Minor` (e.g. `0.1`) | Content changes: new requirements, revised invariants |
| npm package version | SemVer `Major.Minor.Patch` (e.g. `0.1.0`) | Implementation changes: new features, bug fixes, breaking API changes |

The implementation **MUST** expose a `specRevision` constant matching the current specification revision.

### Formal Specification Approval Record

This specification requires formal approval before governing any validation activities. Electronic signatures via Git commit signatures and pull request approvals are acceptable when procedurally controlled.

| Role | Review Scope | Name | Title | Signature | Date (ISO 8601) |
| --- | --- | --- | --- | --- | --- |
| **Specification Author** | All sections | D. Moreau (P-01) | Principal Architect, HexDI Architecture Team | Git commit f7b676c | 2026-02-20 |
| **Technical Reviewer** | Hooks API, provider contract, type system, port integration | R. Tanaka (P-02) | Senior TypeScript Engineer, HexDI Architecture Team | Git commit f7b676c | 2026-02-20 |
| **Independent QA Reviewer** | GxP delegation statement, invariants, FMEA, DoD completeness | _[Required before GxP deployment — see note below]_ | QA / Regulatory Lead | — | — |
| **Regulatory Affairs Reviewer** | ALCOA+ delegation, electronic signature scope, compliance inheritance | _[Required before GxP deployment — see note below]_ | Regulatory Affairs | — | — |

```
REQUIREMENT: All four approval roles MUST be populated before this specification
             is used to govern qualification activities in GxP-regulated environments.
             For non-regulated deployments, Author and Technical Reviewer signatures
             are sufficient. No two roles may be fulfilled by the same person per
             separation of duties. Each signature MUST be traceable to a unique
             individual per 21 CFR 11.100.
             Reference: 21 CFR 11.10(g), 21 CFR 11.50, EU GMP Annex 11 §14.
```

> **GxP Deployment Note**: Independent QA Reviewer and Regulatory Affairs Reviewer signatures are **pending** and MUST be obtained before this specification governs any IQ/OQ/PQ qualification activities. The QA Reviewer must confirm: (1) the GxP delegation statement in `compliance/gxp.md` is accurate and complete, (2) all invariants (INV-HCR-1 through INV-HCR-5) are appropriately risk-classified, (3) the FMEA covers all failure modes relevant to the React integration layer. The Regulatory Affairs Reviewer must confirm that the compliance inheritance model (this package delegates all regulatory obligations to `@hex-di/http-client`) is consistent with the deploying organization's quality system requirements.

#### Document State Lifecycle

| State | Description | Current |
| --- | --- | --- |
| **Draft** | Under development | |
| **In Review** | Submitted for technical review | |
| **Approved** | Approved for use | |
| **Effective** | Governing active deployments with all approval signatures populated | **← Current** |
| **Superseded** | Replaced by a newer approved version | |
| **Obsolete** | Withdrawn from use | |

### Approval Enforcement Mechanism

The approval evidence is maintained through a two-layer model:

1. **Signed Git tags** (cryptographic identity): Each approved revision is tagged in Git (e.g. `spec/http-client-react/v0.1.0`). The tagger identity provides cryptographic authorship.

2. **Review Comment Log (RCL)** in the repository: Recorded in the Revision History table below. All review findings and resolutions are documented per revision.

```
REQUIREMENT: Organizations deploying this specification MUST maintain a
             distribution register documenting all personnel who received a copy,
             the revision they received, and the date of distribution. When a new
             revision is issued, all registered recipients MUST be notified.
             Reference: EU GMP Annex 11 §10, GAMP 5 §5.5.
```

### Combined Specification Approach (GAMP 5)

This specification combines Functional Specification (FS) and Design Specification (DS) elements into a single document set. This is justified as follows:

1. **Narrowly scoped integration layer**: The API surface is small (3 hooks, 1 provider, 3 utilities). Three separate documents would largely repeat context.

2. **Proportionate effort (ICH Q9)**: Risk and complexity of a React integration layer do not warrant three separate specification documents.

3. **Traceability is maintained**: The RTM in `traceability.md` provides complete traceability regardless of document structure.

4. **Independent review is preserved**: Distinct Author and Technical Reviewer roles ensure independent assessment of each specification level.

```
REQUIREMENT: Organizations that require separate FS/DS documents for their
             quality system MUST create mapping documents tracing this
             specification's sections to their internal document hierarchy.
             Reference: GAMP 5 §D.3, §D.3.7.
```

### Document Control Applicability

The document control metadata above governs all files in this sub-specification suite (files `01-overview.md` through `05-definition-of-done.md`, inclusive). Individual governance files (`invariants.md`, `traceability.md`, `risk-assessment.md`) include their own Document Control blocks.

### Revision History

| Revision | Date | Author | Reviewer | Description | QA Approval |
| --- | --- | --- | --- | --- | --- |
| 0.1.0 | 2026-02-20 | D. Moreau (P-01) | R. Tanaka (P-02) | Initial specification: §1–§22 (provider, useHttpClient, useHttpRequest, useHttpMutation), 5 invariants (INV-HCR-1 through INV-HCR-5), 3 ADRs, 44 specified tests, full governance suite (overview, glossary, invariants, traceability, risk-assessment, roadmap, process/, scripts/) | — |

### Review Timeline Log

| Revision | Submitted At | Reviewer | Review Completed At | Findings |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-02-20T08:00:00Z | R. Tanaka (P-02) | 2026-02-20T10:30:00Z | 0 (initial authoring) |

### Specification Personnel Registry

| ID | Name | Role | Affiliation | Active |
| --- | --- | --- | --- | --- |
| P-01 | D. Moreau | Lead Specification Author | HexDI Architecture Team | Yes |
| P-02 | R. Tanaka | Technical Reviewer | HexDI Architecture Team | Yes |
| P-03 | _[To be assigned]_ | Independent QA Reviewer | _[Deploying organization QA/Regulatory]_ | Pending |
| P-04 | _[To be assigned]_ | Regulatory Affairs Reviewer | _[Deploying organization Regulatory Affairs]_ | Pending |

### Distribution List

| Group | Recipients |
| --- | --- |
| **Development Team** | D. Moreau (P-01), R. Tanaka (P-02) — core contributors |
| **Infrastructure / DevOps** | _[To be populated by deploying organization]_ |
