@rbac @REQ-GUARD-002
Feature: Role-based access control

  Background:
    Given a guard system is initialized

  Scenario: User with matching role is granted access
    Given a user "alice" with role "editor"
    When they attempt access via hasRole "editor"
    Then access should be granted

  Scenario: User without matching role is denied access
    Given a user "bob" with role "viewer"
    When they attempt access via hasRole "editor"
    Then access should be denied

  Scenario: Role can carry permissions
    Given a user "carol" with role "editor"
    And the role "editor" has permission "doc:write"
    When they attempt to "write" the "doc"
    Then access should be granted

  Scenario: User with role not matching permission is denied
    Given a user "dave" with role "viewer"
    And the role "editor" has permission "doc:write"
    When they attempt to "write" the "doc"
    Then access should be denied
