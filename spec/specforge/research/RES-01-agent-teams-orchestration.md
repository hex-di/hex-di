---
id: RES-01
kind: research
title: Agent Teams Orchestration for SpecForge
status: Research Draft
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research: Agent Teams Orchestration for SpecForge

---

## 1. Executive Summary

Claude Code's Agent Teams feature (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) introduces a fundamentally different coordination model from SpecForge's current subagent approach. Where SpecForge spawns isolated `claude -p` processes coordinated through a centralized ACP session, Agent Teams creates peer-to-peer collaborations where multiple Claude Code instances share a task list and communicate via direct mailboxes.

This research argues that SpecForge should not choose one model over the other. Instead, it should build a **hybrid orchestration layer** that deploys ACP-session-coordinated subagents for structured flows and agent teams for adversarial, deliberative, and exploratory phases where emergent collaboration produces higher-quality output than centrally choreographed sequences.

The key insight: SpecForge's ACP session is architecturally superior for structured production workflows, but Agent Teams unlock a category of capabilities --- live debate, adversarial stress-testing, competing implementations --- that the ACP messaging pattern cannot replicate because it prohibits direct agent-to-agent communication (INV-SF-2, BEH-SF-048).

---

## 2. Architectural Comparison: ACP Session vs. Agent Teams

### 2.1 SpecForge's ACP Session Model (Current)

SpecForge's architecture enforces strict agent isolation (BEH-SF-032). Agents cannot read each other's conversation context. All communication is mediated through the ACP session's three layers: documents, findings, and messages. The orchestrator controls scheduling --- it decides when agents run, what they read, and what they produce. This is a **choreographed** architecture.

**Strengths:**

- Full observability: every inter-agent exchange is an auditable ACP session event (BEH-SF-033)
- Deterministic replay: the append-only event log enables exact reconstruction
- Token efficiency: delta reads (BEH-SF-038) minimize redundant context consumption
- Convergence guarantees: the orchestrator evaluates convergence criteria after each iteration (BEH-SF-057)
- Session materialization: completed conversations become queryable graph knowledge (BEH-SF-009)

**Weaknesses:**

- No real-time deliberation: agents cannot argue in real time; they take turns through the ACP session
- No emergent coordination: the orchestrator defines all interaction patterns; agents cannot self-organize
- Latency overhead: every exchange requires a full orchestrator cycle (write to ACP session, detect message, schedule responder, read response)
- Fixed topology: the flow definition hardcodes which agents talk to which --- there is no dynamic team formation

### 2.2 Claude Code's Agent Teams Model

Agent Teams creates a team lead plus N teammates. Teammates share a task list, communicate via direct mailboxes, and self-claim work. The lead coordinates but teammates also coordinate laterally.

**Strengths:**

- Real-time peer communication: teammates message each other directly without orchestrator mediation
- Self-organization: teammates claim tasks and route messages based on their own judgment
- Plan approval gates: teammates can draft plans that the lead reviews before implementation
- Low coordination overhead: no centralized queue between every message exchange

**Weaknesses:**

- No persistent state across sessions: agent teams do not resume
- No convergence guarantees: there is no built-in metric-driven convergence loop
- Limited observability: communication happens in mailboxes, not in an auditable event log
- Token cost: ~7x standard sessions in plan mode
- No nested teams: flat hierarchy only
- Experimental status: disabled by default, API subject to change

### 2.3 The Fundamental Tension

SpecForge's INV-SF-2 ("Agent Session Isolation") and BEH-SF-048 ("No Direct Agent-to-Agent Communication") exist for good reasons: auditability, determinism, and graph materialization. But these constraints also prevent a class of interactions that produce qualitatively different outputs. When a security reviewer and an architecture reviewer can debate a finding in real time --- pushing back, refining, escalating --- they produce sharper findings than when they independently write to a shared document and a synthesizer merges their outputs after the fact.

The resolution is not to abandon the ACP session but to introduce controlled zones where direct agent communication is permitted, bounded, and retroactively materialized into the graph.

---

## 3. Product Feature Proposals

### 3.1 Adversarial Spec Stress-Testing (Red/Blue Teams)

**Concept:** After the Spec Forge phase converges (zero critical/major findings), spawn an Agent Team where a Red Team of 2-3 agents tries to break the spec and a Blue Team defends it. The Red Team looks for ambiguities, untestable requirements, missing error paths, race conditions, and specification gaps. The Blue Team refutes or acknowledges each attack.

