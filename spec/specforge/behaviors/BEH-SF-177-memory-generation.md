---
id: BEH-SF-177
kind: behavior
title: Memory Generation
status: active
id_range: "177--184"
invariants: [INV-SF-14]
adrs: [ADR-013]
types: [memory, memory]
ports: [GraphQueryPort, FileSystemPort]
---

# 25 — Memory Generation

## BEH-SF-177: Graph-Backed CLAUDE.md Generation — Cypher Query to Template to Hash to Write

> **Invariant:** [INV-SF-14](../invariants/INV-SF-14-memory-artifact-traceability.md) — Memory Artifact Traceability

The system generates a project-level CLAUDE.md from the knowledge graph. Cypher queries extract accepted ADRs, critical requirements, active invariants, and port API signatures. A template engine renders them into sections. SHA-256 content hash prevents unnecessary writes.

### Contract

REQUIREMENT (BEH-SF-177): At flow start, the memory generation pipeline MUST execute Cypher queries against the knowledge graph to extract: accepted ADRs (title + decision summary), critical requirements (BEH-SF with `critical` priority), active invariants (INV-SF descriptions), and port API signatures. The pipeline MUST render these into CLAUDE.md sections using a template engine with priority ordering. The pipeline MUST compute a SHA-256 hash of the rendered content and MUST skip the write if the hash matches the existing file. The generated CLAUDE.md MUST be a `RenderedArtifact` graph node with `DERIVED_FROM` edges to all source graph nodes.

### Verification

- Generation test: populate the graph with ADRs and requirements; run the pipeline; verify CLAUDE.md contains the expected sections.
- Hash skip test: run the pipeline twice without graph changes; verify the second run skips the write.
- Traceability test: verify the `RenderedArtifact` node has `DERIVED_FROM` edges to all source nodes.
- Priority test: verify sections are ordered by priority (invariants > ADRs > requirements > port APIs).

---

## BEH-SF-178: Modular Rules from Behaviors — Path-Scoped `.claude/rules/` Files

Each behavior file generates a path-scoped rule file in `.claude/rules/`. Rules are scoped to relevant file paths so agents working in those paths automatically receive the relevant behavioral contracts.

### Contract

REQUIREMENT (BEH-SF-178): The memory generation pipeline MUST generate one `.claude/rules/{behavior-file-slug}.md` file per behavior file in the spec. Each rule file MUST contain the behavioral contracts relevant to the scoped file paths. The `pathScope` MUST be derived from the behavior file's domain (e.g., graph operations → `src/graph/**`, flow execution → `src/flow/**`). Rule files MUST be `RenderedArtifact` graph nodes with `DERIVED_FROM` edges to their source behavior nodes.

### Verification

- Rule generation test: populate the graph with behavior nodes; run the pipeline; verify rule files are created in `.claude/rules/`.
- Scope test: verify each rule file has the correct path scope annotation.
- Content test: verify rule file content matches the source behavior contracts.
- Artifact test: verify each rule file has a corresponding `RenderedArtifact` graph node.

---

## BEH-SF-179: Memory Curation Stage — Merge, Rank, Prune to 200-Line Limit

A curation stage ensures CLAUDE.md stays within its effective limit (~200 lines) by merging related content, ranking by importance, and pruning low-value content.

### Contract

REQUIREMENT (BEH-SF-179): The memory curation stage MUST merge duplicate or overlapping content across source sections. The stage MUST rank remaining content by: recency (newer = higher), reference count (more references = higher), invariant status (active = highest), and ADR acceptance status (accepted > proposed > superseded). The stage MUST prune content until the total line count is within the configured limit (default 200 lines). The curation result MUST report merged, pruned, and ranked items as a `MemoryCurationResult`.

### Verification

- Merge test: provide duplicate content from two sources; verify they are merged.
- Ranking test: provide items with different recency and reference counts; verify correct ranking.
- Prune test: provide content exceeding 200 lines; verify content is pruned to the limit.
- Result test: verify the `MemoryCurationResult` accurately reports merged, pruned, and ranked items.

---

## BEH-SF-180: Knowledge Transfer Pipeline — Session Chunks to CLAUDE.md Sections

Materialized session chunks are processed into CLAUDE.md sections, transferring agent-discovered knowledge into the persistent memory layer.

### Contract

REQUIREMENT (BEH-SF-180): When session chunks are materialized (per BEH-SF-009), the knowledge transfer pipeline MUST extract `KnowledgePattern` items from chunks using topic-based segmentation. Extracted patterns MUST be classified by type: `naming-convention`, `file-layout`, `import-ordering`, `error-handling`, `architectural-decision`, `port-api`. Patterns MUST be stored as graph nodes with `EXTRACTED_FROM` edges to their source chunks. High-confidence patterns (confidence > 0.8) MUST be candidates for CLAUDE.md inclusion at the next generation cycle.

