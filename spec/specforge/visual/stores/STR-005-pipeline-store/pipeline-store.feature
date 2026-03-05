@STR-005-pipeline-store
Feature: Pipeline Store
  As a view consumer
  I want reliable pipeline phase tracking
  So that the phase indicator strip shows accurate progress

  Background:
    Given the store "pipeline-store" is initialized with defaults

  # ── Initial state ─────────────────────────────────────────

  Scenario: Initial state has empty phases and no active phase
    Then the state "phases" is an empty array
    And the state "currentPhase" equals -1

  # ── Phase derivation from session status ──────────────────

  Scenario: Discovery mode session enters discovery phase
    Given the active session has pipelineMode "discovery"
    When event "EVT-004-session-status-changed" is dispatched with:
      | status    |
      | discovery |
    Then the state "phases" has length 1
    And phase 0 has name "Discovery" and status "active"
    And the state "currentPhase" equals 0

  Scenario: Implementation mode session enters discovery phase
    Given the active session has pipelineMode "implementation"
    When event "EVT-004-session-status-changed" is dispatched with:
      | status    |
      | discovery |
    Then the state "phases" has length 3
    And phase 0 has name "Discovery" and status "active"
    And phase 1 has name "Spec Generation" and status "pending"
    And phase 2 has name "Implementation" and status "pending"
    And the state "currentPhase" equals 0

  Scenario: Implementation mode session enters spec-generation phase
    Given the active session has pipelineMode "implementation"
    When event "EVT-004-session-status-changed" is dispatched with:
      | status          |
      | spec-generation |
    Then phase 0 has name "Discovery" and status "completed"
    And phase 1 has name "Spec Generation" and status "active"
    And phase 2 has name "Implementation" and status "pending"
    And the state "currentPhase" equals 1

  Scenario: Implementation mode session enters implementation phase
    Given the active session has pipelineMode "implementation"
    When event "EVT-004-session-status-changed" is dispatched with:
      | status         |
      | implementation |
    Then phase 0 has name "Discovery" and status "completed"
    And phase 1 has name "Spec Generation" and status "completed"
    And phase 2 has name "Implementation" and status "active"
    And the state "currentPhase" equals 2

  Scenario: Session completes all phases
    Given the active session has pipelineMode "implementation"
    When event "EVT-004-session-status-changed" is dispatched with:
      | status    |
      | completed |
    Then phase 0 has name "Discovery" and status "completed"
    And phase 1 has name "Spec Generation" and status "completed"
    And phase 2 has name "Implementation" and status "completed"
    And the state "currentPhase" equals -1

  Scenario: Session error marks current phase as failed
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status          |
      | spec-generation |
    When event "EVT-004-session-status-changed" is dispatched with:
      | status |
      | error  |
    Then phase 0 has name "Discovery" and status "completed"
    And phase 1 has name "Spec Generation" and status "failed"
    And phase 2 has name "Implementation" and status "pending"

  # ── Selectors ─────────────────────────────────────────────

  Scenario: activePhase returns null when no phases exist
    Then selector "activePhase" returns null

  Scenario: activePhase returns the currently active phase
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status          |
      | spec-generation |
    Then selector "activePhase" returns a phase with name "Spec Generation"

  Scenario: completedCount returns zero initially
    Then selector "completedCount" returns 0

  Scenario: completedCount counts completed phases
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status         |
      | implementation |
    Then selector "completedCount" returns 2

  Scenario: progress returns zero when no phases exist
    Then selector "progress" returns 0

  Scenario: progress returns fraction of completed phases
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status          |
      | spec-generation |
    Then selector "progress" returns 0.333

  Scenario: isComplete returns false during execution
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status         |
      | implementation |
    Then selector "isComplete" returns false

  Scenario: isComplete returns true when all phases completed
    Given the active session has pipelineMode "implementation"
    And event "EVT-004-session-status-changed" was dispatched with:
      | status    |
      | completed |
    Then selector "isComplete" returns true
