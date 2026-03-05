---
id: PLG-gxp
kind: plugin
title: GxP Compliance Plugin
status: active
activation: plugin configuration
plugin_type: extension
behaviors_added:
  [
    BEH-SF-370,
    BEH-SF-371,
    BEH-SF-372,
    BEH-SF-373,
    BEH-SF-374,
    BEH-SF-375,
    BEH-SF-376,
    BEH-SF-377,
    BEH-SF-378,
    BEH-SF-379,
  ]
---

# GxP Compliance Plugin

- **Activation:** `gxp.enabled: true` in `.specforge/config.json` or `--gxp` CLI flag
- **Provided Agent Roles:** `gxp-reviewer` (validates regulatory compliance)
- **Required Hooks:** Pre-phase (audit trail), Post-phase (hash chain validation)
- **Plugin Type:** On-demand (not active by default)

---

## BEH-SF-370: GxP Activation — Config Toggle, Available in All Modes, No Tier Restriction

GxP compliance mode is activated via `gxp.enabled: true` in `.specforge/config.json` or the `--gxp` CLI flag. It is available in all deployment modes (solo, team, SaaS) with no billing tier restriction.

### Contract

REQUIREMENT (BEH-SF-370): GxP mode MUST be activatable via `gxp.enabled: true` in configuration or `--gxp` CLI flag. GxP mode MUST be available in all deployment modes (solo, SaaS) and MUST NOT be gated by any billing tier. When disabled (default), SpecForge MUST operate as a standard platform with no regulatory overhead. Activation MUST enable all GxP sub-features (BEH-SF-371 through BEH-SF-379).

### Verification

- Activation test: enable GxP in config; verify all GxP features are active.
- CLI test: use `--gxp` flag; verify GxP is enabled for that flow run.
- All modes test: enable GxP in solo and SaaS; verify it works in both.
- No tier test: enable GxP on the free SaaS tier; verify it is not blocked.
- Disabled test: with `gxp.enabled: false`; verify no GxP features are active.

---

## BEH-SF-371: Audit Trail Hash Chain — Every ACP Session Event Linked for Tamper Detection

When GxP mode is enabled, every ACP session event is linked in a cryptographic hash chain. Each event's hash includes the previous event's hash, enabling tamper detection across the entire event sequence.

### Contract

REQUIREMENT (BEH-SF-371): When GxP mode is enabled, each ACP session event MUST include a cryptographic hash that chains to the previous event's hash (forming a hash chain). Any modification to a historical event MUST be detectable by verifying the hash chain. When GxP is disabled, events MUST be recorded but without the hash chain computation.

### Verification

- Hash chain test: emit 10 events; verify each event's hash includes the previous event's hash.
- Tamper detection test: modify a historical event; verify the hash chain validation detects the tampering.
- Disabled test: with GxP off, verify events are recorded without hash chain properties.

---

## BEH-SF-372: Agent Invocation Records — Full Input/Output/Model/Tokens/Timestamp Record

When GxP mode is enabled, every agent invocation produces a full audit record including the complete input prompt, output response, model used, token counts, and timestamp.

### Contract

REQUIREMENT (BEH-SF-372): When GxP mode is enabled, the system MUST record for every agent invocation: (a) complete input prompt, (b) complete output response, (c) model identifier, (d) input/output token counts, (e) invocation timestamp, (f) session ID and agent role. Records MUST be stored in the graph. When GxP is disabled, only token tracking (no full audit) MUST be performed.

### Verification

- Record completeness test: make an agent invocation in GxP mode; verify all fields are recorded.
- Storage test: verify invocation records are stored as graph nodes.
- Disabled test: make an invocation with GxP off; verify only token tracking occurs (no full input/output).

---

## BEH-SF-373: User Identity Tracking — All Actions Attributed to Authenticated User

When GxP mode is enabled, all actions (flow runs, message exchange writes, graph mutations, approvals) are attributed to the authenticated user identity.

### Contract

REQUIREMENT (BEH-SF-373): When GxP mode is enabled, every graph mutation and ACP session event MUST carry the `userId` of the authenticated user who initiated or approved the action. In solo mode with GxP, the default local identity MUST be used. When GxP is disabled, no user identity tracking MUST be enforced.

### Verification

- Attribution test: perform actions in GxP mode; verify each carries a `userId`.
- Solo test: enable GxP in solo mode; verify the default local identity is attributed.
- Disabled test: perform actions with GxP off; verify no `userId` tracking is enforced.

---

## BEH-SF-374: Data Retention Policies — Configurable Retention for Sessions, Graph, Docs

When GxP mode is enabled, data retention policies are enforced for session data, graph nodes, and rendered documents. Retention periods are configurable per data type.

### Contract

REQUIREMENT (BEH-SF-374): When GxP mode is enabled, the system MUST enforce configurable retention policies specifying minimum retention periods for: (a) session archives, (b) graph node history (soft deletes, not hard deletes), (c) rendered document versions. Data within the retention period MUST NOT be deletable. When GxP is disabled, no retention enforcement MUST be applied.

### Verification

