# @hex-di/http-client-react — Change Control

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-PRC-004 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/process/change-control.md` |
| Status | Effective |

---

## Overview

This document defines the change classification and approval workflow for modifications to the `@hex-di/http-client-react` specification and implementation. It inherits the core change control framework from the parent package; see [`../process/change-control.md`](../process/change-control.md) for the authoritative process.

---

## Change Categories

| Category | Description | Examples | Approval Required |
|----------|-------------|---------|-------------------|
| **Minor** | Clarifications, typo corrections, non-normative additions | Prose wording, example code | PR review (author + 1 reviewer) |
| **Moderate** | New optional behavior, new exports, spec section additions | New hook option, new type export | PR review + spec author sign-off |
| **Major** | Breaking API change, new invariant, risk score change | Hook signature change, new INV-HCR-N | PR review + spec author + traceability update |
| **Withdrawal** | Removing a requirement, invariant, or ADR | Deprecating a hook, withdrawing INV-HCR-N | PR review + spec author + traceability tombstone |

---

## Workflow

1. **Create PR** with changes to spec and/or implementation files.
2. **Classify** the change using the table above.
3. **Update affected documents** per the classification:
   - Minor: spec chapter only
   - Moderate: spec chapter + `overview.md` API table + `traceability.md`
   - Major: spec chapter + `invariants.md` + `risk-assessment.md` + `traceability.md` + `05-definition-of-done.md` + `process/definitions-of-done.md`
   - Withdrawal: all of Major, plus tombstone the withdrawn ID with `[Withdrawn]` marker (IDs are never deleted or reused)
4. **Merge** to `main` after required approvals. Merge commit is the approval evidence.

---

## Traceability Update Checklist

For Major changes:

- [ ] New requirement IDs assigned in spec chapter (`§N.M`)
- [ ] `invariants.md` updated (new INV-HCR-N with `**Related**` links)
- [ ] `risk-assessment.md` FMEA table updated (new FM-HCR-N row)
- [ ] `traceability.md` Capability, Invariant, and Test File Map tables updated
- [ ] `05-definition-of-done.md` test table updated with new test IDs
- [ ] `process/definitions-of-done.md` DoD checklist updated
- [ ] `scripts/verify-traceability.sh` run to confirm no broken links

---

## Relation to Parent Package Change Control

Changes to the `@hex-di/http-client` core spec that affect this React integration layer require a corresponding update here. Specifically:

- If a core invariant (`INV-HC-N`) is modified that is referenced by a React invariant, the React invariant's `**Related**` links must be updated.
- If a core export changes (e.g., `HttpClient` interface), the React spec's API surface (`overview.md`) and type tests must be updated.
