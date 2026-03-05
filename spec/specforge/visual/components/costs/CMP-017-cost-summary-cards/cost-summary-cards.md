# CMP-017: Cost Summary Cards

**ID:** CMP-017-cost-summary-cards
**Context:** Cost view (PG-008-costs), row of 4 summary cards showing key cost metrics.

---

## Overview

The Cost Summary Cards component renders a horizontal row of 4 equally sized cards displaying the current cost metrics for the active session. The first three cards show numeric values (total cost, input tokens, output tokens) while the fourth contains a budget gauge with percentage and color-coded zones.

---

## ASCII Mockup

```
 Cost Summary Cards
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
 │  │ Total Cost   │  │ Input Tokens │  │ Output Tokens│  │ Budget       │     │
 │  │              │  │              │  │              │  │              │     │
 │  │   $2.47      │  │  125,400     │  │   32,100     │  │  ┌────────┐ │     │
 │  │              │  │              │  │              │  │  │████░░░░│ │     │
 │  │              │  │              │  │              │  │  └────────┘ │     │
 │  │              │  │              │  │              │  │     47%     │     │
 │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
 │                                                                              │
 │  ◄──── flex: 1 1 0 ──── gap: 16px ──── 4 equal cards ────►                 │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Budget Gauge Zone Colors

```
 Safe (0-60%):
 ┌────────────────────┐
 │████████░░░░░░░░░░░░│  accent / cyan
 └────────────────────┘

 Warning (60-85%):
 ┌────────────────────┐
 │████████████████░░░░│  #FF8C00 / orange
 └────────────────────┘

 Critical (85-95%):
 ┌────────────────────┐
 │██████████████████░░│  #FF3B3B / red
 └────────────────────┘

 Exhausted (95-100%):
 ┌────────────────────┐
 │████████████████████│  #FF3B3B / red + pulsing animation
 └────────────────────┘
```

---

## Layout

- **Container:** Horizontal flex row, gap 16px, full width.
- **Cards:** 4 equal-width cards using `flex: 1 1 0`.
- **Card structure (ELM-063):** Label text at top (muted, 11px), value text below (white, 18px bold), surface background with subtle border.
- **Budget card:** Same card structure but value area contains an ELM-064 budget gauge bar instead of plain text.

---

## Cards

| Card # | Label         | Value Format  | Data Field              |
| ------ | ------------- | ------------- | ----------------------- |
| 1      | Total Cost    | `$X.XX`       | `summary.totalCost`     |
| 2      | Input Tokens  | `XXX,XXX`     | `summary.inputTokens`   |
| 3      | Output Tokens | `XXX,XXX`     | `summary.outputTokens`  |
| 4      | Budget        | Gauge + `XX%` | `summary.budgetPercent` |

---

## Budget Gauge (ELM-064)

The budget gauge is a horizontal bar that fills proportionally to `budgetPercent` and changes color based on the zone.

| Zone      | Percent Range | Gauge Color   | Animation                         |
| --------- | ------------- | ------------- | --------------------------------- |
| safe      | 0% - 60%      | `--sf-accent` | None                              |
| warning   | 60% - 85%     | `#FF8C00`     | None                              |
| critical  | 85% - 95%     | `#FF3B3B`     | None                              |
| exhausted | 95% - 100%    | `#FF3B3B`     | `pulse 1.5s ease-in-out infinite` |

The percentage text is displayed below the gauge bar.

---

## Visual States

### ELM-063 Cost Summary Card

| State   | Background     | Border                           |
| ------- | -------------- | -------------------------------- |
| Default | `--sf-surface` | `1px solid rgba(0,240,255,0.08)` |

- Label: 11px, `--sf-text-muted`, uppercase.
- Value: 18px, `--sf-text`, font-weight 600.

---

## Token Usage

| Token             | Usage                 |
| ----------------- | --------------------- |
| `--sf-surface`    | Card background       |
| `--sf-text`       | Value text            |
| `--sf-text-muted` | Label text            |
| `--sf-accent`     | Safe zone gauge color |

---

## Cross-References

- **Store:** STR-010-cost-tracker-store (summary)
- **Elements:** ELM-063-cost-summary-card, ELM-064-budget-gauge
- **Page:** PG-008-costs (parent page)
- **Sibling:** CMP-018-phase-cost-table, CMP-019-agent-cost-table
