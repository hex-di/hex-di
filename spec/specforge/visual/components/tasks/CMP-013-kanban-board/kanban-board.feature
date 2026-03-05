@CMP-013-kanban-board
Feature: Kanban Board
  Kanban-style columns showing task groups organized by status.

  Background:
    Given the tasks view is rendered in "kanban" mode
    And the kanban board is visible

  # -- Column Rendering --

  Scenario: Board renders four status columns
    Then the board displays columns "Pending", "In Progress", "Completed", "Blocked"

  Scenario: Columns have equal width with minimum
    Then each column has flex "1 1 0"
    And each column has min-width "240px"

  Scenario: Columns have surface-alt background
    Then each column has background "var(--sf-surface-alt)"
    And each column has border-radius "8px"

  # -- Column Headers --

  Scenario: Each column header shows status label
    Then the "Pending" column header displays "Pending"
    And the "In Progress" column header displays "In Progress"
    And the "Completed" column header displays "Completed"
    And the "Blocked" column header displays "Blocked"

  Scenario: Each column header shows task count
    Given the "Pending" column contains 3 task groups
    Then the "Pending" column header contains an ELM-051-task-count-indicator showing "3"

  Scenario: Column headers have status-specific colors
    Then the "Pending" column header has color "--sf-text-muted"
    And the "In Progress" column header has color "--sf-accent"
    And the "Completed" column header has color "--sf-success"
    And the "Blocked" column header has color "--sf-error"

  Scenario: Column headers have bottom border separator
    Then each column header has border-bottom "1px solid var(--sf-border)"

  # -- Task Group Cards --

  Scenario: Task groups are distributed into correct columns
    Given a task group has status "in-progress"
    Then the task group card appears in the "In Progress" column

  Scenario: Each task group renders as ELM-049 card
    Given the "Pending" column contains 2 task groups
    Then the "Pending" column contains 2 ELM-049-task-group-card elements

  Scenario: Cards display status badge
    Then each ELM-049-task-group-card contains an ELM-050-task-status-badge

  Scenario: Cards are stacked vertically within column
    Then cards within each column are ordered top to bottom
    And cards have gap "8px" between them

  # -- Empty State --

  Scenario: Empty column shows "No tasks" message
    Given the "Blocked" column contains 0 task groups
    Then the "Blocked" column displays "No tasks"
    And the empty message uses color "--sf-text-muted"
    And the empty message is italic
    And the empty message is centered

  Scenario: Multiple empty columns each show their own message
    Given the "Pending" column contains 0 task groups
    And the "Blocked" column contains 0 task groups
    Then both the "Pending" and "Blocked" columns display "No tasks"

  # -- Filtering --

  Scenario: Filtering by status hides non-matching columns content
    Given the filter store tasks.statuses is ["in-progress"]
    Then only task groups with status "in-progress" are displayed
    And other columns show "No tasks"

  Scenario: Filtering by requirement ID narrows cards
    Given the filter store tasks.requirementId is "REQ-003"
    Then only task groups matching "REQ-003" are displayed

  Scenario: Search filter matches task group names
    Given the filter store tasks.search is "auth"
    Then only task groups whose name contains "auth" are displayed

  # -- Layout --

  Scenario: Board uses horizontal flex with overflow
    Then the board has display "flex"
    And the board has flex-direction "row"
    And the board has gap "16px"
    And the board has overflow-x "auto"

  Scenario: Board has outer padding
    Then the board has padding "16px"

  # -- Accessibility --

  Scenario: Board has correct ARIA attributes
    Then the component has role "region"
    And the component has aria-label "Task board"
