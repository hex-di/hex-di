Feature: Extraction
  Methods that extract values from Results.

  @BEH-04-001
  Scenario: match extracts Ok value
    Given an Ok result with value 42
    When I match with onOk "v => v * 2" and onErr "e => 0"
    Then the extracted value is 84

  @BEH-04-001
  Scenario: match extracts Err error
    Given an Err result with error "fail"
    When I match with onOk "v => v" and onErr "e => e.length"
    Then the extracted value is 4

  @BEH-04-002
  Scenario: unwrapOr returns value for Ok
    Given an Ok result with value 42
    When I unwrapOr with default 0
    Then the extracted value is 42

  @BEH-04-002
  Scenario: unwrapOr returns default for Err
    Given an Err result with error "fail"
    When I unwrapOr with default 0
    Then the extracted value is 0

  @BEH-04-006
  Scenario: toNullable returns value for Ok
    Given an Ok result with value 42
    When I call toNullable
    Then the extracted value is 42

  @BEH-04-006
  Scenario: toNullable returns null for Err
    Given an Err result with error "fail"
    When I call toNullable
    Then the extracted value is null

  @BEH-04-007
  Scenario: toUndefined returns value for Ok
    Given an Ok result with value 42
    When I call toUndefined
    Then the extracted value is 42

  @BEH-04-007
  Scenario: toUndefined returns undefined for Err
    Given an Err result with error "fail"
    When I call toUndefined
    Then the extracted value is undefined

  @BEH-04-008
  Scenario: intoTuple returns [value, null] for Ok
    Given an Ok result with value 42
    When I call intoTuple
    Then the tuple is [42, null]

  @BEH-04-008
  Scenario: intoTuple returns [null, error] for Err
    Given an Err result with error "fail"
    When I call intoTuple
    Then the tuple is [null, "fail"]

  @BEH-04-010
  Scenario: toJSON serializes Ok
    Given an Ok result with value 42
    When I call toJSON
    Then the JSON has _tag "Ok" and value 42

  @BEH-04-010
  Scenario: toJSON serializes Err
    Given an Err result with error "fail"
    When I call toJSON
    Then the JSON has _tag "Err" and error "fail"
