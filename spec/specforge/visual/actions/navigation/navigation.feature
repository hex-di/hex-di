@ACT-navigation
Feature: Navigation Actions
  View navigation, search overlay open/close, and search query dispatch.

  Background:
    Given the application shell is rendered
    And the nav rail is visible on the left edge

  # -- ACT-001 Navigate to View --

  Scenario: Clicking a nav button navigates to the corresponding view
    Given the current view is "home"
    When the user clicks the "Chat" nav button (ELM-001)
    Then the action ACT-001-navigate-to-view is triggered with viewId "chat"
    And the event EVT-001-view-changed is dispatched with payload { viewId: "chat" }
    And the STR-014-router-store currentView is updated to "chat"
    And the "Chat" nav button enters the active state
    And the "Home" nav button returns to the default state

  Scenario: Navigating to the same view is a no-op
    Given the current view is "chat"
    When the user clicks the "Chat" nav button (ELM-001)
    Then no EVT-001-view-changed event is dispatched
    And the view panel does not re-render

  Scenario: View panel content swaps on navigation
    Given the current view is "home"
    When the action ACT-001-navigate-to-view is triggered with viewId "pipeline"
    Then the home view panel is unmounted
    And the pipeline view panel is mounted

  # -- ACT-002 Navigate Back --

  Scenario: Alt+Left navigates to the previous view
    Given the user navigated from "home" to "chat"
    When the user presses Alt+Left
    Then the action ACT-002-navigate-back is triggered
    And the event EVT-001-view-changed is dispatched with payload { viewId: "home" }
    And the current view returns to "home"

  Scenario: Alt+Left with no history is a no-op
    Given the user has not navigated away from the initial view
    When the user presses Alt+Left
    Then no EVT-001-view-changed event is dispatched
    And the current view remains unchanged

  # -- ACT-003 Open Search --

  Scenario: Clicking the nav search button opens the search overlay
    Given the search overlay is closed
    When the user clicks the nav search button (ELM-004)
    Then the action ACT-003-open-search is triggered
    And the event EVT-021-search-opened is dispatched
    And the search backdrop (ELM-009) becomes visible
    And the search input (ELM-010) receives focus

  Scenario: Pressing "/" opens the search overlay
    Given the search overlay is closed
    And no text input field has focus
    When the user presses the "/" key
    Then the action ACT-003-open-search is triggered
    And the search overlay opens

  Scenario: "/" key is suppressed when an input has focus
    Given the search overlay is closed
    And a text input field has focus
    When the user presses the "/" key
    Then the action ACT-003-open-search is not triggered
    And the "/" character is typed into the focused input

  Scenario: Opening search when already open is a no-op
    Given the search overlay is already open
    When the user presses the "/" key
    Then the action ACT-003-open-search is not triggered again

  # -- ACT-004 Search Query --

  Scenario: Typing in the search input dispatches a debounced query
    Given the search overlay is open
    When the user types "flow" in the search input (ELM-010)
    And 300ms have elapsed since the last keystroke
    Then the action ACT-004-search-query is triggered
    And the event EVT-021-search-query-changed is dispatched with payload { query: "flow" }
    And the STR-012-search-store query field is updated to "flow"

  Scenario: Rapid typing only dispatches one query after debounce
    Given the search overlay is open
    When the user types "f", "l", "o", "w" in quick succession within 300ms
    Then only one EVT-021-search-query-changed event is dispatched
    And the payload query value is "flow"

  Scenario: Clearing the search input clears results
    Given the search overlay is open
    And the search query is "flow"
    When the user clears the search input
    And 300ms have elapsed
    Then the event EVT-021-search-query-changed is dispatched with payload { query: "" }
    And the search results list is empty

  # -- ACT-005 Close Search --

  Scenario: Clicking the backdrop closes the search overlay
    Given the search overlay is open
    When the user clicks on the search backdrop (ELM-009) outside the search panel
    Then the action ACT-005-close-search is triggered
    And the event EVT-023-search-closed is dispatched
    And the search overlay is hidden
    And the search query is cleared

  Scenario: Pressing Escape closes the search overlay
    Given the search overlay is open
    When the user presses the Escape key
    Then the action ACT-005-close-search is triggered
    And the search overlay is hidden

  Scenario: Focus returns to previous element after closing search
    Given the "Chat" nav button had focus before search was opened
    And the search overlay is open
    When the user presses the Escape key
    Then focus returns to the "Chat" nav button

  Scenario: Closing search when already closed is a no-op
    Given the search overlay is closed
    When the user presses the Escape key
    Then no EVT-023-search-closed event is dispatched
