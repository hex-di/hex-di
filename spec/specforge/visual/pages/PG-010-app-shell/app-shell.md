# PG-010 App Shell

**ID:** PG-010-app-shell
**Route:** N/A (always rendered -- root layout)
**Layout:** CSS Grid (2 columns, 2 rows)
**Context:** The root application shell that wraps all in-app views.

---

## Overview

The App Shell is the root layout container for the entire SpecForge application. It provides the structural grid that positions the navigation rail, main content area, status bar, and search overlay. All in-app views (PG-001 through PG-009) are rendered within the `main-content` slot. The shell is always rendered when the user is within the application; the landing page (PG-011) is the only view that bypasses it.

---

## ASCII Wireframe

```
 App Shell (100vw x 100vh)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  CSS Grid: 2 columns (64px + 1fr), 2 rows (1fr + 32px)                         │
 │                                                                                  │
 │  ┌──────────┬───────────────────────────────────────────────────────────────────┐│
 │  │          │                                                                   ││
 │  │          │  Main Content Area (grid-column: 2, grid-row: 1)                  ││
 │  │          │                                                                   ││
 │  │ Nav Rail │  ┌───────────────────────────────────────────────────────────────┐││
 │  │ (CMP-001)│  │                                                               │││
 │  │          │  │  overflow-y: auto                                              │││
 │  │ grid-row:│  │  padding: 24px                                                │││
 │  │  1 / -1  │  │                                                               │││
 │  │          │  │  Currently active view renders here:                           │││
 │  │ width:   │  │                                                               │││
 │  │  64px    │  │    PG-001 Home                                                │││
 │  │          │  │    PG-002 Chat                                                │││
 │  │   ┌───┐  │  │    PG-003 Pipeline                                            │││
 │  │   │ ⌂ │  │  │    PG-004 Spec Viewer                                        │││
 │  │   │   │  │  │    PG-005 Task Board                                          │││
 │  │   ├───┤  │  │    PG-006 Coverage Dashboard                                  │││
 │  │   │ ◎ │  │  │    PG-007 ACP Session                                          │││
 │  │   │   │  │  │    PG-008 Cost Tracker                                        │││
 │  │   ├───┤  │  │    PG-009 Graph Explorer                                      │││
 │  │   │ ▸ │  │  │                                                               │││
 │  │   │   │  │  │  (View is selected by STR-014 router-store currentView)       │││
 │  │   ├───┤  │  │                                                               │││
 │  │   │ ≡ │  │  └───────────────────────────────────────────────────────────────┘││
 │  │   │   │  │                                                                   ││
 │  │   ├───┤  ├───────────────────────────────────────────────────────────────────┤│
 │  │   │ ☰ │  │                                                                   ││
 │  │   │   │  │  Status Bar (CMP-002, grid-column: 2, grid-row: 2)               ││
 │  │   ├───┤  │                                                                   ││
 │  │   │ ◉ │  │  ┌───────────────────────────────────────────────────────────┐   ││
 │  │   │   │  │  │  session: @scope/pkg  |  phase: planning  |  $3.21       │   ││
 │  │   ├───┤  │  └───────────────────────────────────────────────────────────┘   ││
 │  │   │ ▦ │  │                                                                   ││
 │  │   │   │  │  height: 32px                                                    ││
 │  │   ├───┤  │                                                                   ││
 │  │   │ $ │  └───────────────────────────────────────────────────────────────────┤│
 │  │   │   │                                                                      ││
 │  │   ├───┤                                                                      ││
 │  │   │ ◇ │                                                                      ││
 │  │   │   │                                                                      ││
 │  │   ├───┤                                                                      ││
 │  │   │   │                                                                      ││
 │  │   │ / │                                                                      ││
 │  │   └───┘                                                                      ││
 │  │          │                                                                   ││
 │  └──────────┴───────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Grid Layout Detail

```
 Grid Definition:
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  grid-template-columns: 64px 1fr                                │
 │  grid-template-rows:    1fr  32px                               │
 │  min-height:            100vh                                   │
 │                                                                  │
 │  ┌──────────┬──────────────────────────────────────────────────┐│
 │  │          │                                                  ││
 │  │  col 1   │  col 2                                           ││
 │  │  64px    │  1fr (remaining space)                           ││
 │  │          │                                                  ││
 │  │  row 1   │  row 1                                           ││
 │  │  1fr     │  1fr                                             ││
 │  │  (nav)   │  (main-content, overflow-y: auto, padding: 24px)││
 │  │          │                                                  ││
 │  │          ├──────────────────────────────────────────────────┤│
 │  │  row 2   │  row 2                                           ││
 │  │  32px    │  32px                                            ││
 │  │  (nav    │  (status-bar)                                    ││
 │  │   cont.) │                                                  ││
 │  └──────────┴──────────────────────────────────────────────────┘│
 │                                                                  │
 │  Nav rail: grid-row 1 / -1 (spans both rows)                   │
 │  Status bar: grid-column 2, grid-row 2                          │
 │  Main content: grid-column 2, grid-row 1                        │
 │                                                                  │
 └──────────────────────────────────────────────────────────────────┘
