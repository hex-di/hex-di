@ELM-acp-session
Feature: ACP Session Elements
  Message cards, agent role badges, severity indicators, message type icons,
  phase tags, and preset filter buttons on the ACP session view.

  Background:
    Given the ACP session view is rendered
    And the ACP session store contains at least one message

  # -- ELM-057 Session Message Card --

  Scenario: Message card renders with agent badge, content, and timestamp
    Then each message card displays an agent role badge
    And each message card displays the message content
    And each message card displays a timestamp in 11px muted text

  Scenario: Message card border is red for critical severity
    Given a message with severity "critical"
    Then the card border-left color is "#FF3B3B"

  Scenario: Message card border is orange for major severity
    Given a message with severity "major"
    Then the card border-left color is "#FF8C00"

  Scenario: Message card border is yellow for minor severity
    Given a message with severity "minor"
    Then the card border-left color is "#FFD600"

  Scenario: Message card border is blue for observation severity
    Given a message with severity "observation"
    Then the card border-left color is "#4FC3F7"

  Scenario: Message card hover state
    When the user hovers over a message card
    Then the card background changes to "rgba(0, 240, 255, 0.03)"

  Scenario: Message card default background
    When no message card is hovered
    Then each message card has background "--sf-surface"

  # -- ELM-058 Agent Role Badge --

  Scenario: Agent role badge for discovery-agent
    Given a message from agent "discovery-agent"
    Then the role badge has background "#6366F1"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for spec-author
    Given a message from agent "spec-author"
    Then the role badge has background "#8B5CF6"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for reviewer
    Given a message from agent "reviewer"
    Then the role badge has background "#EC4899"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for feedback-synthesizer
    Given a message from agent "feedback-synthesizer"
    Then the role badge has background "#F97316"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for task-decomposer
    Given a message from agent "task-decomposer"
    Then the role badge has background "#14B8A6"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for dev-agent
    Given a message from agent "dev-agent"
    Then the role badge has background "#3B82F6"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for codebase-analyzer
    Given a message from agent "codebase-analyzer"
    Then the role badge has background "#10B981"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge for coverage-agent
    Given a message from agent "coverage-agent"
    Then the role badge has background "#F59E0B"
    And the role badge has text color "#FFFFFF"

  Scenario: Agent role badge text style
    Then each agent role badge has font-size "10px"
    And each agent role badge has text-transform "uppercase"
    And each agent role badge has font-weight "600"

  # -- ELM-059 Severity Indicator --

  Scenario: Severity indicator is a 3px left border
    Then each message card has a left border width of "3px"
    And the border is rendered at the card's left edge

  # -- ELM-060 Message Type Icon --

  Scenario: Finding message shows magnifier icon
    Given a message of type "finding"
    Then the message type icon is a magnifier
    And the icon color is "--sf-text-muted"

  Scenario: Clarification message shows question icon
    Given a message of type "clarification"
    Then the message type icon is a question mark
    And the icon color is "--sf-text-muted"

  Scenario: Broadcast message shows megaphone icon
    Given a message of type "broadcast"
    Then the message type icon is a megaphone
    And the icon color is "--sf-text-muted"

  Scenario: Message type icon renders at 14px
    Then each message type icon has font-size "14px"

  # -- ELM-061 Phase Tag --

  Scenario: Phase tag displays the phase name
    Given a message posted during the "review" phase
    Then the phase tag displays "review"

  Scenario: Phase tag visual style
    Then each phase tag has font-size "10px"
    And each phase tag has background "--sf-surface-elevated"
    And each phase tag has border-radius "4px"
    And each phase tag has color "--sf-text-muted"

  # -- ELM-062 Preset Button --

  Scenario: Preset button default state
    When no preset is active
    Then each preset button has color "--sf-text-muted"
    And each preset button has background "transparent"
    And each preset button has border-color "--sf-border"

  Scenario: Preset button hover state
    When the user hovers over a preset button
    Then the button color changes to "--sf-text"
    And the button background changes to "rgba(0, 240, 255, 0.05)"
    And the button border-color changes to "--sf-text-muted"

  Scenario: Active preset button is highlighted
    Given the active preset is "Open Critical"
    Then the "Open Critical" button has color "--sf-accent"
    And the "Open Critical" button has background "--sf-accent-dim"
    And the "Open Critical" button has border-color "--sf-accent"

  Scenario: Clicking preset button triggers filter action
    When the user clicks the "Open Critical" preset button
    Then the action ACT-016-set-filter is triggered with view "acp-session", key "preset", value "Open Critical"

  Scenario: Only one preset button is active at a time
    Given the active preset is "Open Critical"
    When the user clicks the "GxP Issues" preset button
    Then the "GxP Issues" button enters the active state
    And the "Open Critical" button returns to the default state
