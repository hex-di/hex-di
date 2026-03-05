---
id: RM-01
title: "Phase 1: Foundation"
kind: roadmap
status: Planned
dependencies: []
---

## Phase 1: Foundation

**Goal:** Core infrastructure — graph store, ACP session, basic flow engine.
**Source:** [c3-server.md](../architecture/c3-server.md), [c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md)

### Deliverables

| #         | Deliverable             | Package             | Behaviors              | Status  |
| --------- | ----------------------- | ------------------- | ---------------------- | ------- |
| WI-PH-1-1 | Graph Store             | `@specforge/server` | BEH-SF-001–003         | Planned |
| WI-PH-1-2 | ACP Session             | `@specforge/server` | BEH-SF-033–040         | Planned |
| WI-PH-1-3 | Flow Engine (basic)     | `@specforge/server` | BEH-SF-057–058         | Planned |
| WI-PH-1-4 | Session Manager (basic) | `@specforge/server` | BEH-SF-025, BEH-SF-031 | Planned |
| WI-PH-1-5 | CLI scaffolding         | `@specforge/cli`    | BEH-SF-113             | Planned |

### Architecture Coverage

- [c3-server.md](../architecture/c3-server.md) — Flow Engine, ACP Session, Graph Sync (partial)
- [c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md) — Core node types

### Exit Criteria

- [ ] EC-PH-1-1: Single-phase flow executes with one agent
- [ ] EC-PH-1-2: ACP session events sync to Neo4j
- [ ] EC-PH-1-3: `specforge run` starts a flow from CLI

### Risk

- Neo4j availability as external dependency; mitigate with in-memory fallback for local dev
