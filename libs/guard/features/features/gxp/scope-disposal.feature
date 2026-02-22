@gxp @REQ-GUARD-013
Feature: Scope disposal chain verification

  Scenario: All registered scopes disposed gives complete chain
    Given a disposal verifier is initialized
    And scope "scope-a" is registered
    And scope "scope-b" is registered
    When scope "scope-a" is disposed
    And scope "scope-b" is disposed
    Then the disposal chain should be complete

  Scenario: Undisposed scope is reported
    Given a disposal verifier is initialized
    And scope "scope-a" is registered
    And scope "scope-b" is registered
    When scope "scope-a" is disposed
    Then the disposal chain should report undisposed scope "scope-b"
    And 1 scopes should remain undisposed

  Scenario: No registered scopes gives complete chain
    Given a disposal verifier is initialized
    Then the disposal chain should be complete

  Scenario: Single registered and disposed scope gives complete chain
    Given a disposal verifier is initialized
    And scope "scope-a" is registered
    When scope "scope-a" is disposed
    Then the disposal chain should be complete

  Scenario: Single registered but undisposed scope is reported
    Given a disposal verifier is initialized
    And scope "scope-a" is registered
    Then the disposal chain should report undisposed scope "scope-a"
    And 1 scopes should remain undisposed
