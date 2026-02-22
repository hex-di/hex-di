Feature: Option Type
  Optional value handling with Some and None.

  @BEH-09-001
  Scenario: OPTION_BRAND is a unique symbol
    Then OPTION_BRAND is a symbol

  @BEH-09-005
  Scenario: some() creates a Some variant
    When I create some(42)
    Then the option _tag is "Some"
    And the option value is 42

  @BEH-09-006
  Scenario: none() creates a None variant
    When I create none()
    Then the option _tag is "None"

  @BEH-09-007
  Scenario: isOption accepts genuine Some
    Given a some(42)
    Then isOption returns true

  @BEH-09-007
  Scenario: isOption accepts genuine None
    Given a none()
    Then isOption returns true

  @BEH-09-007
  Scenario: isOption rejects plain objects
    Given a plain object with _tag "Some" and value 42
    Then isOption returns false

  @BEH-09-008
  Scenario: Option.fromNullable with value
    When I call Option.fromNullable with 42
    Then the option is Some(42)

  @BEH-09-008
  Scenario: Option.fromNullable with null
    When I call Option.fromNullable with null
    Then the option is None
