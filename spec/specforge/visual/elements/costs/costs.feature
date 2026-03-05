@ELM-costs
Feature: Cost Elements
  Cost summary cards, budget gauge, phase/agent cost table rows, and the
  view mode toggle on the cost tracker view.

  Background:
    Given the cost tracker view is rendered
    And the cost tracker store contains cost data

  # -- ELM-063 Cost Summary Card --

  Scenario: Summary card renders title, value, and subtitle
    Then each cost summary card displays a title in 11px uppercase muted text
    And each cost summary card displays a value in 24px display font
    And each cost summary card displays a subtitle in 11px muted text

  Scenario: Summary card uses surface background
    Then each cost summary card has background "--sf-surface"
    And each cost summary card has border-radius "8px"

  Scenario: Four summary cards are displayed
    Then there are exactly 4 cost summary cards
    And one card shows the total cost
    And one card shows the input tokens count
    And one card shows the output tokens count
    And one card shows the budget percentage

  # -- ELM-064 Budget Gauge --

  Scenario: Budget gauge renders as circular arc with center label
    Then the budget gauge renders a circular arc
    And the budget gauge displays a percentage label in the center
    And the center label uses the display font at 20px

  Scenario: Budget gauge safe zone coloring
    Given the budget percent is 40
    Then the gauge arc color is "--sf-accent"
    And the gauge has no animation

  Scenario: Budget gauge warning zone coloring
    Given the budget percent is 70
    Then the gauge arc color is "#FF8C00"
    And the gauge has no animation

  Scenario: Budget gauge critical zone coloring
    Given the budget percent is 90
    Then the gauge arc color is "#FF3B3B"
    And the gauge has no animation

  Scenario: Budget gauge exhausted zone with pulse animation
    Given the budget percent is 97
    Then the gauge arc color is "#FF3B3B"
    And the gauge has a pulsing animation at 1.5s interval

  Scenario: Budget gauge zone threshold at 60%
    Given the budget percent is 59
    Then the gauge arc color is "--sf-accent"

  Scenario: Budget gauge zone threshold at 60% boundary
    Given the budget percent is 60
    Then the gauge arc color is "#FF8C00"

  Scenario: Budget gauge zone threshold at 85% boundary
    Given the budget percent is 85
    Then the gauge arc color is "#FF3B3B"

  Scenario: Budget gauge zone threshold at 95% boundary
    Given the budget percent is 95
    Then the gauge arc color is "#FF3B3B"
    And the gauge has a pulsing animation at 1.5s interval

  Scenario: Budget gauge track uses elevated surface
    Then the gauge track color is "--sf-surface-elevated"
    And the gauge track stroke width is "8px"

  # -- ELM-065 Phase Cost Row --

  Scenario: Phase cost row displays all columns
    Then each phase cost row displays a phase name
    And each phase cost row displays input tokens in monospace font
    And each phase cost row displays output tokens in monospace font
    And each phase cost row displays cost in bold monospace font

  Scenario: Phase cost row default state
    When no phase row is hovered
    Then each phase row has background "transparent"
    And each phase row has a bottom border using "--sf-border"

  Scenario: Phase cost row hover state
    When the user hovers over a phase cost row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  Scenario: Token values are right-aligned
    Then each input token cell has text-align "right"
    And each output token cell has text-align "right"
    And each cost cell has text-align "right"

  # -- ELM-066 Agent Cost Row --

  Scenario: Agent cost row displays all columns including invocations
    Then each agent cost row displays an agent role badge
    And each agent cost row displays input tokens in monospace font
    And each agent cost row displays output tokens in monospace font
    And each agent cost row displays cost in bold monospace font
    And each agent cost row displays an invocations count

  Scenario: Agent cost row uses role-colored badge
    Given an agent cost row for "spec-author"
    Then the row contains an agent role badge with background "#8B5CF6"

  Scenario: Agent cost row default state
    When no agent row is hovered
    Then each agent row has background "transparent"

  Scenario: Agent cost row hover state
    When the user hovers over an agent cost row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  # -- ELM-067 Cost View Mode Toggle --

  Scenario: View mode toggle renders two options
    Then the cost view mode toggle contains a "By Phase" option
    And the cost view mode toggle contains a "By Agent" option

  Scenario: Active cost view mode is highlighted
    Given the current cost view mode is "by-phase"
    Then the "By Phase" option has color "--sf-accent"
    And the "By Phase" option has background "--sf-accent-dim"
    And the "By Agent" option has color "--sf-text-muted"
    And the "By Agent" option has background "--sf-surface"

  Scenario: Clicking toggle switches cost view mode
    Given the current cost view mode is "by-phase"
    When the user clicks the "By Agent" toggle option
    Then the action ACT-016-set-filter is triggered with view "costs", key "viewMode", value "by-agent"

  Scenario: Toggle hover highlights the option
    When the user hovers over the inactive toggle option
    Then the option color changes to "--sf-text"
    And the option background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Only one toggle option is active at a time
    Given the current cost view mode is "by-phase"
    When the user clicks the "By Agent" toggle option
    Then the "By Agent" option enters the active state
    And the "By Phase" option returns to the default state
