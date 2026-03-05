# CMP-004 Filter Bar

**ID:** CMP-004-filter-bar
**Context:** Contextual filter bar that adapts to the current view. Appears inside filterable view pages.

---

## Overview

The Filter Bar is a composable container that displays filter controls appropriate for the current view. It receives its `viewId` prop and renders view-specific filter controls passed as children. When filters are active, dismissible chips appear in a row below the controls, separated by a subtle border. A count badge and "Clear All" link provide quick visibility and bulk-reset capability.

The Filter Bar is only shown on filterable views: home, ACP session, tasks, coverage, spec, costs, and graph. It does NOT appear on the chat or pipeline views.

## ASCII Mockup

```
 Filter Bar (full width within view content area)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  12px pad                                                     12px pad  │
 │  8px pad                                                       8px pad  │
 │                                                                         │
 │  Controls Row (flex row, wrap, 8px gap)                                 │
 │  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌─────┐   ┌────┐     │
 │  │ Status ▼ │  │ Pipeline ▼   │  │ Search...  │  │ ⚙ ▼ │   │(3) │     │
 │  │ ELM-014  │  │ ELM-014      │  │ ELM-016    │  │ELM15│   │ 020│     │
 │  └──────────┘  └──────────────┘  └────────────┘  └─────┘   └────┘     │
 │                                                              badge      │
 │  ─────────────────────────────────────────────────────────────────────  │
 │  border-top separator (only when hasActiveFilters)                      │
 │                                                                         │
 │  Chips Row (flex row, wrap, 6px gap)                                    │
 │  ┌────────────────┐  ┌──────────────────┐  ┌─────────────┐            │
 │  │ Status: active ×│  │ Pipeline: spec ×  │  │ Clear All   │            │
 │  │ ELM-018        │  │ ELM-018          │  │ ELM-019     │            │
 │  └────────────────┘  └──────────────────┘  └─────────────┘            │
 │                                                                         │
 └──────────────────────────────────────────────────────────────────────────┘

 Without active filters (chips row hidden):
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌─────┐              │
 │  │ Status ▼ │  │ Pipeline ▼   │  │ Search...  │  │ ⚙ ▼ │              │
 │  └──────────┘  └──────────────┘  └────────────┘  └─────┘              │
 └──────────────────────────────────────────────────────────────────────────┘
```

## Filter Bar Structure

The bar is divided into two rows:

### Controls Row (always visible)

Contains the view-specific filter controls and an active filter count badge. Controls vary by view and are passed as children. The count badge (ELM-020) appears at the end of the row when `activeFilterCount > 0`.

### Chips Row (conditionally visible)

Visible only when `hasActiveFilters` is true. Displays dismissible chips (ELM-018) for each active non-default filter, and a "Clear All" link (ELM-019) at the end.

## Filterable Views

| View        | Appears | Filter Controls Available                                                                                               |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| home        | Yes     | Status select, pipeline mode select, search input, sort select                                                          |
| acp-session | Yes     | Agent role select, message type multi-select, severity multi-select, phase select, search, preset buttons               |
| tasks       | Yes     | Status multi-select, requirement ID input, search input, view mode toggle                                               |
| coverage    | Yes     | Status multi-select, spec file select, sort select, gaps-only toggle, file category multi-select, uncovered-only toggle |
| spec        | Yes     | Changes-only toggle, search input                                                                                       |
| costs       | Yes     | Phase multi-select, agent role multi-select, view mode select                                                           |
| graph       | Yes     | Node type multi-select, relationship type multi-select, view mode select, search input                                  |
| chat        | No      | --                                                                                                                      |
| pipeline    | No      | --                                                                                                                      |

## Layout Rules

### Container

| Property       | Value                             | Notes                        |
| -------------- | --------------------------------- | ---------------------------- |
| display        | flex                              | Column layout                |
| flex-direction | column                            | Controls row above chips row |
| background     | var(--sf-surface)                 | Dark surface background      |
| border-radius  | 8px                               | Rounded corners              |
| border         | 1px solid rgba(0, 240, 255, 0.08) | Subtle accent border         |
| padding        | 8px 12px                          | Interior spacing             |

### Controls Row

| Property       | Value  | Notes                                |
| -------------- | ------ | ------------------------------------ |
| display        | flex   | Row layout                           |
| flex-direction | row    | Horizontal arrangement               |
| flex-wrap      | wrap   | Wraps to next line on narrow screens |
| align-items    | center | Vertically centered controls         |
| gap            | 8px    | Space between filter controls        |

### Chips Row

| Property       | Value                             | Notes                                |
| -------------- | --------------------------------- | ------------------------------------ |
| display        | flex                              | Row layout                           |
| flex-direction | row                               | Horizontal arrangement               |
| flex-wrap      | wrap                              | Wraps if many chips                  |
| align-items    | center                            | Vertically centered chips            |
| gap            | 6px                               | Space between chips                  |
| padding-top    | 8px                               | Spacing above chip row               |
| border-top     | 1px solid rgba(0, 240, 255, 0.06) | Separator between controls and chips |
| margin-top     | 8px                               | Spacing from controls row            |

## Active Filter Count Badge (ELM-020)

| Property        | Value            | Notes                          |
| --------------- | ---------------- | ------------------------------ |
| width           | 20px             | Fixed circle diameter          |
| height          | 20px             | Fixed circle diameter          |
| border-radius   | 50%              | Perfect circle                 |
| background      | var(--sf-accent) | Accent background              |
| color           | var(--sf-bg)     | Dark text on accent background |
| font-size       | 11px             | Small number text              |
| display         | flex             | Centering                      |
| align-items     | center           | Vertical centering             |
| justify-content | center           | Horizontal centering           |

Visible only when `activeFilterCount(viewId) > 0`. Displays the count as a number inside the circle.

## Clear All Link (ELM-019)

- Text: "Clear All"
- Color: `--sf-text-muted` (default), `--sf-text` (hover)
- Text decoration: underline
- Cursor: pointer
- Dispatches `EVT-019-filters-reset` with the current viewId

## Store Bindings

| Store                | Selector          | Bound To             | Description                                  |
| -------------------- | ----------------- | -------------------- | -------------------------------------------- |
| STR-001 filter-store | filters[viewId]   | Control values       | Current filter state for the active view     |
| STR-001 filter-store | activeFilterCount | ELM-020 count        | Number of non-default filters                |
| STR-001 filter-store | hasActiveFilters  | Chips row visibility | Whether to show the chips row                |
| STR-001 filter-store | activeChips       | ELM-018 chip list    | Array of chip descriptors for active filters |

## Token Usage

| Token             | Usage                                    |
| ----------------- | ---------------------------------------- |
| `--sf-surface`    | Bar background                           |
| `--sf-accent`     | Count badge background                   |
| `--sf-bg`         | Count badge text (dark on accent)        |
| `--sf-text-muted` | Clear All link default color, muted text |
| `--sf-text`       | Clear All link hover color               |
| `--sf-font-body`  | All text font family                     |

## Cross-References

- **Elements:** ELM-014 through ELM-021 (filter select, multi-select, search input, toggle, chip, clear all, count badge, preset button)
- **Store:** STR-001 filter-store (filter state, selectors)
- **Events:** EVT-018 (filter changed), EVT-019 (filters reset)
- **Views:** Used by home, ACP session, tasks, coverage, spec, costs, graph view pages
