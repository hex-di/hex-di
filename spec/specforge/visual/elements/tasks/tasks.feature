@ELM-tasks
Feature: Task Elements
  Task group cards, status badges, count indicators, and the view mode toggle
  on the task board view.

  Background:
    Given the task board view is rendered
    And the task board store contains at least one task group

  # -- ELM-049 Task Group Card --

  Scenario: Task group card renders with group name and requirement IDs
    Then each task group card displays the group name at 14px
    And each task group card displays associated requirement IDs at 11px in muted color

  Scenario: Task group card has left border colored by pending status
    Given a task group with status "pending"
    Then the card border-left color is "--sf-text-muted"

  Scenario: Task group card has left border colored by in-progress status
    Given a task group with status "in-progress"
    Then the card border-left color is "--sf-accent"

  Scenario: Task group card has left border colored by completed status
    Given a task group with status "completed"
    Then the card border-left color is "#22C55E"

  Scenario: Task group card has left border colored by blocked status
    Given a task group with status "blocked"
    Then the card border-left color is "#FF3B3B"

  Scenario: Task group card hover shows elevated background
    When the user hovers over a task group card
    Then the card background changes to "rgba(0, 240, 255, 0.03)"
    And a subtle box shadow is applied

  Scenario: Task group card default background is surface
    When no task group card is hovered
    Then each task group card has background "--sf-surface"

  # -- ELM-050 Task Status Badge --

  Scenario: Status badge renders as pill with correct color for pending
    Given a task group with status "pending"
    Then the status badge text color is "--sf-text-muted"
    And the status badge background is "rgba(148, 163, 184, 0.15)"

  Scenario: Status badge renders with accent for in-progress
    Given a task group with status "in-progress"
    Then the status badge text color is "--sf-accent"
    And the status badge background is "--sf-accent-dim"

  Scenario: Status badge renders green for completed
    Given a task group with status "completed"
    Then the status badge text color is "#22C55E"
    And the status badge background is "rgba(34, 197, 94, 0.12)"

  Scenario: Status badge renders red for blocked
    Given a task group with status "blocked"
    Then the status badge text color is "#FF3B3B"
    And the status badge background is "rgba(255, 59, 59, 0.12)"

  Scenario: Status badge has pill shape
    Then each status badge has border-radius "9999px"
    And each status badge has font-size "11px"

  # -- ELM-051 Task Count Indicator --

  Scenario: Task count indicator displays task and test counts
    Given a task group with 5 tasks and 12 tests
    Then the count indicator displays "5 tasks / 12 tests"

  Scenario: Task count indicator uses muted style
    Then each task count indicator has font-size "11px"
    And each task count indicator has color "--sf-text-muted"

  # -- ELM-052 View Mode Toggle --

  Scenario: View mode toggle renders two icon buttons
    Then the view mode toggle contains a "kanban" icon button
    And the view mode toggle contains a "dag" icon button

  Scenario: Active view mode is highlighted with accent
    Given the current view mode is "kanban"
    Then the "kanban" button has color "--sf-accent"
    And the "kanban" button has background "--sf-accent-dim"
    And the "dag" button has color "--sf-text-muted"
    And the "dag" button has background "--sf-surface"

  Scenario: Clicking toggle switches view mode
    Given the current view mode is "kanban"
    When the user clicks the "dag" toggle button
    Then the action ACT-016-set-filter is triggered with view "tasks", key "viewMode", value "dag"

  Scenario: Toggle hover highlights the button
    When the user hovers over the inactive toggle button
    Then the button color changes to "--sf-text"
    And the button background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Only one toggle mode is active at a time
    Given the current view mode is "kanban"
    When the user clicks the "dag" toggle button
    Then the "dag" button enters the active state
    And the "kanban" button returns to the default state
