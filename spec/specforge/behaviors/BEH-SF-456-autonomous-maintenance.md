---
id: BEH-SF-456
kind: behavior
title: Autonomous Maintenance
status: active
id_range: 456--463
invariants: [INV-SF-2, INV-SF-7]
adrs: [ADR-005]
types: [flow]
ports: [MaintenancePort]
---

# 60 — Autonomous Maintenance

**Feature:** [FEAT-SF-034](../features/FEAT-SF-034-autonomous-maintenance.md)

---

## BEH-SF-456: Drift-Triggered Auto-Update — Configure Drift Threshold for Automatic Maintenance

When specification drift exceeds a configurable threshold, the system automatically initiates a maintenance flow to propose corrections. This reactive mode catches drift as it happens rather than waiting for scheduled audits.

### Contract

REQUIREMENT (BEH-SF-456): `MaintenancePort.setDriftThreshold(projectId, threshold)` MUST configure the drift score (0–100) that triggers automatic maintenance. When `AnalyticsPort.predictDrift()` reports a node's drift confidence exceeding the threshold, the system MUST automatically create a maintenance run targeting that node. The maintenance run MUST produce a spec update proposal (BEH-SF-457). Only one maintenance run per node MAY be active at a time — subsequent drift triggers for a node with an active run MUST be queued. The threshold MUST be retrievable via `MaintenancePort.getDriftThreshold(projectId)`.

### Verification

- Trigger test: set threshold to 0.8; report drift confidence 0.85; verify maintenance run is created.
- Below threshold test: set threshold to 0.8; report drift confidence 0.7; verify no maintenance run.
- Dedup test: trigger two drift events for the same node; verify only one active maintenance run.

---

## BEH-SF-457: Spec Update Proposal Generation — Create Proposals with Rationale

The maintenance flow analyzes the drifted specification and generates an update proposal containing the spec diff, change rationale, and confidence score. Proposals are presented for human review before application.

### Contract

REQUIREMENT (BEH-SF-457): When a maintenance run completes, it MUST produce a `SpecUpdateProposal` containing `proposalId`, `targetNodeId`, `diff` (unified diff format), `rationale` (string explaining why the change is needed), `confidence` (0–1), `triggerSource` ("drift-detection", "scheduled-audit", or "production-anomaly"), and `status` ("pending-review"). Proposals MUST be stored persistently and retrievable via `MaintenancePort.getProposal(proposalId)`. The proposal MUST NOT be applied automatically — it MUST wait for human approval (BEH-SF-459).

### Verification

- Proposal generation test: trigger a maintenance run; verify a `SpecUpdateProposal` is created with all required fields.
- Persistence test: generate a proposal; retrieve it by ID; verify all fields match.
- No auto-apply test: generate a proposal; verify the target spec is not modified until approval.

---

## BEH-SF-458: Draft PR Creation — Generate Pull Requests for Spec Changes

Approved proposals are materialized as draft pull requests in the project's version control system. The PR contains the spec diff, rationale as description, and links to the originating maintenance run.

### Contract

REQUIREMENT (BEH-SF-458): When a proposal is approved, `MaintenancePort.createDraftPR(proposalId)` MUST create a draft pull request in the configured VCS. The PR MUST include the spec diff as file changes, the rationale as the PR description, a link to the proposal and maintenance run, and the label "autonomous-maintenance". The PR MUST be created as a draft (not ready for review) to allow human inspection before merge. The PR URL MUST be stored on the proposal record.

### Verification

- PR creation test: approve a proposal; call `createDraftPR`; verify a draft PR is created with correct content.
- Label test: verify the PR has the "autonomous-maintenance" label.
- Link test: verify the PR description links back to the proposal and maintenance run.

---

## BEH-SF-459: Human Approval Gate — Require Human Approval Before Merge

All autonomous maintenance changes require explicit human approval before they are applied. The approval gate prevents autonomous systems from making unchecked modifications to specifications.

### Contract

REQUIREMENT (BEH-SF-459): `MaintenancePort.approveProposal(proposalId, approverId)` MUST transition the proposal status from "pending-review" to "approved". `MaintenancePort.rejectProposal(proposalId, approverId, reason)` MUST transition to "rejected" with the rejection reason recorded. Only proposals in "pending-review" status MAY be approved or rejected — other transitions MUST return `InvalidStateTransitionError`. The `approverId` MUST be a valid authenticated user identity. Approval MUST be recorded in the audit trail (BEH-SF-463).

### Verification

