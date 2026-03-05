---
id: BEH-SF-536
kind: behavior
title: Reactive Graph Pipeline
status: active
id_range: 536--543
invariants: [INV-SF-31, INV-SF-7, INV-SF-10, INV-SF-20]
adrs: [ADR-001, ADR-005]
types: [graph, graph, hooks]
ports: [GraphSubscriptionPort, MutationPipelinePort, GraphStorePort]
---

# 43 — Reactive Graph Pipeline

**Architecture:** [c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md)

---

## BEH-SF-536: Reactive Query Registration — Subscribe to Parameterized Graph Queries

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Clients subscribe to parameterized graph queries via `GraphSubscriptionPort.subscribe(query, params)`. The subscription is a named, persistent listener that re-evaluates its query whenever a graph mutation touches nodes or edges matching the query's scope. Each subscription receives a unique `subscriptionId` and an initial result snapshot on creation.

### Contract

REQUIREMENT (BEH-SF-536): When `GraphSubscriptionPort.subscribe(query, params)` is called, the system MUST register a reactive subscription, assign a unique `subscriptionId`, execute the query immediately to produce an initial `QueryResult` snapshot, and return a `Subscription` handle containing the `subscriptionId` and the initial result. The subscription MUST re-evaluate the query when any graph mutation creates, updates, or deletes nodes or edges that fall within the query's scope (determined by label and property pattern matching). Re-evaluation MUST be debounced with a configurable window (default: 50ms) to batch rapid mutations into a single re-evaluation cycle.

### Verification

- Unit test: subscribe to a query matching `Requirement` nodes; create a new `Requirement` node; verify the subscription callback fires with updated results.
- Unit test: verify the `subscriptionId` is unique across concurrent subscriptions.
- Initial snapshot test: subscribe and verify the initial `QueryResult` contains all existing matching nodes.
- Debounce test: create 10 nodes within 20ms; verify only 1 re-evaluation occurs after the debounce window.

---

## BEH-SF-537: Subscription Lifecycle — Create, Pause, Resume, and Destroy

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Subscriptions follow a four-state lifecycle: `active` (receiving updates), `paused` (mutations tracked but not delivered), `resumed` (delivers accumulated delta on resume), and `destroyed` (resources released). Pausing avoids wasteful computation when the subscriber is temporarily not consuming updates.

### Contract

REQUIREMENT (BEH-SF-537): `GraphSubscriptionPort` MUST support four lifecycle operations: `subscribe()` creates an `active` subscription; `pause(subscriptionId)` transitions it to `paused` — mutations MUST still be tracked but callbacks MUST NOT fire; `resume(subscriptionId)` transitions from `paused` to `active` and MUST deliver a single delta covering all mutations that occurred during the pause; `destroy(subscriptionId)` MUST release all resources (listeners, cached results, internal state) and MUST reject subsequent operations on that `subscriptionId` with `SubscriptionNotFoundError`. Calling `pause` on a destroyed subscription MUST return `SubscriptionNotFoundError`. Calling `resume` on an already-active subscription MUST be a no-op.

### Verification

- Lifecycle test: create → pause → mutate graph → resume; verify delta delivered on resume covers the paused-period mutations.
- Destroy test: destroy a subscription; attempt `pause`; verify `SubscriptionNotFoundError`.
- Resource cleanup test: destroy a subscription; verify internal listener count decreases by 1.
- Idempotent resume test: call `resume` on an active subscription; verify no error and no duplicate delivery.

---

## BEH-SF-538: Delta Computation and Delivery — Diff Previous/Current Results

Reactive subscriptions deliver changes as deltas, not full snapshots. The delta engine diffs the previous query result against the current result and produces an `added`, `removed`, and `updated` partition. Only the delta is sent to the subscriber, minimizing bandwidth and rendering overhead.

### Contract

REQUIREMENT (BEH-SF-538): When a subscription re-evaluates its query after a graph mutation, the system MUST compute a delta between the previous and current `QueryResult`. The delta MUST contain three arrays: `added` (nodes/edges present in current but absent from previous), `removed` (present in previous but absent from current), and `updated` (present in both but with changed properties, identified by differing `contentHash` or `updatedAt` timestamps). The subscriber callback MUST receive a `SubscriptionDelta` containing `subscriptionId`, `sequenceNumber` (monotonically increasing), `added`, `removed`, `updated`, and `evaluationTimeMs`. If the delta is empty (no effective changes), the callback MUST NOT fire.

