---
id: ADR-003
kind: decision
title: Blackboard Communication Pattern
status: Superseded
superseded_by: ADR-018
date: 2025-01-15
supersedes: []
invariants: []
---

# ADR-003: Blackboard Communication Pattern

## Context

Agents need a communication mechanism. Options: direct message passing (agent-to-agent), mediator pattern (orchestrator relays all messages), or blackboard pattern (shared workspace).

## Decision

Use the blackboard pattern with three layers:

1. **Document layer** — Versioned specification documents (the primary work product)
2. **Findings layer** — Review findings with severity and status
3. **Message layer** — Inter-agent messages (clarification requests, responses, broadcasts)

Agents read from and write to a shared workspace. The orchestrator manages turn order but does not mediate content. All agents see everything on the blackboard.

## Rationale

1. **Natural fit for spec authoring** — Spec documents ARE the communication medium. The spec-author writes a document; the reviewer reads it and posts findings; the feedback-synthesizer reads all findings. The work product is the communication.

2. **Full transparency** — Every agent sees the complete blackboard state. This enables rich cross-agent awareness: the reviewer can see both the spec documents and prior findings without the orchestrator needing to explicitly route data.

3. **Easy persistence** — Serializing the blackboard = serializing the full session state. Pause/resume is straightforward: snapshot the blackboard, dispose agents, restore blackboard, respawn agents.

4. **UI observability** — The web dashboard subscribes to the same blackboard events as agents. Users see exactly what agents see, in real time.

5. **Session-scoped** — Each flow run gets its own blackboard. No cross-session pollution. After flow completion, the blackboard is archived and its structured content persists in the graph ([ADR-005](./ADR-005-graph-first-architecture.md)).

## Clarification Handling

When an agent posts a `ClarificationRequest`:

1. The orchestrator's clarification router detects the pending request
2. It schedules the target agent to respond before the flow continues
3. The target agent reads the request and posts a `ClarificationResponse` to the same thread
4. The requesting agent reads the response on its next iteration

This prevents deadlocks (an agent waiting for a response that never comes) by making clarification handling explicit in the scheduling logic.

## Trade-offs

- **Token overhead** — Agents that read the full blackboard may consume many tokens on context. Mitigated by delta review: agents receive only changed sections since their last read, not the full blackboard.

- **Write serialization** — Blackboard writes are serialized via an internal async queue (not a mutex). Each write is enqueued and processed in order. Reads are non-blocking and always see the latest committed state. The queue has no timeout — writes that fail are rejected with an error, not retried. This is acceptable because agents read far more than they write, and write operations are fast (in-memory with async graph sync).

- **No private channels** — All messages are visible to all agents. This is a feature (full observability) but means agents cannot have private conversations. For SpecForge's use case, privacy between agents is not needed.

## Superseded

This ADR is superseded by [ADR-018](./ADR-018-acp-agent-protocol.md). The blackboard communication pattern is replaced by ACP's message model:

| Blackboard Concept                      | ACP Replacement                                                 |
| --------------------------------------- | --------------------------------------------------------------- |
| Document layer (versioned specs)        | Named `ACPMessagePart` artifacts (`contentType: text/markdown`) |
| Findings layer (severity/status)        | `ACPMessage` parts with `CitationMetadata`                      |
| Message layer (clarification/broadcast) | Role-addressed `ACPMessages` (`agent/{role}`) + ACP await       |
| Blackboard event log                    | ACP session history (append-only)                               |
| `BlackboardPort`                        | `MessageExchangePort` (ACP-backed)                              |
| Delta review (`getChangesSince`)        | ACP session history since last read                             |
| Write serialization (async queue)       | ACP message ordering within session                             |

See [behaviors/BEH-SF-229-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md) for the replacement behavioral contracts.

## References

- [Blackboard](../behaviors/BEH-SF-033-blackboard.md) — Blackboard as session-scoped working memory (superseded)
- [Agent Communication](../behaviors/BEH-SF-041-agent-communication.md) — Agent communication patterns (superseded)
- [ACP Messaging](../behaviors/BEH-SF-229-acp-messaging.md) — Replacement behavioral contracts
