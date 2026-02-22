Feature: Match Component
  Renders Ok or Err branch based on Result variant.

  @BEH-R01-001
  Scenario: Match renders ok branch for Ok result
    Given a React tree with Match and an Ok result "Alice"
    Then the rendered output contains "Hello, Alice"

  @BEH-R01-001
  Scenario: Match renders err branch for Err result
    Given a React tree with Match and an Err result "not found"
    Then the rendered output contains "Error: not found"

  @BEH-R01-001
  Scenario: Match updates when result changes from Ok to Err
    Given a React tree with Match and an Ok result "Bob"
    Then the rendered output contains "Hello, Bob"
