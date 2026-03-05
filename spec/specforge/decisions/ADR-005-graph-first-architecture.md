---
id: ADR-005
kind: decision
title: Graph-First Architecture
status: Accepted
date: 2025-03-01
supersedes: [ADR-006, ADR-007, ADR-010]
invariants: [INV-SF-10, INV-SF-7, INV-SF-8]
---

# ADR-005: Graph-First Architecture

## Context

SpecForge generates many interconnected artifacts: requirements, invariants, ADRs, findings, tasks, source files, tests, coverage entries. These artifacts have rich relationships (traceability chains, dependencies, coverage mappings). The question is: what is the canonical data store?

Earlier iterations tried:

- **Filesystem as source of truth** -- markdown files on disk, graph as derived view (original ADR-007). Problem: flat files can't express relationships. Queries like "what is affected if this requirement changes?" require parsing all documents.
- **Spec document as authority** -- the spec document is always right when code disagrees (ADR-006). This principle remains, but the storage mechanism changed.

## Decision

The Neo4j knowledge graph is the **primary structured data store** for all specification artifacts. The ACP session remains session-scoped working memory. Filesystem documents are rendered outputs.

### Data Flow

```
During flow run:
  Agents -> ACP Session -> Graph Sync -> Neo4j (canonical)
                                      -> Filesystem (rendered)

After flow completion:
  ACP Session archived -> Graph persists -> Documents are renderings
```

### Key Principles

1. **Graph is canonical** -- When graph data and a rendered document disagree, the graph is correct
2. **ACP session is ephemeral** -- Session-scoped working memory, archived after flow completion
3. **Documents are renderings** -- Generated from graph data, not the other way around
4. **Sessions are materialized** -- Agent conversations are chunked and stored in the graph ([ADR-009](./ADR-009-compositional-sessions.md))

## Rationale

1. **Structured queries** -- Graph data enables rich analytical queries: impact analysis (transitive closure), traceability gaps (missing edges), orphan detection (disconnected nodes), coverage paths (requirement -> task -> code -> test chains). These are impossible with flat files.

2. **Multiple output formats** -- The same graph data can be rendered as markdown specs, ADRs, RFCs, API docs, coverage reports, or regulatory documents. One data model, many views.

3. **Cross-session knowledge** -- Graph data persists across flow runs. Each run adds to the graph. Over time, the graph becomes a comprehensive project knowledge base. New flow runs can query prior knowledge without re-parsing documents.

4. **Session composition** -- Materializing session chunks in the graph enables compositional sessions ([ADR-009](./ADR-009-compositional-sessions.md)). Prior reasoning is queryable and reusable.

5. **CLI/CI integration** -- Automated tools can query the graph directly (via Cypher) without parsing markdown. Coverage gates, drift checks, and impact analysis work on structured data.

## Graph Infrastructure

- **Database:** Neo4j (via official Node.js driver)
- **Development:** Docker Compose for local Neo4j instance
- **Ports:** `GraphStorePort` (CRUD), `GraphQueryPort` (analytical), `GraphSyncPort` (ACP session -> graph)
- **Graceful degradation:** If Neo4j is unavailable, the ACP session continues functioning. Sync events are buffered and replayed on reconnection.

**Why Neo4j over alternatives:**
Neo4j was chosen over PostgreSQL JSON columns and ArangoDB because Cypher's pattern-matching syntax naturally expresses the analytical queries SpecForge needs: transitive closure for impact analysis, path queries for traceability chains, and subgraph extraction for neighborhood views. PostgreSQL can store graph-structured data but requires recursive CTEs for traversal queries, which are harder to write, optimize, and maintain. ArangoDB offers multi-model flexibility but has a smaller ecosystem and weaker tooling for the web-based graph visualization use case.

## Trade-offs

- **Neo4j dependency** -- Neo4j becomes a critical infrastructure component. Mitigated by graceful degradation (flows continue without graph) and Docker Compose for easy local setup.

- **Schema migrations** -- As the graph data model evolves, existing data needs migration. More consequential than with flat files. Mitigated by versioned schema definitions and migration scripts.

- **Rendering pipeline complexity** -- Transforming graph data into output documents adds a layer of complexity. Mitigated by template-based rendering with fidelity validation ([INV-SF-8](../invariants/INV-SF-8-rendering-fidelity.md)).

- **Eventual consistency** -- During sync-on-write, there's a brief window where the graph lags behind the ACP session. Acceptable because graph queries are used for analysis, not real-time agent coordination (that's the ACP session's job).

## References

- [Knowledge Graph Architecture](../architecture/c3-knowledge-graph.md) -- Full graph data model, sync, drift, rendering
- [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) -- Graph Data Persistence
- [INV-SF-8](../invariants/INV-SF-8-rendering-fidelity.md) -- Rendering Fidelity
- [INV-SF-10](../invariants/INV-SF-10-graph-acp-sync-consistency.md) -- Graph-ACP Sync Consistency
