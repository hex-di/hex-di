@PG-007-acp-session
Feature: ACP Session Page
  As a user monitoring agent activity
  I want a real-time feed of ACP session messages with filtering
  So that I can track findings, clarifications, and broadcasts across agents

  Background:
    Given the application shell is rendered
    And the user navigates to the "#acp-session" route

  # -- Page Layout -----------------------------------------------------------

  Scenario: ACP session page renders in single-column layout
    Then the ACP session page uses a single-column layout
    And the content area has 24px padding

  Scenario: Filter bar is rendered above the message list
    Given a session is active
    Then the filter bar (CMP-004) is rendered at the top of the page
    And the message entry list (CMP-016) is rendered below the filter bar

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state when no session is selected
    Given the active session store has sessionId null
    Then the page displays "Select a session to view session messages."
    And the filter bar is not visible
    And the message entry list is not visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state when session is active but no messages exist
    Given the active session store has an active session
    And the ACP session store contains 0 messages
    Then the filter bar is visible but controls are muted
    And the page displays "No messages yet. Waiting for agent activity."

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton cards
    Given the active session store has an active session
    And the ACP session messages are being fetched
    Then 3 skeleton shimmer cards are displayed
    And the filter bar controls are disabled

  # -- Populated State -------------------------------------------------------

  Scenario: Populated state renders message cards
    Given the active session store has an active session
    And the ACP session store contains 5 messages
    Then 5 message cards are rendered in the message entry list
    And the filter bar controls are enabled

  Scenario: Messages are ordered by timestamp descending
    Given the ACP session store contains messages at different timestamps
    Then the most recent message appears at the top of the list
    And messages are ordered by timestamp descending

  # -- Message Card Rendering ------------------------------------------------

  Scenario: Message card displays severity-colored left border
    Given a message has severity "critical"
    Then the message card has a 4px left border colored "#FF3B3B"

  Scenario: Message card displays severity-colored left border for major
    Given a message has severity "major"
    Then the message card has a 4px left border colored "#FF8C00"

  Scenario: Message card displays severity-colored left border for minor
    Given a message has severity "minor"
    Then the message card has a 4px left border colored "#FFD600"

  Scenario: Message card displays severity-colored left border for observation
    Given a message has severity "observation"
    Then the message card has a 4px left border colored "#4FC3F7"

  Scenario: Message card displays agent role badge with role-specific color
    Given a message has agentRole "gxp-reviewer"
    Then the message card displays an agent badge with text "gxp-reviewer"
    And the agent badge text color is "#AB47BC"
    And the agent badge background is "#AB47BC" at 12% opacity

  Scenario: Message card displays timestamp, phase, and type metadata
    Given a message with timestamp "12:34:05 PM", phase "spec-authoring", messageType "finding"
    Then the message card displays the timestamp "12:34:05 PM" in mono font
    And the message card displays the phase "spec-authoring"
    And the message card displays the type "finding"

  Scenario: Message card displays message body content
    Given a message with content "Missing traceability matrix for requirement REQ-042."
    Then the message card body displays "Missing traceability matrix for requirement REQ-042."
    And the body uses font "--sf-font-body" at 14px
    And the body color is "--sf-text"

  # -- Agent Role Colors -----------------------------------------------------

  Scenario Outline: Agent role badge uses distinct hue per role
    Given a message has agentRole "<role>"
    Then the agent badge text color is "<color>"
    And the agent badge background is "<color>" at 12% opacity

    Examples:
      | role           | color   |
      | spec-author    | #4FC3F7 |
      | gxp-reviewer   | #AB47BC |
      | test-designer  | #66BB6A |
      | architect      | #FF7043 |
      | validator      | #FFCA28 |
      | code-reviewer  | #26C6DA |
      | domain-expert  | #EC407A |
      | orchestrator   | #78909C |

  # -- Filter: Agent Role Dropdown -------------------------------------------

  Scenario: Agent role dropdown defaults to "all"
    Then the agent role dropdown displays "all"
    And all messages from all agent roles are shown

  Scenario: Filtering by agent role shows only matching messages
    Given the ACP session store contains messages from "gxp-reviewer" and "architect"
    When the user selects "gxp-reviewer" from the agent role dropdown
    Then only messages from "gxp-reviewer" are displayed

  # -- Filter: Message Types Multi-Select ------------------------------------

  Scenario: Message types multi-select defaults to no selection (show all)
    Then the message types multi-select has no options checked
    And all message types are displayed

  Scenario: Filtering by message type shows only matching messages
    When the user selects "finding" in the message types multi-select
    Then only messages with messageType "finding" are displayed

  Scenario: Multiple message types can be selected simultaneously
    When the user selects "finding" and "clarification" in the message types multi-select
    Then messages with messageType "finding" or "clarification" are displayed
    And messages with messageType "broadcast" are hidden

  # -- Filter: Severities Multi-Select --------------------------------------

  Scenario: Severities multi-select defaults to no selection (show all)
    Then the severities multi-select has no options checked
    And all severities are displayed

  Scenario: Filtering by severity shows only matching messages
    When the user selects "critical" in the severities multi-select
    Then only messages with severity "critical" are displayed

  # -- Filter: Phase Dropdown ------------------------------------------------

  Scenario: Phase dropdown defaults to "all"
    Then the phase dropdown displays "all"

  Scenario: Filtering by phase shows only matching messages
    When the user selects "planning" from the phase dropdown
    Then only messages from phase "planning" are displayed

  # -- Filter: Search Text ---------------------------------------------------

  Scenario: Search text filters messages by content
    When the user types "traceability" in the search input
    Then only messages whose content contains "traceability" are displayed

  Scenario: Search input has 300ms debounce
    When the user types rapidly in the search input
    Then filtering is applied after a 300ms debounce period

  # -- Filter: Presets -------------------------------------------------------

  Scenario: Open Critical preset sets severity and type filters
    When the user clicks the "Open Critical" preset button
    Then the severities filter is set to ["critical"]
    And the message types filter is set to ["finding"]

  Scenario: GxP Issues preset sets agent role filter
    When the user clicks the "GxP Issues" preset button
    Then the agent role filter is set to "gxp-reviewer"

  Scenario: Unresolved Clarifications preset sets message type filter
    When the user clicks the "Unresolved Clarifications" preset button
    Then the message types filter is set to ["clarification"]

  Scenario: Current Phase preset sets phase to active pipeline phase
    Given the active pipeline phase is "spec-authoring"
    When the user clicks the "Current Phase" preset button
    Then the phase filter is set to "spec-authoring"

  Scenario: Clicking an active preset toggles it off
    Given the "Open Critical" preset is active
    When the user clicks the "Open Critical" preset button again
    Then all session filters are reset to defaults

  # -- Real-Time Updates -----------------------------------------------------

  Scenario: New message appears at the top of the list
    Given the message list is populated
    When a new ACP session message is received via EVT-014
    Then the new message card appears at the top of the list
    And the new card animates in with a 200ms slide-in

  Scenario: New message indicator when scrolled away from top
    Given the user has scrolled down in the message list
    When a new ACP session message is received
    Then a "New messages" indicator appears at the top of the list area

  # -- Agent Badge Interaction -----------------------------------------------

  Scenario: Clicking an agent badge filters by that agent role
    Given a message card displays an agent badge for "architect"
    When the user clicks the "architect" agent badge
    Then the agent role filter is set to "architect"

  # -- Store Bindings --------------------------------------------------------

  Scenario: Page reads messages from ACP session store
    Given the ACP session store (STR-009) contains 3 messages
    Then 3 message cards are rendered

  Scenario: Page reads filter state from filter store
    Given the filter store (STR-001) acpSession.agentRole is "validator"
    Then only messages from agent role "validator" are displayed

  Scenario: Page reads session state from active session store
    Given the active session store (STR-002) has sessionId null
    Then the no-session state is displayed

  # -- Accessibility ---------------------------------------------------------

  Scenario: Message list has correct ARIA role
    Then the message entry list has role "log"
    And the message entry list has aria-live "polite"

  Scenario: Filter bar is labeled for ACP session context
    Then the filter bar has aria-label "Filter session messages"

  Scenario: Each message card has article role
    Given a message card is rendered
    Then the message card has role "article"
