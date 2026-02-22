@async @REQ-GUARD-016
Feature: Asynchronous attribute evaluation

  Background:
    Given a guard system is initialized

  Scenario: User with sufficient permission is granted access synchronously
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    Then access should be granted

  Scenario: User without sufficient permission is denied synchronously
    Given a user "bob" with no permissions
    When they attempt to "read" the "doc"
    Then access should be denied

  Scenario: User with permission satisfies anyOf asynchronously
    Given a user "carol" with permission "doc:read"
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be granted

  Scenario: User without any matching permission is denied in anyOf
    Given a user "dave" with no permissions
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be denied

  Scenario: User with all permissions satisfies allOf
    Given a user "eve" with permission "doc:read"
    When they attempt to satisfy all of "doc:read"
    Then access should be granted

  Scenario: User missing a permission fails allOf
    Given a user "frank" with no permissions
    When they attempt to satisfy all of "doc:read"
    Then access should be denied
