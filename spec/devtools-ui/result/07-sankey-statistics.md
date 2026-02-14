_Previous: [06-case-explorer.md](06-case-explorer.md) | Next: [08-async-waterfall.md](08-async-waterfall.md)_

# 7. Sankey Statistics View

Aggregate flow visualization showing how Results flow through a chain across many executions. Inspired by D3 Sankey diagrams and Sentry error tracking dashboards.

## 7.1 Core Concept

Where the Railway Pipeline shows a single execution, the Sankey view shows the **statistical distribution** across ALL executions. Path widths are proportional to the number of Results that flow through them.

## 7.2 Wireframe

```
+==[Port Filter: All ▼]==[Time Range: Last 1h ▼]==[Min Flow: 1% ▼]======+
|                                                                          |
|  Entry        map          andThen       orElse        Terminal           |
|                                                                          |
|  ┌─────┐    ┌─────┐     ┌─────┐       ┌─────┐      ┌───────┐          |
|  │ Ok  │════│ Ok  │═════│ Ok  │═══════│ Ok  │══════│ Ok    │          |
|  │ 870 │    │ 870 │     │ 629 │   ╔═══│ 847 │      │ 847   │          |
|  │100% │    │100% │     │ 72% │   ║   │ 97% │      │ 97.4% │          |
|  └─────┘    └─────┘     └─────┘   ║   └─────┘      └───────┘          |
|                          ┌─────┐   ║                 ┌───────┐          |
|                          │ Err │═══╝                 │ Err   │          |
|                          │ 241 │═════════════════════│  23   │          |
|                          │ 28% │                     │ 2.6%  │          |
|                          └─────┘                     └───────┘          |
|                                                                          |
+==========================================================================+
```

### Visual Elements

| Element              | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| **Column**           | Vertical position for each operation. One column per chain step. |
| **Ok node**          | Green rectangle. Height proportional to Ok count at this step.   |
| **Err node**         | Red rectangle. Height proportional to Err count at this step.    |
| **Flow link**        | Curved SVG path connecting nodes. Width proportional to count.   |
| **Ok→Ok link**       | Green fill, opacity 0.3                                          |
| **Ok→Err link**      | Gradient from green to red, opacity 0.5 (highlights switches)    |
| **Err→Ok link**      | Gradient from red to green, opacity 0.5 (highlights recovery)    |
| **Err→Err link**     | Red fill, opacity 0.3                                            |
| **Count label**      | Absolute count inside each node                                  |
| **Percentage label** | Percentage of total below each node                              |

## 7.3 Node Detail on Hover

Hovering a node (e.g., the Err node at the `andThen` column) highlights all connected links and shows a tooltip:

```
+─── andThen(validate) · Err ────────+
│                                     │
│  241 Results arrived as Err here    │
│                                     │
│  Sources:                           │
│    241 from Ok track (switched)     │
│      0 from Err track (passthrough) │
│                                     │
│  Destinations:                      │
│    218 recovered to Ok (orElse)     │
│     23 stayed Err (to terminal)     │
│                                     │
│  Switch rate: 27.7% of Ok inputs    │
│  Recovery rate: 90.5% of Err inputs │
+─────────────────────────────────────+
```

## 7.4 Link Detail on Hover

Hovering a link (e.g., the Ok→Err link between `andThen` and `orElse`) highlights the link and shows:

```
+─── Ok → Err at andThen(validate) ──+
│                                     │
│  241 Results switched from Ok→Err   │
│  27.7% of inputs at this step       │
│                                     │
│  Top error types:                   │
│    ValidationError  198 (82.2%)     │
│    TypeError         31 (12.9%)     │
│    Other             12  (5.0%)     │
│                                     │
│  [View error distribution chart]    │
+─────────────────────────────────────+
```

## 7.5 Error Hotspot Ranking

Below the Sankey diagram, a ranked list of operations by "impact":

```
+─── Error Hotspots ──────────────────────────────────────────+
│                                                              │
│  Rank │ Operation         │ Switch Rate │ Impact   │ Trend  │
│  ─────│───────────────────│─────────────│──────────│─────── │
│  1    │ andThen(validate) │ 27.7%       │ 241 Err  │ ▲ +2%  │
│  2    │ andThrough(check) │  3.1%       │  27 Err  │ ▼ -1%  │
│  3    │ orElse(recover)   │  9.5% fail  │  23 Err  │ → 0%   │
│                                                              │
│  Recovery Heroes:                                            │
│  1    │ orElse(recover)   │ 90.5% fix   │ 218 Ok   │ ▲ +3%  │
│                                                              │
+──────────────────────────────────────────────────────────────+
```

### Hotspot Metrics

| Metric        | Formula                            | Description                           |
| ------------- | ---------------------------------- | ------------------------------------- |
| Switch rate   | switches / inputs                  | Fraction of inputs that changed track |
| Impact        | absolute switch count              | Total Results affected                |
| Recovery rate | successful_recoveries / err_inputs | For recovery operations (orElse)      |
| Trend         | current_rate - previous_rate       | Change vs previous time window        |

## 7.6 Multi-Port Aggregate View

When "All" is selected in the port filter, the Sankey view aggregates across all ports:

```
+==[All Ports Aggregate]=================================================+
|                                                                          |
|  ┌───────────────┐        ┌───────────┐          ┌──────────┐          |
|  │ validateUser  │════════│           │══════════│          │          |
|  │ Ok: 847       │        │   Total   │          │  Total   │          |
|  │ Err: 23       │        │   Ok:     │          │  Ok:     │          |
|  ├───────────────┤        │   2,847   │          │  2,711   │          |
|  │ fetchPosts    │════════│   (89%)   │          │  (95%)   │          |
|  │ Ok: 401       │        │           │          │          │          |
|  │ Err: 49       │        │   Err:    │          │  Err:    │          |
|  ├───────────────┤        │   353     │          │  136     │          |
|  │ processPayment│════════│   (11%)   │          │  (5%)    │          |
|  │ Ok: 1,188     │        │           │          │          │          |
|  │ Err: 12       │        └───────────┘          └──────────┘          |
|  └───────────────┘                                                      |
|                                                                          |
+==========================================================================+
```

This shows the system-wide flow of Ok/Err Results from sources (ports) through aggregate handling to final outcomes.

## 7.7 Time Range Control

| Range          | Description            |
| -------------- | ---------------------- |
| Last 5 minutes | Real-time monitoring   |
| Last 1 hour    | Short-term patterns    |
| Last 24 hours  | Daily patterns         |
| All time       | Full history           |
| Custom         | Date-time range picker |

Changing the range recomputes all Sankey node counts and link widths.

## 7.8 Stability Score Timeline

A sparkline chart showing the stability score (ok rate) over time for the selected chain:

```
100% ─────────────╲    ╱──────────────
                    ╲──╱
 90% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                  ↑
            dip: 87% at 14:22
 80% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

     12:00    13:00    14:00    14:30
```

The sparkline uses CSS custom properties for threshold colors:

- Green (>= 95%): `--hex-result-ok`
- Amber (80-95%): `--hex-warning`
- Red (< 80%): `--hex-result-err`

_Previous: [06-case-explorer.md](06-case-explorer.md) | Next: [08-async-waterfall.md](08-async-waterfall.md)_
