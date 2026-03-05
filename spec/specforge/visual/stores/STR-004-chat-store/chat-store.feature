@STR-004-chat-store
Feature: Chat Store
  As a view consumer
  I want reliable chat state management
  So that the conversation UI reflects messages, budget, and discovery status

  Background:
    Given the store "chat-store" is initialized with defaults

  # ── Message sending ───────────────────────────────────────

  Scenario: Sending a message appends it and starts processing
    When event "EVT-008-message-sent" is dispatched with:
      | message                                                                                    |
      | {"id":"m1","role":"user","content":"Describe the auth module","timestamp":"2026-02-27T10:00:00Z"} |
    Then the state "messages" has length 1
    And the state "isProcessing" equals true
    And the state "error" equals null

  Scenario: Sending a message clears previous error
    Given event "EVT-010-chat-error" was dispatched with:
      | error            |
      | Network timeout  |
    When event "EVT-008-message-sent" is dispatched with:
      | message                                                                                    |
      | {"id":"m2","role":"user","content":"Retry","timestamp":"2026-02-27T10:01:00Z"}             |
    Then the state "error" equals null
    And the state "isProcessing" equals true

  # ── Message receiving ─────────────────────────────────────

  Scenario: Receiving a message appends it and stops processing
    Given event "EVT-008-message-sent" was dispatched with:
      | message                                                                                    |
      | {"id":"m1","role":"user","content":"Hello","timestamp":"2026-02-27T10:00:00Z"}             |
    When event "EVT-009-message-received" is dispatched with:
      | message                                                                                    |
      | {"id":"m2","role":"agent","content":"Hi there!","timestamp":"2026-02-27T10:00:05Z"}        |
    Then the state "messages" has length 2
    And the state "isProcessing" equals false

  Scenario: Agent message with tool results
    When event "EVT-009-message-received" is dispatched with:
      | message                                                                                    |
      | {"id":"m3","role":"agent","content":"Found 3 files","timestamp":"2026-02-27T10:00:10Z","toolResults":[{"type":"file-search","summary":"3 matches in src/","query":"auth"}]} |
    Then the state "messages" has length 1
    And the last message has toolResults with length 1

  # ── Chat errors ───────────────────────────────────────────

  Scenario: Chat error stops processing and stores error
    Given event "EVT-008-message-sent" was dispatched with:
      | message                                                                                    |
      | {"id":"m1","role":"user","content":"Test","timestamp":"2026-02-27T10:00:00Z"}              |
    When event "EVT-010-chat-error" is dispatched with:
      | error                  |
      | Rate limit exceeded    |
    Then the state "isProcessing" equals false
    And the state "error" equals "Rate limit exceeded"

  # ── Token budget ──────────────────────────────────────────

  Scenario: Budget updated sets all token budget fields
    When event "EVT-011-budget-updated" is dispatched with:
      | used   | total  | percent |
      | 50000  | 200000 | 25      |
    Then the state "tokenBudget.used" equals 50000
    And the state "tokenBudget.total" equals 200000
    And the state "tokenBudget.percent" equals 25

  Scenario: Budget reaches critical threshold
    When event "EVT-011-budget-updated" is dispatched with:
      | used   | total  | percent |
      | 185000 | 200000 | 92      |
    Then the state "tokenBudget.percent" equals 92

  # ── Discovery status ──────────────────────────────────────

  Scenario: Discovery status updated by backend
    When event "EVT-012-discovery-status-changed" is dispatched with:
      | briefAccepted | briefReady |
      | false         | true       |
    Then the state "discoveryStatus.briefReady" equals true
    And the state "discoveryStatus.briefAccepted" equals false

  Scenario: User accepts the brief
    Given event "EVT-012-discovery-status-changed" was dispatched with:
      | briefAccepted | briefReady |
      | false         | true       |
    When event "EVT-013-brief-action" is dispatched with:
      | accepted |
      | true     |
    Then the state "discoveryStatus.briefAccepted" equals true

  # ── Selectors ─────────────────────────────────────────────

  Scenario: lastMessage returns null when no messages
    Then selector "lastMessage" returns null

  Scenario: lastMessage returns the most recent message
    Given event "EVT-008-message-sent" was dispatched with:
      | message                                                                                    |
      | {"id":"m1","role":"user","content":"First","timestamp":"2026-02-27T10:00:00Z"}             |
    And event "EVT-009-message-received" was dispatched with:
      | message                                                                                    |
      | {"id":"m2","role":"agent","content":"Second","timestamp":"2026-02-27T10:00:05Z"}           |
    Then selector "lastMessage" returns a message with id "m2"

  Scenario: messageCount reflects total messages
    Given event "EVT-008-message-sent" was dispatched with:
      | message                                                                                    |
      | {"id":"m1","role":"user","content":"Hello","timestamp":"2026-02-27T10:00:00Z"}             |
    And event "EVT-009-message-received" was dispatched with:
      | message                                                                                    |
      | {"id":"m2","role":"agent","content":"Hi","timestamp":"2026-02-27T10:00:05Z"}               |
    Then selector "messageCount" returns 2

  Scenario: budgetRemaining computes tokens left
    Given event "EVT-011-budget-updated" was dispatched with:
      | used   | total  | percent |
      | 150000 | 200000 | 75      |
    Then selector "budgetRemaining" returns 50000

  Scenario: isBudgetCritical returns false when under threshold
    Given event "EVT-011-budget-updated" was dispatched with:
      | used  | total  | percent |
      | 50000 | 200000 | 25      |
    Then selector "isBudgetCritical" returns false

  Scenario: isBudgetCritical returns true when at or above 90%
    Given event "EVT-011-budget-updated" was dispatched with:
      | used   | total  | percent |
      | 180000 | 200000 | 90      |
    Then selector "isBudgetCritical" returns true
