---
id: BEH-SF-464
kind: behavior
title: Implementation Tracking & Source Traceability
status: active
id_range: 464--471
invariants: [INV-SF-33, INV-SF-34]
adrs: [ADR-005, ADR-026]
types: [tracking]
ports: [ImplementationTrackingPort, SourceTracePort]
---

# Implementation Tracking & Source Traceability

## BEH-SF-464: Behavior Implementation Status Assignment

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

Each behavior in the spec graph carries an `implementationStatus` property with one of four values: `not_started`, `in_progress`, `implemented`, or `verified`. The status follows a forward-only state machine. Backward transitions (e.g., `verified` -> `in_progress`) are rejected unless the `force` flag is set in the `StatusTransition` payload.

### Contract

REQUIREMENT (BEH-SF-464): When `ImplementationTrackingPort.setStatus(transition)` is called, the system MUST validate that the transition is forward-only (`not_started` -> `in_progress` -> `implemented` -> `verified`). Backward transitions without `force: true` MUST return `InvalidStatusTransitionError`. Successful transitions MUST update the behavior node's `implementationStatus` property and record the transition in the audit trail with `changedBy`, `changedAt`, and `reason`.

### Verification

- Unit test: call `setStatus` with a valid forward transition (`not_started` -> `in_progress`); verify the status is updated.
- Unit test: call `setStatus` with a backward transition without `force`; verify `InvalidStatusTransitionError` is returned.
- Unit test: call `setStatus` with a backward transition with `force: true`; verify the transition succeeds.
- Property check: all transitions are recorded in the graph audit trail with `changedBy`, `changedAt`, and `reason`.

---

## BEH-SF-465: Test File Mapping — `TESTED_BY` Graph Edges

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

Each behavior can be linked to one or more test files via `TESTED_BY` graph edges. `SourceTracePort.linkTestFile(behaviorId, testFilePath)` creates a directed edge from the behavior node to a `TestFile` node. The test file path is validated to exist on disk before the edge is created.

### Contract

REQUIREMENT (BEH-SF-465): When `SourceTracePort.linkTestFile(behaviorId, testFilePath)` is called, the system MUST validate that the test file exists at the specified path. If the file does not exist, the system MUST return `TestFileNotFoundError`. If valid, the system MUST create a `TESTED_BY` edge from the behavior node to the `TestFile` node (creating the node if it does not exist). Duplicate edges (same behavior, same file) MUST be idempotent — no duplicate edges are created.

### Verification

- Unit test: link a behavior to an existing test file; verify the `TESTED_BY` edge is created.
- Unit test: link a behavior to a non-existent test file; verify `TestFileNotFoundError` is returned.
- Idempotency test: link the same behavior-file pair twice; verify only one edge exists.

---

## BEH-SF-466: Source Code Traceability — `IMPLEMENTED_BY` Graph Edges

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

Each behavior can be linked to one or more source files via `IMPLEMENTED_BY` graph edges. `SourceTracePort.linkSourceFile(behaviorId, sourceFilePath)` creates a directed edge from the behavior node to a `SourceFile` node. The source file path is validated to exist on disk before the edge is created.

### Contract

REQUIREMENT (BEH-SF-466): When `SourceTracePort.linkSourceFile(behaviorId, sourceFilePath)` is called, the system MUST validate that the source file exists at the specified path. If the file does not exist, the system MUST return `SourceFileNotFoundError`. If valid, the system MUST create an `IMPLEMENTED_BY` edge from the behavior node to the `SourceFile` node (creating the node if it does not exist). Duplicate edges MUST be idempotent.

### Verification

- Unit test: link a behavior to an existing source file; verify the `IMPLEMENTED_BY` edge is created.
- Unit test: link a behavior to a non-existent source file; verify `SourceFileNotFoundError` is returned.
- Idempotency test: link the same behavior-file pair twice; verify only one edge exists.

---

## BEH-SF-467: Lifecycle Timestamps — `createdAt`/`updatedAt` on All Concepts

> **Invariant:** [INV-SF-34](../invariants/INV-SF-34-lifecycle-timestamp-monotonicity.md) — Lifecycle Timestamp Monotonicity

Every concept node in the spec graph (behavior, invariant, type, ADR, feature) carries `createdAt` and `updatedAt` ISO-8601 timestamps. `createdAt` is set at node creation and never changes. `updatedAt` is updated on every mutation and is monotonically non-decreasing.

### Contract

REQUIREMENT (BEH-SF-467): When a concept node is created, the system MUST set `createdAt` and `updatedAt` to the current timestamp. On every subsequent mutation, the system MUST update `updatedAt` to a value >= the current `updatedAt`. Any attempt to set `updatedAt` to a value earlier than the current value MUST be rejected. `createdAt` MUST never be modified after initial creation.

