@CMP-014-dag-list
Feature: DAG List
  Alternative task view showing tasks as a dependency-ordered list with indentation.

  Background:
    Given the tasks view is rendered in "list" mode
    And the DAG list is visible

  # -- Rendering --

  Scenario: List renders one row per task group
    Given the groups array contains 6 task groups
    Then the list displays 6 rows

  Scenario: Each row contains a status badge and group name
    Then each row contains an ELM-050-task-status-badge
    And each row displays the task group name

  # -- Indentation --

  Scenario: Root-level tasks have no indentation
    Given a task group has dependency depth 0
    Then the row has padding-left "0px" (base padding only)

  Scenario: Depth-1 tasks are indented 24px
    Given a task group has dependency depth 1
    Then the row has additional padding-left of "24px"

  Scenario: Depth-2 tasks are indented 48px
    Given a task group has dependency depth 2
    Then the row has additional padding-left of "48px"

  Scenario: Indentation caps at depth 6 (144px)
    Given a task group has dependency depth 8
    Then the row has additional padding-left of "144px"

  # -- Dependency Order --

  Scenario: Tasks are ordered by dependency topology
    Given task A has no dependencies
    And task B depends on task A
    And task C depends on task B
    Then task A appears before task B in the list
    And task B appears before task C in the list

  Scenario: Parent tasks appear before child tasks
    Given task "Setup" is at depth 0
    And task "Implement" depends on "Setup" at depth 1
    Then "Setup" appears above "Implement" in the list

  # -- Dependency Lines --

  Scenario: Connector lines link parent to child tasks
    Given a task at depth 0 has children at depth 1
    Then vertical and horizontal connector lines are drawn
    And the lines use color "var(--sf-border)"
    And the lines have width "1px"

  # -- Requirement Tags --

  Scenario: Requirement IDs shown as tags on each group
    Given a task group is associated with requirements "REQ-003" and "REQ-005"
    Then the row displays tags "REQ-003" and "REQ-005"
    And each tag has font-size "11px"
    And each tag uses font-family "--sf-font-mono"
    And each tag has color "--sf-text-muted"
    And each tag has background "var(--sf-surface-alt)"

  Scenario: Tags positioned at end of row
    Then requirement tags are aligned to the right side of the row

  # -- Row Interactions --

  Scenario: Row highlights on hover
    When the user hovers over a task row
    Then the row background changes to "var(--sf-surface-alt)"

  Scenario: Row has rounded corners
    Then each row has border-radius "6px"

  # -- Empty State --

  Scenario: Empty state when no task groups exist
    Given the groups array is empty
    Then the list displays "No tasks to display."
    And the empty message uses color "--sf-text-muted"
    And the empty message is italic
    And the empty message is centered
    And the empty message has vertical padding of 48px

  # -- Filtering --

  Scenario: Filtering by status narrows displayed rows
    Given the filter store tasks.statuses is ["in-progress"]
    Then only task groups with status "in-progress" are displayed

  Scenario: Filtering by requirement ID narrows displayed rows
    Given the filter store tasks.requirementId is "REQ-003"
    Then only task groups associated with "REQ-003" are displayed

  Scenario: Search filter matches task group names
    Given the filter store tasks.search is "test"
    Then only task groups whose name contains "test" are displayed

  # -- Layout --

  Scenario: List has correct layout properties
    Then the list has display "flex"
    And the list has flex-direction "column"
    And the list has gap "4px"
    And the list has padding "16px"
    And the list has overflow-y "auto"

  # -- Store Binding --

  Scenario: Component reads from task board store
    Given STR-007 task-board-store groups contains 4 task groups
    Then 4 rows are rendered in the list

  # -- Accessibility --

  Scenario: List has correct ARIA attributes
    Then the component has role "list"
    And the component has aria-label "Task dependency list"
