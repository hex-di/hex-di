---
id: INV-SF-31
kind: invariant
title: Graph Sync Rebuild Atomicity
status: active
enforced_by: [BEH-SF-002, BEH-SF-004, BEH-SF-DEPLOY-13]
behaviors: []
---

## INV-SF-31: Graph Sync Rebuild Atomicity

During a `GraphSyncService.fullRebuild()`, new events MUST be queued (not dropped). After rebuild completes, queued events MUST be replayed in order. The graph MUST NOT be in an inconsistent state during rebuild.
