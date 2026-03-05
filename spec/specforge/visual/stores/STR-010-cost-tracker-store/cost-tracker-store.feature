@STR-010
Feature: Cost Tracker Store
  As a view consumer
  I want reliable state management for cost tracking
  So that the UI reflects current token usage and budget status

  Background:
    Given the store "cost-tracker-store" is initialized with defaults
    And the initial summary has totalCost 0, inputTokens 0, outputTokens 0, budgetPercent 0
    And the initial byPhase list is empty
    And the initial byAgent list is empty

  # --- Summary updates ---

  Scenario: Update cost summary
    When the event "EVT-018" is dispatched with payload:
      | totalCost | inputTokens | outputTokens | budgetPercent |
      | 1.25      | 50000       | 12000        | 35            |
    Then the summary totalCost is 1.25
    And the summary inputTokens is 50000
    And the summary outputTokens is 12000
    And the summary budgetPercent is 35

  Scenario: Summary update replaces previous values
    Given the summary totalCost is 1.25
    When the event "EVT-018" is dispatched with payload:
      | totalCost | inputTokens | outputTokens | budgetPercent |
      | 2.50      | 100000      | 24000        | 70            |
    Then the summary totalCost is 2.50
    And the summary budgetPercent is 70

  # --- Phase costs ---

  Scenario: Load phase costs
    When the event "EVT-019" is dispatched with 3 phase cost entries
    Then the byPhase list contains 3 entries

  Scenario: Phase costs replace previous data on reload
    Given the byPhase list contains 2 entries
    When the event "EVT-019" is dispatched with 4 phase cost entries
    Then the byPhase list contains exactly 4 entries

  # --- Agent costs ---

  Scenario: Load agent costs
    When the event "EVT-020" is dispatched with 2 agent cost entries
    Then the byAgent list contains 2 entries

  Scenario: Agent costs replace previous data on reload
    Given the byAgent list contains 5 entries
    When the event "EVT-020" is dispatched with 3 agent cost entries
    Then the byAgent list contains exactly 3 entries

  # --- Budget zone selector ---

  Scenario Outline: Budget zone classification
    Given the summary budgetPercent is <percent>
    When the selector "budgetZone" is evaluated
    Then the result is "<zone>"

    Examples:
      | percent | zone      |
      | 0       | safe      |
      | 30      | safe      |
      | 59      | safe      |
      | 60      | warning   |
      | 75      | warning   |
      | 79      | warning   |
      | 80      | critical  |
      | 95      | critical  |
      | 99      | critical  |
      | 100     | exhausted |
      | 120     | exhausted |

  # --- Top cost selectors ---

  Scenario: Top cost phase selector
    Given the byPhase list contains:
      | phase     | cost |
      | analysis  | 0.50 |
      | review    | 1.20 |
      | synthesis | 0.80 |
    When the selector "topCostPhase" is evaluated
    Then the result phase is "review"
    And the result cost is 1.20

  Scenario: Top cost phase is null when no phases loaded
    Given the byPhase list is empty
    When the selector "topCostPhase" is evaluated
    Then the result is null

  Scenario: Top cost agent selector
    Given the byAgent list contains:
      | agentRole  | cost | invocations |
      | architect  | 0.90 | 3           |
      | reviewer   | 1.50 | 5           |
      | writer     | 0.40 | 2           |
    When the selector "topCostAgent" is evaluated
    Then the result agentRole is "reviewer"
    And the result cost is 1.50

  Scenario: Top cost agent is null when no agents loaded
    Given the byAgent list is empty
    When the selector "topCostAgent" is evaluated
    Then the result is null

  # --- Subscription tick passthrough ---

  Scenario: Subscription tick does not mutate cost state
    Given the summary totalCost is 1.25
    And the byPhase list contains 2 entries
    When the event "EVT-017" is dispatched
    Then the summary totalCost is still 1.25
    And the byPhase list still contains 2 entries
