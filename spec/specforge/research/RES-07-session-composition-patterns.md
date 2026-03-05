---
id: RES-07
kind: research
title: Research 07 -- Session Composition Patterns
status: Research Draft
date: 2026-02-27
outcome: adr
related_adr: ADR-006
---

# Research 07 -- Session Composition Patterns

**Domain:** Session management, knowledge continuity, agent orchestration
**Depends on:** ADR-006 (Persistent Agent Sessions), ADR-009 (Compositional Sessions), BEH-SF-009 through BEH-SF-016, BEH-SF-025 through BEH-SF-032, BEH-SF-151 through BEH-SF-160

---

## Thesis

Claude Code provides three session primitives: **resume** (continue a session by ID), **fork** (branch from a session, preserving history), and **continue** (resume the most recent session). SpecForge already materializes sessions into Neo4j chunks and composes them into new sessions. The combination of these two systems -- CLI-level session continuity and graph-backed knowledge composition -- enables patterns that neither system can achieve alone.

This document catalogs eleven patterns that exploit this combination, with concrete graph schemas, CLI invocations, and behavioral contracts for each.

---

## Pattern 1: Infinite Context via Composition Cascades

### Problem

Claude Code sessions have a finite context window. Long-running spec flows accumulate context until the window fills, at which point Claude's built-in compaction kicks in and reasoning quality degrades. The agent forgets decisions made in early iterations.

### Mechanism