### Verification

- Extraction test: materialize a session chunk about naming conventions; verify a `KnowledgePattern` node is created.
- Classification test: verify patterns are classified into the correct type.
- Confidence test: extract a low-confidence pattern; verify it is not included in CLAUDE.md.
- Graph linkage test: verify `EXTRACTED_FROM` edges link patterns to source chunks.

---

## BEH-SF-181: Memory Pruning — Graph Event Watching and Staleness Detection

The memory system watches graph events to detect stale memory content and prune outdated patterns.

### Contract

REQUIREMENT (BEH-SF-181): The memory pruning system MUST watch for graph events that invalidate existing memory content: ADR status changes (accepted → superseded), requirement deletions, invariant modifications. When a source node is modified or deleted, the system MUST mark all `RenderedArtifact` nodes with `DERIVED_FROM` edges to that source as stale. Stale artifacts MUST be regenerated at the next memory generation cycle. Patterns with no references for N consecutive runs (configurable, default 5) MUST be pruned from the knowledge graph.

### Verification

- Staleness test: supersede an ADR; verify the corresponding memory artifact is marked stale.
- Regeneration test: mark an artifact stale; run the generation pipeline; verify it is regenerated.
- Pruning test: create a pattern; run 6 flows without referencing it; verify it is pruned.
- Event watching test: modify a requirement; verify dependent artifacts are marked stale.

---

## BEH-SF-182: Memory as Spec Artifact — Versioned RenderedArtifact Graph Nodes

Generated memory files are treated as first-class spec artifacts with versioning, traceability, and diff support.

### Contract

REQUIREMENT (BEH-SF-182): Every generated memory file (CLAUDE.md, `.claude/rules/*`) MUST be represented as a `RenderedArtifact` graph node with: `artifactId`, `targetPath`, `contentHash`, `generatedAt`, `sourceQuery`, `sourceNodeIds`, and `templateId`. Each regeneration MUST create a new version node linked to the previous version via `SUPERSEDES` edge. The system MUST support diff queries between versions (`specforge memory diff --from <version> --to <version>`).

### Verification

- Version test: regenerate CLAUDE.md; verify a new version node is created with `SUPERSEDES` edge.
- Diff test: regenerate with changes; run diff query; verify changes are correctly identified.
- Fields test: verify all required fields are populated on the `RenderedArtifact` node.
- History test: regenerate multiple times; verify the version chain is navigable.

---

## BEH-SF-183: Evolving Agent Expertise — Per-Role Memory Specialization Over Time

Each agent role accumulates specialized knowledge patterns over multiple runs, creating role-specific expertise.

### Contract

REQUIREMENT (BEH-SF-183): The memory system MUST maintain per-role pattern collections. When a session completes, extracted patterns MUST be associated with the agent's role. Role-specific patterns MUST be included in the system prompt of future agents with the same role via `.claude/rules/` files scoped to the role's domain. Pattern confidence MUST increase when the same pattern is independently extracted by multiple sessions. Patterns MUST be versioned — updated patterns create new versions, not mutations.

### Verification

- Accumulation test: run two sessions with the same role; verify patterns accumulate.
- Confidence test: extract the same pattern from two sessions; verify confidence increases.
- Injection test: spawn an agent; verify role-specific patterns appear in its context.
- Versioning test: update a pattern; verify a new version is created.

---

## BEH-SF-184: Collective Memory Synthesis — Multi-Session Knowledge Merging

Knowledge from multiple sessions across different roles is synthesized into a collective memory representation.

### Contract

REQUIREMENT (BEH-SF-184): The collective memory synthesis MUST aggregate `KnowledgePattern` items across all roles and sessions for a project. Conflicting patterns (e.g., different naming conventions from different sessions) MUST be resolved by: (a) recency (newer wins), (b) confidence (higher wins), (c) source authority (reviewer > spec-author > dev-agent for architectural patterns). The synthesized `CollectiveMemory` MUST be queryable and MUST feed into the CLAUDE.md generation pipeline. The synthesis MUST run after every flow completion.

### Verification

- Aggregation test: complete sessions with different roles; verify patterns are aggregated.
- Conflict resolution test: create conflicting patterns; verify resolution follows the priority rules.
- Queryability test: query collective memory; verify it returns aggregated patterns.
- Timing test: complete a flow; verify synthesis runs automatically.
