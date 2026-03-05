@CMP-024-feature-grid
Feature: Feature Grid
  Grid of six feature cards highlighting key SpecForge capabilities,
  with responsive layout and hover glow effects.

  Background:
    Given the landing page is rendered
    And the feature grid section is visible

  # -- Layout --

  Scenario: Feature grid renders as 3-column grid on desktop
    Given the viewport width is greater than 768px
    Then the feature grid displays 3 columns
    And the grid gap is 24px

  Scenario: Feature grid renders as 2-column grid on tablet
    Given the viewport width is between 480px and 768px
    Then the feature grid displays 2 columns
    And the grid gap is 24px

  Scenario: Feature grid renders as single column on mobile
    Given the viewport width is less than 480px
    Then the feature grid displays 1 column
    And the grid gap is 24px

  Scenario: Feature grid is horizontally centered with max-width
    Then the feature grid has max-width 1080px
    And the feature grid has margin 0 auto
    And the feature grid has padding "80px 24px"

  # -- ELM-076 Feature Card --

  Scenario: Six feature cards are rendered
    Then 6 feature cards are displayed in the grid

  Scenario: Feature card has surface background and subtle border
    Then each feature card has background "--sf-surface"
    And each feature card has border "1px solid rgba(0, 240, 255, 0.06)"
    And each feature card has border-radius 12px
    And each feature card has padding 24px

  Scenario: Feature card hover shows glow and lift effect
    When the user hovers over a feature card
    Then the card has box-shadow "0 0 24px rgba(0, 240, 255, 0.1)"
    And the card has border "1px solid rgba(0, 240, 255, 0.15)"
    And the card has transform "translateY(-2px)"

  Scenario: Feature card hover transition is smooth
    Then each feature card has transition "box-shadow 0.2s ease, transform 0.2s ease"

  # -- ELM-077 Feature Icon --

  Scenario: Feature icon renders at correct size and color
    Then each feature icon has width 32px and height 32px
    And each feature icon has color "--sf-accent"

  Scenario: Feature icon is positioned above the title
    Then each feature icon is the first child element in its card

  # -- Card Content --

  Scenario: Feature card title renders with display font
    Then each card title uses font-family "--sf-font-display"
    And each card title has font-size 18px
    And each card title has font-weight 600
    And each card title has color "--sf-text"

  Scenario: Feature card description renders with body font
    Then each card description uses font-family "--sf-font-body"
    And each card description has font-size 14px
    And each card description has line-height 1.6
    And each card description has color "--sf-text-muted"

  # -- Feature Data --

  Scenario Outline: Each feature card displays correct content
    Then feature card <index> has title "<title>"
    And feature card <index> has icon "<icon>"

    Examples:
      | index | icon         | title                    |
      | 1     | pipeline     | Multi-Agent Pipeline     |
      | 2     | graph        | Knowledge Graph          |
      | 3     | conversation | Discovery Conversations  |
      | 4     | compliance   | GxP Compliance           |
      | 5     | token        | Token Budget Management  |
      | 6     | acp-session   | Real-time ACP Session     |

  # -- Spacing --

  Scenario: Card internal spacing is correct
    Then the feature icon has 16px bottom margin to the title
    And the card title has 8px bottom margin to the description

  # -- Accessibility --

  Scenario: Feature grid has region landmark
    Then the feature grid has role "region"
    And the feature grid has aria-label "Key features"

  Scenario: Each feature card is an article
    Then each feature card has role "article"

  # -- Custom Props --

  Scenario: Custom features array is rendered
    Given the feature grid receives a custom features array with 4 items
    Then 4 feature cards are displayed in the grid
