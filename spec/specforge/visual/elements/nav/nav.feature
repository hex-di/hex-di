@ELM-nav
Feature: Nav Elements
  Navigation rail buttons, icons, labels, and the search shortcut button.

  Background:
    Given the application shell is rendered
    And the nav rail is visible on the left edge

  # ── ELM-001 Nav Button ──

  Scenario: Nav button renders in default state
    When no nav button is hovered or active
    Then each nav button has color "--sf-text-muted"
    And each nav button has background "transparent"

  Scenario: Nav button hover highlights the button
    When the user hovers over a nav button
    Then the button color changes to "--sf-text"
    And the button background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Active nav button shows accent indicator
    When the user clicks a nav button
    Then the button color changes to "--sf-accent"
    And the button background changes to "--sf-accent-dim"
    And a 3px solid accent left border indicator is visible

  Scenario: Clicking nav button triggers navigation
    When the user clicks the "Chat" nav button
    Then the action ACT-001-navigate-to-view is triggered with view "chat"

  Scenario: Only one nav button is active at a time
    Given the "Home" nav button is in the active state
    When the user clicks the "Chat" nav button
    Then the "Chat" nav button enters the active state
    And the "Home" nav button returns to the default state

  # ── ELM-002 Nav Icon ──

  Scenario: Nav icon inherits color from parent button
    When the parent nav button is in the "hover" state
    Then the nav icon color matches the parent button color "--sf-text"

  Scenario: Nav icon renders at correct size
    Then each nav icon is rendered at 20px font-size

  # ── ELM-003 Nav Label ──

  Scenario: Nav label renders below icon
    Then each nav label is rendered at 9px font-size
    And each nav label uses the "--sf-font-body" font family
    And each nav label does not wrap to a second line

  # ── ELM-004 Nav Search Button ──

  Scenario: Search button is pinned to bottom of rail
    Then the search button is positioned at the bottom of the nav rail
    And the search button has margin-top "auto"

  Scenario: Search button opens search overlay
    When the user clicks the search button
    Then the action ACT-003-open-search is triggered

  Scenario: Search button displays "/" icon
    Then the search button contains a "/" icon glyph