### Verification

- Unit test: create a concept node; verify both `createdAt` and `updatedAt` are set.
- Unit test: mutate a concept node; verify `updatedAt` is updated and `createdAt` is unchanged.
- Unit test: attempt to set `updatedAt` to an earlier value; verify the mutation is rejected.

---

## BEH-SF-468: Batch Status Query — List All Statuses with Filtering

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

`ImplementationTrackingPort.listStatuses(filter)` returns an `ImplementationStatusReport` containing all behavior statuses matching the filter criteria (status, behavior file, phase, date range). The report includes a `StatusSummary` with counts per status.

### Contract

REQUIREMENT (BEH-SF-468): When `ImplementationTrackingPort.listStatuses(filter)` is called, the system MUST return an `ImplementationStatusReport` containing all behavior status entries matching the filter. If no filter is provided, all behaviors MUST be returned. The `summary` field MUST contain accurate counts for each status category. Results MUST be ordered by behavior ID.

### Verification

- Unit test: query with no filter; verify all behaviors are returned with correct summary counts.
- Unit test: query with `status: 'implemented'`; verify only matching behaviors are returned.
- Unit test: query with `behaviorFile` filter; verify only behaviors from that file are returned.

---

## BEH-SF-469: Automatic Status Inference from Test Results

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

When test results are imported via `ImplementationTrackingPort.importTestResults(results)`, the system automatically infers status transitions. A behavior with all linked tests passing transitions to `verified`. A behavior with at least one linked test but some failing remains at `implemented`. A behavior with no linked tests remains at its current status.

### Contract

REQUIREMENT (BEH-SF-469): When `importTestResults(results)` is called, the system MUST match test results to behaviors via `TESTED_BY` edges, then automatically apply status transitions: all tests pass -> `verified`, some fail -> `implemented` (if currently `verified`, force-downgrade with reason `test_failure`). Behaviors with no linked tests MUST NOT have their status changed. Each inferred transition MUST be recorded with `changedBy: 'system:test-inference'`.

### Verification

- Unit test: import passing test results for a behavior; verify status transitions to `verified`.
- Unit test: import failing test results for a `verified` behavior; verify status downgrades to `implemented`.
- Unit test: import results with no matching behavior; verify no status changes occur.

---

## BEH-SF-470: Source File Change Detection — Staleness Alerts

> **Invariant:** [INV-SF-34](../invariants/INV-SF-34-lifecycle-timestamp-monotonicity.md) — Lifecycle Timestamp Monotonicity

`SourceTracePort.detectStaleness()` compares the `updatedAt` timestamp of each `SourceFile` node against the last verification timestamp of linked behaviors. When a source file has been modified after its linked behavior was last verified, the behavior is flagged as potentially stale.

### Contract

REQUIREMENT (BEH-SF-470): When `SourceTracePort.detectStaleness()` is called, the system MUST compare each `SourceFile` node's `updatedAt` against the `lastVerifiedAt` of linked behaviors (via `IMPLEMENTED_BY` edges). Behaviors where `sourceFile.updatedAt > behavior.lastVerifiedAt` MUST be included in the `StalenessAlert` array with `behaviorId`, `lastVerifiedAt`, `sourceFileChangedAt`, and `staleByDays`. Behaviors with no source file links MUST NOT appear in staleness alerts.

### Verification

- Unit test: modify a source file after verifying its linked behavior; verify a staleness alert is generated.
- Unit test: verify a behavior after its source file was last modified; verify no staleness alert.
- Unit test: query staleness for a behavior with no source file links; verify no alert.

---

## BEH-SF-471: Implementation Tracking Graph Schema

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

The implementation tracking subsystem extends the spec knowledge graph with the following node labels and relationship types: `TestFile` nodes (path, contentHash), `SourceFile` nodes (path, contentHash, updatedAt), `TESTED_BY` edges (behavior -> test file), `IMPLEMENTED_BY` edges (behavior -> source file), and `implementationStatus` property on all behavior nodes.

### Contract

REQUIREMENT (BEH-SF-471): The graph schema MUST include `TestFile` and `SourceFile` node labels with `path` and `contentHash` properties, `TESTED_BY` and `IMPLEMENTED_BY` directed edge types, and `implementationStatus` as a required property on all behavior nodes (default: `not_started`). Schema validation (via `GraphStorePort.validateSchema()`) MUST reject nodes/edges that do not conform to this schema.

### Verification

- Unit test: create a `TestFile` node with required properties; verify schema validation passes.
- Unit test: create a `TESTED_BY` edge between a behavior and test file; verify schema validation passes.
- Unit test: attempt to create a `TESTED_BY` edge between two behavior nodes; verify schema validation rejects it.
- Unit test: verify all behavior nodes have `implementationStatus` property with a valid value.

---
