@ACT-session
Feature: Session Actions
  Session selection, creation, resume, deselection, and deletion.

  Background:
    Given the application shell is rendered
    And the home view is active with the session table visible

  # -- ACT-006 Select Session --

  Scenario: Clicking a session row selects the session and navigates to chat
    Given the session table contains a session with id "sess_abc123"
    When the user clicks the session row for "sess_abc123" (ELM-022)
    Then the action ACT-006-select-session is triggered
    And the event EVT-002-session-selected is dispatched with payload { sessionId: "sess_abc123" }
    And the STR-002-active-session-store activeSession is set to the session
    And the application navigates to the "chat" view

  Scenario: Selecting a session updates the status bar
    When the user clicks a session row with status "running"
    Then the status dot (ELM-005) changes to the "connected" state
    And the session ID text (ELM-006) displays the selected session ID
    And the session status text (ELM-007) displays "running"

  Scenario: Selecting a different session replaces the active session
    Given session "sess_abc123" is currently active
    And the user navigates back to the home view
    When the user clicks the session row for "sess_def456"
    Then the STR-002-active-session-store activeSession changes to "sess_def456"
    And the application navigates to the "chat" view

  # -- ACT-007 Deselect Session --

  Scenario: Deselecting a session clears active state and navigates to home
    Given session "sess_abc123" is the active session
    When ACT-007-deselect-session is triggered programmatically
    Then the event EVT-002-session-selected is dispatched with payload { sessionId: null }
    And the STR-002-active-session-store activeSession is set to null
    And the application navigates to the "home" view

  Scenario: Status bar shows idle state after deselection
    Given session "sess_abc123" is the active session
    When ACT-007-deselect-session is triggered
    Then the status dot (ELM-005) changes to the "idle" state
    And the session ID text (ELM-006) displays "none"

  # -- ACT-008 Create Session --

  Scenario: Submitting a valid form creates a new session
    Given the user has entered "my-package" in the package name input (ELM-024)
    And the user has entered "spec/feature.md" in the spec path input (ELM-025)
    When the user clicks the submit button (ELM-026)
    Then the action ACT-008-create-session is triggered
    And the event EVT-003-session-created is dispatched
    And the new session is appended to STR-003-sessions-store
    And the form fields are cleared
    And the new session is automatically selected

  Scenario: Submit button is disabled when package name is empty
    Given the package name input is empty
    And the spec path input contains "spec/feature.md"
    Then the submit button (ELM-026) is in the disabled state
    And clicking the submit button does not trigger ACT-008-create-session

  Scenario: Submit button is disabled when spec path is empty
    Given the package name input contains "my-package"
    And the spec path input is empty
    Then the submit button (ELM-026) is in the disabled state

  Scenario: Submit button is enabled when both fields are non-empty
    Given the user has entered "my-package" in the package name input
    And the user has entered "spec/feature.md" in the spec path input
    Then the submit button (ELM-026) is in the default state
    And the submit button is clickable

  # -- ACT-009 Resume Session --

  Scenario: Clicking resume on a paused session changes its status to running
    Given the session table contains a session with status "paused"
    And the resume button (ELM-028) is visible for that session
    When the user clicks the resume button
    Then the action ACT-009-resume-session is triggered
    And the event EVT-004-session-status-changed is dispatched with payload { status: "running" }
    And the session status badge (ELM-023) updates to "running"
    And the resume button hides

  Scenario: Resume button is only visible for paused sessions
    Given the session table contains sessions with statuses "running", "paused", "completed"
    Then the resume button (ELM-028) is visible only for the "paused" session
    And the resume button is hidden for "running" and "completed" sessions

  # -- ACT-010 Delete Session --

  Scenario: Clicking delete shows a confirmation dialog
    Given the session table contains a session with id "sess_abc123"
    When the user clicks the delete button (ELM-027) for "sess_abc123"
    Then a confirmation dialog appears with the message "Are you sure you want to delete this session? This action cannot be undone."

  Scenario: Confirming deletion removes the session
    Given the confirmation dialog is showing for session "sess_abc123"
    When the user confirms the deletion
    Then the action ACT-010-delete-session is triggered
    And the event EVT-007-session-deleted is dispatched with payload { sessionId: "sess_abc123" }
    And the session is removed from STR-003-sessions-store
    And the session row disappears from the table

  Scenario: Canceling deletion preserves the session
    Given the confirmation dialog is showing for session "sess_abc123"
    When the user cancels the deletion
    Then no EVT-007-session-deleted event is dispatched
    And the session remains in the table

  Scenario: Deleting the active session triggers deselection
    Given session "sess_abc123" is the active session
    When the user deletes session "sess_abc123" and confirms
    Then the event EVT-007-session-deleted is dispatched
    And ACT-007-deselect-session is triggered
    And the application navigates to the "home" view
    And the status bar shows idle state
