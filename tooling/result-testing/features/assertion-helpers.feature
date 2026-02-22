Feature: Assertion Helpers
  Type-narrowing assertion functions for Result and Option types in tests.

  @BEH-T01-001
  Scenario: expectOk returns the contained value for Ok
    Given a Result created with ok(42)
    When I call expectOk on the Result
    Then it returns 42

  @BEH-T01-001
  Scenario: expectOk throws for Err
    Given a Result created with err("fail")
    When I call expectOk on the Result
    Then it throws with message containing "Expected Ok but got Err"

  @BEH-T01-001 @TINV-2
  Scenario: expectOk includes the error value in the message
    Given a Result created with err('{"code":404}')
    When I call expectOk on the Result
    Then it throws with message containing "404"

  @BEH-T01-002
  Scenario: expectErr returns the contained error for Err
    Given a Result created with err("fail")
    When I call expectErr on the Result
    Then it returns "fail"

  @BEH-T01-002
  Scenario: expectErr throws for Ok
    Given a Result created with ok(42)
    When I call expectErr on the Result
    Then it throws with message containing "Expected Err but got Ok"

  @BEH-T01-003
  Scenario: expectOkAsync returns value for Ok ResultAsync
    Given a ResultAsync created with ResultAsync.ok(42)
    When I call expectOkAsync on the ResultAsync
    Then it resolves to 42

  @BEH-T01-003
  Scenario: expectOkAsync throws for Err ResultAsync
    Given a ResultAsync created with ResultAsync.err("fail")
    When I call expectOkAsync on the ResultAsync
    Then it rejects with message containing "Expected Ok but got Err"

  @BEH-T01-004
  Scenario: expectErrAsync returns error for Err ResultAsync
    Given a ResultAsync created with ResultAsync.err("fail")
    When I call expectErrAsync on the ResultAsync
    Then it resolves to "fail"

  @BEH-T01-004
  Scenario: expectErrAsync throws for Ok ResultAsync
    Given a ResultAsync created with ResultAsync.ok(42)
    When I call expectErrAsync on the ResultAsync
    Then it rejects with message containing "Expected Err but got Ok"

  @BEH-T01-005
  Scenario: expectSome returns the contained value for Some
    Given an Option created with some(42)
    When I call expectSome on the Option
    Then it returns 42

  @BEH-T01-005
  Scenario: expectSome throws for None
    Given an Option created with none()
    When I call expectSome on the Option
    Then it throws with message containing "Expected Some but got None"

  @BEH-T01-006
  Scenario: expectNone passes for None
    Given an Option created with none()
    When I call expectNone on the Option
    Then it does not throw

  @BEH-T01-006
  Scenario: expectNone throws for Some
    Given an Option created with some(42)
    When I call expectNone on the Option
    Then it throws with message containing "Expected None but got Some"
