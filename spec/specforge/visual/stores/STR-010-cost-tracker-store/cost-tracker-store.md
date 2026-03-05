# STR-010: Cost Tracker Store

## Overview

The Cost Tracker Store aggregates token usage and cost data across phases and agents for the active flow run. It provides budget zone classification so that the UI can surface warnings as spending approaches or exceeds the configured budget.

**Hook:** `useCostTracker()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| summary           | CostSummary                                              |
| byPhase           | PhaseCost[]                                              |
| byAgent           | AgentCost[]                                              |
+-------------------+----------------------------------------------------------+
```

### CostSummary

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| totalCost         | number (USD, floating point)                             |
| inputTokens       | number                                                   |
| outputTokens      | number                                                   |
| budgetPercent     | number (0-100+, can exceed 100 when over budget)         |
+-------------------+----------------------------------------------------------+
```

### PhaseCost

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| phase             | string                                                   |
| inputTokens       | number                                                   |
| outputTokens      | number                                                   |
| cost              | number (USD)                                             |
+-------------------+----------------------------------------------------------+
```

### AgentCost

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| agentRole         | string                                                   |
| inputTokens       | number                                                   |
| outputTokens      | number                                                   |
| cost              | number (USD)                                             |
| invocations       | number                                                   |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector       | Parameters | Description                                                                      |
| -------------- | ---------- | -------------------------------------------------------------------------------- |
| `topCostPhase` | (none)     | Returns the PhaseCost entry with the highest cost. `null` when byPhase is empty. |
| `topCostAgent` | (none)     | Returns the AgentCost entry with the highest cost. `null` when byAgent is empty. |
| `budgetZone`   | (none)     | Classifies budget usage into one of four zones based on `budgetPercent`.         |

### Budget Zone Thresholds

| Zone        | Condition                 | Visual Indicator |
| ----------- | ------------------------- | ---------------- |
| `safe`      | budgetPercent < 60        | Green            |
| `warning`   | 60 <= budgetPercent < 80  | Yellow           |
| `critical`  | 80 <= budgetPercent < 100 | Red              |
| `exhausted` | budgetPercent >= 100      | Red + pulsing    |

---

## Event Flow

```
EVT-018 (cost-summary-updated)
  --> replace summary with payload.summary

EVT-019 (phase-costs-loaded)
  --> replace byPhase[] with payload.byPhase

EVT-020 (agent-costs-loaded)
  --> replace byAgent[] with payload.byAgent

EVT-017 (session-subscription-tick)
  --> no direct mutation (triggers refresh in dependent hooks)
```

### Event-to-Field Mapping

| Event   | Field   | Operation |
| ------- | ------- | --------- |
| EVT-018 | summary | set       |
| EVT-019 | byPhase | set       |
| EVT-020 | byAgent | set       |
| EVT-017 | (none)  | (none)    |

---

## Design Rationale

1. **Three-part state:** The store separates summary, per-phase, and per-agent breakdowns because each maps to a distinct UI component. This avoids coupling unrelated re-renders.

2. **Budget zone selector:** Rather than storing the zone string, it is derived from `budgetPercent`. This keeps the state minimal and ensures the zone always reflects the latest percentage.

3. **Threshold boundaries:** The 60/80/100 thresholds are chosen to give two levels of warning before exhaustion. The `budgetPercent` field can exceed 100 when the budget is overspent, which the `exhausted` zone handles.

4. **Top-cost selectors:** `topCostPhase` and `topCostAgent` enable the cost summary cards to highlight the most expensive contributors without scanning the arrays in the component layer.

5. **Server-computed aggregates:** The store receives pre-computed summaries from the server rather than aggregating raw token events client-side. This keeps the store logic simple and avoids floating-point accumulation drift.

---

## Cross-References

- **Consumers:** CMP-017-cost-summary-cards, CMP-018-phase-cost-table, CMP-019-agent-cost-table, CMP-002-status-bar
- **Events:** EVT-017, EVT-018, EVT-019, EVT-020
- **Related stores:** STR-016 (session subscription -- tick triggers refresh)
- **Architecture:** [c3-web-dashboard.md](../../../architecture/c3-web-dashboard.md) -- Cost Tracker View
- **Behaviors:** [24-cost-optimization.md](../../../behaviors/BEH-SF-169-cost-optimization.md) -- BEH-SF-169 through BEH-SF-176
