@PG-006-coverage-dashboard
Feature: Coverage Dashboard Page
  As a user
  I want to view file-level coverage analysis
  So that I can identify gaps and track coverage progress

  Background:
    Given the application shell is rendered
    And the current route is "#coverage"

  # -- Route Guard -----------------------------------------------------------

  Scenario: Coverage dashboard redirects to home when no session is active
    Given STR-002-active-session-store sessionId is null
    When the user navigates to "#coverage"
    Then the route changes to "#home"

  Scenario: Coverage dashboard renders when a session is active
    Given STR-002-active-session-store sessionId is "session-123"
    When the user navigates to "#coverage"
    Then the coverage dashboard page is rendered

  # -- Layout ----------------------------------------------------------------

  Scenario: Coverage dashboard renders as single-column layout
    Given STR-002-active-session-store sessionId is "session-123"
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Coverage dashboard has correct meta title
    Given STR-002-active-session-store sessionId is "session-123"
    Then the document title is "SpecForge — Coverage"

  Scenario: Components appear in correct vertical order
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-008-coverage-store has coverage files
    Then CMP-004-filter-bar appears at the top
    And the summary stat cards appear below the filter bar
    And the coverage file table appears below the summary stats

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state shows prompt
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then the text "No active session selected." is displayed
    And a link to "#home" is visible

  Scenario: No-session state hides all coverage components
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then CMP-004-filter-bar is not visible
    And CMP-015-coverage-file-list is not visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state shows no-data message
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-008-coverage-store has 0 files
    Then the text "No coverage data available." is displayed

  Scenario: Empty state shows dash values in summary stats
    Given STR-008-coverage-store has 0 files
    Then the "Overall Coverage" stat displays "--"
    And the "Gap Count" stat displays "--"
    And the "Total Files" stat displays "--"
    And the "Covered Files" stat displays "--"

  Scenario: Empty state disables filter bar
    Given STR-008-coverage-store has 0 files
    Then CMP-004-filter-bar controls are disabled

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton summary stats
    Given coverage data is being loaded
    Then the summary stat cards show pulsing skeleton placeholders
    And CMP-004-filter-bar controls are disabled

  Scenario: Loading state shows skeleton table rows
    Given coverage data is being loaded
    Then the file table shows skeleton rows with placeholder bars

  # -- Populated State -------------------------------------------------------

  Scenario: Summary stats display computed values
    Given STR-008-coverage-store has files with overall coverage 78%
    And STR-008-coverage-store gapCount is 4
    And STR-008-coverage-store has 32 total files
    And STR-008-coverage-store has 25 covered files
    Then the "Overall Coverage" stat displays "78%"
    And the "Gap Count" stat displays "4"
    And the "Total Files" stat displays "32"
    And the "Covered Files" stat displays "25"

  Scenario: Summary stat cards use display font for values
    Then the stat value text uses "--sf-font-display" at 24px
    And the stat value text has font-weight 700

  Scenario: File table renders one row per file
    Given STR-008-coverage-store has 5 coverage files
    Then the file table renders 5 rows
    And each row shows file name, coverage bar, status badge, spec file, and category

  # -- Coverage Progress Bar Colors ------------------------------------------

  Scenario: High coverage files show green progress bar
    Given a file "guard.ts" has coveragePercent 92
    Then the progress bar for "guard.ts" uses color "#22C55E"

  Scenario: Medium coverage files show orange progress bar
    Given a file "policy.ts" has coveragePercent 68
    Then the progress bar for "policy.ts" uses color "#FF8C00"

  Scenario: Low coverage files show red progress bar
    Given a file "eval.ts" has coveragePercent 35
    Then the progress bar for "eval.ts" uses color "#FF3B3B"

  Scenario: Progress bar width matches coverage percentage
    Given a file "guard.ts" has coveragePercent 92
    Then the progress bar fill for "guard.ts" has width "92%"

  Scenario: Progress bar fill animates on update
    Given a file "guard.ts" coverage changes from 80% to 92%
    Then the progress bar fill width transitions with "width 300ms ease"

  # -- Coverage Status Badges ------------------------------------------------

  Scenario: Covered files show green badge
    Given a file has status "covered"
    Then the status badge shows "covered" with color "#22C55E"
    And the badge background is "rgba(34, 197, 94, 0.12)"

  Scenario: Implemented-only files show accent badge
    Given a file has status "implemented-only"
    Then the status badge shows "implemented-only" with color "--sf-accent"
    And the badge background is "--sf-accent-dim"

  Scenario: Tested-only files show orange badge
    Given a file has status "tested-only"
    Then the status badge shows "tested-only" with color "#FF8C00"
    And the badge background is "rgba(255, 140, 0, 0.12)"

  Scenario: Gap files show red badge
    Given a file has status "gap"
    Then the status badge shows "gap" with color "#FF3B3B"
    And the badge background is "rgba(255, 59, 59, 0.12)"

  # -- Status Multi-Select Filter --------------------------------------------

  Scenario: Status filter narrows file list
    Given files with statuses "covered", "gap", "implemented-only"
    When the user selects "gap" in the status multi-select
    Then EVT-018-filter-changed is dispatched with view "coverage", key "statuses", value ["gap"]
    And only files with status "gap" are visible

  Scenario: Multiple status selections show union
    When the user selects "gap" and "tested-only" in the status multi-select
    Then files with status "gap" or "tested-only" are visible

  Scenario: Empty status selection shows all files
    Given the status multi-select has no selections
    Then all files are visible regardless of status

  # -- Spec File Filter ------------------------------------------------------

  Scenario: Spec file filter narrows by spec association
    Given files are associated with spec files "spec/guard" and "spec/flow"
    When the user selects "spec/guard" in the spec file dropdown
    Then EVT-018-filter-changed is dispatched with view "coverage", key "specFile", value "spec/guard"
    And only files associated with "spec/guard" are visible

  # -- Sort Filter -----------------------------------------------------------

  Scenario: Sort by coverage ascending
    When the user changes the sort dropdown to "coverage-asc"
    Then EVT-018-filter-changed is dispatched with view "coverage", key "sort", value "coverage-asc"
    And files are ordered by coveragePercent ascending

  Scenario: Sort by coverage descending
    When the user changes the sort dropdown to "coverage-desc"
    Then files are ordered by coveragePercent descending

  Scenario: Sort by file name
    When the user changes the sort dropdown to "file-name"
    Then files are ordered alphabetically by fileName

  Scenario: Default sort is by requirement ID
    Then the sort dropdown shows "requirement-id" as the selected value

  # -- Show Gaps Only Toggle -------------------------------------------------

  Scenario: Show gaps only toggle filters to gap files
    Given files with statuses "covered", "gap", "implemented-only"
    When the user enables the "Show gaps only" toggle
    Then EVT-018-filter-changed is dispatched with view "coverage", key "showGapsOnly", value true
    And only files with status "gap" are visible

  Scenario: Disabling show gaps only restores all files
    Given the "Show gaps only" toggle is enabled
    When the user disables the "Show gaps only" toggle
    Then EVT-018-filter-changed is dispatched with view "coverage", key "showGapsOnly", value false
    And all files are visible again

  # -- File Category Filter --------------------------------------------------

  Scenario: File category filter narrows by category
    Given files have categories "src", "test", "types"
    When the user selects "src" in the file category multi-select
    Then EVT-018-filter-changed is dispatched with view "coverage", key "fileCategory", value ["src"]
    And only files with category "src" are visible

  # -- Show Uncovered Only Toggle --------------------------------------------

  Scenario: Show uncovered only filters to files below 100%
    Given files with coveragePercent 100, 80, 50, 0
    When the user enables the "Show uncovered only" toggle
    Then EVT-018-filter-changed is dispatched with view "coverage", key "showUncoveredOnly", value true
    And only files with coveragePercent less than 100 are visible

  Scenario: Disabling show uncovered only restores all files
    Given the "Show uncovered only" toggle is enabled
    When the user disables the "Show uncovered only" toggle
    Then all files are visible regardless of coverage percentage

  # -- Combined Filters ------------------------------------------------------

  Scenario: Multiple filters combine with AND logic
    Given the status filter is ["gap"]
    And the file category filter is ["src"]
    And the "Show gaps only" toggle is enabled
    Then only files that match ALL active filters are visible

  # -- Summary Stats Recompute on Filter ------------------------------------

  Scenario: Summary stats reflect filtered results
    Given 10 files total with 5 gaps
    When the user enables "Show gaps only"
    Then the "Total Files" stat updates to reflect the filtered count
    And the "Gap Count" stat reflects the filtered gap count

  # -- Filter Chips ----------------------------------------------------------

  Scenario: Active filter chips appear for non-default filters
    Given the status filter has ["gap"] selected
    And the "Show gaps only" toggle is enabled
    Then filter chips "status: gap" and "gaps-only" appear
    And each chip has a remove button

  Scenario: Removing a chip resets that filter
    Given a filter chip "status: gap" is visible
    When the user clicks the remove button on the chip
    Then the status filter is cleared
    And the chip is removed

  # -- Navigation ------------------------------------------------------------

  Scenario: Coverage dashboard is accessible from the nav rail
    Given STR-002-active-session-store sessionId is "session-123"
    When the user clicks the "Coverage" button in the nav rail
    Then the route changes to "#coverage"
    And the coverage dashboard page is rendered

  # -- Accessibility ---------------------------------------------------------

  Scenario: Progress bars have accessible labels
    Given a file "guard.ts" has coveragePercent 92
    Then the progress bar has aria-label "Coverage: 92%"
    And the progress bar has aria-valuemin 0
    And the progress bar has aria-valuemax 100
    And the progress bar has aria-valuenow 92

  Scenario: Summary stats have accessible group labels
    Then each summary stat card has a role "group"
    And each card has an aria-label matching "{label}: {value}"
