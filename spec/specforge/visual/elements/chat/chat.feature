@ELM-chat
Feature: Chat Elements
  Token budget, discovery controls, message bubbles, tool results, input, and errors.

  Background:
    Given the Chat view is rendered
    And a session is active

  # ── ELM-029 Token Budget Progress ──

  Scenario Outline: Progress bar color changes with usage zones
    Given the token budget used is <used> out of <total>
    Then the progress bar fill color is "<color>"
    And the progress bar width is approximately <percent>%

    Examples:
      | used   | total  | color       | percent |
      | 50000  | 100000 | --sf-accent | 50      |
      | 75000  | 100000 | #FF8C00     | 75      |
      | 95000  | 100000 | #FF3B3B     | 95      |

  Scenario: Exhausted budget pulses the progress bar
    Given the token budget used equals the total
    Then the progress bar fill color is "#FF3B3B"
    And the progress bar fill has a pulse animation

  # ── ELM-030 Token Budget Label ──

  Scenario: Token budget label displays usage text
    Given the token budget is 72000 used out of 100000 total
    Then the token budget label displays "72000 / 100000 tokens"
    And the label color is "--sf-text-muted"

  # ── ELM-031 Discovery Status Indicator ──

  Scenario Outline: Discovery status badge matches phase
    Given the discovery phase is "<phase>"
    Then the discovery indicator displays "<label>"
    And the discovery indicator color is "<color>"

    Examples:
      | phase          | label          | color            |
      | not-started    | Not Started    | --sf-text-muted  |
      | in-progress    | In Progress    | --sf-accent      |
      | brief-ready    | Brief Ready    | #FF8C00          |
      | brief-accepted | Brief Accepted | #22C55E          |

  # ── ELM-032 Accept Brief Button ──

  Scenario: Accept brief button visible when brief is ready
    Given briefReady is true and briefAccepted is false
    Then the "Accept Brief" button is visible

  Scenario: Accept brief button hidden when brief not ready
    Given briefReady is false
    Then the "Accept Brief" button is not visible

  Scenario: Clicking accept brief triggers accept action
    Given the "Accept Brief" button is visible
    When the user clicks the "Accept Brief" button
    Then the action ACT-013-accept-brief is triggered

  # ── ELM-033 Reject Brief Button ──

  Scenario: Reject brief button has secondary styling
    Then the "Reject Brief" button has background "transparent"
    And the "Reject Brief" button has color "--sf-text-muted"

  Scenario: Clicking reject brief triggers reject action
    When the user clicks the "Reject Brief" button
    Then the action ACT-014-reject-brief is triggered

  # ── ELM-034 Request Brief Button ──

  Scenario: Request brief button triggers request action
    When the user clicks the "Request Brief" button
    Then the action ACT-015-request-brief is triggered

  # ── ELM-035 Message Bubble (User) ──

  Scenario: User message renders right-aligned
    Given a user message exists
    Then the user message bubble is right-aligned
    And the user message bubble has background "--sf-accent-dim"
    And the user message bubble has max-width 75%

  Scenario: User message bubble has asymmetric border radius
    Then the user message bubble has border-radius "12px 12px 2px 12px"

  # ── ELM-036 Message Bubble (Agent) ──

  Scenario: Agent message renders left-aligned
    Given an agent message exists
    Then the agent message bubble is left-aligned
    And the agent message bubble has background "--sf-surface"
    And the agent message bubble has max-width 75%

  Scenario: Agent message bubble has asymmetric border radius
    Then the agent message bubble has border-radius "12px 12px 12px 2px"

  # ── ELM-037 Message Timestamp ──

  Scenario: Timestamp renders below each message
    Given a message with timestamp "10:32 AM"
    Then the timestamp "10:32 AM" is displayed below the message
    And the timestamp has font-size 10px
    And the timestamp color is "--sf-text-muted"

  # ── ELM-038 Tool Result Card ──

  Scenario: Tool result card is collapsed by default
    Given an agent message with a tool result
    Then the tool result card is displayed in collapsed state
    And the tool result card shows a summary line

  Scenario: Clicking tool result card expands it
    When the user clicks on a collapsed tool result card
    Then the tool result card expands to show full details
    And the card background changes to "rgba(0, 240, 255, 0.02)"

  # ── ELM-039 Tool Result Type Badge ──

  Scenario Outline: Tool type badge color matches tool type
    Given a tool result of type "<type>"
    Then the type badge displays "<type>"
    And the type badge color is "<color>"

    Examples:
      | type         | color      |
      | web-search   | --sf-accent|
      | graph-query  | #A78BFA    |

  # ── ELM-040 Chat Input Textarea ──

  Scenario: Textarea renders with placeholder
    Then the chat input displays placeholder "Type a message..."

  Scenario: Textarea grows up to 4 lines
    When the user types 4 lines of text
    Then the textarea height grows up to 120px maximum

  Scenario: Enter key sends the message
    Given the user has typed a message
    When the user presses the Enter key
    Then the message is sent

  Scenario: Shift+Enter inserts a newline
    Given the user has typed a message
    When the user presses Shift+Enter
    Then a newline is inserted in the textarea

  Scenario: Textarea shows accent border on focus
    When the user focuses the chat textarea
    Then the textarea border-color changes to "--sf-accent"

  # ── ELM-041 Chat Send Button ──

  Scenario: Send button is disabled when textarea is empty
    Given the chat textarea is empty
    Then the send button is disabled
    And the send button has opacity 0.4

  Scenario: Send button is disabled when processing
    Given isProcessing is true
    Then the send button is disabled

  Scenario: Clicking send button triggers send action
    Given the chat textarea contains "Hello"
    And isProcessing is false
    When the user clicks the send button
    Then the action ACT-011-send-message is triggered

  # ── ELM-042 Chat Processing Indicator ──

  Scenario: Processing indicator visible when agent is processing
    Given isProcessing is true
    Then the processing indicator is visible
    And animated dots are displayed

  Scenario: Processing indicator hidden when not processing
    Given isProcessing is false
    Then the processing indicator is not visible

  # ── ELM-043 Chat Error Banner ──

  Scenario: Error banner displays when error exists
    Given the STR-004 error field contains "Connection lost"
    Then the error banner is visible
    And the error banner displays "Connection lost"
    And the error banner has background "rgba(255, 59, 59, 0.08)"

  Scenario: Error banner is hidden when no error
    Given the STR-004 error field is null
    Then the error banner is not visible

  Scenario: Error banner can be dismissed
    Given the error banner is visible
    When the user clicks the dismiss button on the error banner
    Then the error banner is hidden
