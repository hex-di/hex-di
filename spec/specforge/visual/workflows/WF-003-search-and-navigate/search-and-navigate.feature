@WF-003
Feature: Search and Navigate
  As a user
  I want to quickly search across all entities and navigate to results
  So that I can find and access any session, spec, task, message, or graph node

  Background:
    Given the app shell (PG-010) is rendered
    And the search store is initialized with defaults
    And the search overlay is closed
    And no input element has focus

  # --- Opening the Search Overlay ---

  Scenario: User opens search with "/" key
    When the user presses "/"
    Then action ACT-003 (open search) fires
    And event EVT-030-search-opened is dispatched
    And the search overlay (CMP-003) renders with a backdrop
    And the search input (ELM-010) receives auto-focus
    And hint text "Search specs, tasks, messages..." is displayed

  Scenario: "/" key is suppressed when an input has focus
    Given a text input in the current view has focus
    When the user presses "/"
    Then the search overlay does not open
    And the "/" character is typed into the focused input

  Scenario: User opens search with Cmd+K
    When the user presses Cmd+K
    Then the search overlay opens
    And the search input receives auto-focus

  Scenario: User opens search by clicking nav search button
    When the user clicks the search button (ELM-004) in the nav rail
    Then the search overlay opens
    And the search input receives auto-focus

  Scenario: Search overlay renders backdrop
    When the search overlay opens
    Then a semi-transparent backdrop (ELM-009) covers the viewport
    And the backdrop has background "rgba(2, 4, 8, 0.8)" with 4px blur
    And clicking the backdrop closes the overlay

  # --- Typing a Query ---

  Scenario: User types a search query
    Given the search overlay is open
    When the user types "auth" in the search input
    And 300ms debounce elapses
    Then action ACT-004 (search query) fires
    And event EVT-021-search-query-changed is dispatched with query "auth"
    And the search store query is "auth"
    And the selectedIndex resets to -1

  Scenario: Debounce prevents rapid re-dispatching
    Given the search overlay is open
    When the user types "a" then "au" then "aut" then "auth" within 200ms
    Then only one EVT-021 is dispatched after the 300ms debounce
    And the dispatched query is "auth"

  Scenario: Empty query shows hint text
    Given the search overlay is open
    And the query is ""
    Then the overlay shows hint text instead of results
    And the hint text reads "Press / to search, Esc to close"

  # --- Receiving Results ---

  Scenario: Results appear grouped by category
    Given the search overlay is open
    And the user has typed "auth"
    When event EVT-031-search-results-received is dispatched with:
      | id   | category | title            | subtitle          |
      | r-01 | sessions | Auth Session     | my-auth-lib       |
      | r-02 | specs    | Auth API Design  | Section 3         |
      | r-03 | specs    | Auth Middleware   | Section 7         |
      | r-04 | tasks    | Implement Login  | Group: auth       |
      | r-05 | messages | Found 3 modules  | Agent response    |
    Then the results are displayed grouped by category
    And the "Sessions" group shows 1 result
    And the "Specs" group shows 2 results
    And the "Tasks" group shows 1 result
    And the "Messages" group shows 1 result
    And each group has a category label (ELM-011)

  Scenario: No results found
    Given the search overlay is open
    And the user has typed "xyznonexistent"
    When event EVT-031-search-results-received is dispatched with 0 results
    Then a "No results found" placeholder is displayed
    And no category labels are shown

  Scenario: New results replace previous results
    Given the search overlay shows 5 results for query "auth"
    When the user changes the query to "pipe"
    And event EVT-031-search-results-received is dispatched with 2 results
    Then the overlay shows exactly 2 results
    And the previous 5 results are no longer visible

  # --- Keyboard Navigation ---

  Scenario: ArrowDown selects the first result
    Given the search overlay shows 4 results
    And the selectedIndex is -1
    When the user presses ArrowDown
    Then event EVT-032-search-selection-moved is dispatched with index 0
    And the first result item has accent-dim background and accent outline

  Scenario: ArrowDown moves selection forward
    Given the search overlay shows 4 results
    And the selectedIndex is 1
    When the user presses ArrowDown
    Then event EVT-032 is dispatched with index 2
    And the third result item is visually selected

  Scenario: ArrowDown does not wrap past last result
    Given the search overlay shows 4 results
    And the selectedIndex is 3
    When the user presses ArrowDown
    Then the selectedIndex remains 3
    And the last result item stays selected

  Scenario: ArrowUp moves selection backward
    Given the search overlay shows 4 results
    And the selectedIndex is 2
    When the user presses ArrowUp
    Then event EVT-032 is dispatched with index 1
    And the second result item is visually selected

  Scenario: ArrowUp does not wrap past first result
    Given the search overlay shows 4 results
    And the selectedIndex is 0
    When the user presses ArrowUp
    Then the selectedIndex remains 0
    And the first result item stays selected

  Scenario: Query change resets selection
    Given the search overlay shows 4 results
    And the selectedIndex is 2
    When the user modifies the query text
    And EVT-021 is dispatched
    Then the selectedIndex resets to -1
    And no result item is visually selected

  # --- Selecting a Result ---

  Scenario: User selects a result with Enter
    Given the search overlay shows results
    And the selectedIndex is 1
    And the result at index 1 has navigateTo "spec"
    When the user presses Enter
    Then action ACT-025 (select result) fires
    And event EVT-022-search-result-selected is dispatched
    And the search store resets: isOpen false, query "", results [], selectedIndex -1
    And the search overlay closes

  Scenario: User selects a result with mouse click
    Given the search overlay shows results
    When the user clicks on a result item with navigateTo "tasks"
    Then event EVT-022-search-result-selected is dispatched
    And the search store fully resets
    And the overlay closes

  Scenario: Navigation follows result selection
    Given event EVT-022 was dispatched for a result with navigateTo "spec"
    Then event EVT-001-view-changed is dispatched with viewId "spec"
    And the router store sets currentView to "spec"
    And PG-004-spec-viewer renders in the main content area

  Scenario Outline: Result category navigates to correct view
    Given the selected result has category "<category>" and navigateTo "<view>"
    When the user selects that result
    Then EVT-001-view-changed dispatches with viewId "<view>"

    Examples:
      | category    | view  |
      | sessions    | home  |
      | specs       | spec  |
      | tasks       | tasks |
      | messages    | chat  |
      | graph-nodes | graph |

  # --- Closing Without Selection ---

  Scenario: User closes search with Escape
    Given the search overlay is open
    And the query is "auth"
    And results are displayed
    When the user presses Escape
    Then action ACT-005 (close search) fires
    And event EVT-023-search-closed is dispatched
    And the search store resets: isOpen false, query "", results [], selectedIndex -1
    And the overlay closes
    And no navigation occurs

  Scenario: User closes search by clicking backdrop
    Given the search overlay is open
    When the user clicks the backdrop area (ELM-009)
    Then event EVT-023-search-closed is dispatched
    And the overlay closes
    And no navigation occurs

  Scenario: Focus returns to previous element after close
    Given the user was focused on the nav rail before opening search
    When the search overlay closes via Escape
    Then focus returns to the nav rail

  # --- End-to-End Journey ---

  Scenario: Complete search and navigate journey
    Given the user is on the Home view
    When the user presses "/"
    And the search overlay opens
    And the user types "pipeline"
    And results appear with a "Specs" group showing "Pipeline Architecture"
    And the user presses ArrowDown to select it
    And the user presses Enter
    Then the overlay closes
    And the app navigates to the Spec Viewer (PG-004)
    And the search store is fully reset

  Scenario: Search, browse results, then dismiss
    Given the user is on the Chat view
    When the user presses "/"
    And the search overlay opens
    And the user types "auth"
    And results appear
    And the user browses with ArrowDown and ArrowUp
    And the user presses Escape
    Then the overlay closes
    And the user remains on the Chat view
    And the search store is fully reset
