# Cost Elements

**IDs:** ELM-063 through ELM-067
**Context:** Cost tracker view (PG-008-cost-tracker), displayed inside CMP-017-cost-summary-cards, CMP-018-phase-cost-table, and CMP-019-agent-cost-table.

---

## ASCII Mockup -- Summary Cards Row

```
 ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 │ ELM-063        │  │ ELM-063        │  │ ELM-063        │  │ ELM-063        │
 │                │  │                │  │                │  │                │
 │ TOTAL COST     │  │ INPUT TOKENS   │  │ OUTPUT TOKENS  │  │ BUDGET %       │
 │ $14.23         │  │ 1.2M           │  │ 340K           │  │ 42%            │
 │ across 3 flows │  │ total consumed │  │ total produced │  │ of $34 budget  │
 └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
   11px label UPPER     24px display        11px subtitle
```

## ASCII Mockup -- Budget Gauge

```
          ___________
        /    ////    \
       /   ////       \        ELM-064 Budget Gauge
      |  ////          |       Circular arc, 120x120px
      |  ///    42%    |       Center label: 20px display font
      |  //            |
       \              /        Color zones:
        \____________/           0-60%:  accent (cyan)
                                60-85%:  #FF8C00 (orange)
      safe zone (accent)       85-95%:  #FF3B3B (red)
                               95-100%: #FF3B3B + pulse
```

## ASCII Mockup -- Phase Cost Table (by-phase mode)

```
 Phase Name          Input Tokens    Output Tokens    Cost
 ─────────────────────────────────────────────────────────────
 ELM-065 Phase Cost Row
 ┌─────────────────────────────────────────────────────────────┐
 │ Discovery            245,320          82,100         $3.42  │
 ├─────────────────────────────────────────────────────────────┤
 │ Spec Authoring       512,080         148,350         $6.81  │
 ├─────────────────────────────────────────────────────────────┤
 │ Review               198,400          62,200         $2.54  │
 └─────────────────────────────────────────────────────────────┘
   13px text             mono right-aligned    mono bold
```

## ASCII Mockup -- Agent Cost Table (by-agent mode)

```
 Agent Role             Input       Output       Cost     Invocations
 ──────────────────────────────────────────────────────────────────────
 ELM-066 Agent Cost Row
 ┌──────────────────────────────────────────────────────────────────────┐
 │ [SPEC-AUTHOR]  SA    512,080     148,350      $6.81        12      │
 │  ▲ ELM-058 badge                                                    │
 ├──────────────────────────────────────────────────────────────────────┤
 │ [REVIEWER]  Rev      198,400      62,200      $2.54         8      │
 ├──────────────────────────────────────────────────────────────────────┤
 │ [DEV-AGENT]  Dev     245,320      82,100      $3.42         5      │
 └──────────────────────────────────────────────────────────────────────┘
```

## ASCII Mockup -- View Mode Toggle

```
 ┌──────────────────────────────┐
 │  ELM-067 View Mode Toggle    │
 │  ┌────────────┬────────────┐ │
 │  │  By Phase  │  By Agent  │ │
 │  │  (active)  │  (default) │ │
 │  └────────────┴────────────┘ │
 └──────────────────────────────┘
```

## Visual States

### ELM-063 Cost Summary Card

- Label: 11px uppercase muted text with letter-spacing.
- Value: 24px display font, bold, primary text color.
- Subtitle: 11px muted explanatory text.
- Background: `--sf-surface`, 8px border-radius.

### ELM-064 Budget Gauge

| Zone      | Arc Color     | Condition  | Animation           |
| --------- | ------------- | ---------- | ------------------- |
| Safe      | `--sf-accent` | 0% - 59%   | None                |
| Warning   | `#FF8C00`     | 60% - 84%  | None                |
| Critical  | `#FF3B3B`     | 85% - 94%  | None                |
| Exhausted | `#FF3B3B`     | 95% - 100% | Pulse 1.5s infinite |

- Track: `--sf-surface-elevated`, 8px stroke width, round linecap.
- Center: percentage value in 20px display font.

### ELM-065 Phase Cost Row

| State   | Background                |
| ------- | ------------------------- |
| Default | `transparent`             |
| Hover   | `rgba(0, 240, 255, 0.03)` |

Columns: phase name (13px, flex 2), input tokens (mono, right, flex 1), output tokens (mono, right, flex 1), cost (mono bold, right, flex 1). Sortable.

### ELM-066 Agent Cost Row

| State   | Background                |
| ------- | ------------------------- |
| Default | `transparent`             |
| Hover   | `rgba(0, 240, 255, 0.03)` |

Same columns as phase row plus invocations column. Includes role-colored badge (ELM-058).

### ELM-067 Cost View Mode Toggle

| State   | Text Color        | Background                |
| ------- | ----------------- | ------------------------- |
| Default | `--sf-text-muted` | `--sf-surface`            |
| Hover   | `--sf-text`       | `rgba(0, 240, 255, 0.05)` |
| Active  | `--sf-accent`     | `--sf-accent-dim`         |

Segmented control with two mutually exclusive options.

## Token Usage

| Token                   | Usage                              |
| ----------------------- | ---------------------------------- |
| `--sf-surface`          | Summary card bg, toggle default bg |
| `--sf-surface-elevated` | Gauge track background             |
| `--sf-text`             | Phase name, cost value, card value |
| `--sf-text-muted`       | Card label/subtitle, token counts  |
| `--sf-accent`           | Safe gauge zone, active toggle     |
| `--sf-accent-dim`       | Active toggle background           |
| `--sf-border`           | Row separator border               |
| `--sf-font-display`     | Summary value, gauge center label  |
| `--sf-font-mono`        | Token counts, cost values          |

## Cross-References

- **Action:** ACT-016-set-filter (view mode toggle click)
- **Element:** ELM-058-agent-role-badge (reused in agent cost rows)
- **Component:** CMP-017-cost-summary-cards (summary card container)
- **Component:** CMP-018-phase-cost-table (phase table container)
- **Component:** CMP-019-agent-cost-table (agent table container)
- **Store:** STR-010-cost-tracker-store (cost data source)
- **Store:** STR-001-filter-store (costs filter state)
- **Page:** PG-008-cost-tracker (parent page)
