@STR-002-active-session-store
Feature: Active Session Store
  As a view consumer
  I want reliable active session state management
  So that the UI reflects the currently selected session

  Background:
    Given the store "active-session-store" is initialized with defaults

  # ── Session selection ─────────────────────────────────────

  Scenario: Select an existing session
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            | status | pipelineMode |
      | 550e8400-e29b-41d4-a716-446655440000 | active | discovery    |
    Then the state "sessionId" equals "550e8400-e29b-41d4-a716-446655440000"
    And the state "status" equals "active"
    And the state "pipelineMode" equals "discovery"
    And the state "error" equals null

  Scenario: Selecting a session clears previous error
    Given event "EVT-005-session-error" was dispatched with:
      | error              |
      | Connection timeout |
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            | status | pipelineMode |
      | 550e8400-e29b-41d4-a716-446655440000 | active | spec         |
    Then the state "error" equals null
    And the state "status" equals "active"

  # ── Session creation ──────────────────────────────────────

  Scenario: Create a new session
    When event "EVT-003-session-created" is dispatched with:
      | sessionId                            | pipelineMode   |
      | 660e8400-e29b-41d4-a716-446655440000 | implementation |
    Then the state "sessionId" equals "660e8400-e29b-41d4-a716-446655440000"
    And the state "status" equals "active"
    And the state "pipelineMode" equals "implementation"
    And the state "error" equals null

  # ── Status transitions ────────────────────────────────────

  Scenario: Session status changes during pipeline execution
    Given event "EVT-003-session-created" was dispatched with:
      | sessionId                            | pipelineMode |
      | 770e8400-e29b-41d4-a716-446655440000 | discovery    |
    When event "EVT-004-session-status-changed" is dispatched with:
      | status          |
      | spec-generation |
    Then the state "status" equals "spec-generation"
    And the state "sessionId" equals "770e8400-e29b-41d4-a716-446655440000"

  Scenario: Session reaches completed status
    Given event "EVT-003-session-created" was dispatched with:
      | sessionId                            | pipelineMode   |
      | 880e8400-e29b-41d4-a716-446655440000 | implementation |
    When event "EVT-004-session-status-changed" is dispatched with:
      | status    |
      | completed |
    Then the state "status" equals "completed"

  # ── Error handling ────────────────────────────────────────

  Scenario: Session error sets status and error message
    Given event "EVT-003-session-created" was dispatched with:
      | sessionId                            | pipelineMode |
      | 990e8400-e29b-41d4-a716-446655440000 | discovery    |
    When event "EVT-005-session-error" is dispatched with:
      | error                        |
      | Agent failed: rate limit hit |
    Then the state "status" equals "error"
    And the state "error" equals "Agent failed: rate limit hit"

  # ── Selectors ─────────────────────────────────────────────

  Scenario: isSessionActive returns false in idle state
    Then selector "isSessionActive" returns false

  Scenario: isSessionActive returns true when session is active
    Given event "EVT-003-session-created" was dispatched with:
      | sessionId                            | pipelineMode |
      | aa0e8400-e29b-41d4-a716-446655440000 | discovery    |
    Then selector "isSessionActive" returns true

  Scenario: isSessionActive returns false when session has error
    Given event "EVT-003-session-created" was dispatched with:
      | sessionId                            | pipelineMode |
      | bb0e8400-e29b-41d4-a716-446655440000 | discovery    |
    And event "EVT-005-session-error" was dispatched with:
      | error       |
      | Fatal crash |
    Then selector "isSessionActive" returns false

  Scenario: hasError returns false when no error
    Then selector "hasError" returns false

  Scenario: hasError returns true after session error
    Given event "EVT-005-session-error" was dispatched with:
      | error          |
      | Token exceeded |
    Then selector "hasError" returns true
