---
id: BEH-SF-169
kind: behavior
title: Cost Optimization
status: active
id_range: 169--176
invariants: [INV-SF-15]
adrs: [ADR-014]
types: [flow, flow]
ports: [AnalyticsPort, MetricsPort]
---

# 24 — Cost Optimization

## BEH-SF-169: Role-Adaptive Model Routing — Per-Role, Per-Stage Model Selection

Each agent role has a default model based on task complexity. The routing table maps roles to models (opus/sonnet/haiku) with stage-level overrides.

### Contract

REQUIREMENT (BEH-SF-169): The flow engine MUST resolve the model for each agent spawn using a three-level lookup: (1) stage-level override if present, (2) role-level default from the `RoleModelMapping` table, (3) flow-level default. The resolved model MUST be passed to `ClaudeCodeAdapter.spawnAgent()` via the `--model` flag. The resolution MUST be deterministic and logged as a graph edge (`USED_MODEL`) on the session node.

### Verification

- Role default test: spawn a `feedback-synthesizer`; verify it uses haiku.
- Stage override test: configure a stage override to opus; verify the override takes precedence.
- Flow default test: spawn a role with no mapping; verify the flow-level default applies.
- Logging test: verify the `USED_MODEL` edge is created on the session node.

---

## BEH-SF-170: Budget Zones — Progressive Degradation (Green/Yellow/Orange/Red)

> **Invariant:** [INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md) — Budget Zone Monotonicity

Four budget zones define progressive degradation behavior as budget is consumed. Zones transition monotonically from Green → Yellow → Orange → Red.

### Contract

REQUIREMENT (BEH-SF-170): The `CostTracker` MUST compute the current budget zone based on remaining budget percentage: Green (>60%), Yellow (30–60%), Orange (10–30%), Red (<10%). Zone transitions MUST be monotonic — once a zone transitions to a higher severity, it MUST NOT revert within the same phase. On Yellow: non-critical roles MUST downgrade to haiku and max iterations MUST reduce by 25%. On Orange: all roles MUST use sonnet and optional stages MUST be skipped. On Red: only essential stages MUST execute and agents MUST receive a "budget critical" prompt injection. Each zone transition MUST emit a `budget-zone-transition` event.

### Verification

- Zone computation test: set remaining budget to 50%; verify Yellow zone.
- Monotonicity test: consume budget from Green to Yellow; attempt to return to Green; verify it stays Yellow.
- Yellow behavior test: enter Yellow zone; verify non-critical roles downgraded and iterations reduced.
- Orange behavior test: enter Orange zone; verify all roles use sonnet.
- Red behavior test: enter Red zone; verify only essential stages execute.
- Event test: verify `budget-zone-transition` events are emitted on transitions.

---

## BEH-SF-171: Cost Prediction Engine — `specforge estimate` Formula

The `specforge estimate` command computes predicted cost per phase with token ranges and cost ranges, using a formula-based estimator.

### Contract

REQUIREMENT (BEH-SF-171): `specforge estimate` MUST compute: `flow_cost = sum(phase_estimates)`, where `phase_estimate = avg_iterations * sum(stage_estimates)`, and `stage_estimate = model_cost_per_token * estimated_tokens`. The estimate MUST include per-phase breakdown with token ranges (min/expected/max) and cost ranges. When historical data exists for similar codebase sizes, the estimate MUST incorporate historical averages. The output MUST be tabular with confidence intervals.

### Verification

- Basic estimate test: run `specforge estimate` on a flow; verify tabular output with per-phase breakdown.
- Historical refinement test: run multiple flows; verify estimates improve with historical data.
- Token range test: verify estimates include min/expected/max token ranges.
- Format test: verify output includes confidence intervals.

---

## BEH-SF-172: Effort Escalation — Convergence-Responsive Model Upgrade

When convergence metrics stall, the model for the responsible role automatically escalates one tier.

### Contract

