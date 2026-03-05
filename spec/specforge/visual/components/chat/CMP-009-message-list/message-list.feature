@CMP-009-message-list
Feature: Message List
  Scrollable list of chat messages with auto-scroll and alignment by sender.

  Background:
    Given the chat view is rendered
    And the message list is visible between the discovery status bar and chat input

  # -- Rendering --

  Scenario: List renders one bubble per message
    Given the messages array contains 5 messages
    Then the list displays 5 message bubbles

  Scenario: User messages are right-aligned
    Given a message has sender "user"
    Then the message bubble has align-self "flex-end"
    And the message bubble uses ELM-035-message-bubble-user

  Scenario: Agent messages are left-aligned
    Given a message has sender "agent"
    Then the message bubble has align-self "flex-start"
    And the message bubble uses ELM-036-message-bubble-agent

  Scenario: User messages have max-width 75%
    Given a message has sender "user"
    Then the message bubble has max-width "75%"

  Scenario: Agent messages have max-width 85%
    Given a message has sender "agent"
    Then the message bubble has max-width "85%"

  Scenario: Each message displays a timestamp
    Given a message was sent at "10:32 AM"
    Then the ELM-037-message-timestamp below the bubble displays "10:32 AM"

  # -- Tool Results --

  Scenario: Tool result card renders after agent message
    Given an agent message includes a tool result
    Then an ELM-038-tool-result-card is rendered below the message bubble
    And the card contains an ELM-039-tool-result-type-badge

  # -- Processing Indicator --

  Scenario: Processing indicator shown when agent is thinking
    Given isProcessing is true
    Then the ELM-042-chat-processing-indicator is visible at the bottom of the list
    And the indicator is left-aligned (agent alignment)

  Scenario: Processing indicator hidden when not processing
    Given isProcessing is false
    Then the ELM-042-chat-processing-indicator is not visible

  # -- Auto-Scroll --

  Scenario: List auto-scrolls to bottom on new message
    Given the user is scrolled to the bottom of the message list
    When a new message is appended to the messages array
    Then the list scrolls smoothly to the bottom

  Scenario: Auto-scroll suppressed when user scrolled up
    Given the user has scrolled up more than 100px from the bottom
    When a new message is appended to the messages array
    Then the list does not auto-scroll

  Scenario: Auto-scroll resumes when user scrolls back to bottom
    Given the user had scrolled up more than 100px
    When the user scrolls back to within 100px of the bottom
    And a new message is appended to the messages array
    Then the list scrolls smoothly to the bottom

  # -- Empty State --

  Scenario: Empty state when no messages exist
    Given the messages array is empty
    Then the list displays "Start a conversation to begin discovery."
    And the empty state text uses color "--sf-text-muted"
    And the empty state text is italic
    And the empty state has vertical padding of 48px

  # -- Layout --

  Scenario: List has correct layout properties
    Then the list has display "flex"
    And the list has flex-direction "column"
    And the list has gap "12px"
    And the list has overflow-y "auto"
    And the list has padding "16px"
    And the list has flex-grow "1"

  # -- Accessibility --

  Scenario: List has correct ARIA attributes
    Then the list has role "log"
    And the list has aria-label "Chat messages"
    And the list has aria-live "polite"
