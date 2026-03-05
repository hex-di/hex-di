---
id: INV-SF-35
kind: invariant
title: Dependency Graph Consistency
status: active
enforced_by: [DependencyGraphPort, GraphStorePort]
behaviors: [BEH-SF-472, BEH-SF-474, BEH-SF-475]
---

## INV-SF-35: Dependency Graph Consistency

The dependency graph is a directed acyclic subgraph of the spec knowledge graph. Every `DEPENDS_ON` edge connects two valid concept nodes. `dependentsOf(id)` (reverse traversal) and `dependenciesOf(id)` (forward traversal) MUST return consistent, complementary results: if A appears in `dependentsOf(B)`, then B MUST appear in `dependenciesOf(A)`. Cycles in the dependency subgraph are detected and reported as errors rather than causing infinite traversal. Coverage scores computed from the dependency graph MUST reflect the current graph state — stale cache entries are invalidated on any graph mutation.
