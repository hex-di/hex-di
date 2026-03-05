@WF-005
Feature: Monitor Pipeline
  As a user
  I want to monitor pipeline phase progression and inspect detail views
  So that I can track the status of my session and understand what agents are producing

  Background:
    Given the app shell (PG-010) is rendered
    And an active session exists with pipeline mode "discovery"
    And the pipeline store has phases:
      | name             | status  |
      | discovery        | active  |
      | spec-generation  | pending |
      | implementation   | pending |
    And the current phase index is 0

  # --- Pipeline View Rendering ---

  Scenario: Pipeline view shows all phases
    When the user navigates to the Pipeline view (PG-003)
    Then the phase indicator strip (CMP-011) renders 3 phases
    And the phases are displayed in order: discovery, spec-generation, implementation

  Scenario: Active phase displays with cyan pulse
    When the Pipeline view renders
    Then the "discovery" phase shows with text color "#00F0FF"
    And the "discovery" phase has a background "rgba(0, 240, 255, 0.15)"
    And the "discovery" phase has a pulse glow animation
    And the "discovery" phase icon is a filled circle

  Scenario: Pending phases display with muted text
    When the Pipeline view renders
    Then the "spec-generation" phase shows with text color "#586E85"
    And the "spec-generation" phase has no animation
    And the "spec-generation" phase icon is a circle outline
    And the "implementation" phase shows with text color "#586E85"

  Scenario: Progress selector reports correct value
    Given 0 of 3 phases are completed
    When the progress selector is evaluated
    Then the progress is 0
    And isComplete is false

  # --- Phase Progression ---

  Scenario: Discovery phase completes and spec-generation activates
    Given the "discovery" phase is active
    When EVT-004-session-status-changed is dispatched with status "spec-generation"
    Then the pipeline store rebuilds phases:
      | name             | status    |
      | discovery        | completed |
      | spec-generation  | active    |
      | implementation   | pending   |
    And the current phase index is 1
    And the "discovery" phase shows green (#22C55E) with a checkmark icon
    And the "spec-generation" phase shows cyan (#00F0FF) with pulse animation

  Scenario: Spec-generation completes and implementation activates
    Given "discovery" is completed and "spec-generation" is active
    When EVT-004-session-status-changed is dispatched with status "implementation"
    Then the pipeline store rebuilds phases:
      | name             | status    |
      | discovery        | completed |
      | spec-generation  | completed |
      | implementation   | active    |
    And the current phase index is 2
    And both "discovery" and "spec-generation" show green with checkmarks

  Scenario: All phases complete
    Given "discovery" and "spec-generation" are completed and "implementation" is active
    When EVT-004-session-status-changed is dispatched with status "completed"
    Then the pipeline store rebuilds phases:
      | name             | status    |
      | discovery        | completed |
      | spec-generation  | completed |
      | implementation   | completed |
    And the current phase index is -1
    And the isComplete selector returns true
    And the progress selector returns 1.0
    And all three phases show green with checkmarks

  Scenario: Phase fails and pipeline halts
    Given the "spec-generation" phase is active
    When EVT-004-session-status-changed is dispatched with status "error"
    Then the pipeline store marks "spec-generation" as failed
    And the "spec-generation" phase shows red (#FF3B3B) with an error icon
    And the "implementation" phase remains pending
    And no phase is active (currentPhase is -1)
    And the pipeline is halted

  # --- Observation: ACP Session ---

  Scenario: User tabs to ACP Session to see agent messages
    Given the pipeline is running with "discovery" active
    And the ACP session store has 10 messages from the discovery phase
    When the user clicks the ACP Session nav item
    Then EVT-001-view-changed dispatches with viewId "acp-session"
    And PG-007-acp-session renders
    And the message entry list (CMP-016) shows messages

  Scenario: ACP session messages colored by severity
    Given the ACP Session view is displayed with messages:
      | agentRole | severity    | content                |
      | analyst   | critical    | Missing auth handler   |
      | writer    | observation | Noted 5 export types   |
      | reviewer  | major       | Circular dependency    |
    Then the "critical" message has color "#FF3B3B"
    And the "observation" message has color "#4FC3F7"
    And the "major" message has color "#FF8C00"

  Scenario: ACP session messages can be filtered by phase
    Given the ACP Session has messages from "discovery" and "spec-generation" phases
    When the user applies a phase filter for "discovery"
    Then only messages with phase "discovery" are displayed

  Scenario: ACP session messages can be filtered by agent role
    Given the ACP Session has messages from "analyst", "writer", and "reviewer"
    When the user applies an agentRole filter for "analyst"
    Then only messages from the analyst are displayed

  # --- Observation: Spec Viewer ---

  Scenario: User tabs to Spec Viewer to review content
    Given the pipeline is running
    And the spec content store has loaded markdown content
    When the user clicks the Spec nav item
    Then EVT-001-view-changed dispatches with viewId "spec"
    And PG-004-spec-viewer renders
    And the markdown section renderer (CMP-012) displays the spec content

  Scenario: Changed sections are highlighted
    Given the spec content store has changedSections ["section-3", "section-7"]
    When the Spec Viewer renders
    Then sections 3 and 7 have a visual highlight indicating recent changes
    And other sections render without the change indicator

  Scenario: Spec content updates in real-time
    Given the Spec Viewer is displayed
    When EVT-016-spec-content-updated fires with new content
    Then the spec content store updates
    And the markdown renderer re-renders with the new content

  # --- Observation: Task Board ---

  Scenario: User tabs to Task Board to check tasks
    Given the pipeline is running
    And the task board store has 4 task groups
    When the user clicks the Tasks nav item
    Then EVT-001-view-changed dispatches with viewId "tasks"
    And PG-005-task-board renders
    And the kanban board (CMP-013) shows task groups in status columns

  Scenario: Task groups display in kanban columns
    Given the task board has groups:
      | name           | status      | taskCount |
      | Auth Module    | completed   | 5         |
      | API Routes     | in-progress | 3         |
      | Error Handling | pending     | 4         |
      | DB Schema      | blocked     | 2         |
    When the kanban board renders
    Then the "Pending" column contains "Error Handling"
    And the "In Progress" column contains "API Routes"
    And the "Completed" column contains "Auth Module"
    And the "Blocked" column contains "DB Schema"

  Scenario: Task group status updates in real-time
    Given the Task Board is displayed
    And the "API Routes" group has status "in-progress"
    When EVT-022-task-group-status-changed fires for "API Routes" with status "completed"
    Then the "API Routes" group moves from "In Progress" to "Completed" column

  Scenario: DAG list shows task dependencies
    Given the user toggles the Task Board view mode to "dag"
    Then the DAG list (CMP-014) renders
    And it shows dependency relationships between task groups

  # --- Observation: Coverage Dashboard ---

  Scenario: User tabs to Coverage to check progress
    Given the pipeline is running
    And the coverage store has file data loaded
    When the user clicks the Coverage nav item
    Then EVT-001-view-changed dispatches with viewId "coverage"
    And PG-006-coverage-dashboard renders
    And the coverage file list (CMP-015) shows files with coverage data

  Scenario: Coverage displays file statuses
    Given the coverage store has files:
      | fileName        | coveragePercent | status           |
      | auth/index.ts   | 85              | covered          |
      | auth/handler.ts | 40              | implemented-only |
      | auth/types.ts   | 0               | gap              |
    When the coverage file list renders
    Then "auth/index.ts" shows 85% coverage with status "covered"
    And "auth/handler.ts" shows 40% coverage with status "implemented-only"
    And "auth/types.ts" shows 0% coverage with status "gap"

  Scenario: Overall coverage percentage computed
    Given the coverage store has files with coverage [85, 40, 0]
    When the overallCoverage selector is evaluated
    Then the overall coverage is approximately 41.7%

  Scenario: Gap count reflects gap files
    Given the coverage store has 1 file with status "gap"
    When the gapCount selector is evaluated
    Then the gap count is 1

  Scenario: Coverage updates in real-time
    Given the Coverage Dashboard is displayed
    When EVT-025-coverage-file-updated fires for "auth/types.ts" with coveragePercent 60 and status "implemented-only"
    Then the file list updates "auth/types.ts" to show 60% coverage

  # --- Observation Pattern: Full Cycle ---

  Scenario: User follows the tab-through observation pattern
    Given the pipeline "discovery" phase is active
    When the user checks the Pipeline view
    And the user navigates to ACP Session to read agent messages
    And the user navigates to Spec Viewer to review content
    And the user navigates to Tasks to check extracted tasks
    And the user navigates to Coverage to check progress
    And the user returns to Pipeline
    Then all views display data relevant to the active session
    And the Pipeline view shows current phase status

  Scenario: Observation cycle repeats across phases
    Given the user completed an observation cycle during "discovery"
    And "discovery" completes and "spec-generation" activates
    When the user returns to the Pipeline view
    Then "discovery" shows green with checkmark
    And "spec-generation" shows cyan with pulse
    And the user can repeat the observation cycle for the new phase

  # --- End-to-End Pipeline Monitoring ---

  Scenario: Complete pipeline monitoring from start to finish
    Given a session with 3 pipeline phases all starting as pending
    And "discovery" becomes active
    When the user monitors the Pipeline view
    And "discovery" completes, "spec-generation" activates
    And the user checks ACP Session during spec-generation
    And "spec-generation" completes, "implementation" activates
    And the user checks Tasks and Coverage during implementation
    And "implementation" completes
    Then the Pipeline view shows all 3 phases as completed (green)
    And isComplete is true
    And the session status is "completed"

  Scenario: Pipeline monitoring with phase failure
    Given a session with 3 pipeline phases
    And "discovery" is active
    When "discovery" completes and "spec-generation" activates
    And "spec-generation" fails
    Then the Pipeline view shows:
      | name             | status    | color   |
      | discovery        | completed | #22C55E |
      | spec-generation  | failed    | #FF3B3B |
      | implementation   | pending   | #586E85 |
    And the pipeline is halted
    And the user can see the failure in the ACP session messages
