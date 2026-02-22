# @hex-di/http-client — Document Control Policy

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-005 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/document-control-policy.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Overview

This document defines how the `@hex-di/http-client` specification suite is version-controlled, reviewed, and kept authoritative over the course of the library's lifetime. It implements the shared GxP change control framework from [`spec/cross-cutting/gxp/08-change-control.md`](../../../cross-cutting/gxp/08-change-control.md) for the specific context of a TypeScript library specification managed in Git.

---

## 1. Version Tracks

The specification and the npm package maintain **independent** version tracks:

| Track | Format | Owner | Increments when |
|-------|--------|-------|----------------|
| **Specification revision** | `Major.Minor` (e.g. `0.1`) | Specification Author | Requirements change, invariants are added or revised, GxP compliance sections are updated, process documents are revised |
| **npm package version** | SemVer `Major.Minor.Patch` (e.g. `0.1.0`) | Engineering team | Implementation changes: new features, bug fixes, breaking API changes |

A specification revision change does **not** automatically trigger an npm package version bump, and vice versa. Both versions are tracked independently.

### specRevision Constant

The implementation MUST expose a `specRevision` constant matching the current specification revision. This constant is the machine-verifiable link between the installed package and the specification it implements.

```typescript
// In @hex-di/http-client:
export function getMetadata(): { specRevision: string; version: string } {
  return {
    specRevision: "0.1",  // matches specification revision Major.Minor
    version: "0.1.0",     // matches npm package version
  };
}
```

In GxP environments, automated qualification tools MUST verify that `specRevision` matches the specification revision used in the approved Validation Plan before IQ execution proceeds.

#### CI Enforcement

The CI pipeline enforces `specRevision` consistency as part of the pre-release checklist in [`process/ci-maintenance.md`](./ci-maintenance.md). The verification runs at release time, not on every PR:

```bash
# Verify specRevision matches the expected spec revision (run during release):
node -e "
  const { getMetadata } = require('./libs/http-client/core/dist/index.js');
  const { specRevision } = getMetadata();
  const expected = process.env.SPEC_REVISION ?? '0.1';
  if (specRevision !== expected) {
    console.error('specRevision mismatch: got', specRevision, 'expected', expected);
    process.exit(1);
  }
  console.log('specRevision OK:', specRevision);
"
```

For spec-only changes (no npm version bump), the `specRevision` constant in source MUST be updated to match the new spec revision before the spec PR is merged. The pre-release checklist item "specRevision constant in source matches the current specification revision" in [`process/ci-maintenance.md`](./ci-maintenance.md) enforces this at release time.

---

## 2. Git-Based Document Versioning

All specification files are managed in the monorepo Git repository. Git provides the authoritative version control for the specification suite.

### Version Identification

Each specification file's version is derived from Git metadata:

```bash
# Current version of a specific file:
git log -1 --format="%H %ai" -- spec/libs/http-client/invariants.md

# Full change history of a file:
git log --follow --format="%H %ai %an: %s" -- spec/libs/http-client/invariants.md
```

GxP audit references MUST use the **suite-level revision** (`0.1.0`) rather than individual file Git SHAs. Individual file SHAs are useful for troubleshooting but are not the primary version identifier in regulatory documentation.

### Authoritative Source

The Git repository at the canonical remote URL is the single authoritative source for all specification files. Copies maintained outside Git (e.g. in document management systems) must be clearly identified as "Controlled Copy" with the suite-level revision and the date of export.

---

## 3. Change Procedure

All changes to specification files follow the Change Request process defined in [`process/change-control.md`](./change-control.md). The change classification determines the required approvals and the impact on the suite-level revision.

| Change Category | Suite Revision Increment | Required Approvals |
|---|---|---|
| Category 1 (Minor — no revalidation) | Patch increment (e.g. `0.1.0` → `0.1.0.1`) — or no increment for purely editorial | Author + Peer review via PR |
| Category 2 (Significant — targeted revalidation) | Minor increment (e.g. `0.1` → `0.2`) | Author + Technical Reviewer + QA Approver |
| Category 3 (Major — full revalidation) | Major increment (e.g. `0.1` → `1.0`) | Author + Technical Reviewer + QA Approver + independent GxP review |

The suite-level revision increment is recorded in `README.md` §Revision History at the time of the change.

---

## 4. Document Integrity Verification

### Traceability Script

The `scripts/verify-traceability.sh` script validates internal consistency of the traceability matrix. It MUST pass on every PR that modifies specification files.

```bash
# Run traceability verification:
cd spec/libs/http-client
./scripts/verify-traceability.sh

# Strict mode (fails if package not yet implemented):
./scripts/verify-traceability.sh --strict
```

### Cross-Reference Integrity

When modifying a specification file, the author MUST verify that all internal cross-references remain valid:
- Invariant IDs referenced in other files still exist in `invariants.md`
- FMEA failure mode IDs (FM-N) referenced in `invariants.md` still exist in `risk-assessment.md`
- ADR IDs referenced in invariants and spec sections still exist in `decisions/`
- Test IDs in the traceability matrix match the DoD test tables in `17-definition-of-done.md`

---

## 5. Controlled Copy Policy

Organizations using this specification in GxP validation activities may maintain controlled copies in their document management system. Controlled copies MUST:

1. Be clearly identified with the suite-level revision (e.g. `SPEC-HTTP-001 v0.1.0`)
2. Include a "Controlled Copy" watermark or header in each document
3. Be traceable to the source Git commit (SHA recorded at time of copy)
4. Be superseded when a new revision is approved — superseded copies MUST be marked "SUPERSEDED" and retained per the retention policy (see §104 of `compliance/gxp.md`)

Printed copies are considered **uncontrolled** unless stamped "Controlled Copy" with the revision and date. Uncontrolled copies MUST NOT be used to govern GxP qualification activities.

---

## 6. Document Retirement

Specification documents are retired when:
- The corresponding library package is permanently deprecated
- The specification is superseded by a restructured replacement

Retired documents transition to "Obsolete" state in the Document State Lifecycle (see `README.md` §Document State Lifecycle). Obsolete documents are retained in Git history but removed from the active specification directory.

Retention of obsolete specification documents follows the policy in `compliance/gxp.md` §104. For GxP-relevant specifications, the retention period is the longer of:
- 5 years from the date the specification was superseded
- The retention period required by the applicable regulation (21 CFR Part 211.180: 1 year after drug expiry; EU GMP Annex 11: lifetime of the system + 1 year)