**Why this cannot be done with the ACP session alone:** The ACP messaging pattern processes one finding at a time through a write-detect-schedule-respond cycle. An adversarial stress test requires rapid back-and-forth: Red posts an attack, Blue immediately counters, Red escalates with a concrete scenario, Blue either concedes or provides evidence. This multi-turn argument over a single finding is prohibitively slow through the ACP session's asynchronous message routing (BEH-SF-042).

**Implementation:**

1. After Spec Forge convergence, the orchestrator spawns an Agent Team via the ClaudeCodeAdapter
2. The team lead is SpecForge's orchestrator agent, which sets up the task list with the spec's key requirements
3. Red teammates receive the system prompt: "Find every way this spec can fail, be exploited, or be misunderstood"
4. Blue teammates receive: "Defend the spec's design decisions with evidence from the requirements brief"
5. The team runs for a bounded duration (configurable, default 10 minutes or $2 budget)
6. On completion, the orchestrator captures the team's conversation logs and materializes them as `SessionChunk` nodes with topic `adversarial-review`
7. Unresolved Red Team findings are promoted to ACP session findings with severity `major`

**Product differentiation:** No existing specification tool performs adversarial stress-testing. Tools like Notion, Linear, or Jira treat specs as static documents. Even AI-powered tools like Cursor or GitHub Copilot Workspace operate on a single-agent model. SpecForge would be the first to let users say "stress-test this spec" and get a battle-tested output.

**Estimated token cost:** 3-5 agents x 10 minutes = ~$3-8 per stress test at Opus pricing. Acceptable for the `thorough` preset.

### 3.2 Multi-Perspective Review Panels

**Concept:** Replace the single `reviewer` agent (BEH-SF-019) with a team of specialized reviewers that run simultaneously and debate findings in real time:

- **Security Reviewer** --- focuses on authentication, authorization, data exposure, injection vectors
- **Performance Reviewer** --- focuses on N+1 queries, memory allocation, concurrency bottlenecks
- **DX Reviewer** --- focuses on API ergonomics, naming consistency, error message quality
- **Architecture Reviewer** --- focuses on coupling, cohesion, layer violations, dependency direction

**Why Agent Teams, not concurrent subagents:** SpecForge already supports concurrent stages (BEH-SF-062). You could run 4 reviewer subagents in parallel via `concurrent: true`. But the subagent model produces 4 independent finding lists that must be merged by the feedback-synthesizer (BEH-SF-020). With Agent Teams, the reviewers can debate overlapping findings in real time: the Security Reviewer flags an overly permissive API, the DX Reviewer argues it is necessary for usability, and they reach a nuanced recommendation that a synthesizer agent could not produce from two independent reports.

**Implementation:**

