---
id: BEH-SF-201
kind: behavior
title: Permission Governance
status: active
id_range: "201--208"
invariants: [INV-SF-16]
adrs: [ADR-011]
types: [audit, audit]
ports: [PermissionPolicyPort, ToolRegistryPort]
---

# 28 — Permission Governance

## BEH-SF-201: Role-Based Access Matrix — Directory Scoping and Command Filtering

Each agent role has a defined access matrix specifying which directories it can read/write and which commands it can execute.

### Contract

REQUIREMENT (BEH-SF-201): The system MUST enforce a role-based access matrix. Each role MUST declare: readable directories (glob patterns), writable directories (glob patterns), executable commands (command prefixes), and denied commands (explicit blocklist). The access matrix MUST be evaluated by PreToolUse compliance gates (BEH-SF-162). Violations MUST be blocked with exit code 2 and a `PermissionDecision` with `_tag: 'Denied'` MUST be recorded. The matrix MUST be configurable via `.specforge/permissions.json` and overridable by plugins and GxP mode.

### Verification

- Read access test: attempt to read from an allowed directory; verify success.
- Write block test: attempt to write to a denied directory; verify the write is blocked.
- Command block test: attempt a denied command; verify it is blocked.
- Override test: enable a plugin that grants additional permissions; verify the override applies.
- Decision recording test: verify `PermissionDecision` nodes are created for all decisions.

---

## BEH-SF-202: Progressive Trust Escalation — Restricted to Autonomous Tiers

> **Invariant:** [INV-SF-16](../invariants/INV-SF-16-permission-escalation-requires-explicit-grant.md) — Permission Escalation Requires Explicit Grant

Agents earn capabilities over time through demonstrated reliability, progressing through four trust tiers.

### Contract

REQUIREMENT (BEH-SF-202): The system MUST implement four trust tiers: `restricted` (read-only, no external tools), `standard` (read/write within assigned scope), `elevated` (cross-scope access, external tool usage), `autonomous` (self-directed with minimal oversight). New agents MUST start at `restricted`. Tier promotion MUST require: N consecutive clean iterations (configurable, default 3) with no anomalies detected by BEH-SF-167. Tier promotion MUST be recorded as a `PermissionDecision` with `_tag: 'Allowed'` and the `layer: 'real-time'`. Demotion MUST occur on any anomaly detection, reverting one tier. No agent MUST acquire elevated or autonomous permissions without an explicit recorded `PermissionDecision`.

### Verification

- Initial tier test: spawn a new agent; verify it starts at `restricted`.
- Promotion test: complete 3 clean iterations; verify promotion to `standard`.
- Demotion test: trigger an anomaly; verify demotion by one tier.
- Decision recording test: verify all promotions and demotions create `PermissionDecision` nodes.
- No implicit escalation test: verify no agent reaches `elevated` without explicit decision.

---

## BEH-SF-203: Sandboxed Execution — Filesystem, Network, Process, Resource Isolation

Agent sessions run in sandboxed environments with configurable isolation boundaries.

### Contract

REQUIREMENT (BEH-SF-203): The system MUST support four isolation dimensions: (a) filesystem — agents MUST only access paths within their assigned scope, (b) network — agents MUST only access allowed domains (configurable allowlist), (c) process — agents MUST NOT spawn subprocesses outside their allowed command list, (d) resource — agents MUST respect memory and CPU limits (configurable per role). Isolation MUST be enforced by the `ClaudeCodeAdapter` via permission mode configuration and PreToolUse gates. Isolation violations MUST be blocked and recorded as `PermissionDecision` nodes.

### Verification

- Filesystem test: attempt to access a file outside scope; verify it is blocked.
- Network test: attempt to access a denied domain; verify it is blocked.
- Process test: attempt to spawn a denied subprocess; verify it is blocked.
- Resource test: exceed memory limits; verify the agent is constrained.
- Recording test: verify all isolation violations create `PermissionDecision` nodes.

---

## BEH-SF-204: GxP Permission Overlay — Destructive Git Ops Blocked, Mandatory Review Gates

In GxP mode, additional permission constraints enforce regulatory compliance.

### Contract

REQUIREMENT (BEH-SF-204): When GxP mode is active, the permission system MUST additionally: (a) block all destructive git operations (`push --force`, `reset --hard`, `branch -D`, `rebase` on shared branches), (b) require approval gates before phase transitions (all phases, not just configured ones), (c) enforce dual-control for spec file modifications (author cannot self-approve), (d) block deletion of any spec file without explicit approval. GxP permissions MUST be layered on top of role-based permissions (BEH-SF-201) — they can restrict but never expand role permissions. GxP violations MUST produce `AuditRecord` nodes with severity `critical`.

