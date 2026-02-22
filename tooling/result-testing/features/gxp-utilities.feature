Feature: GxP Test Utilities
  Structural and behavioral verification utilities for GxP compliance.

  @BEH-T04-001
  Scenario: expectFrozen passes for frozen object
    Given a frozen object '{"a":1}'
    When I call expectFrozen on it
    Then it does not throw

  @BEH-T04-001
  Scenario: expectFrozen passes for genuine Result
    Given a Result created with ok(42)
    When I call expectFrozen on the Result
    Then it does not throw

  @BEH-T04-001
  Scenario: expectFrozen throws for non-frozen object
    Given a non-frozen object '{"a":1}'
    When I call expectFrozen on it
    Then it throws with message containing "Expected value to be frozen"

  @BEH-T04-001
  Scenario: expectFrozen throws for null
    When I call expectFrozen with null
    Then it throws with message containing "received null"

  @BEH-T04-001
  Scenario: expectFrozen passes for primitives
    When I call expectFrozen with 42
    Then it does not throw

  @BEH-T04-002
  Scenario: expectResultBrand passes for genuine Ok
    Given a Result created with ok(42)
    When I call expectResultBrand on the Result
    Then it does not throw

  @BEH-T04-002
  Scenario: expectResultBrand throws for structural fake
    Given a structural fake Result '{"_tag":"Ok","value":42}'
    When I call expectResultBrand on it
    Then it throws with message containing "RESULT_BRAND"

  @BEH-T04-002
  Scenario: expectResultBrand throws for non-object
    When I call expectResultBrand with 42
    Then it throws with message containing "Expected an object"

  @BEH-T04-003
  Scenario: expectOptionBrand passes for genuine Some
    Given an Option created with some(42)
    When I call expectOptionBrand on the Option
    Then it does not throw

  @BEH-T04-003
  Scenario: expectOptionBrand throws for structural fake
    Given a structural fake Option '{"_tag":"Some","value":42}'
    When I call expectOptionBrand on it
    Then it throws with message containing "OPTION_BRAND"

  @BEH-T04-004
  Scenario: expectImmutableResult passes for genuine Ok
    Given a Result created with ok(42)
    When I call expectImmutableResult on the Result
    Then it does not throw

  @BEH-T04-004
  Scenario: expectImmutableResult passes for genuine Err
    Given a Result created with err("fail")
    When I call expectImmutableResult on the Result
    Then it does not throw

  @BEH-T04-004
  Scenario: expectImmutableResult throws for non-frozen
    When I call expectImmutableResult with null
    Then it throws with message containing "frozen"

  @BEH-T04-004
  Scenario: expectImmutableResult throws for unbranded
    Given a frozen structural fake Result '{"_tag":"Ok","value":42}'
    When I call expectImmutableResult on it
    Then it throws with message containing "RESULT_BRAND"

  @BEH-T04-005
  Scenario: expectNeverRejects passes for Ok ResultAsync
    Given a ResultAsync created with ResultAsync.ok(42)
    When I call expectNeverRejects on the ResultAsync
    Then it resolves without throwing

  @BEH-T04-005
  Scenario: expectNeverRejects passes for Err ResultAsync
    Given a ResultAsync created with ResultAsync.err("fail")
    When I call expectNeverRejects on the ResultAsync
    Then it resolves without throwing
