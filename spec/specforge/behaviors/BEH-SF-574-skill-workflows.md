---
id: BEH-SF-574
kind: behavior
title: Skill Workflows
status: active
id_range: 574--581
invariants: [INV-SF-7, INV-SF-12, INV-SF-43]
adrs: [ADR-025, ADR-007]
types: [skill, flow]
ports: [SkillWorkflowPort]
---

# 48 — Skill Workflows

**ADRs:** [ADR-025](../decisions/ADR-025-skill-registry-architecture.md), [ADR-007](../decisions/ADR-007-flow-based-orchestration.md)

---

## BEH-SF-574: Workflow Definition

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-dag-integrity.md) — DAG Integrity

A skill workflow is an ordered sequence of skill steps with conditions and parameters. Each step references a skill and specifies execution conditions (when to run), input parameters (runtime configuration), and failure behavior (continue, abort, or retry).

### Contract

REQUIREMENT (BEH-SF-574): `SkillWorkflowPort.createWorkflow(input)` MUST create a `SkillWorkflow` with a unique `id`, `name`, `description`, `visibility` (default `"private"`), and an ordered `steps` array. Each `WorkflowStep` MUST have `stepId` (unique within the workflow), `skillId` (reference to an existing `Skill`), `order` (integer position), `condition` (optional SpEL expression evaluated at runtime), `parameters` (key-value map passed to the skill), and `onFailure` (`"continue"` | `"abort"` | `"retry"`). `SkillWorkflowPort.updateWorkflow(id, patch)` MUST support reordering steps, adding/removing steps, and updating step parameters. `SkillWorkflowPort.deleteWorkflow(id)` MUST remove the workflow and all its step nodes. `SkillWorkflowPort.getWorkflow(id)` MUST return the full workflow with all steps ordered by `order`.

### Verification

- Unit test: `createWorkflow` produces a workflow with correct properties
- Unit test: Steps are stored with correct order positions
- Unit test: Each step references an existing skill (validation)
- Unit test: `updateWorkflow` supports reordering steps
- Unit test: `deleteWorkflow` removes the workflow and all steps
- Unit test: `getWorkflow` returns steps in order

---

## BEH-SF-575: Workflow Validation

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-dag-integrity.md) — DAG Integrity

Before a workflow can be executed, it MUST pass validation checks: all skill references resolve, step order is contiguous, conditions parse correctly, and skill dependencies are satisfied by prior steps.

### Contract

REQUIREMENT (BEH-SF-575): `SkillWorkflowPort.validateWorkflow(workflowId)` MUST perform the following checks: (1) Every `skillId` in the workflow steps MUST reference an existing `Skill` — missing references produce `WorkflowBrokenReferenceError`. (2) Step `order` values MUST be contiguous starting from 1 — gaps produce `WorkflowOrderGapError`. (3) If a step's skill has `DEPENDS_ON` edges, all dependencies MUST appear in earlier steps (lower `order`) — unmet dependencies produce `WorkflowDependencyOrderError`. (4) Step `condition` expressions MUST parse as valid SpEL — invalid expressions produce `WorkflowConditionParseError`. (5) Validation MUST return a `WorkflowValidationResult` with `valid: boolean` and an `errors` array. A workflow with any errors MUST NOT be executable.

### Verification

- Unit test: Missing skill reference produces `WorkflowBrokenReferenceError`
- Unit test: Non-contiguous order produces `WorkflowOrderGapError`
- Unit test: Unmet skill dependency produces `WorkflowDependencyOrderError`
- Unit test: Invalid condition expression produces `WorkflowConditionParseError`
- Unit test: Valid workflow returns `valid: true` with empty errors
- Unit test: Workflow with errors cannot be executed

---

## BEH-SF-576: Workflow Execution Engine

> **Invariant:** [INV-SF-12](../invariants/INV-SF-12-flow-execution-determinism.md) — Flow Execution Determinism

The workflow execution engine processes steps in order, evaluating conditions, applying skills, and handling failures according to the step's `onFailure` policy.

### Contract

