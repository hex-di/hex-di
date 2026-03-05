@PG-011-landing-page
Feature: Landing Page
  As a visitor to SpecForge
  I want to see a marketing landing page explaining the product
  So that I can understand the value proposition and sign up

  Background:
    Given the user navigates to the "/" route

  # -- Page Structure --------------------------------------------------------

  Scenario: Landing page renders independently of the app shell
    Then the app shell (PG-010) is not rendered
    And no nav rail is visible
    And no status bar is visible

  Scenario: Landing page uses full-bleed layout
    Then the page has width 100vw
    And the page background is "#020408"

  Scenario: Landing page renders all seven sections in order
    Then the page contains the following sections in order:
      | order | section                   |
      | 1     | CMP-023-hero-section      |
      | 2     | CMP-024-feature-grid      |
      | 3     | CMP-025-how-it-works-flow |
      | 4     | CMP-026-cli-demo-terminal |
      | 5     | CMP-027-pricing-table     |
      | 6     | CMP-028-cta-section       |
      | 7     | CMP-029-landing-footer    |

  # -- Section 1: Hero (CMP-023) --------------------------------------------

  Scenario: Hero section occupies full viewport height
    Then the hero section has min-height 100vh

  Scenario: Hero displays headline with gradient text
    Then the hero headline text is "AI-Powered Specification Authoring"
    And the headline uses font "Rajdhani" at 48px
    And the headline has a gradient fill using "--sf-accent" to "--sf-accent-light"

  Scenario: Hero displays subheadline with muted text
    Then the hero subheadline is "Multi-agent collaboration for production-grade software specs"
    And the subheadline uses font "Inter" at 20px
    And the subheadline color is "--sf-text-muted"

  Scenario: Hero displays two CTA buttons
    Then a primary CTA button "Get Started" is displayed
    And a secondary CTA button "View Documentation" is displayed
    And the primary CTA has background "--sf-accent"
    And the secondary CTA has a transparent background with accent border

  Scenario: Hero has animated hexagon grid background
    Then the hero section contains an animated hexagon grid
    And the hexagons use "--sf-accent" at 6% opacity

  # -- Section 2: Features (CMP-024) ----------------------------------------

  Scenario: Feature grid displays six feature cards
    Then the feature grid section contains 6 feature cards

  Scenario: Feature grid uses 3-column layout on desktop
    Given the viewport width is 1280px
    Then the feature grid has 3 columns
    And the grid gap is 24px

  Scenario: Feature grid uses 2-column layout on tablet
    Given the viewport width is 768px
    Then the feature grid has 2 columns

  Scenario: Feature grid uses 1-column layout on mobile
    Given the viewport width is 375px
    Then the feature grid has 1 column

  Scenario: Each feature card displays icon, title, and description
    Then each feature card contains a 32px accent-colored icon
    And each feature card contains a title in "Rajdhani" at 18px
    And each feature card contains a description in "Inter" at 14px with muted color

  Scenario: Feature cards have hover effect
    When the user hovers over a feature card
    Then the card has box-shadow "0 0 24px rgba(0, 240, 255, 0.1)"
    And the card translates upward by 2px

  # -- Section 3: How It Works (CMP-025) ------------------------------------

  Scenario: How It Works section displays 3 steps
    Then the "How It Works" section contains 3 step cards

  Scenario: Steps are connected by arrows on desktop
    Given the viewport width is 1280px
    Then the steps are arranged horizontally
    And accent-colored dashed arrows connect step 1 to step 2 and step 2 to step 3

  Scenario: Steps stack vertically on mobile
    Given the viewport width is 375px
    Then the steps are arranged vertically
    And downward arrows connect the steps

  Scenario: Each step displays a number badge, title, and description
    Then each step card contains an accent-colored number badge
    And each step card contains a title and description

  # -- Section 4: CLI Demo (CMP-026) ----------------------------------------

  Scenario: CLI demo displays a faux terminal window
    Then the CLI demo section contains a terminal-styled container
    And the terminal has a chrome bar with traffic light dots
    And the terminal background is "#0A0E14"

  Scenario: Terminal displays typing animation for CLI command
    Then the terminal shows "$ npx specforge init" with a typing animation
    And the prompt "$" is colored "--sf-accent"
    And the command text uses "JetBrains Mono" at 14px

  Scenario: Terminal shows sequential output lines after command
    Then after the command is typed, output lines appear sequentially:
      | line                                    |
      | > Scanning project structure...         |
      | > Found 12 source files                 |
      | > Initializing knowledge graph...       |
      | > Starting discovery conversation...    |
    And each output line uses color "--sf-text-muted"

  Scenario: Terminal animation respects reduced motion
    Given the user has enabled "prefers-reduced-motion: reduce"
    Then the terminal shows all text immediately without animation

  Scenario: Terminal has constrained width
    Then the terminal container has max-width 720px
    And the terminal is centered horizontally
    And the terminal has border-radius 12px

  # -- Section 5: Pricing (CMP-027) -----------------------------------------

  Scenario: Pricing section displays three tier cards
    Then the pricing section contains 3 pricing cards

  Scenario: Solo tier is free
    Then the "Solo" pricing card displays price "Free"
    And the card lists features including "CLI access", "1 project", "Local only"

  Scenario: Team tier is the recommended option
    Then the "Team" pricing card displays price "$29/mo"
    And the card has an accent border
    And the card has a subtle glow effect
    And the card displays a "recommended" badge

  Scenario: Enterprise tier has custom pricing
    Then the "Enterprise" pricing card displays price "Custom"
    And the card lists features including "SSO", "SLA", "Unlimited"

  Scenario: Each pricing card has a CTA button
    Then the "Solo" card has a "Get Started" button
    And the "Team" card has a "Start Trial" button
    And the "Enterprise" card has a "Contact Us" button

  Scenario: Pricing grid uses 3-column layout on desktop
    Given the viewport width is 1280px
    Then the pricing grid has 3 columns

  Scenario: Pricing grid uses 2-column layout on tablet
    Given the viewport width is 768px
    Then the pricing grid has 2 columns
    And the Enterprise card is below the other two

  Scenario: Pricing grid stacks on mobile
    Given the viewport width is 375px
    Then the pricing cards are stacked in a single column

  # -- Section 6: CTA (CMP-028) ---------------------------------------------

  Scenario: CTA section displays centered headline and button
    Then the CTA section displays a gradient headline
    And the CTA section displays a muted subheadline
    And the CTA section contains a "Get Started Free" button

  Scenario: CTA button uses accent styling with pill shape
    Then the "Get Started Free" button has background "--sf-accent"
    And the button has border-radius 999px

  # -- Section 7: Footer (CMP-029) ------------------------------------------

  Scenario: Footer has 4-column layout on desktop
    Given the viewport width is 1280px
    Then the footer displays 4 columns: Brand, Product, Resources, Company

  Scenario: Footer displays copyright text
    Then the footer contains copyright text "(c) 2026 SpecForge. All rights reserved."

  Scenario: Footer displays social links
    Then the footer contains links for GitHub, Twitter, and Discord

  Scenario: Footer uses surface background
    Then the footer background is "#08101C"

  Scenario: Footer links use muted color with accent hover
    Then footer links have color "--sf-text-muted"
    When the user hovers over a footer link
    Then the link color changes to "--sf-accent"

  Scenario: External footer links open in new tabs
    Then all external links in the footer have target "_blank"
    And all external links have rel "noopener"

  # -- Responsive Layout -----------------------------------------------------

  Scenario: Content is centered with max-width on desktop
    Given the viewport width is 1440px
    Then section content is constrained to max-width 1200px
    And section content is centered horizontally

  # -- Animations and Motion -------------------------------------------------

  Scenario: Animations respect reduced motion preference
    Given the user has enabled "prefers-reduced-motion: reduce"
    Then the hero hexagon grid animation is paused
    And the terminal typing animation is disabled
    And hover transform effects are disabled

  # -- Typography ------------------------------------------------------------

  Scenario: Landing page uses three font families
    Then headlines use font-family "Rajdhani"
    And body text uses font-family "Inter"
    And code/terminal text uses font-family "JetBrains Mono"

  # -- No Auth / No Session --------------------------------------------------

  Scenario: Landing page requires no authentication
    Given the user is not authenticated
    Then the landing page renders fully

  Scenario: Landing page requires no active session
    Given no session is active
    Then the landing page renders fully

  # -- Navigation from Landing Page ------------------------------------------

  Scenario: Get Started CTA navigates to the app
    When the user clicks the "Get Started" primary CTA
    Then the user is navigated to the app shell at "/#home"

  Scenario: View Documentation CTA navigates to docs
    When the user clicks the "View Documentation" secondary CTA
    Then the user is navigated to the documentation site

  # -- Accessibility ---------------------------------------------------------

  Scenario: Hero section has banner landmark
    Then the hero section has role "banner"

  Scenario: Feature grid has region landmark
    Then the feature grid section has role "region"
    And the section has aria-label "Key features"

  Scenario: Footer has contentinfo landmark
    Then the footer section has role "contentinfo"

  Scenario: All interactive elements are keyboard accessible
    Then all CTA buttons are focusable via keyboard
    And all footer links are focusable via keyboard

  Scenario: Page has a single h1 heading
    Then the page contains exactly one h1 element
    And the h1 is the hero headline
