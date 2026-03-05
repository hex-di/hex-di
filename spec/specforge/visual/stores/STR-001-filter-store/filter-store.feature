@STR-001-filter-store
Feature: Filter Store
  As a view consumer
  I want reliable per-view filter state management
  So that each view reflects only its own active filters

  Background:
    Given the store "filter-store" is initialized with defaults

  # ── Single filter change ──────────────────────────────────

  Scenario: Update a single filter field in the home view
    When event "EVT-018-filter-changed" is dispatched with:
      | view   | key    | value    |
      | home   | status | active   |
    Then the state "home.status" equals "active"
    And the state "home.search" equals ""

  Scenario: Update a search filter in the ACP session view
    When event "EVT-018-filter-changed" is dispatched with:
      | view       | key    | value     |
      | acp-session | search | error-log |
    Then the state "acp-session.search" equals "error-log"
    And the state "acp-session.agentRole" equals "all"

  Scenario: Update an array filter field in the tasks view
    When event "EVT-018-filter-changed" is dispatched with:
      | view  | key      | value                     |
      | tasks | statuses | ["in-progress","blocked"] |
    Then the state "tasks.statuses" contains "in-progress"
    And the state "tasks.statuses" contains "blocked"

  Scenario: Toggle a boolean filter in coverage view
    When event "EVT-018-filter-changed" is dispatched with:
      | view     | key          | value |
      | coverage | showGapsOnly | true  |
    Then the state "coverage.showGapsOnly" equals true

  # ── View-level reset ──────────────────────────────────────

  Scenario: Reset filters for a single view
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    When event "EVT-019-filters-reset" is dispatched with:
      | view |
      | home |
    Then the state "home.status" equals "all"
    And the state "home.search" equals ""
    And the state "home.sort" equals "last-activity"

  Scenario: Reset one view does not affect another
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key    | value   |
      | tasks | search | build   |
    And event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    When event "EVT-019-filters-reset" is dispatched with:
      | view |
      | home |
    Then the state "home.status" equals "all"
    And the state "tasks.search" equals "build"

  # ── Global reset ──────────────────────────────────────────

  Scenario: Reset all filters across every view
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key    | value  |
      | home  | status | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | view  | key    | value  |
      | tasks | search | deploy |
    When event "EVT-020-filters-all-reset" is dispatched
    Then the state "home.status" equals "all"
    And the state "tasks.search" equals ""
    And the state "coverage.showGapsOnly" equals false

  # ── Selectors ─────────────────────────────────────────────

  Scenario: activeFilterCount returns zero for default state
    Then selector "activeFilterCount" with view "home" returns 0

  Scenario: activeFilterCount counts non-default values
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value    |
      | home | status | active   |
    And event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value    |
      | home | search | test-run |
    Then selector "activeFilterCount" with view "home" returns 2

  Scenario: hasActiveFilters returns false for default state
    Then selector "hasActiveFilters" with view "tasks" returns false

  Scenario: hasActiveFilters returns true when filters are active
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key      | value          |
      | tasks | statuses | ["in-progress"] |
    Then selector "hasActiveFilters" with view "tasks" returns true

  Scenario: activeChips produces chip descriptors for active filters
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    Then selector "activeChips" with view "home" contains a chip:
      | view | key    | value  |
      | home | status | active |

  Scenario: activeChips is empty when all filters are default
    Then selector "activeChips" with view "spec" returns an empty array
