@e-signature @REQ-GUARD-007
Feature: Electronic signature capture

  Background:
    Given a guard system is initialized

  Scenario: Signature is captured with the correct meaning
    Given a user "alice" with permission "doc:approve"
    And the signature service is configured for signer "alice"
    When a signature is captured with meaning "approved"
    Then the signature should be valid
    And the signature should have signer "alice"

  Scenario: Multiple signatures can be captured
    Given a user "alice" with permission "doc:approve"
    And the signature service is configured for signer "alice"
    When a signature is captured with meaning "approved"
    And a signature is captured with meaning "reviewed"
    Then the captured signature count should be 2

  Scenario: Single signature produces one captured entry
    Given a user "bob" with permission "doc:review"
    And the signature service is configured for signer "bob"
    When a signature is captured with meaning "reviewed"
    Then the captured signature count should be 1

  Scenario: Signature captures the signer identity
    Given a user "carol" with permission "doc:approve"
    And the signature service is configured for signer "carol"
    When a signature is captured with meaning "finalized"
    Then the signature should have signer "carol"
