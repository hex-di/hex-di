@PG-001-home
Feature: Home Page
  As a user
  I want a landing view that manages my SpecForge sessions
  So that I can create, browse, filter, and select sessions

  Background:
    Given the application shell is rendered
    And the current route is "#home"

  # -- Layout ----------------------------------------------------------------

  Scenario: Home page renders as single-column layout
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Home page has correct meta title
    Then the document title is "SpecForge — Home"

  # -- Component Composition -------------------------------------------------

  Scenario: Populated home page renders all three components
    Given the sessions store contains 3 sessions
    Then the page contains CMP-004-filter-bar at the top
    And the page contains CMP-006-new-session-form below the filter bar
    And the page contains CMP-005-session-table as the main content

  Scenario: Components appear in correct vertical order
    Given the sessions store contains 1 session
    Then CMP-004-filter-bar appears above CMP-006-new-session-form
    And CMP-006-new-session-form appears above CMP-005-session-table

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state shows welcome message when no sessions exist
    Given the sessions store contains 0 sessions
    And the sessions store isLoading is false
    Then a welcome message "Welcome to SpecForge" is displayed
    And the text "Create your first session to get started." is visible

  Scenario: Empty state hides the filter bar
    Given the sessions store contains 0 sessions
    And the sessions store isLoading is false
    Then CMP-004-filter-bar is not visible

  Scenario: Empty state shows the new session form
    Given the sessions store contains 0 sessions
    And the sessions store isLoading is false
    Then CMP-006-new-session-form is visible

  Scenario: Empty state shows session table empty text
    Given the sessions store contains 0 sessions
    And the sessions store isLoading is false
    Then the session table displays "No sessions found. Create one to get started."

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton rows
    Given the sessions store isLoading is true
    Then the session table displays skeleton placeholder rows
    And the skeleton rows pulse with a loading animation

  Scenario: Loading state disables filter controls
    Given the sessions store isLoading is true
    Then all filter bar controls are disabled

  Scenario: Loading state keeps new session form interactive
    Given the sessions store isLoading is true
    Then CMP-006-new-session-form is interactive

  # -- Error State -----------------------------------------------------------

  Scenario: Error state shows error banner
    Given the sessions store has an error "Failed to load sessions"
    Then an error banner is displayed between the filter bar and the session form
    And the error banner contains the text "Failed to load sessions"
    And the error banner has a left border color of "--sf-error"

  Scenario: Error banner can be dismissed
    Given the sessions store has an error "Network timeout"
    When the user clicks the dismiss button on the error banner
    Then the error banner is no longer visible

  # -- Populated State -------------------------------------------------------

  Scenario: Populated state renders session rows
    Given the sessions store contains 5 sessions
    Then the session table renders 5 rows
    And each row displays package name, spec path, status, mode, and last activity

  Scenario: Session rows display relative timestamps
    Given a session has lastActivityAt "2026-02-27T10:00:00Z"
    And the current time is "2026-02-27T10:05:00Z"
    Then the last activity column displays "5 min ago"

  # -- Filter Interaction ----------------------------------------------------

  Scenario: Changing the status filter updates the session list
    Given the sessions store contains sessions with statuses "running", "paused", "completed"
    When the user sets the status filter to "running"
    Then EVT-018-filter-changed is dispatched with view "home", key "status", value "running"
    And only sessions with status "running" are visible in the table

  Scenario: Changing the pipeline mode filter narrows results
    Given the sessions store contains sessions with modes "spec-author", "full-pipeline"
    When the user sets the pipeline mode filter to "spec-author"
    Then EVT-018-filter-changed is dispatched with view "home", key "pipelineMode", value "spec-author"
    And only sessions with pipelineMode "spec-author" are visible

  Scenario: Typing in the search filter narrows results
    When the user types "guard" in the search filter
    Then EVT-018-filter-changed is dispatched with view "home", key "search", value "guard"
    And only sessions whose package name or spec path contains "guard" are visible

  Scenario: Changing the sort order re-orders sessions
    When the user changes the sort dropdown to "created"
    Then EVT-018-filter-changed is dispatched with view "home", key "sort", value "created"
    And the session table is sorted by createdAt descending

  Scenario: Active filter chips appear when filters are non-default
    Given the status filter is set to "running"
    Then a filter chip with text "status: running" appears below the filter controls
    And the chip has a remove button

  Scenario: Removing a filter chip resets that filter
    Given the status filter is set to "running"
    When the user clicks the remove button on the "status: running" chip
    Then EVT-018-filter-changed is dispatched with view "home", key "status", value "all"
    And the chip is removed

  # -- Create Session --------------------------------------------------------

  Scenario: Submitting the new session form creates a session
    When the user enters "hex-di/core" in the package name input
    And the user enters "spec/core" in the spec path input
    And the user clicks the "Create Session" button
    Then ACT-008-create-session is dispatched with packageName "hex-di/core" and specPath "spec/core"

  Scenario: Successful session creation navigates to chat
    When a new session is created successfully
    Then EVT-003-session-created is dispatched
    And STR-002-active-session-store is updated with the new session
    And the route changes to "#chat"

  Scenario: Create button is disabled when fields are empty
    Given the package name input is empty
    And the spec path input is empty
    Then the "Create Session" button is disabled

  # -- Select Session --------------------------------------------------------

  Scenario: Clicking a session row selects it and navigates to chat
    Given the sessions store contains a session with id "session-123"
    When the user clicks the row for session "session-123"
    Then ACT-006-select-session is dispatched with sessionId "session-123"
    And STR-002-active-session-store sessionId becomes "session-123"
    And the route changes to "#chat"

  # -- Resume Session --------------------------------------------------------

  Scenario: Resume button is visible only on paused sessions
    Given a session with id "session-456" has status "paused"
    Then the resume button is visible on the row for session "session-456"

  Scenario: Resume button is hidden on non-paused sessions
    Given a session with id "session-789" has status "running"
    Then the resume button is not visible on the row for session "session-789"

  Scenario: Clicking resume dispatches the resume action
    Given a session with id "session-456" has status "paused"
    When the user clicks the resume button for session "session-456"
    Then ACT-009-resume-session is dispatched with sessionId "session-456"

  # -- Delete Session --------------------------------------------------------

  Scenario: Clicking delete shows a confirmation dialog
    Given a session with id "session-123" exists
    When the user clicks the delete button for session "session-123"
    Then a confirmation dialog is displayed

  Scenario: Confirming delete removes the session
    Given a confirmation dialog is displayed for deleting session "session-123"
    When the user confirms the deletion
    Then ACT-010-delete-session is dispatched with sessionId "session-123"
    And EVT-007-session-deleted is dispatched
    And the session is removed from the table

  Scenario: Deleting the active session clears STR-002
    Given session "session-123" is the active session in STR-002
    When the user deletes session "session-123"
    Then STR-002-active-session-store sessionId becomes null
    And STR-002-active-session-store status becomes "idle"

  # -- Navigation ------------------------------------------------------------

  Scenario: Home is the default route
    Given no route hash is present
    Then the application navigates to "#home"

  Scenario: Home page is accessible from the nav rail
    When the user clicks the "Home" button in the nav rail
    Then the route changes to "#home"
    And the home page is rendered