SpecForge monitors token usage via `stream-json` metadata (BEH-SF-155). When cumulative usage crosses a configurable threshold (e.g., 80% of the model's context window), the orchestrator:

1. Pauses the current session (BEH-SF-028).
2. Materializes the session's conversation into chunks immediately (BEH-SF-009), even though the session has not completed.
3. Runs the composition pipeline (dynamic-session-composition) against the freshly materialized chunks plus all prior chunks from the same flow run.
4. Spawns a **new** session with a new session ID, bootstrapped from the composed context (BEH-SF-026).
5. The new session receives a "continuation directive" in its system prompt that says: "You are continuing work from a prior session. The following context summarizes your prior reasoning and decisions."

The old session is archived. The new session carries forward the highest-value knowledge without the noise. From the flow engine's perspective, the agent identity is continuous -- only the underlying session ID has changed.

### Graph Schema

```
(AgentSession:old) -[:PRODUCES]-> (SessionChunk) -[:COMPOSED_INTO]-> (ComposedContext)
(AgentSession:new) -[:BOOTSTRAPPED_FROM]-> (ComposedContext)
(AgentSession:new) -[:CONTINUES]-> (AgentSession:old)
```

The `CONTINUES` relationship creates a linked list of sessions that together form one logical agent lifetime. Any query that needs the full history traverses this chain.

### CLI Invocations

```bash
# Phase 1: Original session running
claude -p --session-id "$old_id" --output-format stream-json ...

# Phase 2: Detect threshold, materialize, compose
# (internal -- no CLI call, this is server-side graph work)

# Phase 3: New session bootstrapped from composed context
claude -p --session-id "$new_id" --system-prompt "$composed_context" --output-format stream-json ...
```

### Key Property

The agent never experiences a hard context boundary. Instead of Claude's compaction silently dropping tokens, SpecForge performs an intelligent compaction that preserves the most relevant knowledge via embedding similarity and recency ranking. The graph maintains full traceability back to the original conversation turns.

---

## Pattern 2: Session Forking for A/B Spec Exploration

### Problem

When a spec-author reaches a design decision point (e.g., "should we model this as events or commands?"), the team wants to explore both paths before committing.

### Mechanism

The orchestrator forks the current session at the decision point:

1. Identify the fork trigger -- either a human review gate (BEH-SF-121) or an automated heuristic detecting a decision branch in the agent's output.
2. Fork the Claude Code session: `claude -p --resume "$session_id" --fork-session` for each branch.
3. Each fork receives a different directive: Fork A gets "Proceed with the event-based approach", Fork B gets "Proceed with the command-based approach".
4. Both forks run to completion (or to a configured turn limit).
5. The orchestrator materializes chunks from both forks and presents them side-by-side via the web dashboard (BEH-SF-133).
6. A human or a reviewer agent evaluates both paths and selects one.
7. The selected fork's session becomes the canonical continuation. The rejected fork's chunks remain in the graph, tagged with `{ branch: "rejected", reason: "..." }`.

### Graph Schema

```
(AgentSession:parent) -[:FORK_POINT]-> (ForkDecision {question, timestamp})
(ForkDecision) -[:BRANCH_A]-> (AgentSession:forkA {directive: "event-based"})
(ForkDecision) -[:BRANCH_B]-> (AgentSession:forkB {directive: "command-based"})
(ForkDecision) -[:SELECTED]-> (AgentSession:forkA)
```

### CLI Invocations

```bash
# Fork A
fork_a_id=$(claude -p --resume "$parent_id" --fork-session \
  "Proceed with the event-based approach. Write the spec accordingly." \
  --output-format json | jq -r '.session_id')

# Fork B
fork_b_id=$(claude -p --resume "$parent_id" --fork-session \
  "Proceed with the command-based approach. Write the spec accordingly." \
  --output-format json | jq -r '.session_id')
```

---

## Pattern 3: Time-Travel Debugging for Spec Decisions

### Problem

Three weeks after a spec was written, someone asks "why did we choose this approach?" The original session is gone, but its chunks are in the graph. Can we replay that decision with different inputs?

### Mechanism

1. Query the graph for the `SessionChunk` nodes from the original session, ordered by timestamp.
2. Reconstruct a "synthetic session context" from those chunks -- essentially a compressed transcript of the original conversation.
3. Spawn a new agent session bootstrapped from this synthetic context, plus an injection: "The following is a historical session. The original agent made decision X at this point. You are asked: what would you have decided if instead of constraint Y, the constraint was Z?"
4. The new agent reasons from the reconstructed context with the modified variable.
5. The result is materialized as a `WhatIfAnalysis` node linked to the original session chunks.

### Graph Schema

```
(WhatIfAnalysis {variable, originalValue, newValue, timestamp})
  -[:BASED_ON]-> (SessionChunk)*  // original chunks
  -[:PRODUCED_BY]-> (AgentSession:whatif)
  -[:DIVERGES_FROM]-> (AgentSession:original)
```

### Concrete Feature: "What-If" Command in CLI

```bash
specforge what-if \
  --session "$original_session_id" \
  --change "constraint: 'must support offline mode' -> 'always online'" \
  --question "How would the sync architecture change?"
```

The system reconstructs context from the session's chunks, injects the modified constraint, and runs a new agent session to produce the counterfactual analysis.

---

## Pattern 4: Cross-Flow Session Inheritance

### Problem

A spec-writing flow produces deep domain knowledge in the spec-author's session. When the implementation flow starts, the dev-agent begins cold -- it has to re-discover everything the spec-author already knew.

### Mechanism

SpecForge already supports cross-role composition (ADR-009). This pattern formalizes the inheritance chain:

1. When a flow completes, its sessions are materialized as usual.
2. When a downstream flow starts, the composition engine queries chunks not just from the same role, but from semantically related roles in prior flows. The query strategy (documented in dynamic-session-composition.md) already supports this via the role-to-query-pattern mapping.
3. The key addition: an `INHERITS_CONTEXT` relationship between flow runs, making the inheritance explicit in the graph.

### Inheritance Rules

| Source Flow    | Target Flow    | What Transfers                                                               |
| -------------- | -------------- | ---------------------------------------------------------------------------- |
| spec-writing   | implementation | Spec-author chunks about requirements intent, architectural rationale        |
| spec-writing   | code-review    | Reviewer chunks about quality criteria, spec-author chunks about constraints |
| implementation | code-review    | Dev-agent chunks about implementation decisions, trade-offs                  |
| code-review    | spec-writing   | Reviewer findings, coverage gaps, quality concerns                           |

### Graph Schema

```
(FlowRun:implementation) -[:INHERITS_CONTEXT]-> (FlowRun:spec-writing)
(AgentSession:dev-agent) -[:BOOTSTRAPPED_FROM]-> (ComposedContext)
(ComposedContext) -[:COMPOSED_INTO]- (SessionChunk {agentRole: "spec-author"})
```

### Key Property

The dev-agent starts its first iteration already understanding _why_ the spec says what it says -- not just what it says. This is information that exists only in session conversations, not in the spec documents themselves.

---

## Pattern 5: Session Genealogy Visualization

### Problem

After dozens of flow runs, the session graph becomes a rich but opaque history. Teams need to see how knowledge has flowed between sessions, which sessions influenced which specs, and where decision branches occurred.

### Mechanism

A dedicated web dashboard view (extending BEH-SF-133) that queries the session genealogy subgraph:

```cypher
MATCH path = (s:AgentSession)-[:CONTINUES|FORK_POINT|BOOTSTRAPPED_FROM|INHERITS_CONTEXT*1..10]-(related)
WHERE s.projectId = $projectId
RETURN path
```

### Visualization Features

1. **Timeline view** -- Sessions arranged chronologically on a horizontal axis, with fork branches displayed as lanes diverging from the parent timeline. Composition links shown as dashed arrows from source chunks to target sessions.
2. **Influence heat map** -- For a given session, highlight all sessions that contributed chunks to its composed context. Warmer colors for higher-ranked chunks.
3. **Decision tree overlay** -- For sessions with `FORK_POINT` relationships, display the decision question and which branch was selected.
4. **Knowledge flow sankey diagram** -- Show token volume flowing from source sessions through chunks through composed contexts into target sessions. Reveals which historical sessions contribute the most knowledge to current work.

### Graph Queries

```cypher
// All ancestors of a session (its full knowledge lineage)
MATCH (target:AgentSession {id: $sessionId})
MATCH (target)-[:BOOTSTRAPPED_FROM]->(ctx:ComposedContext)
MATCH (chunk:SessionChunk)-[:COMPOSED_INTO]->(ctx)
MATCH (chunk)<-[:PRODUCES]-(source:AgentSession)
RETURN source, chunk, ctx, target

// Fork history
MATCH (fork:ForkDecision)<-[:FORK_POINT]-(parent:AgentSession)
MATCH (fork)-[:BRANCH_A|BRANCH_B]->(child:AgentSession)
OPTIONAL MATCH (fork)-[:SELECTED]->(selected:AgentSession)
RETURN parent, fork, child, selected
```

---

## Pattern 6: Speculative Execution with Parallel Forks

### Problem

Choosing between three competing architectural approaches is expensive when done sequentially. The team wants to explore all three in parallel and compare results.

### Mechanism

1. The orchestrator forks the current session three times (Pattern 2, scaled up).
2. Each fork runs in a separate Claude Code subprocess, potentially on different machines in SaaS mode.
3. All three forks execute the same flow phase with different directives.
4. A **tournament evaluator** -- either a reviewer agent or a human -- receives the materialized chunks from all three forks and produces a comparative analysis.
5. The winning fork is promoted. Losing forks are archived with metadata.

### Concurrency Model

```
Parent Session (paused at decision point)
  |
  +--fork--> Session A (approach: microservices) --parallel-->
  +--fork--> Session B (approach: modular monolith) --parallel-->
  +--fork--> Session C (approach: event sourcing) --parallel-->
  |
  wait_all()
  |
  Tournament Evaluator Session (bootstrapped from all three)
  |
  Winner selected --> promoted as continuation
```

### Budget Control

Each fork gets `--max-budget-usd` set to one-third of the total phase budget. If a fork exhausts its budget, it materializes what it has and stops. The evaluator works with whatever each fork produced.

### CLI Invocations

```bash
# Parallel forks (spawned concurrently)
for approach in "microservices" "modular-monolith" "event-sourcing"; do
  claude -p --resume "$parent_id" --fork-session \
    "Explore the $approach approach for the sync subsystem." \
    --max-budget-usd 2.00 \
    --output-format json &
done
wait
```

---

## Pattern 7: Session Replay with Variable Substitution

### Problem

A completed flow produced a spec, but the team now wants to see how the spec would differ if one requirement had been different. Unlike Pattern 3 (which asks a hypothetical question), this pattern replays the entire session sequence with a structural change.

### Mechanism

1. Query all `SessionChunk` nodes from the target flow run, ordered by session and timestamp.
2. Reconstruct the sequence of tasks that were dispatched to each agent.
3. Create a `ReplayPlan` that modifies one variable (e.g., substitutes requirement text, changes a constraint, swaps a dependency).
4. Execute the replay: spawn new sessions for each agent role, bootstrap each from the original chunks up to the modification point, then let the agents run forward from the divergence.
5. The replay produces a parallel set of artifacts. A diff view in the dashboard shows what changed.

### Graph Schema

```
(ReplayRun {originalFlowRunId, variable, modification})
  -[:REPLAYS]-> (FlowRun:original)
  -[:PRODUCES]-> (FlowRun:replay)
```

### Concrete Feature

```bash
specforge replay \
  --flow-run "$original_run_id" \
  --modify-requirement "REQ-042" \
  --new-text "The system must support real-time sync with < 100ms latency" \
  --output-dir ./replay-results
```

The system replays the flow with the modified requirement and outputs the resulting spec diff.

---

## Pattern 8: Persistent Agent Personas via Cross-Project Composition

### Problem

An agent working on Project B has no knowledge of patterns discovered in Project A, even if the same team runs both. Institutional knowledge stays locked in per-project graph silos.

### Mechanism

Extend the composition query to cross project boundaries when the user belongs to the same organization. The composition engine queries:

```cypher
MATCH (chunk:SessionChunk)
WHERE chunk.orgId = $orgId
  AND chunk.agentRole = $role
  AND chunk.topic IN $relevantTopics
RETURN chunk
ORDER BY chunk.relevanceScore DESC
LIMIT 50
```

This creates an emergent "persona" -- a reviewer agent that has seen dozens of projects develops a richer understanding of code quality patterns than one that only sees the current project.

### Persona Accumulation

Over time, the graph accumulates a role-specific knowledge base:

```
Organization "Acme Corp"
  Reviewer persona:
    - 847 chunks from 23 projects
    - Top topics: "error handling", "API design", "test coverage", "naming"
    - Strongest patterns: "missing error boundary" (found in 18 projects)
```

### Privacy Controls

- Cross-project composition is opt-in at the organization level.
- Individual projects can be excluded from cross-project queries.
- Chunk content is never copied between projects -- only references via `COMPOSED_INTO` edges cross project boundaries.
- The composition engine enforces org-scoped access: chunks from org A are never composed into sessions for org B.

### Key Property

The agent does not "remember" in the human sense. It receives relevant chunks from prior projects as composed context. But the effect is the same: an agent bootstrapped with 50 high-relevance chunks from 10 prior projects performs meaningfully better on the 11th project than one starting cold.

---

## Pattern 9: Session-as-Artifact in the Graph

### Problem

Sessions are ephemeral process state. When a session ends, only its chunks survive. But the session itself -- its configuration, directives, tool usage patterns, convergence trajectory -- is valuable metadata that is currently lost.

### Mechanism

Extend the `AgentSession` node with richer metadata:

```
AgentSession {
  id, role, status, tokenCount,          // existing
  systemPromptHash,                       // SHA-256 of the composed system prompt
  toolUsageHistogram,                     // {Read: 47, Edit: 12, Bash: 8, ...}
  convergenceTrajectory,                  // [0.3, 0.5, 0.7, 0.85, 0.92]
  forkCount,                              // number of times this session was forked
  composedContextTokens,                  // tokens consumed by bootstrapped context
  effectiveContextUtilization,            // composedContextTokens / totalTokens
  parentSessionId,                        // if this is a fork or continuation
  terminalReason                          // "converged" | "budget" | "max-iterations" | "cancelled"
}
```

### Session Versioning

Each `sendTask()` call to a session creates a `SessionVersion` edge:

```
(AgentSession) -[:VERSION {iteration: 1, timestamp, taskHash}]-> (SessionState)
(AgentSession) -[:VERSION {iteration: 2, timestamp, taskHash}]-> (SessionState)
```

This enables querying "what was the session's state at iteration 3?" -- a prerequisite for Pattern 3 (time-travel) and Pattern 7 (replay).

### Analytics Queries

```cypher
// Sessions that consumed the most tokens relative to their output
MATCH (s:AgentSession)-[:PRODUCES]->(chunk:SessionChunk)
WITH s, sum(chunk.tokenCount) AS outputTokens
WHERE s.tokenCount > 0
RETURN s.id, s.role, s.tokenCount AS inputTokens, outputTokens,
       toFloat(outputTokens) / s.tokenCount AS efficiency
ORDER BY efficiency ASC
```

---

## Pattern 10: Collaborative Sessions with Priority Layering

### Problem

A human architect wants to guide an agent session in real time, injecting high-priority corrections or constraints as the agent works.

### Mechanism

1. The human opens a session view in the web dashboard (BEH-SF-133) or VS Code extension (BEH-SF-139).
2. The session is running via `claude -p --resume "$session_id"`.
3. The human submits a directive through the dashboard. The orchestrator:
   a. Pauses the current agent task at the next safe point (after the current tool use completes).
   b. Resumes the session with the human's directive prepended to the next task, tagged as `[HUMAN DIRECTIVE - HIGH PRIORITY]`.
   c. The agent processes the directive as part of its conversation and adjusts its behavior.
4. The human directive is materialized as a special `SessionChunk` with `source: "human"` and `priority: "high"`.

### Priority Layering in Composition

When future sessions compose context from this session's chunks, human-sourced chunks receive a relevance bonus:

```
finalScore = baseRelevanceScore * (1 + priorityBoost)
  where priorityBoost = 0.3 for human directives
                         0.0 for agent-generated chunks
```

This ensures that human corrections and guidance propagate forward into future sessions with higher weight than agent-generated reasoning.

### Graph Schema

```
(SessionChunk {source: "human", priority: "high", content: "Use event sourcing, not CQRS"})
  -[:PRODUCED_BY]-> (AgentSession)
  -[:INJECTED_BY]-> (User {name: "architect@acme.com"})
```

---

## Pattern 11: Graph-Backed Session Checkpointing and Rollback

### Problem

A convergence evaluation at iteration 5 reveals that the agent went off-track at iteration 3. The team wants to roll back to iteration 3 and retry with different instructions, without losing the work from iterations 1-2.

### Mechanism

At every convergence evaluation (step 10 in flow execution), the orchestrator creates a checkpoint:

1. Materialize current session chunks up to this iteration.
2. Record a `Checkpoint` node in the graph with the convergence score, iteration number, and a reference to the session's state.
3. Store the session ID at this point.

When rollback is requested:

1. Query the graph for the checkpoint at the target iteration.
2. Fork the session from that checkpoint: `claude -p --resume "$checkpoint_session_id" --fork-session`.
3. Inject corrective instructions into the forked session.
4. Continue the flow from the forked session.
5. The rolled-back iterations are preserved in the graph as `{ abandoned: true }` chunks, maintaining full audit trail.

### Graph Schema

```
(Checkpoint {iteration: 3, convergenceScore: 0.72, timestamp})
  -[:CHECKPOINTS]-> (AgentSession)
  -[:AT_ITERATION]-> (Phase {currentIteration: 3})

(AgentSession:rolledBack) -[:ABANDONED_AT]-> (Checkpoint {iteration: 5})
(AgentSession:retried) -[:FORKED_FROM]-> (Checkpoint {iteration: 3})
```

### CLI Invocations

```bash
# Rollback to iteration 3
specforge rollback --flow-run "$run_id" --to-iteration 3

# Internally:
checkpoint_session=$(specforge graph query \
  "MATCH (c:Checkpoint {flowRunId: '$run_id', iteration: 3})
   MATCH (c)-[:CHECKPOINTS]->(s:AgentSession)
   RETURN s.id" | jq -r '.[0].id')

claude -p --resume "$checkpoint_session" --fork-session \
  "Disregard your previous approach to error handling. Instead, use tagged unions for all error types." \
  --output-format stream-json
```

---

## Emergent Properties from Pattern Combinations

These patterns do not exist in isolation. Their value compounds when combined:

**Infinite Context + Cross-Flow Inheritance (1 + 4):** A spec-writing flow that spans 50 iterations across 3 composition cascades produces hundreds of chunks. When the implementation flow inherits from it, the composition engine draws from all cascades, creating a dev-agent that understands the full arc of the spec evolution -- not just its final state.

**Forking + Speculative Execution + Genealogy (2 + 6 + 5):** The genealogy view shows the full tournament tree: three parallel forks, their comparative analysis, the winner promotion. A new team member can see not just what was decided, but what alternatives were explored and why they were rejected.

**Time-Travel + Replay (3 + 7):** A what-if analysis reveals that a different constraint would have led to a different architecture. A full replay confirms the analysis by actually generating the alternative spec. The two approaches cross-validate each other.

**Persistent Personas + Collaborative Sessions (8 + 10):** A reviewer persona with cross-project knowledge receives a human directive saying "On this project, we prioritize latency over throughput." The persona adjusts its review criteria, and this adjustment propagates as a high-priority chunk into future review sessions on this project.

**Checkpointing + Forking (11 + 2):** Every convergence checkpoint is a potential fork point. The team can review checkpoints after a flow completes and retroactively explore branches from any checkpoint, even weeks later.

---

## Implementation Priority

| Priority | Pattern                    | Complexity | Value            | Depends On                             |
| -------- | -------------------------- | ---------- | ---------------- | -------------------------------------- |
| P0       | 1: Infinite Context        | Medium     | Critical         | BEH-SF-009, BEH-SF-026, BEH-SF-155     |
| P0       | 11: Checkpointing          | Medium     | Critical         | BEH-SF-028, BEH-SF-153                 |
| P1       | 4: Cross-Flow Inheritance  | Low        | High             | ADR-009, composition pipeline          |
| P1       | 9: Session-as-Artifact     | Low        | High             | Graph schema extension only            |
| P1       | 2: A/B Forking             | Medium     | High             | BEH-SF-153 (fork), dashboard diff view |
| P2       | 5: Genealogy Visualization | Medium     | Medium           | Patterns 1, 2, 4 deployed first        |
| P2       | 10: Collaborative Sessions | High       | High             | Dashboard WebSocket, pause/resume      |
| P2       | 6: Speculative Execution   | High       | Medium           | Pattern 2 + concurrency model          |
| P3       | 3: Time-Travel             | Medium     | Medium           | Pattern 9 (session versioning)         |
| P3       | 7: Replay                  | High       | Medium           | Pattern 3 + flow re-execution engine   |
| P3       | 8: Persistent Personas     | Medium     | High (long-term) | Cross-project composition queries      |

---

## Open Questions

1. **Checkpoint storage cost.** Every convergence checkpoint materializes chunks. For flows with 20+ iterations, this is significant Neo4j write load. Should checkpoints be sampled (every N iterations) or exhaustive?

2. **Fork budget allocation.** When forking 3 sessions for speculative execution, how is the budget split? Equal thirds? Or weighted by estimated complexity?

3. **Cross-project privacy boundaries.** Pattern 8 (persistent personas) requires cross-project chunk queries. What is the minimum granularity of access control -- org-level, team-level, project-level?

4. **Replay fidelity.** Pattern 7 replays a flow with a modified variable. But the original flow may have used tools that produced non-deterministic results (e.g., `Bash` commands reading live state). How deterministic can replays be?

5. **Composition depth limit.** Pattern 1 creates chains: session A's chunks compose into session B, which materializes chunks that compose into session C. How deep can this chain go before the "telephone game" degrades knowledge quality? Is there a practical limit?
