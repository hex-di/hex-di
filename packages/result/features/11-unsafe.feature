Feature: Unsafe Operations
  Operations that throw on unexpected variants.

  @BEH-11-001
  Scenario: UnwrapError contains context
    Given an Err result with error "fail"
    When I call unwrap
    Then it throws an UnwrapError with context _tag "Err"

  @BEH-11-002
  Scenario: unwrap returns value for Ok
    Given an Ok result with value 42
    When I call unwrap
    Then the unwrapped value is 42

  @BEH-11-002
  Scenario: unwrap throws for Err
    Given an Err result with error "fail"
    When I call unwrap
    Then it throws an UnwrapError

  @BEH-11-003
  Scenario: unwrapErr returns error for Err
    Given an Err result with error "fail"
    When I call unwrapErr
    Then the unwrapped error is "fail"

  @BEH-11-003
  Scenario: unwrapErr throws for Ok
    Given an Ok result with value 42
    When I call unwrapErr
    Then it throws an UnwrapError

  @BEH-11-004
  Scenario: expect throws UnwrapError with custom message
    Given an Err result with error "fail"
    When I call expect with message "should have value"
    Then it throws an UnwrapError with message "should have value"
