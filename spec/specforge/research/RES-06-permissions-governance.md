---
id: RES-06
kind: research
title: Research 06 — Permissions and Agent Governance
status: Research
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research 06 — Permissions and Agent Governance

**Depends on:** Claude Code Permissions Model, Claude Code Hooks, Claude Code Settings Hierarchy
**References:** [permissions.md](../references/claude-code/permissions.md), [hooks.md](../references/claude-code/hooks.md), [settings.md](../references/claude-code/settings.md)

---

## Thesis

Claude Code's permission system -- deny/ask/allow rules, managed enterprise policies, sandboxed bash execution, lifecycle hooks -- is not just a safety mechanism. It is an unexploited governance primitive. SpecForge can compose these primitives into a layered agent governance model where every tool invocation is auditable, every agent role has formally bounded capabilities, and trust is not binary but earned through demonstrated reliability.

This document explores twelve concrete product features built on top of Claude Code's permission and sandbox infrastructure, mapped to SpecForge's existing architecture (graph-canonical storage, persistent sessions, flow-based orchestration, GxP compliance).

---

## 1. Role-Based Access Matrix

### The Problem

BEH-SF-081 declares that each agent role has a tool set. BEH-SF-152 maps roles to `--allowedTools`. But these are flat lists. A `reviewer` role can read any file. A `spec-author` can write to any path. There is no directory scoping, no command filtering, no MCP server restriction per role.

### The Feature

A formal access matrix where each role maps to a complete permission profile -- not just tool names, but tool-with-specifier rules:

| Role              | Allow Rules                                                                        | Deny Rules                                             |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `discovery-agent` | `Read(spec/**)`, `Glob`, `Grep`, `WebFetch(domain:*)`                              | `Edit`, `Write`, `Bash`, `Read(.env)`                  |
| `spec-author`     | `Read`, `Write(spec/**)`, `Edit(spec/**)`, `Bash(pnpm lint *)`                     | `Write(src/**)`, `Bash(git push *)`, `Read(.env)`      |
| `dev-agent`       | `Read`, `Write(src/**)`, `Edit(src/**)`, `Bash(pnpm test *)`, `Bash(pnpm build *)` | `Write(spec/**)`, `Bash(git push *)`, `Bash(rm -rf *)` |
| `reviewer`        | `Read(spec/**)`, `Read(src/**)`, `Glob`, `Grep`                                    | `Edit`, `Write`, `Bash`                                |
| `coverage-agent`  | `Read`, `Grep`, `Glob`, `mcp__neo4j__*`                                            | `Edit`, `Write`, `Bash`                                |

### Implementation

The `ClaudeCodeAdapter` already builds `--allowedTools` per role (BEH-SF-152). The extension is to also inject role-specific `permissions.allow` and `permissions.deny` arrays via the `--settings` flag. Claude Code's rule evaluation order (deny > ask > allow) means deny rules are absolute -- a `spec-author` physically cannot write to `src/` even if the LLM hallucinates a Write call to that path.

The access matrix is stored as a graph structure: `(:AgentRole)-[:HAS_PERMISSION]->(:PermissionRule {type: 'allow'|'deny', pattern: 'Write(spec/**)'})`. This makes it queryable ("which roles can write to spec files?") and auditable ("show me all permission changes in the last 30 days").

### Why This Matters

Tool-level scoping (BEH-SF-081) prevents a reviewer from calling `Bash`. Directory-level scoping prevents a `dev-agent` from rewriting spec documents. Command-level scoping prevents any agent from running `git push`. These are different threat surfaces, and the access matrix covers all three.

---

## 2. Progressive Trust Escalation

### The Problem

Today, an agent either has a permission or it does not. A freshly spawned `dev-agent` on its first iteration has the same filesystem write scope as one that has completed 50 successful iterations. There is no concept of earned trust.

### The Feature

A trust score computed per agent session, derived from:

- **Error rate**: ratio of failed tool calls to total calls
- **Convergence velocity**: how quickly the agent's outputs converge toward flow criteria
- **Revert rate**: how often the orchestrator or a human reverts the agent's changes
- **Scope creep**: how often the agent attempts to invoke tools outside its declared set

