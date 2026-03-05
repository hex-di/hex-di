@CMP-001-nav-rail
Feature: Nav Rail
  As a user
  I want a persistent vertical navigation sidebar
  So that I can switch between application views quickly

  Background:
    Given the application shell is rendered
    And the nav rail is visible on the left edge

  # -- Layout ----------------------------------------------------------

  Scenario: Nav rail has correct dimensions
    Then the nav rail has width 64px
    And the nav rail spans the full viewport height
    And the nav rail has grid-row "1 / -1"

  Scenario: Nav rail uses dark surface background
    Then the nav rail background is "--sf-surface"
    And the nav rail has a right border of "1px solid rgba(0, 240, 255, 0.08)"

  Scenario: Nav rail arranges buttons in a vertical column
    Then the nav rail uses flex-direction "column"
    And the nav rail has align-items "center"
    And the nav rail has gap 4px
    And the nav rail has padding "12px 0"

  # -- Nav Items -------------------------------------------------------

  Scenario: Nav rail renders all nine navigation buttons
    Then the nav rail contains exactly 9 nav buttons
    And the nav buttons appear in order:
      | label    | icon |
      | Home     | \u2302   |
      | Chat     | \u25CE   |
      | Pipeline | \u25B8   |
      | Spec     | \u2261   |
      | Tasks    | \u2630   |
      | Coverage | \u25C9   |
      | Board    | \u25A6   |
      | Costs    | $    |
      | Graph    | \u25C7   |

  Scenario: Each nav button contains an icon and a label
    Then each nav button contains one ELM-002-nav-icon element
    And each nav button contains one ELM-003-nav-label element

  # -- Active State ----------------------------------------------------

  Scenario: Active nav button reflects the current view
    Given the router store currentView is "chat"
    Then the "Chat" nav button is in the active state
    And the "Chat" nav button has color "--sf-accent"
    And the "Chat" nav button has background "--sf-accent-dim"
    And the "Chat" nav button has a 3px solid accent left indicator bar

  Scenario: Only one nav button is active at a time
    Given the router store currentView is "spec"
    Then the "Spec" nav button is in the active state
    And all other nav buttons are in the default state

  Scenario: Active state updates when the view changes
    Given the router store currentView is "home"
    When the router store currentView changes to "tasks"
    Then the "Tasks" nav button enters the active state
    And the "Home" nav button returns to the default state

  # -- Navigation ------------------------------------------------------

  Scenario: Clicking a nav button triggers navigation
    When the user clicks the "Pipeline" nav button
    Then the onNavigate callback is invoked with view "pipeline"

  Scenario: Clicking the already-active nav button does not re-navigate
    Given the router store currentView is "graph"
    When the user clicks the "Graph" nav button
    Then no navigation event is dispatched

  # -- Search Button ---------------------------------------------------

  Scenario: Search button is pinned to the bottom of the rail
    Then the search button (ELM-004) is positioned at the bottom of the nav rail
    And the search button has margin-top "auto"

  Scenario: Search button opens the search overlay
    When the user clicks the search button
    Then the action ACT-003-open-search is triggered

  Scenario: Search button displays "/" icon
    Then the search button contains a "/" icon glyph

  # -- Store Binding ---------------------------------------------------

  Scenario: Nav rail reads currentView from the router store
    Given the router store (STR-014) has currentView "coverage"
    Then the nav rail prop currentView equals "coverage"
    And the "Coverage" nav button is in the active state

  # -- Responsive Visibility ------------------------------------------

  Scenario: Nav rail is visible on desktop
    Given the viewport width is 1280px
    Then the nav rail is visible

  Scenario: Nav rail is visible on tablet
    Given the viewport width is 768px
    Then the nav rail is visible

  Scenario: Nav rail is hidden on mobile
    Given the viewport width is 375px
    Then the nav rail is not visible
