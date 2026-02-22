@rbac @audit-trail @REQ-GUARD-018
Feature: Combined RBAC and audit trail

  Background:
    Given a GxP guard system is initialized

  Scenario: Access grant produces an allow audit entry
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted
    And an audit entry should be recorded
    And the audit entry should have decision "allow"

  Scenario: Access denial produces a deny audit entry
    Given a user "bob" with no permissions
    When they attempt to "read" the "doc"
    Then access should be denied
    And an audit entry should be recorded
    And the audit entry should have decision "deny"

  Scenario: Role-based access is audited
    Given a user "carol" with role "editor"
    When they attempt access via hasRole "editor"
    Then access should be granted
    And an audit entry should be recorded

  Scenario: Multiple access attempts are individually audited
    Given a user "dave" with permission "doc:read"
    When they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    Then 2 audit entries should be recorded

  Scenario: allOf permission check is audited
    Given a user "eve" with permission "doc:read"
    When they attempt to satisfy all of "doc:read"
    Then access should be granted
    And an audit entry should be recorded
    And the audit entry should have decision "allow"

  Scenario: anyOf permission check denial is audited
    Given a user "frank" with no permissions
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be denied
    And an audit entry should be recorded
    And the audit entry should have decision "deny"

  Scenario: Audit entry includes subject ID for granted access
    Given a user "grace" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted
    And an audit entry should be recorded
    And the audit entry should have a subject ID

  Scenario: Audit entry is frozen after recording
    Given a user "henry" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted
    And an audit entry should be recorded
    And the audit entry should be frozen
