@CMP-004-filter-bar
Feature: Filter Bar
  As a user
  I want a contextual filter bar that adapts to my current view
  So that I can narrow down displayed data with relevant filter controls

  Background:
    Given the filter store (STR-001) is initialized with defaults

  # -- Layout ----------------------------------------------------------

  Scenario: Filter bar has correct container styling
    Given the filter bar is rendered for view "home"
    Then the filter bar has background "--sf-surface"
    And the filter bar has border-radius 8px
    And the filter bar has border "1px solid rgba(0, 240, 255, 0.08)"
    And the filter bar has padding "8px 12px"

  Scenario: Controls row arranges children horizontally
    Given the filter bar is rendered for view "home"
    Then the controls row uses flex-direction "row"
    And the controls row has flex-wrap "wrap"
    And the controls row has align-items "center"
    And the controls row has gap 8px

  # -- Filterable Views ------------------------------------------------

  Scenario Outline: Filter bar renders for filterable views
    Given the current view is "<view>"
    Then the filter bar is rendered with viewId "<view>"

    Examples:
      | view       |
      | home       |
      | acp-session |
      | tasks      |
      | coverage   |
      | spec       |
      | costs      |
      | graph      |

  Scenario Outline: Filter bar does not render for non-filterable views
    Given the current view is "<view>"
    Then the filter bar is not rendered

    Examples:
      | view     |
      | chat     |
      | pipeline |

  # -- Active Filter Count Badge (ELM-020) ----------------------------

  Scenario: Count badge is hidden when no filters are active
    Given the filter store has no active filters for view "home"
    Then the active filter count badge (ELM-020) is not visible

  Scenario: Count badge appears when filters are active
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    Then the active filter count badge (ELM-020) is visible
    And the badge displays "1"

  Scenario: Count badge displays correct count for multiple active filters
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key          | value  |
      | home | status       | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value    |
      | home | search | test-run |
    Then the badge displays "2"

  Scenario: Count badge styling is a 20px accent circle
    Given the active filter count badge is visible
    Then the badge has width 20px and height 20px
    And the badge has border-radius 50%
    And the badge has background "--sf-accent"
    And the badge text color is "--sf-bg"
    And the badge has font-size 11px

  # -- Chips Row (Conditional) -----------------------------------------

  Scenario: Chips row is hidden when no filters are active
    Given the filter store has no active filters for view "tasks"
    And the filter bar is rendered for view "tasks"
    Then the chips row is not visible

  Scenario: Chips row appears when filters are active
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key      | value          |
      | tasks | statuses | ["in-progress"] |
    And the filter bar is rendered for view "tasks"
    Then the chips row is visible

  Scenario: Chips row has correct layout styling
    Given the chips row is visible
    Then the chips row uses flex-direction "row"
    And the chips row has flex-wrap "wrap"
    And the chips row has gap 6px
    And the chips row has padding-top 8px
    And the chips row has border-top "1px solid rgba(0, 240, 255, 0.06)"
    And the chips row has margin-top 8px

  # -- Filter Chips (ELM-018) -----------------------------------------

  Scenario: Active filter chips display label and value
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    And the filter bar is rendered for view "home"
    Then a chip is displayed with label "Status" and value "active"

  Scenario: Dismissing a filter chip resets that filter
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    When the user clicks the dismiss button on the "Status: active" chip
    Then event "EVT-018-filter-changed" is dispatched with:
      | view | key    | value |
      | home | status | all   |
    And the chip is removed

  Scenario: Multiple chips appear for multiple active filters
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value      |
      | home | search | deployment |
    And the filter bar is rendered for view "home"
    Then 2 filter chips are displayed

  # -- Clear All Link (ELM-019) ----------------------------------------

  Scenario: Clear All link appears in chips row
    Given the chips row is visible for view "home"
    Then a "Clear All" link is displayed in the chips row

  Scenario: Clear All link resets all filters for the current view
    Given event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value  |
      | home | status | active |
    And event "EVT-018-filter-changed" was dispatched with:
      | view | key    | value    |
      | home | search | test-run |
    When the user clicks the "Clear All" link
    Then event "EVT-019-filters-reset" is dispatched with:
      | view |
      | home |
    And all chips are removed
    And the chips row becomes hidden

  Scenario: Clear All link has muted text with underline
    Given the chips row is visible
    Then the "Clear All" link has color "--sf-text-muted"
    And the "Clear All" link has text-decoration "underline"

  Scenario: Clear All link changes color on hover
    Given the chips row is visible
    When the user hovers over the "Clear All" link
    Then the "Clear All" link has color "--sf-text"

  # -- Per-View Isolation -----------------------------------------------

  Scenario: Filters from one view do not appear in another view's bar
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key    | value  |
      | home  | status | active |
    And the filter bar is rendered for view "tasks"
    Then no filter chips are displayed
    And the active filter count badge is not visible

  Scenario: Switching views shows the new view's active filters
    Given event "EVT-018-filter-changed" was dispatched with:
      | view  | key      | value            |
      | tasks | statuses | ["in-progress"]  |
    And the filter bar is rendered for view "tasks"
    Then a chip is displayed with label "Statuses" and value "in-progress"
    And the badge displays "1"

  # -- Store Bindings ---------------------------------------------------

  Scenario: Filter bar reads filter state from STR-001
    Given the filter store (STR-001) has home.status set to "error"
    And the filter bar is rendered for view "home"
    Then the status filter control reflects value "error"

  Scenario: Filter bar reads activeChips selector from STR-001
    Given the filter store activeChips selector for view "coverage" returns:
      | key          | label        | value |
      | showGapsOnly | Gaps Only    | true  |
    And the filter bar is rendered for view "coverage"
    Then a chip is displayed with label "Gaps Only" and value "true"

  # -- Responsive Visibility -------------------------------------------

  Scenario: Filter bar is visible on all screen sizes
    Given the filter bar is rendered for view "home"
    And the viewport width is 375px
    Then the filter bar is visible
