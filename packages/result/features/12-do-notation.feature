Feature: Do Notation
  Imperative-style Result composition with bind and let_.

  @BEH-12-001
  Scenario: Result.Do starts an empty accumulator
    When I start with Result.Do
    Then the accumulator is an empty Ok record

  @BEH-12-002
  Scenario: bind adds a value to the accumulator
    When I start with Result.Do and bind "x" to ok(1)
    Then the accumulator contains x = 1

  @BEH-12-002
  Scenario: bind short-circuits on Err
    When I start with Result.Do and bind "x" to err("fail")
    Then the result is Err("fail")

  @BEH-12-003
  Scenario: let_ adds a computed value
    When I start with Result.Do, bind "x" to ok(2), and let_ "y" as "x * 3"
    Then the accumulator contains y = 6

  @BEH-12-005
  Scenario: Do notation works with pipe
    When I pipe Result.Do through bind and let_
    Then the result accumulates all values
