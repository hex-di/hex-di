# @hex-di/http-client-react — Document Control Policy

## Document Control

| Field | Value |
| --- | --- |
| Document ID | SPEC-HCR-PRC-006 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/process/document-control-policy.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Overview

This document defines how the `@hex-di/http-client-react` specification suite is version-controlled, reviewed, and kept authoritative over the library's lifetime. It inherits the shared document control framework from [`../process/document-control-policy.md`](../process/document-control-policy.md); the sections below cover react-sub-spec specifics.

---

## 1. Version Tracks

The specification and the npm package maintain **independent** version tracks:

| Track | Format | Owner | Increments when |
| --- | --- | --- | --- |
| **Specification revision** | `Major.Minor` (e.g. `0.1`) | Specification Author | Requirements change, invariants are added or revised, process documents are revised |
| **npm package version** | SemVer `Major.Minor.Patch` (e.g. `0.1.0`) | Engineering team | Implementation changes: new features, bug fixes, breaking API changes |

### specRevision Constant

The implementation MUST expose a `specRevision` constant matching the current specification revision:

```typescript
// In @hex-di/http-client-react:
export function getMetadata(): { specRevision: string; version: string } {
  return {
    specRevision: "0.1",  // matches specification revision Major.Minor
    version: "0.1.0",     // matches npm package version
  };
}
```

---

## 2. Git-Based Document Versioning

All specification files are managed in the monorepo Git repository.

### Version Identification

```bash
# Current version of a specific file:
git log -1 --format="%H %ai" -- spec/libs/http-client/react/invariants.md

# Full change history of a file:
git log --follow --format="%H %ai %an: %s" -- spec/libs/http-client/react/invariants.md
```

Use the **suite-level revision** (`0.1.0`) rather than individual file Git SHAs when referencing this specification in external documentation.

### Relation to Core Spec Versioning

This sub-specification version track is **independent** of the core `@hex-di/http-client` specification version. A core spec revision does not automatically increment the react sub-spec revision. However, when a core change affects the react integration layer (e.g., a core invariant changes that is referenced in a react invariant's `**Related**` links), the react spec MUST be updated in the same PR.

---

## 3. Change Procedure

All changes follow the Change Request process defined in [`process/change-control.md`](./change-control.md):

| Change Category | Suite Revision Increment | Required Approvals |
| --- | --- | --- |
| Minor (no revalidation) | Patch increment or none | Author + peer review via PR |
| Moderate (targeted review) | Minor increment | Author + Technical Reviewer |
| Major (significant change) | Minor or Major increment | Author + Technical Reviewer + spec author sign-off |

The suite-level revision increment is recorded in `README.md` §Revision History at the time of the change.

---

## 4. Document Integrity Verification

### Traceability Script

```bash
# Run traceability verification:
./spec/libs/http-client/react/scripts/verify-traceability.sh

# Strict mode (fails if package not yet implemented):
./spec/libs/http-client/react/scripts/verify-traceability.sh --strict
```

The script MUST pass on every PR that modifies specification files.

### Cross-Reference Integrity

When modifying a specification file, verify that all internal cross-references remain valid:
- Invariant IDs referenced in other files still exist in `invariants.md`
- FMEA failure mode IDs referenced in `invariants.md` still exist in `risk-assessment.md`
- ADR IDs referenced in invariants and spec sections still exist in `decisions/`
- Test IDs in the traceability matrix match the DoD test tables in `05-definition-of-done.md`
- Core `INV-HC-N` IDs referenced in react invariants' `**Related**` links still exist in [`../invariants.md`](../invariants.md)

---

## 5. Controlled Copy Policy

Organizations maintaining controlled copies of this specification MUST:

1. Identify the document with suite-level revision (e.g. `SPEC-HCR-001 v0.1.0`)
2. Record the source Git commit SHA at the time of copy
3. Supersede copies when a new revision is approved — superseded copies MUST be marked "SUPERSEDED"

Printed copies are considered **uncontrolled** unless stamped with revision and date.

---

## 6. Document Retirement

This sub-specification is retired when `@hex-di/http-client-react` is permanently deprecated. Retired documents transition to "Obsolete" state in `README.md` §Document State Lifecycle. Obsolete documents are retained in Git history but removed from the active specification directory.
