---
id: BEH-SF-009
kind: behavior
title: Session Materialization
status: active
id_range: "009--016"
invariants: [INV-SF-11, INV-SF-30, INV-SF-6, INV-SF-8]
adrs: [ADR-009]
types: [graph, graph, agent, agent]
ports: [CompositionPort, GraphQueryPort, MessageExchangePort]
---

# 02 — Session Materialization

## BEH-SF-009: Session Chunk Materialization — Completed Sessions Produce Immutable Chunks in Graph

> **Invariant:** [INV-SF-11](../invariants/INV-SF-11-session-chunk-immutability.md) — Session Chunk Immutability

When an agent session completes (or at periodic checkpoints), its conversation is segmented into chunks using topic-based segmentation, stored as `SessionChunk` nodes in Neo4j, and linked to the parent `AgentSession` via `PRODUCED_BY` relationships.

### Contract

REQUIREMENT (BEH-SF-009): When an agent session transitions to `completed` status, the system MUST segment its conversation into `SessionChunk` nodes and persist them in the knowledge graph. Each chunk MUST be linked to its parent `AgentSession` via a `PRODUCED_BY` relationship. Chunks MUST also be materialized at periodic checkpoints during long sessions.

### Verification

- Integration test: complete an agent session and verify `SessionChunk` nodes exist in Neo4j with `PRODUCED_BY` edges to the `AgentSession`.
- Checkpoint test: run a long session and verify chunks are materialized at intermediate checkpoints before session completion.
- Count test: verify the number of chunks is proportional to conversation length, respecting the token budget per chunk.

---

## BEH-SF-010: Chunk Metadata — Each Chunk Carries Topic, Token Count, Summary, Embedding Vector

Each `SessionChunk` node stores: `chunkId` (unique identifier), `sessionId`, `topic` (auto-generated or agent-tagged), `summary` (1-2 sentence), `tokenCount`, `embedding` (float vector for similarity search), `timestamp`, `agentRole`, `flowRunId`, and `contentHash` (SHA-256).

### Contract

REQUIREMENT (BEH-SF-010): When a session chunk is materialized, the system MUST populate all metadata properties: `chunkId`, `sessionId`, `topic`, `summary`, `tokenCount`, `embedding`, `timestamp`, `agentRole`, `flowRunId`, and `contentHash`. The `embedding` MUST be computed at materialization time using the configured embedding model. The `contentHash` MUST be a SHA-256 hash of the chunk content.

### Verification

- Property completeness test: materialize a chunk and verify all metadata fields are non-null and correctly typed.
- Embedding test: verify the `embedding` vector has the expected dimensionality (default 1536) and is stored in the Neo4j vector index.
- Hash integrity test: compute SHA-256 of chunk content independently and verify it matches `contentHash`.

---

## BEH-SF-011: Chunk Immutability — Materialized Chunks Are Never Modified

> **Invariant:** [INV-SF-11](../invariants/INV-SF-11-session-chunk-immutability.md) — Session Chunk Immutability

Once a session chunk is materialized in the knowledge graph, its content, metadata, and embeddings are never modified. Composition creates `COMPOSED_INTO` relationships referencing existing chunks — it never alters chunk data. Session chunks are exempt from cleanup and retained indefinitely.

### Contract

REQUIREMENT (BEH-SF-011): Once a `SessionChunk` node is created, the system MUST NOT modify any of its properties (content, metadata, or embedding). Any attempt to update a materialized chunk MUST be rejected. Cleanup operations MUST NOT delete `SessionChunk` nodes.

### Verification

- Immutability test: attempt to update a materialized chunk's properties via `upsertNode` and verify the operation is rejected or properties remain unchanged.
- Cleanup test: run `specforge cleanup` and verify no `SessionChunk` nodes are removed.
- Composition test: compose a context from chunks and verify the source chunks are unmodified after composition.

---

## BEH-SF-012: Composition Query — Chunks Queryable by Role, Topic, Similarity, Flow Run

Session chunks are queryable through multiple strategies: role-based (chunks from the same agent role in prior runs), topic-based (keyword matching on `topic` field), similarity-based (vector similarity via Neo4j vector index), and flow-based (all chunks from a specific flow run).

### Contract

REQUIREMENT (BEH-SF-012): The system MUST support querying session chunks by: (a) agent role filter, (b) topic keyword match, (c) vector similarity search with configurable score threshold, and (d) flow run ID. Queries MUST be composable — multiple filters applied simultaneously. Results MUST be scoped to the active project (and org where applicable).

### Verification

- Role query test: materialize chunks from different roles; query by role and verify only matching chunks are returned.
- Topic query test: materialize chunks with distinct topics; query by keyword and verify correct matches.
- Similarity query test: compute an embedding, query the vector index, verify results are ordered by score and filtered by threshold.
- Flow run query test: query by `flowRunId` and verify only chunks from that run are returned.
- Scoping test: create chunks in two projects; verify queries return only the active project's chunks.

