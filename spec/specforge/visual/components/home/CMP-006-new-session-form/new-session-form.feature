@CMP-006-new-session-form
Feature: New Session Form
  Inline form for creating a new session with package name and spec path inputs.

  Background:
    Given the home view is rendered
    And the new session form is visible above the session table

  # -- Rendering --

  Scenario: Form renders all child elements
    Then the form displays the ELM-024-new-session-package-input
    And the form displays the ELM-025-new-session-spec-input
    And the form displays the ELM-026-new-session-submit-button

  Scenario: Form uses horizontal flex layout
    Then the form has display "flex"
    And the form has flex-direction "row"
    And the form has gap "8px"

  Scenario: Inputs use flex-grow and button has fixed width
    Then the package input has flex-grow "1"
    And the spec path input has flex-grow "1"
    And the submit button has a fixed width

  # -- Validation --

  Scenario: Submit button disabled when both fields are empty
    Given the package input value is ""
    And the spec path input value is ""
    Then the submit button is disabled

  Scenario: Submit button disabled when package name is empty
    Given the package input value is ""
    And the spec path input value is "specs/auth.md"
    Then the submit button is disabled

  Scenario: Submit button disabled when spec path is empty
    Given the package input value is "@scope/pkg"
    And the spec path input value is ""
    Then the submit button is disabled

  Scenario: Submit button enabled when both fields are filled
    Given the package input value is "@scope/pkg"
    And the spec path input value is "specs/auth.md"
    Then the submit button is enabled

  Scenario: Whitespace-only input treated as empty
    Given the package input value is "   "
    And the spec path input value is "specs/auth.md"
    Then the submit button is disabled

  # -- Submission --

  Scenario: Clicking submit invokes callback with field values
    Given the package input value is "@scope/my-pkg"
    And the spec path input value is "specs/feature.md"
    When the user clicks the submit button
    Then onCreateSession is invoked with "@scope/my-pkg" and "specs/feature.md"

  Scenario: Pressing Enter in package input submits the form
    Given the package input value is "@scope/my-pkg"
    And the spec path input value is "specs/feature.md"
    When the user presses Enter in the package input
    Then onCreateSession is invoked with "@scope/my-pkg" and "specs/feature.md"

  Scenario: Pressing Enter in spec path input submits the form
    Given the package input value is "@scope/my-pkg"
    And the spec path input value is "specs/feature.md"
    When the user presses Enter in the spec path input
    Then onCreateSession is invoked with "@scope/my-pkg" and "specs/feature.md"

  Scenario: Fields are cleared after successful submission
    Given the package input value is "@scope/my-pkg"
    And the spec path input value is "specs/feature.md"
    When the user clicks the submit button
    Then the package input value is ""
    And the spec path input value is ""

  # -- Accessibility --

  Scenario: Form has correct ARIA role
    Then the form element has role "form"
    And the form has aria-label "Create new session"
