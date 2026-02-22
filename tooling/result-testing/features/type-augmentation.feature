Feature: Type Augmentation
  Vitest module augmentation and type-level contracts.

  @BEH-T05-001
  Scenario: Assertion<T> includes all 8 custom matchers
    Given setupResultMatchers has been called
    Then expect(ok(42)).toBeOk() type-checks
    And expect(err("fail")).toBeErr() type-checks
    And expect(ok(42)).toBeOkWith(42) type-checks
    And expect(err("fail")).toBeErrWith("fail") type-checks
    And expect(some(42)).toBeSome() type-checks
    And expect(none()).toBeNone() type-checks
    And expect(ok(42)).toContainOk(42) type-checks
    And expect(err("fail")).toContainErr("fail") type-checks

  @BEH-T05-002
  Scenario: AsymmetricMatchersContaining includes matchers
    Given setupResultMatchers has been called
    Then expect.toBeOk(42) is callable in asymmetric context
    And expect.toBeErr("fail") is callable in asymmetric context

  @BEH-T05-003
  Scenario: expectOk narrows Result<T,E> to T
    Given a Result typed as Result<number, string>
    When I call expectOk on the Result
    Then the return type is number

  @BEH-T05-003
  Scenario: expectErr narrows Result<T,E> to E
    Given an Err Result typed as Result<number, string>
    When I call expectErr on the Result
    Then the return type is string

  @BEH-T05-003
  Scenario: expectSome narrows Option<T> to T
    Given an Option typed as Option<number>
    When I call expectSome on the Option
    Then the return type is number

  @BEH-T05-003
  Scenario: expectNone returns void
    Given a None Option typed as Option<number>
    When I call expectNone on the Option
    Then the return type is void
