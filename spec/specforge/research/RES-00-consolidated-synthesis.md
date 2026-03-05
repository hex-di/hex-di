---
id: RES-00
kind: research
title: SpecForge Research Synthesis
status: Consolidated synthesis — actionable roadmap
date: 2026-02-27
outcome: adr
related_adr: ADR-011
---

# SpecForge Research Synthesis

---

## 1. Executive Summary

Ten research documents explored how Claude Code's capabilities — hooks, sessions, subagents, MCP servers, structured output, permissions, model routing, and agent teams — can transform SpecForge from a spec-authoring tool into an autonomous specification platform. The strongest signal across all research: **session composition combined with a Neo4j knowledge graph creates a compounding knowledge advantage** where run 100 dramatically outperforms run 1. The second strongest signal: **Claude Code hooks are an unexploited governance primitive** enabling real-time graph sync, compliance gates, cost optimization, and audit trails without modifying agent code. The third: **role-adaptive model routing** can cut costs 40%+ with no convergence penalty. Four architectural breakthroughs emerged — dual-memory architecture (graph + CLAUDE.md), structured output pipelines replacing text extraction, dynamic agent role factories, and a layered permission governance stack. The research collectively identifies ~120 concrete features, of which the top 20 below would deliver 80% of the product value. The critical path is: hooks infrastructure (Phase 0) → session composition + structured output (Phase 1) → cost optimization + dynamic agents (Phase 2) → agent teams + marketplace (Phase 3).

---

## 2. Top 20 Product Enhancements (Ranked)

### Rank 1: Real-Time Knowledge Graph Sync via Hooks

- **Source:** 02 (Capability 1), 03 (Feature 1)
- **Impact:** Critical — without this, the graph is always stale; with it, every file mutation is reflected in Neo4j within milliseconds
- **Feasibility:** Medium — requires PostToolUse hook parsing `tool_input`, computing content hashes, issuing Cypher `MERGE`, and extracting requirement IDs via regex
- **Claude Code Capability:** `PostToolUse` hooks on `Edit|Write|Bash` with exit code 0 and async graph write via FIFO
- **Description:** Every file write by any agent triggers a hook that upserts the corresponding Neo4j node, computes SHA-256 content hash, and creates `CONTAINS` edges for detected requirement IDs. This makes the knowledge graph a live mirror of the codebase rather than a periodic snapshot. Without this, all downstream features (drift detection, convergence queries, session composition) operate on stale data.
- **Spec Changes Required:** New behavior BEH-SF-161+ for graph sync hooks. Update `architecture/c3-knowledge-graph.md` with `ContentHash` property. New ADR for hook-as-event-bus pattern. Update `behaviors/BEH-SF-009-session-materialization.md` for real-time materialization.

### Rank 2: Session Composition Engine