- Retention test: configure a 90-day retention; attempt to delete data within the period; verify it is rejected.
- Soft delete test: verify graph nodes are soft-deleted (not hard-deleted) in GxP mode.
- Configuration test: change retention periods; verify the new periods are enforced.
- Disabled test: with GxP off; verify data can be deleted without retention checks.

---

## BEH-SF-375: Document Governance — Version Control with Approval Workflows

When GxP mode is enabled, document governance requires approval workflows for spec document changes. Changes require explicit approval from designated reviewers, with change justification recorded.

### Contract

REQUIREMENT (BEH-SF-375): When GxP mode is enabled, the system MUST require approval workflows for spec document changes: (a) each change MUST include a change justification, (b) designated reviewers MUST explicitly approve changes, (c) approval records (approver identity, timestamp, justification) MUST be stored in the graph. When GxP is disabled, simple versioning MUST be used without approval requirements.

### Verification

- Approval test: modify a document in GxP mode; verify approval is required before the change is finalized.
- Justification test: verify each change includes a recorded justification.
- Record test: verify approval records are stored in the graph with user identity and timestamp.
- Disabled test: with GxP off; verify documents can be modified without approval workflows.

---

## BEH-SF-376: FMEA Risk Analysis — Failure Mode Analysis in Review Phases

When GxP mode is enabled, Failure Mode and Effects Analysis (FMEA) is integrated into review phases. The `gxp-reviewer` agent identifies failure modes, assesses severity and detectability, and computes Risk Priority Numbers (RPN).

### Contract

REQUIREMENT (BEH-SF-376): When GxP mode is enabled, the review phases MUST include FMEA analysis: (a) `FailureMode` nodes are created in the graph with `severity`, `detectability`, and `rpn` properties, (b) the `gxp-reviewer` agent MUST identify potential failure modes in the spec, (c) each failure mode MUST be linked to affected requirements via `MITIGATES` relationships. When GxP is disabled, no FMEA analysis MUST occur.

### Verification

- FMEA node test: run a review phase in GxP mode; verify `FailureMode` nodes are created.
- RPN test: verify `rpn` (Risk Priority Number) is computed from severity and detectability.
- Relationship test: verify failure modes are linked to requirements.
- Disabled test: run a review phase with GxP off; verify no `FailureMode` nodes are created.

---

## BEH-SF-377: Traceability Enforcement — Hard Enforcement, Flows Cannot Complete with Gaps

When GxP mode is enabled, traceability is hard-enforced: flows cannot complete if traceability gaps exist (requirements without tasks, tasks without code, code without tests). In non-GxP mode, gaps are reported as findings but do not block flow completion.

### Contract

REQUIREMENT (BEH-SF-377): When GxP mode is enabled, the system MUST check for traceability gaps at the Verification phase. If gaps exist, the flow MUST NOT be marked as `completed` — it MUST fail with traceability gap findings. When GxP is disabled, traceability gaps MUST be reported as findings but MUST NOT prevent flow completion.

### Verification

- Hard enforcement test: enable GxP; create a requirement without a task; attempt to complete the flow; verify it fails.
- Soft enforcement test: disable GxP; create the same gap; verify the flow completes with a warning finding.
- No gaps test: ensure complete traceability in GxP mode; verify the flow completes successfully.

---

## BEH-SF-378: Validation Protocols — IQ/OQ/PQ Qualification

When GxP mode is enabled, the system supports IQ (Installation Qualification), OQ (Operational Qualification), and PQ (Performance Qualification) validation protocols for regulated environments.

### Contract

REQUIREMENT (BEH-SF-378): When GxP mode is enabled, the system MUST support IQ/OQ/PQ qualification protocols: (a) IQ validates that SpecForge is correctly installed and configured, (b) OQ validates that flows, agents, and graph operations work correctly, (c) PQ validates that the system performs adequately under realistic conditions. Protocol results MUST be stored in the graph and exportable as compliance documents.

### Verification

- IQ test: run installation qualification; verify the system validates configuration, Neo4j connectivity, and Claude Code availability.
- OQ test: run operational qualification; verify core flows execute correctly.
- PQ test: run performance qualification; verify the system handles realistic workloads.
- Export test: verify qualification results are exportable as compliance documents.

---

## BEH-SF-379: GxP Reviewer Agent — Participates in Review Phases when GxP Enabled

The `gxp-reviewer` agent is only active when GxP mode is enabled. It participates in review phases (Stage 3 of Spec Forge), evaluating specs for regulatory compliance, identifying compliance gaps, regulatory risks, and missing controls.

### Contract

REQUIREMENT (BEH-SF-379): When GxP mode is enabled, the `gxp-reviewer` agent MUST be included in the review stages of applicable flows (e.g., Stage 3 of Spec Forge). The agent MUST produce findings related to regulatory compliance, risk assessment, and control adequacy. When GxP is disabled, the `gxp-reviewer` agent MUST NOT be activated in any flow.

### Verification

- Active test: enable GxP; run the Spec Forge flow; verify `gxp-reviewer` participates in the review stage.
- Finding test: verify the GxP reviewer produces compliance-related findings.
- Inactive test: disable GxP; run the same flow; verify `gxp-reviewer` does not participate.
- Model test: verify `gxp-reviewer` uses the `opus` model.