```

### Search Overlay (CMP-003)

```
 Search Overlay (when open)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  position: fixed                                                                │
 │  inset: 0                                                                       │
 │  z-index: 1000                                                                  │
 │  background: rgba(2, 4, 8, 0.85)  (backdrop)                                   │
 │                                                                                  │
 │  ┌──────────────────────────────────────────────────────────────────────┐        │
 │  │                                                                      │        │
 │  │  ┌──────────────────────────────────────────────────────────────┐    │        │
 │  │  │  /  Search SpecForge...                              [Esc]  │    │        │
 │  │  └──────────────────────────────────────────────────────────────┘    │        │
 │  │                                                                      │        │
 │  │  Results (grouped by category):                                      │        │
 │  │  ┌──────────────────────────────────────────────────────────────┐    │        │
 │  │  │  SESSIONS                                                    │    │        │
 │  │  │  > auth-service  |  @scope/auth  |  active                  │    │        │
 │  │  │    flow-service  |  @scope/flow  |  completed               │    │        │
 │  │  │                                                              │    │        │
 │  │  │  SPECS                                                       │    │        │
 │  │  │    auth.spec.md  |  Authentication specification            │    │        │
 │  │  │                                                              │    │        │
 │  │  │  TASKS                                                       │    │        │
 │  │  │    TK-014        |  Implement login endpoint                │    │        │
 │  │  └──────────────────────────────────────────────────────────────┘    │        │
 │  │                                                                      │        │
 │  │  max-width: 640px                                                    │        │
 │  │  margin: 120px auto 0                                                │        │
 │  │  border-radius: 12px                                                 │        │
 │  │  bg: --sf-surface                                                    │        │
 │  │  border: 1px solid rgba(0, 240, 255, 0.15)                          │        │
 │  │                                                                      │        │
 │  └──────────────────────────────────────────────────────────────────────┘        │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component      | Ref                    | Grid Position                  | Role                                |
| -------------- | ---------------------- | ------------------------------ | ----------------------------------- |
| Nav Rail       | CMP-001-nav-rail       | grid-row: 1/-1, grid-column: 1 | Primary vertical navigation         |
| Status Bar     | CMP-002-status-bar     | grid-row: 2, grid-column: 2    | Session info, phase, cost indicator |
| Search Overlay | CMP-003-search-overlay | fixed, z-index: 1000           | Global search modal                 |

---

## States

| State       | Condition                                    | Behavior                                                     |
| ----------- | -------------------------------------------- | ------------------------------------------------------------ |
| shell-ready | Default state after app initialization       | Grid rendered, nav rail visible, active view in main content |
| search-open | `STR-012.isOpen === true` or "/" key pressed | Search overlay appears above all content with backdrop       |

