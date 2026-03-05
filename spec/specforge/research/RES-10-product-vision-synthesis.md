---
id: RES-10
kind: research
title: Product Vision Synthesis
status: active
date: 2026-02-27
outcome: adr
related_adr: ADR-003
---

# Product Vision Synthesis

**Research:** SpecForge + Claude Code Full Integration

---

## 1. What No Other Product Can Do

No existing tool combines these three primitives into a single system:

**Primitive 1: A queryable knowledge graph as the source of truth for software intent.** Specs are not documents. They are nodes with typed relationships in Neo4j. Requirements trace to decisions trace to tasks trace to code trace to tests. Drift between intent and implementation is a graph query, not a human review.

**Primitive 2: Persistent AI sessions that accumulate context across iterations.** Claude Code sessions can be resumed (`--resume`), forked (`--fork-session`), and composed. When a reviewer finds a bug in iteration 3, the author session can be resumed with full memory of iterations 1 and 2. This is not prompt history -- it is working memory that persists across the entire lifecycle of a specification.

**Primitive 3: Multi-agent orchestration with role specialization and convergence loops.** Eight agent roles (discovery, spec-author, reviewer, feedback-synthesizer, task-decomposer, dev-agent, coverage-agent, verifier) each running as isolated Claude Code processes with scoped tools, scoped permissions, and scoped models. They iterate until convergence criteria are met, not once.

The combination produces something that does not exist elsewhere: **specifications that continuously verify themselves against code, accumulate organizational knowledge in a graph, and self-correct through autonomous agent loops.**

Linear, Jira, Notion, and Confluence store text. GitHub Copilot generates code without requirements. Cursor and Windsurf edit code within a session. Devin runs tasks but has no knowledge graph and no convergence guarantees. None of them close the loop between intent and implementation. SpecForge does.

---

## 2. The "10x Developer" Vision

A single developer using SpecForge operates with the equivalent output of a small team:

**They are the product owner.** They run `specforge discover` and have an AI-driven requirements interview. The discovery agent asks clarifying questions, identifies edge cases, and produces a structured brief. The developer approves it.

**They have a dedicated spec writer.** The spec-author agent creates behavioral specifications with formal identifiers, traceability, and type definitions. The reviewer agent (a separate session with read-only tools) catches inconsistencies the author missed. The feedback-synthesizer prioritizes and routes fixes. This cycles until convergence.

**They have a project manager.** The task-decomposer agent breaks the spec into implementation tasks with acceptance criteria, dependency ordering, and effort estimates -- all stored as graph nodes.

**They have a dev team.** The dev-agent writes code and tests. The coverage-agent verifies every requirement traces to an implementation. Persistent sessions mean the dev-agent debugs its own iteration 1 output in iteration 2 with full memory.

**They have a living knowledge base.** Every agent conversation is chunked, embedded, and stored. Next month, a new flow bootstraps from this month's reasoning. The graph compounds. The tenth flow run is dramatically more productive than the first.

The key insight: a single developer does not need to be 10x faster at typing. They need to eliminate the 90% of engineering time spent on coordination, context-switching, re-reading specs, re-discovering why decisions were made, and verifying that what was built matches what was intended. SpecForge eliminates all of that.

---

## 3. Enterprise Value Proposition

What makes a CTO or VP of Engineering say "we need this":

**Traceability without overhead.** Every requirement has a graph path to its implementation and test. Compliance audits (SOC 2, ISO 27001, GxP) that currently take weeks become graph queries that take seconds. The GxP plugin (already specified) adds electronic signatures, audit trails, and validation protocols on top of the same graph.

**Architecture decision preservation.** ADRs are graph nodes linked to the code they influenced. When a new engineer asks "why is this designed this way?", the answer is a query, not an archaeological expedition through Slack history.

**Onboarding acceleration.** `specforge reverse .` extracts a structured specification from an existing codebase. New hires get a queryable knowledge graph of the system on day one, not a stale wiki and "ask Sarah."

**Drift detection as a service.** SpecForge can run as a CI check: `specforge check` compares code hashes against spec expectations. When code drifts from its specification, findings are created automatically. This is continuous architectural governance without manual review.

