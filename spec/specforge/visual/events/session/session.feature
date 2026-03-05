@session-events
Feature: Session Events
  As a session management system
  I want to dispatch session lifecycle events
  So that session state is consistent across all stores

  Background:
    Given the store "active-session-store" is initialized with defaults
    And the store "sessions-store" is initialized with defaults
    And the store "pipeline-store" is initialized with defaults

  # -- EVT-002-session-selected: store mutations --

  Scenario: Selecting a session updates active session store
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            |
      | 550e8400-e29b-41d4-a716-446655440000 |
    Then the state "sessionId" in STR-002-active-session-store equals "550e8400-e29b-41d4-a716-446655440000"
    And the state "error" in STR-002-active-session-store equals null

  Scenario: Selecting a session clears previous error
    Given event "EVT-005-session-error" was dispatched with:
      | error              |
      | Connection timeout |
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            |
      | 550e8400-e29b-41d4-a716-446655440000 |
    Then the state "error" in STR-002-active-session-store equals null

  Scenario: Deselecting a session sets sessionId to null
    Given event "EVT-002-session-selected" was dispatched with:
      | sessionId                            |
      | 550e8400-e29b-41d4-a716-446655440000 |
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId |
      | null      |
    Then the state "sessionId" in STR-002-active-session-store equals null

  # -- EVT-002-session-selected: side effects --

  Scenario: Selecting a session navigates to chat view
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            |
      | 550e8400-e29b-41d4-a716-446655440000 |
    Then a navigation side effect fires to view "chat"

  Scenario: Deselecting a session does not navigate
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId |
      | null      |
    Then no navigation side effect fires

  # -- EVT-003-session-created: store mutations --

  Scenario: Creating a session appends to sessions store
    When event "EVT-003-session-created" is dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"660e8400-e29b-41d4-a716-446655440000","packageName":"@app/auth","specPath":"/specs/auth.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    Then the state "sessions" in STR-003-sessions-store has length 1
    And the last session in STR-003-sessions-store has sessionId "660e8400-e29b-41d4-a716-446655440000"

  Scenario: Creating a session sets it as the active session
    When event "EVT-003-session-created" is dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"660e8400-e29b-41d4-a716-446655440000","packageName":"@app/auth","specPath":"/specs/auth.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    Then the state "sessionId" in STR-002-active-session-store equals "660e8400-e29b-41d4-a716-446655440000"
    And the state "status" in STR-002-active-session-store equals "active"
    And the state "pipelineMode" in STR-002-active-session-store equals "discovery"
    And the state "error" in STR-002-active-session-store equals null

  # -- EVT-004-session-status-changed: store mutations --

  Scenario: Status change updates active session store
    Given event "EVT-003-session-created" was dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"770e8400-e29b-41d4-a716-446655440000","packageName":"@app/core","specPath":"/specs/core.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    When event "EVT-004-session-status-changed" is dispatched with:
      | sessionId                            | status          | pipelineMode |
      | 770e8400-e29b-41d4-a716-446655440000 | spec-generation | discovery    |
    Then the state "status" in STR-002-active-session-store equals "spec-generation"

  Scenario: Status change updates pipeline store phases
    Given event "EVT-003-session-created" was dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"770e8400-e29b-41d4-a716-446655440000","packageName":"@app/core","specPath":"/specs/core.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    When event "EVT-004-session-status-changed" is dispatched with:
      | sessionId                            | status          | pipelineMode |
      | 770e8400-e29b-41d4-a716-446655440000 | spec-generation | discovery    |
    Then the state "phases" in STR-005-pipeline-store is rebuilt from status "spec-generation"
    And the state "currentPhase" in STR-005-pipeline-store points to the active phase

  Scenario: Session reaches completed status
    Given event "EVT-003-session-created" was dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"880e8400-e29b-41d4-a716-446655440000","packageName":"@app/ui","specPath":"/specs/ui.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"implementation","lastActivityAt":"2026-02-27T10:00:00Z"} |
    When event "EVT-004-session-status-changed" is dispatched with:
      | sessionId                            | status    | pipelineMode   |
      | 880e8400-e29b-41d4-a716-446655440000 | completed | implementation |
    Then the state "status" in STR-002-active-session-store equals "completed"

  # -- EVT-005-session-error: store mutations --

  Scenario: Session error sets error status and message
    Given event "EVT-003-session-created" was dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"990e8400-e29b-41d4-a716-446655440000","packageName":"@app/api","specPath":"/specs/api.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    When event "EVT-005-session-error" is dispatched with:
      | error                        |
      | Agent failed: rate limit hit |
    Then the state "status" in STR-002-active-session-store equals "error"
    And the state "error" in STR-002-active-session-store equals "Agent failed: rate limit hit"

  Scenario: Subsequent session selection clears the error
    Given event "EVT-005-session-error" was dispatched with:
      | error         |
      | Fatal failure |
    When event "EVT-002-session-selected" is dispatched with:
      | sessionId                            |
      | aa0e8400-e29b-41d4-a716-446655440000 |
    Then the state "error" in STR-002-active-session-store equals null

  # -- EVT-006-sessions-loaded: store mutations --

  Scenario: Sessions loaded replaces the sessions list
    When event "EVT-006-sessions-loaded" is dispatched with:
      | sessions                                                                                                                                                           |
      | [{"sessionId":"a1","packageName":"@app/a","specPath":"/a.md","status":"active","createdAt":"2026-02-27T09:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T09:30:00Z"},{"sessionId":"b2","packageName":"@app/b","specPath":"/b.md","status":"completed","createdAt":"2026-02-26T08:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-26T12:00:00Z"}] |
    Then the state "sessions" in STR-003-sessions-store has length 2
    And the state "isLoading" in STR-003-sessions-store equals false

  Scenario: Sessions loaded with empty array
    When event "EVT-006-sessions-loaded" is dispatched with:
      | sessions |
      | []       |
    Then the state "sessions" in STR-003-sessions-store has length 0
    And the state "isLoading" in STR-003-sessions-store equals false

  # -- EVT-007-session-deleted: store mutations --

  Scenario: Deleting a session removes it from the sessions list
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                                                                           |
      | [{"sessionId":"a1","packageName":"@app/a","specPath":"/a.md","status":"active","createdAt":"2026-02-27T09:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T09:30:00Z"},{"sessionId":"b2","packageName":"@app/b","specPath":"/b.md","status":"completed","createdAt":"2026-02-26T08:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-26T12:00:00Z"}] |
    When event "EVT-007-session-deleted" is dispatched with:
      | sessionId |
      | a1        |
    Then the state "sessions" in STR-003-sessions-store has length 1
    And the state "sessions" in STR-003-sessions-store does not contain sessionId "a1"

  Scenario: Deleting the active session resets active session store
    Given event "EVT-002-session-selected" was dispatched with:
      | sessionId |
      | a1        |
    When event "EVT-007-session-deleted" is dispatched with:
      | sessionId |
      | a1        |
    Then the state "sessionId" in STR-002-active-session-store equals null
    And the state "status" in STR-002-active-session-store equals "idle"
    And the state "pipelineMode" in STR-002-active-session-store equals null
    And the state "error" in STR-002-active-session-store equals null

  Scenario: Deleting a non-active session does not reset active session store
    Given event "EVT-002-session-selected" was dispatched with:
      | sessionId |
      | a1        |
    When event "EVT-007-session-deleted" is dispatched with:
      | sessionId |
      | b2        |
    Then the state "sessionId" in STR-002-active-session-store equals "a1"
