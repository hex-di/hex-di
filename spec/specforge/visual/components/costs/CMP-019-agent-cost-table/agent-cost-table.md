# CMP-019: Agent Cost Table

**ID:** CMP-019-agent-cost-table
**Context:** Cost view (PG-008-costs), table showing cost breakdown by agent role.

---

## Overview

The Agent Cost Table displays a full-width table of cost data grouped by agent role. Each row shows the agent name with a colored role badge, input token count, output token count, total cost, and invocation count. The table supports sorting by any column and filtering by agent role. Rows alternate background color for readability.

---

## ASCII Mockup

```
 Agent Cost Table
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  Agent             │ Input Tokens │ Output Tokens │ Cost    │ Invocations   │
 │  ──────────────────┼──────────────┼───────────────┼─────────┼───────────    │
 │  [architect]       │     38,200   │      10,100   │  $0.90  │     3         │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  [gxp-reviewer]    │     52,400   │      14,800   │  $1.50  │     5         │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  [test-designer]   │     22,600   │       6,200   │  $0.40  │     2         │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  [orchestrator]    │     12,200   │       3,000   │  $0.15  │     8         │
 │                                                                              │
 │  [agent] = colored role badge                                                │
 │  alternating: transparent / rgba(0, 240, 255, 0.02)                         │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Agent Role Badge Colors

Each agent role has a distinct badge color for quick visual identification. The badge is a small pill rendered inline in the Agent column.

```
 spec-author:   #4FC3F7 (light blue)
 gxp-reviewer:  #FF8C00 (orange)
 test-designer: #22C55E (green)
 architect:     #A78BFA (purple)
 validator:     #FFD600 (yellow)
 code-reviewer: #F472B6 (pink)
 domain-expert: #60A5FA (blue)
 orchestrator:  var(--sf-accent) (cyan)
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │                     No agent cost data available.                            │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout

- **Container:** Full-width flex column.
- **Table:** Standard table layout with header row and data rows.
- **Row backgrounds:** Alternating -- even rows `transparent`, odd rows `rgba(0, 240, 255, 0.02)`.
- **Numeric columns:** Right-aligned.
- **Agent column:** Contains a colored badge pill next to the agent role name.

---

## Columns

| Column        | Field          | Sortable | Align | Format     | Special            |
| ------------- | -------------- | -------- | ----- | ---------- | ------------------ |
| Agent         | `agentRole`    | Yes      | Left  | Plain text | Colored role badge |
| Input Tokens  | `inputTokens`  | Yes      | Right | `###,###`  | --                 |
| Output Tokens | `outputTokens` | Yes      | Right | `###,###`  | --                 |
| Cost          | `cost`         | Yes      | Right | `$X.XX`    | --                 |
| Invocations   | `invocations`  | Yes      | Right | Plain int  | --                 |

---

## Sorting

- Clicking a column header sorts the table by that column ascending.
- Clicking the same column header again toggles to descending.
- A sort indicator arrow is shown in the active column header.
- Default sort: by agent role name ascending.

---

## Filtering

| Filter      | Source (STR-001)   | Behavior                                 |
| ----------- | ------------------ | ---------------------------------------- |
| Agent Roles | `costs.agentRoles` | Show only rows matching selected role(s) |

When `costs.agentRoles` is empty (default), all agents are shown.

---

## Visual States

### Column Header

| State   | Color             | Extra                  |
| ------- | ----------------- | ---------------------- |
| Default | `--sf-text-muted` | --                     |
| Hover   | `--sf-text`       | --                     |
| Active  | `--sf-accent`     | Sort indicator visible |

### Row (ELM-066)

| State | Background                |
| ----- | ------------------------- |
| Even  | `transparent`             |
| Odd   | `rgba(0, 240, 255, 0.02)` |
| Hover | `rgba(0, 240, 255, 0.05)` |

---

## Token Usage

| Token             | Usage                            |
| ----------------- | -------------------------------- |
| `--sf-surface`    | Table container background       |
| `--sf-text`       | Agent name, numeric values       |
| `--sf-text-muted` | Column headers, empty state      |
| `--sf-accent`     | Active sort header, orchestrator |

---

## Cross-References

- **Store:** STR-010-cost-tracker-store (byAgent)
- **Store:** STR-001-filter-store (costs.agentRoles)
- **Elements:** ELM-066-agent-cost-row
- **Sibling:** CMP-017-cost-summary-cards, CMP-018-phase-cost-table
- **Page:** PG-008-costs (parent page)
