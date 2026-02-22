Feature: Creation Constructors
  Helper constructors for creating Results from various sources.

  @BEH-02-001
  Scenario: fromThrowable wraps a successful function
    When I call fromThrowable with a function returning 42
    Then the result is Ok(42)

  @BEH-02-001
  Scenario: fromThrowable wraps a throwing function
    When I call fromThrowable with a function that throws "boom"
    Then the result is Err with a mapped error

  @BEH-02-002
  Scenario: tryCatch wraps a successful function
    When I call tryCatch with a function returning 42
    Then the result is Ok(42)

  @BEH-02-002
  Scenario: tryCatch wraps a throwing function
    When I call tryCatch with a function that throws "boom"
    Then the result is Err with a mapped error

  @BEH-02-003
  Scenario: fromNullable with a non-null value
    When I call fromNullable with value 42
    Then the result is Ok(42)

  @BEH-02-003
  Scenario: fromNullable with null
    When I call fromNullable with null
    Then the result is Err with the nullable error

  @BEH-02-004
  Scenario: fromPredicate with a passing predicate
    When I call fromPredicate with value 10 and predicate "x > 0"
    Then the result is Ok(10)

  @BEH-02-004
  Scenario: fromPredicate with a failing predicate
    When I call fromPredicate with value -1 and predicate "x > 0"
    Then the result is Err with the predicate error

  @BEH-02-005
  Scenario: fromPromise with a resolved promise
    When I call fromPromise with a promise resolving to 42
    Then the async result is Ok(42)

  @BEH-02-005
  Scenario: fromPromise with a rejected promise
    When I call fromPromise with a promise rejecting with "boom"
    Then the async result is Err with a mapped error

  @BEH-02-006
  Scenario: fromSafePromise with a resolved promise
    When I call fromSafePromise with a promise resolving to ok(42)
    Then the async result is Ok(42)

  @BEH-02-007
  Scenario: fromAsyncThrowable wraps an async function
    When I call fromAsyncThrowable with an async function returning 42
    Then the async result is Ok(42)
