@PG-005-task-board
Feature: Task Board Page
  As a user
  I want to view task groups in kanban or DAG format
  So that I can track task progress and understand dependencies

  Background:
    Given the application shell is rendered
    And the current route is "#tasks"

  # -- Route Guard -----------------------------------------------------------

  Scenario: Task board redirects to home when no session is active
    Given STR-002-active-session-store sessionId is null
    When the user navigates to "#tasks"
    Then the route changes to "#home"

  Scenario: Task board renders when a session is active
    Given STR-002-active-session-store sessionId is "session-123"
    When the user navigates to "#tasks"
    Then the task board page is rendered

  # -- Layout ----------------------------------------------------------------

  Scenario: Task board renders as single-column layout
    Given STR-002-active-session-store sessionId is "session-123"
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Task board has correct meta title
    Given STR-002-active-session-store sessionId is "session-123"
    Then the document title is "SpecForge — Tasks"

  Scenario: Filter bar appears above the content area
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-007-task-board-store has task groups
    Then CMP-004-filter-bar appears at the top
    And the content area appears below CMP-004

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state shows prompt
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then the text "No active session selected." is displayed
    And a link to "#home" is visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state shows no-tasks message
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-007-task-board-store has 0 task groups
    Then the text "No tasks have been generated yet." is displayed
    And the text "Run the pipeline to generate task groups." is visible

  Scenario: Empty state disables filter bar
    Given STR-007-task-board-store has 0 task groups
    Then CMP-004-filter-bar controls are disabled

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton cards in kanban view
    Given STR-001-filter-store tasks.viewMode is "kanban"
    And task data is being loaded
    Then skeleton task cards appear in each kanban column
    And CMP-004-filter-bar controls are disabled

  Scenario: Loading state shows skeleton items in DAG view
    Given STR-001-filter-store tasks.viewMode is "dag"
    And task data is being loaded
    Then skeleton list items appear at various indent levels
    And CMP-004-filter-bar controls are disabled

  # -- Kanban View -----------------------------------------------------------

  Scenario: Kanban view renders four columns
    Given STR-001-filter-store tasks.viewMode is "kanban"
    And STR-007-task-board-store has task groups
    Then CMP-013-kanban-board is rendered
    And 4 columns are visible with headers:
      | header      |
      | Pending     |
      | In Progress |
      | Completed   |
      | Blocked     |

  Scenario: Task cards appear in correct kanban columns
    Given STR-001-filter-store tasks.viewMode is "kanban"
    And a task group "Auth Setup" has status "in-progress"
    And a task group "DB Schema" has status "completed"
    Then "Auth Setup" card appears in the "In Progress" column
    And "DB Schema" card appears in the "Completed" column

  Scenario: Task card displays group information
    Given a task group with name "Auth Setup", status "in-progress", 5 tasks, 12 tests, requirementIds ["REQ-2"]
    Then the card displays the name "Auth Setup"
    And the card displays a status badge "in-progress"
    And the card displays "5 tasks / 12 tests"
    And the card displays "REQ-2"

  Scenario: Task card has status-colored left border
    Given a task group "Auth Setup" has status "in-progress"
    Then the "Auth Setup" card has a left border color of "--sf-accent"

  Scenario: Pending cards have muted left border
    Given a task group "Pending Task" has status "pending"
    Then the "Pending Task" card has a left border color of "--sf-text-muted"

  Scenario: Completed cards have green left border
    Given a task group "Done Task" has status "completed"
    Then the "Done Task" card has a left border color of "#22C55E"

  Scenario: Blocked cards have red left border
    Given a task group "Blocked Task" has status "blocked"
    Then the "Blocked Task" card has a left border color of "#FF3B3B"

  # -- DAG View --------------------------------------------------------------

  Scenario: DAG view renders when view mode is dag
    Given STR-001-filter-store tasks.viewMode is "dag"
    And STR-007-task-board-store has task groups
    Then CMP-014-dag-list is rendered
    And CMP-013-kanban-board is not rendered

  Scenario: DAG view shows indented list based on dependencies
    Given STR-001-filter-store tasks.viewMode is "dag"
    And task group "Root A" has no dependencies
    And task group "Child B" depends on "Root A"
    Then "Root A" appears at indent level 0
    And "Child B" appears at indent level 1

  Scenario: DAG list items show same information as kanban cards
    Given STR-001-filter-store tasks.viewMode is "dag"
    And a task group with name "Auth Setup", status "in-progress", 5 tasks, 12 tests, requirementIds ["REQ-2"]
    Then the list item displays name "Auth Setup"
    And the list item displays status "in-progress"
    And the list item displays "5 tasks / 12 tests"
    And the list item displays "REQ-2"

  # -- View Mode Toggle ------------------------------------------------------

  Scenario: View mode toggle switches from kanban to DAG
    Given STR-001-filter-store tasks.viewMode is "kanban"
    When the user clicks the "DAG" segment of the view mode toggle
    Then EVT-018-filter-changed is dispatched with view "tasks", key "viewMode", value "dag"
    And CMP-014-dag-list is rendered
    And CMP-013-kanban-board is not rendered

  Scenario: View mode toggle switches from DAG to kanban
    Given STR-001-filter-store tasks.viewMode is "dag"
    When the user clicks the "Kanban" segment of the view mode toggle
    Then EVT-018-filter-changed is dispatched with view "tasks", key "viewMode", value "kanban"
    And CMP-013-kanban-board is rendered
    And CMP-014-dag-list is not rendered

  Scenario: Active view mode segment is highlighted
    Given STR-001-filter-store tasks.viewMode is "kanban"
    Then the "Kanban" segment has "--sf-accent" color and "--sf-accent-dim" background
    And the "DAG" segment has "--sf-text-muted" color

  # -- Status Filter ---------------------------------------------------------

  Scenario: Status multi-select filters task groups
    Given task groups with statuses "pending", "in-progress", "completed", "blocked"
    When the user selects "in-progress" and "blocked" in the status multi-select
    Then EVT-018-filter-changed is dispatched with view "tasks", key "statuses", value ["in-progress", "blocked"]
    And only task groups with status "in-progress" or "blocked" are visible

  Scenario: Empty status selection shows all task groups
    Given the status multi-select has no selections
    Then all task groups are visible regardless of status

  Scenario: Status filter works in both kanban and DAG views
    Given STR-001-filter-store tasks.statuses is ["completed"]
    Then only completed task groups are visible in the current view mode

  # -- Requirement ID Filter -------------------------------------------------

  Scenario: Requirement ID filter narrows task groups
    Given task groups have requirementIds ["REQ-1", "REQ-2", "REQ-3"]
    When the user types "REQ-2" in the requirement ID input
    Then EVT-018-filter-changed is dispatched with view "tasks", key "requirementId", value "REQ-2"
    And only task groups whose requirementIds include "REQ-2" are visible

  Scenario: Partial requirement ID matches
    When the user types "REQ" in the requirement ID input
    Then all task groups whose requirementIds contain "REQ" are visible

  # -- Search Filter ---------------------------------------------------------

  Scenario: Search filter matches against group name
    Given a task group with name "Auth Setup"
    When the user types "Auth" in the search input
    Then the "Auth Setup" task group is visible
    And task groups not matching "Auth" are hidden

  Scenario: Search filter matches against requirement IDs
    Given a task group with requirementIds ["REQ-42"]
    When the user types "REQ-42" in the search input
    Then the task group is visible

  Scenario: Search is debounced at 300ms
    When the user types rapidly in the search input
    Then the filter event is dispatched only after 300ms of inactivity

  # -- Filter Chips ----------------------------------------------------------

  Scenario: Active filter chips appear for non-default filters
    Given the status filter has ["in-progress"] selected
    Then a filter chip "status: in-progress" appears
    And the chip has a remove button

  Scenario: Removing a filter chip clears that filter
    Given a filter chip "status: in-progress" is visible
    When the user clicks the remove button on the chip
    Then the status filter is cleared
    And the chip is removed

  # -- Navigation ------------------------------------------------------------

  Scenario: Task board is accessible from the nav rail
    Given STR-002-active-session-store sessionId is "session-123"
    When the user clicks the "Tasks" button in the nav rail
    Then the route changes to "#tasks"
    And the task board page is rendered
