@CMP-026-cli-demo-terminal
Feature: CLI Demo Terminal
  Animated terminal window showing the SpecForge CLI in action with
  typewriter effect, output lines, and terminal chrome styling.

  Background:
    Given the landing page is rendered
    And the CLI demo terminal section is visible

  # -- Terminal Window --

  Scenario: Terminal window has correct shape and border
    Then the terminal window has border-radius 12px
    And the terminal window has border "1px solid rgba(0, 240, 255, 0.1)"
    And the terminal window has overflow hidden

  Scenario: Terminal is horizontally centered
    Then the terminal container has max-width 720px
    And the terminal container has margin 0 auto
    And the terminal container has padding "80px 24px"

  # -- Chrome Bar --

  Scenario: Chrome bar displays three traffic-light dots
    Then the chrome bar contains 3 dots
    And dot 1 has color "#FF5F57"
    And dot 2 has color "#FEBC2E"
    And dot 3 has color "#28C840"

  Scenario: Traffic-light dots are sized and spaced correctly
    Then each chrome dot has width 12px and height 12px
    And the dots have 8px gap between them

  Scenario: Chrome bar displays "Terminal" title
    Then the chrome bar contains text "Terminal"
    And the chrome title uses font-family "--sf-font-body"
    And the chrome title has font-size 12px
    And the chrome title has color "--sf-text-muted"
    And the chrome title is horizontally centered

  Scenario: Chrome bar has correct background and border
    Then the chrome bar has background "rgba(8, 16, 28, 0.8)"
    And the chrome bar has border-bottom "1px solid rgba(0, 240, 255, 0.06)"
    And the chrome bar has padding "12px 16px"

  # -- Terminal Body --

  Scenario: Terminal body has correct styling
    Then the terminal body has background "--sf-surface"
    And the terminal body has padding 20px
    And the terminal body has min-height 280px
    And the terminal body uses font-family "--sf-font-mono"
    And the terminal body has font-size 13px
    And the terminal body has line-height 1.7

  # -- ELM-080 CLI Demo Line --

  Scenario: Command lines render with text color
    Then each command-type line has color "--sf-text"

  Scenario: Output lines render with muted color
    Then each output-type line has color "--sf-text-muted"

  Scenario: Comment lines render with accent tint and italic
    Then each comment-type line has color "rgba(0, 240, 255, 0.4)"
    And each comment-type line has font-style "italic"

  Scenario: All lines use monospace font
    Then each demo line uses font-family "--sf-font-mono"
    And each demo line has font-size 13px
    And each demo line has white-space "pre-wrap"

  Scenario: Demo shows the expected command
    Then the first line displays command text "specforge init --package @my/app"

  Scenario: Demo shows expected output lines
    Then the demo contains output line "Scanning package structure..."
    And the demo contains output line "Found 24 source files, 8 test files"
    And the demo contains output line "Starting discovery conversation..."
    And the demo contains output line "Spawning agents: [architect] [analyst] [writer] [reviewer]"
    And the demo contains output line "Generating specifications..."
    And the demo contains output line "Created 12 spec files in ./spec/"
    And the demo contains output line "Done in 47.3s"

  Scenario: Demo shows comment line
    Then the demo contains comment line "# AI agents collaborate to understand your codebase"

  # -- ELM-081 CLI Demo Prompt --

  Scenario: Prompt displays accent-colored dollar sign
    Then the prompt text is "$ "
    And the prompt has color "--sf-accent"
    And the prompt has display "inline"
    And the prompt has margin-right 8px

  Scenario: Prompt only appears before command-type lines
    Then command lines are preceded by the "$" prompt
    And output lines are not preceded by the "$" prompt
    And comment lines are not preceded by the "$" prompt

  # -- Typing Animation --

  Scenario: Command text is typed with animation effect
    When the terminal animation begins
    Then the command characters appear one at a time
    And each character appears after a 40ms delay

  Scenario: Cursor blinks during typing
    When the command is being typed
    Then a blinking cursor is visible at the typing position
    And the cursor blinks at 530ms intervals
    And the cursor has color "--sf-accent"

  Scenario: Cursor disappears after command is typed
    When the full command has been typed
    Then the blinking cursor disappears
    And the first output line begins to appear

  Scenario: Output lines appear with staggered delay
    When the command has finished typing
    Then each subsequent line appears after a 300ms delay

  Scenario: Animation starts after an initial delay
    When the terminal section enters the viewport
    Then the animation begins after a 500ms initial delay

  # -- Reduced Motion --

  Scenario: Animation respects reduced-motion preference
    Given the user has enabled "prefers-reduced-motion: reduce"
    Then all terminal text appears immediately without typing animation
    And the cursor blink animation is disabled
    And the scanline effect is static

  # -- Scanline Effect --

  Scenario: Scanline overlay is rendered on terminal body
    Then the terminal body has a scanline overlay
    And the scanline uses alternating 2px bands
    And the scanline tint is "rgba(0, 240, 255, 0.02)"
    And the scanline has pointer-events "none"

  # -- Custom Props --

  Scenario: Custom lines array is rendered
    Given the terminal receives a custom lines array with 3 items
    Then 3 lines are displayed in the terminal body

  # -- Accessibility --

  Scenario: Terminal section has region landmark
    Then the terminal section has role "region"
    And the terminal section has aria-label "CLI demonstration"