Trust tiers unlock capability expansion:

| Trust Tier   | Score Range | Unlocked Capabilities                                               |
| ------------ | ----------- | ------------------------------------------------------------------- |
| `restricted` | 0-30        | Base role permissions. Single file per edit. Max-turns capped at 5. |
| `standard`   | 31-70       | Full role permissions. Max-turns per flow config.                   |
| `elevated`   | 71-90       | Extended bash timeout. Access to `additionalDirectories`.           |
| `autonomous` | 91-100      | `acceptEdits` permission mode. Higher max-budget-usd.               |

### Implementation

The orchestrator tracks trust metrics per session via PostToolUse hooks. Each tool completion event carries success/failure metadata (exit code, stderr content). The trust score is a sliding-window computation stored on the `(:AgentSession)` node in the graph.

Before each `sendTask()` call, the adapter recalculates the trust tier and adjusts the injected `--settings` accordingly. A session that starts at `restricted` can graduate to `standard` mid-flow if its first five iterations are error-free.

Demotion is immediate: a single `ProcessCrashError` or three consecutive tool failures drop the session one tier. Promotion requires sustained performance over a configurable window (default: 5 iterations).

### The Graph Model

```
(:AgentSession)-[:HAS_TRUST_SCORE]->(:TrustScore {
  value: 72,
  tier: 'elevated',
  errorRate: 0.03,
  convergenceVelocity: 0.85,
  revertRate: 0.0,
  window: 10,
  computedAt: datetime()
})
```

---

## 3. Sandboxed Execution Environments

### The Problem

In SaaS mode, multiple tenants run agent sessions on shared infrastructure. A malicious or confused agent could exfiltrate data via network calls, exhaust disk with unbounded writes, or interfere with other tenants' processes.

### The Feature

Each agent session runs inside a sandboxed environment with four isolation boundaries:

1. **Filesystem isolation**: The agent sees only its project's working directory plus explicitly granted `additionalDirectories`. All other filesystem paths are invisible.
2. **Network restriction**: `sandbox.network.allowedDomains` limits outbound connections. A `spec-author` can reach `api.anthropic.com` (for LLM calls) and nothing else. A `discovery-agent` can additionally reach domains whitelisted for research.
3. **Process isolation**: Claude Code's `sandbox.enabled: true` plus `sandbox.autoAllowBashIfSandboxed: true` constrains bash commands within the sandbox boundary. In SaaS mode, this is layered with container-level isolation (cgroups, namespaces).
4. **Resource limits**: CPU time, memory, and disk quota per agent session. Enforced at the container level in SaaS, at the process level in solo mode.

### Implementation

