@admin @REQ-GUARD-010
Feature: Policy change audit trail

  Background:
    Given a GxP guard system is initialized

  Scenario: Policy change is recorded in audit trail
    Given a user "admin-1" with permission "policy:manage"
    When a policy change is recorded from "allow-all" to "deny-external"
    Then a policy change audit entry should be recorded

  Scenario: Policy change can include a reason
    Given a user "admin-1" with permission "policy:manage"
    When a policy change is recorded with reason "Regulatory update Q1"
    Then a policy change audit entry should be recorded

  Scenario: Policy change from permissive to restrictive is recorded
    Given a user "admin-1" with permission "policy:manage"
    When a policy change is recorded from "allow-all" to "deny-all"
    Then a policy change audit entry should be recorded

  Scenario: Policy change with security reason is recorded
    Given a user "admin-1" with permission "policy:manage"
    When a policy change is recorded with reason "Security incident response"
    Then a policy change audit entry should be recorded
