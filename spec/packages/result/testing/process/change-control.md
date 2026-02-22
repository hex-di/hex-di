---
document_id: SPEC-RT-PROC-003
title: "Change Control"
version: "1.2.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Process Document
parent_spec: "spec/packages/result/testing/overview.md"
approval_history:
  - role: Author
    name: hex-di
    date: 2026-02-15
  - role: Technical Reviewer
    name: hex-di
    date: 2026-02-15
  - role: QA Reviewer
    name: hex-di
    date: 2026-02-15
compensating_controls:
  - "CI pipeline enforces >95% line coverage and >90% branch coverage gates"
  - "Type-level tests (vitest typecheck) verify all public API contracts"
  - "Traceability verification script blocks PRs with orphaned specs or tests"
  - "All changes require PR merge to main with passing CI"
segregation_of_duties_note: >
  Single-contributor project. Author, Technical Reviewer, and QA Reviewer
  roles are held by the same individual. Compensating controls above
  provide automated independent verification. This constraint is accepted
  per ICH Q9 risk-based approach for a GAMP 5 testing utility library.
revision_history:
  - version: "1.2.0"
    date: 2026-02-15T17:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: linked Incident Identification to central Incident Registry per Finding 3 (EU Annex 11 §13)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Incident Identification subsection with INC-RT-NNN scheme per Finding 2 (EU Annex 11 §13)"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version — created to address GxP spec review Finding 2 (no formal change control process)"
---

# Change Control

Change management process for the `@hex-di/result-testing` specification suite and implementation, per EU Annex 11 §10. This is a lightweight process proportionate to a single-contributor testing utility library per ICH Q9 risk-based approach.

## Change Categories

| Category | Description | Examples | Approval Required | Testing Required |
|----------|-------------|----------|-------------------|------------------|
| **Critical** | Impacts GxP test utility correctness (BEH-T04) or changes a High-risk behavior | Modifying `expectFrozen` logic, changing brand verification algorithm | Author + CI gates | Full regression + GxP self-tests |
| **Major** | Adds new public API, changes Medium-risk behavior, or modifies specification structure | New matcher, new assertion helper, new behavior spec file | Author + CI gates | Full regression |
| **Minor** | Clarifications, documentation improvements, Low-risk behavior changes | Glossary additions, error message wording, ADR updates | Author + CI gates | Targeted tests for affected area |
| **Editorial** | Typos, formatting, non-functional spec corrections | Fixing markdown formatting, correcting cross-reference links | Author | None (CI still runs) |

## Change Proposal

All changes to the specification or implementation follow the same workflow:

1. **Identify change** — Author determines the change category using the table above
2. **Create branch** — A feature branch is created from `main`
3. **Implement change** — Code and/or specification modifications are made
4. **Impact assessment** — Author evaluates impact using the checklist below
5. **Create PR** — Pull request submitted to `main`
6. **CI verification** — All CI gates must pass (unit tests, type tests, coverage, build, traceability)
7. **Merge** — PR merged to `main` after CI passes

### Impact Assessment Checklist

Before submitting a PR, the author evaluates:

- [ ] **Risk classification change?** — Does this change affect the risk level of any behavior group in `overview.md`?
- [ ] **Traceability impact?** — Do new behaviors need forward/backward traceability entries in `traceability.md`?
- [ ] **Parent invariant coverage?** — Does this change affect coverage of `@hex-di/result` invariants?
- [ ] **Public API surface change?** — Do the API tables in `overview.md` need updating?
- [ ] **Peer dependency impact?** — Does this change require updating `@hex-di/result` or `vitest` version ranges?
- [ ] **GxP utility affected?** — If BEH-T04 is affected, are both genuine and forged input tests updated?
- [ ] **Residual risk table?** — Does a new High-risk behavior require a new RR-T entry?

## Version Numbering

### Specification Documents

Specification document versions use `Major.Minor.Patch` format:

| Component | When Incremented | Examples |
|-----------|-----------------|----------|
| **Major** | Breaking restructure, fundamental approach change | Removing a behavior group, restructuring spec hierarchy |
| **Minor** | New content, substantive changes, GxP remediation | Adding a behavior section, adding a process document |
| **Patch** | Clarifications, editorial fixes, ID corrections | Standardizing document IDs, fixing cross-references |

### NPM Package

NPM package versions follow semantic versioning independently from spec versions (see `overview.md` version note).

## Changeset Requirement

Every change that affects the NPM package must include a changeset file created via `pnpm changeset`:

| Change Category | Semantic Version Impact |
|----------------|------------------------|
| Critical | Major (if breaking) or Patch (if bug fix) |
| Major | Minor (new feature) or Major (breaking change) |
| Minor | Patch |
| Editorial | No changeset required (spec-only change) |

## Regression Testing Requirements

| Change Category | Regression Scope |
|----------------|-----------------|
| Critical | Full test suite (`*.test.ts` + `*.test-d.ts`) + GxP self-tests verified manually |
| Major | Full test suite |
| Minor | Targeted tests for affected behavior group |
| Editorial | CI runs full suite automatically; no manual verification |

## Configuration Management

All specification and implementation artifacts are managed in the git repository (`https://github.com/hex-di/hex-di.git`):

- **Branching**: Feature branches from `main`; all merges via PR
- **Tagging**: NPM releases are tagged in git (`@hex-di/result-testing@<version>`)
- **Diff capability**: `git diff` between any two specification versions
- **Access control**: GitHub repository permissions control write access
- **Audit trail**: Git commit history with author, date, and message for every change

## Emergency Changes

In the event of a critical defect in a GxP test utility (BEH-T04) that produces false positives:

1. Hotfix branch created from `main`
2. Fix implemented with regression test
3. All CI gates must still pass — no expedited bypass
4. PR merged and patch release published immediately
5. Incident documented in the relevant spec file's revision history with explicit reference to the defect

### Incident Identification

Incidents are assigned a unique identifier following the format `INC-RT-NNN` (e.g., `INC-RT-001`),
incrementing sequentially. All incidents are recorded in the [Incident Registry](../incidents.md).
The incident ID is referenced in:

- The [Incident Registry](../incidents.md) (central record of all incidents)
- The git commit message (e.g., `fix(gxp): INC-RT-001 — false positive in expectFrozen`)
- The PR title or description
- The revision history entry of affected spec files

**Rationale**: The CI gates are the primary verification mechanism. Bypassing them would remove the compensating controls that offset the single-contributor constraint. There is no "emergency bypass" that skips CI.