**Cost visibility and control.** Token budgets at three levels (flow, phase, agent). Cost estimation before execution. Per-developer usage tracking. No surprise bills. Budget overruns trigger graceful degradation, not crashes.

**Vendor independence for AI capabilities.** SpecForge orchestrates Claude Code as a subprocess. The `ClaudeCodeAdapter` wraps the CLI binary. If the underlying model changes, SpecForge adapts through model aliases (`opus`, `sonnet`, `haiku`). The graph and all specifications survive any LLM transition.

---

## 4. Developer Experience

What makes individual developers reach for SpecForge daily:

**Zero config entry.** `npm install -g specforge && specforge login && specforge reverse .` -- three commands from cold start to a populated knowledge graph. Solo mode runs everything locally with no payment. The free SaaS tier requires zero infrastructure.

**Natural language queries.** `specforge ask "what requirements are untested?"` translates to Cypher, executes, and returns human-readable results. The knowledge graph is not just for agents -- it is a developer tool for understanding their own system.

**Human-in-the-loop at every point.** `specforge feedback <flow-run-id> "focus on error handling"` injects into the ACP session with highest priority. `specforge converge` force-completes a phase. `specforge iterate` forces another cycle. The developer controls the process, not the other way around.

**Flow presets.** `--preset quick` for a fast, cheap iteration. `--preset thorough` for production-quality output. The same flow, different quality/cost tradeoffs, chosen at runtime.

**Real-time observation.** The web dashboard shows active flow runs with agent progress, token usage, findings, and convergence metrics in real time. VS Code extension integrates inline. Multiple developers can observe the same flow.

**Session composition.** The graph remembers. A reviewer's findings from last month are available as context for this month's spec-author. Each flow run builds on all previous runs. The system gets smarter over time, tailored to your specific codebase and your specific team's conventions.

---

## 5. The Specification-as-Code Revolution

Traditional specs are prose documents that rot. SpecForge specs are graph-native data structures that verify themselves:

**Specs are nodes, not text.** A requirement is a node with properties (id, status, priority, hash) and relationships (TRACES_TO task, VERIFIED_BY test, DECIDED_BY adr). Querying "which requirements lack tests?" is a Cypher query, not a manual review.

**Specs detect drift.** Every spec node stores a content hash. When code changes, SpecForge compares hashes and creates drift findings. This is not a periodic audit -- it is continuous verification.

**Specs generate tasks.** The task-decomposer agent reads the spec graph and produces implementation tasks with acceptance criteria, dependency ordering, and effort estimates. Tasks are graph nodes linked to their originating requirements.

**Specs generate code.** The dev-agent reads tasks and writes code. But unlike pure code generation, every line traces back to a requirement through the graph. The coverage-agent verifies completeness. Nothing is orphaned.

**Specs evolve.** When code legitimately diverges from spec (requirements changed), SpecForge can run a reverse-engineering flow to update the spec from the code. The graph captures both directions: spec-to-code and code-to-spec.

**Specs compose.** A team working on a microservices architecture has a graph per service. Cross-service requirements are relationships between graphs. The org graph (SaaS mode) enables queries that span service boundaries: "what depends on the AuthPort across all services?"

---

## 6. Knowledge Compound Interest

The graph and persistent sessions create a compounding knowledge asset:

**Session composition** is the mechanism. Every agent conversation is chunked into semantic segments, embedded as vectors, and stored as graph nodes linked to the artifacts they produced. When a new flow runs, the session-composition engine queries the graph for relevant prior context, ranks it by relevance and recency, assembles it within token budgets, and bootstraps the new session with accumulated knowledge.

**The cold start problem is real but temporary.** The first flow run has no prior context. The second has one run's worth. By the tenth, the system knows your codebase's patterns, your team's conventions, your architecture's constraints, and the reasoning behind every decision. This is organizational memory that survives employee turnover.

**The compounding curve looks like this:**

