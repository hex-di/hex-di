@audit-trail @REQ-GUARD-004
Feature: Audit trail recording

  Background:
    Given a GxP guard system is initialized

  Scenario: Allow decision is recorded in audit trail
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted
    And an audit entry should be recorded
    And the audit entry should have decision "allow"

  Scenario: Deny decision is recorded in audit trail
    Given a user "bob" with no permissions
    When they attempt to "read" the "doc"
    Then access should be denied
    And an audit entry should be recorded
    And the audit entry should have decision "deny"

  Scenario: Audit entry contains required fields
    Given a user "carol" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then an audit entry should be recorded
    And the audit entry should have a non-empty evaluation ID
    And the audit entry should have an evaluatedAt timestamp
    And the audit entry should have a subject ID

  Scenario: Audit entry is frozen against mutation
    Given a user "dave" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then an audit entry should be recorded
    And the audit entry should be frozen

  Scenario: Multiple access attempts produce multiple audit entries
    Given a user "eve" with permission "doc:read"
    When they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    Then 2 audit entries should be recorded

  Scenario: Audit entry contains policy information
    Given a user "frank" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then an audit entry should be recorded
    And the audit entry should contain policy information

  Scenario: Audit entry records the scope ID
    Given a user "grace" with permission "doc:read"
    And the evaluation scope is "session-xyz"
    When they attempt to "read" the "doc"
    Then the audit entry should have scope "session-xyz"
