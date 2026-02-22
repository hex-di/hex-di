Feature: Composition
  Combinator functions for working with collections of Results.

  @BEH-05-001
  Scenario: all with all Ok results
    Given a list of Ok results [1, 2, 3]
    When I call all
    Then the result is Ok([1, 2, 3])

  @BEH-05-001
  Scenario: all with one Err
    Given a list containing ok(1), err("fail"), ok(3)
    When I call all
    Then the result is Err("fail")

  @BEH-05-002
  Scenario: allSettled collects all errors without short-circuit
    Given a list containing ok(1), err("fail"), ok(3)
    When I call allSettled
    Then the result is Err with all errors collected

  @BEH-05-003
  Scenario: any with at least one Ok
    Given a list containing err("a"), ok(2), err("c")
    When I call any
    Then the result is Ok(2)

  @BEH-05-003
  Scenario: any with all Err
    Given a list of Err results ["a", "b", "c"]
    When I call any
    Then the result is Err with all errors

  @BEH-05-005
  Scenario: partition separates Ok and Err
    Given a list containing ok(1), err("a"), ok(3), err("b")
    When I call partition
    Then the Ok partition is [1, 3]
    And the Err partition is ["a", "b"]

  @BEH-05-006
  Scenario: forEach maps items with Result-returning function
    Given items [1, 2, 3]
    When I call forEach with "x => ok(x * 2)"
    Then the result is Ok([2, 4, 6])

  @BEH-05-006
  Scenario: forEach short-circuits on first Err
    Given items with a negative value
    When I call forEach with a function that fails on negative
    Then the result is Err
