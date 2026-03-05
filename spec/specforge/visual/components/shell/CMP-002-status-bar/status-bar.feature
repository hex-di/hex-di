@CMP-002-status-bar
Feature: Status Bar
  As a user
  I want a persistent bottom status bar
  So that I can see session state and running costs at a glance

  Background:
    Given the application shell is rendered
    And the status bar is visible at the bottom of the main content area

  # -- Layout ----------------------------------------------------------

  Scenario: Status bar has correct dimensions
    Then the status bar has height 32px
    And the status bar has grid-column 2

  Scenario: Status bar uses surface background with top border
    Then the status bar background is "--sf-surface"
    And the status bar has a top border of "1px solid rgba(0, 240, 255, 0.08)"

  Scenario: Status bar arranges children in a horizontal row
    Then the status bar uses flex-direction "row"
    And the status bar has align-items "center"
    And the status bar has gap 16px
    And the status bar has padding "0 16px"
    And the status bar has font-size 11px

  # -- Children --------------------------------------------------------

  Scenario: Status bar contains all four child elements
    Then the status bar contains one ELM-005-status-dot
    And the status bar contains one ELM-006-session-id-text
    And the status bar contains one ELM-007-session-status-text
    And the status bar contains one ELM-008-cost-text

  # -- Session Connected -----------------------------------------------

  Scenario: Status bar displays connected session info
    Given the active session store (STR-002) has:
      | sessionId          | status  |
      | sess_abc123def4    | running |
    And the cost tracker store (STR-010) summary totalCost is 2.47
    Then the status dot shows the "connected" state with background "--sf-accent"
    And the session ID text displays "sess_abc123def4"
    And the session status text displays "running" with color "--sf-accent"
    And the cost text displays "$2.47"

  # -- No Session (Idle) -----------------------------------------------

  Scenario: Status bar displays idle state when no session exists
    Given the active session store (STR-002) has:
      | sessionId | status |
      | null      | idle   |
    And the cost tracker store (STR-010) summary totalCost is 0
    Then the status dot shows the "idle" state with background "--sf-text-muted"
    And the session ID text displays "none"
    And the session status text displays "idle" with color "--sf-text-muted"
    And the cost text displays "$0.00"

  # -- Session Status Colors -------------------------------------------

  Scenario Outline: Status text color changes with session status
    Given the active session store (STR-002) status is "<status>"
    Then the session status text displays "<status>" with color "<color>"

    Examples:
      | status    | color           |
      | idle      | --sf-text-muted |
      | running   | --sf-accent     |
      | paused    | --sf-warning    |
      | completed | --sf-success    |
      | failed    | --sf-error      |

  # -- Cost Updates ----------------------------------------------------

  Scenario: Cost text updates when the cost tracker store changes
    Given the cost tracker store (STR-010) summary totalCost is 1.50
    When the cost tracker store summary totalCost changes to 3.25
    Then the cost text displays "$3.25"

  # -- Store Bindings --------------------------------------------------

  Scenario: Status bar reads session data from STR-002
    Given the active session store (STR-002) has:
      | sessionId        | status    |
      | sess_xyz789      | paused    |
    Then the session ID text displays "sess_xyz789"
    And the session status text displays "paused"

  Scenario: Status bar reads cost data from STR-010
    Given the cost tracker store (STR-010) summary totalCost is 14.99
    Then the cost text displays "$14.99"

  # -- Responsive Visibility ------------------------------------------

  Scenario: Status bar is visible on all screen sizes
    Given the viewport width is 375px
    Then the status bar is visible
