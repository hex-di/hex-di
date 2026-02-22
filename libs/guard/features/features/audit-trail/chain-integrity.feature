@audit-trail @hash-chain @REQ-GUARD-005
Feature: Audit chain integrity

  Background:
    Given a GxP guard system with hash chain enabled

  Scenario: Audit chain is intact after sequential entries
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    Then the chain should be intact

  Scenario: Single entry chain is intact
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then the chain should be intact

  Scenario: Sequential entries produce multiple audit records
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    Then 2 audit entries should be recorded
    And the chain should be intact

  Scenario: Deny and allow entries both contribute to chain integrity
    Given a user "alice" with permission "doc:read"
    And a user "bob" with no permissions
    When they attempt to "read" the "doc"
    Then the chain should be intact
