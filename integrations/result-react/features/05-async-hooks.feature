Feature: Async Hooks
  Hooks for eager and lazy async Result operations.

  @BEH-R02-001
  Scenario: useResultAsync resolves Ok
    Given a useResultAsync hook with a function returning Ok "data"
    When the async operation resolves
    Then the hook result is Ok with value "data"
    And isLoading is false

  @BEH-R02-001
  Scenario: useResultAsync resolves Err
    Given a useResultAsync hook with a function returning Err "fail"
    When the async operation resolves
    Then the hook result is Err with error "fail"

  @BEH-R02-002
  Scenario: useResultAction starts idle and executes on demand
    Given a useResultAction hook with a function returning Ok "done"
    Then the hook result is undefined
    When I execute the action
    Then the hook result is Ok with value "done"

  @BEH-R02-003
  Scenario: useResultSuspense returns a resolved Result
    Given a useResultSuspense hook inside Suspense with Ok "loaded"
    When the async operation resolves
    Then the hook result is Ok with value "loaded"

  @BEH-R02-004
  Scenario: createResultResource preloads and reads
    Given a createResultResource with Ok "cached"
    When I preload the resource
    And the async operation resolves
    Then reading the resource returns Ok with value "cached"
