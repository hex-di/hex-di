@ACT-chat
Feature: Chat Actions
  Message sending, error dismissal, and discovery brief lifecycle.

  Background:
    Given a session is active
    And the chat view is displayed

  # -- ACT-011 Send Message --

  Scenario: Clicking the send button sends a message
    Given the chat input (ELM-040) contains "Hello, agent"
    And the chat store isProcessing is false
    When the user clicks the send button (ELM-041)
    Then the action ACT-011-send-message is triggered
    And the event EVT-008-message-sent is dispatched with the message "Hello, agent"
    And the message is appended to the STR-004-chat-store messages array
    And the chat input is cleared
    And isProcessing is set to true

  Scenario: Pressing Enter in the chat input sends a message
    Given the chat input contains "Review this spec"
    And the chat store isProcessing is false
    When the user presses the Enter key in the chat input (ELM-040)
    Then the action ACT-011-send-message is triggered
    And the message "Review this spec" is sent

  Scenario: Send is blocked when the input is empty
    Given the chat input is empty
    When the user clicks the send button (ELM-041)
    Then the action ACT-011-send-message is not triggered
    And no EVT-008-message-sent event is dispatched

  Scenario: Send is blocked while a message is processing
    Given the chat input contains "Follow-up question"
    And the chat store isProcessing is true
    When the user clicks the send button (ELM-041)
    Then the action ACT-011-send-message is not triggered
    And no EVT-008-message-sent event is dispatched

  Scenario: New message appears in the message list after sending
    Given the chat input contains "What is the coverage?"
    When the user sends the message
    Then a new user message bubble appears in the message list
    And the message content displays "What is the coverage?"
    And the message list scrolls to the bottom

  # -- ACT-012 Clear Chat Error --

  Scenario: Dismissing the error banner clears the chat error
    Given the chat store has an error "Network timeout"
    And the error banner (ELM-043) is visible
    When the user clicks the dismiss button on the error banner
    Then the action ACT-012-clear-chat-error is triggered
    And the event EVT-024-error-cleared is dispatched
    And the STR-004-chat-store error is set to null
    And the error banner is no longer visible

  Scenario: Error banner is not visible when there is no error
    Given the chat store error is null
    Then the error banner (ELM-043) is not rendered

  # -- ACT-013 Accept Brief --

  Scenario: Accepting the discovery brief advances the workflow
    Given the discovery brief is ready
    And the accept brief button (ELM-032) is visible
    When the user clicks the accept brief button
    Then the action ACT-013-accept-brief is triggered
    And the event EVT-013-brief-action is dispatched with payload { accepted: true }
    And the STR-004-chat-store discoveryStatus.briefAccepted is set to true
    And the session workflow advances past the discovery phase

  Scenario: Accept brief button is only visible when brief is ready
    Given the discovery brief is not ready
    Then the accept brief button (ELM-032) is not visible

  # -- ACT-014 Reject Brief --

  Scenario: Rejecting the discovery brief continues the conversation
    Given the discovery brief is ready
    And the reject brief button (ELM-033) is visible
    When the user clicks the reject brief button
    Then the action ACT-014-reject-brief is triggered
    And the event EVT-013-brief-action is dispatched with payload { accepted: false }
    And the STR-004-chat-store discoveryStatus.briefAccepted is set to false
    And the discovery conversation continues

  Scenario: After rejection the brief buttons remain available
    Given the user rejected the brief
    Then the accept brief button (ELM-032) remains visible
    And the reject brief button (ELM-033) remains visible
    And the user can continue chatting to refine the brief

  # -- ACT-015 Request Brief --

  Scenario: Requesting brief generation triggers discovery status update
    Given the session is in the discovery phase
    And the request brief button (ELM-034) is visible
    When the user clicks the request brief button
    Then the action ACT-015-request-brief is triggered
    And the event EVT-012-discovery-status-changed is dispatched
    And the STR-004-chat-store discoveryStatus is updated

  Scenario: Brief generation is asynchronous
    Given the user requested a brief
    When the brief generation is in progress
    Then the request brief button (ELM-034) shows a loading state
    And the accept/reject buttons are not yet visible

  Scenario: Accept and reject buttons appear when brief is ready
    Given the user requested a brief
    When the brief generation completes
    Then the STR-004-chat-store discoveryStatus.briefReady is set to true
    And the accept brief button (ELM-032) becomes visible
    And the reject brief button (ELM-033) becomes visible
