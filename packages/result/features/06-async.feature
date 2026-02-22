Feature: Async Result
  ResultAsync for handling asynchronous Result operations.

  @BEH-06-001
  Scenario: ResultAsync wraps a Promise of Result
    Given a ResultAsync.ok(42)
    When I await the ResultAsync
    Then the awaited result is Ok(42)

  @BEH-06-002
  Scenario: ResultAsync is PromiseLike
    Given a ResultAsync.ok(42)
    Then it can be awaited with await

  @BEH-06-003
  Scenario: ResultAsync.ok creates an async Ok
    When I create ResultAsync.ok(42)
    Then the async result is Ok(42)

  @BEH-06-003
  Scenario: ResultAsync.err creates an async Err
    When I create ResultAsync.err("fail")
    Then the async result is Err("fail")

  @BEH-06-006
  Scenario: ResultAsync.map transforms Ok value
    Given a ResultAsync.ok(2)
    When I async map with "x * 3"
    Then the async result is Ok(6)

  @BEH-06-006
  Scenario: ResultAsync.map is no-op on Err
    Given a ResultAsync.err("fail")
    When I async map with "x * 3"
    Then the async result is Err("fail")

  @BEH-06-007
  Scenario: ResultAsync.andThen chains
    Given a ResultAsync.ok(2)
    When I async andThen with "x => ResultAsync.ok(x + 1)"
    Then the async result is Ok(3)

  @BEH-06-008
  Scenario: ResultAsync.match extracts value
    Given a ResultAsync.ok(42)
    When I async match with onOk "v => v * 2" and onErr "e => 0"
    Then the extracted async value is 84

  @BEH-06-010
  Scenario: Sync Result toAsync bridge
    Given an Ok result with value 42
    When I call toAsync
    Then the async result is Ok(42)