- Run 1: Agent works from scratch. Generic output. High iteration count.
- Run 5: Agent bootstraps from 4 prior runs. Knows the project's style. Fewer iterations.
- Run 20: Agent has deep context. Knows which patterns work, which were rejected and why. Spec quality approaches senior-engineer level. Iteration count drops to 1-2.
- Run 100: The graph is the most comprehensive documentation of the system that exists. New engineers learn from it. Architecture reviews reference it. Compliance audits execute against it.

**No competitor can replicate this curve** without both a persistent knowledge graph and session composition. A tool with only sessions (no graph) loses structure. A tool with only a graph (no sessions) loses reasoning context. SpecForge has both.

---

## 7. The Future: Self-Evolving Software

The 18-month trajectory leads to software that maintains its own specifications:

**Phase 1 (now): Human-triggered flows.** Developer runs `specforge run spec-writing`. Agents execute. Human reviews and approves. This is the MVP.

**Phase 2 (6 months): Event-triggered flows.** GitHub webhook fires on PR open. SpecForge automatically runs a code-review flow against the spec. Findings post as PR comments. CI integration via `specforge check` blocks merges when drift exceeds thresholds.

**Phase 3 (12 months): Continuous spec maintenance.** SpecForge monitors the codebase for changes. When code drifts from spec, it creates findings. When findings accumulate past a threshold, it auto-triggers a spec-update flow. Human approval is still required for the final output, but the detection and drafting are autonomous.

**Phase 4 (18 months): Predictive specification.** The graph contains enough historical data to predict: "Based on the last 6 months of changes to the AuthPort, the session-management spec is likely to drift within 2 weeks." Proactive maintenance instead of reactive fixes.

Claude Code's hooks system enables this progression naturally. `PostToolUse` hooks capture every code change. `Stop` hooks detect session completion. `TaskCompleted` hooks coordinate across agents. The lifecycle events are already there -- SpecForge just needs to wire them to the graph.

---

## 8. Competitive Moat

Why this cannot be easily replicated:

**The graph is the moat.** Any tool can wrap an LLM. Very few tools store every agent interaction, every decision, every requirement, and every code artifact as nodes in a queryable graph with typed relationships. Building this from scratch takes years. SpecForge has a 160-behavior specification and a 10-ADR architecture already designed.

**Session composition is the second moat.** Resuming sessions is easy. Composing relevant context from prior sessions into new sessions -- with relevance ranking, token budgeting, and semantic chunking -- is a research-grade problem. SpecForge has this specified (BEH-SF-009 through BEH-SF-016).

**The convergence engine is the third moat.** Running an agent once is easy. Running agents in loops with convergence criteria, iteration budgets, model escalation, and human-in-the-loop gates is an orchestration problem that requires deep integration between the graph, the session manager, and the agent runtime. This is specified across 24 behaviors (BEH-SF-049 through BEH-SF-072).

**Domain-specific plugins extend the moat.** The GxP compliance plugin adds audit trails, electronic signatures, and validation protocols. Future plugins for security compliance (SOC 2), accessibility (WCAG), and industry-specific standards create vertical moats that generic coding tools cannot match.

**The compounding knowledge curve creates a switching cost.** After 100 flow runs, the graph contains irreplaceable organizational knowledge. Migrating away means losing that context. This is not lock-in by design -- it is lock-in by value.

---

## 9. Missing Capabilities and Bridges

What SpecForge needs that Claude Code does not natively provide:

