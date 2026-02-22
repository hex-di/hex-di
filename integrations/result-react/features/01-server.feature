Feature: Server Utilities
  Pattern-matching and action wrapping for server components.

  @BEH-R07-001
  Scenario: matchResult calls ok handler on Ok
    Given an Ok result with value "hello"
    When I call matchResult with ok handler returning length and err handler returning -1
    Then the output is 5

  @BEH-R07-001
  Scenario: matchResult calls err handler on Err
    Given an Err result with error "fail"
    When I call matchResult with ok handler returning length and err handler returning -1
    Then the output is -1

  @BEH-R07-002
  Scenario: matchResultAsync resolves Ok handler on Ok
    Given a ResultAsync.ok("data")
    When I call matchResultAsync with ok handler returning uppercase and err handler returning "fallback"
    Then the output is "DATA"

  @BEH-R07-002
  Scenario: matchResultAsync resolves Err handler on Err
    Given a ResultAsync.err("oops")
    When I call matchResultAsync with ok handler returning uppercase and err handler returning "fallback"
    Then the output is "fallback"

  @BEH-R07-003
  Scenario: matchOption calls some handler on Some
    Given a Some option with value "Alice"
    When I call matchOption with some handler returning greeting and none handler returning "Guest"
    Then the output is "Hello, Alice"

  @BEH-R07-003
  Scenario: matchOption calls none handler on None
    Given a None option
    When I call matchOption with some handler returning greeting and none handler returning "Guest"
    Then the output is "Guest"

  @BEH-R07-004
  Scenario: resultAction returns Ok on success
    Given a resultAction wrapping a doubling function
    When I execute the action with argument 21
    Then the result is Ok with value 42

  @BEH-R07-004
  Scenario: resultAction returns Err on rejection
    Given a resultAction wrapping a throwing function
    When I execute the action with argument "bad"
    Then the result is Err
