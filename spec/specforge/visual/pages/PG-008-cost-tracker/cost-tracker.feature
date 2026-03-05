@PG-008-cost-tracker
Feature: Cost Tracker Page
  As a user managing token budgets
  I want to view cost breakdowns by phase and agent
  So that I can monitor spending and optimize token allocation

  Background:
    Given the application shell is rendered
    And the user navigates to the "#costs" route

  # -- Page Layout -----------------------------------------------------------

  Scenario: Cost tracker page renders in single-column layout
    Then the cost tracker page uses a single-column layout
    And the content area has 24px padding

  Scenario: Page sections render in correct order
    Given a session is active with cost data
    Then the filter bar (CMP-004) is rendered first
    And the summary cards (CMP-017) are rendered below the filter bar
    And the cost table is rendered below the summary cards

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state when no session is selected
    Given the active session store has sessionId null
    Then the page displays "Select a session to view cost data."
    And the filter bar is not visible
    And the summary cards are not visible
    And no cost table is visible

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state when session is active but no cost data exists
    Given the active session store has an active session
    And the cost tracker store has totalCost 0
    Then the summary cards display zeroed values
    And the Total Cost card shows "$0.00"
    And the Input Tokens card shows "0"
    And the Output Tokens card shows "0"
    And the Budget % card shows "0%"
    And the page displays "No cost data recorded yet."
    And no cost table is visible

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton elements
    Given the active session store has an active session
    And cost data is being fetched
    Then the summary cards display skeleton shimmers
    And the table displays 3 skeleton rows

  # -- Populated State -------------------------------------------------------

  Scenario: Populated state renders all components
    Given the active session store has an active session
    And the cost tracker store has totalCost 12.47
    Then the summary cards display populated values
    And the cost table is rendered with data rows

  # -- Summary Cards ---------------------------------------------------------

  Scenario: Total Cost card displays formatted dollar amount
    Given the cost tracker store summary totalCost is 12.47
    Then the Total Cost card displays "$12.47"
    And the value uses font "--sf-font-display" at 28px

  Scenario: Input Tokens card displays formatted count
    Given the cost tracker store summary inputTokens is 1234567
    Then the Input Tokens card displays "1,234,567"
    And the value uses font "--sf-font-mono" at 24px

  Scenario: Output Tokens card displays formatted count
    Given the cost tracker store summary outputTokens is 456789
    Then the Output Tokens card displays "456,789"
    And the value uses font "--sf-font-mono" at 24px

  Scenario: Budget gauge card displays percentage with bar
    Given the cost tracker store summary budgetPercent is 62
    Then the Budget % card displays a gauge bar filled to 62%
    And the gauge displays the text "62%"

  Scenario: Summary cards always show unfiltered session totals
    Given the cost tracker store has totalCost 12.47
    And the filter store costs.phases is set to ["discovery"]
    Then the Total Cost card still displays "$12.47"

  # -- Budget Gauge Color Zones ----------------------------------------------

  Scenario: Budget gauge is accent color in safe zone
    Given the cost tracker store summary budgetPercent is 45
    Then the budget gauge fill color is "--sf-accent"
    And the gauge has no pulsing animation

  Scenario: Budget gauge is orange in warning zone
    Given the cost tracker store summary budgetPercent is 72
    Then the budget gauge fill color is "#FF8C00"
    And the gauge has no pulsing animation

  Scenario: Budget gauge is red in critical zone
    Given the cost tracker store summary budgetPercent is 90
    Then the budget gauge fill color is "#FF3B3B"
    And the gauge has no pulsing animation

  Scenario: Budget gauge pulses in exhausted zone
    Given the cost tracker store summary budgetPercent is 97
    Then the budget gauge fill color is "#FF3B3B"
    And the gauge fill pulses between opacity 0.6 and 1.0
    And the pulse animation cycle is 1.5s infinite

  Scenario: Budget gauge pulsing respects reduced motion preference
    Given the cost tracker store summary budgetPercent is 97
    And the user has enabled "prefers-reduced-motion: reduce"
    Then the budget gauge pulsing animation is paused

  # -- View Mode Toggle ------------------------------------------------------

  Scenario: Default view mode is by-phase
    Then the view mode toggle has "By Phase" selected
    And the phase cost table (CMP-018) is visible
    And the agent cost table (CMP-019) is not visible

  Scenario: Switching to by-agent view shows agent table
    When the user clicks "By Agent" in the view mode toggle
    Then the agent cost table (CMP-019) is visible
    And the phase cost table (CMP-018) is not visible

  Scenario: Switching back to by-phase view shows phase table
    Given the view mode is "by-agent"
    When the user clicks "By Phase" in the view mode toggle
    Then the phase cost table (CMP-018) is visible
    And the agent cost table (CMP-019) is not visible

  Scenario: View mode toggle uses accent styling for active segment
    Then the active toggle segment has background "--sf-accent"
    And the active toggle segment has text color "--sf-bg"
    And the inactive toggle segment has background "--sf-surface"
    And the inactive toggle segment has text color "--sf-text-muted"

  # -- Phase Cost Table (CMP-018) -------------------------------------------

  Scenario: Phase cost table renders correct columns
    Given the view mode is "by-phase"
    Then the table displays columns "Phase", "Input Tokens", "Output Tokens", "Cost", "%"

  Scenario: Phase cost table renders one row per phase
    Given the cost tracker store byPhase contains 5 phases
    And the view mode is "by-phase"
    Then the table displays 5 data rows plus a totals row

  Scenario: Phase cost table has a bold totals row
    Given the view mode is "by-phase"
    Then the last row in the phase table displays "TOTAL"
    And the totals row is bold

  Scenario: Phase cost table sorts by cost descending by default
    Given the view mode is "by-phase"
    Then the first data row shows the phase with the highest cost

  # -- Agent Cost Table (CMP-019) -------------------------------------------

  Scenario: Agent cost table renders correct columns
    Given the view mode is "by-agent"
    Then the table displays columns "Agent Role", "Input Tokens", "Output Tokens", "Cost", "Calls"

  Scenario: Agent cost table renders one row per agent
    Given the cost tracker store byAgent contains 8 agents
    And the view mode is "by-agent"
    Then the table displays 8 data rows plus a totals row

  Scenario: Agent cost table has a bold totals row
    Given the view mode is "by-agent"
    Then the last row in the agent table displays "TOTAL"
    And the totals row is bold

  # -- Filtering -------------------------------------------------------------

  Scenario: Filtering by phase narrows phase table rows
    Given the view mode is "by-phase"
    And the cost tracker store byPhase contains 5 phases
    When the user selects "discovery" and "planning" in the phases filter
    Then only rows for "discovery" and "planning" are displayed in the phase table

  Scenario: Filtering by agent role narrows agent table rows
    Given the view mode is "by-agent"
    And the cost tracker store byAgent contains 8 agents
    When the user selects "architect" in the agent roles filter
    Then only the row for "architect" is displayed in the agent table

  Scenario: Clearing filters shows all rows
    Given the phases filter is set to ["discovery"]
    When the user clicks "Clear All" in the filter bar
    Then all phase rows are displayed

  # -- Table Sorting ---------------------------------------------------------

  Scenario: Clicking a column header sorts the table
    Given the view mode is "by-phase"
    When the user clicks the "Input Tokens" column header
    Then the table rows are sorted by Input Tokens descending

  Scenario: Clicking the same column header again reverses sort direction
    Given the table is sorted by "Cost" descending
    When the user clicks the "Cost" column header again
    Then the table rows are sorted by Cost ascending

  # -- Number Formatting -----------------------------------------------------

  Scenario: Token counts use comma separators
    Given a phase has inputTokens 1234567
    Then the Input Tokens cell displays "1,234,567"

  Scenario: Cost values use dollar prefix and two decimals
    Given a phase has cost 3.21
    Then the Cost cell displays "$3.21"

  Scenario: Percentage values use one decimal with percent suffix
    Given a phase has 25.7% of total cost
    Then the % cell displays "25.7%"

  # -- Store Bindings --------------------------------------------------------

  Scenario: Page reads cost data from cost tracker store
    Given the cost tracker store (STR-010) has summary totalCost 12.47
    Then the Total Cost card displays "$12.47"

  Scenario: Page reads filter state from filter store
    Given the filter store (STR-001) costs.viewMode is "by-agent"
    Then the agent cost table is visible

  Scenario: Page reads session state from active session store
    Given the active session store (STR-002) has sessionId null
    Then the no-session state is displayed

  # -- Accessibility ---------------------------------------------------------

  Scenario: Summary cards have accessible labels
    Then each summary card has an aria-label describing its metric

  Scenario: Budget gauge has accessible description
    Then the budget gauge has role "progressbar"
    And the budget gauge has aria-valuenow matching the budget percent
    And the budget gauge has aria-valuemin 0
    And the budget gauge has aria-valuemax 100

  Scenario: Cost tables have correct ARIA role
    Then the visible cost table has role "table"
    And the table has aria-label describing the breakdown type
