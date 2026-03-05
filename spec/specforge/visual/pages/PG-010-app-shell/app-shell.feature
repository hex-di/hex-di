@PG-010-app-shell
Feature: App Shell
  As a user of SpecForge
  I want a consistent application layout with navigation, status bar, and search
  So that I can navigate views and access global features from any page

  Background:
    Given the application is initialized

  # -- Grid Layout -----------------------------------------------------------

  Scenario: Shell renders as a CSS grid with correct dimensions
    Then the shell uses CSS grid layout
    And the grid has template columns "64px 1fr"
    And the grid has template rows "1fr 32px"
    And the shell has min-height 100vh

  Scenario: Nav rail spans full height in column 1
    Then the nav rail (CMP-001) occupies grid-column 1
    And the nav rail has grid-row "1 / -1"
    And the nav rail has width 64px

  Scenario: Main content area occupies column 2, row 1
    Then the main content area occupies grid-column 2 and grid-row 1
    And the main content area has overflow-y auto
    And the main content area has padding 24px

  Scenario: Status bar occupies column 2, row 2
    Then the status bar (CMP-002) occupies grid-column 2 and grid-row 2
    And the status bar has height 32px

  # -- Shell Background ------------------------------------------------------

  Scenario: Shell uses dark cyberpunk background
    Then the shell root element has background "--sf-bg"

  # -- Component Rendering ---------------------------------------------------

  Scenario: Shell renders all three persistent components
    Then the nav rail (CMP-001) is rendered
    And the status bar (CMP-002) is rendered
    And the search overlay (CMP-003) is conditionally rendered

  Scenario: Search overlay is hidden by default
    Then the search overlay (CMP-003) is not visible

  # -- View Routing ----------------------------------------------------------

  Scenario: Shell renders the home view by default
    Given the router store currentView is "home"
    Then the main content area renders PG-001-home

  Scenario Outline: Shell renders the correct view based on router state
    Given the router store currentView is "<view>"
    Then the main content area renders <page>

    Examples:
      | view       | page                       |
      | home       | PG-001-home                |
      | chat       | PG-002-chat                |
      | pipeline   | PG-003-pipeline            |
      | spec       | PG-004-spec-viewer         |
      | tasks      | PG-005-task-board          |
      | coverage   | PG-006-coverage-dashboard  |
      | acp-session | PG-007-acp-session          |
      | costs      | PG-008-cost-tracker        |
      | graph      | PG-009-graph-explorer      |

  Scenario: Only one view is rendered at a time
    Given the router store currentView is "chat"
    Then the main content area renders PG-002-chat
    And no other page component is rendered in the main content area

  Scenario: View transitions are instantaneous
    Given the router store currentView is "home"
    When the router store currentView changes to "pipeline"
    Then PG-003-pipeline is rendered immediately without transition animation

  # -- Keyboard Shortcut: Open Search ----------------------------------------

  Scenario: Pressing "/" opens the search overlay
    Given the search overlay is closed
    When the user presses the "/" key
    Then the search overlay (CMP-003) becomes visible
    And the search input is focused

  Scenario: "/" key is suppressed when focused on a text input
    Given the user is focused on a text input element
    When the user presses the "/" key
    Then the search overlay does not open
    And the "/" character is typed into the input

  Scenario: "/" key is suppressed when focused on a textarea
    Given the user is focused on a textarea element
    When the user presses the "/" key
    Then the search overlay does not open

  Scenario: "/" key is suppressed when focused on a contenteditable element
    Given the user is focused on a contenteditable element
    When the user presses the "/" key
    Then the search overlay does not open

  # -- Keyboard Shortcut: Close Search ---------------------------------------

  Scenario: Pressing Escape closes the search overlay
    Given the search overlay is open
    When the user presses the "Escape" key
    Then the search overlay (CMP-003) is no longer visible

  Scenario: Escape key has no effect when search is already closed
    Given the search overlay is closed
    When the user presses the "Escape" key
    Then no action is taken

  # -- Search Overlay Behavior -----------------------------------------------

  Scenario: Search overlay uses fixed positioning above all content
    Given the search overlay is open
    Then the search overlay has position "fixed"
    And the search overlay has z-index 1000
    And the search overlay covers the full viewport

  Scenario: Search overlay has semi-transparent backdrop
    Given the search overlay is open
    Then the backdrop has background "rgba(2, 4, 8, 0.85)"

  Scenario: Search dialog is centered with constrained width
    Given the search overlay is open
    Then the search dialog has max-width 640px
    And the dialog is centered horizontally
    And the dialog has top margin of 120px

  Scenario: Clicking the backdrop closes the search overlay
    Given the search overlay is open
    When the user clicks on the backdrop (outside the dialog)
    Then the search overlay closes

  Scenario: Selecting a search result closes the overlay and navigates
    Given the search overlay is open with results
    When the user selects a search result
    Then the search overlay closes
    And the application navigates to the result's target view

  Scenario: Focus is trapped within the search overlay when open
    Given the search overlay is open
    When the user presses Tab
    Then focus cycles within the overlay (input and results)
    And focus does not leave the overlay

  # -- Nav Rail Search Button ------------------------------------------------

  Scenario: Clicking the nav rail search button opens the overlay
    When the user clicks the search button (ELM-004) in the nav rail
    Then the search overlay (CMP-003) becomes visible
    And the search input is focused

  # -- Store Bindings --------------------------------------------------------

  Scenario: Shell reads current view from router store
    Given the router store (STR-014) has currentView "spec"
    Then the main content area renders PG-004-spec-viewer

  Scenario: Shell reads search open state from search store
    Given the search store (STR-012) has isOpen true
    Then the search overlay is visible

  Scenario: Shell reads session context from active session store
    Given the active session store (STR-002) has an active session
    Then the status bar displays session information

  # -- Accessibility ---------------------------------------------------------

  Scenario: Shell has correct landmark structure
    Then the nav rail has role "navigation"
    And the main content area has role "main"
    And the status bar has role "contentinfo"

  Scenario: Search overlay has dialog role when open
    Given the search overlay is open
    Then the search overlay has role "dialog"
    And the overlay has aria-modal "true"
    And the overlay has aria-label "Search SpecForge"

  Scenario: Keyboard shortcuts are discoverable
    Then the "/" shortcut is registered in the keyboard shortcut store (STR-015)
    And the "Escape" shortcut is registered in the keyboard shortcut store