REQUIREMENT (BEH-SF-576): `SkillWorkflowPort.executeWorkflow(workflowId, context)` MUST execute each step in `order` sequence. For each step: (1) Evaluate the `condition` expression against the `context`; if `false`, skip the step and record `status: "skipped"`. (2) Resolve the referenced skill's content and parameters. (3) Apply the skill to the current agent session context. (4) Record the step result: `status` (`"completed"` | `"failed"` | `"skipped"`), `duration`, `tokenUsage`, and `error` (if failed). (5) On failure, apply `onFailure` policy: `"continue"` proceeds to the next step, `"abort"` stops the workflow and returns `WorkflowAbortedError`, `"retry"` re-executes the step up to 3 times with exponential backoff. The execution MUST return a `WorkflowRun` with `runId`, `workflowId`, `startedAt`, `completedAt`, `status`, and per-step results. Execution MUST be idempotent within a run (re-executing the same `runId` resumes from the last incomplete step).

### Verification

- Unit test: Steps execute in order
- Unit test: Condition `false` skips the step with `status: "skipped"`
- Unit test: `onFailure: "continue"` proceeds after step failure
- Unit test: `onFailure: "abort"` stops the workflow
- Unit test: `onFailure: "retry"` retries up to 3 times
- Unit test: `WorkflowRun` contains per-step results with duration and token usage
- Unit test: Resumed execution skips completed steps

---

## BEH-SF-577: Workflow Visibility Scoping

> **Invariant:** None

Workflows have visibility scopes that control who can discover, view, and clone them: `private` (creator only), `project` (team members), and `public` (all SpecForge users).

### Contract

REQUIREMENT (BEH-SF-577): Each `SkillWorkflow` MUST have a `visibility` property set to `"private"`, `"project"`, or `"public"`. `SkillWorkflowPort.setVisibility(workflowId, visibility)` MUST update the visibility scope. Only the workflow creator MUST be able to change visibility. `private` workflows MUST be visible only to the creator. `project` workflows MUST be visible to all members of the project. `public` workflows MUST be visible to all authenticated users and appear in the workflow gallery. `SkillWorkflowPort.listWorkflows(scope)` MUST filter results based on the requesting user's access: return all `private` workflows owned by the user, all `project` workflows in the user's projects, and all `public` workflows. Changing visibility from `public` to `private` MUST NOT affect existing clones.

### Verification

- Unit test: `private` workflow is not visible to other users
- Unit test: `project` workflow is visible to team members
- Unit test: `public` workflow is visible to all authenticated users
- Unit test: Only the creator can change visibility
- Unit test: `listWorkflows` filters correctly based on access
- Unit test: Downgrading visibility does not affect existing clones

---

## BEH-SF-578: Workflow Discovery and Clone

> **Invariant:** None

Users can browse a searchable gallery of public and project workflows, and clone workflows to create their own editable copies.

### Contract

REQUIREMENT (BEH-SF-578): `SkillWorkflowPort.discoverWorkflows(query)` MUST return workflows matching the search criteria from the workflow gallery. The query MUST support full-text search on `name` and `description`, filtering by `visibility`, and sorting by `cloneCount` or `createdAt`. Results MUST include `cloneCount` (number of times cloned) and `creator` metadata. `SkillWorkflowPort.cloneWorkflow(workflowId)` MUST create a deep copy of the workflow with a new `id`, `visibility: "private"`, and `clonedFrom` referencing the source workflow ID. The clone MUST copy all steps, parameters, and conditions. Skills referenced by steps MUST NOT be cloned (steps reference existing skills by `skillId`). If a referenced skill does not exist in the target project, the clone MUST still succeed but the workflow MUST fail validation (BEH-SF-575) until the missing skills are imported.

### Verification

- Unit test: `discoverWorkflows` returns only accessible workflows
- Unit test: Full-text search matches name and description
- Unit test: `cloneWorkflow` creates a deep copy with new `id`
- Unit test: Clone has `visibility: "private"` and `clonedFrom` reference
- Unit test: Clone increments `cloneCount` on the source workflow
- Unit test: Clone with missing skill references succeeds but fails validation

---

## BEH-SF-579: Workflow Execution Monitoring

