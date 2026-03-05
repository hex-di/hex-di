@ACT-filters
Feature: Filter Actions
  Set, toggle, remove, clear, preset, sort, search, multi-select, and view mode controls.

  Background:
    Given a filterable view is active
    And the filter bar is visible

  # -- ACT-016 Set Filter --

  Scenario: Changing a dropdown filter updates the store
    Given the filter dropdown (ELM-014) for "status" shows "all"
    When the user selects "running" from the dropdown
    Then the action ACT-016-set-filter is triggered
    And the event EVT-018-filter-changed is dispatched with payload { key: "status", value: "running" }
    And the STR-001-filter-store is updated for the current view

  Scenario: Setting a filter adds a filter chip
    Given no filters are active
    When the user selects "running" from the status filter dropdown
    Then a filter chip (ELM-020) with text "running" appears in the active filters strip

  Scenario: Changing a filter updates the filtered data list
    Given the session table shows 10 sessions
    When the user sets the status filter to "paused"
    Then the session table shows only sessions with status "paused"

  # -- ACT-017 Toggle Filter --

  Scenario: Toggling a boolean filter changes its value
    Given the "Show archived" toggle (ELM-018) is unchecked
    When the user checks the toggle
    Then the action ACT-017-toggle-filter is triggered
    And the event EVT-018-filter-changed is dispatched with payload { key: "showArchived", value: true }

  Scenario: Toggle label color reflects the checked state
    Given the toggle is unchecked with muted label color
    When the user checks the toggle
    Then the toggle label color changes to "--sf-text"

  Scenario: Unchecking a toggle reverses the filter
    Given the "Show archived" toggle is checked
    When the user unchecks the toggle
    Then EVT-018-filter-changed is dispatched with payload { key: "showArchived", value: false }

  # -- ACT-018 Remove Filter --

  Scenario: Clicking the chip remove button clears a specific filter
    Given a filter chip "running" is active for the "status" filter
    When the user clicks the "X" button (ELM-021) on the "running" chip
    Then the action ACT-018-remove-filter is triggered
    And the event EVT-018-filter-changed is dispatched with the default value for "status"
    And the "running" chip is removed from the active filters strip
    And the status dropdown resets to its default value

  # -- ACT-019 Clear View Filters --

  Scenario: Clearing view filters resets all filters for the current view
    Given the current view has 3 active filters
    And the "Clear All" button is visible
    When the user clicks the "Clear All" button
    Then the action ACT-019-clear-view-filters is triggered
    And the event EVT-019-filters-reset is dispatched
    And all filter chips for the current view are removed
    And all filter controls reset to their default values

  Scenario: Clear all button is hidden when no filters are active
    Given no filters are active for the current view
    Then the "Clear All" button is not visible

  # -- ACT-020 Clear All Filters --

  Scenario: Programmatic clear resets filters across all views
    Given the "home" view has active filters
    And the "acp-session" view has active filters
    When ACT-020-clear-all-filters is triggered programmatically
    Then the event EVT-020-filters-all-reset is dispatched
    And the STR-001-filter-store is reset to defaults for all views

  # -- ACT-021 Apply Preset --

  Scenario: Clicking a preset button applies its filter values
    Given the ACP session view is active
    And no preset is currently active
    When the user clicks the "Open Critical" preset button (ELM-062)
    Then the action ACT-021-apply-preset is triggered
    And multiple EVT-018-filter-changed events are dispatched
    And the "Open Critical" preset button enters the active state
    And the filter chips update to reflect the preset values

  Scenario: Clicking the active preset deactivates it
    Given the "Open Critical" preset is currently active
    When the user clicks the "Open Critical" preset button again
    Then the filters reset to the view defaults
    And the "Open Critical" preset button returns to the default state

  Scenario: Clicking a different preset replaces the active one
    Given the "Open Critical" preset is currently active
    When the user clicks the "GxP Issues" preset button
    Then the "GxP Issues" preset values are applied
    And the "Open Critical" preset button returns to the default state
    And the "GxP Issues" preset button enters the active state

  # -- ACT-022 Sort Column --

  Scenario: Clicking a sortable column header sets the sort field
    Given the session table is sorted by "lastActivityAt" descending
    When the user clicks the "Package Name" column header
    Then the action ACT-022-sort-column is triggered
    And EVT-018-filter-changed is dispatched with { key: "sort", value: { field: "packageName", direction: "ascending" } }
    And the table rows re-sort by package name ascending
    And a sort indicator arrow appears on the "Package Name" header

  Scenario: Clicking the same column header toggles sort direction
    Given the table is sorted by "packageName" ascending
    When the user clicks the "Package Name" column header again
    Then EVT-018-filter-changed is dispatched with { key: "sort", value: { field: "packageName", direction: "descending" } }
    And the sort indicator arrow reverses direction

  Scenario: Non-sortable columns do not trigger sort
    Given the "Status" column is not sortable
    When the user clicks the "Status" column header
    Then no ACT-022-sort-column action is triggered

  # -- ACT-023 Search in View --

  Scenario: Typing in the view search input filters results after debounce
    Given the pipeline view is active
    When the user types "discovery" in the filter text input (ELM-019)
    And 300ms have elapsed since the last keystroke
    Then the action ACT-023-search-in-view is triggered
    And EVT-018-filter-changed is dispatched with { key: "search", value: "discovery" }

  Scenario: Clearing the view search input removes the text filter
    Given the search filter is "discovery"
    When the user clears the filter text input
    And 300ms have elapsed
    Then EVT-018-filter-changed is dispatched with { key: "search", value: "" }
    And the full unfiltered list is displayed

  # -- ACT-024 Toggle Multi-Select --

  Scenario: Checking a multi-select option adds it to the filter array
    Given the "Tags" multi-select has no options checked
    When the user checks the "frontend" option (ELM-017)
    Then the action ACT-024-toggle-multi-select is triggered
    And EVT-018-filter-changed is dispatched with { key: "tags", value: ["frontend"] }
    And the multi-select trigger count badge shows "1"

  Scenario: Unchecking a multi-select option removes it from the array
    Given the "Tags" multi-select has ["frontend", "backend"] checked
    When the user unchecks the "frontend" option
    Then EVT-018-filter-changed is dispatched with { key: "tags", value: ["backend"] }
    And the multi-select trigger count badge shows "1"

  Scenario: Multi-select count badge reflects selected count
    Given the "Tags" multi-select has 3 options checked
    Then the multi-select trigger (ELM-016) shows a count badge displaying "3"

  # -- ACT-025 Select Search Result --

  Scenario: Clicking a search result navigates to the target view
    Given the search overlay is open with results
    And a result item points to session "sess_abc123" in the "chat" view
    When the user clicks the result item (ELM-012)
    Then the action ACT-025-select-search-result is triggered
    And the event EVT-022-search-result-selected is dispatched
    And the event EVT-001-view-changed is dispatched with { viewId: "chat" }
    And the search overlay closes

  Scenario: Enter key on focused result selects it
    Given a search result item has keyboard focus
    When the user presses the Enter key
    Then the action ACT-025-select-search-result is triggered
    And the application navigates to the result's target view

  # -- ACT-026 Navigate Search Results --

  Scenario: ArrowDown moves selection to the next result
    Given the search overlay is open with 5 results
    And the first result has keyboard focus
    When the user presses ArrowDown
    Then the action ACT-026-navigate-search-results is triggered
    And the second result receives keyboard focus
    And the first result returns to the default state

  Scenario: ArrowUp moves selection to the previous result
    Given the third result has keyboard focus
    When the user presses ArrowUp
    Then the second result receives keyboard focus

  Scenario: ArrowDown at the last result wraps to the first
    Given the last result has keyboard focus
    When the user presses ArrowDown
    Then the first result receives keyboard focus

  Scenario: ArrowUp at the first result wraps to the last
    Given the first result has keyboard focus
    When the user presses ArrowUp
    Then the last result receives keyboard focus

  # -- ACT-027 Toggle View Mode --

  Scenario: Toggling tasks view mode from kanban to dag
    Given the tasks view is active in "kanban" mode
    When the user clicks the "dag" toggle button (ELM-052)
    Then the action ACT-027-toggle-view-mode is triggered
    And EVT-018-filter-changed is dispatched with { key: "viewMode", value: "dag" }
    And the tasks view re-renders in DAG layout
    And the "dag" toggle button enters the active state
    And the "kanban" toggle button returns to the default state

  Scenario: Toggling ACP session view mode
    Given the ACP session view is active in "by-phase" mode
    When the user clicks the "by-agent" toggle button (ELM-067)
    Then EVT-018-filter-changed is dispatched with { key: "viewMode", value: "by-agent" }
    And the ACP session messages regroup by agent role

  Scenario: Selecting a graph layout preset
    Given the graph view is active
    When the user clicks a graph preset toggle button (ELM-071)
    Then EVT-018-filter-changed is dispatched with { key: "viewMode", value: selectedPreset }
    And the graph layout re-renders with the selected preset
