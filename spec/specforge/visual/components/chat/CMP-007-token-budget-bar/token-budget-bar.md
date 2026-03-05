# CMP-007 Token Budget Bar

**ID:** CMP-007-token-budget-bar
**Context:** Chat view -- positioned above the message list to show token budget utilization.

---

## Overview

The Token Budget Bar is a horizontal progress bar that visualizes how much of the session's token budget has been consumed. It provides at-a-glance feedback through color-coded budget zones: safe, warning, critical, and exhausted. A label below the bar shows the exact count.

## ASCII Mockup

```
 Token Budget Bar (full width)
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │  ELM-029 Token Budget Progress (4px height)                     │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  ELM-030 Token Budget Label                                     │
 │  12,450 / 30,000 tokens (42%)                                   │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 Budget zone visualizations:

 Safe (0-60%) -- accent color:
 │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
   accent fill                    surface-alt track

 Warning (60-85%) -- orange:
 │ ██████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░ │
   #FF8C00 fill                          surface-alt track

 Critical (85-95%) -- red:
 │ █████████████████████████████████████████████████████░░░░░░░░░░ │
   #FF3B3B fill                                        surface-alt

 Exhausted (95-100%) -- pulsing red:
 │ ██████████████████████████████████████████████████████████████░ │
   #FF3B3B pulsing fill                                     track
```

## Layout

| Property       | Value  | Notes                       |
| -------------- | ------ | --------------------------- |
| display        | flex   | Vertical stack              |
| flex-direction | column | Bar on top, label below     |
| width          | 100%   | Full width of chat view     |
| gap            | 4px    | Space between bar and label |

## Progress Bar Specs

| Property        | Value                                           |
| --------------- | ----------------------------------------------- |
| Height          | 4px                                             |
| Border radius   | 2px                                             |
| Track color     | `var(--sf-surface-alt)`                         |
| Fill transition | `width 300ms ease, background-color 300ms ease` |

## Budget Zones

The fill color changes based on the current percentage to communicate urgency.

| Zone      | Range    | Fill Color         | Animation                         |
| --------- | -------- | ------------------ | --------------------------------- |
| Safe      | 0--60%   | `var(--sf-accent)` | None                              |
| Warning   | 60--85%  | `#FF8C00`          | None                              |
| Critical  | 85--95%  | `#FF3B3B`          | None                              |
| Exhausted | 95--100% | `#FF3B3B`          | `pulse 1.5s ease-in-out infinite` |

Zone boundaries are exclusive on the left, inclusive on the right (e.g., 60.1% enters warning). The `pulse` animation on the exhausted zone provides a visual alarm that the budget is nearly or fully spent.

## Children

| Element                       | Role                                          |
| ----------------------------- | --------------------------------------------- |
| ELM-029-token-budget-progress | The 4px progress bar track and fill           |
| ELM-030-token-budget-label    | Text label showing "used / total tokens (X%)" |

## Store Bindings

| Store              | Selector              | Component Prop |
| ------------------ | --------------------- | -------------- |
| STR-004 chat-store | `tokenBudget.used`    | `used`         |
| STR-004 chat-store | `tokenBudget.total`   | `total`        |
| STR-004 chat-store | `tokenBudget.percent` | `percent`      |

## Token Usage

| Token              | Usage                |
| ------------------ | -------------------- |
| `--sf-accent`      | Safe zone fill color |
| `--sf-surface-alt` | Progress bar track   |
| `--sf-text-muted`  | Label text color     |
| `--sf-font-body`   | Label font family    |

## Cross-References

- **Store:** STR-004-chat-store (token budget data)
- **Element:** ELM-029-token-budget-progress (progress bar)
- **Element:** ELM-030-token-budget-label (text label)
