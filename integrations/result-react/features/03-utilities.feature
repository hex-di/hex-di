Feature: Utilities
  Client-side utility functions for wrapping async actions.

  @BEH-R04-001
  Scenario: fromAction wraps successful async function in Ok
    Given an async function that returns "success"
    When I wrap it with fromAction and call it
    Then the result is Ok with value "success"

  @BEH-R04-001
  Scenario: fromAction wraps throwing async function in Err
    Given an async function that throws "failure"
    When I wrap it with fromAction and call it
    Then the result is Err with error "failure"

  @BEH-R04-001
  Scenario: fromAction preserves argument types
    Given an async function accepting name and age
    When I wrap it with fromAction and call it with "Alice" and 30
    Then the result is Ok with value containing name "Alice" and age 30
