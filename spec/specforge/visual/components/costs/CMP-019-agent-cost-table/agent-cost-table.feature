@CMP-019
Feature: Agent Cost Table
  A sortable, filterable table showing cost breakdown by agent role with colored badges.

  Background:
    Given the agent cost table component is rendered
    And STR-010 cost-tracker-store has byAgent data loaded
    And STR-001 filter-store has costs filters at default values

  # -- Rendering --

  Scenario: Table displays all agent rows
    Given the byAgent list contains 4 entries
    And no agent role filter is active
    Then 4 agent rows are rendered

  Scenario: Each row displays agent badge, input tokens, output tokens, cost, and invocations
    Given an agent cost entry: agentRole "architect", inputTokens 38200, outputTokens 10100, cost 0.90, invocations 3
    Then the row displays a colored badge for "architect"
    And the row displays "38,200" in the Input Tokens column
    And the row displays "10,100" in the Output Tokens column
    And the row displays "$0.90" in the Cost column
    And the row displays "3" in the Invocations column

  Scenario: Table has 5 column headers
    Then the table headers are "Agent", "Input Tokens", "Output Tokens", "Cost", "Invocations"

  Scenario: Numeric columns are right-aligned
    Then the "Input Tokens" column is right-aligned
    And the "Output Tokens" column is right-aligned
    And the "Cost" column is right-aligned
    And the "Invocations" column is right-aligned

  # -- Agent role badges --

  Scenario Outline: Agent role badge has correct color
    Given an agent cost entry with agentRole "<role>"
    Then the agent badge color is "<color>"

    Examples:
      | role           | color       |
      | spec-author    | #4FC3F7     |
      | gxp-reviewer   | #FF8C00     |
      | test-designer  | #22C55E     |
      | architect      | #A78BFA     |
      | validator      | #FFD600     |
      | code-reviewer  | #F472B6     |
      | domain-expert  | #60A5FA     |
      | orchestrator   | --sf-accent |

  # -- Alternating rows --

  Scenario: Even rows have transparent background
    Then even-numbered rows have background "transparent"

  Scenario: Odd rows have subtle tinted background
    Then odd-numbered rows have background "rgba(0, 240, 255, 0.02)"

  # -- Row hover --

  Scenario: Row highlights on hover
    When the user hovers over an agent cost row
    Then the row background changes to "rgba(0, 240, 255, 0.05)"

  # -- Sorting --

  Scenario: Clicking Agent header sorts by agent role
    When the user clicks the "Agent" column header
    Then rows are sorted by agent role ascending

  Scenario: Clicking Cost header sorts by cost
    When the user clicks the "Cost" column header
    Then rows are sorted by cost ascending

  Scenario: Clicking Invocations header sorts by invocations
    When the user clicks the "Invocations" column header
    Then rows are sorted by invocations ascending

  Scenario: Clicking the same sorted header toggles to descending
    Given the table is sorted by "Cost" ascending
    When the user clicks the "Cost" column header again
    Then rows are sorted by cost descending

  Scenario: All columns are sortable
    Then column headers "Agent", "Input Tokens", "Output Tokens", "Cost", and "Invocations" are all clickable for sorting

  # -- Filtering --

  Scenario: Filter by selected agent roles
    Given agents "architect", "gxp-reviewer", "test-designer", and "orchestrator" exist
    When the filter costs.agentRoles is set to ["architect", "gxp-reviewer"]
    Then only rows for "architect" and "gxp-reviewer" are displayed

  Scenario: Empty agent role filter shows all agents
    When the filter costs.agentRoles is empty
    Then all agent rows are displayed

  # -- Empty state --

  Scenario: Empty state when no agent data exists
    Given the byAgent list is empty
    Then the text "No agent cost data available." is displayed
    And no table rows are visible

  Scenario: Empty state after filtering removes all results
    Given the byAgent list contains 3 entries
    When the filter costs.agentRoles is set to ["nonexistent-agent"]
    Then the text "No agent cost data available." is displayed

  # -- Reactivity --

  Scenario: Table updates when store data changes
    Given the byAgent list contains 2 entries
    When the STR-010 byAgent is replaced with 6 entries
    Then 6 agent rows are rendered

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the agent cost table has role "table"
    And the agent cost table has aria-label "Cost breakdown by agent role"