| Gap                                      | Description                                                             | Bridge Strategy                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Cross-session memory sharing**         | Claude Code sessions are independent; memory is per-user-per-project    | Session composition engine queries the graph and injects prior context via `--append-system-prompt` |
| **Structured inter-agent communication** | Claude Code subagents report back to caller only; no peer messaging     | Message exchange architecture (ADR-003) via filesystem or Neo4j-backed message passing              |
| **Fine-grained token tracking**          | `stream-json` provides token counts per message but not per-tool-call   | `PostToolUse` hooks capture per-tool token deltas; SpecForge aggregates                             |
| **Deterministic convergence evaluation** | Claude Code has no concept of "convergence"                             | Convergence engine runs outside Claude Code, evaluating graph state after each iteration            |
| **Graph-native operations**              | Claude Code has no Neo4j tooling                                        | MCP server providing Cypher execution, or custom tool via `--mcp-config`                            |
| **Real-time flow observation**           | Claude Code is single-session; no dashboard                             | SpecForge server streams events to web dashboard via WebSocket                                      |
| **Agent team coordination**              | Agent teams are experimental and limited                                | SpecForge's orchestrator replaces this with ACP-session-based coordination                          |
| **Long-running background flows**        | Claude Code sessions can time out                                       | SpecForge server manages session lifecycle, resuming on timeout                                     |
| **Structured output validation**         | `--json-schema` provides schema enforcement but not semantic validation | Post-processing layer validates agent output against graph constraints                              |
| **Multi-model routing within a session** | Model is set per-session, not per-turn                                  | SpecForge spawns separate sessions per model tier; orchestrator routes tasks                        |

Each gap has a viable bridge. The critical insight: SpecForge does not fight Claude Code's architecture. It wraps it. The `ClaudeCodeAdapter` (BEH-SF-151 through BEH-SF-160) treats each Claude Code session as an opaque subprocess with well-defined inputs (system prompt, tools, model, budget) and outputs (structured results, token usage, session ID).

---

## 10. Risk and Mitigation

| Risk                                         | Severity | Probability | Mitigation                                                                                                                                                                       |
| -------------------------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code CLI breaking changes**         | High     | Medium      | Adapter pattern isolates SpecForge from CLI internals. Pin CLI versions. Integration tests per release.                                                                          |
| **Token costs exceed expectations**          | High     | High        | Budget controls at three levels. Cost estimation before execution. Haiku for simple tasks. Sonnet default. Opus only for complex reasoning. Flow presets trade quality for cost. |
| **Context window limits on complex specs**   | Medium   | High        | Session composition with token budgeting. Auto-compaction. Chunked context injection. 1M context window for large sessions.                                                      |
| **Agent output quality inconsistency**       | Medium   | Medium      | Convergence loops catch quality issues. Multiple iterations. Reviewer agent as quality gate. Human approval for final output.                                                    |
| **Neo4j operational complexity**             | Medium   | Medium      | SaaS mode eliminates this. Solo mode uses embedded Neo4j with zero config.                                                                                                       |
| **Anthropic rate limits**                    | Medium   | High        | Queue-based execution. Retry with backoff. Model fallback (Opus to Sonnet). Rate limit recommendations per team size already documented.                                         |
| **Cold start experience is underwhelming**   | High     | High        | `specforge reverse .` provides immediate value from existing code. Pre-populated graph on first run. Clear messaging about compounding value.                                    |
| **Enterprise security concerns**             | Medium   | Medium      | Solo mode runs everything locally. SaaS mode has data residency options. Claude Code CLI runs on developer machines. No credentials pass through SpecForge servers.              |
| **Complexity overwhelms new users**          | Medium   | Medium      | Zero-config entry. Progressive disclosure. `specforge reverse .` as the gateway. Presets simplify choices. Web dashboard provides visual guidance.                               |
| **Agent teams feature remains experimental** | Low      | High        | SpecForge uses subagent model, not agent teams. ACP session replaces team coordination. No dependency on experimental features.                                                  |

The highest-severity, highest-probability risk is cost. The mitigation is layered: estimation, budgets, model routing, presets, and graceful degradation. A developer who runs a thorough opus-model spec-writing flow should know the cost before committing and have controls to cap it.

---

## 11. The 5-Year Vision

**Year 1: Foundation.** Solo mode ships. `specforge reverse .` and `specforge run spec-writing` work end-to-end. Web dashboard for observation. CLI for all operations. The graph stores requirements, decisions, tasks, and agent sessions. Session composition works within a single project.

**Year 2: Team.** SaaS mode ships. Org graphs enable cross-project queries. Collaboration features (comments, approvals, presence). CI integration (`specforge check` in GitHub Actions). VS Code extension for inline spec viewing. Cross-project session composition: lessons from project A inform project B.

