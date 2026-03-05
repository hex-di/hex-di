@CMP-025-how-it-works-flow
Feature: How It Works Flow
  Four-step horizontal flow diagram showing the SpecForge workflow
  with numbered circles, titles, descriptions, and dotted connectors.

  Background:
    Given the landing page is rendered
    And the "How It Works" section is visible

  # -- Section Header --

  Scenario: Section heading renders correctly
    Then the section heading text is "How It Works"
    And the section heading font-family is "--sf-font-display"
    And the section heading font-size is 32px
    And the section heading font-weight is 700
    And the section heading color is "--sf-text"
    And the section heading is center-aligned

  Scenario: Section heading has correct spacing
    Then the section heading has 48px bottom margin to the step flow

  # -- Layout --

  Scenario: Steps are laid out horizontally on desktop
    Given the viewport width is greater than 640px
    Then the steps container uses a horizontal flex layout
    And 4 steps are displayed in a row

  Scenario: Steps stack vertically on mobile
    Given the viewport width is less than 640px
    Then the steps container uses a vertical flex layout
    And 4 steps are displayed in a column with 32px gap

  Scenario: Section is horizontally centered
    Then the section has max-width 1080px
    And the section has margin 0 auto
    And the section has padding "80px 24px"

  # -- ELM-078 How It Works Step --

  Scenario: Four steps are rendered
    Then 4 step elements are displayed in the flow

  Scenario Outline: Each step displays correct content
    Then step <number> has title "<title>"
    And step <number> circle displays "<number>"

    Examples:
      | number | title            |
      | 1      | Point to Package |
      | 2      | Discover         |
      | 3      | Generate         |
      | 4      | Review           |

  Scenario: Step circle renders at correct size
    Then each step circle has width 48px and height 48px
    And each step circle has border-radius 50%
    And each step circle number uses font-family "--sf-font-display"
    And each step circle number has font-size 20px

  Scenario: Active step circle has accent styling
    Given a step is in the "active" state
    Then the step circle background is "--sf-accent"
    And the step circle text color is "--sf-bg"

  Scenario: Future step circle has muted dashed styling
    Given a step is in the "future" state
    Then the step circle background is "transparent"
    And the step circle text color is "--sf-text-muted"
    And the step circle border is "1px dashed --sf-text-muted"

  Scenario: All steps default to active state on landing page
    Then all 4 step circles have background "--sf-accent"

  Scenario: Step title renders with display font
    Then each step title uses font-family "--sf-font-display"
    And each step title has font-size 16px
    And each step title has font-weight 600

  Scenario: Active step title has text color
    Given a step is in the "active" state
    Then the step title color is "--sf-text"

  Scenario: Future step title has muted color
    Given a step is in the "future" state
    Then the step title color is "--sf-text-muted"

  Scenario: Step description renders with body font
    Then each step description uses font-family "--sf-font-body"
    And each step description has font-size 13px
    And each step description has line-height 1.5

  # -- ELM-079 Step Connector --

  Scenario: Three connectors are rendered between steps
    Then 3 step connectors are displayed between the 4 steps

  Scenario: Active connector uses accent dotted line on desktop
    Given the viewport width is greater than 640px
    And the connector is in the "active" state
    Then the connector has border-top "2px dotted --sf-accent"

  Scenario: Future connector uses muted dotted line on desktop
    Given the viewport width is greater than 640px
    And the connector is in the "future" state
    Then the connector has border-top "2px dotted --sf-text-muted"

  Scenario: Connector is vertical on mobile
    Given the viewport width is less than 640px
    Then each connector has width 2px and height 32px
    And each connector uses a vertical dotted border

  Scenario: Connector is vertically centered with step circles on desktop
    Given the viewport width is greater than 640px
    Then each connector has margin-top 24px

  Scenario: Connectors are hidden from assistive technology
    Then each step connector has aria-hidden "true"
    And each step connector has role "presentation"

  # -- Step Spacing --

  Scenario: Step internal spacing is correct
    Then each step circle has 16px bottom margin to the title
    And each step title has 8px bottom margin to the description

  Scenario: Each step has a maximum width
    Then each step has max-width 220px
    And each step has horizontal padding 16px

  # -- Accessibility --

  Scenario: Section has region landmark
    Then the section has role "region"
    And the section has aria-label "How SpecForge works"
