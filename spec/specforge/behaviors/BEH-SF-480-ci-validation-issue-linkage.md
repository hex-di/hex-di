---
id: BEH-SF-480
kind: behavior
title: CI Validation & Issue/PR Linkage
status: active
id_range: 480--487
invariants: [INV-SF-37]
adrs: [ADR-026, ADR-005]
types: [tracking]
ports: [CIValidationPort, IssueLinkagePort]
---

# CI Validation & Issue/PR Linkage

## BEH-SF-480: `specforge check` CLI — Structural Integrity Validation

> **Invariant:** [INV-SF-37](../invariants/INV-SF-37-ci-check-determinism.md) — CI Check Determinism

`specforge check` is a CLI command that validates the structural integrity of the spec: all IDs are unique, all cross-references resolve, all required fields are present, and the graph schema is valid. It produces a deterministic `CICheckResult` with exit code 0 (pass) or 1 (failure).

### Contract

REQUIREMENT (BEH-SF-480): When `specforge check` is executed, the system MUST validate: (1) all BEH-SF, INV-SF, ADR, FEAT-SF, and TYPE-SF IDs are unique, (2) all cross-references (invariant refs, type refs, ADR refs) resolve to existing concepts, (3) all frontmatter fields conform to their schemas, (4) no orphan nodes exist in the graph. The command MUST return exit code 0 if all checks pass, exit code 1 if any check fails. The output MUST include a `checksum` of the input state for CI caching.

### Verification

- Unit test: run `check` on a valid spec; verify exit code 0 and empty violations.
- Unit test: introduce a duplicate BEH-SF ID; verify exit code 1 and violation reported.
- Unit test: introduce a broken cross-reference; verify exit code 1 and violation reported.
- Determinism test: run `check` twice on the same spec; verify identical output and checksum.

---

## BEH-SF-481: CI Coverage Gate — Minimum Threshold Enforcement

> **Invariant:** [INV-SF-37](../invariants/INV-SF-37-ci-check-determinism.md) — CI Check Determinism

`CIValidationPort.checkCoverageGate(gate)` validates that the spec's test coverage meets or exceeds the configured minimum thresholds. This check is designed to run in CI pipelines to prevent merging PRs that reduce coverage below the threshold.

### Contract

REQUIREMENT (BEH-SF-481): When `CIValidationPort.checkCoverageGate(gate)` is called, the system MUST compute the aggregate coverage score and branch coverage across all behaviors (excluding patterns in `gate.excludePatterns`). If `coverageScore < gate.minCoverageScore` or `branchCoverage < gate.minBranchCoverage`, the check MUST fail with a violation listing the actual vs. required scores. The gate MUST be configurable via `.specforge/ci-config.json`.

### Verification

- Unit test: coverage at 0.85 with threshold 0.80; verify check passes.
- Unit test: coverage at 0.75 with threshold 0.80; verify check fails with violation.
- Unit test: exclude a low-coverage behavior via `excludePatterns`; verify it is excluded from the aggregate.

---

## BEH-SF-482: CI Completeness Gate — Required Invariant References

> **Invariant:** [INV-SF-37](../invariants/INV-SF-37-ci-check-determinism.md) — CI Check Determinism

`CIValidationPort.checkCompletenessGate(gate)` validates that all behaviors have the required cross-references (invariant refs, type refs, ADR refs) as configured in the completeness gate. This prevents merging specs with missing traceability links.

### Contract

REQUIREMENT (BEH-SF-482): When `CIValidationPort.checkCompletenessGate(gate)` is called, the system MUST check that every behavior has at least one invariant reference (if `gate.requireInvariantRefs` is true), at least one type reference (if `gate.requireTypeRefs` is true), and at least one ADR reference (if `gate.requireAdrRefs` is true). Behaviors missing required references MUST be reported as violations.

### Verification

- Unit test: all behaviors have invariant refs with `requireInvariantRefs: true`; verify check passes.
- Unit test: one behavior missing invariant ref with `requireInvariantRefs: true`; verify violation reported.
- Unit test: `requireInvariantRefs: false`; verify missing refs are not flagged.

---

## BEH-SF-483: GitHub Issue Linkage — `TRACKED_BY` Edges

> **Invariant:** [INV-SF-37](../invariants/INV-SF-37-ci-check-determinism.md) — CI Check Determinism

`IssueLinkagePort.linkIssue(behaviorId, issueUrl)` creates a `TRACKED_BY` edge from a behavior node to an `Issue` node in the graph. The issue metadata (title, state, labels) is fetched from the GitHub API and stored on the node.

### Contract

REQUIREMENT (BEH-SF-483): When `IssueLinkagePort.linkIssue(behaviorId, issueUrl)` is called, the system MUST validate the issue URL format, fetch the issue metadata from the GitHub API, create an `Issue` node with `issueId`, `url`, `title`, `state`, and `labels`, and create a `TRACKED_BY` edge from the behavior to the issue. If the issue cannot be fetched, the system MUST return `IssueNotFoundError`. Duplicate linkages MUST be idempotent.

