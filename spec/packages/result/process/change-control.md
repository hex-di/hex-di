# Change Control Procedure

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CORE-PRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/change-control.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/change-control.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/change-control.md` |
| Status | Effective |

> For details on how to retrieve approval evidence from Git, see the [Document Version Control Policy](ci-maintenance.md#document-version-control-policy).

## Purpose

This document defines the change control procedure for the `@hex-di/result` core library, covering code changes, specification changes, and configuration changes. It consolidates the change management practices referenced across [test-strategy.md](test-strategy.md), [compliance/gxp.md](../compliance/gxp.md), and [ci-maintenance.md](ci-maintenance.md).

## Change Categories

| Category | Description | Examples | Approval Level | Testing Required |
|----------|-------------|---------|----------------|-----------------|
| **Critical** | Changes that affect GxP-relevant invariant behavior or data integrity guarantees | Fix to `Object.freeze()` logic (INV-1); change to brand validation (INV-3); modification of tee error suppression (INV-5) | PR approval by 2 reviewers (including code owner) | Full regression: unit + type + mutation + Cucumber + GxP integrity + performance |
| **Major** | New capabilities or significant behavioral changes | New combinator method; new factory function; new invariant; new behavior spec | PR approval by 1 reviewer (code owner) | Targeted tests + regression for affected capabilities |
| **Minor** | Clarifications, refactoring, and non-behavioral changes | Documentation updates; internal refactoring with no API change; performance optimization | PR approval by 1 reviewer | Targeted tests for changed modules |
| **Editorial** | Typos, formatting, and cosmetic changes | Fix typo in spec; fix markdown formatting; update example | PR approval by 1 reviewer | None (CI lint/build must pass) |

## Change Process

### 1. Change Identification

Changes originate from:
- **Bug reports** — GitHub issues labeled `bug`
- **Feature requests** — GitHub issues labeled `enhancement`
- **Specification updates** — Updates to behavior specs (01–14), invariants, or ADRs
- **Dependency updates** — TypeScript version compatibility, Node.js version support
- **Risk assessment updates** — New failure modes identified in GxP compliance review

### 2. Change Classification

The change author classifies the change per the categories above. The reviewer may escalate the category during PR review.

**Escalation triggers**:
- Change touches `Object.freeze()` logic in factory functions (`ok()`, `err()`, `some()`, `none()`, `createError()`) → **Critical** (INV-1, INV-7, INV-10)
- Change touches brand symbol validation or type guard logic (`brand.ts`, `guards.ts`) → **Critical** (INV-3, INV-9, INV-11)
- Change touches `andTee()`/`orTee()` error suppression behavior → **Critical** (INV-5, ATR-1)
- Change touches `ResultAsync` internal promise handling → at least **Major** (INV-2)
- Change touches generator protocol (`safeTry`, `Symbol.iterator`) → at least **Major** (INV-4)
- Change touches `UnwrapError` context structure → at least **Major** (INV-12)
- Change adds or modifies an invariant (INV-1 through INV-14) → at least **Major**
- Change modifies the public API surface (new exports, changed signatures) → at least **Major**

### 3. Change Implementation

1. Create a feature branch from `main`
2. Implement the change following the test strategy criteria in [test-strategy.md](test-strategy.md) for the change type
3. Create a changeset via `pnpm changeset`:
   - **Critical/Major** changes: `minor` or `major` version bump
   - **Minor** changes: `patch` version bump
   - **Editorial** changes: no version bump (changeset optional)
4. Write a clear changeset description oriented toward end users

### 4. Change Review (PR Approval)

| Category | Required Reviewers | Additional Checks |
|----------|-------------------|-------------------|
| Critical | 2 reviewers (including code owner) | All CI checks pass; manual review of test coverage |
| Major | 1 reviewer (code owner) | All CI checks pass |
| Minor | 1 reviewer | All CI checks pass |
| Editorial | 1 reviewer | CI lint and build pass |

**PR review checklist** (for Major and Critical changes):
- [ ] Behavior spec updated or created
- [ ] Traceability matrix in [traceability.md](../traceability.md) updated
- [ ] Risk assessment in [risk-assessment.md](../risk-assessment.md) reviewed (if invariants affected)
- [ ] Test coverage meets targets per [test strategy](test-strategy.md)
- [ ] No unintended API surface changes
- [ ] Changeset present with correct version impact

### 5. Change Approval (Merge)

PR merge to `main` constitutes formal approval. The merge commit serves as the approval record:
- **Who approved**: PR reviewer(s) listed in the merge commit
- **When approved**: Merge commit timestamp
- **What was approved**: PR diff and changeset description

#### Change Control ID Mapping

The PR number serves as the change control identifier for this project. When integrating with an external QMS that requires formal change control numbering (e.g., CC-001, CC-002), consumers should map their CC IDs to the corresponding GitHub PR numbers.

**Example mapping**:

| Consumer CC ID | GitHub PR | Category | Description |
|---------------|-----------|----------|-------------|
| CC-2026-001 | hex-di/result#50 | Major | Add Do notation support (BEH-12-001) |
| CC-2026-002 | hex-di/result#65 | Critical | Fix brand validation bypass in ResultAsync |
| CC-2026-003 | hex-di/result#70 | Minor | Update GxP compliance mapping for ATR-2 |

The consumer's QMS should document this mapping in their system-level change control register. The full PR history is retrievable via `gh pr list --state merged --json number,title,mergedAt` or the GitHub web interface.

### 6. Release

Releases follow the changeset-based workflow:
1. Accumulated changesets are collected by `pnpm changeset version`
2. `CHANGELOG.md` is auto-generated from changeset descriptions
3. A release PR is created and reviewed
4. Merge of the release PR triggers `pnpm publish`

### 7. Post-Release Verification

For **Critical** and **Major** changes:
- [ ] Verify the published package version matches the expected version
- [ ] Verify the changelog entry accurately describes the change
- [ ] If the change affects IQ/OQ/PQ-tested behavior, notify consumers to re-execute affected qualification tests

## Regression Testing Policy

| Change Category | Regression Scope |
|----------------|-----------------|
| Critical | Full test suite: unit + type + mutation + Cucumber + GxP integrity + performance |
| Major | Affected capability test suite + mutation tests for changed modules |
| Minor | Changed module unit tests + build verification |
| Editorial | CI lint and build only |

All changes must pass the CI pipeline defined in [ci-maintenance.md](ci-maintenance.md):
- Lint
- Type Check
- Unit Tests
- Type Tests
- Mutation Tests (Stryker)
- Cucumber Acceptance Tests
- GxP Integrity Tests
- Traceability Verification
- Build

## Specification Change Management

Changes to specification documents follow the same PR-based workflow:
1. Specification changes are committed alongside code changes when both are needed
2. Specification-only changes (clarifications, corrections) use the **Minor** or **Editorial** category
3. The traceability matrix in [traceability.md](../traceability.md) is updated when requirements, invariants, or ADRs change
4. The risk assessment in [risk-assessment.md](../risk-assessment.md) is updated when invariant risk classifications change

## Emergency Changes

For urgent defect fixes (e.g., brand validation bypass enabling Result forgery):
1. The standard PR process applies — no shortcuts on review or testing
2. The change is classified as **Critical** regardless of code size
3. A patch version is released as soon as the fix is merged
4. Consumers are notified via the changelog and GitHub release notes

## Periodic Review

The `@hex-di/result` specification and GxP compliance mapping should be reviewed under the following conditions:

### Review Cadence

1. **On each major version release** — Verify that new capabilities or breaking changes do not alter the compliance mapping in [gxp.md](../compliance/gxp.md)
2. **Annually within Q1 of each calendar year (by March 31)** — As part of the consuming organization's periodic system review per EU GMP Annex 11.11. This aligns with the risk assessment re-evaluation cadence. The **project maintainer** (or a designated reviewer) is responsible for initiating the review by opening a PR that updates the GxP compliance document and the risk assessment. If no changes are needed, the review PR should record that the review was performed and no changes were required.

### Review Scope

Each periodic review must cover:
- All 14 invariants (INV-1 through INV-14): verify risk classifications remain accurate
- ALCOA+ compliance mapping: verify feature-to-principle mappings are current
- Residual risk summary (RR-1 through RR-7): verify compensating controls are still adequate
- Audit trail requirements (ATR-1 through ATR-3): verify guidance reflects current patterns
- Data retention requirements (DRR-1 through DRR-5): verify serialization guidance is current
- Training guidance: verify competency assessment questions reflect current API surface

### Review Procedure

1. The maintainer opens a GitHub issue titled "Periodic GxP Review — result [year]" listing the review scope items above
2. The reviewer creates a branch and opens a PR documenting the review findings:
   - For each scope item: confirmation that the mapping is current, or proposed updates with rationale
   - Any new residual risks identified
   - Any invariants that should be reclassified
3. The PR is approved and merged following the **Minor** change category process (or **Major** if risk classifications change)
4. The review date is recorded in the PR description and linked from the GitHub issue

### Review Output

The periodic review produces:
- A merged PR documenting the review (serves as the review record)
- Updated GxP compliance mapping if changes were needed
- Updated risk assessment if reclassifications were needed
- A "no changes required" annotation in the PR if the review identified no gaps
