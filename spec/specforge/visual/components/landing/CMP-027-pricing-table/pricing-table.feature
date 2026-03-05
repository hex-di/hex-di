@CMP-027-pricing-table
Feature: Pricing Table
  Three-tier pricing comparison table with feature lists, pricing,
  CTA buttons, and a highlighted "Popular" tier.

  Background:
    Given the landing page is rendered
    And the pricing section is visible

  # -- Section Header --

  Scenario: Section heading renders correctly
    Then the section heading text is "Pricing"
    And the section heading font-family is "--sf-font-display"
    And the section heading font-size is 32px
    And the section heading font-weight is 700
    And the section heading color is "--sf-text"
    And the section heading is center-aligned
    And the section heading has 48px bottom margin

  # -- Layout --

  Scenario: Pricing tiers render as 3-column grid on desktop
    Given the viewport width is greater than 768px
    Then the tiers container displays a 3-column grid
    And the grid gap is 24px

  Scenario: Pricing tiers stack vertically on mobile
    Given the viewport width is less than 768px
    Then the tiers container displays a single column
    And the tiers container has max-width 400px

  Scenario: Section is horizontally centered
    Then the section has max-width 1080px
    And the section has margin 0 auto
    And the section has padding "80px 24px"

  # -- ELM-082 Pricing Tier Card --

  Scenario: Three tier cards are rendered
    Then 3 pricing tier cards are displayed

  Scenario: Each tier card has correct base styling
    Then each tier card has border-radius 12px
    And each tier card has padding 32px
    And each tier card has background "--sf-surface"

  Scenario Outline: Each tier displays correct name and price
    Then tier card "<name>" displays price "<price>"
    And tier card "<name>" displays CTA label "<cta>"

    Examples:
      | name        | price   | cta              |
      | Open Source | Free    | Get Started      |
      | Pro         | $29/mo  | Start Free Trial |
      | Enterprise  | Custom  | Contact Sales    |

  # -- Popular Tier Highlighting --

  Scenario: Pro tier has accent border and glow
    Then the "Pro" tier card has border "1px solid --sf-accent"
    And the "Pro" tier card has box-shadow "0 0 30px rgba(0, 240, 255, 0.12)"

  Scenario: Pro tier displays "Popular" badge
    Then the "Pro" tier card displays a "Popular" badge
    And the badge has background "--sf-accent"
    And the badge has color "--sf-bg"
    And the badge has font-size 11px
    And the badge text is uppercase
    And the badge has border-radius 999px
    And the badge is positioned at top -12px, centered horizontally

  Scenario: Non-popular tiers have subtle border and no badge
    Then the "Open Source" tier card has border "1px solid rgba(0, 240, 255, 0.06)"
    And the "Enterprise" tier card has border "1px solid rgba(0, 240, 255, 0.06)"
    And the "Open Source" tier card does not display a badge
    And the "Enterprise" tier card does not display a badge

  # -- Price Display --

  Scenario: Price text uses display font at large size
    Then each tier price uses font-family "--sf-font-display"
    And each tier price has font-size 40px
    And each tier price has font-weight 700
    And each tier price has color "--sf-text"

  Scenario: Price period suffix is smaller and muted
    Then the "Pro" tier displays "/mo" after the price
    And the period text has font-size 16px
    And the period text has color "--sf-text-muted"

  Scenario: Price has bottom spacing to feature list
    Then each tier price has 24px bottom margin

  # -- Tier Name --

  Scenario: Tier name renders with display font
    Then each tier name uses font-family "--sf-font-display"
    And each tier name has font-size 20px
    And each tier name has font-weight 600
    And each tier name has color "--sf-text"
    And each tier name has 8px bottom margin

  # -- ELM-083 Pricing Feature Item --

  Scenario: Included features show accent checkmark
    Given a feature item is in the "included" state
    Then the feature item displays a checkmark icon
    And the checkmark icon has color "--sf-accent"
    And the feature text has color "--sf-text"

  Scenario: Excluded features show muted cross
    Given a feature item is in the "excluded" state
    Then the feature item displays a cross icon
    And the cross icon has color "--sf-text-muted"
    And the feature text has color "--sf-text-muted"
    And the feature item has opacity 0.5

  Scenario: Feature items have correct layout
    Then each feature item has display "flex"
    And each feature item has align-items "center"
    And each feature item has a 10px gap between icon and text
    And each feature item has 6px vertical padding
    And each feature item uses font-family "--sf-font-body"
    And each feature item has font-size 13px

  Scenario: Feature icon is correctly sized
    Then each feature icon has width 16px and height 16px

  Scenario: Open Source tier has 4 included and 4 excluded features
    Then the "Open Source" tier has 4 included feature items
    And the "Open Source" tier has 4 excluded feature items

  Scenario: Pro tier has 6 included and 2 excluded features
    Then the "Pro" tier has 6 included feature items
    And the "Pro" tier has 2 excluded feature items

  Scenario: Enterprise tier has 8 included features
    Then the "Enterprise" tier has 8 included feature items
    And the "Enterprise" tier has 0 excluded feature items

  # -- CTA Buttons --

  Scenario: Default tier CTA is a ghost button
    Then the "Open Source" CTA button has background "transparent"
    And the "Open Source" CTA button has color "--sf-accent"
    And the "Open Source" CTA button has border "1px solid --sf-accent"
    And the "Open Source" CTA button has border-radius 999px

  Scenario: Popular tier CTA is a filled button
    Then the "Pro" CTA button has background "--sf-accent"
    And the "Pro" CTA button has color "--sf-bg"

  Scenario: Default tier CTA hover fills subtly
    When the user hovers over the "Open Source" CTA button
    Then the CTA background changes to "rgba(0, 240, 255, 0.08)"
    And the CTA color changes to "--sf-accent-light"

  Scenario: Popular tier CTA hover shows glow
    When the user hovers over the "Pro" CTA button
    Then the CTA background changes to "--sf-accent-light"
    And the CTA has box-shadow "0 0 20px rgba(0, 240, 255, 0.3)"

  # -- Feature List Spacing --

  Scenario: Feature list has bottom spacing to CTA
    Then the feature list has 32px bottom margin
    And the feature list has flex 1 to push CTA to the bottom

  # -- Accessibility --

  Scenario: Pricing section has region landmark
    Then the pricing section has role "region"
    And the pricing section has aria-label "Pricing plans"