### Verification

- Unit test: link a behavior to a valid GitHub issue; verify `TRACKED_BY` edge and `Issue` node are created.
- Unit test: link to a non-existent issue; verify `IssueNotFoundError` is returned.
- Idempotency test: link the same behavior-issue pair twice; verify only one edge exists.

---

## BEH-SF-484: GitHub PR Linkage — `IMPLEMENTED_VIA` Edges

`IssueLinkagePort.linkPullRequest(behaviorId, prUrl)` creates an `IMPLEMENTED_VIA` edge from a behavior node to a `PullRequest` node in the graph. The PR metadata (title, state, target branch) is fetched from the GitHub API and stored on the node.

### Contract

REQUIREMENT (BEH-SF-484): When `IssueLinkagePort.linkPullRequest(behaviorId, prUrl)` is called, the system MUST validate the PR URL format, fetch the PR metadata from the GitHub API, create a `PullRequest` node with `prId`, `url`, `title`, `state`, and `targetBranch`, and create an `IMPLEMENTED_VIA` edge from the behavior to the PR. If the PR cannot be fetched, the system MUST return an error. Duplicate linkages MUST be idempotent.

### Verification

- Unit test: link a behavior to a valid GitHub PR; verify `IMPLEMENTED_VIA` edge and `PullRequest` node are created.
- Unit test: link to a non-existent PR; verify error is returned.
- Idempotency test: link the same behavior-PR pair twice; verify only one edge exists.

---

## BEH-SF-485: Issue/PR Sync — Periodic State Refresh from GitHub API

`IssueLinkagePort.syncWorkItems()` refreshes the metadata of all `Issue` and `PullRequest` nodes by fetching their current state from the GitHub API. This detects closed issues, merged PRs, and label changes since the last sync.

### Contract

REQUIREMENT (BEH-SF-485): When `IssueLinkagePort.syncWorkItems()` is called, the system MUST iterate over all `Issue` and `PullRequest` nodes in the graph, fetch their current metadata from the GitHub API, and update the node properties (`state`, `title`, `labels`). The `lastSyncedAt` timestamp MUST be updated on each node. Failed API calls for individual items MUST be logged but MUST NOT abort the sync of remaining items.

### Verification

- Unit test: sync issues after one was closed on GitHub; verify node `state` is updated to `closed`.
- Unit test: sync PRs after one was merged; verify node `state` is updated to `merged`.
- Resilience test: one API call fails; verify other items are still synced and the failure is logged.

---

## BEH-SF-486: CI GitHub Integration — Check Run Status on PRs

> **Invariant:** [INV-SF-37](../invariants/INV-SF-37-ci-check-determinism.md) — CI Check Determinism

`CIValidationPort.reportCheckRun(prUrl, result)` posts a GitHub Check Run to a pull request with the results of `specforge check`. This provides inline CI feedback on the PR without requiring a separate CI job for spec validation.

### Contract

REQUIREMENT (BEH-SF-486): When `CIValidationPort.reportCheckRun(prUrl, result)` is called, the system MUST create a GitHub Check Run on the PR's head commit with status `success` (if `result.passed`) or `failure` (if not). The check run summary MUST include the violation count, coverage score, and completeness score. Individual violations MUST be reported as annotations on the check run.

### Verification

- Unit test: report a passing check; verify GitHub Check Run with `success` status is created.
- Unit test: report a failing check with 3 violations; verify Check Run with `failure` status and 3 annotations.
- Integration test: run `specforge check` and report to a real PR; verify the check appears on the PR.

---

## BEH-SF-487: Behavior-to-Work-Item Traceability Query

`IssueLinkagePort.traceabilityReport(behaviorId)` returns a `WorkItemTraceabilityReport` showing all issues and PRs linked to a behavior, and whether the behavior is fully tracked (has both issue and PR linkage).

### Contract

REQUIREMENT (BEH-SF-487): When `IssueLinkagePort.traceabilityReport(behaviorId)` is called, the system MUST return a `WorkItemTraceabilityReport` containing all `Issue` nodes linked via `TRACKED_BY` and all `PullRequest` nodes linked via `IMPLEMENTED_VIA`. The `fullyTracked` field MUST be `true` only if at least one issue AND at least one PR are linked. A behavior with no work item links MUST return empty arrays and `fullyTracked: false`.

### Verification

- Unit test: behavior linked to 1 issue and 1 PR; verify `fullyTracked: true`.
- Unit test: behavior linked to 1 issue but no PR; verify `fullyTracked: false`.
- Unit test: behavior with no links; verify empty arrays and `fullyTracked: false`.

---