### Verification

- Add test: subscribe, then create a node; verify delta has 1 `added` entry, 0 `removed`, 0 `updated`.
- Remove test: subscribe with existing nodes, delete one; verify delta has 1 `removed` entry.
- Update test: subscribe, update a node's property; verify delta has 1 `updated` entry with the new property value.
- Empty delta test: mutate a node outside the subscription scope; verify callback does not fire.
- Sequence test: trigger 3 deltas; verify `sequenceNumber` values are 1, 2, 3.

---

## BEH-SF-539: Mutation Pipeline Stage Registration — Ordered Middleware for Graph Writes

> **Invariant:** [INV-SF-20](../invariants/INV-SF-20-idempotent-graph-sync.md) — Idempotent Graph Sync

The mutation pipeline is a chain of ordered middleware stages that intercept every graph write (create, update, delete). Stages are registered with a numeric `order` (lower runs first) and a `phase` (`pre-commit` or `post-commit`). This enables validation, transformation, auditing, and side-effect dispatch as composable, testable units.

### Contract

REQUIREMENT (BEH-SF-539): `MutationPipelinePort.registerStage(stage)` MUST accept a `MutationStage` with `id` (unique string), `phase` (`"pre-commit"` or `"post-commit"`), `order` (integer), and `handler` (async function receiving `MutationContext`). Stages MUST execute in ascending `order` within each phase. Registering a stage with a duplicate `id` MUST return `DuplicateStageError`. Registering a stage with a non-integer `order` MUST return `InvalidStageOrderError`. The pipeline MUST support at least 100 registered stages without performance degradation. `MutationPipelinePort.listStages()` MUST return all registered stages sorted by phase then order.

### Verification

- Registration test: register 3 stages at orders 10, 20, 30; verify `listStages()` returns them in order.
- Duplicate test: register a stage with an existing `id`; verify `DuplicateStageError`.
- Phase ordering test: register pre-commit (order 10) and post-commit (order 5); verify pre-commit executes before post-commit regardless of order values.
- Scale test: register 100 stages; verify all execute within acceptable latency bounds.

---

## BEH-SF-540: Pre-Mutation Validation Gate — Synchronous Constraint Enforcement

Pre-commit stages run synchronously before a graph mutation is committed. A validation gate is a pre-commit stage that checks constraints (schema conformance, required properties, uniqueness invariants) and can reject the mutation by returning a `ValidationGateResult` with `reject: true`.

### Contract

REQUIREMENT (BEH-SF-540): Pre-commit stages MUST execute synchronously in order before the graph mutation is committed. Each pre-commit stage handler MUST return a `ValidationGateResult` with `pass: boolean` and optional `reason: string`. If any pre-commit stage returns `pass: false`, the mutation MUST be rejected — the pipeline MUST NOT commit the mutation, MUST NOT execute subsequent pre-commit stages, and MUST return a `MutationRejectedError` containing the rejecting stage's `id` and `reason`. If all pre-commit stages return `pass: true`, the mutation MUST proceed to commit. Pre-commit stage execution time MUST be bounded by a configurable timeout (default: 5 seconds per stage); exceeding the timeout MUST be treated as `pass: false` with `reason: "stage_timeout"`.

### Verification

- Pass test: register a validation gate that returns `pass: true`; submit a mutation; verify it commits successfully.
- Reject test: register a gate that returns `pass: false` with reason "missing required label"; submit a mutation; verify `MutationRejectedError` with correct reason.
- Short-circuit test: register gates A (pass) and B (reject) and C (pass); verify C does not execute when B rejects.
- Timeout test: register a gate that sleeps for 10 seconds (timeout is 5s); verify rejection with `reason: "stage_timeout"`.

---

## BEH-SF-541: Post-Mutation Side-Effect Dispatch — Async Cross-Module Effects

Post-commit stages execute asynchronously after a graph mutation has been committed. They are used for side effects: notifying subscribers, triggering downstream flows, syncing external systems. Post-commit stage failures do not roll back the committed mutation.

### Contract

