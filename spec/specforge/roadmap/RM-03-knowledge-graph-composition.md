---
id: RM-03
title: "Phase 3: Knowledge Graph & Composition"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 3: Knowledge Graph & Composition

**Goal:** Session chunk materialization, composition pipeline, NLQ.
**Source:** [dynamic-session-composition.md](../architecture/dynamic-session-composition.md), [c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md)

### Deliverables

| #         | Deliverable        | Package             | Behaviors                  | Status  |
| --------- | ------------------ | ------------------- | -------------------------- | ------- |
| WI-PH-3-1 | Session chunks     | `@specforge/server` | BEH-SF-009–011             | Planned |
| WI-PH-3-2 | Composition engine | `@specforge/server` | BEH-SF-012–015             | Planned |
| WI-PH-3-3 | NLQ engine         | `@specforge/cli`    | BEH-SF-114                 | Planned |
| WI-PH-3-4 | Graph sync (full)  | `@specforge/server` | BEH-SF-002, BEH-SF-004     | Planned |
| WI-PH-3-5 | Analytical queries | `@specforge/server` | BEH-SF-006–008, BEH-SF-115 | Planned |

### Architecture Coverage

- [dynamic-session-composition.md](../architecture/dynamic-session-composition.md) — Full pipeline
- [c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md) — SessionChunk, embeddings

### Exit Criteria

- [ ] EC-PH-3-1: Composed context bootstraps new agents from prior sessions
- [ ] EC-PH-3-2: `specforge ask` returns human-readable results
- [ ] EC-PH-3-3: Graph analytical queries work from CLI

### Risk

- Cypher query complexity for NLQ; natural language to graph query translation is error-prone — mitigate with curated query templates
