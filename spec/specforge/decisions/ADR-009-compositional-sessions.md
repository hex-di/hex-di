---
id: ADR-009
kind: decision
title: Compositional Sessions
status: Accepted
date: 2026-02-26
supersedes: []
invariants: [INV-SF-11]
---

# ADR-009: Compositional Sessions

## Context

Each flow run starts agents fresh. Without a mechanism to transfer knowledge across runs, agents lose all context from prior sessions: the spec-author doesn't remember architectural decisions from last week, the reviewer doesn't know about resolved findings from the previous cycle.

Simple approaches like "inject the full prior session transcript" don't scale — transcripts are too large and mostly irrelevant to the current task.

## Decision

Agent session conversations are materialized in Neo4j as immutable chunks. Chunks from different sessions can be queried, selected, and composed into new session contexts. This creates knowledge continuity across flow runs.

## Mechanism

### 1. Materialization

When an agent session completes (or at checkpoints), its conversation is segmented into chunks:

- **Topic-based segmentation** — Group turns by topic coherence
- **Size-bounded** — Each chunk stays within ~4000 tokens (configurable)
- **Metadata-rich** — Each chunk carries: topic label, summary, embedding vector, agent role, flow run ID, timestamp

Chunks are stored as `SessionChunk` nodes in Neo4j, linked to their parent `AgentSession` via `PRODUCED_BY` relationships.

### 2. Query

Relevant chunks are retrieved using multiple strategies:

| Strategy    | Query                                 | Use Case                     |
| ----------- | ------------------------------------- | ---------------------------- |
| Role-based  | `WHERE s.role = $role`                | Same-role knowledge transfer |
| Topic-based | `WHERE c.topic CONTAINS $keyword`     | Cross-role topic knowledge   |
| Similarity  | Vector index search on embeddings     | Semantic relevance           |
| Flow-based  | `WHERE fr.flowRunId = $priorRunId`    | Resume prior run context     |
| Manual      | User selects chunks in Graph Explorer | Expert curation              |

### 3. Composition

Selected chunks are assembled into a `ComposedContext` node:

```
ComposedContext
  ├── COMPOSED_INTO ← SessionChunk (from spec-author, run A)
  ├── COMPOSED_INTO ← SessionChunk (from reviewer, run A)
  └── COMPOSED_INTO ← SessionChunk (from spec-author, run B)
```

### 4. Bootstrap

The composed context is injected into a new agent session's system prompt as background knowledge. The agent starts with rich pre-existing context instead of starting cold.

```
AgentSession (new)
  └── BOOTSTRAPPED_FROM → ComposedContext
```

## Rationale

1. **Knowledge continuity** — Prior reasoning is preserved and reusable. A reviewer starting a new review cycle can be bootstrapped with chunks from prior reviews, immediately understanding the project's architectural context.

2. **Selective transfer** — Not everything transfers. Only relevant chunks are composed. A spec-author working on error handling gets chunks about error handling, not chunks about UI layout.

3. **Cross-role transfer** — A dev-agent can receive chunks from the spec-author's sessions, getting the authoring intent behind requirements. A reviewer can receive chunks from dev sessions, understanding implementation constraints.

4. **Team knowledge sharing** — Chunks from one team member's sessions can bootstrap another team member's sessions. The graph becomes shared team memory.

5. **Immutability** — Chunks are never modified after materialization ([INV-SF-11](../invariants/INV-SF-11-session-chunk-immutability.md)). Composition creates references, not copies. This ensures traceability: you can always trace a composed context back to its source chunks and their original sessions.

## Example

```
Week 1: Spec Writing Flow
  spec-author session → 12 chunks materialized
  reviewer session → 8 chunks materialized
  All chunks stored in Neo4j with topics, summaries, embeddings

Week 2: Code Review Flow (same project)
  Before starting:
    1. Query: chunks from reviewer about "coupling" and "API design"
    2. Query: chunks from spec-author about "port definitions"
    3. Compose: 5 selected chunks → ComposedContext node
    4. Bootstrap: new reviewer session starts with composed context

  Result: The reviewer immediately knows the project's architectural decisions
  and port design philosophy without re-reading all spec documents.
```

## Trade-offs

- **Storage growth** — Every session produces chunks. Over time, the graph grows. Mitigated by configurable retention policies and chunk pruning (remove low-relevance chunks after N days).

- **Embedding quality** — Chunk retrieval quality depends on embedding quality. Poor embeddings = irrelevant chunks composed into context. Mitigated by using high-quality embedding models and allowing manual curation via the web dashboard.

- **Context budget** — Composed contexts must fit within the agent's context budget. Too many chunks = truncation. The composition process includes a budget-aware trimming step that prioritizes by relevance score.

- **Stale knowledge** — Chunks from old sessions may contain outdated reasoning. Mitigated by recency weighting in composition queries and by the agent's ability to recognize and override stale context.

## References

- [Session Materialization](../behaviors/BEH-SF-009-session-materialization.md) — Session chunk materialization in the knowledge graph
- [Agent Sessions § Session Composition](../behaviors/BEH-SF-025-agent-sessions.md) — Session composition and bootstrapping
- [INV-SF-11](../invariants/INV-SF-11-session-chunk-immutability.md) — Session Chunk Immutability
- [glossary](../glossary.md) — Session Chunk, Composed Context, Compositional Session
