---
id: INV-SF-20
kind: invariant
title: Idempotent Graph Sync
status: active
enforced_by: [GraphSyncPort.syncMessage(), content-addressed node identity, Neo4j `MERGE` semantics]
behaviors: [BEH-SF-001, BEH-SF-002, BEH-SF-004]
---

## INV-SF-20: Idempotent Graph Sync

Replaying the same ACP message through `GraphSyncPort.syncMessage()` produces the same graph state as processing it once. Graph sync operations are idempotent — duplicate messages (from retry, reconnection replay, or bounded buffer re-delivery) do not create duplicate graph nodes or corrupt relationships. Idempotency is ensured by content-addressed node identity: each sync operation uses a deterministic key derived from the message content to perform upsert-or-skip semantics.
