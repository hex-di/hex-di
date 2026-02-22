Feature: Types and Guards
  Core type definitions, brand symbol, and type guard functions.

  @BEH-01-001
  Scenario: RESULT_BRAND is a unique symbol on Ok
    Given an Ok result with value 42
    Then the result carries the RESULT_BRAND symbol

  @BEH-01-001
  Scenario: RESULT_BRAND is a unique symbol on Err
    Given an Err result with error "fail"
    Then the result carries the RESULT_BRAND symbol

  @BEH-01-007
  Scenario: ok() creates an Ok variant
    When I create ok(42)
    Then the result _tag is "Ok"
    And the result value is 42

  @BEH-01-008
  Scenario: err() creates an Err variant
    When I create err("fail")
    Then the result _tag is "Err"
    And the result error is "fail"

  @BEH-01-009
  Scenario: isResult accepts genuine Results
    Given an Ok result with value 1
    Then isResult returns true

  @BEH-01-009
  Scenario: isResult rejects plain objects
    Given a plain object with _tag "Ok" and value 42
    Then isResult returns false

  @BEH-01-010
  Scenario: isResultAsync accepts ResultAsync
    Given a ResultAsync.ok(42)
    Then isResultAsync returns true

  @BEH-01-010
  Scenario: isResultAsync rejects plain Promise
    Given a plain Promise resolving to 42
    Then isResultAsync returns false

  @BEH-01-011
  Scenario: isOk() returns true for Ok
    Given an Ok result with value 1
    Then isOk() returns true
    And isErr() returns false

  @BEH-01-011
  Scenario: isErr() returns true for Err
    Given an Err result with error "fail"
    Then isOk() returns false
    And isErr() returns true
