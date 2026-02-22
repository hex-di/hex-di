Feature: Vitest Custom Matchers
  Custom Vitest matchers for Result and Option types.

  @BEH-T02-001
  Scenario: setupResultMatchers registers all matchers
    Given setupResultMatchers has been called
    Then the matcher "toBeOk" is available
    And the matcher "toBeErr" is available
    And the matcher "toBeOkWith" is available
    And the matcher "toBeErrWith" is available
    And the matcher "toBeSome" is available
    And the matcher "toBeNone" is available
    And the matcher "toContainOk" is available
    And the matcher "toContainErr" is available

  @BEH-T02-002
  Scenario: toBeOk passes for Ok result
    Given a Result created with ok(42)
    Then expect(result).toBeOk() passes

  @BEH-T02-002
  Scenario: toBeOk with value passes for matching Ok
    Given a Result created with ok(42)
    Then expect(result).toBeOk(42) passes

  @BEH-T02-002
  Scenario: toBeOk fails for Err result
    Given a Result created with err("fail")
    Then expect(result).toBeOk() fails

  @BEH-T02-002
  Scenario: toBeOk supports .not negation
    Given a Result created with err("fail")
    Then expect(result).not.toBeOk() passes

  @BEH-T02-003
  Scenario: toBeErr passes for Err result
    Given a Result created with err("fail")
    Then expect(result).toBeErr() passes

  @BEH-T02-003
  Scenario: toBeErr with value passes for matching Err
    Given a Result created with err("fail")
    Then expect(result).toBeErr("fail") passes

  @BEH-T02-003
  Scenario: toBeErr fails for Ok result
    Given a Result created with ok(42)
    Then expect(result).toBeErr() fails

  @BEH-T02-004
  Scenario: toBeOkWith passes for Ok with matching value
    Given a Result created with ok('{"a":1}')
    Then expect(result).toBeOkWith('{"a":1}') passes

  @BEH-T02-004
  Scenario: toBeOkWith fails for Ok with different value
    Given a Result created with ok(42)
    Then expect(result).toBeOkWith(99) fails

  @BEH-T02-004
  Scenario: toBeOkWith fails for Err
    Given a Result created with err("fail")
    Then expect(result).toBeOkWith(42) fails

  @BEH-T02-005
  Scenario: toBeErrWith passes for Err with matching error
    Given a Result created with err('{"code":404}')
    Then expect(result).toBeErrWith('{"code":404}') passes

  @BEH-T02-005
  Scenario: toBeErrWith fails for Err with different error
    Given a Result created with err("a")
    Then expect(result).toBeErrWith("b") fails

  @BEH-T02-006
  Scenario: toBeSome passes for Some option
    Given an Option created with some(42)
    Then expect(option).toBeSome() passes

  @BEH-T02-006
  Scenario: toBeSome with value passes for matching Some
    Given an Option created with some(42)
    Then expect(option).toBeSome(42) passes

  @BEH-T02-006
  Scenario: toBeSome fails for None option
    Given an Option created with none()
    Then expect(option).toBeSome() fails

  @BEH-T02-007
  Scenario: toBeNone passes for None option
    Given an Option created with none()
    Then expect(option).toBeNone() passes

  @BEH-T02-007
  Scenario: toBeNone fails for Some option
    Given an Option created with some(42)
    Then expect(option).toBeNone() fails

  @BEH-T02-008
  Scenario: toContainOk passes for same reference
    Given a Result created with ok(42)
    Then expect(result).toContainOk(42) passes

  @BEH-T02-008
  Scenario: toContainOk fails for different object references
    Given a Result created with ok('{"a":1}')
    Then expect(result).toContainOk('{"a":1}') fails

  @BEH-T02-009
  Scenario: toContainErr passes for same reference
    Given a Result created with err("fail")
    Then expect(result).toContainErr("fail") passes

  @BEH-T02-009
  Scenario: toContainErr fails for different object references
    Given a Result created with err('{"code":404}')
    Then expect(result).toContainErr('{"code":404}') fails

  @BEH-T02-001 @TINV-3
  Scenario: setupResultMatchers is idempotent
    Given setupResultMatchers has been called
    When setupResultMatchers is called again
    Then expect(ok(42)).toBeOk() still passes