REQUIREMENT (BEH-SF-541): Post-commit stages MUST execute asynchronously after the graph mutation has been committed. Each post-commit stage handler MUST receive a `PostMutationContext` containing the committed `MutationResult` (affected node/edge IDs, operation type, timestamp). Post-commit stages MUST execute in ascending `order`. A post-commit stage failure MUST be logged as a warning but MUST NOT roll back the committed mutation and MUST NOT prevent subsequent post-commit stages from executing. The pipeline MUST emit a `PipelineCompleteEvent` after all post-commit stages have finished (or timed out), including `stageResults` with per-stage success/failure status and `totalPipelineTimeMs`.

### Verification

- Dispatch test: register a post-commit stage; commit a mutation; verify the stage receives the `MutationResult` with correct affected IDs.
- Non-blocking test: register a post-commit stage that throws; verify the mutation remains committed.
- Order test: register post-commit stages at orders 10 and 20; verify stage 10 completes before stage 20 starts.
- Completion event test: commit a mutation with 3 post-commit stages; verify `PipelineCompleteEvent` includes all 3 stage results.

---

## BEH-SF-542: Conditional Mutation with Precondition Check — Content-Hash Gating

> **Invariant:** [INV-SF-20](../invariants/INV-SF-20-idempotent-graph-sync.md) — Idempotent Graph Sync

Optimistic concurrency is implemented via content-hash preconditions. A client reads a node's `contentHash`, performs local computation, and submits a mutation with `expectedHash`. If the node's current hash differs from the expected hash, the mutation is rejected with `ConflictError` instead of silently overwriting.

### Contract

REQUIREMENT (BEH-SF-542): When `GraphStorePort.conditionalMutate(nodeId, mutation, expectedHash)` is called, the system MUST compare the node's current `contentHash` with `expectedHash` within an atomic transaction. If the hashes match, the mutation MUST be applied and the node's `contentHash` MUST be updated to reflect the new content. If the hashes do not match, the system MUST reject the mutation and return a `ConflictError` containing `nodeId`, `expectedHash`, `actualHash`, and the current node state. The hash comparison and mutation MUST be atomic — no concurrent mutation can interleave between the check and the write. Passing `expectedHash: null` MUST bypass the precondition check (unconditional write).

### Verification

- Match test: read a node's hash, submit conditional mutation with correct hash; verify mutation succeeds and hash is updated.
- Mismatch test: submit conditional mutation with stale hash; verify `ConflictError` with correct `expectedHash` and `actualHash`.
- Atomicity test: two concurrent conditional mutations with the same `expectedHash`; verify exactly one succeeds and the other receives `ConflictError`.
- Bypass test: submit conditional mutation with `expectedHash: null`; verify mutation always succeeds regardless of current hash.

---

## BEH-SF-543: Conflict Resolution UI — Side-by-Side Diff with Accept/Merge/Discard

When a `ConflictError` occurs during a user-initiated graph edit, the dashboard presents a side-by-side diff showing the user's intended changes versus the current server state. The user chooses from three resolution strategies: accept theirs (overwrite server), merge (apply non-conflicting fields from both), or discard (abandon local changes).

### Contract

REQUIREMENT (BEH-SF-543): When a `ConflictError` is surfaced to a dashboard user, the system MUST present a `ConflictResolutionView` containing: `localState` (the user's intended mutation), `serverState` (the current node state from `ConflictError.currentState`), and a field-level diff highlighting conflicting properties. The user MUST be offered three resolution actions: `accept-local` (resubmit mutation unconditionally), `merge` (apply non-conflicting fields from both states; conflicting fields use local values unless the user edits them), and `discard` (abandon the mutation). The selected resolution MUST be recorded as an `AuditEntry` with `conflictId`, `resolution`, `userId`, and `timestamp`. After resolution, the system MUST re-execute the mutation pipeline with the resolved state.

### Verification

- Diff display test: trigger a conflict; verify the `ConflictResolutionView` shows correct `localState` and `serverState` with field-level diffs.
- Accept-local test: select `accept-local`; verify the mutation is resubmitted unconditionally and succeeds.
- Merge test: conflict on field A, no conflict on field B; select `merge`; verify field A uses local value and field B preserves server value.
- Discard test: select `discard`; verify no mutation is submitted and the node retains server state.
- Audit test: resolve a conflict; verify an `AuditEntry` is created with correct `resolution` and `userId`.

---
