@gxp @separation-of-duties @REQ-GUARD-014
Feature: Separation of duties enforcement

  Scenario: User with conflicting roles fails SoD validation
    Given a guard system is initialized
    And a user "alice" with roles "requester,approver"
    And a separation of duties constraint between "requester" and "approver"
    When SoD constraints are validated for "alice"
    Then validation should fail with SoD violation

  Scenario: User without conflicting roles passes SoD validation
    Given a guard system is initialized
    And a user "bob" with role "viewer"
    And a separation of duties constraint between "requester" and "approver"
    When SoD constraints are validated for "bob"
    Then validation should pass

  Scenario: SoD constraint includes a descriptive reason
    Given a guard system is initialized
    And a user "carol" with roles "requester,approver"
    And a separation of duties constraint between "requester" and "approver" with reason "Four-eyes principle required"
    When SoD constraints are validated for "carol"
    Then validation should fail with reason "Four-eyes principle required"

  Scenario: User with unrelated role passes SoD check
    Given a guard system is initialized
    And a user "dave" with roles "viewer,editor"
    And a separation of duties constraint between "requester" and "approver"
    When SoD constraints are validated for "dave"
    Then validation should pass
