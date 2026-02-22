# @hex-di/http-client — Change Control

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-004 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/change-control.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Overview

This document defines the change classification and approval workflow for `@hex-di/http-client`. In GxP-regulated deployments, all changes to the library must be classified, reviewed, and approved before deployment per EU GMP Annex 11 §10 (Change and Configuration Management).

Cross-cutting GxP change control methodology is maintained in [`spec/cross-cutting/gxp/08-change-control.md`](../../../cross-cutting/gxp/08-change-control.md). This document applies that methodology to the specific change categories of the HTTP client library.

---

## Change Categories

### Category 1 — Minor Change (No Revalidation Required)

A change is **minor** when it does not affect:
- The `HttpClient` interface or `HttpClientPort` definition
- Any `HttpClientError` variant's `_tag`, `reason`, or structure
- Any invariant defined in `invariants.md`
- Any GxP compliance behavior documented in `compliance/gxp.md`

**Examples**:
- Documentation corrections (typos, clarifications that don't change meaning)
- Adding a new convenience utility function with no effect on existing APIs
- Performance optimizations that don't change observable behavior
- Adding new test IDs to `17-definition-of-done.md` without removing existing ones
- New ADR file documenting an existing design decision

**Approval**: PR approval by one Technical Reviewer. No QA sign-off required.

**Required actions**:
- [ ] Unit tests added/updated
- [ ] `pnpm changeset` patch bump (npm package version)
- [ ] Spec revision: no increment required for purely editorial changes; Patch increment (e.g. `0.1` → `0.1.1`) if a clarification changes meaning — record in `README.md` §Revision History
- [ ] `17-definition-of-done.md` updated if new tests added

---

### Category 2 — Moderate Change (Impact Assessment Required)

A change is **moderate** when it:
- Adds a new exported function or type to the public API
- Adds a new combinator, body accessor variant, or error `reason` variant
- Changes behavior of an existing function in a backward-compatible way
- Adds a new invariant at Low or Medium risk level
- Adds a new transport adapter package

**Examples**:
- Adding `HttpClient.cacheGet()` combinator
- Adding a new `reason` variant to `HttpBodyError`
- Adding `HttpRequest.withPriority()` combinator
- Publishing `@hex-di/http-client-deno` adapter

**Approval**: PR approval by Technical Reviewer + QA Reviewer review of impact assessment.

**Required actions**:
- [ ] Impact assessment: list all APIs affected by the change
- [ ] Unit + type tests added
- [ ] `invariants.md` updated if new invariant introduced
- [ ] `risk-assessment.md` FMEA row added for new invariant
- [ ] `traceability.md` updated
- [ ] `pnpm changeset` minor bump (npm package version)
- [ ] Spec revision: Minor increment (e.g. `0.1` → `0.2`) — update `README.md` §Revision History and `specRevision` constant in source
- [ ] `compliance/gxp.md` ALCOA+ mapping updated if GxP-relevant

---

### Category 3 — Major Change (Full Revalidation Required)

A change is **major** when it:
- Breaks backward compatibility of any public API
- Changes or removes any `HttpClientError` variant's `_tag` or `reason`
- Modifies an existing invariant's guarantee
- Withdraws an invariant
- Changes the `HttpClientPort` name, direction, or category
- Changes error freezing behavior (INV-HC-4, INV-HC-5)
- Changes body consumption semantics (INV-HC-2, INV-HC-3)
- Affects any GxP compliance section in `compliance/gxp.md`

**Approval**: PR approval by Technical Reviewer + QA Reviewer + Regulatory Affairs sign-off (for GxP-regulated deployments).

**Required actions**:
- [ ] Breaking change analysis: document all consumers affected
- [ ] Spec chapter updated with withdrawn/replaced requirement IDs (IDs never reused)
- [ ] `invariants.md` updated (withdrawn invariants marked, not deleted)
- [ ] `risk-assessment.md` FMEA re-assessed for affected invariants
- [ ] `traceability.md` fully updated
- [ ] GxP integrity tests updated
- [ ] `compliance/gxp.md` reviewed and updated
- [ ] `README.md` §Revision History updated with QA Approval entry
- [ ] `pnpm changeset` major bump (npm package version)
- [ ] Spec revision: Major increment (e.g. `0.1` → `1.0`) — update `README.md` §Revision History and `specRevision` constant in source
- [ ] Deployment freeze period of 48 hours before production rollout (GxP environments)

---

## Approval Workflow

```
Developer → PR created
        ↓
Technical Reviewer → Code review + spec accuracy check
        ↓ (Category 2+)
QA Reviewer → Impact assessment review + GxP compliance check
        ↓ (Category 3 only, GxP deployments)
Regulatory Affairs → ALCOA+ and audit trail impact sign-off
        ↓
Merge to main → Git tag with changeset version
        ↓ (GxP environments)
APPROVAL_RECORD.json generated → Deployment authorized
```

---

## Invariant-Level Change Rules

| Action | Classification | Rule |
|--------|---------------|------|
| Add new invariant | Category 2 or 3 | Depends on risk level: Low/Medium → Cat 2; High → Cat 3 |
| Modify existing invariant description | Category 2 | Description only; no behavioral change |
| Modify existing invariant guarantee | Category 3 | Behavioral change |
| Withdraw invariant | Category 3 | Mark as withdrawn; do not delete; do not reuse ID |
| Add FM-N to risk-assessment.md | Category 2 | New failure mode identified; add FMEA row |
| Change FM-N risk level | Category 3 | RPN change may require new tests |

---

## Emergency Change Procedure

For critical security vulnerabilities or production incidents:

1. Developer creates a hotfix branch and raises PR with `[HOTFIX]` tag.
2. Technical Reviewer provides expedited review (target: 2 hours).
3. QA Reviewer provides documented risk acceptance statement.
4. Merge authorized without waiting for standard review window.
5. Post-deployment: full change control documentation completed within 5 business days.
6. Hotfix is reclassified as Category 2 or 3 retroactively and all required actions completed.

**GxP requirement**: Emergency changes in GxP-regulated deployments must be documented in the quality management system (QMS) within 24 hours per EU GMP Annex 11 §10 and FDA 21 CFR Part 11.100.

---

## Requirement ID Retirement

When a requirement is withdrawn or superseded:

1. The old ID is **retained** in all specification documents with a `~~strikethrough~~` and `Withdrawn: <date>, superseded by <new-ID>` annotation.
2. The old ID is **never reassigned** to a different requirement.
3. The traceability matrix marks the requirement as `Withdrawn` in the status column.
4. Tests covering only the withdrawn requirement are removed; tests covering overlapping functionality are updated to reference the new requirement ID.
