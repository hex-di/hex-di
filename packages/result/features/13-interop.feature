Feature: Interop
  Serialization and schema interoperability.

  @BEH-13-001
  Scenario: fromJSON deserializes Ok
    When I call fromJSON with an Ok JSON containing value 42
    Then the result is Ok(42)

  @BEH-13-001
  Scenario: fromJSON deserializes Err
    When I call fromJSON with an Err JSON containing error "fail"
    Then the result is Err("fail")

  @BEH-13-001
  Scenario: fromJSON rejects invalid shape
    When I call fromJSON with an invalid JSON
    Then it throws a TypeError

  @BEH-13-002
  Scenario: toSchema creates a Standard Schema
    When I call toSchema with a validator
    Then the schema validates Ok inputs
    And the schema rejects invalid inputs

  @BEH-13-003
  Scenario: Result survives structuredClone
    Given an Ok result with value 42
    When I call toJSON then fromJSON
    Then the round-tripped result is Ok(42)

  @BEH-13-006
  Scenario: Option JSON round-trip
    Given a some(42)
    When I serialize and deserialize the option
    Then the round-tripped option is Some(42)