**Year 3: Ecosystem.** Plugin marketplace. GxP compliance plugin. Security compliance plugin. Custom flow marketplace. MCP server ecosystem for domain-specific tools (database schema validation, API contract testing, infrastructure-as-code verification). Third-party integrations (Jira, Linear, Confluence) via import/export pipelines.

**Year 4: Intelligence.** Predictive drift detection. Proactive spec maintenance. Architecture health scoring. Technical debt quantification from graph analysis. Automated refactoring proposals when the graph reveals structural issues. Cross-organization benchmarking (anonymized) for spec quality metrics.

**Year 5: Autonomy.** Self-maintaining software systems. SpecForge monitors production metrics, correlates with spec expectations, detects divergence, proposes fixes, and (with human approval) executes them. The graph becomes the nervous system of the software organization -- sensing changes, reasoning about impact, and coordinating responses. The specification is no longer a document. It is the living, executable definition of what the software is supposed to do.

This is not AGI. This is structured automation built on three well-understood primitives (graph databases, persistent AI sessions, convergence loops) applied to a well-understood problem (software specification and verification). Each year builds on the previous year's graph data, making the system more valuable over time.

---

## 12. Killer Demos

### Demo 1: "Reverse Engineer in 3 Minutes"

**Setup:** A medium-sized open-source TypeScript project (30-50 files) that the audience recognizes.

**Script:**

1. `specforge reverse .` -- starts the reverse-engineering flow
2. Web dashboard opens showing agent progress in real time
3. Discovery agent scans the codebase, identifies modules, relationships, patterns
4. Spec-author agent generates behavioral specifications from code analysis
5. Reviewer agent catches inconsistencies between README claims and actual behavior
6. 3 minutes later: a populated Neo4j graph with requirements, architecture decisions, and traceability
7. `specforge ask "what has no test coverage?"` -- instant answer from the graph
8. `specforge ask "what depends on the database layer?"` -- dependency visualization

**Why it sells:** Every developer has a codebase they inherited and do not fully understand. Seeing a structured, queryable knowledge graph extracted in 3 minutes is visceral. The "ask your graph" moment creates desire.

### Demo 2: "From Brief to Passing Tests in One Flow"

**Setup:** A new feature for a well-known library (e.g., "add rate limiting to an Express middleware").

**Script:**

1. `specforge run full-lifecycle --brief "Add rate limiting middleware with sliding window, configurable limits per route, and Redis backing store"`
2. Discovery agent asks 3 clarifying questions (shown in dashboard). Human answers briefly.
3. Spec-writing phase: spec-author generates 12 behavioral requirements. Reviewer catches 2 edge cases (concurrent requests, Redis connection failure). Author revises. Convergence in 2 iterations.
4. Task decomposition: 6 tasks with dependencies and acceptance criteria.
5. Dev phase: dev-agent implements. First iteration: 10/12 tests pass. Two failures around Redis reconnection logic. Second iteration: agent reads its own failures, fixes both. 12/12 pass.
6. Final output: spec in the graph, code committed, tests passing, full traceability from requirement to test.

**Why it sells:** This is the "10x developer" demo. One person, one command, a complete feature with specification, implementation, and verification. The convergence loop -- where the agent fixes its own bugs across iterations -- is the moment that separates SpecForge from every other AI coding tool.

### Demo 3: "The Graph Remembers"

**Setup:** Same project from Demo 2, one month later. New feature request: "add authentication to the rate limiter."

**Script:**

1. `specforge run spec-writing --brief "Add JWT authentication to rate limiting middleware"`
2. Show the session composition: the spec-author agent is bootstrapped with context from Demo 2's rate limiter spec, the reviewer's findings, and the dev-agent's implementation decisions.
3. The agent's first draft correctly references the existing Redis backing store, the sliding window algorithm, and the per-route configuration -- without being told about them. It proposes auth integration points that align with the existing architecture.
4. Reviewer finds zero structural issues on first pass (because the agent already knew the architecture). One edge case found. Fixed in iteration 2. Convergence in 2 iterations.
5. `specforge ask "how has the rate limiter evolved?"` -- graph shows the full timeline: original spec, implementation, auth extension, all decisions.

