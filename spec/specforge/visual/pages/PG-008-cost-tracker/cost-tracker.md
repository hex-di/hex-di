# PG-008 Cost Tracker

**ID:** PG-008-cost-tracker
**Route:** `#costs`
**Layout:** single-column
**Context:** Token usage and cost analysis with breakdown by phase and agent.

---

## Overview

The Cost Tracker page provides a comprehensive view of token usage and associated costs for the active session. It consists of three vertical sections: a filter bar at the top, a row of four summary cards (always visible), and a data table that toggles between phase-breakdown and agent-breakdown based on the view mode. A budget gauge on one of the summary cards uses color zones to provide at-a-glance spending health.

---

## ASCII Wireframe

```
 Cost Tracker Page (single-column, full content width)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  Filter Bar (CMP-004)                                                            │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │                                                                              ││
 │  │  ┌──────────────────┐  ┌──────────────────┐   View Mode:                    ││
 │  │  │ Phases           │  │ Agent Roles      │   ┌───────────┬────────────┐    ││
 │  │  │  [multi-select]  │  │  [multi-select]  │   │ By Phase  │  By Agent  │    ││
 │  │  └──────────────────┘  └──────────────────┘   └───────────┴────────────┘    ││
 │  │                                                (toggle, accent when active)  ││
 │  │  Active filters: [discovery x] [architect x]              [Clear All]       ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │  Summary Cards (CMP-017, always visible)                                         │
 │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
 │  │  Total Cost     │  │  Input Tokens  │  │  Output Tokens │  │  Budget %      │ │
 │  │                 │  │                │  │                │  │                │ │
 │  │   $12.47        │  │   1,234,567    │  │   456,789      │  │  ┌──────────┐ │ │
 │  │                 │  │                │  │                │  │  │ ████░░░░ │ │ │
 │  │                 │  │                │  │                │  │  │  62%     │ │ │
 │  │  --sf-accent    │  │  --sf-text     │  │  --sf-text     │  │  └──────────┘ │ │
 │  │  display font   │  │  mono font     │  │  mono font     │  │  #FF8C00      │ │
 │  │                 │  │                │  │                │  │  (warning)     │ │
 │  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘ │
 │                                                                                  │
 │  Phase Cost Table (CMP-018, shown when viewMode = "by-phase")                    │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │  Phase              │  Input Tokens  │  Output Tokens  │  Cost    │  %      ││
 │  │  ────────────────────────────────────────────────────────────────────────── ││
 │  │  discovery           │  345,678       │  123,456        │  $3.21   │  25.7% ││
 │  │  planning            │  289,012       │  98,765         │  $2.89   │  23.2% ││
 │  │  spec-authoring      │  400,877       │  134,568        │  $4.12   │  33.0% ││
 │  │  review              │  120,000       │  67,000         │  $1.45   │  11.6% ││
 │  │  implementation      │  79,000        │  33,000         │  $0.80   │   6.4% ││
 │  │  ────────────────────────────────────────────────────────────────────────── ││
 │  │  TOTAL               │  1,234,567     │  456,789        │  $12.47  │ 100%   ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │  -- OR --                                                                        │
 │                                                                                  │
 │  Agent Cost Table (CMP-019, shown when viewMode = "by-agent")                    │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │  Agent Role          │  Input Tokens  │  Output Tokens  │  Cost   │ Calls  ││
 │  │  ────────────────────────────────────────────────────────────────────────── ││
 │  │  spec-author          │  400,877       │  134,568        │  $4.12  │  12    ││
 │  │  gxp-reviewer         │  289,012       │  98,765         │  $2.89  │  8     ││
 │  │  architect             │  200,000       │  80,000         │  $2.10  │  6     ││
 │  │  test-designer         │  150,000       │  60,000         │  $1.56  │  9     ││
 │  │  validator             │  94,678        │  43,456         │  $0.95  │  5     ││
 │  │  code-reviewer         │  60,000        │  25,000         │  $0.55  │  4     ││
 │  │  domain-expert         │  30,000        │  12,000         │  $0.24  │  3     ││
 │  │  orchestrator          │  10,000        │  3,000          │  $0.06  │  15    ││
 │  │  ────────────────────────────────────────────────────────────────────────── ││
 │  │  TOTAL                │  1,234,567     │  456,789        │  $12.47 │  62    ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Budget Gauge Detail

```
 Budget Gauge Card
 ┌────────────────────────────────────┐
 │  Budget %                          │
 │                                    │
 │  ┌──────────────────────────────┐  │
 │  │                              │  │   Track bg: rgba(255,255,255,0.06)
 │  │  ████████████████░░░░░░░░░░  │  │   Fill width: budgetPercent%
 │  │                              │  │   Fill color: zone color
 │  └──────────────────────────────┘  │
 │                                    │
 │  62%                               │   Number below bar
 │                                    │
 │  Zone colors:                      │
 │    0-60%  : --sf-accent (#00F0FF)  │   safe
 │    60-85% : #FF8C00                │   warning
 │    85-95% : #FF3B3B                │   critical
 │    95-100%: #FF3B3B (pulsing)      │   exhausted
 │                                    │
 └────────────────────────────────────┘
```

### No-Session State

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │                                                                                  │
 │                     Select a session to view cost data.                           │
 │                                                                                  │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  Summary Cards (all showing $0.00 / 0)                                           │
 │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
 │  │  Total Cost     │  │  Input Tokens  │  │  Output Tokens │  │  Budget %      │ │
 │  │   $0.00         │  │   0            │  │   0            │  │   0%           │ │
 │  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘ │
 │                                                                                  │
 │                     No cost data recorded yet.                                   │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component          | Ref                        | Role                                              |
| ------------------ | -------------------------- | ------------------------------------------------- |
| Filter Bar         | CMP-004-filter-bar         | Phase and agent role filters, view-mode toggle    |
| Cost Summary Cards | CMP-017-cost-summary-cards | 4 summary stat cards (total cost, tokens, budget) |
| Phase Cost Table   | CMP-018-phase-cost-table   | Table of cost data grouped by pipeline phase      |
| Agent Cost Table   | CMP-019-agent-cost-table   | Table of cost data grouped by agent role          |

---

## States

| State      | Condition                                         | Behavior                                                                              |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| no-session | `STR-002.sessionId === null`                      | Center message: "Select a session to view cost data." All components hidden.          |
| empty      | Session active, `STR-010.summary.totalCost === 0` | Summary cards show zeroes. Center message: "No cost data recorded yet." Table hidden. |
| loading    | Cost data is being fetched                        | Summary cards show skeleton shimmers. Table shows 3 skeleton rows.                    |
| populated  | `STR-010.summary.totalCost > 0`                   | All components active. Summary cards display data. Table renders rows.                |

---

## View Mode Toggle

The view mode toggle switches between two mutually exclusive table views:

| View Mode | Visible Table            | Hidden Table             |
| --------- | ------------------------ | ------------------------ |
| by-phase  | CMP-018-phase-cost-table | CMP-019-agent-cost-table |
| by-agent  | CMP-019-agent-cost-table | CMP-018-phase-cost-table |

The toggle is rendered as a segmented control within the filter bar. The active segment uses `--sf-accent` background with `--sf-bg` text. Inactive segment uses `--sf-surface` background with `--sf-text-muted` text.

---

## Budget Gauge Color Zones

| Zone      | Range     | Fill Color                     | Animation                                |
| --------- | --------- | ------------------------------ | ---------------------------------------- |
| safe      | 0 - 60%   | `var(--sf-accent)` / `#00F0FF` | none                                     |
| warning   | 60 - 85%  | `#FF8C00`                      | none                                     |
| critical  | 85 - 95%  | `#FF3B3B`                      | none                                     |
| exhausted | 95 - 100% | `#FF3B3B`                      | pulsing (opacity 0.6-1.0, 1.5s infinite) |

The gauge track background is `rgba(255, 255, 255, 0.06)`. The fill bar animates width transitions over 400ms ease-out.

---

## Summary Cards

| Card          | Value Source                    | Format        | Font                      |
| ------------- | ------------------------------- | ------------- | ------------------------- |
| Total Cost    | `STR-010.summary.totalCost`     | `$X.XX`       | `--sf-font-display`, 28px |
| Input Tokens  | `STR-010.summary.inputTokens`   | `X,XXX,XXX`   | `--sf-font-mono`, 24px    |
| Output Tokens | `STR-010.summary.outputTokens`  | `X,XXX,XXX`   | `--sf-font-mono`, 24px    |
| Budget %      | `STR-010.summary.budgetPercent` | Gauge + `XX%` | `--sf-font-mono`, 20px    |

Card background: `--sf-surface`. Card border: `1px solid rgba(0, 240, 255, 0.06)`. Border-radius: 8px. Padding: 20px. Card label: `--sf-text-muted`, 12px, uppercase.

---

## Design Token Usage

| Token               | Usage                                                |
| ------------------- | ---------------------------------------------------- |
| `--sf-surface`      | Summary card background, table background            |
| `--sf-bg`           | Filter bar background, toggle active text            |
| `--sf-text`         | Table row text, card values                          |
| `--sf-text-muted`   | Card labels, table headers, empty state text         |
| `--sf-accent`       | Total cost value, safe gauge color, toggle active bg |
| `--sf-accent-dim`   | Active filter chip background                        |
| `--sf-border`       | Table row separators, card borders                   |
| `--sf-font-display` | Total cost value (Rajdhani)                          |
| `--sf-font-mono`    | Token counts, percentages (JetBrains Mono)           |
| `--sf-font-body`    | Labels, table text (Inter)                           |

---

## Interaction Notes

1. **View mode toggle**: Clicking "By Phase" or "By Agent" instantly swaps the visible table. The transition is a 200ms crossfade.
2. **Filter interaction**: Phase and agent role filters apply to the table data only. Summary cards always reflect the full session totals (unfiltered).
3. **Table sorting**: Both tables support column header click to sort ascending/descending. Default sort: cost descending.
4. **Total row**: Both tables include a bold totals row at the bottom summarizing all visible rows.
5. **Budget pulsing**: When budget reaches 95%+, the gauge fill pulses between opacity 0.6 and 1.0 on a 1.5s infinite cycle. Respects `prefers-reduced-motion`.
6. **Number formatting**: All token counts use comma separators. Costs use 2 decimal places with $ prefix. Percentages use 1 decimal place with % suffix.

---

## Cross-References

- **Components:** CMP-004-filter-bar, CMP-017-cost-summary-cards, CMP-018-phase-cost-table, CMP-019-agent-cost-table
- **Stores:** STR-010-cost-tracker-store, STR-001-filter-store, STR-002-active-session-store
- **Shell:** PG-010-app-shell (parent layout)
- **Nav:** CMP-001-nav-rail view="costs"
