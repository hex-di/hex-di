@gxp @REQ-GUARD-012
Feature: Write-ahead log durability

  Scenario: Empty WAL returns no uncommitted entries
    Given a fresh WAL is initialized
    When WAL recovery is performed
    Then no entries should be recovered

  Scenario: Uncommitted entries are recovered after recovery
    Given a WAL is initialized with 3 appended but uncommitted entries
    When WAL recovery is performed
    Then 3 entries should be recovered

  Scenario: Committed entries are not returned by recovery
    Given a WAL is initialized with 1 committed and 1 uncommitted entry
    When WAL recovery is performed
    Then 1 entries should be recovered
    And the recovered entry should be the uncommitted one

  Scenario: Rolled back entry is not recovered
    Given a WAL is initialized with 1 appended entry
    When the WAL entry is rolled back
    And WAL recovery is performed
    Then no entries should be recovered

  Scenario: Single appended but uncommitted entry is recovered
    Given a WAL is initialized with 1 appended but uncommitted entries
    When WAL recovery is performed
    Then 1 entries should be recovered
