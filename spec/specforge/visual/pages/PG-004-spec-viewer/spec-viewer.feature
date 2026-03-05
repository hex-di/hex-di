@PG-004-spec-viewer
Feature: Spec Viewer Page
  As a user
  I want to view the generated specification document
  So that I can review the content and track changes

  Background:
    Given the application shell is rendered
    And the current route is "#spec"

  # -- Route Guard -----------------------------------------------------------

  Scenario: Spec viewer redirects to home when no session is active
    Given STR-002-active-session-store sessionId is null
    When the user navigates to "#spec"
    Then the route changes to "#home"

  Scenario: Spec viewer renders when a session is active
    Given STR-002-active-session-store sessionId is "session-123"
    When the user navigates to "#spec"
    Then the spec viewer page is rendered

  # -- Layout ----------------------------------------------------------------

  Scenario: Spec viewer renders as single-column layout
    Given STR-002-active-session-store sessionId is "session-123"
    Then the page uses a single-column layout
    And the page fills the main content area of the shell grid

  Scenario: Spec viewer has correct meta title
    Given STR-002-active-session-store sessionId is "session-123"
    Then the document title is "SpecForge — Spec"

  Scenario: Components appear in correct vertical order
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-006-spec-content-store content is not empty
    Then CMP-004-filter-bar appears at the top
    And CMP-012-markdown-section-renderer appears below CMP-004

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state shows prompt
    Given STR-002-active-session-store sessionId is null
    And the route guard does not redirect
    Then the text "No active session selected." is displayed
    And a link to "#home" is visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state shows no-spec message
    Given STR-002-active-session-store sessionId is "session-123"
    And STR-006-spec-content-store content is ""
    Then the text "No specification has been generated yet." is displayed
    And the text "Start a conversation in Chat to begin discovery." is visible

  Scenario: Empty state disables filter bar controls
    Given STR-006-spec-content-store content is ""
    Then CMP-004-filter-bar controls are disabled

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton content
    Given spec content is being loaded
    Then the content area displays skeleton blocks
    And the skeleton blocks mimic markdown heading and paragraph shapes
    And CMP-004-filter-bar controls are disabled

  # -- Populated State -------------------------------------------------------

  Scenario: Populated state renders markdown content
    Given STR-006-spec-content-store content contains markdown with 5 H2 sections
    Then CMP-012-markdown-section-renderer renders the full markdown content
    And 5 sections are visible with H2 headings

  Scenario: Filter bar is active when content is populated
    Given STR-006-spec-content-store content is not empty
    Then CMP-004-filter-bar controls are enabled

  # -- Change Tracking -------------------------------------------------------

  Scenario: Changed sections have left accent border
    Given STR-006-spec-content-store changedSections includes "section-2"
    Then the section with id "section-2" has a 3px left border
    And the border color is "--sf-accent"

  Scenario: Unchanged sections have no accent border
    Given STR-006-spec-content-store changedSections does not include "section-1"
    Then the section with id "section-1" has no left accent border

  Scenario: Changed section gets background tint
    Given STR-006-spec-content-store changedSections includes "section-3"
    Then the section with id "section-3" has a subtle "--sf-accent-dim" background

  Scenario: New change event adds accent border to section
    Given no sections are changed
    When EVT-015-spec-section-changed is dispatched with sectionId "section-4"
    Then the section with id "section-4" gains an accent left border

  # -- Show Changes Only Filter ----------------------------------------------

  Scenario: Show changes only toggle hides unchanged sections
    Given STR-006-spec-content-store changedSections includes "section-2" and "section-4"
    When the user enables the "Show changes only" toggle
    Then EVT-018-filter-changed is dispatched with view "spec", key "showChangesOnly", value true
    And only sections "section-2" and "section-4" are visible
    And all other sections are hidden

  Scenario: Disabling show changes only restores all sections
    Given the "Show changes only" toggle is enabled
    When the user disables the "Show changes only" toggle
    Then EVT-018-filter-changed is dispatched with view "spec", key "showChangesOnly", value false
    And all sections are visible again

  Scenario: Show changes only with no changes shows empty message
    Given STR-006-spec-content-store changedSections is empty
    And the "Show changes only" toggle is enabled
    Then the content area shows "No changes to display."

  # -- Search Filter ---------------------------------------------------------

  Scenario: Search highlights matching text in rendered markdown
    Given STR-006-spec-content-store content contains the word "authorization"
    When the user types "authorization" in the search input
    Then EVT-018-filter-changed is dispatched with view "spec", key "search", value "authorization"
    And all instances of "authorization" are highlighted with accent background

  Scenario: Search with no matches shows no-results indicator
    Given STR-006-spec-content-store content does not contain "xyznonexistent"
    When the user types "xyznonexistent" in the search input
    Then a "No matches found" indicator is displayed

  Scenario: Clearing search removes highlights
    Given the search input contains "authorization"
    When the user clears the search input
    Then all text highlights are removed

  Scenario: Search input is debounced
    When the user types rapidly in the search input
    Then the filter event is dispatched only after 300ms of inactivity

  # -- Acknowledge Changes ---------------------------------------------------

  Scenario: Acknowledging changes clears all change highlights
    Given STR-006-spec-content-store changedSections includes "section-2" and "section-4"
    When EVT-017-spec-changes-acknowledged is dispatched
    Then STR-006-spec-content-store changedSections becomes empty
    And no sections have accent left borders

  # -- Content Updates -------------------------------------------------------

  Scenario: Content update re-renders the markdown
    Given STR-006-spec-content-store content has 3 sections
    When EVT-016-spec-content-updated is dispatched with new content having 5 sections
    Then CMP-012-markdown-section-renderer re-renders with 5 sections

  # -- Active Filter Chips ---------------------------------------------------

  Scenario: Active filter chip appears for show-changes-only
    Given the "Show changes only" toggle is enabled
    Then a filter chip "changes-only" appears below the filter controls

  Scenario: Removing the changes-only chip disables the toggle
    Given the "Show changes only" filter chip is visible
    When the user clicks the remove button on the chip
    Then the "Show changes only" toggle is disabled
    And all sections become visible

  # -- Navigation ------------------------------------------------------------

  Scenario: Spec viewer is accessible from the nav rail
    Given STR-002-active-session-store sessionId is "session-123"
    When the user clicks the "Spec" button in the nav rail
    Then the route changes to "#spec"
    And the spec viewer page is rendered
