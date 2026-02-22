# GxP Compliance

> **Revision summary**: Initial version. GxP review remediation: added QA critical question pass threshold, OQ-R020/PQ-R010 for DRR-R2, INV-R11 integration, review execution procedure, ALCOA+ Accurate enrichment, PQ-R009 ATR-R3 alignment. Second GxP review remediation: added OQ "Traces To" traceability column, expanded OQ test data (OQ-R004/R016/R017/R019), added React-specific deviation severity classification, added PQ-R009 ATR-R3 N/A path, added IQ-R012 for INV-R11 version boundary testing. Third GxP review remediation: added test-case-level traceability matrix with `@traces` annotation convention, clarified validation templates as consumer-execution protocol templates, added unmount-safe audit logging guidance to ATR-R1, added retention period note to DRR-R1, formally tagged competency assessment questions as Critical/Standard with rationale. Fourth GxP review remediation (SPEC-GXP-R001 review): added RR-R6 (Concurrent Mode audit timing), server timestamp recommendation for DRR-R1, OQ-R020 RSC simulation guidance, training role adaptation note, offline audit procedure for document control, React Concurrent Mode considerations for ATR-R1. Fifth remediation (coverage review): INV-R12 (Match Branch State Independence) added to Per-Invariant Assessment, Risk Summary, Invariants→Test Coverage, and INV-RN→Test Cases tables. INV-R5 rationale expanded to cover server utility exhaustiveness. INV-R2/R3/R5/R6/R7/R11 test references expanded to match traceability.md authoritative source. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/compliance/gxp.md`.

Mapping of `@hex-di/result-react` guarantees to GxP regulatory requirements. This document serves as a compliance reference for organizations using the React bindings package in FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ regulated environments.

## Relationship to Core Library GxP Compliance

This document is a companion to the core library's GxP compliance document ([SPEC-GXP-001](../../compliance/gxp.md)). The core document covers foundational data integrity guarantees (immutability, brand validation, serialization, error creation patterns) that `@hex-di/result-react` inherits as a consumer of `@hex-di/result`.

**Prerequisite**: SPEC-GXP-001 must be reviewed and accepted before this document. The React package does not duplicate coverage of core library properties — it references them by ID and adds React-specific compliance mappings.

| Concern | Covered In |
|---------|-----------|
| `Object.freeze()` immutability (INV-1) | SPEC-GXP-001 |
| Brand symbol validation (INV-3) | SPEC-GXP-001 |
| `toJSON()`/`fromJSON()` round-trip (DRR-1, DRR-2) | SPEC-GXP-001 |
| Error factory freeze (INV-7) | SPEC-GXP-001 |
| Shallow freeze gap (RR-1) | SPEC-GXP-001 |
| React lifecycle integration (INV-R1 through INV-R12) | **This document** |
| React-specific audit trail patterns (ATR-R1 through ATR-R3) | **This document** |
| React-specific data retention (DRR-R1 through DRR-R3) | **This document** |

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-GXP-R001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- compliance/gxp.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- compliance/gxp.md` |
| Last Reviewed | See [Review History](../../process/ci-maintenance.md#review-history) |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- compliance/gxp.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- compliance/gxp.md` |

> **Auditor note**: This document is version-controlled via Git per the [Document Version Control Policy](../../process/ci-maintenance.md#document-version-control-policy). The fields above provide pointers to the Git-managed metadata rather than duplicating it inline. For printed or exported copies, the Git commands above should be executed and their output attached as an appendix to ensure approval evidence is available without repository access.
>
> **Offline audit procedure**: When preparing documents for regulatory inspection or offline review, the following metadata MUST be appended to the exported document:
>
> 1. **Git commit hash and date**: `git log -1 --format="%H %ai" -- compliance/gxp.md`
> 2. **Author of last change**: `git log -1 --format="%an <%ae>" -- compliance/gxp.md`
> 3. **Approval evidence**: `git log --merges --first-parent main --format="%H %ai %s" -- compliance/gxp.md`
> 4. **Full revision history**: `git log --follow --format="%H %ai %an: %s" -- compliance/gxp.md`
>
> This output should be included as a versioned appendix in the exported document. Consumers should incorporate this step into their document export SOP or request the CI pipeline's automatically generated metadata artifacts (see CI job `doc-metadata-export` if available). The absence of inline metadata in the markdown source is by design — Git is the single source of truth for version control metadata, avoiding duplication drift.

## GAMP 5 Classification

| Usage | Category | Validation Burden |
|-------|----------|-------------------|
| Consumed as-is from npm | **Category 3** (non-configured COTS) | Verify installation, confirm version, test intended use |
| Forked or modified | **Category 5** (custom application) | Full lifecycle: all specification levels, complete testing |
| Used as dependency in a validated system | **Category 3** within the parent system's validation | Document version, verify behavior in system context |

### Category 3 Justification

When consumed from npm without modification:
- The package has no configuration — behavior is fixed by the source code
- All public APIs are documented in behavior specifications (01–07)
- Runtime invariants (INV-R1 through INV-R12) are formally specified
- 8 Architecture Decision Records document design rationale
- The package has exactly 2 peer dependencies (`react` >= 18.0.0 and `@hex-di/result` >= 1.0.0), both well-established, widely-adopted libraries
- Zero production dependencies beyond the peer dependencies

## ALCOA+ Compliance Mapping

### How React Binding Features Support Each Principle

| Principle | Library Feature | Specification Reference | Compliance Mechanism |
|-----------|----------------|------------------------|----------------------|
| **Attributable** | Explicit `Result<T, E>` render branches via `Match` | [01-components.md](../behaviors/01-components.md) | Every Result rendered via `Match` requires both `ok` and `err` render props — the origin of every displayed value is traceable to a specific branch |
| **Legible** | `matchResult` / `matchResultAsync` server utilities | [07-server.md](../behaviors/07-server.md) | Server-side Result rendering produces clear, typed ReactNode output — human-readable component trees, machine-parseable via React DevTools |
| **Contemporaneous** | Generation guard prevents stale data display | [INV-R3](../invariants.md#inv-r3-generation-guard) | Async hooks track a generation counter — only the most recent response updates state, ensuring displayed data reflects the current request |
| **Original** | Abort-on-cleanup prevents phantom state updates | [INV-R2](../invariants.md#inv-r2-abort-on-cleanup) | In-flight operations are aborted on unmount or dependency change — no stale state mutations occur after the component's lifecycle ends. **Note**: React state via `useState` is shallow — see [ALCOA+ Gap](#alcoa-gap-react-state-shallow-reference) below |
| **Accurate** | No exception promotion preserves error fidelity; forced error typing via `mapErr` | [INV-R4](../invariants.md#inv-r4-no-exception-promotion), [BEH-R04-001](../behaviors/04-utilities.md#beh-r04-001-fromaction), [BEH-R07-004](../behaviors/07-server.md#beh-r07-004-resultaction) | Errors flow as `Err` values through render props and hook returns — never promoted to thrown exceptions that could be caught and misinterpreted by error boundaries. Additionally, `fromAction` and `resultAction` require an explicit `mapErr` parameter (not optional), preventing opaque `unknown` error types and ensuring error values are typed and traceable |
| **Complete** | Match exhaustiveness at the type level | [INV-R5](../invariants.md#inv-r5-match-exhaustiveness) | Both `ok` and `err` render props are required — TypeScript prevents silent omission of error states |
| **Consistent** | Stable action references across re-renders | [INV-R1](../invariants.md#inv-r1-stable-action-references) | All hook callbacks maintain referential identity — no spurious re-renders or effect re-executions that could produce inconsistent state |
| **Enduring** | Serialization via core `toJSON()` before adapter transformation | [DRR-R1](#data-retention-requirements) | Results must be serialized using core `toJSON()` before crossing adapter boundaries — adapter output (e.g., TanStack Query cache) does not preserve the Result envelope |
| **Available** | Server utility purity enables universal access | [INV-R10](../invariants.md#inv-r10-server-utility-purity) | `/server` exports have no React runtime dependency — they work in RSC, server actions, API routes, and any non-React context, ensuring Result data is accessible in all execution environments |

### ALCOA+ Gap: React State Shallow Reference

React's `useState` stores values by reference. While the core library freezes the Result shell (per SPEC-GXP-001, INV-1), React state management does not enforce immutability on the contained values. This is the same shallow freeze limitation documented in the core's RR-1.

**Compensating controls**: The same deep freeze wrapper pattern documented in SPEC-GXP-001 ([ALCOA+ Gap: Shallow Freeze](../../compliance/gxp.md#alcoa-gap-shallow-freeze)) applies. GxP consumers should deep-freeze values before wrapping with `ok()` or `err()`, which then propagates through the React hooks layer.

## 21 CFR Part 11 Mapping

### Applicable Sections

| Section | Requirement | React Package Feature | Status | Notes |
|---------|-------------|----------------------|--------|-------|
| 11.10(a) | Validation | Formal specifications + invariants | **Supported** | 7 behavior specs, 12 invariants, 8 ADRs provide validation documentation basis |
| 11.10(b) | Accurate copies | `matchResult` / server utilities produce consistent output | **Supported** | Server utilities are pure functions — identical inputs always produce identical ReactNode output |
| 11.10(c) | Record retention | Serialization via core `toJSON()` before adapter boundary | **Supported** | See [Data Retention Requirements](#data-retention-requirements) |
| 11.10(d) | System access | N/A | **Not Applicable** | Access control is the consumer's responsibility; the React package adds no authentication layer |
| 11.10(e) | Audit trails | Hook result logging via `inspect()`/`inspectErr()` | **Enabled** | The package provides Result values suitable for audit logging; consumers integrate with their audit infrastructure. See [Audit Trail Requirements](#audit-trail-requirements) |
| 11.10(f) | Operational checks | `Match` exhaustiveness, generation guard | **Supported** | TypeScript compilation prevents missing branches (INV-R5); generation tracking prevents stale data display (INV-R3) |
| 11.10(g) | Authority checks | N/A | **Not Applicable** | Authorization is the consumer's responsibility |
| 11.10(h) | Device checks | N/A | **Not Applicable** | I/O device verification is outside the scope of a React bindings package |
| 11.10(i) | Training | Training Guidance with competency assessment | **Supported** | See [Training Guidance](#training-guidance); consumer executes training per their QMS |
| 11.10(j) | Accountability | Git-based document control | **Supported** | Per-line attribution via `git blame`; PR-based approval workflow |
| 11.50 | Signature manifestation | N/A | **Not Applicable** | Electronic signatures are outside package scope |
| 11.70 | Signature/record linking | N/A | **Not Applicable** | |
| 11.100 | General e-signature | N/A | **Not Applicable** | |

### Sections Not Applicable

21 CFR Part 11 Sections 11.10(d) (system access), 11.10(g) (authority checks), 11.10(h) (device checks), 11.10(k) (controls for open systems), 11.50, 11.70, 11.100, 11.200, and 11.300 address electronic signatures, user authentication, device verification, and open system controls. These are application-level concerns — the React bindings package provides UI rendering primitives for Result types, not identity management, I/O device verification, or network transmission.

### Configuration Specification (CS) — Consumer Responsibility

The package has no configurable parameters — behavior is fixed by the source code (GAMP 5 Category 3). No package-level Configuration Specification exists. GxP consumers must document the validated package version and any integration configuration in their own system-level Configuration Specification.

#### Consumer CS Template

| Field | Example Value | Notes |
|-------|---------------|-------|
| Package name | `@hex-di/result-react` | npm package name |
| Validated version | `0.1.0` | Exact version (no caret/tilde); matches `package.json` and lock file |
| Core library version | `@hex-di/result` `1.2.3` | Must also be pinned and validated per SPEC-GXP-001 |
| React version | `react` `18.3.1` or `19.0.0` | Peer dependency version |
| Lock file committed | Yes / No | `pnpm-lock.yaml` or `package-lock.json` must be committed |
| IDE / Editor | _e.g., VS Code 1.96.2_ | Record IDE name and version used during IQ/OQ/PQ execution |
| GAMP 5 category | Category 3 (non-configured COTS) | Category 5 if source code has been modified |
| Audit logging method | `inspect()` / `inspectErr()` on hook results | Per ATR-R1; must not rely solely on adapter output |
| IQ execution date | _YYYY-MM-DD_ | Date of last [IQ](#installation-qualification-iq-checklist) execution |
| OQ execution date | _YYYY-MM-DD_ | Date of last [OQ](#operational-qualification-oq-test-scripts) execution |
| PQ execution date | _YYYY-MM-DD_ | Date of last [PQ](#performance-qualification-pq-scenarios) execution |

## EU GMP Annex 11 Mapping

| Section | Topic | React Package Feature | Status | Notes |
|---------|-------|----------------------|--------|-------|
| 1 | Risk Management | ADRs with trade-off analysis | **Supported** | 8 ADRs document risk decisions per ICH Q9 approach |
| 2 | Personnel | Training Guidance with competency assessment | **Supported** | See [Training Guidance](#training-guidance) |
| 3 | Suppliers and Service Providers | Delegates to core SPEC-GXP-001 | **Supported** | Supplier assessment covers both `@hex-di/result` and `@hex-di/result-react` as a unit |
| 4 | Validation | Formal specifications | **Supported** | 7 behavior specs, 12 invariants, type-system specs |
| 5 | Data | Explicit error-as-value flow in React components | **Supported** | `Result<T, E>` makes data flow traceable through the component tree |
| 6 | Accuracy Checks | Generation guard, abort-on-cleanup | **Supported** | INV-R3 prevents stale data; INV-R2 prevents phantom state updates |
| 7 | Data Storage | Delegates to core `toJSON()`/`fromJSON()` | **Delegated** | The React package does not introduce new serialization — consumers use core serialization. See [DRR-R1](#data-retention-requirements) |
| 8 | Printouts | N/A | **Not Applicable** | The package produces no printouts or reports |
| 9 | Audit Trails | Hook result logging patterns | **Supported** | See [Audit Trail Requirements](#audit-trail-requirements) |
| 10 | Change Control | PR-based change control procedure | **Supported** | See [change-control.md](../process/change-control.md) — categories (Critical/Major/Minor/Editorial), escalation triggers, regression testing policy |
| 11 | Periodic Review | Defined review cadence with triggers | **Supported** | See [Periodic Review](#periodic-review) and [change-control.md § Periodic Review](../process/change-control.md#periodic-review) — annual + event-triggered reviews |
| 12 | Security | N/A | **Not Applicable** | Physical and logical security are application-level concerns. The package provides no authentication or encryption |
| 13 | Incident Management | References core process | **Supported** | See [GxP Incident Reporting](#gxp-incident-reporting) |
| 14 | Electronic Signatures | N/A | **Not Applicable** | Consistent with 21 CFR 11.50 treatment |
| 15 | Batch Release | N/A | **Not Applicable** | Manufacturing process concern |
| 16 | Business Continuity | N/A | **Not Applicable** | The package is stateless with no runtime services |
| 17 | Archiving | Delegates to core `toJSON()`/`fromJSON()` | **Delegated** | See [DRR-R1](#data-retention-requirements) |

## Data Retention Requirements

**DRR-R1**: When using `@hex-di/result-react` in systems subject to regulatory data retention requirements, `Result` values obtained from hooks (`useResultAsync`, `useResultAction`, `useSafeTry`, etc.) MUST be serialized via the core library's `toJSON()` method before storage. The React hooks layer does not introduce any new serialization format — it passes through the core `Result<T, E>` instances unchanged.

> **Retention period**: The library does not define data retention periods — these are consumer-defined per the organization's data retention policy and applicable regulatory requirements. Per 21 CFR 11.10(c), records must be retained for the period required by applicable regulations (e.g., 21 CFR 211.180 requires batch records for at least 1 year after expiry; clinical trial records per ICH E6 require retention per applicable regulatory requirements). Consumers MUST document the retention period for serialized Result data in their system-level Configuration Specification.

```typescript
// GxP pattern: serialize hook results for audit storage
const { result } = useResultAsync(fetchBatchData, [batchId]);

useEffect(() => {
  if (result) {
    const record = {
      timestamp: new Date().toISOString(),
      userId: session.userId,
      operation: "batch_data_fetch",
      batchId,
      result: result.toJSON(), // Core toJSON() — preserves _tag, value/error
    };
    auditStore.write(record); // Consumer's audit infrastructure
  }
}, [result, batchId]);
```

> **Timestamp source**: The example above uses `new Date().toISOString()` for illustration. Client-side timestamps depend on the user's system clock, which may be inaccurate or subject to manipulation. For GxP-critical audit records where the ALCOA+ "Contemporaneous" principle applies, organizations **MUST** use **server-generated timestamps** (e.g., from the audit logging endpoint or a trusted time service) rather than relying solely on `Date.now()` on the client. Client-side timestamps MAY be used as a secondary reference alongside a server-authoritative timestamp, or for non-critical logging where clock accuracy is not a regulatory requirement.

**DRR-R2**: When using `resultAction` (from `@hex-di/result-react/server`) to wrap server actions, the Result returned to the client has already crossed a serialization boundary (React Server Component → Client Component). The `resultAction` wrapper ensures the return type is `Promise<Result<T, E>>`, but the consumer MUST verify that `T` and `E` are JSON-serializable types. Non-serializable types (functions, symbols, class instances) will be stripped during the RSC wire transfer.

```typescript
// server action file
"use server";
import { resultAction } from "@hex-di/result-react/server";

// T = { id: string; name: string } — JSON-serializable: compliant
export const createBatch = resultAction(async (data: BatchInput) => {
  // ... validation and creation logic
  return ok({ id: "B-001", name: data.name });
});
```

**DRR-R3**: The adapter functions `toQueryFn`, `toQueryOptions`, `toMutationFn`, `toMutationOptions` (TanStack Query), and `toSwrFetcher` (SWR) break the `Result` envelope. These adapters unwrap the `Ok` value for the cache and throw the `Err` value as an exception, because TanStack Query and SWR expect this pattern. GxP consumers MUST capture the `Result` via `inspect()` or `inspectErr()` **before** passing through an adapter if audit trail records are required.

```typescript
// VIOLATION of DRR-R3 — Result envelope is lost after adapter transformation
const queryFn = toQueryFn(fetchBatchData);
// The TanStack Query cache contains the unwrapped value, not a Result

// Compliant with DRR-R3 — capture Result before adapter
const auditedFetch = (signal: AbortSignal) =>
  fetchBatchData(signal)
    .inspect(value => auditLog.write({ outcome: "success", value }))
    .inspectErr(error => auditLog.write({ outcome: "failure", error }));

const queryFn = toQueryFn(auditedFetch);
```

## Audit Trail Requirements

### Normative Requirements

The following requirements apply to any GxP-regulated system using `@hex-di/result-react`. These are **mandatory** constraints, not optional patterns.

**ATR-R1**: In GxP-regulated code, hook results (`result` from `useResultAsync`, `useResultAction`, `useSafeTry`, etc.) MUST be logged to the audit trail before being consumed by UI rendering or adapter transformation. The recommended methods are `inspect(f)` / `inspectErr(f)` from the core library (see SPEC-GXP-001, ATR-2). Because React hooks return `Result` instances (not `ResultAsync`), consumers should log in a `useEffect` that depends on the result value.

```typescript
// Compliant with ATR-R1 — audit log in effect
const { result } = useResultAsync(fetchPatientData, [patientId]);

useEffect(() => {
  if (result) {
    result
      .inspect(value => auditLog.write({ event: "patient_data_loaded", value }))
      .inspectErr(error => auditLog.write({ event: "patient_data_error", error }));
  }
}, [result]);
```

> **Unmount-safe audit writes**: The `useEffect` pattern above is sufficient when the audit write is synchronous or when the component remains mounted for the duration of the write. However, if the audit logging service is asynchronous and the component may unmount before the write completes (e.g., rapid navigation), the audit entry could be lost. GxP consumers should consider one of the following patterns to ensure audit entries survive component unmount:
>
> 1. **`navigator.sendBeacon()`** — Fire-and-forget HTTP request that survives page unload. Suitable for browser environments with a server-side audit endpoint.
> 2. **Queued write with retry** — Push audit entries to an in-memory or `localStorage` queue, with a background process that flushes the queue. Entries survive component unmount and can be retried on failure.
> 3. **Synchronous write** — If the audit store supports synchronous writes (e.g., `localStorage.setItem()`), the write completes before cleanup returns. Suitable for local audit buffers that are periodically synced to the server.
>
> The choice depends on the consumer's audit infrastructure. The library does not prescribe an audit transport mechanism.
>
> **React Concurrent Mode considerations**: In React Concurrent Mode (enabled by default in React 19), renders may be interrupted and replayed. A `useEffect` callback only fires for renders that commit to the DOM — interrupted renders do not trigger effects. This means that if a render is interrupted before commit, no audit entry is produced. However, interrupted renders also produce no visible UI, so no data is displayed to the user without an audit record. For paths where audit timing is critical, `useLayoutEffect` provides synchronous execution before the browser paints, ensuring the audit write occurs in the same microtask as the DOM update. See [RR-R6](#residual-risk-summary) for the full risk assessment.
>
> **Debounce and batching considerations**: In components where `result` changes rapidly (e.g., `useResultAsync` with frequently changing dependencies), the `useEffect`-based audit pattern will fire on every result change. GxP consumers should consider whether debouncing or batching audit writes is appropriate for their use case. If debouncing, ensure the final state is always logged — a debounce that drops the last entry would violate ALCOA+ Completeness. A recommended pattern is to batch writes with a flush-on-unmount guarantee (e.g., accumulate entries in a ref, flush via `navigator.sendBeacon()` on cleanup).

**ATR-R2**: When using `resultAction` from `@hex-di/result-react/server`, audit logging MUST occur server-side (inside the server action) before the Result is returned to the client. Client-side audit logging of server action results is insufficient because network failures or client crashes can prevent the log entry.

```typescript
// server action — compliant with ATR-R2
"use server";
import { resultAction } from "@hex-di/result-react/server";

export const approveBatch = resultAction(async (batchId: string) => {
  const result = await validateAndApprove(batchId);

  // Audit log BEFORE returning to client
  result
    .inspect(value => auditLog.write({ event: "batch_approved", batchId, value }))
    .inspectErr(error => auditLog.write({ event: "batch_approval_failed", batchId, error }));

  return result;
});
```

**ATR-R3**: When using the `Match` component for rendering GxP-critical data (e.g., batch records, patient data, laboratory results), both branches (`ok` and `err`) MUST log which branch was rendered for audit trail purposes. For all other uses of `Match`, branch rendering logging SHOULD be implemented. Logging can be done via `useEffect` in the parent component or via inline logging within each render prop callback.

```typescript
// Compliant with ATR-R3 — branch rendering logged
<Match
  result={batchResult}
  ok={(batch) => {
    auditLog.write({ event: "batch_displayed", branch: "ok", batchId: batch.id });
    return <BatchDetails batch={batch} />;
  }}
  err={(error) => {
    auditLog.write({ event: "batch_display_error", branch: "err", error });
    return <BatchError error={error} />;
  }}
/>
```

> **Note**: ATR-R3 uses a conditional obligation: MUST when rendering GxP-critical data (data that informs regulated decisions — batch records, patient data, laboratory results), SHOULD for all other uses. The distinction recognizes that `Match` branch rendering is a UI display event, not a data mutation, but displaying incorrect or stale GxP-critical data could directly impact regulatory decisions. Organizations should classify their `Match` usage sites as GxP-critical or non-critical in their system-level risk assessment.
>
> **Classification enforcement**: Consumers implementing ATR-R3 should maintain a registry of `Match` usage sites classified as GxP-critical. Practical approaches include:
> - A comment convention at each GxP-critical usage site: `// @gxp-critical ATR-R3`
> - A centralized list in the system validation plan mapping component file paths to GxP criticality
> - A custom ESLint rule that flags `<Match>` usage in directories marked as GxP-critical and verifies the presence of branch audit logging
>
> This registry should be reviewed during each periodic system review per [change-control.md § Periodic Review](../process/change-control.md#periodic-review).

## Risk Assessment Methodology

> **Standalone document**: A comprehensive Failure Mode and Effects Analysis (FMEA) for all 12 invariants, including residual risk documentation, re-evaluation log, and review schedule, is maintained in [risk-assessment.md](../risk-assessment.md) (SPEC-REACT-RSK-001). The section below provides the inline summary used for GxP compliance mapping. For the full FMEA, consult the standalone document.

### Approach

Invariant risk levels are assigned using a simplified risk assessment aligned with ICH Q9 (Quality Risk Management). Because `@hex-di/result-react` is a deterministic UI bindings package with no external I/O, no randomness, and no configuration, **probability of occurrence** is not a meaningful variable. The assessment uses a two-factor model (Severity x Detectability) consistent with the core library's approach in SPEC-GXP-001.

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Severity** | Impact on data integrity and patient safety if the invariant is violated | Critical / Major / Minor |
| **Detectability** | Likelihood that a violation would be caught by the test suite before release | High / Medium / Low (lower detectability = harder to catch = higher risk) |

### Risk Level Determination

| Severity | Detectability | ICH Q9 Risk Level |
|----------|--------------|-------------------|
| Critical (data integrity / patient safety) | Any | **High** |
| Major (operational reliability) | Medium or Low | **High** |
| Major (operational reliability) | High | **Medium** |
| Minor (developer experience) | Any | **Low** |

### Per-Invariant Assessment

| Invariant | Severity | Detectability | Risk | Rationale |
|-----------|----------|--------------|------|-----------|
| INV-R1 | Minor | High | **Low** | Stable action references affect re-render efficiency and effect dependency correctness — a developer experience concern. Violations cause spurious re-renders, not data corruption. Detected by referential equality assertions in unit tests |
| INV-R2 | Major | High | **Medium** | Abort-on-cleanup prevents phantom state updates on unmounted components. Violation could cause state updates after unmount (React warning, potential memory leak) but does not corrupt persisted data. Detected by unmount lifecycle tests |
| INV-R3 | Critical | High | **High** | Generation guard prevents stale data display. Violation directly enables showing outdated data to users — a data integrity risk in GxP contexts where displayed values inform decisions (e.g., batch status, patient data). Detected by adversarial timing tests |
| INV-R4 | Critical | High | **High** | No exception promotion ensures errors remain as typed values. Violation would cause errors to be thrown and potentially caught by React error boundaries, where the error type information is lost — a silent error suppression risk per 21 CFR 11.10(e). Detected by verifying no throw paths in component/hook code |
| INV-R5 | Major | High | **Medium** | Match & Server Utility exhaustiveness ensures both branches are handled in the `Match` component, `matchResult`, `matchResultAsync`, and `matchOption`. Violation requires a TypeScript type system bypass (e.g., `as any`), which is detectable at code review. No runtime data corruption — the missing branch simply does not render |
| INV-R6 | Major | High | **Medium** | Suspense contract ensures `useResultSuspense` throws a Promise (not an Error) for pending state. Violation would cause Suspense boundaries to display error UI instead of loading UI — confusing but not data-corrupting. Detected by Suspense integration tests |
| INV-R7 | Minor | High | **Low** | Strict mode compatibility ensures correct behavior under React's development double-mount. Violation affects development-mode debugging only — no production data integrity impact. Detected by StrictMode test wrapper |
| INV-R8 | Major | High | **Medium** | Retry abort propagation prevents orphaned retry attempts. Violation could cause unexpected network requests after unmount — operationally wasteful and potentially confusing, but retried results would be discarded by INV-R3 (generation guard). Detected by retry cancellation tests |
| INV-R9 | Major | High | **Medium** | Resource cache isolation prevents cross-resource interference. Violation could cause one resource's invalidation to affect another — operationally incorrect but detectable via cache state assertions. No direct data corruption — stale cache entries are replaced on next read |
| INV-R10 | Minor | High | **Low** | Server utility purity ensures `/server` exports work outside React. Violation would cause import errors in RSC or server action contexts — a fail-fast error, not silent data corruption. Detected by import resolution tests |
| INV-R11 | Minor | High | **Low** | React version fail-fast ensures React 19-only hooks (`useOptimisticResult`, `useResultTransition`) throw at import time on React 18. Violation would cause silent runtime failures on first invocation instead of immediate detection. Detected by React 18 import tests |
| INV-R12 | Major | High | **Medium** | Match branch state independence ensures component state from the previous branch (Ok/Err) does not leak into the new branch when the Result variant changes. Violation could cause stale data from the Ok branch to be visible alongside an error state — a data integrity risk in GxP contexts. Detected by branch isolation tests using distinct `key` props |

### Risk Summary

| Risk Level | Count | Invariants | Testing Requirement |
|------------|-------|------------|---------------------|
| High | 2 | INV-R3, INV-R4 | All 4 test levels + dedicated GxP integrity tests |
| Medium | 6 | INV-R2, INV-R5, INV-R6, INV-R8, INV-R9, INV-R12 | Unit + Type + Integration |
| Low | 4 | INV-R1, INV-R7, INV-R10, INV-R11 | Standard unit test coverage sufficient |

### Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor role | Library maintainer with GxP domain knowledge |
| Independent reviewer role | Independent QA reviewer with no authorship of the assessed invariants |
| Last independent review date | Pending — required before v1.0 release |
| Initial assessment date | Part of specification v1.0.0 |
| Review cadence | Re-assessed annually as part of the GxP compliance review cycle, and upon introduction of any new invariant |
| Methodology reference | Adapted from ICH Q9 Section 5 (Risk Assessment) using a simplified Severity x Detectability model, consistent with SPEC-GXP-001 |

#### Independent Review Sign-Off

The independent review is a **v1.0 release blocker**. The reviewer must satisfy all of the following criteria:

1. **Independence**: No authorship or co-authorship of any invariant (INV-R1 through INV-R12), behavior specification, or ADR in this specification suite
2. **Qualification**: Demonstrated GxP domain knowledge (regulatory affairs, quality assurance, or validation engineering experience in a regulated environment)
3. **Scope**: Review all 12 invariant risk classifications (severity, detectability, risk level) and the overall methodology

#### Reviewer Candidate Pool

Suitable reviewer candidates include:
- **Internal QA/Validation engineers** within the consuming organization who have not contributed to this specification suite
- **External GxP consultants** with regulatory affairs or computer system validation experience in FDA/EMA-regulated environments
- **Peer library maintainers** with GxP domain knowledge who are not contributors to the `@hex-di/result` monorepo

The maintainer should identify at least 2 candidate reviewers and initiate outreach no later than **8 weeks before the planned v1.0 release date** to allow sufficient time for scheduling, review execution, and resolution of any reclassifications. If the first candidate is unavailable, the second candidate should be engaged immediately.

#### Review Execution Procedure

The independent review must be completed following this procedure:

1. **Initiation**: The maintainer opens a GitHub issue titled "GxP Independent Risk Assessment Review — result-react" and assigns it to the candidate reviewer. The issue body links to this section and lists the 12 invariants to be assessed.
2. **Review**: The reviewer creates a branch and opens a PR modifying the sign-off record below. The PR description includes:
   - For each invariant (INV-R1 through INV-R12): agreement with or proposed change to the severity, detectability, and risk level classifications, with written rationale for any changes
   - Assessment of the overall methodology (Severity x Detectability model, risk level determination matrix, testing requirement tiers)
   - Any additional risks identified that are not covered by the current 12 invariants
3. **Resolution**: If the reviewer proposes reclassifications, the maintainer and reviewer discuss in the PR thread until consensus is reached. The sign-off record is updated to reflect the final classifications. If consensus cannot be reached, the reviewer's classification takes precedence (conservative approach).
4. **Approval**: The PR is approved by both the reviewer (confirming the sign-off record is accurate) and the maintainer (confirming any reclassifications are reflected in the risk assessment table and testing requirements). The PR must be merged before the v1.0 release tag is created.
5. **Contingency**: If no qualified independent reviewer is available before the planned v1.0 release date, the release must be delayed until the review is complete. A documented deviation is not acceptable — the independent review is a mandatory control, not a deferrable activity.

**Sign-off record** (to be completed before v1.0 GA):

| Field | Value |
|-------|-------|
| Reviewer name | _Pending_ |
| Reviewer role/affiliation | _Pending_ |
| Review date | _Pending_ |
| Classification changes | _Pending — document any invariants reclassified, with before/after and rationale_ |
| Outcome | _Pending — Accepted / Accepted with modifications / Rejected_ |

> **Process**: The completed sign-off record replaces the `_Pending_` entries above. The review is documented as a GitHub PR modifying this section, preserving the review discussion in the PR thread. The PR must be merged before the v1.0 release tag is created. This review may be conducted by the same reviewer as the core library review (SPEC-GXP-001) or a different qualified reviewer.

## Residual Risk Summary

| ID | Risk Description | ALCOA+ Impact | Compensating Controls | Documented In | Review Cadence |
|----|-----------------|---------------|----------------------|---------------|----------------|
| RR-R1 | **React state shallow reference**: React `useState` stores values by reference — the Result shell is frozen (INV-1 via core) but nested values are mutable | Original | Same deep freeze wrapper pattern as core RR-1 (`okGxP`/`errGxP`); values should be deep-frozen before wrapping with `ok()`/`err()` | [ALCOA+ Gap: React State Shallow Reference](#alcoa-gap-react-state-shallow-reference) | Annual GxP review |
| RR-R2 | **Adapter envelope loss**: `toQueryFn`, `toQueryOptions`, `toMutationFn`, `toMutationOptions`, and `toSwrFetcher` break the Result envelope — the TanStack Query / SWR cache contains unwrapped values, not branded Results | Complete, Enduring | DRR-R3 requires capturing Results via `inspect()`/`inspectErr()` before adapter transformation; consumers must not rely on adapter cache for audit trail | [DRR-R3](#data-retention-requirements) | Annual GxP review |
| RR-R3 | **Client-only audit gap**: Hook results are only available on the client. If the client crashes or loses network before audit logging completes, the audit entry is lost | Contemporaneous, Complete | ATR-R2 requires server-side audit logging for server actions; for client-only hooks, consumers should implement optimistic audit writes with retry | [ATR-R2](#normative-requirements) | Annual GxP review |
| RR-R4 | **Suspense timing window**: Between `useResultSuspense` throwing the pending promise and the resolved Result being rendered, there is a timing window where the data exists in the Suspense cache but has not been audit-logged | Contemporaneous | Consumers should log in the component body or a `useEffect` after the Result is received; the timing gap is sub-millisecond in practice | [INV-R6](../invariants.md#inv-r6-suspense-contract) | Annual GxP review |
| RR-R5 | **Sole-maintainer bus factor**: Same risk as core RR-7 — GxP incident response targets depend on maintainer availability | Available | Shared mitigation with core: escalation procedure, consumer fork contingency, public source code. **Succession plan**: The complete specification suite and source code are publicly available under MIT license. If the primary maintainer becomes unavailable, any qualified developer can fork and maintain the package. GxP consumers should maintain a validated fork as a contingency per their business continuity plan. The independent reviewer (once appointed) serves as the secondary contact for GxP-specific questions. | [GxP Incident Reporting](#gxp-incident-reporting), SPEC-GXP-001 RR-7 | Annual GxP review |
| RR-R6 | **Concurrent Mode audit timing**: React Concurrent Mode (default in React 19) can interrupt and replay renders. A `useEffect`-based audit log (ATR-R1) may not fire if the render is interrupted before commit, or may fire multiple times in Strict Mode. This extends the Suspense timing window documented in RR-R4 to the broader Concurrent Mode case. | Contemporaneous, Complete | (1) Only committed renders (renders that produce visible DOM) trigger `useEffect` — interrupted renders do not display data to users, so the absence of an audit entry for an interrupted render does not constitute a gap in displayed-data logging. (2) For critical paths where audit writes must be synchronous with render commit, consumers may use `useLayoutEffect` instead of `useEffect` to ensure the audit write executes before the browser paints. (3) Strict Mode double-fires are idempotent if the audit store deduplicates by result identity or generation counter. Consumers should document their Concurrent Mode audit strategy in their system-level risk assessment. | [ATR-R1](#normative-requirements), [RR-R4](#residual-risk-summary) | Annual GxP review |

**Maintenance**: This table is updated whenever a new residual risk is identified or an existing risk is resolved. Resolved risks are not removed — they are marked with a "Resolved" status and the resolution date. The table is reviewed as part of each annual GxP compliance review.

## Requirement Traceability Matrix

> **Standalone document**: A comprehensive traceability matrix — including capability-level, requirement-level, invariant, and ADR traceability with test file maps and coverage metrics — is maintained in [traceability.md](../traceability.md) (SPEC-REACT-TRC-001). The section below provides the inline traceability used for GxP compliance mapping. For the full matrix, consult the standalone document.

### Requirement Identification Convention

> **Standalone document**: The complete identifier format specification — including `BEH-RXX-NNN`, `INV-RN`, `ADR-RNNN`, `ATR-RN`, `DRR-RN`, `RR-RN`, and `SPEC-REACT-{CAT}-{NNN}` — is maintained in [requirement-id-scheme.md](../process/requirement-id-scheme.md) (SPEC-REACT-PRC-003). The summary below covers the primary BEH-RXX-NNN format.

Every testable requirement in the behavior specifications uses a formal identifier with the `BEH-RXX-NNN` scheme, where `R` distinguishes React package requirements from core library requirements (`BEH-XX-NNN`).

| Component | Meaning | Example |
|-----------|---------|---------|
| `BEH` | Behavior specification requirement (prefix) | — |
| `R` | React package (distinguishes from core `BEH-XX-NNN`) | — |
| `XX` | Two-digit behavior spec number (01–07) | `02` = async hooks |
| `NNN` | Sequential requirement number within that spec | `003` = third requirement |

Example: `BEH-R02-003` is the 3rd testable requirement in `behaviors/02-async-hooks.md`.

Audit trail requirements use the `ATR-RN` scheme (see [Normative Requirements](#normative-requirements)). Data retention requirements use the `DRR-RN` scheme (see [Data Retention Requirements](#data-retention-requirements)).

#### Behavior Spec → Requirement ID Ranges

| Behavior Spec | File | ID Range | Count | Domain |
|---------------|------|----------|:-----:|--------|
| 01 — Components | `behaviors/01-components.md` | BEH-R01-001 | 1 | Match component |
| 02 — Async Hooks | `behaviors/02-async-hooks.md` | BEH-R02-001 – BEH-R02-004 | 4 | useResultAsync, useResultAction, useResultSuspense, createResultResource |
| 03 — Composition Hooks | `behaviors/03-composition-hooks.md` | BEH-R03-001 – BEH-R03-004 | 4 | useResult, useOptimisticResult, useSafeTry, useResultTransition |
| 04 — Utilities | `behaviors/04-utilities.md` | BEH-R04-001 | 1 | fromAction |
| 05 — Adapters | `behaviors/05-adapters.md` | BEH-R05-001 – BEH-R05-005 | 5 | toQueryFn, toQueryOptions, toSwrFetcher, toMutationFn, toMutationOptions |
| 06 — Testing | `behaviors/06-testing.md` | BEH-R06-001 – BEH-R06-005 | 5 | setupResultReactMatchers, renderWithResult, createResultFixture, mockResultAsync, ResultDecorator |
| 07 — Server | `behaviors/07-server.md` | BEH-R07-001 – BEH-R07-005 | 5 | matchResult, matchResultAsync, matchOption, resultAction, "use client" boundary |

**Total**: 25 testable requirements across 7 behavior specifications.

### Invariants → Test Coverage

| Invariant | Description | ICH Q9 Risk | Unit Tests | Type Tests | Integration Tests | GxP Integrity Tests |
|-----------|-------------|:-----------:|:----------:|:----------:|:-----------------:|:-------------------:|
| INV-R1 | Stable Action References | **Low** | `use-result.test.ts` | N/A | N/A | N/A |
| INV-R2 | Abort on Cleanup | **Medium** | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts` | N/A | `async-flow.test.tsx`, `safe-try-flow.test.tsx` | N/A |
| INV-R3 | Generation Guard | **High** | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts` | N/A | `async-flow.test.tsx`, `safe-try-flow.test.tsx` | `gxp/stale-data-prevention.test.tsx` |
| INV-R4 | No Exception Promotion | **High** | Architecture-level; all component/hook tests | N/A | All integration tests | `gxp/error-as-value.test.tsx` |
| INV-R5 | Match & Server Utility Exhaustiveness | **Medium** | `match.test.tsx`, `match-result.test.ts`, `match-result-async.test.ts`, `match-option.test.ts` | `match.test-d.tsx`, `server.test-d.ts` | N/A | N/A |
| INV-R6 | Suspense Contract | **Medium** | `use-result-suspense.test.tsx`, `create-result-resource.test.tsx` | N/A | `resource-suspense.test.tsx` | N/A |
| INV-R7 | Strict Mode Compatibility | **Low** | `use-result-async.test.ts`, `strict-mode.test.tsx` | N/A | N/A | N/A |
| INV-R8 | Retry Abort Propagation | **Medium** | `use-result-async.test.ts` | N/A | `retry-flow.test.tsx` | N/A |
| INV-R9 | Resource Cache Isolation | **Medium** | `create-result-resource.test.tsx` | N/A | `resource-suspense.test.tsx` | N/A |
| INV-R10 | Server Utility Purity | **Low** | `match-result.test.ts`, `result-action.test.ts` | N/A | `server-client-boundary.test.ts` | N/A |
| INV-R11 | React Version Fail-Fast | **Low** | `use-optimistic-result.test.ts`, `use-result-transition.test.ts`, `react19-fail-fast.test.ts` | N/A | `react19-hooks.test.tsx` | N/A |
| INV-R12 | Match Branch State Independence | **Medium** | `match.test.tsx` | N/A | `async-flow.test.tsx` | N/A |

### Test-Case-Level Traceability

The following table extends the file-level traceability above to specific test case names. Each test case includes a `@traces` comment referencing the requirement or invariant it verifies.

#### BEH-RXX-NNN → Test Cases

| Requirement | Test File | Test Case(s) |
|-------------|-----------|--------------|
| BEH-R01-001 | `match.test.tsx` | `renders ok branch when result is Ok`, `renders err branch when result is Err`, `unmounts previous branch on variant change` |
| BEH-R01-001 | `match.test-d.tsx` | `Match infers T and E from result prop`, `Match requires both ok and err (exhaustiveness)` |
| BEH-R02-001 | `use-result-async.test.ts` | `sets isLoading to true during fetch`, `sets result to Ok on success`, `sets result to Err on failure`, `refetch re-executes the operation` |
| BEH-R02-002 | `use-result-action.test.ts` | `starts with undefined result and isLoading false`, `execute returns Result after resolution`, `reset clears result to undefined` |
| BEH-R02-003 | `use-result-suspense.test.tsx` | `suspends until ResultAsync resolves`, `returns Result after resolution (not undefined)`, `errors are in Err branch (not thrown)` |
| BEH-R02-004 | `create-result-resource.test.tsx` | `read suspends when pending`, `preload triggers fetch without suspending`, `invalidate clears cache and re-fetches on next read` |
| BEH-R03-001 | `use-result.test.ts` | `starts as undefined when no initial value`, `starts with initial value when provided`, `setOk updates to Ok`, `setErr updates to Err`, `reset returns to initial` |
| BEH-R03-002 | `use-optimistic-result.test.ts` | `returns authoritative result when no optimistic update`, `setOptimistic produces optimistic result during transition`, `reverts to authoritative after transition completes` |
| BEH-R03-003 | `use-safe-try.test.ts` | `resolves with Ok when all yields succeed`, `short-circuits on first Err`, `aborts on unmount` |
| BEH-R03-004 | `use-result-transition.test.ts` | `starts with undefined result and isPending false`, `startResultTransition sets isPending and resolves result` |
| BEH-R04-001 | `from-action.test.ts` | `wraps successful action in Ok`, `wraps thrown error via mapErr in Err`, `returns ResultAsync` |
| BEH-R05-001 | `tanstack-query.test.ts` | `toQueryFn resolves with unwrapped Ok value`, `toQueryFn throws Err value` |
| BEH-R05-002 | `tanstack-query.test.ts` | `toQueryOptions returns queryKey and queryFn` |
| BEH-R05-003 | `swr.test.ts` | `toSwrFetcher resolves with unwrapped Ok value`, `toSwrFetcher throws Err value` |
| BEH-R05-004 | `tanstack-query.test.ts` | `toMutationFn resolves with unwrapped Ok value`, `toMutationFn throws Err value` |
| BEH-R05-005 | `tanstack-query.test.ts` | `toMutationOptions returns mutationFn and merged options` |
| BEH-R06-001 | `matchers.test.ts` | `toBeLoading matches loading state`, `toBeOk matches Ok result`, `toBeErr matches Err result` |
| BEH-R06-002 | `matchers.test.ts` | `renderWithResult renders component` (tested implicitly via render helper usage) |
| BEH-R06-003 | `fixtures.test.ts` | `ok() merges overrides into defaults`, `err() wraps error`, `okAsync() resolves after delay`, `errAsync() rejects after delay` |
| BEH-R06-004 | `mocks.test.ts` | `resolve settles with Ok`, `reject settles with Err`, `double resolve throws`, `isSettled tracks state` |
| BEH-R06-005 | `storybook.test.ts` | `ResultDecorator wraps story without error` |
| BEH-R07-001 | `match-result.test.ts` | `calls ok handler for Ok result`, `calls err handler for Err result` |
| BEH-R07-002 | `match-result-async.test.ts` | `awaits ResultAsync and calls ok handler`, `awaits ResultAsync and calls err handler` |
| BEH-R07-003 | `match-option.test.ts` | `calls some handler for Some option`, `calls none handler for None option` |
| BEH-R07-004 | `result-action.test.ts` | `wraps successful action in Ok`, `wraps thrown error via mapErr in Err`, `returns Promise (not ResultAsync)` |
| BEH-R07-005 | `server-client-boundary.test.ts` | `server utilities import without React runtime` |

#### INV-RN → Test Cases

| Invariant | Test File | Test Case(s) |
|-----------|-----------|--------------|
| INV-R1 | `use-result.test.ts` | `actions are referentially stable` (setOk, setErr, set, reset identity across rerenders) |
| INV-R2 | `use-result-async.test.ts` | `aborts on unmount`, `aborts previous request on deps change` |
| INV-R2 | `use-result-action.test.ts` | `execute aborts previous in-flight operation`, `reset aborts current operation`, `unmount aborts current operation` |
| INV-R2 | `use-safe-try.test.ts` | `aborts on unmount`, `aborts on deps change` |
| INV-R2 | `async-flow.test.tsx` | `abort signal is triggered on unmount during loading` |
| INV-R2 | `safe-try-flow.test.tsx` | `short-circuits on first Err` (integration — abort on generator cleanup) |
| INV-R3 | `use-result-async.test.ts` | `discards stale responses via generation tracking` |
| INV-R3 | `use-result-action.test.ts` | `discards stale execute response when superseded` |
| INV-R3 | `async-flow.test.tsx` | `renders loading → success → refetch → success` (verifies no stale data between states) |
| INV-R3 | `use-safe-try.test.ts` | `discards stale generator result via generation tracking` |
| INV-R3 | `safe-try-flow.test.tsx` | `short-circuits on first Err` (integration — verifies generation guard across component lifecycle) |
| INV-R3 | `gxp/stale-data-prevention.test.tsx` | `discards slow first response when fast second response arrives first`, `handles 10 rapid dependency changes — only last response displayed`, `generation counter survives React StrictMode double-mount`, `concurrent useResultAsync instances do not share generation state` |
| INV-R4 | `gxp/error-as-value.test.tsx` | `Match renders Err branch without triggering error boundary`, `useResultAsync sets Err result without throwing`, `useResultAction sets Err result without throwing`, `useResultSuspense returns Err result without triggering error boundary`, `useSafeTry short-circuits to Err without throwing` |
| INV-R5 | `match.test.tsx` | `renders ok branch when result is Ok`, `renders err branch when result is Err` (both branches required) |
| INV-R5 | `match-result.test.ts` | `calls ok handler for Ok result`, `calls err handler for Err result` (server utility exhaustiveness) |
| INV-R5 | `match-result-async.test.ts` | `awaits ResultAsync and calls ok handler`, `awaits ResultAsync and calls err handler` |
| INV-R5 | `match-option.test.ts` | `calls some handler for Some option`, `calls none handler for None option` |
| INV-R5 | `match.test-d.tsx` | `Match requires both ok and err (exhaustiveness)` — compile error on missing `err` prop |
| INV-R5 | `server.test-d.ts` | `matchResult infers return type union from handlers`, `matchOption infers from some and none handlers` |
| INV-R6 | `use-result-suspense.test.tsx` | `suspends until ResultAsync resolves` (throws Promise, not Error) |
| INV-R6 | `resource-suspense.test.tsx` | `preload → read → resolve → render`, `invalidate → re-suspend → resolve` |
| INV-R7 | `use-result-async.test.ts` | `handles strict mode double-mount` |
| INV-R7 | `strict-mode.test.tsx` | Dedicated StrictMode integration test — verifies hooks behave correctly under React's development double-mount |
| INV-R7 | `gxp/stale-data-prevention.test.tsx` | `generation counter survives React StrictMode double-mount` |
| INV-R8 | `use-result-async.test.ts` | `abort cancels pending retries` |
| INV-R8 | `retry-flow.test.tsx` | `abort cancels pending retries` |
| INV-R9 | `create-result-resource.test.tsx` | `invalidate on one resource does not affect another` |
| INV-R9 | `resource-suspense.test.tsx` | `invalidate → re-suspend → resolve` |
| INV-R10 | `match-result.test.ts` | `imports without React runtime` |
| INV-R10 | `result-action.test.ts` | `imports without React runtime` |
| INV-R10 | `server-client-boundary.test.ts` | `server utilities import without React runtime` |
| INV-R11 | `use-optimistic-result.test.ts` | `throws descriptive error at import time on React 18` |
| INV-R11 | `use-result-transition.test.ts` | `throws descriptive error at import time on React 18` |
| INV-R12 | `match.test.tsx` | `unmounts previous branch on variant change` (key isolation prevents state leakage) |
| INV-R12 | `async-flow.test.tsx` | `renders loading → success → refetch → success` (branch state independent across variant changes) |

#### Test Annotation Convention

All test cases referencing a requirement or invariant must include a `@traces` JSDoc comment:

```typescript
// @traces INV-R3
it("discards stale responses via generation tracking", async () => {
  // ...
})

// @traces BEH-R01-001
it("renders ok branch when result is Ok", () => {
  // ...
})
```

This convention enables automated traceability verification via `grep -r "@traces" tests/` to confirm every requirement has at least one test and every test traces to a requirement.

### Forward Traceability: ADR → Invariants → Behaviors

| ADR | Invariants Affected | Behavior Specs Affected |
|-----|--------------------|-----------------------|
| ADR-R001 (No ResultBoundary) | INV-R4 | 01 |
| ADR-R002 (Subpath Exports) | INV-R10 | All (export structure) |
| ADR-R003 (Naming Conventions) | None (naming style) | All |
| ADR-R004 (Adapter Strategy) | INV-R9 | 05 |
| ADR-R005 (No Option Hooks) | None (scope exclusion) | 01, 03 |
| ADR-R006 (Render Props) | INV-R5 | 01 |
| ADR-R007 (Adapter Naming) | None (naming style) | 05 |
| ADR-R008 (No Do-Notation Hook) | None (scope exclusion) | 03 |

> **Note**: INV-R11 (React Version Fail-Fast) is not derived from any ADR. It was formalized during the GxP specification review to capture a pre-existing documented behavior (React 18 import-time throw for React 19-only hooks) as a testable invariant. Its source is the React version compatibility matrix in [overview.md](../overview.md) and the behavior specs for [useOptimisticResult](../behaviors/03-composition-hooks.md#beh-r03-002-useoptimisticresult) and [useResultTransition](../behaviors/03-composition-hooks.md#beh-r03-004-useresulttransition).

### Backward Traceability: Test File → Spec

| Test File Pattern | Spec Coverage | Test Level |
|-------------------|---------------|------------|
| `*.test.ts` / `*.test.tsx` | Runtime behavior | Unit (Vitest + React Testing Library) |
| `*.test-d.ts` / `*.test-d.tsx` | Type inference | Type (Vitest typecheck) |
| `integration/*.test.tsx` | Full component trees | Integration |
| `gxp/*.test.tsx` / `gxp/*.test.ts` | Invariant integrity (High-risk) | GxP Integrity |

### Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|------------------|
| Requirement-level forward traceability | 100% of BEH-RXX-NNN IDs have at least one test | GAMP 5 §D.4 |
| Requirement-level backward traceability | 100% of test cases trace to a BEH-RXX-NNN or INV-RN ID | GAMP 5 §D.4 |
| Invariant forward traceability | 100% of invariants have tests | GAMP 5 |
| Unit test line coverage | > 95% | FDA Software Validation |
| GxP integrity test coverage | 100% of INV-R3, INV-R4 | Data integrity focus |
| Orphaned requirements | 0 BEH-RXX-NNN IDs without tests | GAMP 5 |
| Orphaned tests | 0 tests without a BEH-RXX-NNN or INV-RN reference | GAMP 5 |
| ATR-RN compliance | ATR-R1 (hook result logging), ATR-R2 (server-side logging), ATR-R3 (Match branch logging) verified by PR review and integration tests | 21 CFR 11.10(e) |
| DRR-RN compliance | DRR-R1 (core toJSON) verified by integration tests, DRR-R2 (server action serialization) verified by OQ-R020 and PQ-R010, DRR-R3 (adapter envelope loss) verified by integration tests | ALCOA+ Available, Enduring |

#### CI Traceability Verification

The CI pipeline should include a traceability verification step that runs `grep -r "@traces" tests/` and compares the output against the requirement ID list (BEH-R01-001 through BEH-R07-005, INV-R1 through INV-R12). This automated check ensures:
- Every requirement ID has at least one `@traces` annotation (forward traceability)
- Every `@traces` annotation references a valid requirement ID (backward traceability)
- No orphaned requirements or orphaned tests exist

The verification script is implemented in [`scripts/verify-traceability.sh`](../scripts/verify-traceability.sh) and runs as the `react-traceability` CI job in `.github/workflows/ci.yml`. It performs 5 automated checks: test file existence, behavior spec completeness, `@traces` forward traceability, `@traces` backward traceability, and orphaned test detection. Pass `--strict` to convert SKIPs (for not-yet-created package artifacts) into FAILs for release gating. See [test-strategy.md](../process/test-strategy.md) for the CI pipeline definition and [traceability.md § Automated Verification](../traceability.md#automated-verification) for the verification procedure.

## Specification Hierarchy Mapping

The following table maps GAMP 5 V-Model specification levels to `@hex-di/result-react` documents.

| GAMP 5 V-Model Level | Abbreviation | Library Document(s) | Content |
|----------------------|:------------:|----------------------|---------|
| User Requirements Specification | URS | [overview.md](../overview.md) | Package purpose, design philosophy, target consumers, high-level feature list |
| Functional Specification | FS | [behaviors/01–07](../behaviors/) | 7 behavior specifications defining all public API contracts (25 testable requirements) |
| Design Specification | DS | [decisions/R001–R008](../decisions/), [invariants.md](../invariants.md) | 8 Architecture Decision Records documenting design rationale; 12 runtime invariants |
| Configuration Specification | CS | N/A (Category 3 — no configuration) | The package has no configurable parameters; see [CS — Consumer Responsibility](#configuration-specification-cs--consumer-responsibility) |

> **Note**: Because `@hex-di/result-react` is a GAMP 5 Category 3 package (non-configured COTS), the specification hierarchy is simpler than a full Category 5 application. The package has no URS in the traditional sense — `overview.md` serves as the equivalent by documenting the "why" and "what" at the user-need level.

## Validation Templates

> **Scope and ownership**: These templates are **consumer-execution protocol templates**, not evidence of library-level qualification. The `@hex-di/result-react` library is validated through its automated test suite (unit, type, integration, and GxP integrity tests). The IQ/OQ/PQ templates below are provided for GxP consumers who must execute qualification protocols in their own validated environments as part of their system-level Validation Master Plan (VMP). The library maintainers do not execute these protocols — consumers adapt and execute them per their Quality Management System (QMS).

> **Test environment prerequisite**: These templates are designed for execution in the consumer's qualified test environment. The consumer is responsible for documenting the test environment configuration (OS version, Node.js version, React version, npm/pnpm version, TypeScript version) as part of their validation protocol per EU GMP Annex 11.4.

### Protocol Identification

Each IQ, OQ, and PQ execution should be documented with the following protocol metadata:

| Field | Description | Example |
|-------|-------------|---------|
| Protocol Number | Unique identifier assigned by consumer QMS | `VAL-PRO-2026-042` |
| Protocol Version | Version of this protocol template | `1.0` (aligned with package spec v1.0.0) |
| Execution ID | Unique identifier for this specific execution | `EXE-2026-042-001` |
| System Under Test | Package name and exact version | `@hex-di/result-react 0.1.0` |
| Core Library Version | `@hex-di/result` exact version | `@hex-di/result 1.2.3` |
| React Version | React exact version | `react 18.3.1` or `react 19.0.0` |
| Test Environment | OS, Node.js version, TypeScript version, package manager | `Ubuntu 22.04, Node 22.14.0, TS 5.6.3, pnpm 9.15.0` |
| Prepared By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Reviewed By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Approved By | Name, role, date | _Name / Role / YYYY-MM-DD_ |
| Execution Date | Date(s) of test execution | _YYYY-MM-DD_ |
| Executed By | Tester name and role | _Name / Role_ |

### Deviation Handling

If any IQ, OQ, or PQ test produces an unexpected result, the deviation handling procedures from SPEC-GXP-001 apply. React-specific always-critical tests:

- **OQ-R001** (Match renders correct branch) — verifies INV-R4 and INV-R5
- **OQ-R004** (generation guard rejects stale response) — verifies INV-R3
- **OQ-R005** (no exception thrown from Match/hooks) — verifies INV-R4
- **OQ-R020** (resultAction serialization boundary) — verifies DRR-R2
- **PQ-R005** (stale data prevention under concurrent updates) — verifies INV-R3 at scale
- **PQ-R010** (server action serialization boundary) — verifies DRR-R2 at integration level

#### React-Specific Deviation Severity Classification

When a deviation occurs during OQ or PQ execution, classify using the following React-specific guidance in addition to the general SPEC-GXP-001 deviation categories:

| Failure Type | Severity | Rationale | Example |
|---|---|---|---|
| Generation guard bypass (stale data displayed) | **Critical** | Data integrity — INV-R3 violation enables incorrect data informing GxP decisions | OQ-R004 shows stale response value |
| Exception thrown from hook or component | **Critical** | Error-as-value violation — INV-R4 breach causes silent error suppression via error boundaries | OQ-R005 error boundary triggers |
| Abort-on-cleanup failure (state update after unmount) | **Major** | Memory/state integrity — INV-R2 breach, potential phantom state updates | OQ-R007 state updates after unmount |
| StrictMode-only failure | **Major** | Development parity — INV-R7 breach means dev and production behavior diverge | OQ-R017 produces warnings or double state |
| Retry abort failure (orphaned retries) | **Major** | Operational reliability — INV-R8 breach wastes resources and may produce confusing behavior | OQ-R016 `fn()` called after unmount |
| Resource cache cross-contamination | **Major** | Cache integrity — INV-R9 breach causes incorrect data from wrong resource | OQ-R010 invalidation affects other resource |
| Serialization boundary data loss | **Major** | Data completeness — DRR-R2 breach, serializable fields lost in transit | OQ-R020 serializable fields missing |
| Type inference failure | **Minor** | Developer experience only — no runtime data integrity impact | OQ-R002 does not produce compile error |
| React version fail-fast not triggered | **Minor** | Detection delay — INV-R11 breach means version incompatibility discovered later | React 19 hook silently fails on React 18 |
| Server utility imports React runtime | **Minor** | Bundler impact — INV-R10 breach prevents RSC usage | OQ-R018 import fails without React |

### Installation Qualification (IQ) Checklist

| # | Check | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| IQ-R001 | Verify package installed | `npm ls @hex-di/result-react` shows correct version | |
| IQ-R002 | Verify package version | `require("@hex-di/result-react/package.json").version` matches expected | |
| IQ-R003 | Verify ESM import | `import { Match } from "@hex-di/result-react"` resolves | |
| IQ-R004 | Verify `/adapters` subpath | `import { toQueryFn } from "@hex-di/result-react/adapters"` resolves | |
| IQ-R005 | Verify `/server` subpath | `import { matchResult } from "@hex-di/result-react/server"` resolves | |
| IQ-R006 | Verify `/testing` subpath | `import { renderWithResult } from "@hex-di/result-react/testing"` resolves | |
| IQ-R007 | Verify internal blocking | `import "@hex-di/result-react/internal/foo"` fails with module-not-found | |
| IQ-R008 | Verify peer dependency: React | `npm ls react` shows >= 18.0.0 | |
| IQ-R009 | Verify peer dependency: core | `npm ls @hex-di/result` shows >= 1.0.0 | |
| IQ-R010 | Verify sideEffects flag | `package.json` contains `"sideEffects": false` | |
| IQ-R011 | Verify package integrity | `npm audit signatures` or hash verification against lock file integrity field | |
| IQ-R012 | Verify React version fail-fast (INV-R11) | In a React 18 environment: `import { useOptimisticResult } from "@hex-di/result-react"` | Import throws a descriptive error at module load time identifying the React 19 requirement. If the test environment uses React 19, record "N/A — React 19 installed; INV-R11 verified by OQ-level React 18 tests" in Pass/Fail. |
| IQ-R013 | Verify no post-install scripts | `npm pkg get scripts.postinstall scripts.preinstall scripts.install` for `@hex-di/result-react` | All three fields are empty or undefined. No lifecycle scripts execute during installation. If any lifecycle script is present, investigate and document justification before proceeding. |

### Operational Qualification (OQ) Test Scripts

> **OQ scope note**: The OQ tests below target a single-application context (one React application using `@hex-di/result-react`). Multi-application concurrency testing (e.g., two independent React apps sharing a page) is excluded from OQ scope because the package is stateless — it maintains no shared global state, singletons, or module-level caches that could produce cross-application interference. Each React application's component tree operates independently. If the consumer's deployment involves multiple React roots sharing a single page (micro-frontend architecture), the consumer should add application-isolation tests to their system-level OQ protocol.

| # | Traces To | Test | Steps | Expected Result | Tester | Date | Actual Result | Pass/Fail | Comments |
|---|-----------|------|-------|-----------------|--------|------|---------------|-----------|----------|
| OQ-R001 | BEH-R01-001, INV-R4, INV-R5 | Match renders correct branch | `render(<Match result={ok(42)} ok={v => <p>{v}</p>} err={e => <p>{e}</p>} />)` | Ok branch rendered with "42"; err branch not in DOM | | | | | |
| OQ-R002 | BEH-R01-001, INV-R5 | Match requires both branches | Attempt `<Match result={ok(1)} ok={v => <p>{v}</p>} />` (omitting `err`) | TypeScript compile error — `err` prop is required | | | | | |
| OQ-R003 | BEH-R02-001 | useResultAsync returns Result | `renderHook(() => useResultAsync(() => ResultAsync.ok(42), []))` | After resolution: `result.isOk() === true`, `result.value === 42` | | | | | |
| OQ-R004 | INV-R3 | Generation guard rejects stale response | 1. `renderHook` with `useResultAsync(fn, [dep])` where `fn` returns `ok(dep)`. 2. First render: `dep = "A"`, `fn` resolves after 500ms with `ok("A")`. 3. Before "A" resolves, change `dep` to `"B"`; `fn` resolves after 50ms with `ok("B")`. 4. Wait 600ms for both to settle. | After "B" resolves (≈50ms): `result.value === "B"`, `isLoading === false`. After "A" resolves (≈500ms): no state change — `result.value` remains `"B"`. First response is discarded by generation guard. | | | | | |
| OQ-R005 | INV-R4 | No exception thrown from Match/hooks | Wrap `<Match result={err("fail")} ok={v => <p>{v}</p>} err={e => <p>{e}</p>} />` in an `ErrorBoundary` that sets `caughtError` state on catch | Error boundary NOT triggered (`caughtError` remains `null`); err branch renders with text "fail" | | | | | |
| OQ-R006 | BEH-R02-002 | useResultAction execute returns Result | `renderHook(() => useResultAction(async (signal) => ok(42)))` then call `act(() => result.current.execute())` | `result.isOk() === true`, `result.value === 42` after execution | | | | | |
| OQ-R007 | INV-R2 | Abort on unmount | `renderHook(() => useResultAsync((signal) => { signalRef = signal; return delayedOk(42, 200) }, []))` then `unmount()` before 200ms | `signalRef.aborted === true`; no state update after unmount; no React "state update on unmounted component" warning | | | | | |
| OQ-R008 | INV-R1 | useResult stable actions | `renderHook(() => useResult<string, Error>())` — capture `result.current.setOk` as `ref1`; call `rerender()`; capture `result.current.setOk` as `ref2` | `ref1 === ref2` (referential equality); same for `setErr`, `set`, `reset` | | | | | |
| OQ-R009 | BEH-R02-003, INV-R6 | useResultSuspense with Suspense boundary | Render component calling `useResultSuspense(() => delayedOk({ name: "Alice" }, 100), [])` wrapped in `<Suspense fallback={<p>Loading</p>}>` | "Loading" text visible initially; after ≈100ms, `Result` rendered with "Alice"; Suspense fallback removed | | | | | |
| OQ-R010 | INV-R9 | createResultResource cache isolation | Create `resourceA = createResultResource(() => ResultAsync.ok("A"))` and `resourceB = createResultResource(() => ResultAsync.ok("B"))`. Read both. Invalidate `resourceA`. Read `resourceB`. | `resourceB.read()` returns `ok("B")` without re-fetching; `resourceA.read()` triggers new fetch | | | | | |
| OQ-R011 | BEH-R04-001 | fromAction wraps server action | `const safe = fromAction(async (x: number) => x * 2, (e) => ({ _tag: "Err" as const, cause: e }))`. Call `safe(21)`. | Returns `ResultAsync`; resolves to `ok(42)` | | | | | |
| OQ-R012 | BEH-R07-001 | matchResult (server) renders correctly | `matchResult(ok(42), { ok: v => <p>{v}</p>, err: e => <p>{e}</p> })` | Returns ReactNode with "42" | | | | | |
| OQ-R013 | BEH-R07-004 | resultAction returns Promise<Result> | `const action = resultAction(async () => ({ id: "B-001" }), (e) => ({ _tag: "ActionErr" as const, cause: e }))`. Call `await action()`. | Returns `Promise<Result>`; resolves to `ok({ id: "B-001" })` | | | | | |
| OQ-R014 | BEH-R05-001, DRR-R3 | toQueryFn adapter | `const qfn = toQueryFn(() => ResultAsync.ok(42))`. Call `await qfn()`. | Returns `42` (unwrapped `Ok` value); compatible with TanStack Query `queryFn` signature | | | | | |
| OQ-R015 | BEH-R05-003, DRR-R3 | toSwrFetcher adapter | `const fetcher = toSwrFetcher((key: string) => ResultAsync.ok(key.length))`. Call `await fetcher("/api")`. | Returns `4` (unwrapped `Ok` value); compatible with SWR `fetcher` signature | | | | | |
| OQ-R016 | INV-R8 | Retry abort propagation | 1. Create `callCount = 0` counter. 2. `renderHook(() => useResultAsync((signal) => { callCount++; return ResultAsync.err("fail") }, [], { retry: 2, retryDelay: 200 }))`. 3. After first `fn()` call completes (Err), wait 100ms (mid-retry-delay), then `unmount()`. | `callCount === 1` (only the initial call); no second `fn()` call occurs after unmount; abort signal triggered during retry delay | | | | | |
| OQ-R017 | INV-R7 | Strict mode double-mount | 1. Create `const consoleSpy = vi.spyOn(console, "error")`. 2. `const { result } = renderHook(() => useResultAsync(() => ResultAsync.ok(42), []), { wrapper: React.StrictMode })`. 3. `await waitFor(() => expect(result.current.result).not.toBeUndefined())`. 4. Assert `result.current.result!.value === 42`. 5. Assert `result.current.isLoading === false`. 6. Assert `consoleSpy` was not called with any string containing `"Cannot update"` or `"unmounted"`. 7. Restore spy. | `result.current.result!.value === 42`; `isLoading === false`; `consoleSpy` not called with state-update warnings; single final state (not double state update from double-mount) | | | | | |
| OQ-R018 | INV-R10 | Server utility has no React runtime dependency | `import { matchResult } from "@hex-di/result-react/server"` in a non-React Node.js script (environment with `react` not installed) | Import succeeds without React installed (type-only JSX dependency) | | | | | |
| OQ-R019 | BEH-R01-001 | Match variant change unmounts previous branch | 1. Create `let unmounted = false`. 2. Create `OkBranch` component: `function OkBranch({ value }: { value: number }) { useEffect(() => () => { unmounted = true }, []); return <p data-testid="ok">{value}</p> }`. 3. `const { rerender } = render(<Match result={ok(1)} ok={v => <OkBranch value={v} />} err={e => <p data-testid="err">{String(e)}</p>} />)`. 4. Assert `screen.getByTestId("ok")` has text `"1"`. 5. `rerender(<Match result={err("x")} ok={v => <OkBranch value={v} />} err={e => <p data-testid="err">{String(e)}</p>} />)`. 6. Assert `unmounted === true`. 7. Assert `screen.getByTestId("err")` has text `"x"`. | `unmounted === true` (previous ok branch's component tree is fully unmounted); err branch renders with text "x"; ok branch no longer in DOM | | | | | |
| OQ-R020 | BEH-R07-004, DRR-R2 | resultAction serialization boundary (DRR-R2) | Call `resultAction`-wrapped action returning `{ id: "B-001", name: "Test", validate: () => true, meta: Symbol("x") }` via simulated RSC wire transfer | `result.isOk() === true`; `result.value.id === "B-001"`; `result.value.name === "Test"`; `result.value.validate === undefined`; `result.value.meta === undefined`; Result envelope preserved | | | | | |

> **OQ-R020 implementation guidance**: To simulate an RSC wire transfer without a full RSC framework, use `JSON.parse(JSON.stringify(result.toJSON()))` followed by `Result.fromJSON()` reconstruction. This simulates the JSON serialization boundary that React Server Components use internally. Non-serializable values (functions, Symbols, class instances) are stripped by `JSON.stringify`, matching RSC wire transfer behavior. For a more faithful simulation, use the `react-server-dom-webpack` package's `renderToReadableStream` and `createFromReadableStream` APIs in a test harness. The minimal `JSON.parse(JSON.stringify(...))` approach is sufficient for verifying that serializable fields survive and non-serializable fields are dropped.

### Performance Qualification (PQ) Scenarios

| # | Scenario | Traces To | Steps | Acceptance Criteria |
|---|----------|-----------|-------|---------------------|
| PQ-R001 | Async hook lifecycle (loading → success → refetch → success) | BEH-R02-001, INV-R2, INV-R3 | 1. Render component with `useResultAsync(() => ResultAsync.ok(42), [])`. 2. Assert `isLoading === true` and `result === undefined` (initial state). 3. `await waitFor(() => expect(result).not.toBeUndefined())`. 4. Assert `result.value === 42` and `isLoading === false`. 5. Call `refetch()`. 6. Assert `isLoading === true`. 7. Wait for resolution. 8. Assert `result.value === 42` and `isLoading === false`. | Exactly 4 state transitions observed: (1) loading/undefined → (2) loaded/Ok(42) → (3) loading/Ok(42) → (4) loaded/Ok(42). No intermediate state shows stale or undefined data after initial load. `isLoading` toggles exactly twice. |
| PQ-R002 | Error recovery flow (loading → error → retry → success) | BEH-R02-001, INV-R4 | 1. Create `let callCount = 0`. 2. Create `fn` that returns `ResultAsync.err("fail")` on first call, `ResultAsync.ok(42)` on second call (using `callCount++`). 3. Wrap in `ErrorBoundary` that sets `caughtError` state. 4. Render with `useResultAsync(fn, [])`. 5. Wait for first resolution. 6. Assert `result.isErr() === true` and `result.error === "fail"`. 7. Assert `caughtError === null` (error boundary NOT triggered). 8. Call `refetch()`. 9. Wait for second resolution. 10. Assert `result.isOk() === true` and `result.value === 42`. | Error displayed as typed `Err` value (not thrown); `caughtError` remains `null` throughout; recovery renders `Ok` branch with value `42`; `callCount === 2` (exactly 2 invocations). |
| PQ-R003 | Match + useResultAsync integration | BEH-R01-001, BEH-R02-001, INV-R5 | Full component tree: `useResultAsync` → `Match` → render branches | Both branches render correctly; variant transition unmounts previous branch |
| PQ-R004 | Server action round-trip | BEH-R07-004, DRR-R2 | Client calls `resultAction`-wrapped server action; verify Result on client | Client receives branded Result; `isResult()` returns true; value matches server response |
| PQ-R005 | Stale data prevention under concurrent updates | INV-R3, INV-R2 | Rapid dependency changes (10 changes in <100ms); verify only last response displayed | All intermediate responses discarded; final displayed value matches last request |
| PQ-R006 | Adapter GxP workflow | BEH-R05-001, DRR-R3 | Use `toQueryFn` with `inspect()` pre-logging; verify TanStack Query cache and audit log | Audit log contains full Result; TanStack Query cache contains unwrapped value; no data loss |
| PQ-R007 | useSafeTry sequential composition | BEH-R03-003, INV-R2 | Three sequential async operations via `useSafeTry`; second returns Err | First operation logged; second Err short-circuits; third never called; abort on unmount verified |
| PQ-R008 | Suspense + resource lifecycle | BEH-R02-003, BEH-R02-004, INV-R6, INV-R9 | `createResultResource` → `preload` → `useResultSuspense` → `invalidate` → re-suspend | Fallback shown during pending; Result rendered after resolution; invalidation causes re-suspension; second resolution renders correctly |
| PQ-R009 | Full GxP audit trail integration | ATR-R1, ATR-R2, ATR-R3 | 1. Create `const auditLog: Array<{ event: string; timestamp: string; branch?: string }> = []`. 2. Render component with `useResultAsync(() => ResultAsync.ok({ batchId: "B-001" }), [])`. 3. In `useEffect`, log: `auditLog.push({ event: "result_received", timestamp: new Date().toISOString() })` with `inspect()`/`inspectErr()`. 4. Render via `Match` with `ok`/`err` branches that push `{ event: "branch_rendered", branch: "ok" | "err", timestamp }` to `auditLog`. 5. Wait for resolution and rendering. 6. Assert `auditLog.length >= 2` (ATR-R1 entry + ATR-R3 branch entry). 7. Assert first entry has `event === "result_received"` and a valid ISO timestamp. 8. Assert second entry has `event === "branch_rendered"` and `branch === "ok"`. | ATR-R1: at least 1 audit entry with `event === "result_received"` and valid ISO 8601 timestamp. ATR-R3 (if applicable): at least 1 entry with `event === "branch_rendered"` and `branch` matching the rendered variant. All timestamps are valid ISO 8601. Total audit entries >= 2. **ATR-R3 N/A path**: If the organization has determined that ATR-R3 branch logging is not required (documented in the system-level risk assessment), record "N/A — ATR-R3 not required per [risk assessment reference]" in the Comments column and assert `auditLog.length >= 1` (ATR-R1 only). The ATR-R1 and ATR-R2 portions of this test remain mandatory regardless. |
| PQ-R010 | Server action serialization boundary (DRR-R2) | BEH-R07-004, DRR-R2 | `resultAction`-wrapped server action returning object with both JSON-serializable fields (`id: string`, `name: string`) and non-serializable fields (`validate: Function`, `meta: Symbol`); client component receives Result and inspects all fields | JSON-serializable fields are intact on client (`id`, `name` match server values); non-serializable fields are absent or `undefined` on client; no runtime error thrown; Result envelope (`isOk()`, `isResult()`) is preserved |

## Training Guidance

Per EU GMP Annex 11.2, personnel involved in GxP-regulated systems must receive training appropriate to their role.

### Developer Onboarding

Developers writing code that uses `@hex-di/result-react` should understand:

| Topic | Key Points | Spec Reference |
|-------|-----------|----------------|
| Result-in-React pattern | `Match` component for rendering, hooks for state management, errors as values (not thrown) | [01-components.md](../behaviors/01-components.md), [INV-R4](../invariants.md#inv-r4-no-exception-promotion) |
| Generation guard | Why stale data display is a GxP risk; how `useResultAsync` generation tracking works | [INV-R3](../invariants.md#inv-r3-generation-guard), [ADR-R001](../decisions/R001-no-error-boundary.md) |
| Adapter envelope loss | `toQueryFn` / `toSwrFetcher` unwrap the Result — audit logging must occur before adapter transformation | [DRR-R3](#data-retention-requirements), [05-adapters.md](../behaviors/05-adapters.md) |
| Server action audit trail | `resultAction` crosses a serialization boundary — audit logging must occur server-side before return | [ATR-R2](#normative-requirements), [07-server.md](../behaviors/07-server.md) |
| Core library GxP training | All topics from SPEC-GXP-001 Training Guidance (immutability, brand validation, serialization, `inspect` vs `andTee`) | [SPEC-GXP-001 Training Guidance](../../compliance/gxp.md#training-guidance) |

### GxP Consumer Training

Quality Assurance and validation personnel should understand the React package's safety properties:

| Topic | Key Points | Spec Reference |
|-------|-----------|----------------|
| Invariant guarantees | 12 runtime invariants (INV-R1 through INV-R12), what each protects | [invariants.md](../invariants.md) |
| ALCOA+ mapping | How React binding features support each ALCOA+ principle | [ALCOA+ Compliance Mapping](#alcoa-compliance-mapping) |
| IQ/OQ/PQ execution | How to run the React-specific qualification checklists | [Validation Templates](#validation-templates) |
| Adapter risk | Why adapter functions break the Result envelope and how to mitigate | [DRR-R3](#data-retention-requirements), [RR-R2](#residual-risk-summary) |
| Relationship to core | Which guarantees come from core (immutability, brand) vs. React package (generation guard, abort) | [Relationship to Core](#relationship-to-core-library-gxp-compliance) |

### Competency Assessment

Training must include an objective assessment to verify understanding of GxP-relevant React binding behavior.

#### Assessment Format

| Role | Assessment Method | Pass Threshold |
|------|------------------|----------------|
| Developer | Scenario-based quiz (written) + code review exercise | 100% on GxP-critical questions; >= 80% overall |
| QA / Validation | Scenario-based quiz (written) | 100% on GxP-critical questions; >= 80% overall |

#### Required Assessment Questions (Minimum)

Each question is classified as **Critical** or **Standard**. Per the [Assessment Format](#assessment-format), trainees must score 100% on Critical questions and >= 80% overall. A single incorrect Critical answer is a failing result regardless of overall score.

| # | Classification | Topic | Question |
|---|:-:|---|---|
| 1 | **Critical** | Stale data risk | Given a component using `useResultAsync` with rapidly changing dependencies, explain why the generation guard (INV-R3) is critical for GxP data integrity and what could happen if stale data were displayed. |
| 2 | **Critical** | Error-as-value | Given a `Match` component rendering an `Err` result, explain why the error is rendered via the `err` prop rather than caught by a React error boundary. Identify the GxP risk if errors were thrown instead. |
| 3 | **Standard** | Adapter audit trail | Explain why `toQueryFn(fetchData)` is insufficient for GxP audit logging and what pattern should be used instead (reference DRR-R3). |
| 4 | **Standard** | Server action logging | Explain why audit logging must occur server-side when using `resultAction` (reference ATR-R2). |
| 5 | **Standard** | Version pinning | Explain why both `@hex-di/result` and `@hex-di/result-react` must be pinned to exact versions and what the revalidation scope is for a patch upgrade. |

> **Rationale for Critical classification**: Questions 1 and 2 directly test understanding of the two High-risk invariants (INV-R3 and INV-R4). A developer or QA professional who cannot explain these risks may introduce or miss data integrity defects in GxP-regulated code. Questions 3–5 test important compliance knowledge (adapter envelope loss, server-side logging, version control) but address Medium or Low risk areas where compensating controls exist.

> **Role-specific adaptation**: The 5 questions above are the **mandatory baseline minimum** for all roles. Organizations may supplement them with role-specific questions tailored to the trainee's primary responsibilities. For example: front-end developers may receive additional questions on `Match` component usage patterns and adapter audit trails (DRR-R3); server-action developers may receive deeper questions on `resultAction` serialization boundaries (DRR-R2) and server-side audit logging (ATR-R2); QA/validation engineers may receive questions on IQ/OQ/PQ execution procedures and deviation classification. Role-specific supplements do not replace the 5 mandatory questions — they extend the assessment to cover role-relevant depth.

#### Training Records Storage

Training completion records (assessment scores, dates, assessor identity) must be stored in the consuming organization's QMS training management system (e.g., Veeva Vault QMS, MasterControl, or equivalent). At minimum, the following records must be retained:

| Record | Content | Retention |
|--------|---------|-----------|
| Assessment results | Trainee name, date, assessor, per-question scores, overall score, pass/fail | Per the organization's training record retention policy (typically aligned with product lifecycle or regulatory requirement — e.g., 21 CFR 211.180 for pharmaceutical manufacturing) |
| Remediation records | Dates of remediation, re-assessment scores, escalation actions | Same as assessment results |
| Training material version | Version of this GxP compliance document used for training | Linked to assessment record |

> **Note**: The library project itself does not maintain training records — training is a consumer responsibility per EU GMP Annex 11.2. The records above are stored in the consumer's QMS, not in this repository.

#### Failed Assessment Remediation

If a trainee does not meet the pass threshold, the same remediation procedure from SPEC-GXP-001 applies: immediate restriction from GxP-critical code, targeted remediation training, re-assessment with different questions after 5 business days, maximum 2 re-assessment attempts, escalation to QA management on consecutive failures.

## GxP Incident Reporting

GxP incidents affecting `@hex-di/result-react` are reported through the same channel as the core library — see [SPEC-GXP-001 GxP Incident Reporting](../../compliance/gxp.md#gxp-incident-reporting).

### React-Specific Guidance

When reporting a GxP incident involving the React package, include the following additional information:

| Field | Description |
|-------|-------------|
| React version | `react` and `react-dom` exact versions |
| Rendering context | Client Component, Server Component, or Server Action |
| Hook involved | Which hook or component exhibited the issue |
| Concurrent features | Whether React Concurrent Mode, Suspense, or Transitions are in use |
| Adapter involvement | Whether the issue involves `toQueryFn`, `toSwrFetcher`, or other adapter functions |

### Response Targets

The response targets from SPEC-GXP-001 apply equally to `@hex-di/result-react`:

| Severity | Definition | Triage Target | Fix Target |
|----------|-----------|---------------|------------|
| **Critical** | Generation guard bypass (INV-R3), exception promotion from hooks/components (INV-R4), abort failure causing phantom state updates | Acknowledge within 48 hours | Patch release within 7 calendar days |
| **Major** | Incorrect behavior in a documented invariant (INV-R1 through INV-R12) that does not directly enable data loss | Acknowledge within 5 business days | Patch release within 30 calendar days |
| **Minor** | Documentation error in compliance mappings, incorrect test specification | Acknowledge within 10 business days | Fix in next scheduled release |

## Periodic Review

Per EU GMP Annex 11.11, the `@hex-di/result-react` specification and GxP compliance mapping are subject to periodic review. The full periodic review procedure — including cadence, scope, procedure, and outputs — is defined in [change-control.md § Periodic Review](../process/change-control.md#periodic-review).

### Summary

| Trigger | Scope |
|---------|-------|
| Major version release | Verify compliance mapping against new capabilities |
| Core library (`@hex-di/result`) major version | Verify React binding invariants (INV-R1 through INV-R12) and ALCOA+ mapping |
| React major version | Verify hook behavior, Suspense contract (INV-R6), version fail-fast (INV-R11); re-execute IQ/OQ |
| Annually (by March 31) | Full review: invariants, ALCOA+ mapping, residual risks, audit trail requirements, data retention, training guidance |

The review is documented as a GitHub PR, which serves as the review record. If no changes are needed, the PR records that the review was performed and no changes were required.

## Change Control

All changes to this specification and the `@hex-di/result-react` package follow the change control procedure defined in [change-control.md](../process/change-control.md). Changes are classified as Critical, Major, Minor, or Editorial, with approval levels and regression testing requirements scaled to the change category.

## Document Control Policy Reference

All documents in this specification suite use Git-based version control for document metadata (version, author, reviewer, change history). For details on how to retrieve approval evidence and document history from Git, see the [Document Control Policy](../process/document-control-policy.md) (SPEC-REACT-PRC-004). For the core library's document control approach, see the [Document Version Control Policy](../../process/ci-maintenance.md#document-version-control-policy).
