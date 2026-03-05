---
id: INV-SF-7
kind: invariant
title: Graph Data Persistence
status: active
enforced_by: [Neo4j transaction semantics, GraphStorePort.withTransaction()]
behaviors: [BEH-SF-001, BEH-SF-003]
---

## INV-SF-7: Graph Data Persistence

Data committed to the Neo4j knowledge graph persists across flow runs and application restarts. Graph data is the canonical store — it survives after ACP session archives are cleaned up.
