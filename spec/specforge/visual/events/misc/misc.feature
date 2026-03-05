@misc-events
Feature: Misc Events
  As an error management system
  I want to dispatch error-cleared events
  So that users can dismiss error banners independently of other actions

  Background:
    Given the store "chat-store" is initialized with defaults
    And the store "active-session-store" is initialized with defaults

  # -- EVT-024-error-cleared: chat source --

  Scenario: Clearing a chat error sets the chat store error to null
    Given event "EVT-010-chat-error" was dispatched with:
      | error               |
      | Rate limit exceeded |
    When event "EVT-024-error-cleared" is dispatched with:
      | source |
      | chat   |
    Then the state "error" in STR-004-chat-store equals null

  Scenario: Clearing a chat error does not affect processing state
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m1 | Test    | 2026-02-27T10:00:00Z |
    And event "EVT-010-chat-error" was dispatched with:
      | error          |
      | Server crashed |
    When event "EVT-024-error-cleared" is dispatched with:
      | source |
      | chat   |
    Then the state "error" in STR-004-chat-store equals null
    And the state "isProcessing" in STR-004-chat-store equals false

  Scenario: Clearing a chat error does not remove existing messages
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content  | timestamp            |
      | m1 | Hello    | 2026-02-27T10:00:00Z |
    And event "EVT-010-chat-error" was dispatched with:
      | error           |
      | Network timeout |
    When event "EVT-024-error-cleared" is dispatched with:
      | source |
      | chat   |
    Then the state "messages" in STR-004-chat-store has length 1

  Scenario: Clearing a chat error when no error exists is a no-op
    When event "EVT-024-error-cleared" is dispatched with:
      | source |
      | chat   |
    Then the state "error" in STR-004-chat-store equals null

  # -- EVT-024-error-cleared: session source --

  Scenario: Clearing a session error sets the session store error to null
    Given event "EVT-005-session-error" was dispatched with:
      | error                        |
      | Agent failed: rate limit hit |
    When event "EVT-024-error-cleared" is dispatched with:
      | source  |
      | session |
    Then the state "error" in STR-002-active-session-store equals null

  Scenario: Clearing a session error does not reset the session status
    Given event "EVT-003-session-created" was dispatched with:
      | session                                                                                                                                                              |
      | {"sessionId":"990e8400-e29b-41d4-a716-446655440000","packageName":"@app/api","specPath":"/specs/api.md","status":"active","createdAt":"2026-02-27T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-27T10:00:00Z"} |
    And event "EVT-005-session-error" was dispatched with:
      | error         |
      | Fatal failure |
    When event "EVT-024-error-cleared" is dispatched with:
      | source  |
      | session |
    Then the state "error" in STR-002-active-session-store equals null
    And the state "status" in STR-002-active-session-store equals "error"

  Scenario: Clearing a session error does not affect sessionId
    Given event "EVT-002-session-selected" was dispatched with:
      | sessionId                            |
      | aa0e8400-e29b-41d4-a716-446655440000 |
    And event "EVT-005-session-error" was dispatched with:
      | error       |
      | Crash       |
    When event "EVT-024-error-cleared" is dispatched with:
      | source  |
      | session |
    Then the state "sessionId" in STR-002-active-session-store equals "aa0e8400-e29b-41d4-a716-446655440000"

  Scenario: Clearing a session error when no error exists is a no-op
    When event "EVT-024-error-cleared" is dispatched with:
      | source  |
      | session |
    Then the state "error" in STR-002-active-session-store equals null

  # -- EVT-024-error-cleared: cross-store isolation --

  Scenario: Clearing chat error does not affect session error
    Given event "EVT-010-chat-error" was dispatched with:
      | error           |
      | Chat failure    |
    And event "EVT-005-session-error" was dispatched with:
      | error            |
      | Session failure  |
    When event "EVT-024-error-cleared" is dispatched with:
      | source |
      | chat   |
    Then the state "error" in STR-004-chat-store equals null
    And the state "error" in STR-002-active-session-store equals "Session failure"

  Scenario: Clearing session error does not affect chat error
    Given event "EVT-010-chat-error" was dispatched with:
      | error           |
      | Chat failure    |
    And event "EVT-005-session-error" was dispatched with:
      | error            |
      | Session failure  |
    When event "EVT-024-error-cleared" is dispatched with:
      | source  |
      | session |
    Then the state "error" in STR-002-active-session-store equals null
    And the state "error" in STR-004-chat-store equals "Chat failure"
