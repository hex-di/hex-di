@filter-events
Feature: Filter Events
  As a filtering system
  I want to dispatch filter change and reset events
  So that per-view filter state stays consistent

  Background:
    Given the store "filter-store" is initialized with defaults

  # -- EVT-018-filter-changed: dispatch conditions --

  Scenario: Changing a dropdown filter dispatches filter-changed
    When the user selects "active" in the status dropdown for view "home"
    Then event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value  |
      | home   | status | active |

  Scenario: Typing in a search field dispatches filter-changed
    When the user types "auth" in the search field for view "acp-session"
    Then event "EVT-018-filter-changed" is dispatched with:
      | viewId     | key    | value |
      | acp-session | search | auth  |

  # -- EVT-018-filter-changed: store mutations --

  Scenario: Update a string filter field
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    Then the state "home.status" in STR-001-filter-store equals "active"
    And the state "home.search" in STR-001-filter-store equals ""

  Scenario: Update a boolean filter field
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId   | key          | value |
      | coverage | showGapsOnly | true  |
    Then the state "coverage.showGapsOnly" in STR-001-filter-store equals true

  Scenario: Update an array filter field
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key      | value                     |
      | tasks  | statuses | ["in-progress","blocked"] |
    Then the state "tasks.statuses" in STR-001-filter-store contains "in-progress"
    And the state "tasks.statuses" in STR-001-filter-store contains "blocked"

  Scenario: Changing a filter in one view does not affect another
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    Then the state "acp-session.agentRole" in STR-001-filter-store equals "all"
    And the state "tasks.search" in STR-001-filter-store equals ""

  Scenario: Successive changes to the same field overwrite
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value |
      | home   | status | error |
    Then the state "home.status" in STR-001-filter-store equals "error"

  # -- EVT-018-filter-changed: selector effects --

  Scenario: activeFilterCount increments after filter change
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    Then selector "activeFilterCount" with view "home" returns 1

  Scenario: hasActiveFilters becomes true after filter change
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value   |
      | tasks  | search | deploy  |
    Then selector "hasActiveFilters" with view "tasks" returns true

  Scenario: activeChips produces chip for active filter
    When event "EVT-018-filter-changed" is dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    Then selector "activeChips" with view "home" contains a chip:
      | view | key    | value  |
      | home | status | active |

  # -- EVT-019-filters-reset: store mutations --

  Scenario: Reset filters for a single view
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value    |
      | home   | search | test-run |
    When event "EVT-019-filters-reset" is dispatched with:
      | viewId |
      | home   |
    Then the state "home.status" in STR-001-filter-store equals "all"
    And the state "home.search" in STR-001-filter-store equals ""
    And the state "home.sort" in STR-001-filter-store equals "last-activity"

  Scenario: Resetting one view does not affect another
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | tasks  | search | build  |
    And event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    When event "EVT-019-filters-reset" is dispatched with:
      | viewId |
      | home   |
    Then the state "home.status" in STR-001-filter-store equals "all"
    And the state "tasks.search" in STR-001-filter-store equals "build"

  Scenario: Resetting a view with no active filters is a no-op
    When event "EVT-019-filters-reset" is dispatched with:
      | viewId |
      | spec   |
    Then the state "spec.showChangesOnly" in STR-001-filter-store equals false
    And the state "spec.search" in STR-001-filter-store equals ""

  # -- EVT-019-filters-reset: selector effects --

  Scenario: activeFilterCount returns zero after reset
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    When event "EVT-019-filters-reset" is dispatched with:
      | viewId |
      | home   |
    Then selector "activeFilterCount" with view "home" returns 0

  Scenario: activeChips is empty after reset
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    When event "EVT-019-filters-reset" is dispatched with:
      | viewId |
      | home   |
    Then selector "activeChips" with view "home" returns an empty array

  # -- EVT-020-filters-all-reset: store mutations --

  Scenario: Global reset restores all views to defaults
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | tasks  | search | deploy |
    And event "EVT-018-filter-changed" was dispatched with:
      | viewId   | key          | value |
      | coverage | showGapsOnly | true  |
    When event "EVT-020-filters-all-reset" is dispatched
    Then the state "home.status" in STR-001-filter-store equals "all"
    And the state "tasks.search" in STR-001-filter-store equals ""
    And the state "coverage.showGapsOnly" in STR-001-filter-store equals false

  Scenario: Global reset with no active filters is a no-op
    When event "EVT-020-filters-all-reset" is dispatched
    Then the state "home.status" in STR-001-filter-store equals "all"
    And the state "acp-session.agentRole" in STR-001-filter-store equals "all"
    And the state "tasks.viewMode" in STR-001-filter-store equals "kanban"

  # -- EVT-020-filters-all-reset: selector effects --

  Scenario: All views report zero active filters after global reset
    Given event "EVT-018-filter-changed" was dispatched with:
      | viewId     | key       | value |
      | acp-session | search    | error |
    And event "EVT-018-filter-changed" was dispatched with:
      | viewId | key    | value  |
      | home   | status | active |
    When event "EVT-020-filters-all-reset" is dispatched
    Then selector "activeFilterCount" with view "home" returns 0
    And selector "activeFilterCount" with view "acp-session" returns 0
    And selector "hasActiveFilters" with view "home" returns false
    And selector "hasActiveFilters" with view "acp-session" returns false
