@CMP-005-session-table
Feature: Session Table
  Displays all sessions in a tabular format with sorting, filtering,
  and row-level actions for selection, deletion, and resumption.

  Background:
    Given the home view is rendered
    And the session table is visible in the content area

  # -- Rendering --

  Scenario: Table renders column headers
    Then the table displays columns "Package", "Spec Path", "Status", "Mode", "Last Activity"

  Scenario: Table renders one row per session
    Given the sessions store contains 3 sessions
    Then the table displays 3 rows
    And each row contains the session's package name, spec path, status badge, mode, and last activity

  Scenario: Status column renders ELM-023 badge
    Given a session has status "active"
    Then the status cell renders an ELM-023-session-status-badge with value "active"

  Scenario: Last activity column shows relative time
    Given a session has lastActivityAt "2 minutes ago"
    Then the last activity cell displays "2 min ago"

  # -- Empty State --

  Scenario: Empty state when no sessions exist
    Given the sessions store contains 0 sessions
    Then the table body displays "No sessions found. Create one to get started."
    And the empty state text uses color "--sf-text-muted"
    And the empty state has vertical padding of 48px

  Scenario: Empty state after filtering removes all results
    Given the sessions store contains 3 sessions
    And the filter store home.status is set to "error"
    And no sessions match the filter
    Then the table body displays "No sessions found. Create one to get started."

  # -- Sorting --

  Scenario: Default sort is by last activity descending
    Given the sessions store contains sessions with varied lastActivityAt values
    Then the first row shows the session with the most recent lastActivityAt
    And rows are ordered by lastActivityAt descending

  Scenario: Sort by created date
    Given the filter store home.sort is set to "created"
    Then rows are ordered by createdAt descending

  Scenario: Sort by package name
    Given the filter store home.sort is set to "name"
    Then rows are ordered by packageName ascending alphabetically

  # -- Row Interactions --

  Scenario: Clicking a row selects the session
    When the user clicks on a session row
    Then the onSelectSession callback is invoked with the row's sessionId

  Scenario: Delete button invokes deletion callback
    When the user clicks the ELM-027-session-delete-button on a row
    Then the onDeleteSession callback is invoked with the row's sessionId

  Scenario: Resume button invokes resume callback
    Given a session has status "idle"
    When the user clicks the ELM-028-session-resume-button on that row
    Then the onResumeSession callback is invoked with the row's sessionId

  Scenario: Resume button hidden for completed sessions
    Given a session has status "completed"
    Then the ELM-028-session-resume-button is not visible on that row

  # -- Filtering --

  Scenario: Filtering by status narrows displayed rows
    Given the sessions store contains 5 sessions with mixed statuses
    When the filter store home.status is set to "active"
    Then only sessions with status "active" are displayed

  Scenario: Filtering by pipeline mode narrows displayed rows
    Given the sessions store contains sessions with mixed pipeline modes
    When the filter store home.pipelineMode is set to "discovery"
    Then only sessions with pipelineMode "discovery" are displayed

  Scenario: Search filter matches package name and spec path
    Given the sessions store contains sessions
    When the filter store home.search is set to "auth"
    Then only sessions whose packageName or specPath contains "auth" are displayed

  # -- Accessibility --

  Scenario: Table has correct ARIA role
    Then the table element has role "table"
    And the table has aria-label "Sessions"
