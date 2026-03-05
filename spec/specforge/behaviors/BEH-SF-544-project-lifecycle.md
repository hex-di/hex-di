---
id: BEH-SF-544
kind: behavior
title: Project Lifecycle
status: active
id_range: 544--549
invariants: [INV-SF-7, INV-SF-12]
adrs: [ADR-001, ADR-011]
types: [extensibility, graph]
ports: [ProjectLifecyclePort, PluginLoaderPort]
---

# 44 — Project Lifecycle

---

## BEH-SF-544: Project State Machine — Enforced Lifecycle Transitions

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Every project follows a strict state machine: `pending` → `creating` → `active` → `maintenance` → `archived` → `deleted`. Transitions are enforced — only valid transitions are permitted, and each transition is recorded as an immutable graph event. The state machine prevents accidental data loss (e.g., deleting an active project) and enables governance workflows (e.g., requiring approval for archival).

### Contract

REQUIREMENT (BEH-SF-544): `ProjectLifecyclePort.transition(projectId, targetState)` MUST validate the transition against the allowed state machine transitions: `pending→creating`, `creating→active`, `active→maintenance`, `maintenance→active`, `active→archived`, `maintenance→archived`, `archived→active` (restore), `archived→deleted`. If the transition is not in the allowed set, the system MUST return `InvalidTransitionError` with `currentState`, `targetState`, and the list of valid transitions from the current state. Each successful transition MUST be recorded as a `ProjectTransitionEvent` graph node with `projectId`, `fromState`, `toState`, `triggeredBy` (userId), `timestamp`, and optional `reason`. The `deleted` state MUST be terminal — no transitions out of `deleted` are permitted. The `pending` state MUST be the initial state for all new projects.

### Verification

- Valid transition test: transition `active→maintenance`; verify success and `ProjectTransitionEvent` is recorded with correct fields.
- Invalid transition test: attempt `pending→archived`; verify `InvalidTransitionError` listing valid transitions (`pending→creating`).
- Terminal state test: transition to `deleted`; attempt any transition; verify `InvalidTransitionError`.
- Restore test: transition `archived→active`; verify project is usable again and transition event is recorded.
- Initial state test: create a new project; verify its state is `pending`.

---

## BEH-SF-545: Maintenance Mode Enforcement — Pause Flows and Restrict Access

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

When a project enters `maintenance` state, all active flows are paused, new flow starts are blocked, and only users with the `admin` role can perform read and write operations. This enables safe schema migrations, data corrections, and infrastructure changes without risking data corruption from concurrent agent activity.

### Contract

REQUIREMENT (BEH-SF-545): When a project transitions to `maintenance` state, the system MUST: (a) pause all running flows for that project by emitting `FlowPauseEvent` for each active `flowRunId`, (b) reject new `FlowStartRequest`s with `ProjectInMaintenanceError` including `projectId` and `estimatedEndTime` (if available), (c) restrict all graph mutations to users with `role: "admin"` — non-admin write attempts MUST return `MaintenanceAccessDeniedError`. Read access MUST remain available to all authorized users. When the project transitions out of `maintenance` (to `active` or `archived`), paused flows MUST NOT auto-resume — explicit `FlowResumeRequest` is required for each flow. The maintenance state MUST be queryable via `ProjectLifecyclePort.getState(projectId)`.

### Verification

- Flow pause test: start 3 flows, transition to maintenance; verify all 3 receive `FlowPauseEvent`.
- New flow block test: in maintenance, attempt to start a flow; verify `ProjectInMaintenanceError`.
- Admin write test: in maintenance, submit a graph mutation as admin; verify it succeeds.
- Non-admin write test: in maintenance, submit a graph mutation as non-admin; verify `MaintenanceAccessDeniedError`.
- Read access test: in maintenance, query the graph as non-admin; verify read succeeds.
- No auto-resume test: transition from maintenance to active; verify previously-paused flows remain paused.

