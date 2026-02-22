Feature: Adapters
  Bridge Result-returning functions to TanStack Query and SWR.

  @BEH-R05-001
  Scenario: toQueryFn resolves with Ok value
    Given a ResultAsync-returning function that succeeds with "hello"
    When I wrap it with toQueryFn and call it
    Then the output resolves to "hello"

  @BEH-R05-001
  Scenario: toQueryFn throws Err value
    Given a ResultAsync-returning function that fails with "boom"
    When I wrap it with toQueryFn and call it
    Then the output rejects with "boom"

  @BEH-R05-002
  Scenario: toQueryOptions returns queryKey and queryFn
    Given a ResultAsync-returning function that succeeds with "alice"
    When I call toQueryOptions with a query key
    Then the output has the expected queryKey
    And the queryFn resolves to "alice"

  @BEH-R05-004
  Scenario: toMutationFn resolves with Ok value
    Given a ResultAsync mutation function that succeeds
    When I wrap it with toMutationFn and call it with "alice"
    Then the output resolves to "saved: alice"

  @BEH-R05-004
  Scenario: toMutationFn throws Err value
    Given a ResultAsync mutation function that fails
    When I wrap it with toMutationFn and call it with "alice"
    Then the output rejects with "fail"

  @BEH-R05-005
  Scenario: toMutationOptions returns mutationFn that resolves with Ok value
    Given a ResultAsync mutation function that succeeds
    When I wrap it with toMutationOptions and call it with "bob"
    Then the output resolves to "saved: bob"

  @BEH-R05-005
  Scenario: toMutationOptions returns mutationFn that throws Err value
    Given a ResultAsync mutation function that fails
    When I wrap it with toMutationOptions and call it with "bob"
    Then the output rejects with "fail"

  @BEH-R05-003
  Scenario: toSwrFetcher resolves with Ok value
    Given a key-based ResultAsync function that succeeds
    When I wrap it with toSwrFetcher and call it with "users"
    Then the output resolves to "data-users"

  @BEH-R05-003
  Scenario: toSwrFetcher throws Err value
    Given a key-based ResultAsync function that fails
    When I wrap it with toSwrFetcher and call it with "users"
    Then the output rejects with "not found"
