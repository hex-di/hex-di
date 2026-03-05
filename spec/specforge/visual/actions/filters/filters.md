# Filter Actions

**IDs:** ACT-016 through ACT-027
**Context:** Filter, sort, search, and view-mode controls used across filterable views (pipeline, tasks, coverage, ACP session, graph, home).

---

## Action Flow Diagrams

### ACT-016 Set Filter

```
  User changes a dropdown / multi-select / text input
         |
         v
  ELM-014 / ELM-017 / ELM-019 (change)
         |
         v
  ACT-016-set-filter { view, key, value }
         |
         v
  EVT-018-filter-changed { view, key, value }
         |
         +---> STR-001-filter-store ([view][key] = value)
         +---> Active filter chips update
         +---> Filtered data list re-renders
```

### ACT-017 Toggle Filter

```
  User toggles a checkbox filter
         |
         v
  ELM-018-filter-toggle (change)
         |
         v
  ACT-017-toggle-filter { view, key, value: boolean }
         |
         v
  EVT-018-filter-changed { view, key, value }
         |
         +---> STR-001-filter-store ([view][key] = boolean)
         +---> Toggle label color updates (muted <-> full)
```

### ACT-018 Remove Filter

```
  User clicks "X" on a filter chip
         |
         v
  ELM-021-filter-chip-remove (click)
         |
         v
  ACT-018-remove-filter { view, key }
         |
         v
  EVT-018-filter-changed { view, key, value: defaultValue }
         |
         +---> STR-001-filter-store ([view][key] = default)
         +---> Filter chip removed from active strip
         +---> Filter control resets to default state
```

### ACT-019 Clear View Filters

```
  User clicks "Clear All" button for current view
         |
         v
  clear-all button (click)
         |
         v
  ACT-019-clear-view-filters { view }
         |
         v
  EVT-019-filters-reset { view }
         |
         +---> STR-001-filter-store ([view] = defaultFilters)
         +---> All filter chips for view removed
         +---> All filter controls reset to defaults
```

### ACT-020 Clear All Filters

```
  Programmatic trigger (session change / app reset)
         |
         v
  ACT-020-clear-all-filters
         |
         v
  EVT-020-filters-all-reset
         |
         +---> STR-001-filter-store (all views = defaultFilters)
```

### ACT-021 Apply Preset

```
  User clicks a preset button
         |
         v
  ELM-062-preset-button (click)
         |
         v
  ACT-021-apply-preset { presetName }
         |
         v
  EVT-018-filter-changed (x N, one per preset field)
         |
         +---> STR-001-filter-store (multiple fields updated)
         +---> Active preset button highlighted (accent state)
         +---> Filter chips update to reflect preset values
         +---> Filtered data re-renders
```

### ACT-022 Sort Column

```
  User clicks a sortable column header
         |
         v
  column header (click)
         |
         v
  ACT-022-sort-column { view, field }
         |
         v
  EVT-018-filter-changed { view, key: "sort", value: { field, direction } }
         |
         +---> STR-001-filter-store ([view].sort = { field, direction })
         +---> Column header shows sort indicator arrow
         +---> Table rows re-sort
```

### ACT-023 Search in View

```
  User types in the in-view search input
         |
         v
  ELM-019-filter-text-input (change)
         |
         v
  [debounce 300ms]
         |
         v
  ACT-023-search-in-view { view, query }
         |
         v
  EVT-018-filter-changed { view, key: "search", value: query }
         |
         +---> STR-001-filter-store ([view].search = query)
         +---> Filtered list re-renders with text match
```

### ACT-024 Toggle Multi-Select

```
  User checks/unchecks a multi-select option
         |
         v
  ELM-017-filter-multi-select-option (change)
         |
         v
  ACT-024-toggle-multi-select { view, key, option }
         |
         v
  EVT-018-filter-changed { view, key, value: updatedArray }
         |
         +---> STR-001-filter-store ([view][key] = [...toggled])
         +---> Multi-select trigger count badge updates
         +---> Filter chips update
```

### ACT-025 Select Search Result