- Approve test: approve a pending proposal; verify status transitions to "approved".
- Reject test: reject a pending proposal; verify status transitions to "rejected" with reason.
- Invalid transition test: attempt to approve an already-approved proposal; verify `InvalidStateTransitionError`.
- Audit test: approve a proposal; verify the audit trail contains the approval event.

---

## BEH-SF-460: Proactive Specification — Trigger Maintenance from Change Velocity

When code change velocity in a module exceeds a threshold, the system proactively generates specification updates even before drift is detected. This anticipatory mode keeps specs ahead of rapid development.

### Contract

REQUIREMENT (BEH-SF-460): `MaintenancePort.setVelocityThreshold(projectId, changesPerDay)` MUST configure the change velocity threshold. When a module's rolling 7-day average of daily code changes exceeds the threshold, the system MUST create a proactive maintenance run with `triggerSource: "velocity-threshold"`. The maintenance run MUST analyze recent changes and propose spec updates that reflect the new code state. Proactive runs MUST be subject to the same approval gate (BEH-SF-459) as drift-triggered runs.

### Verification

- Velocity trigger test: set threshold to 5 changes/day; generate 8 changes/day for 7 days; verify maintenance run is created.
- Below threshold test: set threshold to 5; generate 3 changes/day; verify no maintenance run.
- Approval gate test: verify proactive proposals require human approval.

---

## BEH-SF-461: Scheduled Audit Triggers — Run Maintenance on a Schedule

Maintenance can be triggered on a recurring schedule (daily, weekly, or custom cron) to ensure regular spec hygiene regardless of drift or velocity signals.

### Contract

REQUIREMENT (BEH-SF-461): `MaintenancePort.setSchedule(projectId, schedule)` MUST configure a recurring maintenance trigger. `schedule` MUST accept "daily", "weekly", or a cron expression (5-field format). Each scheduled trigger MUST create a maintenance run with `triggerSource: "scheduled-audit"` that analyzes the entire project for potential spec updates. Scheduled runs MUST be skipped if an active maintenance run already exists for the project (to prevent overlapping runs). Schedules MUST be retrievable via `MaintenancePort.getSchedule(projectId)`.

### Verification

- Daily schedule test: set daily schedule; advance time by 24 hours; verify a maintenance run is created.
- Overlap prevention test: start a maintenance run; trigger the schedule; verify the scheduled run is skipped.
- Cron test: set a custom cron expression; verify it fires at the correct times.

---

## BEH-SF-462: Production Anomaly Trigger — Create Proposals from Runtime Anomalies

Production monitoring anomalies (error rate spikes, performance degradation, behavioral deviations) can trigger maintenance proposals targeting the affected specifications.

### Contract

REQUIREMENT (BEH-SF-462): `MaintenancePort.reportAnomaly(projectId, anomaly)` MUST create a maintenance run with `triggerSource: "production-anomaly"`. The `anomaly` object MUST include `type` ("error-spike", "performance-degradation", "behavioral-deviation"), `affectedModules` (array of module IDs), `evidence` (structured data supporting the anomaly), and `severity` ("low", "medium", "high", "critical"). The maintenance run MUST prioritize analysis of the affected modules and MUST include the anomaly evidence in the proposal's rationale.

### Verification

- Anomaly trigger test: report an anomaly; verify a maintenance run is created with correct trigger source.
- Module targeting test: report an anomaly affecting 2 modules; verify the maintenance run targets those modules.
- Evidence propagation test: report an anomaly with evidence; verify the proposal rationale references the evidence.

---

## BEH-SF-463: Autonomous Maintenance Audit Trail — Record All Maintenance Actions

Every autonomous maintenance action is recorded in an append-only audit trail: triggers, proposals, approvals, rejections, PR creations, and merges. The audit trail provides full traceability for compliance and debugging.

### Contract

REQUIREMENT (BEH-SF-463): All maintenance operations MUST append an entry to the audit trail. Each entry MUST include `timestamp` (ISO 8601), `action` (string: "trigger", "proposal-created", "approved", "rejected", "pr-created", "merged"), `actorId` (system or user identity), `proposalId` (if applicable), and `metadata` (action-specific details). The audit trail MUST be append-only — entries MUST NOT be modified or deleted. `MaintenancePort.getAuditTrail(projectId, filter?)` MUST return entries matching the optional filter (by action type, date range, or actor).

### Verification

- Trail completeness test: execute a full maintenance cycle (trigger→proposal→approve→PR→merge); verify 5 audit entries.
- Append-only test: attempt to delete an audit entry; verify it is rejected.
- Filter test: retrieve entries filtered by action type "approved"; verify only approval entries are returned.
