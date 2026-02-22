Feature: Composition Hooks
  Hooks for managing, composing, and transitioning Result state.

  @BEH-R03-001
  Scenario: useResult starts undefined with no initial value
    Given a useResult hook with no initial value
    Then the hook result is undefined

  @BEH-R03-001
  Scenario: useResult setOk updates to Ok
    Given a useResult hook with no initial value
    When I call setOk with "hello"
    Then the hook result is Ok with value "hello"

  @BEH-R03-001
  Scenario: useResult setErr updates to Err
    Given a useResult hook with no initial value
    When I call setErr with "bad"
    Then the hook result is Err with error "bad"

  @BEH-R03-001
  Scenario: useResult reset returns to undefined
    Given a useResult hook with no initial value
    When I call setOk with "temp"
    And I call reset
    Then the hook result is undefined

  @BEH-R03-002
  Scenario: useOptimisticResult returns authoritative result
    Given a useOptimisticResult hook with authoritative Ok "confirmed"
    Then the hook result is Ok with value "confirmed"

  @BEH-R03-002
  Scenario: useOptimisticResult applies optimistic update
    Given a useOptimisticResult hook with authoritative Ok "confirmed"
    When I apply optimistic value "optimistic"
    Then the hook result is Ok with value "optimistic"

  @BEH-R03-004
  Scenario: useResultTransition starts with undefined result
    Given a useResultTransition hook
    Then the hook result is undefined

  @BEH-R03-004
  Scenario: useResultTransition resolves to Ok
    Given a useResultTransition hook
    When I start a transition returning Ok "transitioned"
    Then the hook result is Ok with value "transitioned"

  @BEH-R03-003
  Scenario: useSafeTry composes Ok results
    Given a useSafeTry hook yielding Ok "a" and Ok "b"
    Then the hook result is Ok with value "ab"

  @BEH-R03-003
  Scenario: useSafeTry short-circuits on Err
    Given a useSafeTry hook yielding Ok "a" then Err "fail"
    Then the hook result is Err with error "fail"
