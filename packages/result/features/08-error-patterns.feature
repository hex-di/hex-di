Feature: Error Patterns
  Tagged error creation and exhaustive matching.

  @BEH-08-001
  Scenario: createError creates a tagged error
    When I create an error with tag "NotFound" and fields resource="User"
    Then the error has _tag "NotFound"
    And the error has field resource "User"
    And the error is frozen

  @BEH-08-002
  Scenario: assertNever throws on unexpected value
    When I call assertNever with a value
    Then it throws an error

  @BEH-08-003
  Scenario: createErrorGroup creates namespaced errors
    When I create an error group "Auth" with error "Expired"
    Then the error has _tag "Expired"
    And the error has _namespace "Auth"
    And the error is frozen

  @BEH-08-003
  Scenario: createErrorGroup is() checks
    When I create an error group "Auth" with error "Expired"
    Then the group is() recognizes the error
