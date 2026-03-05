@CMP-003-search-overlay
Feature: Search Overlay
  As a user
  I want a global search overlay
  So that I can quickly find sessions, specs, tasks, messages, and graph nodes

  Background:
    Given the search overlay is open

  # -- Layout ----------------------------------------------------------

  Scenario: Overlay covers the entire viewport
    Then the overlay has position "fixed"
    And the overlay has inset 0 on all edges
    And the overlay has z-index 100

  Scenario: Backdrop has blurred dark background
    Then the backdrop (ELM-009) has background "rgba(0, 0, 0, 0.6)"
    And the backdrop has backdrop-filter "blur(4px)"

  Scenario: Search panel is centered with correct dimensions
    Then the search panel has width 560px
    And the search panel has margin-top 80px
    And the search panel has max-height "calc(100vh - 160px)"

  Scenario: Search panel has correct visual styling
    Then the search panel has background "--sf-surface"
    And the search panel has border-radius 12px
    And the search panel has border "1px solid rgba(0, 240, 255, 0.15)"
    And the search panel has box-shadow "0 24px 48px rgba(0, 0, 0, 0.5)"

  # -- Children --------------------------------------------------------

  Scenario: Search panel contains all required elements
    Then the panel contains one ELM-010-search-input
    And the panel contains ELM-011-search-category-label elements for each non-empty category
    And the panel contains ELM-012-search-result-item elements for each result
    And the panel contains one ELM-013-search-hint-text

  # -- Search Input ----------------------------------------------------

  Scenario: Search input is focused when overlay opens
    Then the search input (ELM-010) has focus

  Scenario: Typing in search input updates the query
    When the user types "auth flow" in the search input
    Then the search store (STR-012) query equals "auth flow"

  Scenario: Search input displays placeholder text
    Then the search input placeholder reads "Search sessions, specs, tasks..."

  # -- Search Results --------------------------------------------------

  Scenario: Results are grouped by category
    Given the search store results contain:
      | category | title                   |
      | Sessions | Fix auth flow           |
      | Specs    | auth/permissions.md     |
      | Tasks    | Implement guard adapter |
    Then the results area shows category label "SESSIONS"
    And the results area shows category label "SPECS"
    And the results area shows category label "TASKS"

  Scenario: Empty categories are hidden
    Given the search store results contain no items for category "Messages"
    Then the category label "MESSAGES" is not visible

  Scenario: All five categories can appear
    Given the search store results contain items for all categories
    Then the results area shows category labels:
      | label        |
      | SESSIONS     |
      | SPECS        |
      | TASKS        |
      | MESSAGES     |
      | GRAPH NODES  |

  Scenario: Results area scrolls when content exceeds max height
    Given the search store results contain more than 20 items
    Then the results area is scrollable

  # -- Keyboard Navigation ---------------------------------------------

  Scenario: Escape closes the overlay
    When the user presses the "Escape" key
    Then the onClose callback is invoked

  Scenario: ArrowDown moves selection to next result
    Given the search store selectedIndex is 0
    When the user presses the "ArrowDown" key
    Then the search store selectedIndex is 1

  Scenario: ArrowUp moves selection to previous result
    Given the search store selectedIndex is 2
    When the user presses the "ArrowUp" key
    Then the search store selectedIndex is 1

  Scenario: ArrowDown wraps from last to first result
    Given the search store results contain 5 items
    And the search store selectedIndex is 4
    When the user presses the "ArrowDown" key
    Then the search store selectedIndex is 0

  Scenario: ArrowUp wraps from first to last result
    Given the search store results contain 5 items
    And the search store selectedIndex is 0
    When the user presses the "ArrowUp" key
    Then the search store selectedIndex is 4

  Scenario: Enter selects the highlighted result
    Given the search store selectedIndex is 2
    And the result at index 2 has view "spec" and id "auth/permissions.md"
    When the user presses the "Enter" key
    Then navigation to the selected result is triggered

  # -- Selected Result Highlight ----------------------------------------

  Scenario: Selected result item is visually highlighted
    Given the search store selectedIndex is 1
    Then the result item at index 1 has background "rgba(0, 240, 255, 0.08)"
    And the result item at index 1 displays a ">" prefix indicator

  Scenario: Non-selected result items have no highlight
    Given the search store selectedIndex is 1
    Then the result item at index 0 has background "transparent"
    And the result item at index 0 does not display a ">" prefix indicator

  # -- Backdrop Click ---------------------------------------------------

  Scenario: Clicking the backdrop closes the overlay
    When the user clicks the backdrop (ELM-009)
    Then the onClose callback is invoked

  Scenario: Clicking inside the panel does not close the overlay
    When the user clicks inside the search panel
    Then the onClose callback is not invoked

  # -- Hint Footer ------------------------------------------------------

  Scenario: Hint footer shows keyboard navigation instructions
    Then the hint text (ELM-013) contains "Up/Down"
    And the hint text contains "Enter"
    And the hint text contains "Esc"

  # -- Store Bindings ---------------------------------------------------

  Scenario: Overlay reads query from the search store
    Given the search store (STR-012) query is "pipeline"
    Then the search input value is "pipeline"

  Scenario: Overlay reads selected index from the search store
    Given the search store (STR-012) selectedIndex is 3
    Then the result item at index 3 is highlighted