---

## BEH-SF-546: Archive and Restore with Schema Migration — Snapshot and Migrate on Restore

When a project is archived, the system captures a complete snapshot of the project's graph subgraph (nodes, edges, properties, metadata). When a project is restored from `archived` to `active`, the system checks whether the graph schema has evolved since archival and applies any necessary migrations to bring the restored data into conformance with the current schema version.

### Contract

REQUIREMENT (BEH-SF-546): When a project transitions to `archived`, the system MUST create an `ArchiveSnapshot` containing: `projectId`, `schemaVersion` (the graph schema version at archival time), `nodeCount`, `edgeCount`, `snapshotHash` (SHA-256 of the serialized snapshot), and `archivedAt` timestamp. The snapshot MUST be stored in the configured archive backend (local filesystem or object storage). When a project transitions from `archived` to `active`, the system MUST: (a) load the `ArchiveSnapshot`, (b) compare `schemaVersion` with the current graph schema version, (c) if versions differ, apply all intermediate schema migrations in order, (d) re-insert the migrated graph data, (e) verify data integrity by comparing node/edge counts against the snapshot metadata. If migration fails, the restore MUST be rolled back and the project MUST remain in `archived` state with a `RestoreFailedError` containing the migration step that failed. Successfully restored projects MUST record a `ProjectRestoredEvent` with `migrationsApplied` count.

### Verification

- Archive test: archive a project with 50 nodes and 30 edges; verify `ArchiveSnapshot` is created with correct counts and hash.
- Restore same schema test: archive and immediately restore; verify all nodes and edges are present and no migrations are applied.
- Migration test: archive at schema v3, evolve schema to v5, restore; verify migrations v3→v4 and v4→v5 are applied and data conforms to v5 schema.
- Failed migration test: archive, introduce a migration that fails; attempt restore; verify project remains `archived` and `RestoreFailedError` is returned.
- Integrity test: corrupt a snapshot (wrong node count); attempt restore; verify integrity check fails and restore is rolled back.

---

## BEH-SF-547: Three-Part Plugin Decomposition — Core/Assets/Resources Manifest

> **Invariant:** [INV-SF-12](../invariants/INV-SF-12-hook-pipeline-ordering.md) — Hook Pipeline Ordering

