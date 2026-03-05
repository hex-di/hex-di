@CMP-010-chat-input-area
Feature: Chat Input Area
  Text input area with send button and error display, fixed at the bottom of the chat view.

  Background:
    Given the chat view is rendered
    And the chat input area is fixed at the bottom

  # -- Rendering --

  Scenario: Input area renders textarea and send button
    Then the component contains ELM-040-chat-input-textarea
    And the component contains ELM-041-chat-send-button

  Scenario: Error banner hidden when no error
    Given the error prop is null
    Then the ELM-043-chat-error-banner is not visible

  Scenario: Error banner shown when error exists
    Given the error prop is "Failed to send message. Please try again."
    Then the ELM-043-chat-error-banner is visible
    And the error banner displays "Failed to send message. Please try again."

  # -- Layout --

  Scenario: Container is sticky at bottom
    Then the container has position "sticky"
    And the container has bottom "0"
    And the container has background "var(--sf-surface)"
    And the container has border-top "1px solid var(--sf-border)"

  Scenario: Input row uses horizontal flex
    Then the input row has display "flex"
    And the input row has flex-direction "row"
    And the input row has gap "8px"
    And the input row has align-items "flex-end"

  # -- Textarea Behavior --

  Scenario: Textarea starts as single line
    Then the textarea has min-rows "1"

  Scenario: Textarea grows to accommodate content up to 4 lines
    Given the user types 3 lines of text
    Then the textarea height accommodates 3 lines

  Scenario: Textarea stops growing at 4 lines
    Given the user types 6 lines of text
    Then the textarea height accommodates 4 lines
    And the textarea has internal scrolling for overflow

  Scenario: Textarea fills available width
    Then the textarea has flex-grow "1"

  # -- Sending Messages --

  Scenario: Pressing Enter sends the message
    Given the textarea contains "Hello agent"
    And isProcessing is false
    When the user presses Enter
    Then onSendMessage is invoked with "Hello agent"

  Scenario: Shift+Enter inserts a newline
    Given the textarea contains "Line 1"
    When the user presses Shift+Enter
    Then a newline is inserted in the textarea
    And onSendMessage is not invoked

  Scenario: Clicking send button sends the message
    Given the textarea contains "Hello agent"
    And isProcessing is false
    When the user clicks ELM-041-chat-send-button
    Then onSendMessage is invoked with "Hello agent"

  Scenario: Textarea is cleared after sending
    Given the textarea contains "Hello agent"
    When the user presses Enter
    Then the textarea value is ""

  Scenario: Enter does nothing when textarea is empty
    Given the textarea is empty
    When the user presses Enter
    Then onSendMessage is not invoked

  # -- Disabled State --

  Scenario: Textarea disabled when processing
    Given isProcessing is true
    Then the ELM-040-chat-input-textarea is disabled
    And the textarea appears visually dimmed

  Scenario: Send button disabled when processing
    Given isProcessing is true
    Then the ELM-041-chat-send-button is disabled

  Scenario: Enter key ignored when processing
    Given isProcessing is true
    And the textarea contains "Hello agent"
    When the user presses Enter
    Then onSendMessage is not invoked

  Scenario: Input re-enabled when processing completes
    Given isProcessing changes from true to false
    Then the ELM-040-chat-input-textarea is enabled
    And the ELM-041-chat-send-button is enabled

  # -- Accessibility --

  Scenario: Input area has correct ARIA role
    Then the component has role "form"
    And the component has aria-label "Send a message"
