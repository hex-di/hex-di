@acp-session-events
Feature: ACP Session Events
  As an ACP session messaging system
  I want to dispatch message lifecycle events
  So that the ACP session view displays real-time agent communications

  Background:
    Given the store "acp-session-store" is initialized with defaults
    And the store "session-subscription" is initialized with defaults

  # -- EVT-014-acp-session-message-received: store mutations --

  Scenario: Receiving a session message appends it to the store
    When event "EVT-014-acp-session-message-received" is dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-001","agentRole":"architect","content":"Found circular dependency in auth module","timestamp":1740650400000,"messageType":"finding","severity":"critical","phase":"discovery"} |
    Then the state "messages" in STR-009-acp-session-store has length 1
    And the last session message has messageId "bb-001"
    And the last session message has severity "critical"

  Scenario: Multiple messages accumulate in order
    Given event "EVT-014-acp-session-message-received" was dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-001","agentRole":"architect","content":"First finding","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"} |
    When event "EVT-014-acp-session-message-received" is dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-002","agentRole":"reviewer","content":"Clarification needed","timestamp":1740650460000,"messageType":"clarification","severity":"minor","phase":"discovery"} |
    Then the state "messages" in STR-009-acp-session-store has length 2

  Scenario: Critical count selector updates after critical message
    When event "EVT-014-acp-session-message-received" is dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-003","agentRole":"architect","content":"Security vulnerability","timestamp":1740650500000,"messageType":"finding","severity":"critical","phase":"spec-generation"} |
    Then selector "criticalCount" in STR-009-acp-session-store returns 1

  # -- EVT-015-acp-session-messages-loaded: store mutations --

  Scenario: Loading messages replaces the entire messages array
    Given event "EVT-014-acp-session-message-received" was dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-old","agentRole":"reviewer","content":"Old message","timestamp":1740650000000,"messageType":"broadcast","severity":"observation","phase":"discovery"} |
    When event "EVT-015-acp-session-messages-loaded" is dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Loaded msg 1","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"},{"messageId":"bb-101","agentRole":"reviewer","content":"Loaded msg 2","timestamp":1740650460000,"messageType":"clarification","severity":"minor","phase":"discovery"}] |
    Then the state "messages" in STR-009-acp-session-store has length 2
    And the state "messages" in STR-009-acp-session-store does not contain messageId "bb-old"

  Scenario: Loading empty messages array clears the store
    Given event "EVT-014-acp-session-message-received" was dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-001","agentRole":"architect","content":"Some finding","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"} |
    When event "EVT-015-acp-session-messages-loaded" is dispatched with:
      | messages |
      | []       |
    Then the state "messages" in STR-009-acp-session-store has length 0

  # -- EVT-016-acp-session-message-dismissed: store mutations --

  Scenario: Dismissing a message removes it from the store
    Given event "EVT-015-acp-session-messages-loaded" was dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Finding A","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"},{"messageId":"bb-101","agentRole":"reviewer","content":"Finding B","timestamp":1740650460000,"messageType":"finding","severity":"minor","phase":"discovery"}] |
    When event "EVT-016-acp-session-message-dismissed" is dispatched with:
      | messageId |
      | bb-100    |
    Then the state "messages" in STR-009-acp-session-store has length 1
    And the state "messages" in STR-009-acp-session-store does not contain messageId "bb-100"
    And the state "messages" in STR-009-acp-session-store contains messageId "bb-101"

  Scenario: Dismissing a non-existent message is a no-op
    Given event "EVT-015-acp-session-messages-loaded" was dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Finding A","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"}] |
    When event "EVT-016-acp-session-message-dismissed" is dispatched with:
      | messageId      |
      | non-existent   |
    Then the state "messages" in STR-009-acp-session-store has length 1

  Scenario: Dismissing a critical message updates the critical count
    Given event "EVT-015-acp-session-messages-loaded" was dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Critical issue","timestamp":1740650400000,"messageType":"finding","severity":"critical","phase":"discovery"},{"messageId":"bb-101","agentRole":"reviewer","content":"Minor note","timestamp":1740650460000,"messageType":"finding","severity":"minor","phase":"discovery"}] |
    When event "EVT-016-acp-session-message-dismissed" is dispatched with:
      | messageId |
      | bb-100    |
    Then selector "criticalCount" in STR-009-acp-session-store returns 0

  # -- EVT-017-acp-session-subscription-tick: store mutations --

  Scenario: Subscription tick updates the tick counter
    When event "EVT-017-acp-session-subscription-tick" is dispatched with:
      | tick | timestamp            |
      | 1    | 2026-02-27T10:00:00Z |
    Then the state "tick" in STR-016-session-subscription equals 1
    And the state "timestamp" in STR-016-session-subscription equals "2026-02-27T10:00:00Z"

  Scenario: Successive ticks increment monotonically
    Given event "EVT-017-acp-session-subscription-tick" was dispatched with:
      | tick | timestamp            |
      | 1    | 2026-02-27T10:00:00Z |
    When event "EVT-017-acp-session-subscription-tick" is dispatched with:
      | tick | timestamp            |
      | 2    | 2026-02-27T10:00:05Z |
    Then the state "tick" in STR-016-session-subscription equals 2
    And the state "timestamp" in STR-016-session-subscription equals "2026-02-27T10:00:05Z"

  Scenario: Tick does not affect ACP session store
    Given event "EVT-015-acp-session-messages-loaded" was dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Finding","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"}] |
    When event "EVT-017-acp-session-subscription-tick" is dispatched with:
      | tick | timestamp            |
      | 5    | 2026-02-27T10:01:00Z |
    Then the state "messages" in STR-009-acp-session-store has length 1

  # -- Selector integration --

  Scenario: messagesByPhase filters correctly after receiving messages
    Given event "EVT-014-acp-session-message-received" was dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-001","agentRole":"architect","content":"Discovery finding","timestamp":1740650400000,"messageType":"finding","severity":"major","phase":"discovery"} |
    And event "EVT-014-acp-session-message-received" was dispatched with:
      | message                                                                                                                                              |
      | {"messageId":"bb-002","agentRole":"reviewer","content":"Spec finding","timestamp":1740650460000,"messageType":"finding","severity":"minor","phase":"spec-generation"} |
    Then selector "messagesByPhase" with phase "discovery" returns 1 message
    And selector "messagesByPhase" with phase "spec-generation" returns 1 message

  Scenario: messagesBySeverity filters correctly after receiving messages
    Given event "EVT-015-acp-session-messages-loaded" was dispatched with:
      | messages                                                                                                                                             |
      | [{"messageId":"bb-100","agentRole":"architect","content":"Critical","timestamp":1740650400000,"messageType":"finding","severity":"critical","phase":"discovery"},{"messageId":"bb-101","agentRole":"reviewer","content":"Minor","timestamp":1740650460000,"messageType":"finding","severity":"minor","phase":"discovery"},{"messageId":"bb-102","agentRole":"architect","content":"Also critical","timestamp":1740650500000,"messageType":"finding","severity":"critical","phase":"spec-generation"}] |
    Then selector "messagesBySeverity" with severity "critical" returns 2 messages
    And selector "messagesBySeverity" with severity "minor" returns 1 message
