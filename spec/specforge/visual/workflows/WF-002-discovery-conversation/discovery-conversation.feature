@WF-002
Feature: Discovery Conversation
  As a user
  I want to have a guided discovery conversation with the agent
  So that the agent can gather enough information to generate an accurate spec brief

  Background:
    Given the Chat view (PG-002) is displayed
    And an active session exists in STR-002 with status "active"
    And the chat store is initialized with empty messages
    And isProcessing is false
    And the token budget is { used: 0, total: 200000, percent: 0 }
    And the discovery status is { briefAccepted: false, briefReady: false }

  # --- Sending Messages ---

  Scenario: User sends the first message
    When the user types "Analyze the auth module structure" in CMP-010
    And the user presses Enter
    Then action ACT-011 (send message) fires
    And event EVT-008-message-sent is dispatched with the user message
    And the chat store appends a message with role "user" and the typed content
    And isProcessing becomes true
    And the chat input area shows a loading indicator

  Scenario: User message appears in message list
    When event EVT-008-message-sent is dispatched with content "Hello"
    Then the message list (CMP-009) shows a new message bubble
    And the message bubble shows role "user"
    And the message content is "Hello"
    And a timestamp is displayed

  Scenario: Input is disabled while processing
    Given isProcessing is true
    Then the chat input area (CMP-010) send button is disabled
    And a typing indicator appears in the message list

  # --- Receiving Responses ---

  Scenario: Agent responds with a plain text message
    Given isProcessing is true
    When event EVT-009-message-received is dispatched with:
      | role  | content                              | toolResults |
      | agent | I found 3 modules in the auth package | []         |
    Then the chat store appends the agent message
    And isProcessing becomes false
    And the message list shows the agent response as a new bubble
    And no tool result sections are rendered

  Scenario: Agent responds with tool results
    Given isProcessing is true
    When event EVT-009-message-received is dispatched with:
      | role  | content                    |
      | agent | Here is what I found:      |
    And the message includes tool results:
      | type      | summary                 | query               |
      | file-read | Read auth/index.ts      | auth/index.ts       |
      | dep-scan  | Found 5 dependencies    | @hex-di/core        |
    Then the message list shows the agent response
    And the message contains 2 collapsible tool result sections
    And each section shows the tool type and summary

  Scenario: Tool results are collapsible
    Given an agent message with tool results is displayed
    When the user clicks on a tool result section header
    Then the section expands to show detailed tool output
    When the user clicks the header again
    Then the section collapses

  # --- Chat Errors ---

  Scenario: Chat error during processing
    Given isProcessing is true
    When event EVT-010-chat-error is dispatched with error "Connection timeout"
    Then isProcessing becomes false
    And the chat store error field is set to "Connection timeout"
    And an error indicator appears in the message area
    And the chat input remains enabled for retry

  Scenario: Error clears on next message send
    Given the chat store has an error "Connection timeout"
    When the user sends a new message
    Then event EVT-008-message-sent is dispatched
    And the error field is cleared
    And isProcessing becomes true

  # --- Budget Tracking ---

  Scenario: Budget updates after message exchange
    When event EVT-011-budget-updated is dispatched with:
      | used  | total  | percent |
      | 15000 | 200000 | 7.5     |
    Then the token budget bar (CMP-007) shows 7.5% fill
    And the budget zone is "safe"
    And the bar color is green

  Scenario: Budget enters warning zone
    When event EVT-011-budget-updated is dispatched with:
      | used   | total  | percent |
      | 130000 | 200000 | 65      |
    Then the token budget bar shows 65% fill
    And the budget zone is "warning"
    And the bar color changes to yellow
    And a warning text "Budget running low" appears

  Scenario: Budget enters critical zone
    When event EVT-011-budget-updated is dispatched with:
      | used   | total  | percent |
      | 180000 | 200000 | 90      |
    Then the token budget bar shows 90% fill
    And the budget zone is "critical"
    And the bar color changes to orange
    And a warning text "Budget critical" appears
    And the chat input shows a caution indicator

  Scenario: Budget reaches exhausted zone
    When event EVT-011-budget-updated is dispatched with:
      | used   | total  | percent |
      | 196000 | 200000 | 98      |
    Then the token budget bar shows 98% fill
    And the budget zone is "exhausted"
    And the bar color changes to red with a pulsing animation
    And the chat input area is disabled
    And a message "Budget exhausted" is displayed

  Scenario Outline: Budget zone classification
    When event EVT-011-budget-updated is dispatched with percent <percent>
    Then the budget zone is "<zone>"

    Examples:
      | percent | zone      |
      | 0       | safe      |
      | 30      | safe      |
      | 59      | safe      |
      | 60      | warning   |
      | 75      | warning   |
      | 84      | warning   |
      | 85      | critical  |
      | 90      | critical  |
      | 94      | critical  |
      | 95      | exhausted |
      | 100     | exhausted |

  # --- Discovery Status Progression ---

  Scenario: Discovery status advances to in-progress on first message
    Given the discovery status briefReady is false
    And the discovery status briefAccepted is false
    When the user sends the first message via ACT-011
    Then the discovery status bar (CMP-008) shows "in-progress"

  Scenario: Discovery status advances to brief-ready
    Given the conversation has multiple exchanges
    When event EVT-012-discovery-status-changed is dispatched with:
      | briefReady | briefAccepted |
      | true       | false         |
    Then the discovery status bar shows "brief-ready"
    And the status bar has an accent-colored indicator
    And brief action buttons appear (accept, reject)

  # --- Brief Accept / Reject ---

  Scenario: User accepts the generated brief
    Given the discovery status is briefReady true
    When the user clicks the "Accept Brief" button
    Then action ACT-013 (accept brief) fires
    And event EVT-013-brief-action is dispatched with accepted true
    And the chat store sets discoveryStatus.briefAccepted to true
    And the discovery status bar shows "brief-accepted"
    And the pipeline can advance to the next phase

  Scenario: User rejects the generated brief
    Given the discovery status is briefReady true
    When the user clicks the "Reject Brief" button
    Then action ACT-014 (reject brief) fires
    And event EVT-013-brief-action is dispatched with accepted false
    And the chat store sets discoveryStatus.briefAccepted to false
    And the discovery status bar returns to "in-progress"
    And the chat input remains enabled for further conversation

  Scenario: User requests brief early
    Given the conversation has had several exchanges
    And the discovery status briefReady is false
    When the user clicks the "Request Brief" button
    Then action ACT-015 (request brief) fires
    And the agent attempts to generate a brief with available information
    And the conversation continues until the brief is ready

  # --- Conversation Flow Patterns ---

  Scenario: Multi-turn conversation with budget progression
    Given the user is in the Chat view with a fresh session
    When the user sends "What does the auth module export?"
    And the agent responds with tool results showing file analysis
    And the budget updates to 5%
    And the user sends "Show me the dependency graph"
    And the agent responds with dependency analysis
    And the budget updates to 12%
    Then the message list contains 4 messages (2 user, 2 agent)
    And the budget bar shows 12% in the safe zone

  Scenario: Complete discovery conversation to brief acceptance
    Given the user starts a fresh discovery conversation
    When the user exchanges multiple messages with the agent
    And the budget reaches 45%
    And the agent determines sufficient information is gathered
    And EVT-012 fires with briefReady true
    And the user reviews the brief
    And the user accepts the brief via ACT-013
    Then the discovery status is brief-accepted
    And the session is ready for the next pipeline phase

  Scenario: Discovery with brief rejection and retry
    Given the discovery has reached brief-ready status
    When the user rejects the brief via ACT-014
    Then the conversation resumes
    And the user provides additional clarifications
    And the agent generates a revised brief
    And EVT-012 fires again with briefReady true
    And the user accepts the revised brief
    Then the discovery status is brief-accepted