The `ClaudeCodeAdapter` injects sandbox configuration via `--settings`:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "network": {
      "allowedDomains": ["api.anthropic.com"]
    }
  },
  "permissions": {
    "defaultMode": "bypassPermissions",
    "additionalDirectories": ["/workspace/project-123"]
  }
}
```

In SaaS mode, the Agent Pool (see deployment-saas.md) wraps each Claude Code subprocess in a lightweight container with:

- Read-only bind mount for the project snapshot
- Writable overlay for agent output
- No network access by default (allowlist per role)
- Memory limit: 512MB per agent (configurable per plan tier)

The `bypassPermissions` mode is safe inside a sandbox because the sandbox itself is the permission boundary. This eliminates interactive permission prompts while maintaining hard isolation -- exactly the pattern Claude Code's documentation recommends for container environments.

### Network Policy Per Role

| Role              | Allowed Domains                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `discovery-agent` | `api.anthropic.com`, `*.github.com`, `*.stackoverflow.com`, user-configured research domains |
| `spec-author`     | `api.anthropic.com`                                                                          |
| `dev-agent`       | `api.anthropic.com`, `registry.npmjs.org` (for dependency resolution)                        |
| `reviewer`        | `api.anthropic.com`                                                                          |
| `gxp-reviewer`    | `api.anthropic.com`                                                                          |

---

## 4. Compliance-Aware Permissions (GxP Mode)

### The Problem

When GxP mode is enabled (BEH-SF-123), the platform already enforces hash chains (BEH-SF-124), audit records (BEH-SF-125), and traceability (BEH-SF-130). But it does not restrict which tools agents can use in GxP context. A `dev-agent` in GxP mode has the same `Bash` access as in normal mode -- it could run `git rebase` and destroy audit history.

### The Feature

GxP activation triggers a permission overlay that restricts agents to a validated tool set:

- **No destructive git operations**: `Bash(git rebase *)`, `Bash(git push --force *)`, `Bash(git reset --hard *)` are denied.
- **No file deletion outside sandbox**: `Bash(rm *)` denied except within build output directories.
- **Mandatory review for spec writes**: `Write(spec/**)` requires human approval gate (hooks exit code 2 until approval recorded).
- **Validated bash commands only**: A whitelist of approved bash commands replaces the general `Bash` allow rule.

### Implementation

When `gxp.enabled: true`, the adapter overlays additional deny rules on every role's permission profile:

```json
{
  "permissions": {
    "deny": [
      "Bash(git rebase *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)",
      "Bash(git clean *)",
      "Bash(rm -rf *)"
    ]
  }
}
```

A PreToolUse hook intercepts `Write` calls targeting spec files and checks the graph for an active approval gate. If no approval exists, the hook returns exit code 2 with a structured reason:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny"
  }
}
```

The denied attempt is recorded as a `(:PermissionDecision {action: 'deny', reason: 'gxp_approval_required'})` node in the graph, linked to the agent session and the target file.

### IQ/OQ/PQ Integration

The GxP permission overlay is itself part of the OQ (Operational Qualification) protocol (BEH-SF-131). The OQ test suite validates that:

- Every deny rule in the GxP overlay actually blocks the corresponding operation
- The approval gate hook correctly blocks and unblocks spec writes
- Permission decisions are recorded in the graph with complete metadata

---

## 5. Managed Enterprise Permissions

### The Problem

Enterprise IT departments need to enforce security policies across all SpecForge installations in their organization. Individual developers should not be able to override security-critical settings.

### The Feature

SpecForge leverages Claude Code's managed settings infrastructure to push organization-wide permission policies:

1. **MDM-deployed policy file**: IT pushes `managed-settings.json` to `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS) or `/etc/claude-code/managed-settings.json` (Linux) via MDM tools (Jamf, Intune, Ansible).

2. **Policy enforcement flags**:
   - `disableBypassPermissionsMode: true` -- prevents developers from running agents without permission checks
   - `allowManagedPermissionRulesOnly: true` -- only IT-defined rules apply; project/user rules ignored
   - `allowManagedHooksOnly: true` -- only IT-approved hooks run
   - `allowManagedMcpServersOnly: true` -- only IT-approved MCP servers connect

3. **Model restrictions**: `availableModels` limits which models agents can use. An organization may restrict to Sonnet for cost control, or require Opus for accuracy-critical GxP workflows.

### Implementation

SpecForge's SaaS mode pushes managed settings via the server-to-agent configuration path. When a server instance spawns an agent, it writes a temporary `managed-settings.json` into the agent's sandbox and passes it via the `--settings` flag with managed priority.

In solo mode, enterprise IT deploys the managed settings file to the standard OS location. Claude Code's settings hierarchy ensures managed settings take precedence over project and user settings.

The SpecForge server exposes an admin API for IT teams to:

- Push policy updates to all active installations (SaaS)
- Generate managed-settings.json files for MDM deployment (solo)
- Audit which installations are running which policy version

### Policy Versioning

Managed policies are versioned in the graph:

```
(:ManagedPolicy {version: 12, deployedAt: datetime(), deployedBy: 'admin@corp.com'})
  -[:CONTAINS]->(:PermissionRule {pattern: 'Bash(git push --force *)', type: 'deny'})
```

Policy changes require admin authentication and produce audit trail nodes, satisfying GxP requirements when enabled.

---

## 6. Per-File Permission Boundaries (Graph-Driven Ownership)

### The Problem

Directory-based rules (feature 1) are coarse. A `dev-agent` working on task group 3 should not modify files belonging to task group 1, even though both are in `src/`. Today nothing prevents cross-task contamination.

### The Feature

Permission boundaries derived from the knowledge graph's ownership relationships. The graph knows which files belong to which task groups, which task groups belong to which requirements, and which agent session is assigned to which task group.

Before each tool invocation, a PreToolUse hook queries the graph:

```cypher
MATCH (session:AgentSession {id: $sessionId})-[:ASSIGNED_TO]->(tg:TaskGroup)-[:OWNS]->(f:File {path: $targetPath})
RETURN f
```

If the query returns no result, the file is outside the agent's ownership boundary and the hook returns exit code 2.

### Implementation

The ownership graph is built during the Task Decomposer phase (BEH-SF-021). When the `task-decomposer` assigns file scopes to task groups, those scopes become `(:TaskGroup)-[:OWNS]->(:File)` relationships. The `dev-agent` session is linked to its assigned task group via `(:AgentSession)-[:ASSIGNED_TO]->(:TaskGroup)`.

The PreToolUse hook for `Edit` and `Write` tools runs a fast graph lookup:

```bash
#!/usr/bin/env bash
# ownership-check.sh -- PreToolUse hook for Edit|Write
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath')

OWNED=$(specforge graph query \
  "MATCH (s:AgentSession {sessionId: '$SESSION_ID'})-[:ASSIGNED_TO]->(:TaskGroup)-[:OWNS]->(:File {path: '$FILE_PATH'}) RETURN count(*) > 0 AS owned" \
  --format json | jq -r '.owned')

if [ "$OWNED" = "false" ]; then
  echo "File $FILE_PATH is outside this agent's ownership boundary" >&2
  exit 2
fi
exit 0
```

### Escape Hatch

Some files are shared (e.g., `package.json`, `tsconfig.json`). These are marked as `(:File {shared: true})` in the graph and exempt from ownership checks. The set of shared files is configurable per flow.

---

## 7. Audit Trail for Permission Decisions

### The Problem

INV-SF-1 guarantees append-only ACP session history. BEH-SF-125 records agent invocations. But neither captures the permission decision layer -- which tools were allowed, which were denied, and why. When a GxP auditor asks "did any agent attempt to write outside its scope?", there is no answer.

### The Feature

Every permission decision -- allow, deny, ask -- is recorded as a first-class graph node:

```
(:PermissionDecision {
  id: 'pd-uuid',
  action: 'deny',
  toolName: 'Write',
  toolInput: '/src/core/index.ts',
  reason: 'outside_ownership_boundary',
  rulePattern: 'Write(spec/**)',
  ruleSource: 'role_matrix',
  timestamp: datetime()
})
  -[:DECIDED_FOR]->(:AgentSession)
  -[:TRIGGERED_BY]->(:PermissionRule)
```

### Implementation

Two hook layers capture decisions:

1. **PreToolUse hooks** (features 4, 6, 8): When a hook blocks a tool call (exit code 2), it also writes a `PermissionDecision` node to the graph via `specforge graph write`.

2. **Claude Code's native permission system**: For decisions made by Claude Code's built-in deny/allow rules (not hooks), the adapter parses stream-json events for tool call outcomes. A tool call that was silently allowed generates an `action: 'allow'` node. A tool call that Claude Code blocked (because of a deny rule) generates an `action: 'deny'` node.

### Query Patterns

GxP auditors and security teams query the permission audit trail:

```cypher
// All denied operations in the last 24 hours
MATCH (pd:PermissionDecision {action: 'deny'})
WHERE pd.timestamp > datetime() - duration('P1D')
RETURN pd.toolName, pd.toolInput, pd.reason, pd.timestamp

// All permission decisions for a specific flow run
MATCH (fr:FlowRun {id: $flowRunId})-[:CONTAINS]->(phase)
  -[:CONTAINS]->(session:AgentSession)<-[:DECIDED_FOR]-(pd:PermissionDecision)
RETURN pd ORDER BY pd.timestamp

// Agents that attempted out-of-scope operations
MATCH (pd:PermissionDecision {action: 'deny', reason: 'outside_ownership_boundary'})
  -[:DECIDED_FOR]->(s:AgentSession)
RETURN s.role, count(pd) AS deniedAttempts ORDER BY deniedAttempts DESC
```

---

## 8. Dynamic Permission Adjustment

### The Problem

Feature 2 (trust escalation) is forward-looking: agents earn more permissions. But what about real-time response to agent misbehavior? If a `dev-agent` starts producing syntax errors in every file it writes, it should not retain full write access while the orchestrator figures out what went wrong.

### The Feature

The orchestrator monitors PostToolUse results and dynamically tightens permissions when anomalies are detected:

| Anomaly Signal                                                         | Response                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 3 consecutive failed bash commands                                     | Revoke `Bash` temporarily; switch to `plan` permission mode for 1 iteration |
| Agent writes a file that fails lint                                    | Add `PostToolUse` lint check hook; require lint pass before next write      |
| Agent attempts to modify a file not in its task scope (2 times)        | Narrow `Write`/`Edit` rules to exact file list from task group              |
| Token usage exceeds 3x the phase average                               | Reduce `max-budget-usd` for next iteration                                  |
| Agent produces identical output on consecutive iterations (stuck loop) | Drop to `restricted` tier; inject a different system prompt                 |

### Implementation

The orchestrator already tracks tool results via PostToolUse hooks (BEH-SF-158). The dynamic adjustment layer sits between the orchestrator and the `ClaudeCodeAdapter`:

1. Orchestrator receives PostToolUse events
2. Anomaly detector evaluates the event against configurable thresholds
3. If threshold breached, orchestrator calls `adapter.updateSessionPermissions(sessionId, newPermissions)`
4. The adapter writes updated `settings.json` to the session's sandbox and passes it on the next `sendTask()` resume

Because Claude Code's `--settings` flag is processed per invocation, the permissions take effect on the very next tool call. There is no window of vulnerability between detection and enforcement.

### Loosening After Recovery

Restrictions are not permanent. After `N` consecutive clean iterations (configurable, default 3), restrictions are lifted one at a time. This creates a natural recovery ramp: the agent gradually regains capabilities as it demonstrates stability.

---

## 9. Multi-Tenant Isolation

### The Problem

SaaS mode (deployment-saas.md) already provides graph namespace isolation and subprocess isolation per tenant. But permission policies are not tenant-scoped. If one organization needs GxP permissions and another does not, the system must support divergent policies on shared infrastructure.

### The Feature

Tenant-scoped permission policies stored in the graph and enforced per agent session:

```
(:Organization {id: 'org-pharma'})-[:HAS_POLICY]->(:PermissionPolicy {
  gxpOverlay: true,
  maxBashTimeout: 30000,
  allowedNetworkDomains: ['api.anthropic.com'],
  restrictedBashPatterns: ['git push --force *', 'rm -rf *'],
  trustEscalationEnabled: true,
  maxTrustTier: 'elevated'  // cannot reach 'autonomous' tier
})

(:Organization {id: 'org-startup'})-[:HAS_POLICY]->(:PermissionPolicy {
  gxpOverlay: false,
  maxBashTimeout: 120000,
  allowedNetworkDomains: ['*'],
  restrictedBashPatterns: [],
  trustEscalationEnabled: false,
  maxTrustTier: 'autonomous'
})
```

### Implementation

When the server spawns an agent for a tenant, it resolves the tenant's `PermissionPolicy` from the graph and merges it with the role-based access matrix. The merge follows deny-wins semantics: if the org policy denies a pattern, it overrides any role-level allow.

The agent subprocess receives the merged policy via `--settings`. The agent never sees the raw org policy -- only the final merged ruleset. This prevents information leakage about the organization's security posture.

### Tenant Policy Admin

Organization admins manage their policy via the Web Dashboard:

- View the current effective permission matrix per role
- Add or remove deny rules
- Toggle GxP overlay
- Set trust escalation ceiling
- Audit permission decision history for their org

Changes are versioned as `(:PolicyVersion)` nodes with before/after snapshots, linked to the admin who made the change.

---

## 10. Git-Integrated Permissions

### The Problem

Permission rules live in SpecForge's configuration. Branch protection rules live in Git. These are disconnected. A `dev-agent` working on a feature branch has the same permissions as one working on `main`, even though pushing to `main` requires a PR review.

### The Feature

Permission rules that adapt based on the git context:

| Git Context                      | Permission Adjustment                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| Working on `main` or `release/*` | Deny all `Write`/`Edit`. Agent operates in read-only analysis mode.         |
| Working on `feature/*`           | Standard role permissions apply.                                            |
| Working on `hotfix/*`            | Elevated permissions (broader bash access) but mandatory human review gate. |
| Uncommitted changes present      | Agent cannot run `Bash(git checkout *)` to prevent losing work.             |
| Ahead of remote by >10 commits   | Warning injected into agent prompt. Permission unchanged.                   |

### Implementation

A `SessionStart` hook queries git state and adjusts permissions:

```bash
#!/usr/bin/env bash
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
case "$BRANCH" in
  main|release/*)
    echo '{"hookSpecificOutput":{"permissionOverrides":{"deny":["Write","Edit","Bash(git *)"]}}}'
    ;;
  hotfix/*)
    echo '{"hookSpecificOutput":{"permissionOverrides":{"requireApproval":["Write(src/**)"]}}}'
    ;;
esac
exit 0
```

The adapter reads the hook output and merges branch-derived permissions with role permissions before spawning the agent.

### PR-Gated Deployment

When a flow produces code changes (Dev Forge phase), the agent creates a branch and opens a PR. The PR's branch protection rules enforce human review. SpecForge tracks the PR node in the graph:

```
(:FlowRun)-[:PRODUCED]->(:PullRequest {number: 42, branch: 'feature/beh-sf-017', status: 'open'})
```

The flow cannot transition to the Verification phase until the PR is merged, creating a natural human-in-the-loop gate that integrates with existing git workflows.

---

## 11. Permission Simulation ("Dry Run")

### The Problem

Before running a flow, the user has no visibility into what permissions agents will request. A `spec-writing` flow might invoke 6 different roles across 4 phases, each with different tool scopes, network access, and bash commands. Surprises mid-flow are expensive (wasted tokens, broken state).

### The Feature

A `--dry-run` mode that simulates flow execution and reports all permission requirements without actually running any agents:

```
$ specforge run spec-writing --dry-run

Permission Simulation for: spec-writing
========================================

Phase 1: Discovery
  Role: discovery-agent
  Tools: Read, Glob, Grep, WebFetch
  Network: api.anthropic.com, *.github.com
  Filesystem: Read-only (spec/**)
  Bash: None
  Estimated tokens: 50k-150k
  Estimated cost: $0.50-$1.50

Phase 2: Spec Forge
  Stage 1 - Scaffold:
    Role: spec-author
    Tools: Read, Write, Edit, Bash
    Network: api.anthropic.com
    Filesystem: Read/Write (spec/**)
    Bash: pnpm lint, pnpm typecheck
    Files created: spec/behaviors/*.md (estimated 5-10)

  Stage 3 - Review:
    Role: reviewer
    Tools: Read, Glob, Grep
    Network: api.anthropic.com
    Filesystem: Read-only
    Bash: None

  [GxP Active] Stage 3 also includes:
    Role: gxp-reviewer
    Additional deny rules: Bash(git rebase *), Bash(git push --force *)
    Approval gates: Write(spec/**) requires human approval

Total estimated cost: $3.00-$8.00
Permission conflicts: None
```

### Implementation

The simulation engine walks the flow definition (BEH-SF-049 through BEH-SF-056), resolves the role for each stage, looks up the access matrix, applies any overlays (GxP, git context, org policy), and produces the report. No LLM calls are made.

The simulation output is also stored in the graph as a `(:SimulationResult)` node, enabling comparison between predicted and actual permission usage after the flow completes.

---

## 12. Blast Radius Analysis

### The Problem

When a human reviews a permission request ("dev-agent wants Bash access"), they lack context about the impact. Will the agent modify 3 files or 300? Will it create new directories? Will it affect shared configuration?

### The Feature

Before granting elevated permissions or before each flow phase begins, SpecForge computes a blast radius -- the maximum set of files, directories, and systems the agent could affect given its current permissions:

```
Blast Radius for: dev-agent (task-group-3)
===========================================

Writable files (owned by task group):
  src/saga/core/src/runtime/runner.ts
  src/saga/core/src/runtime/types.ts
  src/saga/core/tests/runtime.test.ts

Writable shared files:
  package.json (shared)
  tsconfig.json (shared)

Executable commands:
  pnpm test -- --filter @hex-di/saga
  pnpm lint -- --filter @hex-di/saga
  pnpm build

Unreachable (denied):
  spec/** (all spec files)
  src/flow/** (other package)
  .env, .env.local (secrets)
  Bash(git push *), Bash(npm publish *)

Network scope:
  api.anthropic.com only

Maximum token budget: $2.00
Maximum iterations: 5
```

### Implementation

The blast radius is computed from three inputs:

1. **Permission rules**: The merged allow/deny ruleset expands to concrete file paths via glob matching against the actual filesystem.
2. **Ownership graph**: `(:TaskGroup)-[:OWNS]->(:File)` relationships narrow the writable set.
3. **Bash command whitelist**: The set of allowed bash patterns is enumerated.

The computation runs before flow execution and is stored as a `(:BlastRadius)` node:

```
(:AgentSession)-[:HAS_BLAST_RADIUS]->(:BlastRadius {
  writableFiles: ['src/saga/core/src/runtime/runner.ts', ...],
  writableShared: ['package.json'],
  executableCommands: ['pnpm test *', 'pnpm lint *'],
  networkDomains: ['api.anthropic.com'],
  maxBudget: 2.00,
  computedAt: datetime()
})
```

### Blast Radius Diff

When dynamic permission adjustment (feature 8) tightens or loosens permissions, the blast radius is recomputed and a diff is stored:

```
(:BlastRadius)-[:NARROWED_TO]->(:BlastRadius {
  removedFiles: ['src/saga/core/src/runtime/types.ts'],
  reason: 'consecutive_lint_failures'
})
```

This gives auditors a complete timeline of what each agent could have affected at every point during execution.

---

## Cross-Feature Interactions

These features are not independent. They compose into a governance stack:

| Layer        | Feature                   | Enforcement Point               |
| ------------ | ------------------------- | ------------------------------- |
| Enterprise   | 5. Managed Permissions    | MDM / managed-settings.json     |
| Organization | 9. Multi-Tenant Isolation | Server-side policy merge        |
| Compliance   | 4. GxP Permissions        | GxP overlay on spawn            |
| Repository   | 10. Git-Integrated        | SessionStart hook               |
| Role         | 1. Access Matrix          | --settings injection            |
| Session      | 2. Trust Escalation       | Per-iteration recalculation     |
| Real-time    | 8. Dynamic Adjustment     | PostToolUse anomaly detection   |
| File         | 6. Ownership Boundaries   | PreToolUse graph query          |
| Audit        | 7. Decision Trail         | All layers write to graph       |
| Preview      | 11. Simulation            | Pre-execution analysis          |
| Impact       | 12. Blast Radius          | Pre-execution + post-adjustment |

Each layer is independently toggleable. A solo-mode developer uses features 1, 2, and 7. An enterprise GxP team uses all twelve. The permission system degrades gracefully -- removing a layer widens the blast radius but never breaks the system.

---

## Open Questions

1. **Hook latency**: PreToolUse hooks that query Neo4j (feature 6) add latency to every tool call. Is the graph query fast enough (<50ms), or do we need an in-memory permission cache with graph-backed invalidation?

2. **Trust score calibration**: What are the right thresholds for trust tiers? Should they be configurable per organization, or should SpecForge ship opinionated defaults?

3. **Permission inheritance for forked sessions**: When a session is forked (BEH-SF-153), does the fork inherit the parent's trust score? Or does it start at `restricted`?

4. **Conflict resolution in multi-layer merge**: When enterprise policy allows `Bash(npm *)` but GxP overlay denies `Bash(npm publish *)`, does the deny-wins rule apply cleanly across all layers?

5. **Offline mode**: In solo mode without Neo4j running, ownership-based permissions (feature 6) cannot query the graph. Should permissions fall back to role-level only, or should the flow refuse to start?
