@PG-003-pipeline
Feature: Pipeline Page
  As a user
  I want to visualize pipeline execution progress
  So that I can track which phases have completed and which are active

  Background:
    Given the application shell is rendered
    And the current route is "#pipeline"

  # -- Route Guard -----------------------------------------------------------

  Scenario: Pipeline page redirects to home when no session is active
    Given STR-002-active-session-store sessionId is null
    When the user navigates to "#pipeline"
    Then the route changes to "#home"

  Scenario: Pipeline page renders when a session is active
    Given STR-002-active-session-store sessionId is "session-123"
    When the user navigates to "#pipeline"
    Then the pipeline page is rendered

  # -- Layout ----------------------------------------------------------------

  Scenario: Pipeline page renders as single-column layout
    Given STR-002-active-session-store sessionId is "session-123"
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Pipeline page has correct meta title
    Given STR-002-active-session-store sessionId is "session-123"
    Then the document title is "SpecForge — Pipeline"

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state shows prompt
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then the text "No active session selected." is displayed
    And a link to "#home" is visible

  Scenario: No-session state hides pipeline components
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then CMP-011-phase-indicator-strip is not visible

  # -- Idle State ------------------------------------------------------------

  Scenario: Idle state shows all pending phase nodes
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-005-pipeline-store phases is empty
    Then 6 phase nodes are rendered
    And all phase nodes are in the "pending" state
    And all phase nodes have gray styling

  Scenario: Idle state shows zero overall progress
    Given STR-005-pipeline-store phases is empty
    Then the overall progress bar shows 0%
    And the progress label displays "0/6"

  Scenario: Idle state shows informational message
    Given STR-005-pipeline-store phases is empty
    Then the text "No pipeline has been started for this session." is visible
    And the text "Start a conversation in Chat to begin discovery." is visible

  # -- Running State ---------------------------------------------------------

  Scenario: Running state highlights the active phase
    Given STR-005-pipeline-store has phases:
      | name           | status    |
      | Discovery      | completed |
      | Spec Authoring | completed |
      | Code Analysis  | active    |
      | Test Design    | pending   |
      | Validation     | pending   |
      | Review         | pending   |
    Then the "Discovery" node shows a green checkmark
    And the "Spec Authoring" node shows a green checkmark
    And the "Code Analysis" node shows an accent-colored circle with pulse animation
    And the "Test Design" node shows a gray circle
    And the "Validation" node shows a gray circle
    And the "Review" node shows a gray circle

  Scenario: Running state shows correct overall progress
    Given STR-005-pipeline-store has 2 completed phases out of 6
    Then the overall progress bar shows 33%
    And the progress label displays "2/6"

  Scenario: Connecting lines reflect phase statuses
    Given the "Discovery" phase is completed
    And the "Spec Authoring" phase is completed
    And the "Code Analysis" phase is active
    Then the line between "Discovery" and "Spec Authoring" is solid green
    And the line between "Spec Authoring" and "Code Analysis" has an animated flow effect
    And the line between "Code Analysis" and "Test Design" is gray

  Scenario: Active phase node has pulse animation
    Given the "Code Analysis" phase is active
    Then the "Code Analysis" node has an accent pulse animation

  # -- Completed State -------------------------------------------------------

  Scenario: Completed state shows all green nodes
    Given STR-005-pipeline-store isComplete is true
    And all 6 phases have status "completed"
    Then all 6 phase nodes show green circles with checkmarks
    And all connecting lines are solid green

  Scenario: Completed state shows 100% progress
    Given STR-005-pipeline-store isComplete is true
    Then the overall progress bar shows 100%
    And the progress label displays "6/6"

  Scenario: Completed state shows success message
    Given STR-005-pipeline-store isComplete is true
    Then the text "Pipeline completed successfully." is visible

  # -- Failed State ----------------------------------------------------------

  Scenario: Failed state shows red node for the failed phase
    Given STR-005-pipeline-store has phases:
      | name           | status    |
      | Discovery      | completed |
      | Spec Authoring | completed |
      | Code Analysis  | completed |
      | Test Design    | failed    |
      | Validation     | pending   |
      | Review         | pending   |
    Then the "Test Design" node shows a red circle with an X icon
    And the "Validation" node remains gray
    And the "Review" node remains gray

  Scenario: Failed state auto-opens detail panel for the failed phase
    Given the "Test Design" phase has status "failed"
    Then the detail panel opens automatically
    And the detail panel shows the phase name "Test Design"
    And the detail panel shows status "Failed"
    And the detail panel displays the error message

  Scenario: Failed state shows partial progress
    Given 3 phases are completed and 1 phase is failed
    Then the overall progress bar shows 50%
    And the progress label displays "3/6"

  # -- Phase Detail Panel ----------------------------------------------------

  Scenario: Clicking a phase node opens its detail panel
    Given STR-005-pipeline-store has phases with statuses
    When the user clicks the "Spec Authoring" phase node
    Then the detail panel opens below the strip
    And the panel shows phase name "Spec Authoring"
    And the panel shows the phase status

  Scenario: Detail panel shows iteration count for active phase
    Given the "Code Analysis" phase is active with iteration 2
    When the user clicks the "Code Analysis" phase node
    Then the detail panel shows "Iteration: 2"

  Scenario: Clicking a different phase switches the detail panel
    Given the detail panel shows "Discovery"
    When the user clicks the "Spec Authoring" phase node
    Then the detail panel now shows "Spec Authoring"

  Scenario: Clicking the same phase again closes the detail panel
    Given the detail panel shows "Discovery"
    When the user clicks the "Discovery" phase node again
    Then the detail panel closes

  # -- Phase Updates ---------------------------------------------------------

  Scenario: Phase nodes update when status changes
    Given the "Discovery" phase is active
    When EVT-004-session-status-changed is dispatched advancing to "Spec Authoring"
    Then the "Discovery" node transitions to completed (green checkmark)
    And the "Spec Authoring" node transitions to active (accent pulse)
    And the overall progress bar updates

  Scenario: Overall progress bar animates on update
    Given the overall progress bar shows 33%
    When a phase completes and progress changes to 50%
    Then the progress bar fill animates from 33% to 50%

  # -- Navigation ------------------------------------------------------------

  Scenario: Pipeline page is accessible from the nav rail
    Given STR-002-active-session-store sessionId is "session-123"
    When the user clicks the "Pipeline" button in the nav rail
    Then the route changes to "#pipeline"
    And the pipeline page is rendered

  # -- Phase Order -----------------------------------------------------------

  Scenario: Phases appear in correct order
    Given STR-005-pipeline-store has all 6 phases
    Then the phases appear left to right in order:
      | position | name           |
      | 1        | Discovery      |
      | 2        | Spec Authoring |
      | 3        | Code Analysis  |
      | 4        | Test Design    |
      | 5        | Validation     |
      | 6        | Review         |
