@CMP-018
Feature: Phase Cost Table
  A sortable, filterable table showing cost breakdown by pipeline phase.

  Background:
    Given the phase cost table component is rendered
    And STR-010 cost-tracker-store has byPhase data loaded
    And STR-001 filter-store has costs filters at default values

  # -- Rendering --

  Scenario: Table displays all phase rows
    Given the byPhase list contains 4 entries
    And no phase filter is active
    Then 4 phase rows are rendered

  Scenario: Each row displays phase name, input tokens, output tokens, and cost
    Given a phase cost entry: phase "review", inputTokens 65100, outputTokens 18400, cost 1.20
    Then the row displays "review" in the Phase Name column
    And the row displays "65,100" in the Input Tokens column
    And the row displays "18,400" in the Output Tokens column
    And the row displays "$1.20" in the Cost column

  Scenario: Table has 4 column headers
    Then the table headers are "Phase Name", "Input Tokens", "Output Tokens", "Cost"

  Scenario: Numeric columns are right-aligned
    Then the "Input Tokens" column is right-aligned
    And the "Output Tokens" column is right-aligned
    And the "Cost" column is right-aligned

  # -- Alternating rows --

  Scenario: Even rows have transparent background
    Then even-numbered rows have background "transparent"

  Scenario: Odd rows have subtle tinted background
    Then odd-numbered rows have background "rgba(0, 240, 255, 0.02)"

  # -- Row hover --

  Scenario: Row highlights on hover
    When the user hovers over a phase cost row
    Then the row background changes to "rgba(0, 240, 255, 0.05)"

  # -- Sorting --

  Scenario: Clicking Phase Name header sorts ascending
    When the user clicks the "Phase Name" column header
    Then rows are sorted by phase name ascending
    And a sort indicator is visible on the "Phase Name" header

  Scenario: Clicking Cost header sorts by cost
    When the user clicks the "Cost" column header
    Then rows are sorted by cost ascending

  Scenario: Clicking the same sorted header toggles to descending
    Given the table is sorted by "Cost" ascending
    When the user clicks the "Cost" column header again
    Then rows are sorted by cost descending

  Scenario: All columns are sortable
    Then column headers "Phase Name", "Input Tokens", "Output Tokens", and "Cost" are all clickable for sorting

  # -- Filtering --

  Scenario: Filter by selected phases
    Given phases "analysis", "review", "synthesis", and "validation" exist
    When the filter costs.phases is set to ["review", "synthesis"]
    Then only rows for "review" and "synthesis" are displayed

  Scenario: Empty phase filter shows all phases
    When the filter costs.phases is empty
    Then all phase rows are displayed

  # -- Empty state --

  Scenario: Empty state when no phase data exists
    Given the byPhase list is empty
    Then the text "No phase cost data available." is displayed
    And no table rows are visible

  Scenario: Empty state after filtering removes all results
    Given the byPhase list contains 3 entries
    When the filter costs.phases is set to ["nonexistent-phase"]
    Then the text "No phase cost data available." is displayed

  # -- Reactivity --

  Scenario: Table updates when store data changes
    Given the byPhase list contains 2 entries
    When the STR-010 byPhase is replaced with 5 entries
    Then 5 phase rows are rendered

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the phase cost table has role "table"
    And the phase cost table has aria-label "Cost breakdown by pipeline phase"
