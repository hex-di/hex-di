@admin @break-glass @REQ-GUARD-009
Feature: Break-glass access

  Background:
    Given a GxP guard system is initialized

  Scenario: Policy change is recorded with a reason for break-glass
    Given a user "admin-1" with permission "admin:bypass"
    When a policy change is recorded with reason "Break-glass: emergency production access"
    Then a policy change audit entry should be recorded

  Scenario: Policy change from restricted to permissive is audited
    Given a user "admin-1" with permission "admin:bypass"
    When a policy change is recorded from "deny-external" to "allow-all"
    Then a policy change audit entry should be recorded

  Scenario: Normal user access is denied for restricted resource
    Given a user "alice" with permission "doc:read"
    When they attempt to "access" the "restricted-resource"
    Then access should be denied

  Scenario: Admin with bypass permission can access resources
    Given a user "admin-1" with permission "admin:bypass"
    When they attempt to "bypass" the "admin"
    Then access should be granted
    And an audit entry should be recorded
