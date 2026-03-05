# WF-006: Cost Investigation

## Overview

The Cost Investigation workflow describes how a user responds to budget warnings, investigates cost distribution across phases and agents, and identifies the primary cost driver. The journey starts when the user notices a budget indicator in the status bar, moves through the Cost Tracker view for detailed analysis, and returns to the Chat view to observe how the budget status affects the conversation interface.

---

## Journey Map

### Step 1 -- Notice Budget Warning

The user is working in any view when they notice a budget indicator in the status bar (CMP-002). The status bar consumes the cost tracker store (STR-010) and displays a colored dot with a label based on the budget zone:

| Zone                | Indicator                           | Color   |
| ------------------- | ----------------------------------- | ------- |
| Safe (0-60%)        | Green dot, no label                 | #22C55E |
| Warning (60-85%)    | Yellow dot, "Budget warning"        | #FFD600 |
| Critical (85-95%)   | Orange dot, "Budget critical"       | #FF5E00 |
| Exhausted (95-100%) | Red pulsing dot, "Budget exhausted" | #FF3B3B |

The status bar indicator is always visible across all views because it is part of the app shell (PG-010).

### Step 2 -- Navigate to Cost Tracker

The user clicks the Costs nav item in the nav rail or clicks the budget indicator in the status bar. ACT-001 (navigate to view) fires with `viewId: "costs"`. The Cost Tracker view (PG-008) renders.

### Step 3 -- Review Summary Cards

The cost summary cards (CMP-017) display high-level metrics:

- **Total Cost:** Dollar amount spent so far
- **Input Tokens:** Total input tokens consumed
- **Output Tokens:** Total output tokens consumed
- **Budget Gauge:** Visual gauge showing budget utilization percentage

These values come from the `summary` field in STR-010.

### Step 4 -- Observe Budget Gauge

The budget gauge is a visual indicator that fills from left to right. Its color corresponds to the budget zone:

