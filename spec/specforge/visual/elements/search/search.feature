@ELM-search
Feature: Search Elements
  Search backdrop, input, category labels, result items, and hint text.

  Background:
    Given the search overlay is open
    And the search backdrop is visible

  # ── ELM-009 Search Backdrop ──

  Scenario: Backdrop covers full viewport with blur
    Then the search backdrop has position "fixed"
    And the search backdrop has background "rgba(2, 4, 8, 0.8)"
    And the search backdrop has backdrop-filter "blur(4px)"

  Scenario: Clicking the backdrop closes search
    When the user clicks on the search backdrop outside the search panel
    Then the action ACT-005-close-search is triggered

  # ── ELM-010 Search Input ──

  Scenario: Search input auto-focuses on overlay open
    Then the search input has focus

  Scenario: Search input displays placeholder
    When the search input is empty
    Then the placeholder text "Search specs, tasks, messages..." is visible

  Scenario: Search input debounces query dispatch
    When the user types "flow" in the search input
    And 300ms have elapsed since the last keystroke
    Then the action ACT-004-search-query is triggered

  Scenario: Search input shows accent border on focus
    When the search input has focus
    Then the search input border-color is "--sf-accent"

  Scenario: Search input binds to STR-012 query field
    When the user types "session" in the search input
    Then the STR-012 query field is updated to "session"

  # ── ELM-011 Search Category Label ──

  Scenario: Category label renders uppercase text
    Given search results include the "Sessions" category
    Then a category label "SESSIONS" is rendered in 10px uppercase
    And the category label color is "--sf-text-muted"

  Scenario: Category label only appears for non-empty groups
    Given search results have no items in the "Tasks" category
    Then no "TASKS" category label is rendered

  # ── ELM-012 Search Result Item ──

  Scenario: Result item displays title and subtitle
    Given a search result with title "My Session" and subtitle "sess_abc123"
    Then the result item title is displayed at 13px with color "--sf-text"
    And the result item subtitle is displayed at 11px with color "--sf-text-muted"

  Scenario: Hovering a result item highlights it
    When the user hovers over a search result item
    Then the result item background changes to "--sf-accent-dim"

  Scenario: Clicking a result item selects it
    When the user clicks a search result item
    Then the action ACT-004-search-select-result is triggered

  Scenario: Arrow keys navigate between results
    Given the first search result item has keyboard focus
    When the user presses the ArrowDown key
    Then the second search result item receives keyboard focus
    And the second result item background changes to "--sf-accent-dim"

  Scenario: Enter key selects the focused result
    Given a search result item has keyboard focus
    When the user presses the Enter key
    Then the action ACT-004-search-select-result is triggered

  # ── ELM-013 Search Hint Text ──

  Scenario: Hint text displays keyboard shortcuts
    Then the search hint text displays "Press / to search, Esc to close"
    And the search hint text color is "--sf-text-muted"
    And the search hint text font-size is 11px
