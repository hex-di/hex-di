---
id: BEH-SF-582
kind: behavior
title: Spec Component Graph
status: active
id_range: 582--585
invariants: [INV-SF-7, INV-SF-35]
adrs: [ADR-005]
types: [graph]
ports: [SpecComponentGraphPort]
---

# 49 — Spec Component Graph

**ADR:** [ADR-005](../decisions/ADR-005-graph-first-architecture.md)

---

## BEH-SF-582: Spec Component Graph Assembly

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

The spec component graph is a DAG assembled from all spec components: capabilities (UX), features (FEAT), behaviors (BEH), invariants (INV), ADRs, and risk assessments (FM). Relationships are derived from cross-references in frontmatter and content.

### Contract

REQUIREMENT (BEH-SF-582): `SpecComponentGraphPort.assembleGraph(projectId)` MUST return a `SpecComponentGraph` containing nodes for every capability, feature, behavior, invariant, ADR, and risk assessment in the project. Nodes MUST include `id`, `kind` (`"capability"` | `"feature"` | `"behavior"` | `"invariant"` | `"adr"` | `"risk-assessment"`), `title`, and `status`. Edges MUST be derived from: (1) capability-to-feature references (`features` frontmatter), (2) capability-to-behavior references (`behaviors` frontmatter), (3) behavior-to-invariant references, (4) behavior-to-ADR references, (5) feature-to-behavior references, (6) risk-assessment-to-behavior references. The graph MUST compute `depth` levels: features at depth 0, capabilities at depth 1, behaviors at depth 2, invariants and ADRs at depth 3, risk assessments at depth 4. Isolated nodes (no edges) MUST be included and flagged as `orphan: true`.

### Verification

- Unit test: Graph includes nodes for all spec component kinds
- Unit test: Edges match frontmatter cross-references
- Unit test: Depth levels are correctly computed
- Unit test: Orphan nodes are flagged
- Integration test: Graph assembly from a real spec directory produces a valid DAG

---

## BEH-SF-583: Spec Component Traceability Navigation

> **Invariant:** None

Users can select any node in the spec component graph and navigate upstream (what depends on this) and downstream (what this depends on) to trace requirements through the full chain.

### Contract

REQUIREMENT (BEH-SF-583): `SpecComponentGraphPort.traceUpstream(nodeId)` MUST return all nodes that transitively reference the given node (e.g., from a behavior, trace upstream to capabilities, features). `SpecComponentGraphPort.traceDownstream(nodeId)` MUST return all nodes that the given node transitively references (e.g., from a capability, trace downstream to behaviors, invariants, ADRs). Both queries MUST include the relationship type and distance (hop count) for each result node. Traces MUST handle cycles without infinite recursion (terminate at visited nodes). The dashboard MUST highlight the trace path in the graph visualization, dimming unrelated nodes. `SpecComponentGraphPort.traceChain(fromNodeId, toNodeId)` MUST return all paths between two nodes, or an empty array if no path exists.

### Verification

- Unit test: `traceUpstream` from a behavior returns capabilities and features
- Unit test: `traceDownstream` from a capability returns behaviors, invariants, ADRs
- Unit test: Cycle handling terminates without infinite recursion
- Unit test: `traceChain` returns paths between connected nodes
- Unit test: `traceChain` returns empty array for disconnected nodes
- Unit test: Distance (hop count) is correct for each result node

---

## BEH-SF-584: Spec Component Coverage Overlay

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-coverage-completeness.md) — Coverage Completeness

The coverage overlay colors nodes in the spec component graph by implementation status and test coverage, providing a visual health map of the specification.

### Contract

REQUIREMENT (BEH-SF-584): `SpecComponentGraphPort.computeCoverageOverlay(projectId)` MUST return a `CoverageOverlay` mapping each node ID to a `CoverageStatus` containing `implementationStatus` (`"not-started"` | `"in-progress"` | `"implemented"` | `"verified"`), `testCoverage` (percentage 0--100), and `color` (computed from status: red for not-started, yellow for in-progress, green for implemented, blue for verified). Implementation status MUST be derived from linked `Implementation` nodes in the graph (BEH-SF-464). Test coverage MUST be derived from linked `TestCase` nodes (BEH-SF-472). Behaviors without any `Implementation` link MUST default to `"not-started"`. The overlay MUST include aggregate statistics: total nodes, per-status counts, and average test coverage. The dashboard MUST render the overlay as colored node backgrounds in the spec component graph.

### Verification

- Unit test: Nodes without implementations have `status: "not-started"` and red color
- Unit test: Nodes with implementations have correct status based on implementation state
- Unit test: Test coverage percentage is correctly computed
- Unit test: Aggregate statistics include per-status counts
- Unit test: Color mapping follows the defined scheme

---

## BEH-SF-585: Spec Component Impact Analysis

> **Invariant:** None

When a behavior, ADR, or invariant changes, impact analysis computes the blast radius — all spec components that are directly or transitively affected.

### Contract

REQUIREMENT (BEH-SF-585): `SpecComponentGraphPort.analyzeImpact(nodeId)` MUST return a `SpecImpactResult` containing: `directlyAffected` (nodes with a direct edge to the changed node), `transitivelyAffected` (nodes reachable via transitive closure, excluding the changed node), `totalAffected` (count of all unique affected nodes), and `affectedByKind` (counts grouped by node kind). For a changed behavior, the impact MUST include: upstream capabilities and features that reference the behavior, downstream invariants and ADRs the behavior references, and risk assessments linked to the behavior. For a changed ADR, the impact MUST include all behaviors referencing the ADR and their upstream capabilities/features. The analysis MUST compute a `severity` score: `"low"` (5 or fewer affected), `"medium"` (6--15 affected), `"high"` (more than 15 affected). The dashboard MUST render the impact as a highlighted subgraph with the changed node at the center.

### Verification

- Unit test: Changing a behavior includes upstream capabilities in the impact
- Unit test: Changing an ADR includes all referencing behaviors
- Unit test: Transitive closure reaches features from changed invariants
- Unit test: `affectedByKind` counts are correct
- Unit test: Severity score thresholds are applied correctly
- Unit test: Changed node itself is not included in the affected set
