---
id: BEH-SF-448
kind: behavior
title: Predictive Analytics & Health Scoring
status: active
id_range: 448--455
invariants: [INV-SF-7, INV-SF-10]
adrs: [ADR-005]
types: [tracking]
ports: [AnalyticsPort]
---

# 59 — Predictive Analytics & Health Scoring

**Feature:** [FEAT-SF-033](../features/FEAT-SF-033-predictive-analytics.md)

---

## BEH-SF-448: Architecture Health Scoring — Compute Health from Graph Topology

> **Invariant:** [INV-SF-10](../invariants/INV-SF-10-graph-first-architecture.md) — Graph-First Architecture

The architecture health score is a composite metric computed from graph topology analysis: coupling between modules, cohesion within modules, specification completeness, and test coverage. The score provides a single numeric indicator of overall project health.

### Contract

REQUIREMENT (BEH-SF-448): `AnalyticsPort.computeHealthScore(projectId)` MUST return an aggregate health score (0–100) computed from graph topology metrics. The score MUST incorporate at minimum: coupling index (inter-module edge density), cohesion index (intra-module edge density), specification completeness (ratio of specified-to-implemented nodes), and test coverage (ratio of tested-to-total behaviors). Each sub-metric MUST be individually accessible via `AnalyticsPort.getMetric(projectId, metricName)`. The score MUST be recomputed on demand and MUST reflect the current graph state.

### Verification

- Score computation test: create a project with known topology; verify the health score matches expected value.
- Sub-metric test: retrieve individual metrics; verify each is within expected range.
- Recomputation test: mutate the graph; recompute; verify the score changes accordingly.

---

## BEH-SF-449: Technical Debt Quantification — Rank Debt by Downstream Impact

Technical debt items are ranked by their downstream impact on the dependency graph. Items that block or degrade the most downstream nodes rank highest, prioritizing remediation efforts.

### Contract

REQUIREMENT (BEH-SF-449): `AnalyticsPort.getTechnicalDebt(projectId)` MUST return a ranked list of technical debt items sorted by downstream impact score. The downstream impact score MUST be computed as the number of transitive dependents affected by the debt item. Each debt item MUST include `nodeId`, `debtType` (e.g., "missing-spec", "stale-test", "orphan-behavior"), `impactScore` (integer), and `affectedDependents` (array of node IDs). Items with equal impact scores MUST be sub-sorted by creation date (oldest first).

### Verification

- Ranking test: create debt items with known dependency graphs; verify ranking by downstream impact.
- Impact score test: create a debt item with 5 transitive dependents; verify impactScore is 5.
- Tie-breaking test: create two items with equal impact; verify oldest appears first.

---

## BEH-SF-450: Predictive Drift Detection — Forecast Drift from Historical Patterns

The system analyzes historical change patterns to predict which specifications are likely to drift before drift actually occurs. Predictions are based on change velocity, dependency volatility, and temporal patterns.

### Contract

REQUIREMENT (BEH-SF-450): `AnalyticsPort.predictDrift(projectId)` MUST return a list of drift predictions. Each prediction MUST include `nodeId`, `confidence` (0–1), `predictedDriftDate` (ISO 8601), `reasoning` (string explaining the historical pattern), and `historicalChanges` (array of recent change events). Predictions MUST be computed from at least 30 days of historical change data. Nodes with fewer than 3 historical changes MUST be excluded from predictions (insufficient data). Predictions MUST be refreshed daily or on-demand.

### Verification

- Prediction generation test: create a node with accelerating change frequency; verify a drift prediction is generated.
- Confidence range test: verify all confidence values are between 0 and 1.
- Insufficient data test: create a node with only 2 changes; verify it is excluded from predictions.

---

## BEH-SF-451: Specification Completeness Scoring — Score Completeness per Module

Each module receives a specification completeness score measuring the ratio of specified behaviors to implemented code elements. This identifies under-specified areas that may harbor undocumented behavior.

### Contract

REQUIREMENT (BEH-SF-451): `AnalyticsPort.getCompletenessScores(projectId)` MUST return a per-module completeness score (0–100). The score MUST be computed as the ratio of behaviors with linked implementations to total behaviors, weighted by behavior priority. Modules with zero behaviors MUST receive a score of 0. The response MUST include `moduleId`, `score`, `totalBehaviors`, `linkedBehaviors`, and `unlinkedBehaviors` (array of BEH IDs without implementation links).

