# CMP-001 Nav Rail

**ID:** CMP-001-nav-rail
**Context:** Vertical navigation sidebar on the left edge of the application shell.

---

## Overview

The Nav Rail is a persistent vertical sidebar that provides primary navigation for the application. It is 64px wide, spans the full height of the viewport, and uses a dark surface background. It contains 9 view navigation buttons stacked vertically with a search button pinned to the bottom.

The rail occupies `grid-row: 1 / -1` in the shell grid layout, ensuring it spans all rows including the status bar row.

## ASCII Mockup

```
 Nav Rail (64px)
 ┌────────────────┐
 │   12px top pad  │
 │                 │
 │    ┌───────┐   │
 │    │   ⌂   │   │  Home (ELM-001 + ELM-002 + ELM-003)
 │    │ Home  │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │  ▐ │   ◎   │   │  Chat (active state: accent + 3px left bar)
 │  ▐ │ Chat  │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ▸   │   │  Pipeline
 │    │Pipelin│   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ≡   │   │  Spec
 │    │ Spec  │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ☰   │   │  Tasks
 │    │ Tasks │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ◉   │   │  Coverage
 │    │Coverag│   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ▦   │   │  Board (ACP Session)
 │    │ Board │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   $   │   │  Costs
 │    │ Costs │   │
 │    └───────┘   │
 │     4px gap     │
 │    ┌───────┐   │
 │    │   ◇   │   │  Graph
 │    │ Graph │   │
 │    └───────┘   │
 │                 │
 │  (auto margin)  │  <-- margin-top: auto pushes search to bottom
 │                 │
 │    ┌───────┐   │
 │    │   /   │   │  Search (ELM-004)
 │    │Search │   │
 │    └───────┘   │
 │                 │
 │   12px bot pad  │
 └────────────────┘
```

## Nav Items

| Order | View ID     | Icon | Label    | Description                |
| ----- | ----------- | ---- | -------- | -------------------------- |
| 1     | home        | ⌂    | Home     | Session overview dashboard |
| 2     | chat        | ◎    | Chat     | Conversation interface     |
| 3     | pipeline    | ▸    | Pipeline | Pipeline execution view    |
| 4     | spec        | ≡    | Spec     | Specification browser      |
| 5     | tasks       | ☰   | Tasks    | Task board / kanban        |
| 6     | coverage    | ◉    | Coverage | Requirement coverage map   |
| 7     | acp-session | ▦    | Board    | ACP session message log    |
| 8     | costs       | $    | Costs    | Cost tracking dashboard    |
| 9     | graph       | ◇    | Graph    | Dependency graph explorer  |
| --    | (search)    | /    | Search   | Opens search overlay       |

## Active State

When a nav button matches the `currentView` prop:

- Icon and label color change to `--sf-accent`
- Background changes to `--sf-accent-dim`
- A 3px solid accent-colored left indicator bar appears
- All other buttons revert to their default muted state

Only one button can be active at any time since `currentView` is a single value.

## Layout Rules

| Property       | Value                             | Notes                                         |
| -------------- | --------------------------------- | --------------------------------------------- |
| width          | 64px                              | Fixed width, does not flex                    |
| height         | 100%                              | Full viewport height                          |
| display        | flex                              | Column layout                                 |
| flex-direction | column                            | Buttons stacked vertically                    |
| align-items    | center                            | Buttons centered horizontally within the 64px |
| gap            | 4px                               | Space between adjacent nav buttons            |
| padding        | 12px 0                            | Vertical padding top and bottom               |
| grid-row       | 1 / -1                            | Spans all grid rows in the shell layout       |
| border-right   | 1px solid rgba(0, 240, 255, 0.08) | Subtle accent divider line                    |

## Search Button Positioning

The search button (ELM-004) uses `margin-top: auto` to push itself to the bottom of the flex column, creating visual separation between the 9 navigation buttons and the search action.

## Store Bindings

| Store                | Selector    | Bound To    | Description                           |
| -------------------- | ----------- | ----------- | ------------------------------------- |
| STR-014 router-store | currentView | currentView | Determines which nav button is active |

## Token Usage

| Token             | Usage                               |
| ----------------- | ----------------------------------- |
| `--sf-surface`    | Rail background color               |
| `--sf-accent`     | Active button color, left indicator |
| `--sf-accent-dim` | Active button background            |
| `--sf-text-muted` | Default button color                |
| `--sf-text`       | Hover button color                  |

## Cross-References

- **Elements:** ELM-001 through ELM-004 (nav button, icon, label, search button)
- **Store:** STR-014 router-store (current view)
- **Action:** ACT-001-navigate-to-view (button click)
- **Action:** ACT-003-open-search (search button click)
- **Page:** All pages consume the nav rail as part of the shell layout