- **Source:** 07 (Patterns 1, 4), 10 (Top #1 Feature), 03 (Features 1, 7)
- **Impact:** Critical — creates the compounding knowledge advantage that is SpecForge's core moat
- **Feasibility:** Hard — requires Neo4j vector index for embeddings, ranking algorithm, token budget assembly, and `--append-system-prompt` injection
- **Claude Code Capability:** `--append-system-prompt`, `--resume`, `--fork-session`, session chunk persistence
- **Description:** Queries Neo4j for prior session chunks, ranks by semantic similarity + recency + graph relationship proximity, assembles within token budgets, and injects as structured context. Creates a closed loop: agents produce work → materialized as chunks → composed into future sessions → agents produce better work. The "intelligence flywheel."
- **Spec Changes Required:** Expand `behaviors/BEH-SF-009-session-materialization.md` significantly. New behaviors for composition ranking algorithm. Update `architecture/dynamic-session-composition.md` with vector index strategy. New type definitions in `types/agent.md` for `ComposedContext`, `ChunkRanking`.

### Rank 3: Schema-Validated Agent Outputs

- **Source:** 04 (Capabilities 1, 2, 5, 10)
- **Impact:** Critical — eliminates fragile regex/LLM post-processing; agents produce graph nodes directly
- **Feasibility:** Medium — Claude Code `--json-schema` flag handles validation; requires per-role schema definitions
- **Claude Code Capability:** `--json-schema` flag, `--output-format stream-json`
- **Description:** Replace text extraction with JSON schema validation. Each agent role gets a constrained schema: discovery agents produce `Requirement` and `Tag` nodes, spec-authors produce `SpecFile` nodes, reviewers produce `Finding` nodes. Output includes `graphNodes[]`, `graphEdges[]`, `findings[]`, `errors[]`, and `selfAssessment` with confidence scores. Eliminates the entire parsing layer.
- **Spec Changes Required:** New `types/structured-output.md` with per-role schemas. Update all 8 agent role definitions in `behaviors/BEH-SF-017-agent-roles.md`. New ADR for JSON-first architecture. Update `behaviors/BEH-SF-151-claude-code-adapter.md` (BEH-SF-155 through BEH-SF-159) for structured output handling.

### Rank 4: Role-Adaptive Model Routing

- **Source:** 08 (Feature 1), 10 (Multi-Model Routing)
- **Impact:** High — 40%+ cost reduction per flow run with no convergence penalty
- **Feasibility:** Easy — deterministic mapping table, no ML required
- **Claude Code Capability:** `--model` flag with opus/sonnet/haiku aliases per agent spawn
- **Description:** Replace coarse flow-level model selection with per-stage, per-role, per-iteration routing. Discovery agents use Opus (planning), feedback synthesizers use Haiku (simple aggregation), dev-agent repair cycles use Sonnet. Convergence-responsive escalation: if `PhaseMetrics.criticalFindings` stalls, escalate from medium→high effort. Cuts all-Opus ~$8/iteration to ~$4.50.
- **Spec Changes Required:** New `RoleModelMapping` type in `types/flow.md`. Update `behaviors/BEH-SF-073-token-budgeting.md` with model routing strategy. New `ModelRoutingStrategy` enum: `fixed`, `escalating`, `role-adaptive`. Update `behaviors/BEH-SF-057-flow-execution.md` for per-stage model selection.

### Rank 5: Compliance Gates via PreToolUse Hooks

- **Source:** 02 (Capability 2), 06 (Features 4, 7)
- **Impact:** High — blocks non-compliant writes before execution; critical for GxP plugin
- **Feasibility:** Easy — shell script checking document sections, requirement ID format, traceability annotations; exit code 2 blocks tool
- **Claude Code Capability:** `PreToolUse` hooks with exit code 2 (block) and stderr feedback to agent
- **Description:** Before any `Write` or `Edit` to spec files, a hook validates: required sections present (Intended Use, Risk Assessment), requirement IDs follow scheme (BEH-SF-NNN), traceability annotations reference valid graph nodes. In GxP mode, additionally blocks destructive git operations and mandates review gates. Creates compliance-by-construction rather than compliance-by-review.
- **Spec Changes Required:** Update `plugins/PLG-gxp.md` with hook-based enforcement. New behaviors for compliance gate lifecycle. Update `behaviors/BEH-SF-081-tool-isolation.md` with PreToolUse gate pattern. New `types/hooks.md` for hook pipeline definitions.

### Rank 6: Budget-Aware Orchestration

- **Source:** 08 (Feature 4), 10 (Token Budget Enforcement)
- **Impact:** High — prevents cost overruns, the #1 user concern
- **Feasibility:** Medium — four budget zones (Green/Yellow/Orange/Red) with progressive degradation rules
- **Claude Code Capability:** `--max-budget-usd` hard cap, `stream-json` token metadata
- **Description:** Four-zone adaptive degradation. Green (>60% budget remaining): normal operation. Yellow (30-60%): downgrade non-critical agents to Haiku, reduce effort. Orange (10-30%): all agents to Sonnet, minimal iterations. Red (<10%): essential stages only, "budget critical" prompt injection. Emits `budget-zone-transition` events. System economizes before hitting hard limit rather than crashing.
- **Spec Changes Required:** New `BudgetPolicy` and `BudgetZone` types in `types/flow.md`. Update `behaviors/BEH-SF-073-token-budgeting.md` with zone transition logic. New behaviors for degradation rules per zone. Update `behaviors/BEH-SF-057-flow-execution.md` for budget-responsive scheduling.

### Rank 7: Cost Prediction Engine (`specforge estimate`)

- **Source:** 08 (Feature 3), 10 (Token Budget Enforcement)
- **Impact:** High — users need cost visibility before committing to a flow run
- **Feasibility:** Medium — formula-based estimator combining role base tokens + codebase size + historical data
- **Claude Code Capability:** Token tracking from `stream-json`, historical cost data in Neo4j
- **Description:** `specforge estimate` computes predicted cost per phase with token ranges and cost ranges. Formula: `flow_cost = sum(phase_estimates)`, `phase_estimate = avg_iterations * sum(stage_estimates)`, `stage_estimate = model_cost * estimated_tokens`. Compares against historical runs of similar codebase size. Output: tabular estimate with confidence intervals.
- **Spec Changes Required:** New `PricingConfig` and `CostEstimate` types. New CLI command behavior in `behaviors/BEH-SF-113-cli.md`. New `specforge estimate` section.

### Rank 8: Agent Behavior Monitoring and Auto-Correction

- **Source:** 02 (Capability 4), 06 (Feature 8)
- **Impact:** High — catches role drift, loops, stalls, and scope creep in real-time
- **Feasibility:** Medium — four monitoring sub-features via PostToolUse hooks with rolling window state
- **Claude Code Capability:** `PostToolUse` hooks with state files in `.specforge/hook-state/`
- **Description:** Four monitors: (a) role drift detection blocks reviewer from using `Write/Edit`, (b) loop detection identifies repetitive read patterns via rolling window, (c) progress stall detection counts meta-commentary without artifact creation, (d) scope creep detection blocks files outside project root. Anomalies trigger permission tightening (Feature 8 from research 06): consecutive failures revoke tool access, restrictions lift after N clean iterations.
- **Spec Changes Required:** Update `behaviors/BEH-SF-081-tool-isolation.md` with behavioral monitoring. New `types/monitoring.md` for `AgentBehaviorMetric` types. Update `behaviors/BEH-SF-025-agent-sessions.md` with auto-correction lifecycle.

### Rank 9: Graph-Backed CLAUDE.md Generation

- **Source:** 03 (Feature 1, 2)
- **Impact:** High — automatically propagates architectural decisions, invariants, and port APIs to every agent session
- **Feasibility:** Easy — Cypher queries → template rendering → SHA-256 hash → atomic write
- **Claude Code Capability:** CLAUDE.md auto-loading in every `claude -p` invocation, `.claude/rules/` path-scoped files
- **Description:** Generate project CLAUDE.md from accepted ADRs, critical requirements, active invariants, and port API signatures via Cypher queries. Generate path-scoped `.claude/rules/` files from the 160 behaviors. Creates "low-bandwidth broadcast channel" that updates all agent sessions automatically. Feedback loop: graph changes → regenerate files → agents consume → produce better work.
- **Spec Changes Required:** New `types/memory.md` for `RenderedArtifact`, `GeneratorPipeline` types. New behaviors for memory generation lifecycle. Update `behaviors/BEH-SF-017-agent-roles.md` to reference generated rules.

### Rank 10: Reverse Engineering Flow

- **Source:** 10 (Feature #4)
- **Impact:** High — zero-friction entry point; immediate value from existing codebases
- **Feasibility:** Medium — multi-phase flow using `Read`, `Glob`, `Grep`, `Bash` with permission mode `plan`
- **Claude Code Capability:** `--permission-mode plan` for read-only analysis, `--allowedTools` scoping
- **Description:** `specforge reverse .` scans existing codebase, extracts requirements, generates behavioral specs, and populates the knowledge graph. Discovery agent scans code structure, spec-author generates behavioral contracts, reviewer validates against actual code. The "cold start killer" — users see value in the first 10 minutes.
- **Spec Changes Required:** New flow definition in `behaviors/BEH-SF-049-flow-definitions.md`. New behaviors for reverse engineering stages. Update `behaviors/BEH-SF-113-cli.md` with `specforge reverse` command.

### Rank 11: Adversarial Spec Stress-Testing

- **Source:** 01 (Feature 3.1)
- **Impact:** High — catches ambiguities, race conditions, and gaps that single-reviewer misses
- **Feasibility:** Medium — requires Agent Teams feature (experimental) or concurrent subagents as fallback
- **Claude Code Capability:** Agent Teams with mailbox communication, or concurrent subagents with ACP session
- **Description:** After convergence, spawn Red Team (2-3 agents attacking spec) and Blue Team (defending). Runs 10 minutes or $2 budget. Unresolved Red findings promoted to `major` severity. Estimated cost: $3-8 per stress test. Can fall back to sequential subagent model if Agent Teams unavailable.
- **Spec Changes Required:** New `spec-stress-test` flow in `behaviors/BEH-SF-049-flow-definitions.md`. New agent role definitions for `red-team-agent`, `blue-team-agent`. New ADR for adversarial review pattern.

### Rank 12: Worktree-Isolated Parallel Development

- **Source:** 09 (Pattern 9), 01 (Feature 3.3)
- **Impact:** High — 5 dev-agents implementing 5 task groups simultaneously
- **Feasibility:** Medium — Claude Code `isolation: "worktree"` handles branch creation; orchestrator manages merge
- **Claude Code Capability:** `isolation: "worktree"` creating branches in `.claude/worktrees/`
- **Description:** Each dev-agent gets isolated git worktree. Orchestrator merges sequentially with dependency ordering. Conflicts trigger `conflict-resolver` agent. Rollback granularity: task-group-3 failure reverts only its branch. Bounded by slowest agent, not sequential sum.
- **Spec Changes Required:** New `WorktreeBranch` type in `types/agent.md`. Update `behaviors/BEH-SF-057-flow-execution.md` with parallel worktree stages. New behaviors for merge protocol and conflict resolution.

### Rank 13: Dynamic MCP Composition (Role-Based Server Assignment)

- **Source:** 05 (Core Architecture)
- **Impact:** High — agents query external systems directly instead of through ACP session bottleneck
- **Feasibility:** Medium — per-session temporary `mcp-{sessionId}.json` generated from role-to-server mapping
- **Claude Code Capability:** `--mcp-config` flag, `--allowedTools` for MCP tool filtering
- **Description:** `ClaudeCodeAdapter` generates per-session MCP config based on agent role. Reviewer gets Neo4j + GitHub + Postgres. Dev-agent gets GitHub + test-runner. Discovery-agent gets Confluence/Notion. Health-checks at spawn time; failed servers excluded with warning. Capabilities become composition of built-in tools + MCP servers.
- **Spec Changes Required:** Update `behaviors/BEH-SF-151-claude-code-adapter.md` with MCP config generation. New `types/mcp.md` for `McpServerConfig`, `RoleMcpMapping`. Update `architecture/ports-and-adapters.md` with MCP integration points.

### Rank 14: Real-Time Streaming Dashboard

- **Source:** 04 (Capability 3), 10 (Feature #8)
- **Impact:** High — users can observe agent activity live, building trust
- **Feasibility:** Medium — requires WebSocket transport from `stream-json` events to React SPA
- **Claude Code Capability:** `--output-format stream-json` with `--verbose` producing 6 event types
- **Description:** SpecForge server captures `stream-json` events from all active agent sessions and streams via WebSocket to dashboard. Six event types: `tool-call`, `tool-result`, `partial-text`, `token-update`, `error`, `system`. Renders live agent activity panels, tool call timelines, token burn rate gauges, and finding previews.
- **Spec Changes Required:** New `StreamDashboardEvent` type in `types/extensibility.md`. Update `behaviors/BEH-SF-133-web-dashboard.md` with streaming views. Update `architecture/c3-web-dashboard.md` with WebSocket architecture.

### Rank 15: Immutable Audit Trail Generation

- **Source:** 02 (Capability 10), 06 (Feature 7)
- **Impact:** High — every permission decision and tool invocation becomes a queryable graph node; required for GxP
- **Feasibility:** Medium — dual-chain integrity model with hook-level hash chain independent from ACP session
- **Claude Code Capability:** `PreToolUse`/`PostToolUse`/`Stop` hooks, `stream-json` event parsing
- **Description:** Every tool invocation generates an audit record via hooks. Dual-chain integrity: hook-level hash chain independent from ACP session event log. External witness publishes Merkle root. `specforge audit reconcile` detects discrepancies between chains. Permission decisions (allow/deny/ask) captured as `PermissionDecision` graph nodes.
- **Spec Changes Required:** Update `plugins/PLG-gxp.md` with dual-chain audit model. New `types/audit.md` for `AuditRecord`, `PermissionDecision`, `MerkleWitness`. New ADR for dual-chain integrity pattern.

### Rank 16: Dynamic Role Factory

- **Source:** 09 (Pattern 1), 09 (Pattern 8)
- **Impact:** High — Go projects auto-spawn `go-concurrency-reviewer`, Python ML projects spawn `pytorch-architecture-analyst`
- **Feasibility:** Hard — requires `RoleTemplate` registry in Neo4j with activation predicates evaluated against project graph
- **Claude Code Capability:** `--agents` JSON for dynamic agent definition at spawn time
- **Description:** Maintains a `RoleTemplate` registry with activation predicates. When a flow starts, predicates evaluate against the project graph (detected languages, frameworks, dependencies). Matching templates generate specialized agent definitions. Version-aware prompts adjust for React 19 vs 18, Go 1.22 vs 1.21. Dormant roles excluded after N unused runs.
- **Spec Changes Required:** New `types/role-factory.md` for `RoleTemplate`, `ActivationPredicate`. New behaviors for role factory lifecycle. Update `behaviors/BEH-SF-017-agent-roles.md` to support dynamic roles alongside static 8.

### Rank 17: Session Checkpointing and Rollback

- **Source:** 07 (Pattern 11)
- **Impact:** High — rollback to iteration N without losing all subsequent work
- **Feasibility:** Medium — `Checkpoint` nodes at convergence evaluations, `--fork-session` for rollback
- **Claude Code Capability:** `--fork-session` to branch from checkpoint, session persistence
- **Description:** At each convergence evaluation, create `Checkpoint` node with iteration number, convergence score, and materialized session state. `specforge rollback --to-iteration N` forks from checkpoint. Abandoned iterations preserved as audit trail. Essential for long-running flows where iteration 7 went wrong but iterations 1-6 were valuable.
- **Spec Changes Required:** New `Checkpoint` type in `types/agent.md`. Update `behaviors/BEH-SF-065-flow-lifecycle.md` with checkpoint/rollback lifecycle. Update `behaviors/BEH-SF-025-agent-sessions.md` with fork-from-checkpoint behavior.

### Rank 18: Agent Skill Injection

- **Source:** 09 (Pattern 4)
- **Impact:** Medium — agents receive project-specific coding conventions and error patterns as skills
- **Feasibility:** Easy — `.claude/skills/` markdown files generated from codebase-context graph
- **Claude Code Capability:** `skills` field in agent definitions, `.claude/skills/` directory
- **Description:** `codebase-analyzer` agent scans project and generates `.md` skill files encoding naming conventions, file layout patterns, import ordering, error handling patterns (Result types, error tags, freeze conventions). Skills injected into relevant agents at spawn time based on file scope. Auto-generated from graph, not hand-written.
- **Spec Changes Required:** New `Skill` node type in `types/graph.md`. Update `behaviors/BEH-SF-017-agent-roles.md` with skill injection. New behaviors for skill generation pipeline.

### Rank 19: Cross-Flow Session Inheritance

- **Source:** 07 (Pattern 4), 03 (Feature 3)
- **Impact:** Medium — dev-agents inherit spec-author's architectural rationale; reviewers inherit implementation trade-offs
- **Feasibility:** Medium — requires `INHERITS_CONTEXT` graph relationships between flow runs
- **Claude Code Capability:** `--append-system-prompt` for cross-flow context injection
- **Description:** Formalizes knowledge transfer between flow types. Spec-writing → implementation: transfers requirements intent and architectural rationale. Implementation → code-review: transfers trade-off decisions. Code-review → spec-writing: transfers coverage gaps and real-world constraints. Creates a cycle of improving understanding across the specification lifecycle.
- **Spec Changes Required:** New `INHERITS_CONTEXT` relationship in `types/graph.md`. Update `behaviors/BEH-SF-049-flow-definitions.md` with inheritance rules. Update `architecture/dynamic-session-composition.md` with cross-flow queries.

### Rank 20: Permission Simulation ("Dry Run")

- **Source:** 06 (Feature 11)
- **Impact:** Medium — users understand exactly what agents can do before committing budget
- **Feasibility:** Easy — walks flow definition, resolves roles, applies overlays, produces permission report without LLM calls
- **Claude Code Capability:** Settings hierarchy (managed > project > user), permission evaluation (deny > ask > allow)
- **Description:** `specforge estimate --permissions` walks the entire flow definition, resolves which agent roles appear in which stages, applies all permission overlays (GxP, git context, org policy), and produces a report showing: writable files, executable commands, denied paths, network domains, max budget, estimated iterations. No LLM calls — zero cost, instant feedback.
- **Spec Changes Required:** Update `behaviors/BEH-SF-113-cli.md` with dry-run command. New `SimulationResult` type. New behaviors for permission resolution walkthrough.

---

## 3. Architectural Breakthroughs

### Breakthrough 1: Hooks as Event Bus (Research 02)

The most significant architectural insight: Claude Code hooks are not a configuration convenience — they are a **programmable event bus** with five lifecycle events, tool matchers, exit code semantics, and input rewriting. This transforms SpecForge's relationship with Claude Code from "orchestrator spawning opaque processes" to "orchestrator with real-time observability and control over every tool invocation." The hook pipeline architecture (PreToolUse → PostToolUse → Stop) creates an aspect-oriented programming model where compliance, monitoring, graph sync, and audit trail are cross-cutting concerns injected without modifying agent code. This is the foundation layer — without it, features 1, 5, 8, and 15 don't exist.

### Breakthrough 2: Dual-Memory Architecture (Research 03)

The separation of knowledge into semantic memory (Neo4j: _what the project knows_) and procedural memory (CLAUDE.md/rules: _how agents act_) with a generator pipeline bridging them creates a **closed-loop learning system**. The graph generates memory files → agents consume them → agents produce session chunks → chunks materialize back to graph → graph regenerates improved memory files. This is not incremental — it's the difference between a stateless tool and an organizational knowledge platform. After 100 runs, the graph becomes irreplaceable institutional memory.

### Breakthrough 3: Structured Output as Data Architecture (Research 04)

Replacing text extraction with JSON schema validation inverts the data flow. Currently: agents produce text → SpecForge parses → extracts structure → writes to graph. Proposed: agents produce structured JSON → SpecForge validates → writes directly to graph. This eliminates an entire parsing layer, makes agent output machine-verifiable, and enables per-role graph schemas that prevent role contamination (reviewer cannot produce `Task` nodes). The `selfAssessment` schema (confidence score, suggested next action) shifts convergence from external observation to agent self-report.

### Breakthrough 4: Layered Permission Governance (Research 06)

The eleven-layer governance stack (Enterprise → Organization → Compliance → Repository → Git Context → Role → Session → Real-time → File → Audit → Impact) is not just security — it's a **trust architecture**. Progressive trust escalation (restricted → standard → elevated → autonomous) based on demonstrated reliability means agents earn capabilities over time. This directly addresses the #1 enterprise objection: "How do I trust AI agents with my codebase?" The answer: graduated trust with full audit trail.

### Breakthrough 5: Dynamic Agent Role Factory (Research 09)

Moving from 8 static agent roles to a `RoleTemplate` registry with activation predicates transforms SpecForge from a generic tool to a **project-aware platform**. A Go microservice project, a React SPA, a Python ML pipeline, and a regulated pharmaceutical system each get fundamentally different agent configurations — automatically, without user configuration. Combined with agent performance tracking and evolution (Pattern 10), roles improve over time. This is the path from "useful tool" to "indispensable platform."

---

## 4. Cross-Cutting Themes

### Theme 1: Neo4j as Universal Substrate (10/10 files)

Every research file assumes Neo4j as the source of truth. Graph sync (02), session composition (07, 10), memory generation (03), structured output (04), MCP queries (05), permission decisions (06), cost tracking (08), role templates (09), and agent teams materialization (01) all write to and read from the knowledge graph. The graph is not a feature — it's the platform.

### Theme 2: Hooks as Control Plane (02, 03, 05, 06, 10)

Five research files independently identified Claude Code hooks as the primary control mechanism. Graph sync (02), compliance gates (02, 06), cost optimization (02), agent monitoring (02, 06), audit trails (02, 06), cross-agent events (02), dynamic tool synthesis (02), memory regeneration triggers (03), MCP health checks (05), and permission enforcement (06). The hook system is SpecForge's nervous system.

### Theme 3: Cost as First-Class Concern (01, 02, 04, 06, 07, 08, 09, 10)

Eight files address cost. Agent Teams token economics (01), cost optimization hooks (02), model routing (08), budget zones (08), cost prediction (08), token dashboards (08, 10), fork budget allocation (07), competitive evaluation costs (09), and enterprise chargeback (08). Strong signal: users will not adopt without cost predictability and control.

### Theme 4: Convergence as Quality Guarantee (01, 04, 07, 08, 10)

Five files frame convergence loops as the quality mechanism. Convergence criteria as Cypher queries (10), self-assessment schemas (04), effort escalation on stalled metrics (08), checkpoint/rollback (07), and adversarial stress-testing as post-convergence validation (01). The pattern: iterate → measure → decide → iterate again, with the "measure" step becoming increasingly sophisticated.

### Theme 5: Agent Isolation with Retroactive Observability (01, 02, 06, 09)

Four files address the tension between agent autonomy and system observability. Agent Teams materialization bridge (01), PostToolUse hook monitoring (02), role drift detection (02, 06), and transcript-based introspection (09). The pattern: let agents work freely, observe everything via hooks, retroactively materialize to the graph. Freedom with accountability.

### Theme 6: GxP/Compliance as Cross-Cutting Overlay (02, 05, 06, 10)

Four files specifically address regulated environments. Compliance hooks (02), audit trails (02, 06), permission governance (06), GxP plugin (10), electronic signatures (10), and validation protocols (10). This is both a market differentiator and an architectural forcing function — if SpecForge can satisfy GxP, it can satisfy any enterprise compliance requirement.

---

## 5. The Compound Effects

### Compound 1: Graph Sync + Session Composition + Structured Output

When hooks sync every mutation to Neo4j (Rank 1), and agents produce structured graph nodes directly (Rank 3), and session composition queries the graph for prior context (Rank 2) — the system becomes a **self-improving knowledge engine**. Each agent's structured output becomes the next agent's composed context. Quality compounds exponentially because context quality improves with every run.

### Compound 2: Model Routing + Budget Zones + Cost Prediction

Role-adaptive routing (Rank 4) cuts baseline costs 40%. Budget zones (Rank 6) prevent overruns. Cost prediction (Rank 7) gives users confidence to run flows. Together, they create **cost transparency and control** — the combination that converts skeptics. Users who see accurate predictions and watch budgets managed intelligently will trust the platform with larger, more valuable workflows.

### Compound 3: Compliance Gates + Audit Trail + Permission Governance

PreToolUse compliance gates (Rank 5) prevent violations. Immutable audit trail (Rank 15) records everything. Layered permissions (Breakthrough 4) enforce trust boundaries. Together, they create **compliance-by-construction** — regulations are enforced at the tool-invocation level, not the review level. This is the GxP story: "Every tool call is audited, every write is validated, every permission is traced."

### Compound 4: Dynamic Roles + Skill Injection + Agent Monitoring

Dynamic role factory (Rank 16) generates project-specific agents. Skill injection (Rank 18) gives them project-specific knowledge. Agent monitoring (Rank 8) catches when they drift. Together, they create **adaptive specialization** — agents that are simultaneously specialized and supervised. The monitoring creates a feedback loop: drift detection → role template adjustment → better agents.

### Compound 5: Session Composition + Cross-Flow Inheritance + Checkpointing

Session composition (Rank 2) provides within-flow context. Cross-flow inheritance (Rank 19) provides across-flow context. Checkpointing (Rank 17) provides temporal control. Together, they create **organizational memory with time-travel** — the ability to ask "what did we know at iteration 5 of the spec-writing phase, and how would the implementation have been different if we'd known X?"

---

## 6. Gap Analysis

### Missing from Current Spec (overview.md)

| Gap                            | Current State                                      | Research Finding                                                   | Action Required                                                                                                 |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Hook architecture**          | Not mentioned in overview                          | Identified as control plane by 5 research files                    | New `architecture/c3-hooks.md` C3 diagram. New `behaviors/BEH-SF-161-hook-pipeline.md` behavior file            |
| **Structured output pipeline** | Agents produce text, SpecForge parses              | Agents should produce validated JSON with graph nodes              | New ADR for JSON-first architecture. Rewrite `behaviors/BEH-SF-151-claude-code-adapter.md`                      |
| **Cost optimization**          | BEH-SF-073 through BEH-SF-080 cover budgeting      | Role-adaptive routing, budget zones, cost prediction not specified | Expand `behaviors/BEH-SF-073-token-budgeting.md` significantly. New `behaviors/BEH-SF-169-cost-optimization.md` |
| **Memory generation**          | Not in spec                                        | Dual-memory architecture is Breakthrough #2                        | New `behaviors/BEH-SF-177-memory-generation.md`. New `types/memory.md`                                          |
| **Dynamic agents**             | 8 static roles                                     | Role factory, parameterized templates, skill injection             | New `behaviors/BEH-SF-185-dynamic-agents.md`. Update `types/agent.md`                                           |
| **MCP ecosystem**              | BEH-SF-082 mentions tool registry                  | Dynamic MCP composition, role-based server assignment              | New `behaviors/BEH-SF-193-mcp-composition.md`. New `types/mcp.md`                                               |
| **Permission governance**      | BEH-SF-081 through BEH-SF-086 cover tool isolation | 11-layer governance stack, progressive trust                       | New `behaviors/BEH-SF-201-permission-governance.md`. Major update to `behaviors/BEH-SF-081-tool-isolation.md`   |
| **Agent Teams integration**    | Not in spec                                        | Hybrid ACP session + teams model                                   | New ADR for Agent Teams integration. Update `behaviors/BEH-SF-041-agent-communication.md`                       |
| **Reverse engineering flow**   | Not in spec                                        | Zero-friction entry flow                                           | New flow definition. Update `behaviors/BEH-SF-049-flow-definitions.md`                                          |
| **Streaming dashboard**        | BEH-SF-133 through BEH-SF-138 cover dashboard      | Real-time stream-json integration not specified                    | Update `behaviors/BEH-SF-133-web-dashboard.md` with streaming architecture                                      |

### Spec Files to Create

1. `behaviors/BEH-SF-161-hook-pipeline.md` — BEH-SF-161 through BEH-SF-170
2. `behaviors/BEH-SF-169-cost-optimization.md` — BEH-SF-171 through BEH-SF-178
3. `behaviors/BEH-SF-177-memory-generation.md` — BEH-SF-179 through BEH-SF-186
4. `behaviors/BEH-SF-185-dynamic-agents.md` — BEH-SF-187 through BEH-SF-194
5. `behaviors/BEH-SF-193-mcp-composition.md` — BEH-SF-195 through BEH-SF-202
6. `behaviors/BEH-SF-201-permission-governance.md` — BEH-SF-203 through BEH-SF-212
7. `types/structured-output.md` — Per-role JSON schemas
8. `types/memory.md` — RenderedArtifact, GeneratorPipeline, KnowledgePattern
9. `types/mcp.md` — McpServerConfig, RoleMcpMapping
10. `types/hooks.md` — HookPipeline, HookEvent, HookState
11. `types/audit.md` — AuditRecord, PermissionDecision, MerkleWitness
12. `architecture/c3-hooks.md` — C3 component diagram for hook system
13. `decisions/ADR-011.md` — Hooks as Event Bus
14. `decisions/ADR-012.md` — JSON-First Structured Output
15. `decisions/ADR-013.md` — Dual-Memory Architecture
16. `decisions/ADR-014.md` — Role-Adaptive Model Routing
17. `decisions/ADR-015.md` — Agent Teams Hybrid Integration

---

## 7. Risk Register

| #   | Risk                                                        | Severity | Probability | Source     | Mitigation                                                                                                                                                            |
| --- | ----------------------------------------------------------- | -------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Token costs exceed user expectations**                    | Critical | High        | 01, 08, 10 | Layered controls: estimation before execution, three-level budgets, budget zones with progressive degradation, role-adaptive routing for 40% baseline reduction       |
| 2   | **Hook latency blocks agent execution**                     | High     | Medium      | 02, 06     | Target <50ms PreToolUse latency. Async operations via FIFO/Unix domain socket. Test suites in Stop hooks (not PreToolUse). Timeout harness wrapper                    |
| 3   | **Claude Code CLI breaking changes**                        | High     | Medium      | 10, 04     | Adapter pattern (BEH-SF-151+) isolates SpecForge from CLI internals. Pin CLI versions. Integration tests per release. Feature-flag experimental capabilities          |
| 4   | **Agent Teams feature removed/changed**                     | High     | High        | 01         | Feature-flag all team code behind `SPECFORGE_AGENT_TEAMS=1`. Adapter interface isolates changes. All team features have subagent fallback paths                       |
| 5   | **Session composition context degradation**                 | Medium   | Medium      | 07, 03     | Depth limits on composition chains. Quality scoring on chunks. Recency ranking. Human-injected chunks get relevance boost. Empirical validation of chain depth limits |
| 6   | **Neo4j operational complexity deters solo users**          | Medium   | High        | 10         | Solo mode uses embedded Neo4j with zero config. SaaS mode fully managed. Clear documentation for solo setup. Consider SQLite fallback for minimal installations       |
| 7   | **GxP audit trail integrity gaps during Agent Team stages** | High     | Low         | 01, 02     | Materialization bridge retrofits observability. Disable team stages in GxP mode until bridge proven. Dual-chain reconciliation command                                |
| 8   | **Schema validation gives false sense of type safety**      | Medium   | Medium      | 04         | JSON Schema compatibility checked at runtime via Ajv, not compile-time. Document limitations clearly. Runtime validation library required                             |
| 9   | **Dynamic role factory produces poor-quality agents**       | Medium   | Medium      | 09         | Agent performance tracking creates feedback loop. A/B testing of role templates. Dormant role retirement. Fallback to static 8 roles                                  |
| 10  | **Multi-layer permission conflicts hard to debug**          | Medium   | High        | 06         | Permission simulation (dry run) shows resolved permissions. Clear precedence: deny-wins across all layers. `specforge explain-permission <tool>` debug command        |

---

## 8. Implementation Roadmap

### Phase 0 — Foundation (Must-Have Infrastructure)

**Goal:** The platform cannot function without these. Zero product value until Phase 0 ships.

| Feature                         | Rank | Effort | Dependency          |
| ------------------------------- | ---- | ------ | ------------------- |
| Real-Time Graph Sync via Hooks  | 1    | Medium | Neo4j operational   |
| Compliance Gates via PreToolUse | 5    | Easy   | Hook infrastructure |
| Agent Behavior Monitoring       | 8    | Medium | Hook infrastructure |
| Immutable Audit Trail           | 15   | Medium | Hook infrastructure |

**Deliverables:** Hook pipeline architecture, graph sync daemon, compliance gate scripts, behavioral monitors, audit trail with hash chain. New spec files: `behaviors/BEH-SF-161-hook-pipeline.md`, `types/hooks.md`, `architecture/c3-hooks.md`, `decisions/ADR-011.md`.

**Exit criteria:** Every tool invocation by every agent is observable, auditable, and controllable via hooks.

### Phase 1 — Core Value (Delivers the Product Promise)

**Goal:** Users experience the core value proposition: specs that verify themselves and get smarter.

| Feature                           | Rank | Effort | Dependency                 |
| --------------------------------- | ---- | ------ | -------------------------- |
| Session Composition Engine        | 2    | Hard   | Phase 0 (graph sync)       |
| Schema-Validated Agent Outputs    | 3    | Medium | None                       |
| Graph-Backed CLAUDE.md Generation | 9    | Easy   | Phase 0 (graph sync)       |
| Reverse Engineering Flow          | 10   | Medium | Rank 3 (structured output) |
| Real-Time Streaming Dashboard     | 14   | Medium | None                       |

**Deliverables:** Session composition with vector embeddings, per-role JSON schemas, memory generator pipeline, reverse engineering flow, streaming dashboard. New spec files: `types/structured-output.md`, `types/memory.md`, `behaviors/BEH-SF-177-memory-generation.md`, `decisions/ADR-012.md`, `decisions/ADR-013.md`.

**Exit criteria:** `specforge reverse .` produces a populated knowledge graph. Second run of any flow is measurably better than first run due to session composition.

### Phase 2 — Differentiation (Creates Competitive Moat)

**Goal:** Features that no competitor can easily replicate because they compound over time.

| Feature                        | Rank | Effort | Dependency                         |
| ------------------------------ | ---- | ------ | ---------------------------------- |
| Role-Adaptive Model Routing    | 4    | Easy   | None                               |
| Budget-Aware Orchestration     | 6    | Medium | Phase 0 (hooks for token tracking) |
| Cost Prediction Engine         | 7    | Medium | Rank 4 (model routing)             |
| Dynamic Role Factory           | 16   | Hard   | Phase 1 (graph, structured output) |
| Agent Skill Injection          | 18   | Easy   | Phase 1 (graph)                    |
| Cross-Flow Session Inheritance | 19   | Medium | Phase 1 (session composition)      |

**Deliverables:** Model routing strategy engine, budget zone management, cost estimator, role template registry, skill generator, cross-flow inheritance rules. New spec files: `behaviors/BEH-SF-169-cost-optimization.md`, `behaviors/BEH-SF-185-dynamic-agents.md`, `decisions/ADR-014.md`.

**Exit criteria:** Flow runs cost 40% less than Phase 1 with same quality. Projects with 10+ runs show measurably better agent performance than fresh projects.

### Phase 3 — Vision (Forward-Looking Capabilities)

**Goal:** Capabilities that position SpecForge as the category-defining platform.

| Feature                        | Rank | Effort | Dependency                    |
| ------------------------------ | ---- | ------ | ----------------------------- |
| Adversarial Stress-Testing     | 11   | Medium | Phase 1 (structured output)   |
| Worktree Parallel Development  | 12   | Medium | Phase 2 (dynamic roles)       |
| Dynamic MCP Composition        | 13   | Medium | Phase 1 (structured output)   |
| Session Checkpointing/Rollback | 17   | Medium | Phase 1 (session composition) |
| Permission Simulation          | 20   | Easy   | Phase 0 (hooks)               |
| Agent Teams Integration        | —    | Hard   | Phase 1 + experimental API    |
| Agent Marketplace              | —    | Hard   | Phase 2 (dynamic roles)       |
| Enterprise Cost Allocation     | —    | Medium | Phase 2 (cost tracking)       |

**Deliverables:** Red/Blue team flows, parallel worktree development, MCP ecosystem, checkpoint/rollback, permission dry-run, agent teams hybrid model. New spec files: `behaviors/BEH-SF-193-mcp-composition.md`, `behaviors/BEH-SF-201-permission-governance.md`, `decisions/ADR-015.md`.

**Exit criteria:** SpecForge handles enterprise-scale projects with multi-team cost allocation, regulated compliance, and adversarial quality assurance.

---

## 9. Killer Demos

### Demo 1: "Zero to Knowledge Graph in 90 Seconds"

**What happens:** `specforge reverse .` on a 50-file TypeScript project. Discovery agent scans, extracts 47 requirements, identifies 12 architectural patterns, and populates the knowledge graph.

**What the audience sees:** Terminal output showing agent progress → dashboard lights up with graph visualization → user clicks a node and sees traceability from requirement to code file to test.

**What makes it impressive:** No configuration. No YAML. No schema definition. The tool understood the codebase and built a specification from nothing. "It already knows more about your codebase than your wiki."

### Demo 2: "The Second Run"

**What happens:** Run `specforge forge` on a project that already has one prior run. Session composition kicks in — the spec-author receives prior findings, the reviewer remembers what it caught last time.

**What the audience sees:** Split screen: left shows first run (5 iterations, 12 findings, $4.20). Right shows second run (2 iterations, 3 findings, $1.80). The knowledge graph glows brighter on the second run as composed context flows into agents.

**What makes it impressive:** The system literally got smarter. Same codebase, same flow, dramatically better results. "Every run makes the next run better. This is compound intelligence."

### Demo 3: "The Red Team"

**What happens:** After a spec converges (zero critical findings), trigger `specforge stress-test`. Red Team agents attack the spec for ambiguities, race conditions, edge cases. Blue Team defends.

**What the audience sees:** Dashboard shows two teams debating. Red agent posts finding: "Section 4.2 doesn't specify behavior when concurrent writes happen." Blue agent responds: "Section 7.1 specifies write lock semantics." Red agent: "But Section 7.1 doesn't cover the read-during-write case." Finding promoted to `major`.

**What makes it impressive:** AI agents adversarially testing specifications. The spec looked done — but the Red Team found a real gap. "Your spec passed review. But can it survive an attack?"

### Demo 4: "Cost Control in Real Time"

**What happens:** Start a `thorough` flow on a large codebase. Budget set to $10. Dashboard shows live cost tracking. At $6 (Yellow zone), system auto-downgrades non-critical agents to Haiku. At $9 (Orange), convergence criteria relaxed. Flow completes at $9.80 with all critical findings resolved.

**What the audience sees:** Token burn rate chart, budget zone indicator transitioning from Green → Yellow → Orange, model badges changing from Opus → Sonnet → Haiku on agent panels, final cost right at budget.

**What makes it impressive:** The system didn't crash at the budget limit or produce garbage. It intelligently economized, prioritizing critical work. "Set your budget. The system delivers the best result it can within it."

### Demo 5: "Five Developers, One Command"

**What happens:** `specforge implement --parallel 5`. Five dev-agents each get an isolated git worktree, implementing five independent task groups simultaneously. Dashboard shows five parallel streams. Orchestrator merges sequentially. One conflict triggers conflict-resolver agent.

**What the audience sees:** Five terminal panels running in parallel. Progress bars advancing independently. Merge sequence visualization. Conflict detected → resolver agent produces merge commit → tests pass → done. Total wall clock: 8 minutes instead of 40.

**What makes it impressive:** Parallel AI development with automatic conflict resolution. "One command turned your spec into a working implementation. Five agents. Five branches. One merge."

---

## 10. Recommended Next Steps

### Immediate Actions (This Week)

1. **Create ADR-011: Hooks as Event Bus** — This is the foundation decision. Document the pattern of using Claude Code hooks as SpecForge's control plane. Reference research 02.

2. **Create ADR-012: JSON-First Structured Output** — Decide whether to adopt the structured output pipeline. This affects every agent role definition and the entire adapter layer. Reference research 04.

3. **Create ADR-013: Dual-Memory Architecture** — Formalize the separation of semantic memory (Neo4j) and procedural memory (CLAUDE.md/rules). Reference research 03.

4. **Prototype the graph sync hook** — A single PostToolUse hook that parses `tool_input` from `Edit|Write`, computes content hash, and issues `MERGE` to Neo4j. This proves the hook-as-event-bus pattern is viable and performant (<50ms target).

5. **Define per-role JSON schemas** — Write the `--json-schema` definitions for the 8 agent roles. Start with `discovery-agent` and `reviewer` as they have the clearest output structure. Test with `claude -p --json-schema`.

### Short-Term (Next 2 Weeks)

6. **Write `behaviors/BEH-SF-161-hook-pipeline.md`** (BEH-SF-161 through BEH-SF-170) — The hook pipeline architecture covering: PreToolUse pipeline, PostToolUse pipeline, Stop pipeline, SessionStart pipeline, SessionEnd pipeline, async execution pattern, state management.

7. **Write `types/structured-output.md`** — Per-role output schemas, `StreamDashboardEvent`, `TypedStageDefinition`, error schemas.

8. **Write `behaviors/BEH-SF-169-cost-optimization.md`** (BEH-SF-171 through BEH-SF-178) — Model routing strategy, budget zones, cost prediction formula, effort escalation rules.

9. **Prototype session composition** — Implement the query → rank → budget → assemble → bootstrap pipeline using Neo4j vector index for embedding similarity.

10. **Update `behaviors/BEH-SF-151-claude-code-adapter.md`** — Rewrite BEH-SF-155 through BEH-SF-159 to handle structured output, hook integration, and MCP config generation.

### Medium-Term (Next Month)

11. **Write remaining new behavior files** — `behaviors/BEH-SF-177-memory-generation.md`, `behaviors/BEH-SF-185-dynamic-agents.md`, `behaviors/BEH-SF-193-mcp-composition.md`, `behaviors/BEH-SF-201-permission-governance.md`.

12. **Write remaining new type files** — `types/memory.md`, `types/mcp.md`, `types/hooks.md`, `types/audit.md`.

13. **Build the reverse engineering flow** — This is the "zero to value" entry point. Combine structured output + graph sync + session composition into a flow that scans a codebase and populates the knowledge graph.

14. **Build the streaming dashboard integration** — Connect `stream-json` events to WebSocket transport. This is the "seeing is believing" feature.

15. **Create ADR-014 and ADR-015** — Model routing and Agent Teams integration decisions.

### The Bet

SpecForge's competitive advantage is not any single feature — it's the **compound effect** of session composition + knowledge graph + convergence loops creating an intelligence flywheel that gets smarter with every run. Phase 0 builds the nervous system (hooks). Phase 1 builds the brain (composition + structured output). Phase 2 builds the efficiency (cost optimization + dynamic agents). Phase 3 builds the moat (adversarial review + parallel development + marketplace).

The research is clear: the primitives exist in Claude Code today. The specification gap is in formalizing how these primitives compose into a coherent platform. Close the gap. Ship the platform.