### Verification

- Score calculation test: create a module with 10 behaviors, 7 linked; verify score is 70.
- Zero behaviors test: create a module with no behaviors; verify score is 0.
- Unlinked list test: verify unlinkedBehaviors contains the correct BEH IDs.

---

## BEH-SF-452: Quality Trend Analysis — Track Metrics Over Configurable Time Ranges

Quality metrics are tracked over time, producing trend lines that reveal improvement or degradation. Trends are configurable by time range and metric type.

### Contract

REQUIREMENT (BEH-SF-452): `AnalyticsPort.getQualityTrend(projectId, metric, timeRange)` MUST return a time series of metric values over the specified range. `timeRange` MUST support "7d", "30d", "90d", and custom ISO 8601 intervals. Each data point MUST include `timestamp` and `value`. The system MUST store daily metric snapshots. If the requested range exceeds available data, the response MUST include only the available data points with a `dataAvailableFrom` field.

### Verification

- Trend retrieval test: store 30 days of snapshots; request "30d" trend; verify 30 data points.
- Custom range test: request a 14-day custom range; verify correct data points.
- Partial data test: request 90 days when only 10 exist; verify 10 points and `dataAvailableFrom`.

---

## BEH-SF-453: Cross-Organization Benchmarking — Compare Metrics Across Organizations (SaaS)

In SaaS deployment mode, anonymized metrics can be compared across organizations to provide benchmarks for drift rate, health scores, and completeness.

### Contract

REQUIREMENT (BEH-SF-453): `AnalyticsPort.getBenchmarks(metric)` MUST return anonymized percentile data for the given metric across all organizations in the SaaS deployment. The response MUST include `p25`, `p50`, `p75`, `p90` values and the requesting organization's position. This endpoint MUST only be available in SaaS deployment mode — calling it in local or team mode MUST return `FeatureNotAvailableError`. All benchmark data MUST be anonymized — no organization names or identifiable data.

### Verification

- Benchmark retrieval test (SaaS): request benchmarks; verify percentile data is returned.
- Local mode test: request benchmarks in local mode; verify `FeatureNotAvailableError`.
- Anonymity test: verify no organization-identifiable data in the response.

---

## BEH-SF-454: Intelligence Dashboard Widgets — Coupling, Cohesion, and Completeness Breakdowns

Dashboard widgets provide visual breakdowns of coupling, cohesion, and completeness metrics at module and project levels.

### Contract

REQUIREMENT (BEH-SF-454): `AnalyticsPort.getWidgetData(projectId, widgetType)` MUST return structured data suitable for rendering dashboard widgets. Supported widget types MUST include "coupling-matrix", "cohesion-breakdown", and "completeness-heatmap". Each widget response MUST include `widgetType`, `data` (widget-specific structured data), and `computedAt` (ISO 8601 timestamp). Widget data MUST be cached for 5 minutes to avoid redundant computation. Stale cache MUST be invalidated on graph mutation.

### Verification

- Widget data test: request each widget type; verify structured data is returned.
- Cache test: request the same widget twice within 5 minutes; verify the second request returns cached data (same `computedAt`).
- Invalidation test: mutate the graph; request a widget; verify fresh data (new `computedAt`).

---

## BEH-SF-455: Health Score Alert Configuration — Alert on Score Degradation

Configurable alerts trigger when health scores cross defined thresholds, enabling proactive response to quality degradation.

### Contract

REQUIREMENT (BEH-SF-455): `AnalyticsPort.setAlertThreshold(projectId, metric, threshold, direction)` MUST configure an alert that fires when the specified metric crosses the threshold in the given direction ("above" or "below"). When an alert fires, the system MUST emit a `HealthAlertTriggered` event containing `projectId`, `metric`, `currentValue`, `threshold`, and `direction`. Alerts MUST support a cooldown period (default: 1 hour) to prevent repeated firing. Alert configurations MUST be persistent and retrievable via `AnalyticsPort.getAlertConfigurations(projectId)`.

### Verification

- Alert trigger test: set threshold for health score below 50; degrade score to 40; verify alert fires.
- Cooldown test: trigger an alert; degrade further within cooldown; verify no second alert.
- Configuration persistence test: set an alert; retrieve configurations; verify it is present.