**Why it sells:** This is the compounding knowledge demo. The system is smarter on run 2 than run 1. The audience immediately extrapolates: what does run 50 look like? Run 100? That projection -- of a system that accumulates institutional knowledge -- is the enterprise sale.

---

## TOP 10 FEATURES (Ranked by Impact x Feasibility)

### 1. Session Composition Engine

**Impact:** Critical | **Feasibility:** High | **Claude Code Capability:** `--resume`, `--fork-session`, `--append-system-prompt`

The mechanism that transforms SpecForge from "AI wrapper" into "knowledge platform." Prior session chunks are queried from the graph, ranked by relevance, assembled within token budgets, and injected into new sessions via `--append-system-prompt`. This is what creates the compounding knowledge curve.

**Implementation:** Query Neo4j for session chunks linked to relevant artifacts. Rank by semantic similarity (vector index), recency, and relationship proximity. Assemble within model's token budget. Inject as structured context in the system prompt.

### 2. Convergence Loop Orchestrator

**Impact:** Critical | **Feasibility:** High | **Claude Code Capability:** `--max-turns`, `--max-budget-usd`, `--output-format stream-json`

The engine that runs review/revise cycles until criteria are met. Uses `stream-json` to track progress, `--max-turns` to bound iterations, and `--max-budget-usd` to enforce cost limits. Convergence criteria are graph queries (e.g., "zero critical findings" is a Cypher query against finding nodes).

**Implementation:** After each agent iteration, the orchestrator queries the graph for convergence metrics. If criteria are not met and budget remains, it resumes the agent session with new findings injected. Model escalation (Sonnet to Opus) triggers when iterations exceed threshold.

### 3. Knowledge Graph with Natural Language Queries

**Impact:** Critical | **Feasibility:** Medium | **Claude Code Capability:** MCP servers via `--mcp-config`

Neo4j as the source of truth with a natural language query interface. `specforge ask "what depends on AuthPort?"` translates to Cypher and returns human-readable results. An MCP server provides Cypher execution as a tool available to all agents.

**Implementation:** NLQ engine translates natural language to Cypher using a small model (Haiku). Neo4j MCP server exposes `execute_cypher`, `create_node`, `create_relationship` tools. All agents use the MCP server for graph operations.

### 4. Reverse Engineering Flow

**Impact:** High | **Feasibility:** High | **Claude Code Capability:** `Read`, `Glob`, `Grep`, `Bash` tools; `--allowedTools` for scoping

The zero-friction entry point. `specforge reverse .` scans an existing codebase and populates the graph with extracted specifications. Uses Claude Code's built-in file operations for codebase analysis. Read-only tools only (no code modification).

**Implementation:** Discovery agent with `--allowedTools "Read,Glob,Grep,Bash"` scans the codebase. Spec-author agent generates behavioral specifications from analysis. Reviewer validates. All output written to the graph via MCP server. Permission mode: `plan` (read-only analysis).

### 5. Role-Specialized Agent Definitions

**Impact:** High | **Feasibility:** High | **Claude Code Capability:** `--agents` JSON, `--system-prompt`, `--allowedTools`, `--disallowedTools`, `--model`

Eight agent roles, each with a distinct system prompt, tool set, model tier, and permission mode. Reviewer agents cannot write files. Dev agents cannot modify specs. Discovery agents use Haiku for fast exploration. Spec-authors use Opus for complex reasoning.

**Implementation:** Each role is a JSON definition passed via `--agents`. Tool scoping via `--allowedTools` and `--disallowedTools`. Model selection via `--model`. Permission mode via `--permission-mode dontAsk` with explicit allow lists.

### 6. ACP Session Inter-Agent Communication

**Impact:** High | **Feasibility:** Medium | **Claude Code Capability:** `PostToolUse` hooks, `Stop` hooks, file system operations

Structured communication between agents via a shared ACP session. Findings, feedback, and status updates are written to the ACP session (graph nodes or filesystem documents). Agents read the ACP session at the start of each iteration. Human feedback posts to the ACP session with highest priority.

