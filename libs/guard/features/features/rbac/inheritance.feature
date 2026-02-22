@rbac @REQ-GUARD-003
Feature: Role inheritance

  Background:
    Given a guard system is initialized

  Scenario: Child role inherits permissions from parent role
    Given a user "alice" with role "editor"
    And the role "editor" inherits from "viewer"
    And the role "viewer" has permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted

  Scenario: Direct role permissions are checked first
    Given a user "bob" with role "admin"
    And the role "admin" has permission "admin:access"
    When they attempt to "access" the "admin"
    Then access should be granted

  Scenario: User with inherited permission from grandparent role is granted access
    Given a user "carol" with role "superadmin"
    And the role "superadmin" inherits from "admin"
    And the role "admin" has permission "admin:access"
    When they attempt to "access" the "admin"
    Then access should be granted

  Scenario: User without any inherited permission is denied
    Given a user "dave" with role "guest"
    And the role "editor" inherits from "viewer"
    And the role "viewer" has permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be denied
