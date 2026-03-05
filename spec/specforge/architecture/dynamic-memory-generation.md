---
id: ARCH-SF-024
kind: architecture
title: Dynamic — Memory Generation Pipeline
status: active
c4_level: dynamic
---

# Dynamic — Memory Generation Pipeline

**Level:** Dynamic
**Scope:** Runtime interaction sequence for generating CLAUDE.md and `.claude/rules/` files from the knowledge graph
**Parent:** [c3-memory-generation.md](./c3-memory-generation.md) — Memory Generation subsystem

---

## Overview

This diagram traces the full memory generation pipeline from trigger through to file write, showing how graph data is queried, curated, rendered, hash-compared, and written as CLAUDE.md and rule files. The sequence fires at flow start (to build agent context) and flow completion (to capture discovered knowledge).

---

## Interaction Diagram

```mermaid
C4Dynamic
    title Dynamic Diagram for Memory Generation Pipeline

    ContainerDb(graphStore, "GraphStorePort", "Neo4j")
    Container(flowEngine, "FlowEngine")
    Container(pipeline, "MemoryGenerationPipeline")
    Container(querier, "GraphMemoryQuerier")
    Container(curator, "KnowledgeCurator")
    Container(template, "TemplateEngine")
    Container(hasher, "HashComparisonEngine")
    Container(renderer, "WorkingMemoryRenderer")
    Container(tracker, "ArtifactTracker")

    Rel(flowEngine, pipeline, "1. Triggers generation cycle at flow start/completion")
    Rel(pipeline, querier, "2. Requests source data extraction")
    Rel(querier, graphStore, "3. Executes Cypher queries: accepted ADRs, critical requirements, active invariants, port API signatures")
    Rel(graphStore, querier, "4. Returns structured source data")
    Rel(pipeline, curator, "5. Sends source data for curation")
    Rel(curator, graphStore, "6. Reads pattern confidence scores and reference counts")
    Rel(curator, pipeline, "7. Returns MemoryCurationResult (merged, ranked, pruned to 200 lines)")
    Rel(pipeline, template, "8. Renders curated data into CLAUDE.md sections")
    Rel(template, pipeline, "9. Returns rendered markdown content with priority ordering")
    Rel(pipeline, hasher, "10. Computes SHA-256 hash of rendered content")
    Rel(hasher, graphStore, "11. Reads existing RenderedArtifact content hash")
    Rel(hasher, pipeline, "12. Returns skip (hash match) or write (hash differs)")
    Rel(pipeline, renderer, "13. Writes file if hash differs")
    Rel(renderer, graphStore, "14. Creates RenderedArtifact node with DERIVED_FROM edges to all source nodes")
    Rel(renderer, tracker, "15. Registers new version")
    Rel(tracker, graphStore, "16. Creates SUPERSEDES edge to previous version")
```

---

## Step-by-Step Narrative

### Phase 1 — Graph Query (Steps 1-4)

1. **FlowEngine** triggers the `MemoryGenerationPipeline` at flow start (for agent context) or flow completion (for knowledge capture).
2. The pipeline delegates to **GraphMemoryQuerier** to extract source data.
3. The querier executes targeted Cypher queries against Neo4j:
   - Accepted ADRs: `MATCH (a:ADR {status: 'accepted'}) RETURN a.title, a.decision`
   - Critical requirements: `MATCH (r:Requirement {priority: 'critical'}) RETURN r`
   - Active invariants: `MATCH (i:Invariant {status: 'active'}) RETURN i.description`
   - Port API signatures: `MATCH (p:Port) RETURN p.name, p.signature`
4. Neo4j returns structured results.

### Phase 2 — Curation (Steps 5-7)

5. The pipeline sends all source data to the **KnowledgeCurator**.
6. The curator reads `KnowledgePattern` confidence scores and reference counts from the graph. It merges duplicates, ranks by priority (invariants > ADRs > requirements > port APIs), applies recency and reference-count weighting.
7. The curator returns a `MemoryCurationResult` with content pruned to the 200-line limit.

### Phase 3 — Rendering (Steps 8-9)

8. The pipeline passes curated data to the **TemplateEngine**.
9. The template engine renders markdown sections with priority ordering. For CLAUDE.md: project rules, invariants, critical ADR summaries, requirement highlights, port API signatures. For `.claude/rules/`: one file per behavior with path-scoped annotations.

### Phase 4 — Hash Comparison (Steps 10-12)

10. The pipeline computes a SHA-256 hash of the rendered content.
11. The **HashComparisonEngine** reads the existing `RenderedArtifact` node's `contentHash` from the graph.
12. If hashes match: skip the write (no changes). If hashes differ: proceed to write.

### Phase 5 — File Write and Tracking (Steps 13-16)

13. The **WorkingMemoryRenderer** writes the file to disk (CLAUDE.md or `.claude/rules/{slug}.md`).
14. The renderer creates a `RenderedArtifact` graph node with all required fields (`artifactId`, `targetPath`, `contentHash`, `generatedAt`, `sourceQuery`, `sourceNodeIds`, `templateId`) and `DERIVED_FROM` edges to all source graph nodes.
15. The renderer notifies the **ArtifactTracker** of the new version.
16. The tracker creates a `SUPERSEDES` edge from the new version to the previous version, maintaining the version chain.

---

## ASCII Sequence Fallback

```
FlowEngine       Pipeline        Querier         GraphStore      Curator         Template        Hasher          Renderer        Tracker
    |                |               |               |               |               |               |               |               |
    |--1.trigger---->|               |               |               |               |               |               |               |
    |                |--2.extract--->|               |               |               |               |               |               |
    |                |               |--3.cypher---->|               |               |               |               |               |
    |                |               |<--4.data------|               |               |               |               |               |
    |                |--5.curate---->|               |               |               |               |               |               |
    |                |               |               |<--6.scores----|               |               |               |               |
    |                |<--7.result----|               |               |               |               |               |               |
    |                |--8.render---->|               |               |               |               |               |               |
    |                |               |               |               |<--9.markdown--|               |               |               |
    |                |--10.hash----->|               |               |               |               |               |               |
    |                |               |               |<--11.read-----|               |               |               |               |
    |                |<--12.decide---|               |               |               |               |               |               |
    |                |--13.write---->|               |               |               |               |               |               |
    |                |               |               |<--14.node-----|               |               |               |               |
    |                |               |               |               |               |               |--15.track---->|               |
    |                |               |               |<--16.edge-----|               |               |               |               |
```

---

## References

- [Memory Generation Behaviors](../behaviors/BEH-SF-177-memory-generation.md) — BEH-SF-177 through BEH-SF-184
- [Memory Types](../types/memory.md) — RenderedArtifact, MemoryCurationResult, KnowledgePattern
- [ADR-013](../decisions/ADR-013-dual-memory-architecture.md) — Dual Memory Architecture
- [C3 Memory Generation](./c3-memory-generation.md) — Component definitions
