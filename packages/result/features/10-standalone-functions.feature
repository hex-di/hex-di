Feature: Standalone Functions
  Curried standalone functions that delegate to Result methods.

  @BEH-10-001
  Scenario: Standalone map delegates to Result.map
    Given an Ok result with value 2
    When I apply standalone map with "x * 3"
    Then the result is Ok(6)

  @BEH-10-002
  Scenario: pipe chains standalone functions
    Given an Ok result with value 2
    When I pipe through map "x + 1" and map "x * 2"
    Then the result is Ok(6)

  @BEH-10-003
  Scenario: Standalone andThen delegates
    Given an Ok result with value 2
    When I apply standalone andThen with "x => ok(x + 1)"
    Then the result is Ok(3)

  @BEH-10-003
  Scenario: Standalone unwrapOr delegates
    Given an Err result with error "fail"
    When I apply standalone unwrapOr with default 0
    Then the extracted value is 0
