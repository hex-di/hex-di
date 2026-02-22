@rbac @REQ-GUARD-001
Feature: Permission-based access control

  Background:
    Given a guard system is initialized

  Scenario: User with matching permission is granted access
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted

  Scenario: User without matching permission is denied access
    Given a user "bob" with no permissions
    When they attempt to "read" the "doc"
    Then access should be denied

  Scenario: User must satisfy all of allOf permissions
    Given a user "carol" with permission "doc:read"
    When they attempt to satisfy all of "doc:read,user:read"
    Then access should be denied

  Scenario: User satisfying all allOf permissions is granted access
    Given a user "dave" with permission "doc:read"
    When they attempt to satisfy all of "doc:read"
    Then access should be granted

  Scenario: User satisfying any of anyOf permissions is granted access
    Given a user "eve" with permission "doc:read"
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be granted

  Scenario: User with no matching anyOf permission is denied
    Given a user "frank" with no permissions
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be denied
