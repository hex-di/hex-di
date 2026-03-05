# STR-014: Router Store

## Overview

The Router Store tracks which view is currently active in the single-page application. It serves as the minimal routing state needed by the navigation rail, filter bar, and app shell to coordinate view rendering and conditional UI elements.

**Hook:** `useCurrentView()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| currentView       | ViewId                                                   |
+-------------------+----------------------------------------------------------+
```

### ViewId (enum)

```
+-------------------+----------------------------------------------------------+
| Value             | Page                                                     |
+-------------------+----------------------------------------------------------+
| "home"            | PG-001 Home / Dashboard overview                         |
| "chat"            | PG-002 Chat / Agent conversation                         |
| "pipeline"        | PG-003 Pipeline / Flow monitor                           |
| "spec"            | PG-004 Spec Viewer                                       |
| "tasks"           | PG-005 Task Board                                        |
| "coverage"        | PG-006 Coverage Dashboard                                |
| "acp-session"      | PG-007 ACP Session / Findings                             |
| "costs"           | PG-008 Cost Tracker                                      |
| "graph"           | PG-009 Graph Explorer                                    |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector           | Parameters | Description                                                          |
| ------------------ | ---------- | -------------------------------------------------------------------- |
| `currentView`      | (none)     | Returns the active ViewId string.                                    |
| `isFilterableView` | (none)     | Returns `true` when the current view supports the global filter bar. |

### Filterable Views

The filter bar (CMP-004) is only relevant for views that display list-based, filterable data:

- `pipeline` -- filter by phase, status
- `tasks` -- filter by assignee, status, priority
- `coverage` -- filter by module, threshold
- `acp-session` -- filter by severity, phase, message type

Views like `home`, `chat`, `spec`, `costs`, and `graph` do not use the filter bar.

---

## Event Flow

```
EVT-001 (view-changed)
  --> set currentView to payload.viewId
```

### Event-to-Field Mapping

| Event   | Field       | Operation |
| ------- | ----------- | --------- |
| EVT-001 | currentView | set       |

---

## Navigation Model

```
CMP-001-nav-rail (click on nav item)
  |
  +--> dispatch EVT-001 { viewId: "pipeline" }
  |
  +--> STR-014 reducer sets currentView = "pipeline"
  |
  +--> PG-010-app-shell re-renders, swapping the main content area
  +--> CMP-001-nav-rail highlights the active item
  +--> CMP-004-filter-bar shows/hides based on isFilterableView
```

The router store is intentionally minimal. It does not manage URL history, nested routes, or route parameters. Those concerns live in the app shell's routing layer. This store provides a single reactive signal for "which top-level view is active."

---

## Design Rationale

1. **Single field simplicity:** A view-level router needs only one piece of state: which view is active. There are no nested routes or route parameters to track. The ViewId enum covers all nine views.

2. **isFilterableView as a derived selector:** Rather than annotating each view with metadata in the store, the selector encodes the knowledge of which views support filtering. This is a closed set that changes only when new filterable pages are added.

3. **Default to home:** The initial view is `"home"` because the home page serves as the dashboard overview and the natural landing point on app load.

4. **No persistence:** The current view is not persisted across sessions. Users always start at home on reload. Deep linking (if needed) would be handled at the URL routing layer, not by this store.

5. **No transition state:** There is no `previousView` or `isTransitioning` field. View transitions are instant (no animation state machine). If transitions are added later, they belong in a separate concern.

---

## Cross-References

- **Consumers:** CMP-001-nav-rail, CMP-004-filter-bar, PG-010-app-shell
- **Events:** EVT-001 (view-changed)
- **Related stores:** STR-001 (filter store -- resets filters on view change)
- **Pages:** PG-001 through PG-009 (all views), PG-010 (app shell)
