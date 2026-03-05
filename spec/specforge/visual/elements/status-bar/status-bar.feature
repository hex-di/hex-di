@ELM-status-bar
Feature: Status Bar Elements
  Status dot, session ID, session status, and cost display in the bottom bar.

  Background:
    Given the application shell is rendered
    And the status bar is visible at the bottom of the viewport

  # ── ELM-005 Status Dot ──

  Scenario: Status dot shows green when a session is active
    Given an active session exists in STR-002
    Then the status dot background is "--sf-accent"

  Scenario: Status dot shows muted when no session is active
    Given no active session exists in STR-002
    Then the status dot background is "--sf-text-muted"

  Scenario: Status dot is a 6px circle
    Then the status dot has width 6px and height 6px
    And the status dot has border-radius 50%

  # ── ELM-006 Session ID Text ──

  Scenario: Session ID displays the active session identifier
    Given the active session ID is "sess_abc123def4"
    Then the session ID text displays "sess_abc123def4"
    And the session ID text color is "--sf-text-muted"

  Scenario: Session ID displays "none" when no session exists
    Given no active session exists in STR-002
    Then the session ID text displays "none"

  Scenario: Session ID truncates with ellipsis when too long
    Given the active session ID is "sess_very_long_identifier_that_exceeds_available_space"
    Then the session ID text is truncated with an ellipsis

  # ── ELM-007 Session Status Text ──

  Scenario Outline: Session status text color matches status
    Given the active session status is "<status>"
    Then the session status text displays "<status>"
    And the session status text color is "<color>"

    Examples:
      | status    | color            |
      | idle      | --sf-text-muted  |
      | running   | --sf-accent      |
      | paused    | --sf-warning     |
      | completed | --sf-success     |
      | failed    | --sf-error       |

  Scenario: Session status defaults to "idle" when no session exists
    Given no active session exists in STR-002
    Then the session status text displays "idle"

  # ── ELM-008 Cost Text ──

  Scenario: Cost text displays formatted total cost
    Given the STR-010 summary totalCost is 2.47
    Then the cost text displays "$2.47"

  Scenario: Cost text displays zero when no cost accrued
    Given the STR-010 summary totalCost is 0
    Then the cost text displays "$0.00"

  Scenario: Cost text uses muted color
    Then the cost text color is "--sf-text-muted"
