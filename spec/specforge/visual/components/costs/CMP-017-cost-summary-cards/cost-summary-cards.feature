@CMP-017
Feature: Cost Summary Cards
  A row of 4 summary cards showing total cost, input tokens, output tokens, and budget gauge.

  Background:
    Given the cost summary cards component is rendered
    And STR-010 cost-tracker-store is initialized with a summary

  # -- Card rendering --

  Scenario: Four summary cards are displayed
    Then 4 cost summary cards are visible
    And the cards are arranged in a horizontal row with 16px gap

  Scenario: Total Cost card displays formatted dollar amount
    Given the summary totalCost is 2.47
    Then the "Total Cost" card displays "$2.47"

  Scenario: Total Cost card shows zero
    Given the summary totalCost is 0
    Then the "Total Cost" card displays "$0.00"

  Scenario: Input Tokens card displays formatted number
    Given the summary inputTokens is 125400
    Then the "Input Tokens" card displays "125,400"

  Scenario: Output Tokens card displays formatted number
    Given the summary outputTokens is 32100
    Then the "Output Tokens" card displays "32,100"

  Scenario: Budget card displays gauge and percentage
    Given the summary budgetPercent is 47
    Then the "Budget" card contains a budget gauge
    And the budget gauge fill is at 47%
    And the text "47%" is displayed below the gauge

  # -- Card layout --

  Scenario: Cards have equal width
    Then all 4 cards have equal width
    And each card uses flex "1 1 0"

  Scenario: Card label styling
    Then each card label is 11px font-size
    And each card label uses color "--sf-text-muted"

  Scenario: Card value styling
    Then each card value text is 18px font-size
    And each card value uses color "--sf-text"
    And each card value has font-weight 600

  # -- Budget gauge color zones --

  Scenario Outline: Budget gauge color by zone
    Given the summary budgetPercent is <percent>
    Then the budget gauge bar color is "<color>"

    Examples:
      | percent | color       |
      | 0       | --sf-accent |
      | 30      | --sf-accent |
      | 59      | --sf-accent |
      | 60      | #FF8C00     |
      | 72      | #FF8C00     |
      | 84      | #FF8C00     |
      | 85      | #FF3B3B     |
      | 90      | #FF3B3B     |
      | 94      | #FF3B3B     |
      | 95      | #FF3B3B     |
      | 100     | #FF3B3B     |

  Scenario: Exhausted budget gauge pulses
    Given the summary budgetPercent is 97
    Then the budget gauge bar has a pulsing animation
    And the animation is "pulse 1.5s ease-in-out infinite"

  Scenario: Budget below exhausted threshold does not pulse
    Given the summary budgetPercent is 90
    Then the budget gauge bar does not have a pulsing animation

  # -- Reactivity --

  Scenario: Cards update when store changes
    Given the summary totalCost is 1.00
    When the STR-010 summary updates totalCost to 3.50
    Then the "Total Cost" card displays "$3.50"

  Scenario: Budget gauge updates dynamically
    Given the summary budgetPercent is 30
    When the STR-010 summary updates budgetPercent to 75
    Then the budget gauge fill is at 75%
    And the budget gauge bar color changes to "#FF8C00"

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the cost summary cards have role "region"
    And the cost summary cards have aria-label "Cost summary"
