@CMP-029-landing-footer
Feature: Landing Footer
  Page footer with logo, three columns of navigation links
  (Product, Community, Legal), and copyright information.

  Background:
    Given the landing page is rendered
    And the footer is visible at the bottom of the page

  # -- Layout --

  Scenario: Footer is horizontally centered with max-width
    Then the footer has max-width 1080px
    And the footer has margin 0 auto
    And the footer has padding "48px 24px 32px"

  Scenario: Footer has accent top border
    Then the footer has border-top "1px solid rgba(0, 240, 255, 0.08)"

  Scenario: Footer columns render as 4-column grid on desktop
    Given the viewport width is greater than 768px
    Then the footer columns display a grid with columns "1.5fr 1fr 1fr 1fr"
    And the column grid gap is 48px

  Scenario: Footer columns render as 2-column grid on tablet
    Given the viewport width is between 480px and 768px
    Then the footer columns display a 2-column grid
    And the column grid gap is 32px

  Scenario: Footer columns stack vertically on mobile
    Given the viewport width is less than 480px
    Then the footer columns display a single-column grid
    And the column grid gap is 24px

  # -- Logo Section --

  Scenario: Logo section displays the SpecForge logo
    Then the logo section contains a logo with height 28px

  Scenario: Logo section displays a tagline
    Then the tagline text is "AI-powered specification authoring"
    And the tagline font-family is "--sf-font-body"
    And the tagline font-size is 13px
    And the tagline color is "--sf-text-muted"
    And the tagline has margin-top 12px

  # -- Column Headings --

  Scenario: Column headings use uppercase accent styling
    Then each column heading has font-size 11px
    And each column heading has font-weight 700
    And each column heading has text-transform "uppercase"
    And each column heading has letter-spacing "0.08em"
    And each column heading has color "--sf-accent"
    And each column heading has font-family "--sf-font-body"

  Scenario: Column headings have correct spacing
    Then each column heading has 16px bottom margin

  Scenario: Three link columns are rendered
    Then the "Product" column heading is visible
    And the "Community" column heading is visible
    And the "Legal" column heading is visible

  # -- ELM-086 Footer Link --

  Scenario: Footer links render with muted color
    Then each footer link has color "--sf-text-muted"
    And each footer link has font-family "--sf-font-body"
    And each footer link has font-size 13px
    And each footer link has text-decoration "none"

  Scenario: Footer link hover brightens text
    When the user hovers over a footer link
    Then the link color changes to "--sf-text"

  Scenario: Footer link hover transition is smooth
    Then each footer link has transition "color 0.15s ease"

  Scenario: Footer link focus shows accent outline
    When the user focuses a footer link via keyboard
    Then the link has outline "1px solid --sf-accent"
    And the link has outline-offset 2px

  Scenario: Footer links have correct vertical spacing
    Then each footer link has display "block"
    And each footer link has padding "4px 0"

  # -- Product Column Links --

  Scenario: Product column contains correct links
    Then the "Product" column contains link "Features"
    And the "Product" column contains link "Pricing"
    And the "Product" column contains link "Documentation"

  Scenario: Product links have correct hrefs
    Then the "Features" link points to "#features"
    And the "Pricing" link points to "#pricing"
    And the "Documentation" link points to "/docs"

  # -- Community Column Links --

  Scenario: Community column contains correct links
    Then the "Community" column contains link "GitHub"
    And the "Community" column contains link "Discord"
    And the "Community" column contains link "Twitter"

  Scenario: Community links point to external URLs
    Then the "GitHub" link points to "https://github.com/specforge"

  # -- Legal Column Links --

  Scenario: Legal column contains correct links
    Then the "Legal" column contains link "Privacy"
    And the "Legal" column contains link "Terms"
    And the "Legal" column contains link "License"

  Scenario: Legal links have correct hrefs
    Then the "Privacy" link points to "/privacy"
    And the "Terms" link points to "/terms"
    And the "License" link points to "/license"

  # -- Copyright --

  Scenario: Copyright text is displayed below the columns
    Then the copyright text contains "SpecForge. All rights reserved."
    And the copyright text has font-size 12px
    And the copyright text has color "--sf-text-muted"
    And the copyright text is center-aligned

  Scenario: Copyright has correct spacing and divider
    Then the copyright section has margin-top 48px
    And the copyright section has padding-top 24px
    And the copyright section has border-top "1px solid rgba(0, 240, 255, 0.04)"

  # -- Accessibility --

  Scenario: Footer has contentinfo landmark
    Then the footer has role "contentinfo"

  Scenario: Each footer link has link role
    Then each footer link has role "link"