---

## Grid Specification

| Element      | grid-column | grid-row | Width | Height | Overflow         | Padding |
| ------------ | ----------- | -------- | ----- | ------ | ---------------- | ------- |
| Nav Rail     | 1           | 1 / -1   | 64px  | 100%   | visible          | 12px 0  |
| Main Content | 2           | 1        | 1fr   | 1fr    | overflow-y: auto | 24px    |
| Status Bar   | 2           | 2        | 1fr   | 32px   | hidden           | 0 16px  |

---

## Main Content Slot

The main content area renders the currently active view based on `STR-014-router-store.currentView`:

| currentView | Rendered Page             |
| ----------- | ------------------------- |
| home        | PG-001-home               |
| chat        | PG-002-chat               |
| pipeline    | PG-003-pipeline           |
| spec        | PG-004-spec-viewer        |
| tasks       | PG-005-task-board         |
| coverage    | PG-006-coverage-dashboard |
| acp-session | PG-007-acp-session        |
| costs       | PG-008-cost-tracker       |
| graph       | PG-009-graph-explorer     |

Only one view is rendered at a time. View transitions are instantaneous (no animation between views).

---

## Keyboard Shortcuts

| Key      | Action       | Condition                | Description               |
| -------- | ------------ | ------------------------ | ------------------------- |
| `/`      | open-search  | Search overlay is closed | Opens the search overlay  |
| `Escape` | close-search | Search overlay is open   | Closes the search overlay |

The `/` shortcut is suppressed when the user is focused on a text input, textarea, or contenteditable element to avoid intercepting normal typing.

---

## Search Overlay Behavior

- **Trigger**: "/" key press (when not in a text input) or click on nav rail search button (ELM-004)
- **Position**: `position: fixed; inset: 0; z-index: 1000`
- **Backdrop**: `rgba(2, 4, 8, 0.85)` semi-transparent overlay
- **Dialog**: max-width 640px, centered horizontally, 120px top margin
- **Close**: Escape key, click on backdrop, or selecting a result
- **Focus trap**: When open, focus is trapped within the overlay. Tab cycles through input and results.

---

## Design Token Usage

| Token             | Usage                                       |
| ----------------- | ------------------------------------------- |
| `--sf-bg`         | Shell background color (`#020408`)          |
| `--sf-surface`    | Search overlay dialog background            |
| `--sf-accent`     | Search input focus border, result highlight |
| `--sf-text`       | Search input text                           |
| `--sf-text-muted` | Search placeholder, category headers        |
| `--sf-font-body`  | All shell-level text (Inter)                |

---

## Interaction Notes

1. **View routing**: The shell reads `STR-014.currentView` to determine which page component to render in the main content slot. Navigation is driven by CMP-001-nav-rail.
2. **Search overlay layering**: The overlay sits above everything including the nav rail, using `z-index: 1000` and `position: fixed`.
3. **Status bar persistence**: The status bar (CMP-002) is always visible at the bottom of the content area, providing persistent session context.
4. **Responsive considerations**: On mobile viewports (<768px), the nav rail collapses and a hamburger menu or bottom tab bar replaces it (defined in CMP-001 responsive rules).
5. **No page-level loading**: The shell itself has no loading state. Individual views manage their own loading states within the main content slot.
6. **Background color**: The shell's root element uses `--sf-bg` (#020408) as the base background, establishing the dark cyberpunk aesthetic.

---

## Cross-References

- **Components:** CMP-001-nav-rail, CMP-002-status-bar, CMP-003-search-overlay
- **Stores:** STR-014-router-store, STR-015-keyboard-shortcut-store, STR-002-active-session-store, STR-012-search-store
- **Pages:** All in-app pages (PG-001 through PG-009) render within the main content slot
- **Excluded:** PG-011-landing-page bypasses the app shell entirely
