@ELM-filters
Feature: Filter Elements
  Dropdown, multi-select, toggle, text input, chip, and chip remove controls.

  Background:
    Given a view with filter controls is rendered

  # ── ELM-014 Filter Dropdown ──

  Scenario: Filter dropdown renders with muted border
    Then the filter dropdown has border "1px solid rgba(0, 240, 255, 0.15)"
    And the filter dropdown has background "--sf-bg"

  Scenario: Filter dropdown shows accent border on focus
    When the user focuses the filter dropdown
    Then the filter dropdown border-color changes to "--sf-accent"

  Scenario: Changing dropdown selection triggers set-filter action
    When the user selects a new option in the filter dropdown
    Then the action ACT-016-set-filter is triggered

  Scenario: Disabled dropdown is non-interactive
    Given the filter dropdown is disabled
    Then the filter dropdown has opacity 0.4
    And the filter dropdown does not respond to clicks

  # ── ELM-015 Filter Dropdown Label ──

  Scenario: Dropdown label renders above the dropdown
    Then the dropdown label is rendered at 11px
    And the dropdown label color is "--sf-text-muted"

  # ── ELM-016 Filter Multi-Select Trigger ──

  Scenario: Multi-select trigger shows selected count
    Given 3 options are selected in the multi-select
    Then the trigger button displays a count badge showing "3"
    And the count badge has background "--sf-accent-dim" and color "--sf-accent"

  Scenario: Clicking multi-select trigger opens dropdown
    When the user clicks the multi-select trigger
    Then the multi-select dropdown is visible
    And the trigger border-color changes to "--sf-accent"

  Scenario: Hovering multi-select trigger highlights it
    When the user hovers over the multi-select trigger
    Then the trigger background changes to "rgba(0, 240, 255, 0.05)"

  # ── ELM-017 Filter Multi-Select Option ──

  Scenario: Multi-select option displays checkbox and label
    Then each multi-select option contains a 14px checkbox
    And each multi-select option contains a 12px label

  Scenario: Hovering an option highlights it
    When the user hovers over a multi-select option
    Then the option background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Toggling an option triggers set-filter action
    When the user checks a multi-select option
    Then the action ACT-016-set-filter is triggered

  # ── ELM-018 Filter Toggle ──

  Scenario: Unchecked toggle has muted label
    Given the filter toggle is unchecked
    Then the toggle label color is "--sf-text-muted"

  Scenario: Checked toggle has full text color label
    Given the filter toggle is checked
    Then the toggle label color is "--sf-text"

  Scenario: Changing toggle triggers toggle-filter action
    When the user toggles the filter checkbox
    Then the action ACT-017-toggle-filter is triggered

  Scenario: Toggle checkbox uses accent color
    Then the toggle checkbox has accent-color "--sf-accent"

  # ── ELM-019 Filter Text Input ──

  Scenario: Text input renders with minimum width
    Then the filter text input has min-width 120px

  Scenario: Text input debounces change events
    When the user types "test" in the filter text input
    And 300ms have elapsed since the last keystroke
    Then the action ACT-016-set-filter is triggered

  Scenario: Text input shows accent border on focus
    When the user focuses the filter text input
    Then the input border-color changes to "--sf-accent"

  # ── ELM-020 Filter Chip ──

  Scenario: Active filter chip renders as a pill
    Given an active filter with value "running"
    Then a filter chip is displayed with text "running"
    And the chip has background "--sf-accent-dim"
    And the chip has color "--sf-accent"
    And the chip has border-radius 12px

  # ── ELM-021 Filter Chip Remove ──

  Scenario: Chip remove button is visible inside the chip
    Then the filter chip contains a remove button with an "X" icon

  Scenario: Hovering chip remove button increases opacity
    Given the chip remove button has opacity 0.7
    When the user hovers over the chip remove button
    Then the chip remove button opacity changes to 1

  Scenario: Clicking chip remove button removes the filter
    When the user clicks the chip remove button
    Then the action ACT-018-remove-filter is triggered
