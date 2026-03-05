@STR-009
Feature: ACP Session Store
  As a view consumer
  I want reliable state management for ACP session messages
  So that the UI reflects the current set of agent communications

  Background:
    Given the store "acp-session-store" is initialized with defaults
    And the initial messages list is empty

  # --- Receiving messages ---

  Scenario: Append a new message on session-message-received
    Given the messages list is empty
    When the event "EVT-014" is dispatched with payload:
      | messageId | agentRole    | content              | timestamp | messageType | severity | phase       |
      | msg-001   | architect    | Found circular dep   | 170000001 | finding     | critical | analysis    |
    Then the messages list contains 1 entry
    And the message with id "msg-001" has agentRole "architect"
    And the message with id "msg-001" has severity "critical"

  Scenario: Append multiple messages preserving order
    Given the messages list contains a message with id "msg-001"
    When the event "EVT-014" is dispatched with payload:
      | messageId | agentRole | content         | timestamp | messageType    | severity    | phase     |
      | msg-002   | reviewer  | Needs interface | 170000002 | clarification  | minor       | review    |
    Then the messages list contains 2 entries
    And message at index 0 has id "msg-001"
    And message at index 1 has id "msg-002"

  # --- Bulk loading ---

  Scenario: Replace all messages on session-messages-loaded
    Given the messages list contains 3 entries
    When the event "EVT-015" is dispatched with a payload of 5 messages
    Then the messages list contains exactly 5 entries
    And no messages from the previous state remain

  Scenario: Bulk load with empty payload clears messages
    Given the messages list contains 2 entries
    When the event "EVT-015" is dispatched with an empty messages array
    Then the messages list is empty

  # --- Dismissing messages ---

  Scenario: Remove a message on session-message-dismissed
    Given the messages list contains messages "msg-001", "msg-002", "msg-003"
    When the event "EVT-016" is dispatched with payload messageId "msg-002"
    Then the messages list contains 2 entries
    And no message with id "msg-002" exists in the list

  Scenario: Dismiss a non-existent message is a no-op
    Given the messages list contains messages "msg-001"
    When the event "EVT-016" is dispatched with payload messageId "msg-999"
    Then the messages list still contains 1 entry
    And the message with id "msg-001" remains

  # --- Selectors ---

  Scenario: Select messages by phase
    Given the messages list contains:
      | messageId | phase     |
      | msg-001   | analysis  |
      | msg-002   | review    |
      | msg-003   | analysis  |
    When the selector "messagesByPhase" is called with phase "analysis"
    Then the result contains 2 messages
    And the result contains messages "msg-001" and "msg-003"

  Scenario: Select messages by severity
    Given the messages list contains:
      | messageId | severity    |
      | msg-001   | critical    |
      | msg-002   | minor       |
      | msg-003   | critical    |
    When the selector "messagesBySeverity" is called with severity "critical"
    Then the result contains 2 messages

  Scenario: Critical count selector
    Given the messages list contains:
      | messageId | severity      |
      | msg-001   | critical      |
      | msg-002   | minor         |
      | msg-003   | observation   |
      | msg-004   | critical      |
    When the selector "criticalCount" is evaluated
    Then the result is 2

  Scenario: Critical count is zero when no critical messages exist
    Given the messages list contains:
      | messageId | severity      |
      | msg-001   | minor         |
      | msg-002   | observation   |
    When the selector "criticalCount" is evaluated
    Then the result is 0

  # --- Subscription tick passthrough ---

  Scenario: Subscription tick does not mutate message state
    Given the messages list contains 3 entries
    When the event "EVT-017" is dispatched
    Then the messages list still contains 3 entries
