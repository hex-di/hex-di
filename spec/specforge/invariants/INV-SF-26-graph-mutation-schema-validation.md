---
id: INV-SF-26
kind: invariant
title: Graph Mutation Schema Validation
status: active
enforced_by: [BEH-SF-001, BEH-SF-003, BEH-SF-306]
behaviors: []
---

## INV-SF-26: Graph Mutation Schema Validation

No unvalidated graph mutation may reach the graph store. Every mutation MUST pass schema validation before being applied.
