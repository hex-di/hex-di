---
id: ARCH-SF-014
kind: architecture
title: C3 — Memory Generation
status: active
c4_level: L3
---

# C3 — Memory Generation

**Level:** C3 (Component)
**Scope:** Internal components of the memory generation and knowledge curation pipeline
**Parent:** [c3-server.md](./c3-server.md) — SpecForge Server

---

## Overview

The Memory Generation subsystem produces and maintains CLAUDE.md files and `.claude/rules/` files from the knowledge graph. It implements the dual-memory architecture: a graph-backed generation pipeline extracts ADRs, requirements, invariants, and port APIs via Cypher queries, renders them through templates, and writes files only when content has changed (SHA-256 hash comparison). A curation stage merges, ranks, and prunes content to stay within the 200-line effective limit.

---

## Component Diagram

```mermaid
C4Component
    title Component Diagram for Memory Generation

    Container_Boundary(memory, "Memory Generation Pipeline") {
        Component(pipeline, "MemoryGenerationPipeline", "TypeScript", "Orchestrates the full generation cycle: query -> render -> hash -> write. Triggered at flow start and flow completion.")
        Component(graphQuerier, "GraphMemoryQuerier", "TypeScript", "Executes Cypher queries to extract accepted ADRs, critical requirements, active invariants, and port API signatures from the knowledge graph.")
        Component(templateEngine, "TemplateEngine", "TypeScript", "Renders extracted graph data into CLAUDE.md sections and .claude/rules/ files using priority-ordered templates.")
        Component(hashEngine, "HashComparisonEngine", "TypeScript", "Computes SHA-256 content hashes. Compares against existing file hashes to skip unnecessary writes.")
        Component(renderer, "WorkingMemoryRenderer", "TypeScript", "Writes rendered content to CLAUDE.md and .claude/rules/{slug}.md files. Creates RenderedArtifact graph nodes with DERIVED_FROM edges.")
        Component(curator, "KnowledgeCurator", "TypeScript", "Merges duplicate content, ranks by recency/reference-count/status, prunes to 200-line limit. Produces MemoryCurationResult.")
        Component(artifactTracker, "ArtifactTracker", "TypeScript", "Maintains RenderedArtifact version chains via SUPERSEDES edges. Supports diff queries between versions. Watches graph events for staleness detection.")
    }

    Container_Boundary(ext, "External Components") {
        Component(flowEngine, "FlowEngine", "", "Triggers memory generation at flow start/completion")
        Component(graphStore, "GraphStorePort", "", "Neo4j knowledge graph interface")
        Component(sessionMgr, "SessionManager", "", "Provides materialized session chunks for knowledge transfer")
    }

    Rel(flowEngine, pipeline, "Triggers generation cycle")
    Rel(pipeline, graphQuerier, "Step 1: Extract source data")
    Rel(graphQuerier, graphStore, "Executes Cypher queries for ADRs, requirements, invariants, port APIs")
    Rel(pipeline, curator, "Step 2: Merge, rank, prune content")
    Rel(pipeline, templateEngine, "Step 3: Render sections from curated data")
    Rel(pipeline, hashEngine, "Step 4: Compare content hash against existing files")
    Rel(pipeline, renderer, "Step 5: Write files if hash differs")
    Rel(renderer, graphStore, "Creates RenderedArtifact nodes with DERIVED_FROM edges")
    Rel(artifactTracker, graphStore, "Maintains version chains and staleness markers")
    Rel(sessionMgr, pipeline, "Feeds materialized session chunks for knowledge transfer")
    Rel(curator, graphStore, "Reads pattern confidence scores and reference counts")
```

---

## Component Descriptions

| Component                    | Responsibility                                                                                                                                                                                                                            | Key Interfaces                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **MemoryGenerationPipeline** | Top-level orchestrator for the generation cycle. Coordinates query -> curate -> render -> hash -> write stages. Triggered at flow start (for agent context) and flow completion (for knowledge capture).                                  | `generate(projectId)`, `generateRules(projectId)`                   |
| **GraphMemoryQuerier**       | Executes targeted Cypher queries: accepted ADRs (title + decision summary), critical requirements, active invariants, port API signatures. Returns structured data for template rendering.                                                | `queryMemorySources(projectId)`                                     |
| **TemplateEngine**           | Renders graph data into markdown sections with priority ordering: invariants > ADRs > requirements > port APIs. Supports per-behavior rule file rendering with path scope annotations.                                                    | `renderClaudeMd(sources)`, `renderRule(behavior, scope)`            |
| **HashComparisonEngine**     | Computes SHA-256 content hashes for rendered output. Compares against stored hashes on existing `RenderedArtifact` nodes. Returns skip/write decision.                                                                                    | `shouldWrite(content, existingHash)`                                |
| **WorkingMemoryRenderer**    | File writer that creates/updates CLAUDE.md and `.claude/rules/` files. Creates `RenderedArtifact` graph nodes with all required fields (artifactId, targetPath, contentHash, sourceNodeIds, templateId).                                  | `writeMemoryFile(path, content, sources)`                           |
| **KnowledgeCurator**         | Enforces the 200-line limit by merging duplicate content, ranking by recency + reference count + status, and pruning low-value items. Extracts `KnowledgePattern` items from session chunks. Classifies patterns by type.                 | `curate(sources)`, `extractPatterns(chunks)`                        |
| **ArtifactTracker**          | Maintains version history via `SUPERSEDES` edges between `RenderedArtifact` nodes. Watches for graph events (ADR superseded, requirement deleted, invariant modified) to mark artifacts stale. Prunes unreferenced patterns after N runs. | `trackVersion(artifact)`, `markStale(sourceNodeId)`, `diff(v1, v2)` |

> **Memory generation timing (M03):** Memory generation is triggered at flow start (bootstrap from project scaffold) and flow completion (persist findings, decisions, artifacts). There are no mid-flow incremental memory updates; the graph sync handles real-time event projection separately.

---

## Relationships to Parent Components

| From                  | To                       | Relationship                                                 |
| --------------------- | ------------------------ | ------------------------------------------------------------ |
| FlowEngine            | MemoryGenerationPipeline | Triggers generation at flow start and completion             |
| GraphMemoryQuerier    | GraphStorePort           | Reads ADRs, requirements, invariants, port APIs via Cypher   |
| WorkingMemoryRenderer | GraphStorePort           | Creates RenderedArtifact nodes with DERIVED_FROM edges       |
| ArtifactTracker       | GraphStorePort           | Maintains version chains, watches events, marks staleness    |
| SessionManager        | MemoryGenerationPipeline | Provides session chunks for knowledge transfer pipeline      |
| KnowledgeCurator      | GraphStorePort           | Reads and updates KnowledgePattern confidence and references |

---

## References

- [ADR-013](../decisions/ADR-013-dual-memory-architecture.md) — Dual Memory Architecture
- [Memory Generation Behaviors](../behaviors/BEH-SF-177-memory-generation.md) — BEH-SF-177 through BEH-SF-184
- [Memory Types](../types/memory.md) — RenderedArtifact, KnowledgePattern, MemoryCurationResult, CollectiveMemory
- [INV-SF-14](../invariants/INV-SF-14-memory-artifact-traceability.md) — Memory Generation Invariant
