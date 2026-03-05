---
id: ADR-006
kind: decision
title: Persistent Agent Sessions
status: Superseded
superseded_by: ADR-005
date: 2026-02-26
supersedes: []
invariants: [INV-SF-2]
---

# ADR-006: Persistent Agent Sessions

## Context

The original SpecForge design treated agents as stateless function calls: spawn a subprocess, send a prompt with all context, get a response, dispose. Each iteration started a fresh agent with the full ACP session state injected as context.

This had problems:

1. **Context waste** — Every iteration re-sent the entire ACP session context, consuming tokens on information the agent had already processed
2. **No accumulated understanding** — Agents couldn't build on their own prior reasoning. A spec-author reviewing feedback in iteration 3 had no memory of writing the spec in iteration 1
3. **No conversation continuity** — Each invocation was a cold start. Agents couldn't ask follow-up questions or refine their approach based on prior interactions
4. **Token explosion** — As specs grew larger, the full-context-per-call approach became increasingly expensive

## Decision

Agents are persistent Claude Code sessions that stay alive throughout a flow. Each agent maintains its conversation context across iterations within a phase. Sessions can be paused, resumed, and their conversations materialized as chunks in the knowledge graph.

## Rationale

1. **Accumulated context** — A spec-author agent remembers what it wrote in iteration 1, what the reviewer said in iteration 2, and can make targeted revisions in iteration 3. No need to re-inject and re-process the full history.

2. **Token efficiency** — Incremental context (new findings, updated sections) is much smaller than the full ACP session dump. Agents process deltas, not full states.

3. **Richer reasoning** — With conversation continuity, agents can build chains of reasoning across iterations. The reviewer can say "I noted this coupling issue earlier and now I see it's been addressed, but the fix introduces a new concern..."

4. **Natural pause/resume** — Pausing a flow suspends the subprocess. Resuming reactivates it with the full conversation history intact. No need to reconstruct context from scratch.

5. **Session composition** — Persistent sessions produce meaningful conversation histories that can be materialized as chunks and composed into future sessions ([ADR-009](./ADR-009-compositional-sessions.md)).

## Lifecycle

```
Session created (system prompt loaded)
  → Iteration 1: receive task, process, write to ACP session
  → Iteration 2: receive new context (delta), process, write
  → ...
  → Phase converges or max iterations reached
  → Session completed: conversation materialized as chunks
```

Between iterations, the session stays alive. Between phases, sessions may be paused (if progressive mode) or continue (if batch mode).

## Trade-offs

- **Resource usage** — Persistent sessions consume OS process resources (memory, file descriptors) for their entire lifetime, not just during active processing. Mitigated by the session manager limiting concurrency and disposing idle sessions.

- **Context window limits** — Long-running sessions may approach Claude's context window limit. Mitigated by Claude Code CLI's built-in context compression and by the session manager monitoring token usage.

- **Crash recovery** — If a subprocess crashes, its conversation history is lost (unless already checkpointed). Mitigated by periodic checkpointing via `SessionSnapshotStorePort` and by materializing chunks at phase boundaries.

## ACP Alignment

With [ADR-018](./ADR-018-acp-agent-protocol.md), persistent sessions are implemented via ACP sessions:

| Original Concept                     | ACP Implementation                                  |
| ------------------------------------ | --------------------------------------------------- |
| Claude Code subprocess staying alive | ACP session with URL-based state descriptor         |
| `--session-id`/`--resume` flags      | `ACPSessionDescriptor` (id, history URL, state URL) |
| Conversation history accumulation    | ACP session history (append-only message list)      |
| Pause/resume subprocess              | ACP session state store (save/restore)              |
| Session snapshot                     | `SessionStateManager` (Memory / Redis / PostgreSQL) |

The core principle is unchanged: agents accumulate context across iterations. The mechanism shifts from OS process persistence to ACP session state persistence, enabling distributed session storage.

## References

- [Agent Sessions](../behaviors/BEH-SF-025-agent-sessions.md) — Persistent session architecture, lifecycle
- [ACP Client Behaviors](../behaviors/BEH-SF-219-acp-client.md) — BEH-SF-224 (ACP session management)
- [INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md) — Agent Session Isolation