REQUIREMENT (BEH-SF-172): When `PhaseMetrics.criticalFindings` remains at the same count for 2+ consecutive iterations, the flow engine MUST escalate the model for the role responsible for resolving those findings by one tier (haiku → sonnet → opus). Escalation events MUST be recorded as graph nodes with `fromModel`, `toModel`, `reason`, and `iteration`. Escalation MUST NOT exceed opus. If already at opus and still stalled, the flow MUST continue without further escalation.

### Verification

- Stall detection test: run 3 iterations with unchanged critical findings; verify model escalation occurs.
- Tier progression test: verify haiku escalates to sonnet, sonnet to opus.
- Cap test: verify opus does not escalate further.
- Event recording test: verify escalation events are recorded in the graph.

---

## BEH-SF-173: Convergence-Responsive Model Selection — Stall Detection Triggers Escalation

The convergence evaluation integrates with model routing to detect stalls and trigger effort escalation automatically.

### Contract

REQUIREMENT (BEH-SF-173): After each convergence evaluation, the flow engine MUST compare the current `PhaseMetrics` against the previous iteration's metrics. If the convergence score has not improved by more than a configurable threshold (default 5%) for 2+ iterations, the engine MUST trigger effort escalation per BEH-SF-172. The convergence-responsive check MUST run after the standard convergence evaluation and MUST NOT interfere with normal convergence detection.

### Verification

- Improvement test: run iterations with improving metrics; verify no escalation.
- Stall test: run iterations with flat metrics; verify escalation triggers after threshold.
- Threshold test: configure a custom threshold; verify it is respected.
- Independence test: verify convergence-responsive checks do not affect normal convergence detection.

---

## BEH-SF-174: Compaction Strategy — Context Window Management Per Role

Different roles and budget zones use different compaction strategies for context window management.

### Contract

REQUIREMENT (BEH-SF-174): In Green and Yellow budget zones, agents with large context requirements (spec-author, reviewer) MUST use 1M context window mode. In Orange zone, all agents MUST use compacted context mode. In Red zone, agents MUST use minimal context with aggressive summarization. The compaction strategy MUST be passed to `ClaudeCodeAdapter` and MUST NOT discard information that would prevent the agent from completing its current task.

### Verification

- Green mode test: verify spec-author uses full 1M context in Green zone.
- Orange mode test: verify agents switch to compacted context in Orange zone.
- Red mode test: verify agents use minimal context in Red zone.
- Information preservation test: verify compaction does not discard task-critical information.

---

## BEH-SF-175: Token Economy Dashboard Data — Cost Metrics for Web Dashboard

Cost tracking produces structured data for the web dashboard's cost analytics view.

### Contract

REQUIREMENT (BEH-SF-175): The `CostTracker` MUST produce real-time metrics including: total tokens consumed (input/output), cost per phase, cost per agent role, budget zone history, model usage distribution, and cost-per-finding ratio. These metrics MUST be available via the WebSocket event stream as `StreamDashboardEvent` objects. Historical cost data MUST be persisted as graph nodes for cross-run analytics.

### Verification

- Metrics availability test: run a flow; verify all specified metrics are produced.
- WebSocket test: subscribe to cost events; verify events arrive in real-time.
- Historical test: run multiple flows; verify cost data persists across runs.
- Per-role test: verify cost attribution is accurate per agent role.

---

## BEH-SF-176: Cost Benchmarking — Historical Comparison Across Runs

Cost data from prior runs enables benchmarking and trend analysis.

### Contract

REQUIREMENT (BEH-SF-176): The system MUST store cost data (total tokens, total cost, cost per phase, model usage) as graph nodes linked to flow run nodes. `specforge stats` MUST display: average cost per flow type, cost trend over last N runs, cost-per-finding trend, and model usage distribution. Benchmarking queries MUST filter by codebase size range for fair comparison.

### Verification

- Storage test: complete a flow; verify cost data is stored as graph nodes.
- Stats test: run `specforge stats`; verify cost analytics are displayed.
- Trend test: run multiple flows; verify trend data is computed correctly.
- Size filter test: verify benchmarking filters by codebase size range.