Every plugin is decomposed into three tiers in its manifest: `core` (plugin logic, hook handlers, port implementations — loaded at install time), `assets` (UI components, icons, themes — loaded when the plugin's UI surface is first rendered), and `resources` (large datasets, ML models, reference data — loaded on first use). This tiered architecture minimizes startup impact by deferring non-essential loading.

### Contract

REQUIREMENT (BEH-SF-547): `PluginLoaderPort.parseManifest(manifest)` MUST validate that the plugin manifest declares all three tiers: `core`, `assets`, and `resources`. Each tier MUST specify: `entryPoint` (module path), `sizeBytes` (declared bundle size), and `dependencies` (array of other plugin IDs or platform modules). The `core` tier MUST be loaded during `PluginLoaderPort.install(pluginId)`. The `assets` and `resources` tiers MUST NOT be loaded at install time — they MUST be deferred to their respective trigger conditions (UI render and first-use). A manifest missing any tier MUST return `IncompleteManifestError` listing the missing tiers. A manifest with `core.sizeBytes` exceeding the configured core budget (default: 500KB) MUST return `CoreBudgetExceededError`.

### Verification

- Valid manifest test: parse a manifest with all 3 tiers; verify no errors and all tiers are registered.
- Missing tier test: parse a manifest missing `resources`; verify `IncompleteManifestError` listing `["resources"]`.
- Core budget test: parse a manifest with `core.sizeBytes: 1_000_000` (budget 500KB); verify `CoreBudgetExceededError`.
- Install test: install a plugin; verify only the `core` tier module is loaded; verify `assets` and `resources` entry points are not imported.
- Dependencies test: parse a manifest; verify tier dependencies are extracted and returned in the parse result.

---

## BEH-SF-548: Lazy Resource Loading — Load Plugin Resources on First Use

The `resources` tier of a plugin is loaded lazily: the system registers a proxy at install time and replaces it with the actual module on first access. This avoids loading large datasets or models that may never be needed during a given session.

### Contract

REQUIREMENT (BEH-SF-548): When a plugin is installed, the system MUST register a lazy proxy for the plugin's `resources` tier. The proxy MUST intercept the first access to any resource export and MUST trigger `PluginLoaderPort.loadTier(pluginId, "resources")` before delegating to the actual module. Subsequent accesses MUST use the loaded module directly (no repeated loading). Loading MUST be atomic — concurrent first accesses MUST coalesce into a single load operation. If loading fails, the proxy MUST throw `ResourceLoadError` with `pluginId`, `tier: "resources"`, and the underlying error. The system MUST emit `TierLoadedEvent` with `pluginId`, `tier`, `loadTimeMs`, and `actualSizeBytes` upon successful load. `PluginLoaderPort.getTierStatus(pluginId, tier)` MUST return `"pending"` before first use, `"loading"` during load, and `"loaded"` after.

### Verification

- Lazy test: install a plugin; verify `resources` tier status is `"pending"`; access a resource export; verify status transitions to `"loading"` then `"loaded"`.
- Single load test: trigger 5 concurrent accesses to the resources tier; verify `loadTier` is called exactly once.
- Error test: configure resources tier to fail loading; access a resource export; verify `ResourceLoadError` is thrown.
- Event test: successfully load resources tier; verify `TierLoadedEvent` is emitted with correct `loadTimeMs` and `actualSizeBytes`.
- Subsequent access test: after loading, access resources 100 times; verify no additional load calls.

---

## BEH-SF-549: Plugin Load Budget — Per-Plugin Startup Time and Memory Limits

Each plugin has a load budget for its `core` tier: a maximum startup time (default: 2 seconds) and memory ceiling (default: 50MB). If a plugin exceeds either limit during installation, the install is rolled back and the plugin is marked as `rejected`.

### Contract

REQUIREMENT (BEH-SF-549): `PluginLoaderPort.install(pluginId)` MUST enforce two budget constraints during `core` tier loading: (a) startup time — measured from the beginning of `core` module evaluation to completion of the plugin's `initialize()` hook; if this exceeds the configured `maxStartupMs` (default: 2000ms), the install MUST be rolled back and MUST return `StartupBudgetExceededError` with `pluginId`, `budgetMs`, and `actualMs`; (b) memory — measured as the delta in heap usage before and after `core` loading; if this exceeds `maxMemoryBytes` (default: 52_428_800), the install MUST be rolled back and MUST return `MemoryBudgetExceededError` with `pluginId`, `budgetBytes`, and `actualBytes`. Budget limits MUST be configurable per-plugin via the plugin manifest's `budget` field. Rejected plugins MUST be recorded in `PluginLoaderPort.listRejected()` with the rejection reason. Budget enforcement MUST NOT apply to `assets` or `resources` tiers (they have separate, on-demand budgets).

### Verification

- Within budget test: install a plugin that loads in 500ms and uses 10MB; verify installation succeeds.
- Time budget test: install a plugin whose `initialize()` sleeps for 3 seconds (budget 2s); verify `StartupBudgetExceededError` and rollback.
- Memory budget test: install a plugin that allocates 100MB (budget 50MB); verify `MemoryBudgetExceededError` and rollback.
- Custom budget test: set plugin manifest `budget.maxStartupMs: 5000`; install a plugin that takes 3 seconds; verify it succeeds (custom budget overrides default).
- Rejected list test: reject a plugin; verify it appears in `listRejected()` with correct reason.
- Tier scope test: verify budget enforcement does not apply during `assets` or `resources` tier loading.

---
