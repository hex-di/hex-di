---
id: ADR-013
kind: decision
title: Dual-Memory Architecture
status: Accepted
date: 2026-02-27
supersedes: []
invariants: [INV-SF-14]
---

# ADR-013: Dual-Memory Architecture

## Context

Neo4j holds the canonical knowledge graph, but agents only see their context window. There is no mechanism to automatically propagate architectural decisions, invariants, port APIs, and behavioral contracts from the graph to agent sessions. Agents start cold or rely on manually curated system prompts.

Claude Code automatically loads `CLAUDE.md` and `.claude/rules/` files into every session's context. This creates a "low-bandwidth broadcast channel" from the knowledge graph to all agent sessions.

## Decision

Implement a dual-memory architecture: Neo4j serves as **semantic memory** (what the project knows) and generated `CLAUDE.md` / `.claude/rules/` files serve as **procedural memory** (how agents act). A generator pipeline bridges the two, creating a closed-loop learning system.

## Mechanism

### 1. Graph → CLAUDE.md Generation

Cypher queries extract accepted ADRs, critical requirements, active invariants, and port API signatures. A template engine renders them into CLAUDE.md sections with priority ordering. SHA-256 content hash prevents unnecessary writes (no-op if unchanged).

### 2. Graph → .claude/rules/ Generation

Each behavior file generates a path-scoped rule file in `.claude/rules/`. Rules are scoped to relevant file paths (e.g., rules about graph operations are scoped to `src/graph/**`). Agents working in those paths automatically receive the relevant rules.

### 3. Memory Curation

A curation stage merges, ranks, and prunes memory content to stay within CLAUDE.md's effective limit (~200 lines). Ranking uses: recency, reference count, invariant status, and ADR acceptance status. Pruning removes outdated or low-relevance content.

### 4. Feedback Loop

```
Graph changes → Regenerate memory files → Agents consume → Produce session chunks → Chunks materialize to graph → Graph changes → ...
```

This creates a self-improving system where memory quality compounds across runs.

## Rationale

1. **Automatic knowledge propagation** — Architectural decisions and invariants reach every agent without manual prompt engineering.

2. **Path-scoped relevance** — `.claude/rules/` scoping ensures agents receive only relevant rules, not the entire knowledge base.

3. **No additional infrastructure** — Uses Claude Code's built-in file loading. No custom context injection mechanism needed.

4. **Versioned artifacts** — Generated files are `RenderedArtifact` graph nodes with `DERIVED_FROM` edges, enabling traceability.

5. **Compounding quality** — Each run improves the graph, which improves memory files, which improves the next run.

## Trade-offs

- **Staleness** — Memory files are regenerated at flow start, not continuously. Changes during a flow run are not reflected until the next run. Mitigated by hook-triggered regeneration on significant graph mutations.

- **200-line limit** — CLAUDE.md has diminishing returns beyond ~200 lines. Mitigated by aggressive curation and priority ranking.

- **Path scope granularity** — `.claude/rules/` scoping may be too coarse or too fine for some content. Mitigated by configurable scope patterns.

- **Generation cost** — Running Cypher queries and template rendering adds overhead at flow start. Mitigated by content hash caching (skip if unchanged).

## References

- [Memory Generation Behaviors](../behaviors/BEH-SF-177-memory-generation.md) — BEH-SF-177 through BEH-SF-184
- [Memory Types](../types/memory.md) — RenderedArtifact, GeneratorPipeline, CollectiveMemory
- [INV-SF-14](../invariants/INV-SF-14-memory-artifact-traceability.md) — Memory Artifact Traceability