---

## BEH-SF-013: Ranking and Deduplication — Composition Engine Scores and Deduplicates Candidate Chunks

The composition process ranks candidate chunks by relevance score, recency, and diversity (avoiding redundant chunks with overlapping content). Deduplication uses content hash comparison and embedding similarity to eliminate near-duplicate chunks.

### Contract

REQUIREMENT (BEH-SF-013): When composing a context, the system MUST rank candidate chunks by relevance score (query-specific), recency (newer chunks ranked higher), and diversity (penalizing chunks with high content overlap). Chunks with identical `contentHash` values MUST be deduplicated. Near-duplicate chunks (embedding similarity above a configurable threshold) MUST be filtered to retain only the highest-ranked variant.

### Verification

- Ranking test: provide chunks with varying timestamps and relevance scores; verify ordering matches the expected rank.
- Deduplication test: materialize two chunks with identical `contentHash`; verify only one appears in composition results.
- Diversity test: materialize several semantically similar chunks; verify the composition selects a diverse subset.

---

## BEH-SF-014: Token Budget Trimming — Composed Context Fits within Session Token Budget

The composition process trims selected chunks to fit within the target session's context budget. Each chunk is bounded (configurable, default ~4000 tokens) and the total composed context must not exceed the session's available context window.

### Contract

REQUIREMENT (BEH-SF-014): When assembling a composed context, the system MUST trim the selected chunk set so that the total token count does not exceed the target session's context budget. Chunks MUST be dropped in reverse rank order (lowest-ranked first) until the budget constraint is satisfied. The resulting `ComposedContext` node MUST record the `totalTokens` of the assembled context.

### Verification

- Budget test: provide more chunks than fit in the budget; verify the total tokens of the composed context is within limits.
- Priority test: verify that highest-ranked chunks are retained and lowest-ranked chunks are dropped first.
- Metadata test: verify the `ComposedContext.totalTokens` field accurately reflects the sum of included chunk token counts.

---

## BEH-SF-015: Auto-Composition — Chunks Auto-Materialized after Flow Runs, Opt-Out Not Opt-In

Session composition is enabled by default in all deployment modes. After each flow run completes, session chunks are automatically materialized and available for composition in subsequent runs. Users opt out of composition rather than opting in.

### Contract

REQUIREMENT (BEH-SF-015): When a flow run completes, the system MUST automatically materialize session chunks for all completed agent sessions without requiring explicit user action. The materialized chunks MUST be immediately available for composition queries in subsequent flow runs. Auto-materialization MUST be the default; disabling it requires explicit configuration.

### Verification

- Default test: complete a flow run with default config; verify chunks are materialized without any composition flags.
- Availability test: complete flow run A, start flow run B with a composition strategy; verify chunks from A are discoverable.
- Opt-out test: disable auto-materialization in config; verify chunks are not materialized after flow completion.

---

## BEH-SF-016: Rendering Pipeline — Graph Data Transforms to Output Formats without Information Loss

> **Invariant:** [INV-SF-6](../invariants/INV-SF-6-atomic-filesystem-flush.md) — Atomic Filesystem Flush
>
> **Invariant:** [INV-SF-8](../invariants/INV-SF-8-rendering-fidelity.md) — Rendering Fidelity

The rendering pipeline transforms graph data into output formats (Markdown spec, ADR, RFC, coverage report, task list, traceability matrix) through a query-transform-hash-write-record process. Rendered documents faithfully represent the graph data at the time of rendering.

### Contract

REQUIREMENT (BEH-SF-016): When `SpecStorePort.render()` is called, the system MUST query the relevant graph subgraph, apply format-specific templates, compute a content hash, write the output atomically (per [INV-SF-6](../invariants/INV-SF-6-atomic-filesystem-flush.md)), and update the `SpecFile` node with `contentHash` and `renderedAt`. The rendered output MUST faithfully represent the graph data without adding, removing, or altering information.

### Verification

- Round-trip test: create graph nodes, render to Markdown, parse the Markdown, and verify all graph data is represented.
- Format test: render the same subgraph in multiple formats; verify all contain the same information.
- Hash test: render, verify `SpecFile.contentHash` matches the SHA-256 of the output file.
- Atomicity test: simulate a write failure mid-render; verify the previous file version is preserved.

---

## Context Assembly Pipeline

**BEH-SF-392:** Context assembly MUST respect the session's token budget — the total token count of composed context MUST NOT exceed the configured maximum.

**BEH-SF-393:** Session chunks MUST be ranked by relevance score before trimming — lowest-relevance chunks are removed first when the token budget is exceeded.

**BEH-SF-394:** The composition pipeline MUST include: chunk retrieval -> relevance scoring -> budget-aware trimming -> context serialization.

---
