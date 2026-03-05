---
id: BEH-SF-488
kind: behavior
title: Progress Dashboard
status: active
id_range: 488--495
invariants: [INV-SF-33, INV-SF-35]
adrs: [ADR-005]
types: [tracking]
ports: [ProgressDashboardPort]
---

# Progress Dashboard

## BEH-SF-488: Aggregated Implementation Overview

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

`ProgressDashboardPort.overview()` returns a `ProgressOverview` containing the aggregate implementation status summary, aggregate coverage metrics, and active staleness alerts across all behaviors in the spec.

### Contract

REQUIREMENT (BEH-SF-488): When `ProgressDashboardPort.overview()` is called, the system MUST return a `ProgressOverview` with: (1) `summary` — a `StatusSummary` with counts for each implementation status, (2) `coverage` — an `AggregateCoverage` with total/covered behaviors and average score, (3) `stalenessAlerts` — all behaviors flagged as stale by `SourceTracePort.detectStaleness()`. The overview MUST reflect the current graph state at the time of the call.

### Verification

- Unit test: 10 behaviors (3 verified, 4 implemented, 2 in_progress, 1 not_started); verify summary counts match.
- Unit test: verify coverage aggregate matches individual behavior coverage scores.
- Unit test: verify staleness alerts are included when source files have changed.

---

## BEH-SF-489: Phase-Level Progress (Per Roadmap Phase)

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

`ProgressDashboardPort.phaseProgress(phaseId)` returns a `PhaseProgress` for a specific roadmap phase, containing the status summary and coverage metrics scoped to behaviors allocated to that phase.

### Contract

REQUIREMENT (BEH-SF-489): When `ProgressDashboardPort.phaseProgress(phaseId)` is called, the system MUST return a `PhaseProgress` with `summary` and `coverage` computed only from behaviors whose allocation range falls within the specified roadmap phase. If the `phaseId` does not correspond to any known phase, the system MUST return a `PhaseProgress` with zero counts.

### Verification

- Unit test: phase with 8 behaviors, 4 verified; verify `summary.verified` is 4.
- Unit test: unknown phase ID; verify zero-count response.
- Integration test: verify phase-level progress sums equal the overall progress.

---

## BEH-SF-490: Burndown Chart Data (Time-Series)

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

`ProgressDashboardPort.burndown(options)` returns an array of `BurndownDataPoint` entries representing the status distribution over time. Each data point captures the count of behaviors in each status at a given date.

### Contract

REQUIREMENT (BEH-SF-490): When `ProgressDashboardPort.burndown(options)` is called, the system MUST reconstruct the status distribution at each date by replaying status transitions from the audit trail. Each `BurndownDataPoint` MUST contain `date`, `notStarted`, `inProgress`, `implemented`, and `verified` counts. The data MUST be ordered chronologically. If no transitions exist, a single data point with all behaviors at `not_started` MUST be returned.

### Verification

- Unit test: 3 transitions over 3 days; verify 3 data points with correct counts.
- Unit test: no transitions; verify single data point with all `not_started`.
- Property check: at every data point, the sum of all status counts equals the total behavior count.

---

## BEH-SF-491: Stale Verification Alerts

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`ProgressDashboardPort.staleAlerts()` returns all `StalenessAlert` entries for behaviors whose source files have been modified since their last verification. This is a convenience method that delegates to `SourceTracePort.detectStaleness()` and includes it in the dashboard view.

### Contract

REQUIREMENT (BEH-SF-491): When `ProgressDashboardPort.staleAlerts()` is called, the system MUST return the same `StalenessAlert` array as `SourceTracePort.detectStaleness()`. Each alert MUST include `behaviorId`, `lastVerifiedAt`, `sourceFileChangedAt`, and `staleByDays`. Alerts MUST be ordered by `staleByDays` descending (most stale first).

### Verification

- Unit test: 2 stale behaviors (5 days and 3 days); verify alerts returned in order [5, 3].
- Unit test: no stale behaviors; verify empty array.
- Consistency test: verify `staleAlerts()` output matches `SourceTracePort.detectStaleness()`.