> **Invariant:** None

Running workflows emit real-time progress events via WebSocket, including per-step status changes, token usage, and timing information.

### Contract

REQUIREMENT (BEH-SF-579): During workflow execution, the system MUST emit WebSocket events for each step transition: `workflow:step:started` (with `stepId`, `skillName`), `workflow:step:completed` (with `stepId`, `duration`, `tokenUsage`), `workflow:step:failed` (with `stepId`, `error`), and `workflow:step:skipped` (with `stepId`, `reason`). A `workflow:run:started` event MUST be emitted when execution begins with the total step count. A `workflow:run:completed` event MUST be emitted when execution finishes with aggregate `duration`, `totalTokens`, and `status`. The dashboard MUST render a step-by-step progress indicator showing completed (green), running (blue pulse), pending (gray), skipped (yellow), and failed (red) states. `SkillWorkflowPort.getRunStatus(runId)` MUST return the current state of a running or completed workflow execution.

### Verification

- Unit test: `workflow:step:started` event is emitted for each step
- Unit test: `workflow:step:completed` includes duration and token usage
- Unit test: `workflow:run:completed` includes aggregate metrics
- Unit test: `getRunStatus` returns current progress during execution
- Unit test: `getRunStatus` returns final state after completion
- Integration test: WebSocket client receives all events in order

---

## BEH-SF-580: Workflow Template Library

> **Invariant:** None

SpecForge ships with predefined workflow templates that users can instantiate and customize. Templates provide starting points for common skill orchestration patterns.

### Contract

REQUIREMENT (BEH-SF-580): The system MUST ship with at least 4 predefined workflow templates: `security-review` (skills: vulnerability scanning, dependency audit, OWASP checklist), `onboarding` (skills: codebase analysis, convention extraction, documentation generation), `compliance-check` (skills: GxP compliance, audit trail verification, regulation mapping), and `code-quality` (skills: linting rules, test coverage analysis, architectural conformance). Each template MUST have `id`, `name`, `description`, `category`, and a `steps` array with placeholder skill references. `SkillWorkflowPort.listTemplates()` MUST return all available templates. `SkillWorkflowPort.instantiateTemplate(templateId, overrides)` MUST create a new `SkillWorkflow` from the template, allowing step overrides (replace skill references, modify parameters, add/remove steps). Templates MUST be immutable — users modify the instantiated workflow, not the template.

### Verification

- Unit test: `listTemplates()` returns at least 4 templates
- Unit test: Each template has `security-review`, `onboarding`, `compliance-check`, `code-quality`
- Unit test: `instantiateTemplate` creates a new workflow from the template
- Unit test: Step overrides replace skill references correctly
- Unit test: Templates are immutable (no mutation operations)
- Unit test: Instantiated workflow is independent of the template

---

## BEH-SF-581: Workflow Versioning and Rollback

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Workflows maintain a version history tracking changes to step configuration. Users can view the history and restore a previous version.

### Contract

REQUIREMENT (BEH-SF-581): When `SkillWorkflowPort.updateWorkflow()` modifies the `steps` array (add, remove, reorder, or change step parameters), the system MUST create a `WorkflowVersion` node linked to the workflow via `HAS_VERSION`. The `WorkflowVersion` MUST contain `version` (monotonically increasing integer), `steps` (snapshot of the steps array), `createdAt`, and `createdBy`. `SkillWorkflowPort.getWorkflowVersionHistory(workflowId)` MUST return all versions ordered by `version` descending. `SkillWorkflowPort.rollbackWorkflow(workflowId, version)` MUST restore the workflow's `steps` array from the specified version snapshot and create a new version entry recording the rollback. Non-step changes (e.g., `name`, `description`, `visibility`) MUST NOT create version entries.

### Verification

- Unit test: Modifying steps creates a `WorkflowVersion` node
- Unit test: Changing only `name` does not create a version
- Unit test: `getWorkflowVersionHistory` returns versions in descending order
- Unit test: `rollbackWorkflow` restores steps from the specified version
- Unit test: Rollback creates a new version entry
- Unit test: Version numbers are monotonically increasing
