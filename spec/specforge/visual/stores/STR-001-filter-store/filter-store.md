# STR-001 Filter Store

## Overview

The Filter Store manages per-view filter state for every major view in the application. Each view maintains its own independent filter shape, ensuring that navigating between views preserves filter context. The store is the single source of truth for all filter-related UI state.

## State Shape

```
FilterState
+---------------------------------------------------------------------+
| home                                                                |
|   status:        "all" | "active" | "completed" | "error"          |
|   pipelineMode:  "all" | "discovery" | "spec" | "implementation"   |
|   search:        string                                             |
|   sort:          "last-activity" | "created" | "name"              |
+---------------------------------------------------------------------+
| acp-session                                                          |
|   agentRole:     "all" | string                                     |
|   messageTypes:  string[]                                           |
|   severities:    string[]                                           |
|   phase:         "all" | string                                     |
|   search:        string                                             |
|   preset:        "none" | "errors" | "warnings" | "agent-x"        |
+---------------------------------------------------------------------+
| tasks                                                               |
|   statuses:      string[]                                           |
|   requirementId: string                                             |
|   search:        string                                             |
|   viewMode:      "kanban" | "list"                                  |
+---------------------------------------------------------------------+
| coverage                                                            |
|   statuses:         string[]                                        |
|   specFile:         "all" | string                                  |
|   sort:             "requirement-id" | "coverage" | "file-name"     |
|   showGapsOnly:     boolean                                         |
|   fileCategory:     string[]                                        |
|   showUncoveredOnly: boolean                                        |
+---------------------------------------------------------------------+
| spec                                                                |
|   showChangesOnly: boolean                                          |
|   search:          string                                           |
+---------------------------------------------------------------------+
| costs                                                               |
|   phases:      string[]                                             |
|   agentRoles:  string[]                                             |
|   viewMode:    "by-phase" | "by-agent" | "timeline"                 |
+---------------------------------------------------------------------+
| graph                                                               |
|   nodeTypes:         string[]                                       |
|   relationshipTypes: string[]                                       |
|   viewMode:          "full-graph" | "dependencies" | "consumers"    |
|   search:            string                                         |
+---------------------------------------------------------------------+
```

## Selectors

| Selector            | Signature                         | Description                                                                                                                                                     |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeFilterCount` | `(view: ViewKey) => number`       | Counts non-default filter values for the given view. Arrays count if non-empty; strings count if non-empty and not the default value; booleans count if `true`. |
| `hasActiveFilters`  | `(view: ViewKey) => boolean`      | Returns `true` when `activeFilterCount(view) > 0`.                                                                                                              |
| `activeChips`       | `(view: ViewKey) => FilterChip[]` | Produces an array of chip descriptors `{ view, key, label, value }` for each active filter. Used by the filter bar to render dismissible chips.                 |

## Event Flow

| Event                       | Fields Affected                   | Description                                       |
| --------------------------- | --------------------------------- | ------------------------------------------------- |
| `EVT-018-filter-changed`    | `state[view][key]`                | Updates a single filter field within a given view |
| `EVT-019-filters-reset`     | `state[view]` (entire sub-object) | Resets all filters for one view to defaults       |
| `EVT-020-filters-all-reset` | All view sub-objects              | Resets every view's filters back to initial state |

## Design Rationale

- **Per-view isolation**: Each view owns its own filter shape rather than sharing a generic filter map. This allows type-safe access and prevents cross-view filter leakage.
- **No persistence**: Filter state is intentionally ephemeral. Navigating away and returning starts with clean defaults, which prevents stale filter contexts from confusing users.
- **Chip-based UX**: The `activeChips` selector drives a dismissible-chip pattern in the filter bar, giving users clear visibility into which filters are active and a one-click path to remove them.
- **Flat reduction**: Each `EVT-018-filter-changed` targets exactly one field in one view, keeping reducer logic simple and predictable.
