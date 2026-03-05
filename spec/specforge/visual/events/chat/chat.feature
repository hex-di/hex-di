@chat-events
Feature: Chat Events
  As a chat system
  I want to dispatch message and status events
  So that the conversation UI stays consistent with backend state

  Background:
    Given the store "chat-store" is initialized with defaults

  # -- EVT-008-message-sent: store mutations --

  Scenario: Sending a message appends it to messages and starts processing
    When event "EVT-008-message-sent" is dispatched with:
      | id | content                    | timestamp                |
      | m1 | Describe the auth module   | 2026-02-27T10:00:00Z     |
    Then the state "messages" in STR-004-chat-store has length 1
    And the last message has role "user" and content "Describe the auth module"
    And the state "isProcessing" in STR-004-chat-store equals true
    And the state "error" in STR-004-chat-store equals null

  Scenario: Sending a message clears previous error
    Given event "EVT-010-chat-error" was dispatched with:
      | error           |
      | Network timeout |
    When event "EVT-008-message-sent" is dispatched with:
      | id | content | timestamp            |
      | m2 | Retry   | 2026-02-27T10:01:00Z |
    Then the state "error" in STR-004-chat-store equals null
    And the state "isProcessing" in STR-004-chat-store equals true

  # -- EVT-008-message-sent: side effects --

  Scenario: Sending a message triggers API call to DiscoveryOrchestrator
    When event "EVT-008-message-sent" is dispatched with:
      | id | content       | timestamp            |
      | m3 | Analyze flows | 2026-02-27T10:02:00Z |
    Then an api-call side effect fires to the DiscoveryOrchestrator endpoint

  # -- EVT-009-message-received: store mutations --

  Scenario: Receiving a message appends it and stops processing
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m1 | Hello   | 2026-02-27T10:00:00Z |
    When event "EVT-009-message-received" is dispatched with:
      | id | content    | timestamp            |
      | m2 | Hi there!  | 2026-02-27T10:00:05Z |
    Then the state "messages" in STR-004-chat-store has length 2
    And the last message has role "agent" and content "Hi there!"
    And the state "isProcessing" in STR-004-chat-store equals false

  Scenario: Agent message with tool results
    When event "EVT-009-message-received" is dispatched with:
      | id | content         | timestamp            | toolResults                                                              |
      | m3 | Found 3 files   | 2026-02-27T10:00:10Z | [{"type":"file-search","summary":"3 matches in src/","query":"auth"}]    |
    Then the state "messages" in STR-004-chat-store has length 1
    And the last message has toolResults with length 1
    And the last message toolResults[0] has type "file-search"

  Scenario: Agent message without tool results
    When event "EVT-009-message-received" is dispatched with:
      | id | content             | timestamp            |
      | m4 | Here is the summary | 2026-02-27T10:00:15Z |
    Then the last message has no toolResults

  # -- EVT-010-chat-error: store mutations --

  Scenario: Chat error stops processing and stores the error
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m1 | Test    | 2026-02-27T10:00:00Z |
    When event "EVT-010-chat-error" is dispatched with:
      | error               |
      | Rate limit exceeded |
    Then the state "isProcessing" in STR-004-chat-store equals false
    And the state "error" in STR-004-chat-store equals "Rate limit exceeded"

  Scenario: Chat error does not remove existing messages
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m1 | Test    | 2026-02-27T10:00:00Z |
    When event "EVT-010-chat-error" is dispatched with:
      | error          |
      | Server crashed |
    Then the state "messages" in STR-004-chat-store has length 1

  # -- EVT-011-budget-updated: store mutations --

  Scenario: Budget update sets all token budget fields
    When event "EVT-011-budget-updated" is dispatched with:
      | used  | total  | percent |
      | 50000 | 200000 | 25      |
    Then the state "tokenBudget.used" in STR-004-chat-store equals 50000
    And the state "tokenBudget.total" in STR-004-chat-store equals 200000
    And the state "tokenBudget.percent" in STR-004-chat-store equals 25

  Scenario: Budget reaches critical threshold
    When event "EVT-011-budget-updated" is dispatched with:
      | used   | total  | percent |
      | 185000 | 200000 | 92      |
    Then the state "tokenBudget.percent" in STR-004-chat-store equals 92
    And selector "isBudgetCritical" returns true

  Scenario: Budget below critical threshold
    When event "EVT-011-budget-updated" is dispatched with:
      | used  | total  | percent |
      | 50000 | 200000 | 25      |
    Then selector "isBudgetCritical" returns false

  Scenario: Successive budget updates overwrite previous values
    Given event "EVT-011-budget-updated" was dispatched with:
      | used  | total  | percent |
      | 50000 | 200000 | 25      |
    When event "EVT-011-budget-updated" is dispatched with:
      | used   | total  | percent |
      | 100000 | 200000 | 50      |
    Then the state "tokenBudget.used" in STR-004-chat-store equals 100000
    And the state "tokenBudget.percent" in STR-004-chat-store equals 50

  # -- EVT-012-discovery-status-changed: store mutations --

  Scenario: Discovery status updated when brief becomes ready
    When event "EVT-012-discovery-status-changed" is dispatched with:
      | briefReady | briefAccepted |
      | true       | false         |
    Then the state "discoveryStatus.briefReady" in STR-004-chat-store equals true
    And the state "discoveryStatus.briefAccepted" in STR-004-chat-store equals false

  Scenario: Discovery status reflects accepted brief
    When event "EVT-012-discovery-status-changed" is dispatched with:
      | briefReady | briefAccepted |
      | true       | true          |
    Then the state "discoveryStatus.briefReady" in STR-004-chat-store equals true
    And the state "discoveryStatus.briefAccepted" in STR-004-chat-store equals true

  # -- EVT-013-brief-action: store mutations --

  Scenario: User accepts the brief
    Given event "EVT-012-discovery-status-changed" was dispatched with:
      | briefReady | briefAccepted |
      | true       | false         |
    When event "EVT-013-brief-action" is dispatched with:
      | action | success |
      | accept | true    |
    Then the state "discoveryStatus.briefAccepted" in STR-004-chat-store equals true

  Scenario: User rejects the brief
    Given event "EVT-012-discovery-status-changed" was dispatched with:
      | briefReady | briefAccepted |
      | true       | false         |
    When event "EVT-013-brief-action" is dispatched with:
      | action | success |
      | reject | true    |
    Then the state "discoveryStatus.briefAccepted" in STR-004-chat-store equals false
    And the state "discoveryStatus.briefReady" in STR-004-chat-store equals false

  Scenario: Failed brief action does not mutate store
    Given event "EVT-012-discovery-status-changed" was dispatched with:
      | briefReady | briefAccepted |
      | true       | false         |
    When event "EVT-013-brief-action" is dispatched with:
      | action | success |
      | accept | false   |
    Then the state "discoveryStatus.briefAccepted" in STR-004-chat-store equals false
    And the state "discoveryStatus.briefReady" in STR-004-chat-store equals true

  # -- Message ordering --

  Scenario: Messages maintain chronological order
    Given event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m1 | First   | 2026-02-27T10:00:00Z |
    And event "EVT-009-message-received" was dispatched with:
      | id | content | timestamp            |
      | m2 | Second  | 2026-02-27T10:00:05Z |
    And event "EVT-008-message-sent" was dispatched with:
      | id | content | timestamp            |
      | m3 | Third   | 2026-02-27T10:00:10Z |
    Then the state "messages" in STR-004-chat-store has length 3
    And selector "messageCount" returns 3
    And selector "lastMessage" returns a message with id "m3"
