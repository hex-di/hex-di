# CMP-003 Search Overlay

**ID:** CMP-003-search-overlay
**Context:** Full-screen modal overlay for global search across the application.

---

## Overview

The Search Overlay is a modal dialog that provides global search across all searchable entities in the application. It renders as a 560px-wide panel centered horizontally and positioned 80px from the top of the viewport, over a blurred dark backdrop. The overlay is opened via the "/" keyboard shortcut or the search button in the nav rail (ELM-004), and dismissed via Escape or clicking the backdrop.

Results are grouped into five categories and navigable via keyboard.

## ASCII Mockup

```
 Full Viewport (fixed overlay, z-index: 100)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │  ELM-009 Backdrop: rgba(0,0,0,0.6) + blur(4px)                         │
 │                                                                          │
 │         80px from top                                                    │
 │         v                                                                │
 │     ┌──────────────────────────────────────────────┐                     │
 │     │  Search Panel (560px wide)                   │                     │
 │     │                                              │                     │
 │     │  ┌──────────────────────────────────────────┐│                     │
 │     │  │  /  Search sessions, specs, tasks...     ││ <-- ELM-010 input  │
 │     │  └──────────────────────────────────────────┘│                     │
 │     │                                              │                     │
 │     │  ─────────────────────────────────────────── │ <-- border divider  │
 │     │                                              │                     │
 │     │  SESSIONS                                    │ <-- ELM-011 label  │
 │     │  ┌──────────────────────────────────────────┐│                     │
 │     │  │ > sess_abc123  "Fix auth flow"           ││ <-- ELM-012 (sel.) │
 │     │  │   sess_def456  "Add pipeline stage"      ││ <-- ELM-012        │
 │     │  └──────────────────────────────────────────┘│                     │
 │     │                                              │                     │
 │     │  SPECS                                       │ <-- ELM-011 label  │
 │     │  ┌──────────────────────────────────────────┐│                     │
 │     │  │   auth/permissions.md                    ││ <-- ELM-012        │
 │     │  └──────────────────────────────────────────┘│                     │
 │     │                                              │                     │
 │     │  TASKS                                       │ <-- ELM-011 label  │
 │     │  ┌──────────────────────────────────────────┐│                     │
 │     │  │   TSK-042  "Implement guard adapter"     ││ <-- ELM-012        │
 │     │  │   TSK-043  "Write guard tests"           ││ <-- ELM-012        │
 │     │  └──────────────────────────────────────────┘│                     │
 │     │                                              │                     │
 │     │  ─────────────────────────────────────────── │ <-- border divider  │
 │     │                                              │                     │
 │     │  Up/Down to navigate  Enter to select  Esc  │ <-- ELM-013 hints  │
 │     │  to close                                    │                     │
 │     └──────────────────────────────────────────────┘                     │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘
```

## Search Categories

Results are grouped under these category headers (ELM-011). Categories with zero results are hidden.

| Category    | Description                                     |
| ----------- | ----------------------------------------------- |
| Sessions    | Matching session names and IDs                  |
| Specs       | Matching specification file paths and titles    |
| Tasks       | Matching task IDs, titles, and descriptions     |
| Messages    | Matching ACP session messages and chat messages |
| Graph Nodes | Matching dependency graph node names            |

## Panel Structure

The panel is organized in three vertical sections:

1. **Input area** (top): Contains the search input (ELM-010) with a search icon prefix and placeholder text.
2. **Results area** (middle, scrollable): Contains category labels (ELM-011) and result items (ELM-012). Scrolls vertically when results exceed available space.
3. **Hint footer** (bottom): Contains keyboard navigation hints (ELM-013).

## Layout Rules

### Overlay (fixed container)

| Property        | Value  | Notes                   |
| --------------- | ------ | ----------------------- |
| position        | fixed  | Covers entire viewport  |
| inset           | 0      | All edges at 0          |
| display         | flex   | Centers the panel       |
| justify-content | center | Horizontal centering    |
| z-index         | 100    | Above all other content |

### Backdrop (ELM-009)

| Property        | Value              | Notes                  |
| --------------- | ------------------ | ---------------------- |
| background      | rgba(0, 0, 0, 0.6) | Semi-transparent black |
| backdrop-filter | blur(4px)          | Blurs content behind   |

### Panel

| Property       | Value                             | Notes                             |
| -------------- | --------------------------------- | --------------------------------- |
| width          | 560px                             | Fixed width, centered             |
| margin-top     | 80px                              | Offset from top of viewport       |
| max-height     | calc(100vh - 160px)               | Prevents overflowing bottom       |
| display        | flex                              | Column layout for sections        |
| flex-direction | column                            | Input > results > hints           |
| background     | var(--sf-surface)                 | Dark surface background           |
| border-radius  | 12px                              | Rounded corners                   |
| border         | 1px solid rgba(0, 240, 255, 0.15) | Subtle accent border              |
| box-shadow     | 0 24px 48px rgba(0, 0, 0, 0.5)    | Deep shadow for elevation         |
| overflow       | hidden                            | Clips children to rounded corners |

## Keyboard Interaction

| Key         | Action                                       |
| ----------- | -------------------------------------------- |
| `/`         | Opens the overlay (handled by parent shell)  |
| `Escape`    | Closes the overlay, invokes onClose callback |
| `ArrowUp`   | Moves selection to previous result item      |
| `ArrowDown` | Moves selection to next result item          |
| `Enter`     | Navigates to the selected result item        |

Arrow keys wrap: pressing Up on the first item selects the last; pressing Down on the last selects the first.

## Selected Result Highlight

The currently selected result item (tracked by `selectedIndex` in STR-012) receives:

- Background: `rgba(0, 240, 255, 0.08)`
- A `>` prefix indicator in muted text

## Store Bindings

| Store                           | Selector            | Bound To         | Description                           |
| ------------------------------- | ------------------- | ---------------- | ------------------------------------- |
| STR-012 search-store            | query               | ELM-010 value    | Current search query string           |
| STR-012 search-store            | results             | Results list     | Grouped search results by category    |
| STR-012 search-store            | selectedIndex       | Highlighted item | Index of keyboard-selected result     |
| STR-015 keyboard-shortcut-store | shortcutsForContext | ELM-013 content  | Keyboard hints for the search context |

## Token Usage

| Token             | Usage                                    |
| ----------------- | ---------------------------------------- |
| `--sf-surface`    | Panel background                         |
| `--sf-accent`     | Input focus ring, category label color   |
| `--sf-text`       | Result item primary text                 |
| `--sf-text-muted` | Placeholder text, hint text, selection > |
| `--sf-font-body`  | All text font family                     |

## Cross-References

- **Elements:** ELM-009 through ELM-013 (backdrop, input, category label, result item, hint text)
- **Store:** STR-012 search-store (query, results, selection)
- **Store:** STR-015 keyboard-shortcut-store (keyboard hints)
- **Action:** ACT-003-open-search (triggers overlay open)
- **Component:** CMP-001-nav-rail (contains the search button trigger)
