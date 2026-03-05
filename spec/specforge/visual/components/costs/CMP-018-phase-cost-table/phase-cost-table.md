# CMP-018: Phase Cost Table

**ID:** CMP-018-phase-cost-table
**Context:** Cost view (PG-008-costs), table showing cost breakdown by pipeline phase.

---

## Overview

The Phase Cost Table displays a full-width table of cost data grouped by pipeline phase. Each row shows the phase name, input token count, output token count, and total cost. The table supports sorting by any column and filtering by phase. Rows alternate background color for readability.

---

## ASCII Mockup

```
 Phase Cost Table
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  Phase Name       │  Input Tokens  │  Output Tokens  │  Cost               │
 │  ─────────────────┼────────────────┼─────────────────┼──────────────────    │
 │  analysis         │      42,300    │       11,200    │  $0.50              │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  review           │      65,100    │       18,400    │  $1.20              │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  synthesis        │      28,000    │        8,500    │  $0.80              │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
 │  validation       │      15,200    │        4,100    │  $0.35              │
 │                                                                              │
 │  alternating: transparent / rgba(0, 240, 255, 0.02)                         │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘

 Column header click toggles sort:
 Phase Name [v]     -- ascending/descending
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │                     No phase cost data available.                            │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout

- **Container:** Full-width flex column.
- **Table:** Standard table layout with header row and data rows.
- **Row backgrounds:** Alternating -- even rows `transparent`, odd rows `rgba(0, 240, 255, 0.02)`.
- **Numeric columns:** Right-aligned for easy scanning.

---

## Columns

| Column        | Field          | Sortable | Align | Format     |
| ------------- | -------------- | -------- | ----- | ---------- |
| Phase Name    | `phase`        | Yes      | Left  | Plain text |
| Input Tokens  | `inputTokens`  | Yes      | Right | `###,###`  |
| Output Tokens | `outputTokens` | Yes      | Right | `###,###`  |
| Cost          | `cost`         | Yes      | Right | `$X.XX`    |

---

## Sorting

- Clicking a column header sorts the table by that column ascending.
- Clicking the same column header again toggles to descending.
- A sort indicator arrow is shown in the active column header.
- Default sort: by phase name ascending.

---

## Filtering

| Filter | Source (STR-001) | Behavior                                  |
| ------ | ---------------- | ----------------------------------------- |
| Phases | `costs.phases`   | Show only rows matching selected phase(s) |

When `costs.phases` is empty (default), all phases are shown.

---

## Visual States

### Column Header

| State   | Color             | Extra                  |
| ------- | ----------------- | ---------------------- |
| Default | `--sf-text-muted` | --                     |
| Hover   | `--sf-text`       | --                     |
| Active  | `--sf-accent`     | Sort indicator visible |

### Row (ELM-065)

| State | Background                |
| ----- | ------------------------- |
| Even  | `transparent`             |
| Odd   | `rgba(0, 240, 255, 0.02)` |
| Hover | `rgba(0, 240, 255, 0.05)` |

---

## Token Usage

| Token             | Usage                       |
| ----------------- | --------------------------- |
| `--sf-surface`    | Table container background  |
| `--sf-text`       | Phase name, numeric values  |
| `--sf-text-muted` | Column headers, empty state |
| `--sf-accent`     | Active sort column header   |

---

## Cross-References

- **Store:** STR-010-cost-tracker-store (byPhase)
- **Store:** STR-001-filter-store (costs.phases)
- **Elements:** ELM-065-phase-cost-row
- **Sibling:** CMP-017-cost-summary-cards, CMP-019-agent-cost-table
- **Page:** PG-008-costs (parent page)
