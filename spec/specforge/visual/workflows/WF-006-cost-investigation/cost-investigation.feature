@WF-006
Feature: Cost Investigation
  As a user
  I want to investigate cost distribution when budget warnings appear
  So that I can identify cost drivers and make informed decisions about budget usage

  Background:
    Given the app shell (PG-010) is rendered
    And an active session exists
    And the cost tracker store has summary:
      | totalCost | inputTokens | outputTokens | budgetPercent |
      | 2.50      | 120000      | 40000        | 65            |
    And the filter store costs slice has default values

  # --- Budget Warning Detection ---

  Scenario: User notices warning indicator in status bar
    Given the budget percent is 65
    And the budget zone is "warning"
    Then the status bar (CMP-002) shows a yellow dot
    And the status bar displays "Budget warning" label
    And the indicator is visible on every view

  Scenario: Status bar shows critical indicator
    Given the budget percent is 90
    And the budget zone is "critical"
    Then the status bar shows an orange dot
    And the status bar displays "Budget critical" label

  Scenario: Status bar shows exhausted indicator with pulse
    Given the budget percent is 98
    And the budget zone is "exhausted"
    Then the status bar shows a red pulsing dot
    And the status bar displays "Budget exhausted" label

  Scenario: Status bar shows no warning when safe
    Given the budget percent is 40
    And the budget zone is "safe"
    Then the status bar shows a green dot
    And no warning label is displayed

  # --- Navigate to Cost Tracker ---

  Scenario: User navigates to Cost Tracker from status bar
    Given the user notices the budget warning in the status bar
    When the user clicks the Costs nav item
    Then ACT-001 (navigate to view) fires with viewId "costs"
    And EVT-001-view-changed dispatches
    And PG-008-cost-tracker renders

  # --- Summary Cards ---

  Scenario: Cost summary cards display aggregate data
    Given the Cost Tracker view is displayed
    Then the cost summary cards (CMP-017) show:
      | metric        | value   |
      | Total Cost    | $2.50   |
      | Input Tokens  | 120,000 |
      | Output Tokens | 40,000  |
    And the budget gauge shows 65% fill

  Scenario: Budget gauge reflects warning zone
    Given the budget percent is 65
    When the Cost Tracker view renders
    Then the budget gauge fill color is "#FFD600" (yellow)
    And the gauge shows "Budget running low" text

  Scenario: Budget gauge reflects critical zone
    Given the budget percent is 90
    When the Cost Tracker view renders
    Then the budget gauge fill color is "#FF5E00" (orange)
    And the gauge shows "Budget critical" text

  Scenario: Budget gauge reflects exhausted zone
    Given the budget percent is 98
    When the Cost Tracker view renders
    Then the budget gauge fill color is "#FF3B3B" (red)
    And the gauge has a pulsing animation
    And the gauge shows "Budget exhausted" text

  Scenario Outline: Budget gauge color by zone
    Given the budget percent is <percent>
    When the budget gauge renders
    Then the gauge fill color is "<color>"

    Examples:
      | percent | color   |
      | 30      | #22C55E |
      | 65      | #FFD600 |
      | 90      | #FF5E00 |
      | 98      | #FF3B3B |

  # --- Phase Cost Table (Default View) ---

  Scenario: Phase cost table shows by default
    Given the Cost Tracker view is displayed
    And the costs viewMode is "by-phase"
    Then the phase cost table (CMP-018) is visible
    And the agent cost table (CMP-019) is hidden

  Scenario: Phase cost table displays phase breakdown
    Given the cost tracker store has byPhase:
      | phase            | inputTokens | outputTokens | cost |
      | discovery        | 45000       | 12000        | 0.85 |
      | spec-generation  | 60000       | 23000        | 1.35 |
      | implementation   | 15000       | 5000         | 0.30 |
    When the phase cost table renders
    Then it shows 3 rows
    And the "spec-generation" row shows cost $1.35
    And the "discovery" row shows cost $0.85
    And the "implementation" row shows cost $0.30

  Scenario: Top cost phase is highlighted
    Given the cost tracker store has byPhase with "spec-generation" as the highest cost
    When the topCostPhase selector is evaluated
    Then the result phase is "spec-generation"
    And the summary cards highlight "spec-generation" as the top cost phase

  # --- Switch to By-Agent View ---

  Scenario: User switches to by-agent view
    Given the Cost Tracker shows the phase cost table
    When the user clicks the "by-agent" toggle
    Then ACT-027 (toggle view mode) fires
    And EVT-018-filter-changed dispatches with view "costs", key "viewMode", value "by-agent"
    And the phase cost table (CMP-018) hides
    And the agent cost table (CMP-019) renders

  Scenario: Agent cost table displays agent breakdown
    Given the cost tracker store has byAgent:
      | agentRole    | inputTokens | outputTokens | cost | invocations |
      | orchestrator | 20000       | 8000         | 0.45 | 12          |
      | analyst      | 50000       | 15000        | 1.05 | 8           |
      | writer       | 35000       | 12000        | 0.75 | 5           |
      | reviewer     | 10000       | 3000         | 0.18 | 3           |
      | architect    | 5000        | 2000         | 0.07 | 2           |
    And the viewMode is "by-agent"
    When the agent cost table renders
    Then it shows 5 rows
    And the "analyst" row shows cost $1.05 and 8 invocations
    And the "writer" row shows cost $0.75 and 5 invocations

  Scenario: Agent rows are colored by role
    Given the agent cost table is displayed
    Then the "orchestrator" row uses color "#00F0FF"
    And the "analyst" row uses color "#A78BFA"
    And the "writer" row uses color "#34D399"
    And the "reviewer" row uses color "#F472B6"
    And the "architect" row uses color "#FBBF24"

  Scenario: Top cost agent is highlighted
    Given the cost tracker store has byAgent with "analyst" as the highest cost
    When the topCostAgent selector is evaluated
    Then the result agentRole is "analyst"
    And the summary cards highlight "analyst" as the top cost agent

  # --- Switch Back to By-Phase View ---

  Scenario: User switches back to by-phase view
    Given the costs viewMode is "by-agent"
    When the user clicks the "by-phase" toggle
    Then EVT-018-filter-changed dispatches with view "costs", key "viewMode", value "by-phase"
    And the agent cost table hides
    And the phase cost table renders

  # --- Filtering Cost Data ---

  Scenario: User filters to a specific phase
    Given the phase cost table shows 3 phases
    When the user selects "spec-generation" in the phases filter
    Then EVT-018-filter-changed dispatches with view "costs", key "phases", value ["spec-generation"]
    And the phase cost table shows only the "spec-generation" row

  Scenario: User filters to specific agent roles
    Given the agent cost table shows 5 agents
    And the viewMode is "by-agent"
    When the user selects "analyst" and "writer" in the agentRoles filter
    Then EVT-018-filter-changed dispatches with view "costs", key "agentRoles", value ["analyst", "writer"]
    And the agent cost table shows only the "analyst" and "writer" rows

  Scenario: User clears cost filters
    Given cost filters have phases ["spec-generation"] active
    When the user clicks "Clear All" on the Cost Tracker
    Then EVT-019-filters-reset dispatches with view "costs"
    And all cost filters return to defaults
    And the cost tables show unfiltered data

  # --- Identifying Cost Drivers ---

  Scenario: Identify phase-dominated cost pattern
    Given the byPhase data shows:
      | phase            | cost |
      | discovery        | 0.50 |
      | spec-generation  | 3.80 |
      | implementation   | 0.20 |
    When the user reviews the phase cost table
    Then "spec-generation" is clearly the dominant cost at $3.80
    And the topCostPhase selector returns "spec-generation"

  Scenario: Identify agent-dominated cost pattern
    Given the byAgent data shows:
      | agentRole    | cost |
      | orchestrator | 0.30 |
      | analyst      | 3.50 |
      | writer       | 0.40 |
      | reviewer     | 0.20 |
      | architect    | 0.10 |
    When the user reviews the agent cost table
    Then "analyst" is clearly the dominant cost at $3.50
    And the topCostAgent selector returns "analyst"

  Scenario: Evenly distributed costs
    Given the byPhase data shows:
      | phase            | cost |
      | discovery        | 1.10 |
      | spec-generation  | 1.20 |
      | implementation   | 1.05 |
    When the user reviews the phase cost table
    Then no single phase dominates
    And the costs are roughly evenly distributed

  # --- Return to Chat ---

  Scenario: User returns to Chat and sees budget bar
    Given the user has finished cost investigation
    And the budget percent is 72
    When the user navigates to the Chat view (PG-002)
    Then PG-002-chat renders
    And the token budget bar (CMP-007) shows 72% fill
    And the budget bar color is yellow (warning zone)
    And the chat input remains enabled

  Scenario: Chat reflects exhausted budget from cost investigation
    Given the budget percent is 98
    When the user navigates to the Chat view
    Then the token budget bar shows 98% fill with red pulsing color
    And the chat input is disabled
    And a "Budget exhausted" message is displayed

  Scenario: Budget bar in Chat matches Cost Tracker gauge
    Given the budget percent is 75
    When the user checks the Cost Tracker gauge
    And the user navigates to Chat
    Then both the Cost Tracker gauge and the Chat budget bar show 75%
    And both use yellow (warning zone) coloring

  # --- Real-Time Updates ---

  Scenario: Cost data updates while viewing Cost Tracker
    Given the Cost Tracker view is displayed with budget percent 65
    When EVT-018 (cost-summary-updated) fires with budgetPercent 85
    Then the summary cards update to reflect the new totals
    And the budget gauge transitions from warning (yellow) to critical (orange)

  Scenario: Phase costs update in real-time
    Given the phase cost table is displayed
    When EVT-019 (phase-costs-loaded) fires with updated phase data
    Then the phase cost table refreshes with the new values

  # --- End-to-End Cost Investigation ---

  Scenario: Complete cost investigation journey
    Given the user is on the Pipeline view
    And the status bar shows a yellow "Budget warning" indicator at 70%
    When the user clicks the Costs nav item
    And the Cost Tracker loads with summary showing $3.25 total, 70% budget
    And the phase cost table shows "spec-generation" as the highest cost at $2.10
    And the user switches to by-agent view
    And the agent cost table shows "analyst" as the highest cost at $1.50
    And the user filters agentRoles to ["analyst"]
    And the user confirms the analyst in spec-generation is the cost driver
    And the user clears filters
    And the user navigates back to the Chat view
    Then the Chat budget bar shows 70% in the warning zone
    And the chat input remains enabled for continued use

  Scenario: Cost investigation leads to budget exhaustion awareness
    Given the user investigates costs and sees budget at 92% (critical)
    When the user reviews phase and agent breakdowns
    And identifies that the "analyst" agent in "spec-generation" consumed 60% of the budget
    And the user returns to Chat
    Then the budget bar shows critical (orange)
    And the user understands the remaining budget is limited