- Safe: Green (#22C55E) fill
- Warning: Yellow (#FFD600) fill with "Budget running low" text
- Critical: Orange (#FF5E00) fill with "Budget critical" text
- Exhausted: Red (#FF3B3B) pulsing fill with "Budget exhausted" text

The gauge reflects `summary.budgetPercent` from the cost tracker store.

### Step 5 -- Examine Phase Cost Breakdown

By default, the Cost Tracker shows the by-phase view. The phase cost table (CMP-018) lists each pipeline phase with its token usage and cost:

| Phase           | Input Tokens | Output Tokens | Cost  |
| --------------- | ------------ | ------------- | ----- |
| discovery       | 45,000       | 12,000        | $0.85 |
| spec-generation | 90,000       | 35,000        | $2.10 |
| implementation  | 15,000       | 5,000         | $0.30 |

The `topCostPhase` selector highlights the most expensive phase.

### Step 6 -- Switch to By-Agent View

The user clicks the view mode toggle to switch from "by-phase" to "by-agent." ACT-027 (toggle view mode) fires, dispatching EVT-018-filter-changed with `{ view: "costs", key: "viewMode", value: "by-agent" }`. The phase cost table (CMP-018) hides and the agent cost table (CMP-019) renders.

### Step 7 -- Examine Agent Cost Breakdown

The agent cost table shows cost per agent role:

| Agent Role   | Input Tokens | Output Tokens | Cost  | Invocations |
| ------------ | ------------ | ------------- | ----- | ----------- |
| orchestrator | 20,000       | 8,000         | $0.45 | 12          |
| analyst      | 60,000       | 18,000        | $1.20 | 8           |
| writer       | 50,000       | 20,000        | $1.15 | 5           |
| reviewer     | 15,000       | 4,000         | $0.30 | 3           |
| architect    | 5,000        | 2,000         | $0.15 | 2           |

The `topCostAgent` selector highlights the most expensive agent. Agent rows are colored with their role colors (e.g., analyst: #A78BFA, writer: #34D399).

### Step 8 -- Filter to Isolate Cost Driver

The user applies filters to narrow the view:

- **Phase filter:** Select specific phases to see their isolated costs
- **Agent role filter:** Select specific agents to compare their costs

Filters use the cost slice of STR-001 (filter store). Each filter dispatches EVT-018-filter-changed. The tables re-render with filtered data.

### Step 9 -- Identify Cost Driver

Based on the investigation, the user identifies one of three patterns:

- **Phase-dominated cost:** A single phase (e.g., spec-generation) consumes most of the budget
- **Agent-dominated cost:** A single agent (e.g., analyst) consumes most of the budget
- **Evenly distributed:** Costs are spread across phases and agents with no single driver

The `topCostPhase` and `topCostAgent` selectors surface the top contributors in the summary cards.

### Step 10 -- Return to Chat

The user navigates back to PG-002-chat to continue the conversation. The token budget bar (CMP-007) in the Chat view reflects the same budget data. The user can see how the budget status affects the chat interface:

- Warning zone: Budget bar is yellow with warning text
- Critical zone: Budget bar is orange with caution indicator
- Exhausted zone: Budget bar is red and pulsing, chat input disabled

---

## ASCII Flow Diagram

```
+---------------------------+
| Any View                  |
| CMP-002 Status Bar        |
| [budget: warning]         |
+------------+--------------+
             |
             | User notices warning indicator
             v
+---------------------------+
| ACT-001 navigate          |
| EVT-001 view-changed      |
| viewId: "costs"           |
+------------+--------------+
             |
             v
+---------------------------+
| PG-008 Cost Tracker       |
|                           |
| +-------+ +-------+      |
| |Summary| |Budget |      |
| |Cards  | |Gauge  |      |
| |CMP-017| |       |      |
| +-------+ +-------+      |
|                           |
| +---------------------+  |
| | [by-phase] [by-agent]|  |  <-- view mode toggle
| +-----+---------------+  |
|       |                   |
|  +----+----+              |
|  |         |              |
|  v         v              |
| CMP-018  CMP-019         |
| Phase    Agent            |
| Cost     Cost             |
| Table    Table            |
| +------+ +------+        |
| |disc  | |orch  |        |
| |spec  | |analy |        |
| |impl  | |write |        |
| +------+ +------+        |
|       |                   |
|       v                   |
| Filter: phases, agents    |
| EVT-018 filter-changed    |
+------------+--------------+
             |
             | User identifies cost driver
             v
+---------------------------+
| topCostPhase / topCostAgent|
| highlighted in summary     |
+------------+--------------+
             |
             | Navigate back
             v
+---------------------------+
| PG-002 Chat               |
| CMP-007 Token Budget Bar  |
| Shows same budget zone    |
| status as cost tracker    |
+---------------------------+
```

---

## State Transitions Across Stores

### STR-010 (Cost Tracker Store)

```
summary: { totalCost: 0, inputTokens: 0, outputTokens: 0, budgetPercent: 0 }
byPhase: []
byAgent: []

  --> EVT-018 (cost-summary-updated)
  summary: { totalCost: 3.25, inputTokens: 150000, outputTokens: 52000, budgetPercent: 72 }

  --> EVT-019 (phase-costs-loaded)
  byPhase: [
    { phase: "discovery", inputTokens: 45000, outputTokens: 12000, cost: 0.85 },
    { phase: "spec-generation", inputTokens: 90000, outputTokens: 35000, cost: 2.10 },
    { phase: "implementation", inputTokens: 15000, outputTokens: 5000, cost: 0.30 }
  ]

  --> EVT-020 (agent-costs-loaded)
  byAgent: [
    { agentRole: "orchestrator", inputTokens: 20000, outputTokens: 8000, cost: 0.45, invocations: 12 },
    { agentRole: "analyst", inputTokens: 60000, outputTokens: 18000, cost: 1.20, invocations: 8 },
    ...
  ]
```

### STR-001 (Filter Store -- costs slice)

```
costs: { phases: [], agentRoles: [], viewMode: "by-phase" }

  --> EVT-018 { view: "costs", key: "viewMode", value: "by-agent" }
  costs: { phases: [], agentRoles: [], viewMode: "by-agent" }

  --> EVT-018 { view: "costs", key: "phases", value: ["spec-generation"] }
  costs: { phases: ["spec-generation"], agentRoles: [], viewMode: "by-agent" }
```

### STR-004 (Chat Store -- budget)

```
tokenBudget: { used: 0, total: 200000, percent: 0 }

  --> EVT-011 (budget-updated)
  tokenBudget: { used: 144000, total: 200000, percent: 72 }
```

---

## Budget Zone Visual Mapping

```
Budget Percent:
0%         60%        85%        95%       100%
|-----------|----------|----------|---------|-->
   safe       warning    critical   exhausted

Status Bar (CMP-002):
  safe:      [*] (green dot, no label)
  warning:   [!] Budget warning (yellow)
  critical:  [!!] Budget critical (orange)
  exhausted: [!!!] Budget exhausted (red, pulsing)

Cost Tracker Gauge:
  safe:      |========------| 45% (green)
  warning:   |=============-| 72% (yellow)
  critical:  |===============| 90% (orange)
  exhausted: |===============| 98% (red, pulsing)

Chat Budget Bar (CMP-007):
  Same zones as above, plus:
  exhausted -> chat input disabled
```

---

## Key Decision Points and Branches

| Step | Condition   | Branch A              | Branch B              | Branch C               |
| ---- | ----------- | --------------------- | --------------------- | ---------------------- |
| 1    | Budget zone | Warning: yellow       | Critical: orange      | Exhausted: red pulsing |
| 5-6  | View mode   | by-phase: phase table | by-agent: agent table | --                     |
| 9    | Cost driver | Phase-dominated       | Agent-dominated       | Evenly distributed     |

---

## Design Rationale

1. **Status bar as the trigger:** The budget indicator lives in the always-visible status bar. This ensures the user never misses a budget warning, regardless of which view they are currently using. The investigation begins when the user notices this indicator.

2. **Two-axis analysis:** The by-phase and by-agent views provide two orthogonal ways to slice cost data. Phases answer "which stage is expensive?" while agents answer "which AI model/role is expensive?" Together they give a complete picture.

3. **Top-cost selectors as shortcuts:** The `topCostPhase` and `topCostAgent` selectors immediately highlight the biggest cost driver in the summary cards. The user does not need to scan tables manually for the first-pass analysis.

4. **Chat budget bar consistency:** The Chat view's budget bar (CMP-007) and the Cost Tracker's budget gauge show the same budget zone. This consistency means the user can verify the investigation conclusion by returning to Chat and seeing the same visual state.

5. **Filter for precision:** After the initial overview, filters allow the user to isolate specific phases or agents for deeper analysis. This drill-down pattern matches how users naturally investigate: overview first, then narrow.

6. **Server-computed aggregates:** The cost tracker store receives pre-computed summaries rather than aggregating raw events client-side. This keeps the UI responsive and avoids floating-point accumulation errors.

---

## Cross-References

- **Parent workflow:** WF-001-session-lifecycle (cost monitoring during pipeline execution)
- **Related workflows:** WF-002 (budget tracking during conversation), WF-005 (pipeline monitoring)
- **Stores:** STR-010 (cost tracker), STR-004 (chat -- budget), STR-001 (filter -- costs slice)
- **Components:** CMP-002 (status bar), CMP-007 (token budget bar), CMP-017 (cost summary cards), CMP-018 (phase cost table), CMP-019 (agent cost table)
- **Events:** EVT-001, EVT-011, EVT-018
- **Actions:** ACT-001, ACT-016, ACT-027
