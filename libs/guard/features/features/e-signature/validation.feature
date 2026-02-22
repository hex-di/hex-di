@e-signature @REQ-GUARD-008
Feature: Electronic signature validation

  Background:
    Given a guard system is initialized

  Scenario: A captured signature is valid by default
    Given a user "alice" with permission "doc:approve"
    And the signature service is configured for signer "alice"
    When a signature is captured with meaning "approved"
    Then the signature should be valid

  Scenario: Signature includes signer identity
    Given a user "alice" with permission "doc:approve"
    And the signature service is configured for signer "reviewer-1"
    When a signature is captured with meaning "reviewed"
    Then the signature should have signer "reviewer-1"

  Scenario: Signature with meaning approved is valid
    Given a user "bob" with permission "doc:approve"
    And the signature service is configured for signer "bob"
    When a signature is captured with meaning "approved"
    Then the signature should be valid
    And the signature should have signer "bob"

  Scenario: Signature with meaning rejected is still captured and valid
    Given a user "carol" with permission "doc:review"
    And the signature service is configured for signer "carol"
    When a signature is captured with meaning "rejected"
    Then the signature should be valid
    And the signature should have signer "carol"
