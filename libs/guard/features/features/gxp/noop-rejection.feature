@gxp @REQ-GUARD-011
Feature: GxP mode rejects NoopAuditTrail

  Scenario: GxP mode with NoopAuditTrail is rejected
    Given a guard system is initialized with GxP mode and NoopAuditTrail
    Then the system should reject the configuration with a GxP compliance error

  Scenario: Non-GxP mode with NoopAuditTrail is accepted
    Given a guard system is initialized without GxP mode and NoopAuditTrail
    Then the system should accept the configuration

  Scenario: GxP mode with real audit trail is accepted
    Given a GxP guard system is initialized with a real audit trail
    Then the system should accept the configuration
