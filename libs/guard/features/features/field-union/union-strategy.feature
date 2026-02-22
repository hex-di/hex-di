@field-union @REQ-GUARD-017
Feature: Field-level access control strategies

  Background:
    Given a guard system is initialized

  Scenario: User with all required permissions satisfies allOf
    Given a user "alice" with permission "doc:read"
    When they attempt to satisfy all of "doc:read"
    Then access should be granted

  Scenario: User missing a required permission fails allOf
    Given a user "bob" with no permissions
    When they attempt to satisfy all of "doc:read"
    Then access should be denied

  Scenario: User with any matching permission satisfies anyOf
    Given a user "carol" with permission "doc:read"
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be granted

  Scenario: User with no matching permission fails anyOf
    Given a user "dave" with no permissions
    When they attempt to satisfy any of "doc:read,user:read"
    Then access should be denied

  Scenario: allOf with single permission matches exactly
    Given a user "eve" with permission "user:read"
    When they attempt to satisfy all of "user:read"
    Then access should be granted

  Scenario: anyOf with single permission matches exactly
    Given a user "frank" with permission "user:read"
    When they attempt to satisfy any of "user:read"
    Then access should be granted
