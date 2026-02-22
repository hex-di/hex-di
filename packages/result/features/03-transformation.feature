Feature: Transformations
  Methods that transform Result values.

  @BEH-03-001
  Scenario: map transforms Ok value
    Given an Ok result with value 2
    When I map with "x * 3"
    Then the result is Ok(6)

  @BEH-03-001
  Scenario: map is no-op on Err
    Given an Err result with error "fail"
    When I map with "x * 3"
    Then the result is Err("fail")

  @BEH-03-002
  Scenario: mapErr transforms Err error
    Given an Err result with error "fail"
    When I mapErr with "e.toUpperCase()"
    Then the result is Err("FAIL")

  @BEH-03-002
  Scenario: mapErr is no-op on Ok
    Given an Ok result with value 42
    When I mapErr with "e.toUpperCase()"
    Then the result is Ok(42)

  @BEH-03-005
  Scenario: flip swaps Ok to Err
    Given an Ok result with value 42
    When I flip the result
    Then the result _tag is "Err"
    And the result error is 42

  @BEH-03-005
  Scenario: flip swaps Err to Ok
    Given an Err result with error "fail"
    When I flip the result
    Then the result _tag is "Ok"
    And the result value is "fail"

  @BEH-03-006
  Scenario: andThen chains on Ok
    Given an Ok result with value 2
    When I andThen with "x => ok(x + 1)"
    Then the result is Ok(3)

  @BEH-03-006
  Scenario: andThen short-circuits on Err
    Given an Err result with error "fail"
    When I andThen with "x => ok(x + 1)"
    Then the result is Err("fail")

  @BEH-03-007
  Scenario: orElse recovers on Err
    Given an Err result with error "fail"
    When I orElse with "e => ok(0)"
    Then the result is Ok(0)

  @BEH-03-007
  Scenario: orElse is no-op on Ok
    Given an Ok result with value 42
    When I orElse with "e => ok(0)"
    Then the result is Ok(42)

  @BEH-03-008
  Scenario: andTee executes side effect on Ok
    Given an Ok result with value 42
    When I andTee with a side-effect function
    Then the side effect was called with 42
    And the result is Ok(42)

  @BEH-03-009
  Scenario: orTee executes side effect on Err
    Given an Err result with error "fail"
    When I orTee with a side-effect function
    Then the side effect was called with "fail"
    And the result is Err("fail")

  @BEH-03-013
  Scenario: and returns other on Ok
    Given an Ok result with value 1
    When I call and with ok(2)
    Then the result is Ok(2)

  @BEH-03-014
  Scenario: or returns other on Err
    Given an Err result with error "fail"
    When I call or with ok(2)
    Then the result is Ok(2)
