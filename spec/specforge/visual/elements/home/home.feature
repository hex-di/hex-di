@ELM-home
Feature: Home Elements
  Session table rows, status badges, new session form, and row action buttons.

  Background:
    Given the Home view is rendered
    And session data is loaded

  # ── ELM-022 Session Table Row ──

  Scenario: Session table row displays all columns
    Then each session row displays the package name, spec path, status badge, pipeline mode, and last activity

  Scenario: Hovering a session row highlights it
    When the user hovers over a session table row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  Scenario: Clicking a session row selects the session
    When the user clicks a session table row
    Then the action ACT-006-select-session is triggered with the session ID

  Scenario: Session rows have bottom border separators
    Then each session row has a bottom border of "1px solid rgba(0, 240, 255, 0.06)"

  # ── ELM-023 Session Status Badge ──

  Scenario Outline: Status badge color matches session status
    Given a session with status "<status>"
    Then the status badge displays "<status>"
    And the status badge text color is "<textColor>"
    And the status badge background is "<bgColor>"

    Examples:
      | status    | textColor        | bgColor                     |
      | running   | --sf-accent      | --sf-accent-dim             |
      | paused    | --sf-warning     | rgba(255, 140, 0, 0.1)     |
      | completed | #22C55E          | rgba(34, 197, 94, 0.1)     |
      | failed    | #FF3B3B          | rgba(255, 59, 59, 0.1)     |
      | idle      | --sf-text-muted  | rgba(255, 255, 255, 0.05)  |

  Scenario: Status badge is a pill shape
    Then the status badge has border-radius 10px
    And the status badge has font-size 11px

  # ── ELM-024 New Session Package Input ──

  Scenario: Package input renders with placeholder
    Then the package input displays placeholder "Package name"

  Scenario: Package input shows accent border on focus
    When the user focuses the package input
    Then the package input border-color changes to "--sf-accent"

  Scenario: Package input shows error border when invalid
    Given the package input is required and empty
    When the form is submitted
    Then the package input border-color changes to "--sf-error"

  # ── ELM-025 New Session Spec Input ──

  Scenario: Spec input renders with placeholder
    Then the spec input displays placeholder "Spec path"

  Scenario: Spec input validates as required
    Given the spec input is empty
    When the form is submitted
    Then the spec input border-color changes to "--sf-error"

  # ── ELM-026 New Session Submit Button ──

  Scenario: Submit button renders with accent background
    Then the submit button displays text "Create Session"
    And the submit button has background "--sf-accent"
    And the submit button text color is "--sf-bg-deep"

  Scenario: Submit button is disabled when fields are empty
    Given the package input is empty
    Then the submit button is disabled
    And the submit button has opacity 0.4

  Scenario: Submit button is enabled when both fields have values
    Given the package input contains "@hex-di/core"
    And the spec input contains "spec/core/auth"
    Then the submit button is enabled

  Scenario: Clicking submit button creates a session
    Given the package input contains "@hex-di/core"
    And the spec input contains "spec/core/auth"
    When the user clicks the submit button
    Then the action ACT-008-create-session is triggered

  # ── ELM-027 Session Delete Button ──

  Scenario: Delete button renders as muted icon
    Then the delete button has color "--sf-text-muted"
    And the delete button has background "transparent"

  Scenario: Hovering delete button shows error color
    When the user hovers over the delete button
    Then the delete button color changes to "--sf-error"
    And the delete button background changes to "rgba(255, 59, 59, 0.1)"

  Scenario: Clicking delete button requires confirmation
    When the user clicks the delete button
    Then a confirmation dialog is displayed
    And the session is not deleted until confirmed

  Scenario: Confirming deletion triggers delete action
    When the user clicks the delete button
    And the user confirms the deletion
    Then the action ACT-010-delete-session is triggered

  # ── ELM-028 Session Resume Button ──

  Scenario: Resume button is visible for paused sessions
    Given a session with status "paused"
    Then the resume button is visible for that session row

  Scenario: Resume button is hidden for non-paused sessions
    Given a session with status "running"
    Then the resume button is not visible for that session row

  Scenario: Clicking resume button triggers resume action
    Given a session with status "paused"
    When the user clicks the resume button
    Then the action ACT-009-resume-session is triggered

  Scenario: Resume button hover brightens background
    When the user hovers over the resume button
    Then the resume button background changes to "rgba(0, 240, 255, 0.15)"
