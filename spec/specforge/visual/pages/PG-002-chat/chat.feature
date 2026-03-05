@PG-002-chat
Feature: Chat Page
  As a user
  I want a discovery conversation interface
  So that I can interact with the agent to define my specification

  Background:
    Given the application shell is rendered
    And the current route is "#chat"

  # -- Route Guard -----------------------------------------------------------

  Scenario: Chat page redirects to home when no session is active
    Given STR-002-active-session-store sessionId is null
    When the user navigates to "#chat"
    Then the route changes to "#home"

  Scenario: Chat page renders when a session is active
    Given STR-002-active-session-store sessionId is "session-123"
    When the user navigates to "#chat"
    Then the chat page is rendered

  # -- Layout ----------------------------------------------------------------

  Scenario: Chat page renders as single-column vertical layout
    Given STR-002-active-session-store sessionId is "session-123"
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Chat page has correct meta title
    Given STR-002-active-session-store sessionId is "session-123"
    Then the document title is "SpecForge — Chat"

  Scenario: Components appear in correct vertical order
    Given STR-002-active-session-store sessionId is "session-123"
    Then CMP-007-token-budget-bar appears at the top
    And CMP-008-discovery-status-bar appears below CMP-007
    And CMP-009-message-list appears below CMP-008
    And CMP-010-chat-input-area appears at the bottom

  Scenario: Message list takes remaining vertical space
    Given STR-002-active-session-store sessionId is "session-123"
    Then CMP-009-message-list has flex-grow 1
    And CMP-009-message-list has overflow-y auto

  Scenario: Chat input area is pinned to the bottom
    Given STR-002-active-session-store sessionId is "session-123"
    Then CMP-010-chat-input-area is fixed at the bottom of the page

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state shows prompt message
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then the text "No active session selected." is displayed
    And a link to "#home" is visible

  Scenario: No-session state hides all chat components
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then CMP-007-token-budget-bar is not visible
    And CMP-008-discovery-status-bar is not visible
    And CMP-009-message-list is not visible
    And CMP-010-chat-input-area is not visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state shows conversation prompt
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-004-chat-store messages is empty
    And STR-004-chat-store isProcessing is false
    Then the message list displays "Start a conversation to begin discovery."

  Scenario: Empty state shows zero budget
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-004-chat-store messages is empty
    Then the token budget bar shows 0% used

  Scenario: Empty state keeps input area active
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-004-chat-store messages is empty
    Then CMP-010-chat-input-area is interactive
    And the input is focused automatically

  # -- Loading State (Processing) --------------------------------------------

  Scenario: Processing state shows indicator in message list
    Given STR-004-chat-store isProcessing is true
    Then a processing indicator is displayed as the last item in the message list
    And the indicator shows animated dots or a spinner

  Scenario: Processing state disables the input area
    Given STR-004-chat-store isProcessing is true
    Then CMP-010-chat-input-area input is disabled
    And the send button is grayed out

  # -- Error State -----------------------------------------------------------

  Scenario: Error state shows error banner above input
    Given STR-004-chat-store error is "Request timed out"
    Then an error banner is displayed above CMP-010-chat-input-area
    And the banner contains text "Request timed out"
    And the banner uses "--sf-error" styling

  Scenario: Error state keeps input usable for retry
    Given STR-004-chat-store error is "Request timed out"
    Then CMP-010-chat-input-area input is enabled
    And the user can type a new message

  # -- Active State ----------------------------------------------------------

  Scenario: Active state renders messages in chronological order
    Given STR-004-chat-store contains messages:
      | role  | content                      | timestamp              |
      | agent | Welcome to discovery.        | 2026-02-27T10:00:00Z   |
      | user  | I want a guard policy.       | 2026-02-27T10:01:00Z   |
      | agent | Let me analyze the codebase. | 2026-02-27T10:01:30Z   |
    Then 3 messages are displayed in the list
    And messages appear in chronological order

  Scenario: Agent messages may include tool results
    Given an agent message has toolResults:
      | type       | summary                         |
      | codeSearch | found 12 files matching "guard" |
    Then the message displays a tool results section
    And the tool result shows type "codeSearch" and summary

  Scenario: Input area is ready for next message
    Given STR-004-chat-store isProcessing is false
    And STR-004-chat-store error is null
    Then CMP-010-chat-input-area input is enabled
    And the send button is active

  # -- Send Message ----------------------------------------------------------

  Scenario: User sends a message via Enter key
    Given the chat input contains "Define the guard port"
    When the user presses Enter
    Then EVT-008-message-sent is dispatched with role "user" and content "Define the guard port"
    And the message appears in the list immediately
    And STR-004-chat-store isProcessing becomes true

  Scenario: User sends a message via send button
    Given the chat input contains "What about role hierarchy?"
    When the user clicks the send button
    Then EVT-008-message-sent is dispatched with role "user" and content "What about role hierarchy?"

  Scenario: Empty input prevents sending
    Given the chat input is empty
    When the user presses Enter
    Then no event is dispatched
    And the send button remains inactive

  # -- Receive Response ------------------------------------------------------

  Scenario: Agent response appends to message list
    Given a message was sent and isProcessing is true
    When EVT-009-message-received is dispatched with an agent message
    Then the agent message appears in the list
    And STR-004-chat-store isProcessing becomes false
    And the input is re-enabled

  Scenario: Budget updates after response
    Given the current budget is 10% used
    When EVT-011-budget-updated is dispatched with used 30000, total 200000, percent 15
    Then the token budget bar shows 15% used

  # -- Auto-Scroll -----------------------------------------------------------

  Scenario: New messages auto-scroll to bottom
    Given the message list is scrolled to the bottom
    When a new message arrives
    Then the message list scrolls to show the new message

  Scenario: Manual scroll-up prevents auto-scroll
    Given the user has scrolled up in the message list
    When a new message arrives
    Then the message list does not auto-scroll
    And a "scroll to bottom" indicator appears

  # -- Token Budget Zones ----------------------------------------------------

  Scenario: Budget bar shows safe zone color
    Given STR-004-chat-store tokenBudget percent is 30
    Then the budget bar fill uses "--sf-accent" color

  Scenario: Budget bar shows warning zone color
    Given STR-004-chat-store tokenBudget percent is 70
    Then the budget bar fill uses "#FF8C00" color

  Scenario: Budget bar shows critical zone color
    Given STR-004-chat-store tokenBudget percent is 90
    Then the budget bar fill uses "#FF3B3B" color

  Scenario: Budget bar pulses at exhausted zone
    Given STR-004-chat-store tokenBudget percent is 97
    Then the budget bar fill uses "#FF3B3B" color
    And the budget bar has a pulse animation

  # -- Discovery Status ------------------------------------------------------

  Scenario: Discovery status shows brief not ready initially
    Given STR-004-chat-store discoveryStatus briefReady is false
    And STR-004-chat-store discoveryStatus briefAccepted is false
    Then the discovery status bar shows brief as "Not Ready"

  Scenario: Discovery status updates when brief is ready
    When EVT-012-discovery-status-changed is dispatched with briefReady true
    Then the discovery status bar shows brief as "Ready"

  Scenario: User accepts the brief
    Given the discovery status shows brief as "Ready"
    When the user clicks the accept brief action
    Then EVT-013-brief-action is dispatched with accepted true
    And the discovery status shows accepted as "Yes"

  # -- Navigation ------------------------------------------------------------

  Scenario: Chat page is accessible from the nav rail
    Given STR-002-active-session-store sessionId is "session-123"
    When the user clicks the "Chat" button in the nav rail
    Then the route changes to "#chat"
    And the chat page is rendered