---

## BEH-SF-492: `specforge progress` CLI Command

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

`specforge progress` is a CLI command that prints the implementation progress overview to stdout. It displays the status summary, coverage metrics, and staleness alerts in a human-readable table format.

### Contract

REQUIREMENT (BEH-SF-492): When `specforge progress` is executed, the system MUST call `ProgressDashboardPort.overview()` and render the result as a formatted table to stdout. The table MUST include: (1) status counts per category with percentage bars, (2) aggregate coverage score, (3) count of stale behaviors. The command MUST support `--json` flag for machine-readable JSON output and `--phase <id>` flag to scope to a specific roadmap phase.

### Verification

- Unit test: run `progress` with table output; verify human-readable format with correct counts.
- Unit test: run `progress --json`; verify valid JSON matching `ProgressOverview` schema.
- Unit test: run `progress --phase 1`; verify output is scoped to phase 1 behaviors.

---

## BEH-SF-493: Web Dashboard Integration (BEH-SF-133 Spec Progress View)

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

The web dashboard (see [BEH-SF-133](./BEH-SF-133-web-dashboard.md)) includes a Spec Progress view that visualizes the `ProgressOverview` data. This view displays status distribution charts, coverage heatmaps, and staleness alerts in a real-time dashboard.

### Contract

REQUIREMENT (BEH-SF-493): The web dashboard MUST include a Spec Progress view accessible from the main navigation. The view MUST display: (1) a donut/pie chart of status distribution, (2) a coverage heatmap grouped by behavior file, (3) a staleness alert list with links to affected behaviors, (4) a burndown chart over time. The view MUST refresh on each navigation and support manual refresh. Data MUST be fetched via the existing dashboard API using `ProgressDashboardPort`.

### Verification

- Integration test: load the Spec Progress view; verify all four visualization components render.
- Unit test: verify the dashboard API returns `ProgressOverview` data.
- Visual test: verify the burndown chart renders with correct time-series data.

---

## BEH-SF-494: Filterable by Behavior File and Phase (Scope Param)

> **Invariant:** [INV-SF-33](../invariants/INV-SF-33-implementation-status-consistency.md) — Implementation Status Consistency

All progress dashboard queries support an optional `scope` parameter that filters results by behavior file name or roadmap phase. This enables focused progress tracking for individual subsystems.

### Contract

REQUIREMENT (BEH-SF-494): When any `ProgressDashboardPort` method receives a `scope` parameter with `behaviorFile`, the results MUST be filtered to include only behaviors from that file. When `scope` contains `phase`, results MUST be filtered to behaviors in that phase's allocation range. When both are specified, both filters MUST apply (AND logic). When `scope` is omitted, all behaviors MUST be included.

### Verification

- Unit test: overview with `scope: { behaviorFile: 'BEH-SF-464-implementation-tracking.md' }`; verify only 8 behaviors.
- Unit test: overview with `scope: { phase: '1' }`; verify only phase 1 behaviors.
- Unit test: overview with both filters; verify AND logic applies.

---

## BEH-SF-495: Export to Markdown/JSON Report

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`ProgressDashboardPort.export(format)` generates a progress report in the specified format (`markdown` or `json`). The markdown format produces a human-readable report suitable for inclusion in PRs or documentation. The JSON format produces a machine-readable report for integration with external tools.

### Contract

REQUIREMENT (BEH-SF-495): When `ProgressDashboardPort.export('markdown')` is called, the system MUST produce a markdown document with: (1) a summary table of status counts, (2) a coverage summary, (3) a list of stale behaviors, (4) a generated timestamp. When `export('json')` is called, the system MUST produce a JSON document conforming to the `ProgressOverview` schema. Both formats MUST include the same data and MUST be deterministic given the same graph state.

### Verification

- Unit test: export markdown; verify valid markdown with summary table and timestamp.
- Unit test: export JSON; verify valid JSON matching `ProgressOverview` schema.
- Determinism test: export twice with same state; verify identical output.

---