```
  User clicks a search result item
         |
         v
  ELM-012-search-result-item (click)
         |
         v
  ACT-025-select-search-result { result }
         |
         +---> EVT-022-search-result-selected { result }
         |       +---> STR-012-search-store (lastSelected = result)
         |
         +---> EVT-001-view-changed { viewId: result.targetView }
         |       +---> STR-014-router-store (currentView = targetView)
         |
         +---> Search overlay closes
```

### ACT-026 Navigate Search Results

```
  User presses ArrowUp / ArrowDown in search input
         |
         v
  ELM-010-search-input (keydown: Up/Down)
         |
         v
  ACT-026-navigate-search-results { direction }
         |
         v
  EVT-021-search-query-changed { selectedIndex }
         |
         +---> STR-012-search-store (selectedIndex updated)
         +---> Focused result item changes (ELM-012 focused state)
         +---> Previous item returns to default state
```

### ACT-027 Toggle View Mode

```
  User clicks a view mode toggle button
         |
         v
  ELM-052 / ELM-067 / ELM-071 (click)
         |
         v
  ACT-027-toggle-view-mode { view, mode }
         |
         v
  EVT-018-filter-changed { view, key: "viewMode", value: mode }
         |
         +---> STR-001-filter-store ([view].viewMode = mode)
         +---> Active toggle button highlighted
         +---> View layout re-renders in new mode
```

## Action Summary

| ID      | Name                    | Type          | Trigger                         | Event Dispatched                      |
| ------- | ----------------------- | ------------- | ------------------------------- | ------------------------------------- |
| ACT-016 | Set Filter              | data-filter   | ELM-014/017/019 change          | EVT-018-filter-changed                |
| ACT-017 | Toggle Filter           | toggle-select | ELM-018 change                  | EVT-018-filter-changed                |
| ACT-018 | Remove Filter           | data-filter   | ELM-021 click                   | EVT-018-filter-changed                |
| ACT-019 | Clear View Filters      | data-filter   | clear-all button click          | EVT-019-filters-reset                 |
| ACT-020 | Clear All Filters       | data-filter   | programmatic                    | EVT-020-filters-all-reset             |
| ACT-021 | Apply Preset            | data-filter   | ELM-062 click                   | EVT-018-filter-changed (multiple)     |
| ACT-022 | Sort Column             | data-sort     | column header click             | EVT-018-filter-changed (sort field)   |
| ACT-023 | Search in View          | search-submit | ELM-019 change (300ms debounce) | EVT-018-filter-changed (search field) |
| ACT-024 | Toggle Multi-Select     | toggle-select | ELM-017 change                  | EVT-018-filter-changed                |
| ACT-025 | Select Search Result    | navigate      | ELM-012 click                   | EVT-022 + EVT-001                     |
| ACT-026 | Navigate Search Results | list-select   | ELM-010 keydown (Up/Down)       | EVT-021-search-query-changed          |
| ACT-027 | Toggle View Mode        | toggle-mode   | ELM-052/067/071 click           | EVT-018-filter-changed (viewMode)     |

## Cross-References

- **Element:** ELM-012-search-result-item (ACT-025 trigger)
- **Element:** ELM-010-search-input (ACT-026 trigger)
- **Element:** ELM-014-filter-dropdown (ACT-016 trigger)
- **Element:** ELM-017-filter-multi-select-option (ACT-016, ACT-024 trigger)
- **Element:** ELM-018-filter-toggle (ACT-017 trigger)
- **Element:** ELM-019-filter-text-input (ACT-016, ACT-023 trigger)
- **Element:** ELM-021-filter-chip-remove (ACT-018 trigger)
- **Element:** ELM-052-view-mode-toggle (ACT-027 trigger, tasks view)
- **Element:** ELM-062-preset-button (ACT-021 trigger)
- **Element:** ELM-067-view-mode-toggle (ACT-027 trigger, ACP session view)
- **Element:** ELM-071-view-mode-toggle (ACT-027 trigger, graph view)
- **Store:** STR-001-filter-store (ACT-016 through ACT-024, ACT-027)
- **Store:** STR-012-search-store (ACT-025, ACT-026)
- **Store:** STR-014-router-store (ACT-025)