1. Define a `review-panel` team configuration in the flow definition
2. Spawn the team with 4 specialized reviewer teammates, each with distinct system prompts and the same `Read`, `Glob`, `Grep` tool set (matching BEH-SF-152's reviewer profile)
3. The team lead (SpecForge orchestrator) posts the spec document as the initial task
4. Each reviewer claims sections based on their specialty
5. When reviewers produce conflicting findings, they message each other directly to resolve or escalate
6. On completion, all findings are written to the ACP session's findings layer
7. The existing convergence criteria (BEH-SF-057) evaluate the panel's output normally

**Interaction with convergence:** The review panel replaces the single-reviewer stage within Spec Forge's iteration loop. The convergence function still evaluates `criticalFindings === 0 && majorFindings === 0` as before (BEH-SF-049). The panel simply produces higher-quality findings per iteration, potentially reducing the number of iterations needed.

### 3.3 Competing Implementation Strategies

**Concept:** In the Dev Forge phase (BEH-SF-049, phase 4), instead of a single `dev-agent` implementing the task group, spawn an Agent Team where 2-3 dev agents each implement the same task independently. After implementation, a judge agent compares the approaches and selects the best one (or synthesizes a hybrid).

**Why this is valuable:** Implementation strategy decisions are among the hardest to evaluate in the abstract. By seeing two or three concrete implementations, the judge agent (and the user) can make an informed choice based on actual code rather than hypothetical trade-offs.

**Implementation:**

1. After Task Master produces task groups, the orchestrator spawns a `competing-impl` Agent Team
2. Each dev teammate receives the same task group, spec requirements, and codebase context
3. Teammates work in isolated git worktrees (each on a separate branch) to avoid file conflicts
4. A judge teammate (using `opus` model) reviews all implementations against the spec requirements and produces a comparison report
5. The user selects the winning approach (or the judge auto-selects based on test pass rate and code quality metrics)
6. The winning branch is promoted; losing branches are archived as `SessionChunk` nodes for future reference

**Git isolation strategy:** Each competing dev agent operates in its own worktree via `--worktree` or explicit `git worktree add`. The judge agent has read access to all worktrees. This maps naturally to Agent Teams' shared task list (the task is "implement X") with independent working directories.

**Cost consideration:** This multiplies the Dev Forge cost by 2-3x. Suitable only for the `thorough` preset or when explicitly requested via `--competing-impls`.

### 3.4 Live Architecture Debates

**Concept:** Before implementation begins, spawn an Agent Team where agents argue about architectural trade-offs. The user observes and acts as arbiter. One agent champions approach A, another champions approach B. They present arguments, counter-arguments, and concrete examples. The user picks a winner or asks for a synthesis.

**Why this is different from the Discovery phase:** Discovery (BEH-SF-017) is a single agent interviewing the user. An architecture debate is multiple agents arguing with each other while the user watches. The user's role shifts from interviewee to judge.

**Implementation:**

1. User invokes `specforge debate --topic "event sourcing vs CRUD for order management"`
2. SpecForge spawns an Agent Team with 2 advocate agents and 1 moderator
3. Advocate A receives: "Argue compellingly for event sourcing. Present concrete code examples, test strategies, and operational considerations."
4. Advocate B receives: "Argue compellingly for CRUD. Present concrete code examples, test strategies, and operational considerations."
5. The moderator structures the debate: opening statements, rebuttals, closing arguments
6. The user can interject with questions or constraints at any time (via team lead's mailbox)
7. The debate transcript is materialized as session chunks and linked to an `ADR` node in the graph
8. The user's final decision is recorded as an ADR with full traceability to the debate

**Product value:** This transforms architectural decision-making from a lonely exercise into a structured deliberation. Users get to see both sides argued by capable agents before committing. The debate transcript provides an audit trail richer than any ADR written after the fact.

### 3.5 Cross-Domain Expert Panels for Complex Specs

**Concept:** For specs that span multiple domains (e.g., a payment processing system touching security, compliance, API design, and database schema), spawn an Agent Team where each agent represents a domain expert. They collaboratively author sections of the spec, raising cross-cutting concerns in real time.

**Implementation:**

1. After Discovery, the orchestrator analyzes the requirements brief to identify domains
2. For each identified domain, a specialist teammate is spawned with domain-specific knowledge injected via system prompt composition (BEH-SF-157)
3. The team collaboratively produces the spec, with each expert owning their domain's sections but commenting on cross-cutting concerns
4. The plan approval gate (Agent Teams feature) is used: each expert drafts their section, sends it to the lead for approval, then implements
5. Cross-domain conflicts are resolved through direct messaging between the relevant experts

**Key difference from sequential authoring:** In the current model, a single `spec-author` (BEH-SF-018) writes the entire spec. If the spec spans security, performance, and API design, the single author may miss domain-specific nuances. A panel of domain experts catches issues that a generalist author would miss --- and catches them at authoring time rather than review time.

---

## 4. SpecForge's ACP Session as the Superior Orchestration Layer

### 4.1 Why the ACP Session Replaces Agent Teams' Task List

Agent Teams' built-in task list is a flat list with states (`pending`, `in progress`, `completed`) and dependencies. SpecForge's ACP session is vastly richer:

| Capability         | Agent Teams Task List                  | SpecForge ACP Session                                    |
| ------------------ | -------------------------------------- | -------------------------------------------------------- |
| Task states        | 3 (pending, in progress, completed)    | Full lifecycle with convergence metrics                  |
| Dependencies       | Simple "blocked until X completes"     | Graph-based dependency DAGs with cycle detection         |
| Data sharing       | File system (shared working directory) | Three-layer architecture (documents, findings, messages) |
| History            | Task status log                        | Append-only event log with replay (BEH-SF-033)           |
| Observability      | Terminal display                       | Full event stream, graph materialization, audit trail    |
| Token optimization | None (each agent reads everything)     | Delta reads since last timestamp (BEH-SF-038)            |
| Convergence        | Manual (lead decides when done)        | Metric-driven with configurable criteria (BEH-SF-057)    |
| Persistence        | Local files in `~/.claude/teams/`      | Neo4j knowledge graph with session chunk materialization |

**Verdict:** For structured, production-quality flows, SpecForge's ACP session is strictly superior to Agent Teams' task list. The ACP session should remain the primary coordination mechanism.

### 4.2 Where Agent Teams' Mailbox Beats the ACP Session

The ACP session's message routing (BEH-SF-042) is designed for structured, asynchronous exchanges: one agent posts a clarification request, the orchestrator detects it, schedules a responder, the responder answers. The minimum round-trip is two orchestrator cycles.

Agent Teams' mailbox enables real-time dialogue. Agent A messages Agent B, B responds immediately, A follows up --- all within a single execution window. This is essential for:

- Debates and arguments (multi-turn, rapid-fire)
- Negotiation over conflicting findings
- Collaborative problem-solving where the solution emerges from dialogue
- Brainstorming sessions where agents build on each other's ideas

**Verdict:** Agent Teams' direct messaging is superior for deliberative, exploratory, and adversarial interactions. SpecForge should expose it as a controlled primitive for specific flow stages.

---

## 5. The Hybrid Orchestration Model

### 5.1 Architecture

The ClaudeCodeAdapter (BEH-SF-151 through BEH-SF-160) should be extended with a `spawnTeam()` method alongside the existing `spawnAgent()`. The orchestrator decides at the stage level whether to use subagent coordination (ACP-session-mediated) or team coordination (direct messaging).

```
FlowDefinition
  Phase
    Stage (concurrent: true)           --> Subagent model (current)
    Stage (team: { agents: [...] })    --> Agent Teams model (new)
```

A stage with `team` configuration spawns an Agent Team instead of individual subagents. The team operates for a bounded duration or budget, then its outputs are captured and written to the ACP session for downstream consumption.

### 5.2 Materialization Bridge

The critical gap in Agent Teams is observability. SpecForge requires every inter-agent exchange to be auditable (BEH-SF-048). The solution is a **materialization bridge**:

1. When a team completes, the orchestrator reads all teammate conversation logs (via Claude Code's output mechanisms)
2. Each teammate's conversation is segmented into session chunks (reusing BEH-SF-009)
3. Mailbox messages between teammates are reconstructed and written to the ACP session's message layer as `kind: 'team-exchange'`
4. The team's task list completion state is mapped to ACP session findings

This post-hoc materialization satisfies the auditability requirement while allowing real-time communication during the team's execution window.

### 5.3 When to Use Which Model

| Scenario                  | Model                  | Rationale                                            |
| ------------------------- | ---------------------- | ---------------------------------------------------- |
| Structured spec authoring | Subagent + ACP Session | Deterministic, convergence-driven, token-efficient   |
| Code implementation       | Subagent + ACP Session | File write isolation, test-driven convergence        |
| Adversarial review        | Agent Teams            | Requires rapid multi-turn argumentation              |
| Architecture debate       | Agent Teams            | Deliberative, emergent, user-as-arbiter              |
| Multi-perspective review  | Agent Teams            | Cross-reviewer negotiation produces sharper findings |
| Competing implementations | Agent Teams            | Parallel independent work with judge comparison      |
| Requirements discovery    | Subagent + ACP Session | Single-agent conversational, user-interactive        |
| Feedback synthesis        | Subagent + ACP Session | Single-agent aggregation task                        |
| Task decomposition        | Subagent + ACP Session | Single-agent analytical task                         |

### 5.4 Fallback Behavior

Because Agent Teams is experimental, the hybrid model must degrade gracefully:

- If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is not set, team stages fall back to the concurrent subagent model
- The orchestrator emits a warning: "Agent Teams unavailable; falling back to concurrent subagent execution"
- All features remain functional, but deliberative quality is reduced

---

## 6. New Flow Definitions Enabled by Agent Teams

### 6.1 `spec-stress-test` Flow

A standalone flow that takes a finalized spec and stress-tests it:

**Phase 1: Context Loading** --- `codebase-analyzer` gathers relevant code and spec context
**Phase 2: Adversarial Review** --- Red/Blue Agent Team runs for up to 5 iterations or $5 budget
**Phase 3: Report** --- `feedback-synthesizer` produces a stress-test report from the team's findings

### 6.2 `architecture-debate` Flow

A conversational flow for exploring architectural trade-offs:

**Phase 1: Framing** --- `discovery-agent` in conversational mode gathers the debate topic and constraints from the user
**Phase 2: Debate** --- Agent Team with 2 advocates and 1 moderator; user observes and interjects
**Phase 3: Decision** --- `spec-author` writes an ADR from the debate transcript and user's decision

### 6.3 `thorough-review` Flow

An enhanced review flow that uses multi-perspective panels:

**Phase 1: Context** --- `codebase-analyzer` gathers scope
**Phase 2: Panel Review** --- Agent Team with 4 specialized reviewers (security, performance, DX, architecture)
**Phase 3: Synthesis** --- `feedback-synthesizer` consolidates the panel's findings
**Phase 4: Author Response** --- `spec-author` revises the spec based on panel findings

---

## 7. Token Economics

Agent Teams are expensive. SpecForge must be explicit about costs.

| Flow Stage                                 | Subagent Cost | Agent Teams Cost | Ratio    |
| ------------------------------------------ | ------------- | ---------------- | -------- |
| Single reviewer, 1 iteration               | ~$0.50        | N/A              | Baseline |
| 4 concurrent reviewers (subagent)          | ~$2.00        | N/A              | 4x       |
| 4-reviewer panel (agent teams)             | N/A           | ~$5.00           | 10x      |
| Red/Blue stress test (6 agents)            | N/A           | ~$8.00           | 16x      |
| Competing implementations (3 devs + judge) | N/A           | ~$12.00          | 24x      |

**Mitigation strategies:**

1. Agent Teams stages are opt-in, never default. The `standard` preset uses subagent-only.
2. The `thorough` preset enables team-based stages where they add clear quality value.
3. A new `--team-budget` flag caps total team spend per flow run.
4. Sonnet-class models for teammate roles where opus is not strictly necessary (e.g., DX reviewer, debate moderator).
5. Team durations are bounded --- no open-ended team execution.

---

## 8. Risks and Mitigations

### 8.1 Experimental API Stability

Agent Teams is experimental and may change or be removed. All team-related code should be behind a feature flag and adapter interface so that changes to the Agent Teams API require updates only to the `ClaudeCodeAdapter`, not to flow definitions or orchestrator logic.

### 8.2 Auditability Gap

During team execution, inter-agent communication bypasses the ACP session. The materialization bridge (Section 5.2) addresses this but introduces a window of reduced observability. For GxP-regulated environments (the GxP plugin), team-based stages should be disabled or require explicit approval.

### 8.3 Non-Determinism

Agent Teams introduce non-determinism: teammate scheduling, task claiming, and message ordering are not under SpecForge's control. This conflicts with INV-SF-9 (Flow Determinism). Mitigation: team stages are marked as `non-deterministic: true` in flow definitions, and convergence evaluation occurs on the team's aggregate output (materialized to the ACP session), not on the team's internal execution order.

### 8.4 Error Propagation

If a teammate crashes within an Agent Team, the team's error handling is opaque to SpecForge. The adapter must monitor teammate processes and map failures to `ProcessCrashError` (BEH-SF-160). Partial team results should be captured --- a team where 3 of 4 reviewers complete still produces valuable output.

---

## 9. Relationship to INV-SF-2 (Agent Session Isolation)

INV-SF-2 states: "Agent sessions are isolated from each other." Agent Teams deliberately violate this for bounded periods. The proposal is to amend INV-SF-2 with an exception:

> Agent sessions are isolated from each other **except within Agent Team stages**, where teammates may communicate directly via the Agent Teams mailbox. All team communication MUST be retroactively materialized to the ACP session event log upon team completion.

This preserves the invariant's intent (auditability) while enabling the new capabilities.

---

## 10. Implementation Roadmap

**Phase 1: Foundation** (with experimental flag)

- Extend `ClaudeCodeAdapter` with `spawnTeam()` and team lifecycle management
- Implement materialization bridge for post-hoc conversation capture
- Add `team` stage type to flow definition schema
- Feature-flag all team functionality behind `SPECFORGE_AGENT_TEAMS=1`

**Phase 2: Adversarial Review**

- Implement the `spec-stress-test` flow
- Build Red/Blue team prompt templates
- Add stress-test findings to the graph schema

**Phase 3: Multi-Perspective Panels**

- Implement review panel team configuration
- Build specialized reviewer prompt templates (security, performance, DX, architecture)
- Integrate panel output with existing convergence evaluation

**Phase 4: Advanced Capabilities**

- Implement `architecture-debate` flow
- Implement competing implementations with worktree isolation
- Build judge agent prompt templates and comparison logic

---

## 11. Conclusion

SpecForge's ACP session architecture is the right default for structured specification workflows. It provides auditability, convergence guarantees, and token efficiency that Agent Teams cannot match. But Agent Teams unlock a category of deliberative, adversarial, and exploratory capabilities that the ACP messaging pattern's strict isolation prevents.

The hybrid model --- ACP session for structure, teams for deliberation --- gives SpecForge a capability portfolio that no other tool in the specification or development space offers today. Adversarial stress-testing, multi-perspective review panels, live architecture debates, and competing implementations are features that transform spec writing from a solitary, sequential process into a collaborative, adversarial, high-confidence one.

The key architectural decision is the materialization bridge: ensuring that team-based interactions are retroactively captured in the knowledge graph so that SpecForge's graph-canonical principle (Principle 1) is preserved even when agents communicate outside the ACP session during bounded team stages.
