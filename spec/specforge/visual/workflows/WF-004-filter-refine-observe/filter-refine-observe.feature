@WF-004
Feature: Filter, Refine, Observe
  As a user
  I want to apply, manage, and clear filters on data views
  So that I can focus on the information most relevant to my current task

  Background:
    Given the filter store (STR-001) is initialized with all defaults
    And the app shell (PG-010) is rendered

  # --- Dropdown Filters ---

  Scenario: Apply a dropdown filter on Home view
    Given the user is on the Home view (PG-001)
    And the session table shows 5 sessions with mixed statuses
    When the user selects "completed" from the status dropdown
    Then EVT-018-filter-changed is dispatched with view "home", key "status", value "completed"
    And the filter store sets home.status to "completed"
    And a chip "Status: completed" appears in the filter bar
    And the session table shows only sessions with status "completed"

  Scenario: Apply pipeline mode filter on Home view
    Given the user is on the Home view (PG-001)
    When the user selects "spec-author" from the pipelineMode dropdown
    Then EVT-018-filter-changed is dispatched with view "home", key "pipelineMode", value "spec-author"
    And a chip "Pipeline Mode: spec-author" appears
    And the session table filters to sessions with pipelineMode "spec-author"

  Scenario: Apply agent role filter on ACP Session
    Given the user is on the ACP Session view (PG-007)
    When the user selects "analyst" from the agentRole dropdown
    Then EVT-018-filter-changed is dispatched with view "acp-session", key "agentRole", value "analyst"
    And a chip "Agent Role: analyst" appears
    And the message list shows only messages from the analyst agent

  # --- Multi-Select Filters ---

  Scenario: Apply multi-select filter on Tasks view
    Given the user is on the Task Board (PG-005)
    When the user checks "pending" and "in-progress" in the statuses multi-select
    Then EVT-018-filter-changed is dispatched with view "tasks", key "statuses", value ["pending", "in-progress"]
    And a chip "Statuses: pending, in-progress" appears
    And the kanban board shows only pending and in-progress task groups

  Scenario: Apply severity filter on ACP Session
    Given the user is on the ACP Session view (PG-007)
    When the user checks "critical" and "major" in the severities multi-select
    Then EVT-018-filter-changed is dispatched with view "acp-session", key "severities", value ["critical", "major"]
    And a chip "Severities: critical, major" appears
    And the message list shows only critical and major severity messages

  Scenario: Apply coverage status filter
    Given the user is on the Coverage Dashboard (PG-006)
    When the user checks "gap" and "implemented-only" in the statuses multi-select
    Then EVT-018-filter-changed is dispatched with view "coverage", key "statuses", value ["gap", "implemented-only"]
    And the coverage file list shows only files with those statuses

  # --- Text Search Filters ---

  Scenario: Apply text search filter on Home view
    Given the user is on the Home view (PG-001)
    When the user types "auth" in the search input
    Then EVT-018-filter-changed is dispatched with view "home", key "search", value "auth"
    And a chip "Search: auth" appears
    And the session table filters to sessions matching "auth"

  Scenario: Apply text search filter on ACP Session
    Given the user is on the ACP Session view (PG-007)
    When the user types "dependency" in the search input
    Then EVT-018 is dispatched with view "acp-session", key "search", value "dependency"
    And a chip "Search: dependency" appears
    And the message list filters to messages containing "dependency"

  Scenario: Apply requirement ID filter on Tasks
    Given the user is on the Task Board (PG-005)
    When the user types "REQ-042" in the requirementId input
    Then EVT-018 is dispatched with view "tasks", key "requirementId", value "REQ-042"
    And a chip "Requirement: REQ-042" appears
    And the kanban board filters to task groups referencing REQ-042

  # --- Boolean Toggle Filters ---

  Scenario: Toggle showGapsOnly on Coverage
    Given the user is on the Coverage Dashboard (PG-006)
    When the user toggles "Show Gaps Only" on
    Then EVT-018-filter-changed is dispatched with view "coverage", key "showGapsOnly", value true
    And a chip "Gaps Only" appears
    And the coverage file list shows only files with status "gap"

  Scenario: Toggle showGapsOnly off
    Given the showGapsOnly filter is active on the Coverage view
    When the user toggles "Show Gaps Only" off
    Then EVT-018-filter-changed is dispatched with view "coverage", key "showGapsOnly", value false
    And the "Gaps Only" chip disappears
    And the coverage file list shows all statuses again

  Scenario: Toggle showUncoveredOnly on Coverage
    Given the user is on the Coverage Dashboard (PG-006)
    When the user toggles "Show Uncovered Only" on
    Then EVT-018 is dispatched with view "coverage", key "showUncoveredOnly", value true
    And a chip "Uncovered Only" appears

  # --- View Mode Toggle ---

  Scenario: Toggle view mode on Task Board
    Given the user is on the Task Board (PG-005)
    And the viewMode is "kanban"
    When the user toggles the view mode to "dag"
    Then EVT-018-filter-changed is dispatched with view "tasks", key "viewMode", value "dag"
    And the kanban board (CMP-013) hides
    And the DAG list (CMP-014) renders

  Scenario: Toggle view mode on Cost Tracker
    Given the user is on the Cost Tracker (PG-008)
    And the viewMode is "by-phase"
    When the user toggles the view mode to "by-agent"
    Then EVT-018-filter-changed is dispatched with view "costs", key "viewMode", value "by-agent"
    And the phase cost table (CMP-018) hides
    And the agent cost table (CMP-019) renders

  Scenario: Toggle view mode on Graph Explorer
    Given the user is on the Graph Explorer (PG-009)
    And the viewMode is "full-graph"
    When the user toggles the view mode to "session-only"
    Then EVT-018 is dispatched with view "graph", key "viewMode", value "session-only"
    And the graph filters to show only nodes for the active session

  # --- Sort Controls ---

  Scenario: Change sort order on Home view
    Given the user is on the Home view (PG-001)
    When the user selects "created" from the sort dropdown
    Then EVT-018 is dispatched with view "home", key "sort", value "created"
    And the session table re-sorts by creation date

  Scenario: Change sort order on Coverage
    Given the user is on the Coverage Dashboard (PG-006)
    When the user selects "coverage-percent" from the sort dropdown
    Then EVT-018 is dispatched with view "coverage", key "sort", value "coverage-percent"
    And the file list re-sorts by coverage percentage

  # --- Presets (ACP Session Only) ---

  Scenario: Apply critical-only preset on ACP Session
    Given the user is on the ACP Session view (PG-007)
    When the user selects the "critical-only" preset
    Then ACT-023 (apply preset) fires
    And the filter store sets acp-session.severities to ["critical"]
    And the filter store sets acp-session.preset to "critical-only"
    And a chip "Preset: critical-only" appears
    And the message list shows only critical severity messages

  Scenario: Apply current-phase preset on ACP Session
    Given the user is on the ACP Session view (PG-007)
    And the active pipeline phase is "spec-generation"
    When the user selects the "current-phase" preset
    Then the filter store sets acp-session.phase to "spec-generation"
    And the filter store sets acp-session.preset to "current-phase"
    And the message list shows only messages from the spec-generation phase

  Scenario: Preset resets to none when user manually changes filters
    Given the ACP session preset is "critical-only"
    When the user manually adds agentRole filter "analyst"
    Then the preset field reverts to "none"
    And both the severities and agentRole filters remain active

  # --- Filter Chip Management ---

  Scenario: Remove individual filter via chip X button
    Given the Home view has filters: status "completed" and search "auth"
    And two chips are displayed
    When the user clicks X on the "Status: completed" chip
    Then EVT-018 is dispatched with view "home", key "status", value "all"
    And the "Status: completed" chip disappears
    And the "Search: auth" chip remains
    And the session table now shows all statuses matching "auth"

  Scenario: Remove last filter chip
    Given the Home view has one active filter: status "completed"
    When the user clicks X on the "Status: completed" chip
    Then the chip disappears
    And no chips are displayed
    And the "Clear All" button is disabled
    And the session table shows all sessions unfiltered

  # --- Clear All Filters ---

  Scenario: Clear all filters for current view
    Given the ACP Session has 3 active filters: agentRole "analyst", severities ["critical"], search "error"
    When the user clicks "Clear All"
    Then ACT-018 (reset view filters) fires
    And EVT-019-filters-reset is dispatched with view "acp-session"
    And all ACP session filters return to defaults
    And all chips disappear
    And the message list shows all messages unfiltered

  Scenario: Clear all does not affect other views
    Given the Home view has status "completed" filter
    And the Tasks view has statuses ["pending"] filter
    When the user clicks "Clear All" on the Tasks view
    Then EVT-019-filters-reset is dispatched with view "tasks"
    And the Tasks filter resets to defaults
    And the Home status filter remains "completed"

  Scenario: Reset all filters across all views
    Given multiple views have active filters
    When a global reset is triggered
    Then EVT-020-filters-all-reset is dispatched
    And all view filter states return to their initial defaults
    And all chips across all views are cleared

  # --- Active Filter Count ---

  Scenario: Active filter count reflects non-default filters
    Given the Home view has status "completed" and search "auth"
    When the activeFilterCount selector is evaluated for "home"
    Then the count is 2

  Scenario: Active filter count is zero when all defaults
    Given the Home view has all default filter values
    When the activeFilterCount selector is evaluated for "home"
    Then the count is 0

  Scenario: Active filter count ignores default values
    Given the Home view has status "all" (default) and search "auth" (non-default)
    When the activeFilterCount selector is evaluated for "home"
    Then the count is 1

  # --- Cross-View Filter Independence ---

  Scenario: Filters are independent per view
    Given the user applies status "completed" on the Home view
    When the user navigates to the Task Board
    Then the Task Board has no active filters
    And the filter bar shows Task Board controls (not Home controls)
    When the user navigates back to Home
    Then the Home view still shows status "completed" filter active

  # --- Combined Filters ---

  Scenario: Multiple filters combine with AND logic
    Given the ACP Session has agentRole "analyst" and severities ["critical"]
    Then the message list shows only messages that are:
      - From the analyst agent AND
      - Have critical severity

  Scenario: Multi-step filter refinement
    Given the user is on the Coverage Dashboard (PG-006)
    When the user toggles "Show Gaps Only" on
    And the user selects sort "coverage-percent"
    And the user checks fileCategory ["src", "tests"]
    Then 3 chips are displayed
    And the file list shows only gap files in src/tests categories sorted by coverage

  # --- End-to-End Filter Journey ---

  Scenario: Complete filter, refine, observe cycle
    Given the user is on the ACP Session view with 50 messages
    When the user selects preset "critical-only"
    And the message list narrows to 5 critical messages
    And the user adds search filter "authentication"
    And the message list narrows to 2 messages
    And the user reviews the messages
    And the user clicks "Clear All"
    Then all 50 messages are visible again
    And no chips are displayed
