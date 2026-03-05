---
id: INV-SF-10
kind: invariant
title: Graph-ACP Sync Consistency
status: active
enforced_by: [GraphSyncPort, bounded event buffer with full-rebuild fallback]
behaviors: [BEH-SF-001, BEH-SF-002, BEH-SF-004]
---

## INV-SF-10: Graph-ACP Sync Consistency

Every ACP message that triggers a graph sync eventually reaches the graph. Under normal operation, sync is immediate (sync-on-write). Under degraded conditions (Neo4j unavailable), events are buffered and replayed on reconnection. No ACP message is silently dropped.
