# Filter Events

## Overview

Filter events manage per-view filter state changes in the filter store (STR-001). They support three granularities: changing a single filter field, resetting all filters for one view, and resetting all filters across all views. These events are dispatched by the filter bar (CMP-004) and filter chips, and they drive the reactive filtering of data displayed in each view.

---

## EVT-018-filter-changed

**Trigger:** User interacts with a filter control in CMP-004-filter-bar (dropdown, toggle, search input) or dismisses a filter chip.

### Payload

| Field  | Type   | Required | Description                                                      |
| ------ | ------ | -------- | ---------------------------------------------------------------- |
| viewId | string | yes      | FilterableViewId -- identifies which view's filter to update     |
| key    | string | yes      | The filter field name (e.g., "status", "search", "showGapsOnly") |
| value  | any    | yes      | The new value (string, boolean, string[], etc.)                  |

### Event Flow

```
User changes a filter control in CMP-004-filter-bar
  |
  v
dispatch EVT-018-filter-changed { viewId, key, value }
  |
  +---> [Store] STR-001-filter-store
          set state[viewId][key] = value
          --> activeFilterCount selector recalculates
          --> hasActiveFilters selector recalculates
          --> activeChips selector recalculates
          --> View data list re-filters based on new filter state
```

### Store Mutations

| Store                | Field                              | Operation | Value         |
| -------------------- | ---------------------------------- | --------- | ------------- |
| STR-001-filter-store | state[payload.viewId][payload.key] | set       | payload.value |

---

## EVT-019-filters-reset

**Trigger:** User clicks the "Reset Filters" button for a specific view in the filter bar, or a "Clear All" action on the filter chips for one view.

### Payload

| Field  | Type   | Required | Description                            |
| ------ | ------ | -------- | -------------------------------------- |
| viewId | string | yes      | The view whose filters should be reset |

### Event Flow

```
User clicks "Reset Filters" for a specific view
  |
  v
dispatch EVT-019-filters-reset { viewId }
  |
  +---> [Store] STR-001-filter-store
          set state[viewId] = initial-state[viewId]
          --> All filter controls for that view revert to defaults
          --> activeFilterCount for that view returns 0
          --> Other views' filters remain unchanged
```

### Store Mutations

| Store                | Field                 | Operation | Value                         |
| -------------------- | --------------------- | --------- | ----------------------------- |
| STR-001-filter-store | state[payload.viewId] | set       | initial-state[payload.viewId] |

---

## EVT-020-filters-all-reset

**Trigger:** User triggers a global filter reset, typically via a settings action or keyboard shortcut.

### Payload

None. This event carries no payload.

### Event Flow

```
User triggers global filter reset
  |
  v
dispatch EVT-020-filters-all-reset {}
  |
  +---> [Store] STR-001-filter-store
          set state.home = initial-state.home
          set state.acp-session = initial-state.acp-session
          set state.tasks = initial-state.tasks
          set state.coverage = initial-state.coverage
          set state.spec = initial-state.spec
          set state.costs = initial-state.costs
          set state.graph = initial-state.graph
          --> All filter controls across all views revert to defaults
          --> activeFilterCount returns 0 for every view
```

### Store Mutations

| Store                | Field       | Operation | Value                     |
| -------------------- | ----------- | --------- | ------------------------- |
| STR-001-filter-store | home        | set       | initial-state.home        |
| STR-001-filter-store | acp-session | set       | initial-state.acp-session |
| STR-001-filter-store | tasks       | set       | initial-state.tasks       |
| STR-001-filter-store | coverage    | set       | initial-state.coverage    |
| STR-001-filter-store | spec        | set       | initial-state.spec        |
| STR-001-filter-store | costs       | set       | initial-state.costs       |
| STR-001-filter-store | graph       | set       | initial-state.graph       |

---

## Design Rationale

1. **Single field granularity for EVT-018:** Each filter change targets exactly one field in one view. This keeps the reducer logic simple, makes each change individually trackable, and avoids batch-update complexity. If a user changes two filters rapidly, two separate EVT-018 events fire in sequence.

2. **View isolation on reset:** EVT-019 resets only the targeted view, leaving all other views untouched. This allows "Clear Filters" to be a per-view action without surprising the user by wiping filters they set on other views.

3. **No payload on global reset:** EVT-020 needs no parameters because it always resets everything to the known initial state. The reducer iterates over all view keys and replaces each with its default.

4. **Selector-driven chip UX:** The `activeChips` selector in STR-001 produces chip descriptors for the filter bar. When a chip is dismissed, it dispatches EVT-018 with the default value for that field, effectively removing the filter. This is more composable than a dedicated "remove filter" event.

5. **No persistence:** Filter state is intentionally ephemeral. Navigating away and returning starts with clean defaults. This prevents stale filter contexts from confusing users who return to a view after a long time.

---

## Cross-References

- **Source components:** CMP-004-filter-bar (all three events)
- **Target store:** STR-001-filter-store
- **Consumer components:** All view components that display filtered data
- **Related selectors:** activeFilterCount, hasActiveFilters, activeChips (in STR-001)
