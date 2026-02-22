@audit-trail @gxp @REQ-GUARD-006
Feature: GxP audit entry completeness monitoring

  Background:
    Given a GxP guard system is initialized

  Scenario: Completeness monitoring reports complete when all entries present
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    And completeness is checked
    Then completeness monitoring should report "complete"
    And completeness statistics should show 1 total entries

  Scenario: Completeness monitoring counts multiple entries
    Given a user "alice" with permission "doc:read"
    When they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    And they attempt to "read" the "doc"
    And completeness is checked
    Then completeness statistics should show 3 total entries

  Scenario: Completeness monitoring with deny entry counts correctly
    Given a user "bob" with no permissions
    When they attempt to "read" the "doc"
    And completeness is checked
    Then completeness monitoring should report "complete"
    And completeness statistics should show 1 total entries

  Scenario: Mixed allow and deny entries are all counted
    Given a user "alice" with permission "doc:read"
    And a user "bob" with no permissions
    When they attempt to "read" the "doc"
    And completeness is checked
    Then completeness statistics should show 1 total entries
