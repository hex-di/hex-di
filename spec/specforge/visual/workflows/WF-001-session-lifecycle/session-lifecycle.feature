@WF-001
Feature: Session Lifecycle
  As a user
  I want to create, manage, and monitor sessions through their full lifecycle
  So that I can drive spec generation from discovery through completion

  Background:
    Given the app shell (PG-010) is rendered
    And the router store has currentView "home"
    And the sessions store is initialized with defaults
    And the active session store has no active session

  # --- Landing to Home ---

  Scenario: User arrives at landing page and navigates to app
    Given the user is on the landing page (PG-011)
    When the user clicks "Get Started"
    Then the app shell (PG-010) renders
    And the Home view (PG-001) is displayed as default content

  Scenario: Home view shows empty state when no sessions exist
    Given the sessions store has 0 sessions
    When the Home view (PG-001) renders
    Then a welcome message is displayed
    And the new session form (CMP-006) is prominently shown
    And the session table (CMP-005) shows no rows

  Scenario: Home view shows populated state when sessions exist
    Given the sessions store has loaded 3 sessions via EVT-006
    When the Home view (PG-001) renders
    Then the filter bar (CMP-004) is visible with status, pipeline mode, search, and sort controls
    And the session table (CMP-005) shows 3 rows
    And each row displays package name, spec path, pipeline mode, status, and timestamp

  # --- Session Creation ---

  Scenario: User creates a new session
    Given the Home view (PG-001) is displayed
    When the user fills the new session form with:
      | packageName | specPath                | pipelineMode |
      | my-lib      | spec/libs/my-lib/spec.md| discovery    |
    And the user submits the form
    Then action ACT-008 (create session) fires
    And event EVT-003-session-created is dispatched
    And the sessions store appends the new session
    And the active session store sets the new session as active
    And the session table shows the new row with status "active"

  Scenario: New session row appears with visual highlight
    Given a session was just created via EVT-003
    When the session table re-renders
    Then the new row has a brief accent glow animation
    And the row shows the correct package name and pipeline mode badge

  # --- Session Selection ---

  Scenario: User selects an active session
    Given the session table contains a session with status "active"
    When the user clicks that session row
    Then action ACT-006 (select session) fires
    And event EVT-002-session-selected is dispatched with the session's ID, status, and pipeline mode
    And the active session store updates with the selected session
    And the router navigates to the Chat view (PG-002)

  Scenario: User selects a completed session
    Given the session table contains a session with status "completed"
    When the user clicks that session row
    Then event EVT-002-session-selected is dispatched
    And the active session store updates with the selected session
    And the router navigates to the Spec Viewer (PG-004) or Pipeline (PG-003)

  Scenario: User selects a session in error state
    Given the session table contains a session with status "error"
    When the user clicks that session row
    Then event EVT-002-session-selected is dispatched
    And the active session store updates with the session data including the error
    And the router navigates to the Chat view (PG-002) with error context visible

  # --- Navigation to Chat ---

  Scenario: App navigates to Chat after session selection
    Given a session has been selected via EVT-002
    When EVT-001-view-changed is dispatched with viewId "chat"
    Then the router store sets currentView to "chat"
    And the nav rail highlights the Chat icon
    And PG-002-chat renders in the main content area
    And the chat messages for the selected session are loaded

  # --- Discovery and Pipeline Progression ---

  Scenario: Discovery starts and session status advances
    Given the user is on the Chat view (PG-002) with an active session
    When the user sends a message to start discovery
    Then EVT-004-session-status-changed fires with status "discovery"
    And the active session store updates status to "discovery"
    And the pipeline store rebuilds phases with "discovery" as active

  Scenario: Pipeline phase progresses from discovery to spec-generation
    Given the session status is "discovery"
    When the discovery phase completes
    Then EVT-004-session-status-changed fires with status "spec-generation"
    And the pipeline store marks "discovery" as completed
    And the pipeline store marks "spec-generation" as active
    And the active session store updates status to "spec-generation"

  Scenario: Pipeline completes all phases
    Given the session has been through discovery, spec-generation, and implementation
    When the final phase completes
    Then EVT-004-session-status-changed fires with status "completed"
    And the pipeline store marks all phases as completed
    And the active session store updates status to "completed"

  # --- Error Handling ---

  Scenario: Session encounters an error during processing
    Given the session status is "discovery"
    When the agent encounters a processing error
    Then EVT-005-session-error is dispatched with the error message
    And the active session store sets status to "error"
    And the active session store populates the error field
    And the Chat view shows the error details to the user

  # --- Session Resumption ---

  Scenario: User resumes a paused session
    Given the session table contains a session with status "idle"
    When the user clicks the session row
    And the user triggers the resume action
    Then ACT-009 (resume session) fires
    And the session status transitions from "idle" to "active"
    And the user is navigated to the Chat view

  # --- Session Deletion ---

  Scenario: User deletes a session
    Given the session table contains 3 sessions
    When the user triggers delete on one session
    Then ACT-010 (delete session) fires
    And EVT-007-session-deleted is dispatched
    And the sessions store removes the session from its list
    And the session table shows 2 rows
    And if the deleted session was active, the active session store clears

  # --- Cross-Page Observation ---

  Scenario: User navigates to Pipeline view to monitor progress
    Given the active session is in "spec-generation" status
    When the user clicks the Pipeline nav item
    Then EVT-001-view-changed dispatches with viewId "pipeline"
    And PG-003-pipeline renders with the phase indicator strip
    And the "discovery" phase shows as completed (green)
    And the "spec-generation" phase shows as active (cyan pulse)
    And remaining phases show as pending (muted)

  Scenario: User checks Spec Viewer during pipeline execution
    Given the active session is in "spec-generation" status
    When the user navigates to PG-004-spec-viewer
    Then the spec content loads from STR-006
    And changed sections are highlighted

  Scenario: User checks Task Board during pipeline execution
    Given the active session has task groups loaded
    When the user navigates to PG-005-task-board
    Then the kanban board (CMP-013) renders with task groups sorted by status
    And the DAG list (CMP-014) shows dependency relationships

  Scenario: User checks Coverage Dashboard
    Given the active session has coverage data loaded
    When the user navigates to PG-006-coverage-dashboard
    Then the coverage file list (CMP-015) shows file coverage status
    And the overall coverage percentage is computed from STR-008

  Scenario: User checks ACP Session for agent messages
    Given the active session has ACP session messages
    When the user navigates to PG-007-acp-session
    Then the message entry list (CMP-016) shows messages grouped by phase
    And messages are colored by severity (critical red, major orange, minor yellow, observation blue)

  Scenario: User checks Cost Tracker
    Given the active session has cost data loaded
    When the user navigates to PG-008-cost-tracker
    Then cost summary cards (CMP-017) show total cost and token usage
    And the budget gauge reflects the current budget zone

  Scenario: User checks Graph Explorer
    Given the active session has graph data loaded
    When the user navigates to PG-009-graph-explorer
    Then the graph node list (CMP-020) and edge list (CMP-021) render
    And the connection status banner (CMP-022) shows connected status

  # --- Return to Home ---

  Scenario: User returns to Home after session completes
    Given the active session has status "completed"
    When the user clicks the Home nav item
    Then EVT-001-view-changed dispatches with viewId "home"
    And the session table shows the session with status "completed"
    And the user can select another session or create a new one

  # --- Full End-to-End Journey ---

  Scenario: Complete session lifecycle from creation to completion
    Given the user is on the Home view with no sessions
    When the user creates a session with package "auth-lib" and mode "discovery"
    And the session appears in the table
    And the user selects the new session
    And the app navigates to the Chat view
    And the user completes the discovery conversation
    And the pipeline progresses through all phases
    Then the session status becomes "completed"
    And the Home view reflects the completed status
    And all detail views (spec, tasks, coverage, ACP session, costs, graph) contain session data