**Implementation:** ACP session documents are filesystem files in a structured directory. `PostToolUse` hooks capture agent writes to the ACP session directory. `Stop` hooks notify the orchestrator of session completion. The orchestrator updates the graph and triggers the next agent.

### 7. Token Budget Enforcement and Cost Estimation

**Impact:** High | **Feasibility:** High | **Claude Code Capability:** `--max-budget-usd`, `--output-format stream-json`, token metadata in events

Three-level budget control: per-flow, per-phase, per-agent. Cost estimation before execution based on historical data from the graph. Real-time token tracking via `stream-json` events. Graceful degradation when budgets are exceeded (model downgrade before termination).

**Implementation:** `--max-budget-usd` sets the hard cap per agent session. `stream-json` events provide real-time token counts. The orchestrator aggregates across agents and phases. Historical cost data in the graph enables estimation for future flows. Model escalation/de-escalation based on budget remaining.

### 8. Web Dashboard with Real-Time Flow Observation

**Impact:** High | **Feasibility:** Medium | **Claude Code Capability:** `stream-json` output, `SessionStart`/`SessionEnd` hooks, `SubagentStart`/`SubagentStop` hooks

Real-time visualization of active flows: agent progress, token usage, findings, convergence metrics, and graph state. Multiple users can observe the same flow. Comment threads on findings and spec sections.

**Implementation:** SpecForge server captures `stream-json` events and lifecycle hooks from all active agent sessions. Events are streamed to the web dashboard via WebSocket. React SPA renders agent panels, token charts, finding lists, and graph visualizations.

### 9. CI Integration via `specforge check`

**Impact:** High | **Feasibility:** High | **Claude Code Capability:** `claude -p` headless mode, `--output-format json`, `--json-schema`

Automated drift detection in CI pipelines. `specforge check` compares code state against spec expectations in the graph. Returns structured pass/fail results compatible with GitHub Actions, GitLab CI, and other CI systems. Can block merges when drift exceeds configured thresholds.

**Implementation:** `specforge check` queries the graph for all requirements, computes current code hashes, compares against stored hashes, and reports drift. For deeper analysis, spawns a Claude Code session in headless mode with `--output-format json` and `--json-schema` for structured results. Exit code 0 for pass, non-zero for fail.

### 10. GxP Compliance Plugin

**Impact:** Medium (high for regulated industries) | **Feasibility:** Medium | **Claude Code Capability:** `PreToolUse`/`PostToolUse` hooks for audit trails, `--permission-mode` for approval gates

Full GxP compliance layer: electronic signatures (21 CFR Part 11), audit trails, validation protocols (IQ/OQ/PQ), and controlled document management. Implemented as a SpecForge plugin that adds hooks, graph schema extensions, and additional convergence criteria.

**Implementation:** `PreToolUse` hooks log every tool invocation to an immutable audit trail in the graph. `PostToolUse` hooks capture all outputs. Electronic signatures use the authentication system's identity. Validation protocols are custom flows with additional convergence criteria (e.g., "all validation test cases pass"). Approval gates require authenticated sign-off before phase transitions.

---

## Synthesis: The Core Thesis

SpecForge is not an AI coding tool. It is an **organizational knowledge platform** that uses AI agents as its primary interface.

The knowledge graph is the product. The agents are the input mechanism. The convergence loops are the quality guarantee. Session composition is the compounding advantage.

Every other AI tool in the developer ecosystem optimizes for speed: generate code faster, edit files faster, answer questions faster. SpecForge optimizes for **correctness over time**: ensure that what was built matches what was intended, that the reasoning behind decisions is preserved, and that the system's understanding of itself deepens with every interaction.

Speed is a commodity. Correctness compounds.

The developer who uses SpecForge for a year has an asset that no amount of Copilot usage produces: a queryable, traceable, evolving graph of their software's intent, implementation, and the reasoning that connects them. That graph survives employee turnover, technology migrations, and organizational change. It is the institutional memory that every engineering team wants and none currently has.

This is the product vision: **specifications that are alive, that verify themselves, that remember everything, and that get smarter every day.**