### Verification

- Git block test: enable GxP; attempt `git push --force`; verify it is blocked.
- Approval gate test: enable GxP; verify all phases require approval before transitioning.
- Dual-control test: attempt self-approval; verify it is rejected.
- Deletion test: attempt to delete a spec file; verify approval is required.
- Layering test: verify GxP restrictions apply on top of role permissions, not replacing them.

---

## BEH-SF-205: Per-File Permission Boundaries — Graph-Driven Ownership via Task Assignment

File ownership is determined by the knowledge graph's task-to-file assignment, creating automatic per-file permission boundaries.

### Contract

REQUIREMENT (BEH-SF-205): When a task is assigned to an agent (via `ASSIGNED_TO` graph edge), the system MUST grant the agent write access to files referenced by the task (via `TRACES_TO` edges to source file nodes). Write access to files not referenced by any assigned task MUST require explicit `elevated` trust tier. File ownership MUST be dynamic — as tasks are completed and new tasks assigned, permissions update automatically. The system MUST log all graph-driven permission grants as `PermissionDecision` nodes.

### Verification

- Ownership test: assign a task referencing `src/foo.ts`; verify the agent can write to it.
- Boundary test: attempt to write to an unassigned file; verify it requires elevated trust.
- Dynamic test: complete a task; assign a new one; verify permissions update.
- Logging test: verify graph-driven grants produce `PermissionDecision` nodes.

---

## BEH-SF-206: Dynamic Permission Adjustment — Anomaly Detection Triggers Tightening

When the behavior monitor (BEH-SF-167) detects anomalies, the permission system automatically tightens the agent's permissions.

### Contract

REQUIREMENT (BEH-SF-206): When the `BehaviorMonitor` reports an anomaly for an agent session, the permission system MUST: (a) demote the agent's trust tier by one level (per BEH-SF-202), (b) restrict the agent's writable directories to only currently assigned task files, (c) add the anomaly type to a session-level restriction list. After N consecutive clean iterations (configurable, default 5), restrictions from the anomaly MUST be lifted one at a time. Restriction changes MUST be recorded as `PermissionDecision` nodes. The agent MUST receive stderr feedback explaining the restriction.

### Verification

- Tightening test: trigger an anomaly; verify trust tier demotion and directory restriction.
- Restriction list test: trigger multiple anomaly types; verify all are recorded in the restriction list.
- Recovery test: complete 5 clean iterations; verify one restriction is lifted.
- Feedback test: verify the agent receives stderr explanation of the restriction.
- Decision recording test: verify all adjustments create `PermissionDecision` nodes.

---

## BEH-SF-207: Permission Simulation / Dry-Run — Preview Without LLM Calls

`specforge estimate --permissions` walks the flow definition and produces a permission report without making any LLM calls.

### Contract

REQUIREMENT (BEH-SF-207): `specforge estimate --permissions` MUST walk the entire flow definition, resolve which agent roles appear in which stages, apply all permission overlays (role matrix, GxP, plugin overrides, trust tiers), and produce a report showing: writable files per role, executable commands per role, denied paths per role, MCP servers per role, max budget allocation, and estimated iterations. The simulation MUST NOT make any LLM calls (zero cost). The simulation MUST use the current project graph state for permission resolution. Output MUST be in a tabular format.

### Verification

- Simulation test: run `specforge estimate --permissions` on a flow; verify the report is produced.
- Zero-cost test: verify no LLM calls are made during simulation.
- Overlay test: enable GxP mode; run simulation; verify GxP restrictions appear in the report.
- Completeness test: verify all roles in the flow appear in the report with their permission sets.

---

## BEH-SF-208: Blast Radius Analysis — Maximum Impact Scope Computation

Before granting elevated permissions, the system computes the blast radius — the maximum impact scope of the requested action.

### Contract

REQUIREMENT (BEH-SF-208): When an agent requests access outside its current permission boundary (trust tier promotion to `elevated` or `autonomous`), the system MUST compute a `BlastRadiusReport` including: affected files (transitive closure from the target path via graph relationships), affected behaviors (BEH-SF linked to affected files), affected tests (test files covering affected behaviors), and an impact score (0-100 based on scope size and criticality). If the impact score exceeds a configurable threshold (default 50), the promotion MUST require human approval. The `BlastRadiusReport` MUST be stored as a graph node linked to the `PermissionDecision`.

### Verification

- Computation test: request elevated access for a critical file; verify blast radius is computed.
- Transitive closure test: verify affected files include transitively linked files.
- Threshold test: compute a high-impact blast radius; verify human approval is required.
- Low-impact test: compute a low-impact blast radius; verify automatic approval.
- Storage test: verify the `BlastRadiusReport` is stored as a graph node.
