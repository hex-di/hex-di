---
id: INV-SF-11
kind: invariant
title: Session Chunk Immutability
status: active
enforced_by: [SessionChunk` node write-once constraint, graph sync layer]
behaviors: [BEH-SF-009, BEH-SF-011, BEH-SF-015]
---

## INV-SF-11: Session Chunk Immutability

Once a session chunk is materialized in the Neo4j knowledge graph, its content is never modified. Chunks are append-only artifacts. Composition creates references (`COMPOSED_INTO` relationships) to existing chunks — it never alters chunk content, metadata, or embeddings.
