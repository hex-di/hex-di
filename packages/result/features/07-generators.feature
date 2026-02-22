Feature: Generators
  Generator-based control flow with safeTry.

  @BEH-07-001
  Scenario: safeTry with all Ok yields
    When I run safeTry yielding ok(1) and ok(2)
    Then the safeTry result is Ok(3)

  @BEH-07-001
  Scenario: safeTry short-circuits on Err
    When I run safeTry yielding ok(1) then err("stop")
    Then the safeTry result is Err("stop")

  @BEH-07-002
  Scenario: yield* extracts Ok value
    When I yield* ok(42) inside safeTry
    Then the yielded value is 42

  @BEH-07-003
  Scenario: Runner calls generator.return() on Err
    When I run safeTry with an Err and code after yield
    Then the code after yield is not reached

  @BEH-07-004
  Scenario: Generator cleanup on early exit
    When I run safeTry that encounters Err
    Then the generator is properly cleaned up
