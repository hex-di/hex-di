@CMP-016
Feature: Message Entry List
  A chronological list of ACP session messages with presets and filtering.

  Background:
    Given the message entry list component is rendered
    And STR-009 acp-session-store is initialized with messages
    And STR-001 filter-store has session filters at default values

  # -- Rendering --

  Scenario: All messages render as cards in chronological order
    Given the message store contains 5 messages
    And no filters are active
    Then 5 message cards are rendered
    And cards are ordered by timestamp descending (newest first)

  Scenario: Each message card displays required elements
    Given a message with agentRole "gxp-reviewer", messageType "finding", severity "critical", phase "review"
    Then the card has a 3px left border colored "#FF3B3B"
    And the card contains an agent role badge "GxP Reviewer"
    And the card contains a message type icon "!"
    And the card contains a phase tag "review"
    And the card displays the message content
    And the card displays a timestamp

  # -- Severity border colors --

  Scenario Outline: Message card left border color by severity
    Given a message with severity "<severity>"
    Then the card left border color is "<color>"

    Examples:
      | severity    | color   |
      | critical    | #FF3B3B |
      | major       | #FF8C00 |
      | minor       | #FFD600 |
      | observation | #4FC3F7 |

  # -- Message type icons --

  Scenario Outline: Message type icon matches type
    Given a message with messageType "<type>"
    Then the message type icon displays "<icon>"

    Examples:
      | type           | icon |
      | finding        | !    |
      | clarification  | ?    |
      | broadcast      | i    |

  # -- Agent role badges --

  Scenario: Agent role badge displays readable name
    Given a message with agentRole "test-designer"
    Then the agent role badge displays "Test Designer"

  Scenario: All 8 agent roles are supported
    Then the component supports agent roles: spec-author, gxp-reviewer, test-designer, architect, validator, code-reviewer, domain-expert, orchestrator

  # -- Preset buttons --

  Scenario: Preset buttons are visible at top of list
    Then 4 preset buttons are visible
    And the presets are "Open Critical", "GxP Issues", "Unresolved Clarifications", "Current Phase"

  Scenario: Open Critical preset shows critical count badge
    Given the message store has 3 critical messages
    Then the "Open Critical" preset button shows a count badge "3"

  Scenario: Clicking Open Critical preset filters to critical messages
    When the user clicks the "Open Critical" preset button
    Then the acpSession.severities filter is set to ["critical"]
    And only messages with severity "critical" are displayed

  Scenario: Clicking GxP Issues preset filters to gxp-reviewer messages
    When the user clicks the "GxP Issues" preset button
    Then the acpSession.agentRole filter is set to "gxp-reviewer"
    And only messages from agent "gxp-reviewer" are displayed

  Scenario: Clicking Unresolved Clarifications preset filters to clarifications
    When the user clicks the "Unresolved Clarifications" preset button
    Then the acpSession.messageTypes filter is set to ["clarification"]
    And only messages with type "clarification" are displayed

  Scenario: Clicking Current Phase preset filters to current phase
    Given the active pipeline phase is "review"
    When the user clicks the "Current Phase" preset button
    Then the acpSession.phase filter is set to "review"
    And only messages from phase "review" are displayed

  Scenario: Clicking the active preset deactivates it
    Given the "Open Critical" preset is active
    When the user clicks the "Open Critical" preset button
    Then the preset is deactivated
    And all session filters reset to defaults

  # -- Filtering --

  Scenario: Filter by agent role
    Given messages from agents "architect", "gxp-reviewer", and "test-designer"
    When the filter acpSession.agentRole is set to "architect"
    Then only messages from "architect" are displayed

  Scenario: Filter by message type
    Given messages with types "finding", "clarification", and "broadcast"
    When the filter acpSession.messageTypes is set to ["finding"]
    Then only messages with type "finding" are displayed

  Scenario: Filter by severity
    Given messages with severities "critical", "major", and "minor"
    When the filter acpSession.severities is set to ["critical", "major"]
    Then only messages with severity "critical" or "major" are displayed

  Scenario: Filter by phase
    When the filter acpSession.phase is set to "analysis"
    Then only messages from phase "analysis" are displayed

  Scenario: Search filters by content text
    When the filter acpSession.search is set to "audit trail"
    Then only messages containing "audit trail" in content are displayed

  Scenario: Multiple filters combine with AND logic
    When the filter acpSession.agentRole is set to "gxp-reviewer"
    And the filter acpSession.severities is set to ["critical"]
    Then only messages from "gxp-reviewer" with severity "critical" are displayed

  # -- Empty state --

  Scenario: Empty state when no messages exist
    Given the message store contains 0 messages
    Then the text "No messages match current filters." is displayed
    And no message cards are visible

  Scenario: Empty state after filtering removes all results
    Given the message store contains 5 messages none with severity "critical"
    When the filter acpSession.severities is set to ["critical"]
    Then the text "No messages match current filters." is displayed

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the message entry list has role "feed"
    And the message entry list has aria-label "Session messages"
