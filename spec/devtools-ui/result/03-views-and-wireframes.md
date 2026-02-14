_Previous: [02-instrumentation.md](02-instrumentation.md) | Next: [04-railway-pipeline.md](04-railway-pipeline.md)_

# 3. Views & Wireframes

## 3.1 Panel Layout

The Result Panel uses a master-detail layout with a view switcher toolbar.

```
+============================================================================+
| [Railway] [Log] [Cases] [Sankey] [Waterfall] [Combinator] [Overview]  [?] |
+============================================================================+
|                                                                            |
|                         Active View Area                                   |
|                       (fills remaining space)                              |
|                                                                            |
|                                                                            |
+============================================================================+
| Chain: validateUser  |  Last: Ok  |  Ok: 847  Err: 23  |  Stability: 97%  |
+============================================================================+
```

### Toolbar Region

- 7 view toggle buttons (icon + label), mutually exclusive
- `[?]` opens educational sidebar overlay
- Active view button has accent underline

### Status Bar Region

- Shows context of the currently selected chain/port
- Last execution result (Ok/Err badge)
- Aggregate counters
- Stability score with color coding (green > 95%, amber 80-95%, red < 80%)

## 3.2 Component Tree

```
ResultPanel
  ResultPanelToolbar              -- View switcher + help toggle
  ResultPanelStatusBar            -- Chain context + aggregate stats
  ResultPanelContent              -- Renders active view
    RailwayPipelineView           -- (Section 4)
      RailwayCanvas               -- SVG canvas with zoom/pan
        RailwayTrack              -- Ok track (green line)
        RailwayTrack              -- Err track (red line)
        RailwayNode[]             -- Operation nodes at junctions
        RailwaySwitch[]           -- Track-switch indicators
        RailwayParticle[]         -- Animated flow particles
      RailwayNodeDetail           -- Side panel for selected node
    OperationLogView              -- (Section 5)
      OperationLogList            -- Scrollable step list
        OperationLogEntry[]       -- Individual step rows
      OperationLogDetail          -- Value inspector + diff
        JsonTree                  -- Reuse existing component
    CaseExplorerView              -- (Section 6)
      CaseExplorerPathTree        -- Branching path tree
        CaseExplorerPathNode[]    -- Individual path nodes
      CaseExplorerOverlay         -- Runtime frequency overlay
      CaseExplorerSimulator       -- What-if simulation controls
      CaseExplorerCoverage        -- Path coverage metrics
    SankeyStatisticsView          -- (Section 7)
      SankeyDiagram               -- SVG Sankey flow diagram
        SankeyColumn[]            -- Vertical node columns
        SankeyLink[]              -- Curved flow paths
      SankeyLegend                -- Color/width legend
      SankeyHotspotList           -- Error hotspot rankings
    AsyncWaterfallView            -- (Section 8)
      WaterfallTimeline           -- Horizontal timeline with scale
        WaterfallRow[]            -- Per-step duration bars
        WaterfallNesting          -- Nested async call indicators
      WaterfallSummary            -- Duration breakdown pie chart
    CombinatorMatrixView          -- (Section 9)
      CombinatorGrid              -- Grid of input Results
        CombinatorCell[]          -- Individual Result cell
      CombinatorOutput            -- Combined output Result
      CombinatorFlowDiagram       -- How inputs merge
    OverviewDashboardView         -- (Section 3.7)
      StatCardRow                 -- Top-level metric cards
      ErrorDistributionChart      -- Pie/donut chart
      StabilityTimeline           -- Sparkline per port
      TopErrorsList               -- Most frequent errors
  EducationalSidebar              -- (Section 12)
    GlossaryPanel                 -- Method reference
    WalkthroughPanel              -- Guided tours
    ComparisonCard                -- Side-by-side operation comparison
```

## 3.3 View: Railway Pipeline (Primary)

```
+--[Chain Selector: v validateUser     ]--[Execution: #847 v]--[Play ▶]--+
|                                                                         |
|  ====[Ok Track]=========================================================|
|       |          |            |            |           |                 |
|    [ok(42)]-->[map(f)]-->[andThen(g)]-->[orElse(h)]-->[match]           |
|       |          |            |            |           |                 |
|  ====[Err Track]========================================================|
|                                                                         |
|  Legend: ● Ok  ○ Err  ⚡ Switch  ◆ Terminal                             |
+---------+---------------------------------------------------------------+
|         |  Selected: andThen(g)                                         |
| Node    |  Category: chaining                                           |
| Detail  |  Input: Ok(43) → Output: Err(ValidationError)                 |
| Panel   |  Track: Ok → Err (switched!)                                  |
|         |  Duration: 0.02ms                                             |
|         |  Callback: src/validators.ts:42                               |
+---------+---------------------------------------------------------------+
```

See [04-railway-pipeline.md](04-railway-pipeline.md) for full specification.

## 3.4 View: Operation Log

```
+--[Chain: validateUser]--[Execution: #847 v]--[Diff Mode: ○]--[Filter]--+
|                                                                          |
|  # | Method     | Track     | Value Preview         | Duration           |
|  --|------------|-----------|----------------------|--------             |
|  0 | ok         | → Ok      | 42                   | --                  |
|  1 | map        | Ok → Ok   | 43                   | <0.01ms             |
|  2 | andThen    | Ok → Err  | ValidationError      | 0.02ms    ← SWITCH |
|  3 | orElse     | Err → Ok  | { default: true }    | <0.01ms   ← SWITCH |
|  4 | match      | Ok → ■    | "success"            | <0.01ms             |
|                                                                          |
+---+----------------------------------------------------------------------+
|   |  Step 2: andThen(validate)                                           |
|   |                                                                      |
|   |  Input (Ok):                                                         |
|   |    ▸ { value: 43 }                                                   |
|   |                                                                      |
|   |  Output (Err):                                                       |
| V |    ▸ { _tag: "ValidationError",                                      |
| a |        field: "email",                                               |
| l |        message: "invalid format" }                                   |
| u |                                                                      |
| e |  Diff (input → output):                                              |
|   |    - Track: Ok → Err                                                 |
|   |    - Value changed entirely (different type)                         |
+---+----------------------------------------------------------------------+
```

See [05-operation-log.md](05-operation-log.md) for full specification.

## 3.5 View: Case Explorer

```
+--[Chain: validateUser]--[Observed: 870 runs]--[Simulate ▶]--[Reset]----+
|                                                                          |
|  Path Tree (all possible paths):                                         |
|                                                                          |
|  ok(x) ─── map(f) ─┬─ andThen(g): Ok ── orElse(h): Ok ── match: Ok     |
|                     │   72.3%  (629 runs)  ███████████████████            |
|                     │                                                    |
|                     └─ andThen(g): Err ─┬─ orElse(h): Ok ── match: Ok    |
|                                         │   25.1%  (218 runs)  ████████  |
|                                         │                                |
|                                         └─ orElse(h): Err ── match: Err  |
|                                             2.6%  (23 runs)  █           |
|                                                                          |
|  [What-If: Change andThen(g) to always Err ▼]                           |
|                                                                          |
+---+----------------------------------------------------------------------+
|   |  Path: Ok → Ok → Err → Ok → Ok (recovered)                          |
|   |  Frequency: 25.1% (218 / 870 runs)                                  |
|   |  Switch points: step 2 (Ok→Err), step 3 (Err→Ok)                    |
|   |  Description: "Validation fails but recovery succeeds"              |
|   |  Last seen: 2 minutes ago                                            |
|   |                                                                      |
|   |  Example execution: #834                                             |
|   |    Entry value: { email: "bad@", name: "Alice" }                    |
|   |    Error at step 2: ValidationError { field: "email" }              |
|   |    Recovery at step 3: { default: true, name: "Alice" }             |
+---+----------------------------------------------------------------------+
```

See [06-case-explorer.md](06-case-explorer.md) for full specification.

## 3.6 View: Sankey Statistics

```
+--[Port Filter: All ▼]--[Time Range: Last 1h ▼]--[Min Flow: 1% ▼]------+
|                                                                          |
|  Entry          map           andThen        orElse         Terminal      |
|  ┌─────┐      ┌─────┐       ┌─────┐       ┌─────┐        ┌─────┐       |
|  │     │══════│     │═══════│     │═══════│     │════════│ Ok  │       |
|  │ Ok  │      │ Ok  │       │ Ok  │   ╔═══│ Ok  │        │ 97% │       |
|  │ 100%│      │ 100%│       │ 72% │   ║   │ 97% │        └─────┘       |
|  └─────┘      └─────┘       └─────┘   ║   └─────┘        ┌─────┐       |
|                              ┌─────┐   ║                  │ Err │       |
|                              │ Err │═══╝                  │  3% │       |
|                              │ 28% │══════════════════════└─────┘       |
|                              └─────┘                                     |
|                                                                          |
|  Hotspots:                                                               |
|   1. andThen(validate) — 28% switch rate  ██████████                     |
|   2. orElse(recover) — 90% recovery rate  █████████████████████████      |
|                                                                          |
+--------------------------------------------------------------------------+
```

See [07-sankey-statistics.md](07-sankey-statistics.md) for full specification.

## 3.7 View: Overview Dashboard

```
+--------------------------------------------------------------------------+
|  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                 |
|  │ Total    │  │ Ok Rate  │  │ Chains   │  │ Active   │                 |
|  │ 12,847   │  │ 96.3%    │  │ 14       │  │ 8 ports  │                 |
|  │ calls    │  │ ▲ 0.2%   │  │ traced   │  │ with Err │                 |
|  └──────────┘  └──────────┘  └──────────┘  └──────────┘                 |
|                                                                          |
|  ┌─── Error Distribution ────┐  ┌─── Stability Timeline ──────────────┐ |
|  │                           │  │                                      │ |
|  │   ValidationError  42%    │  │  ──────────╲    ╱──────────────      │ |
|  │   ██████████████          │  │             ╲──╱                     │ |
|  │   NetworkError    31%     │  │  100% ───────────────────── 97%      │ |
|  │   ██████████              │  │                                      │ |
|  │   TimeoutError    18%     │  │  ─── validateUser  ─── fetchData     │ |
|  │   ██████                  │  │                                      │ |
|  │   Other            9%     │  │  Last 1 hour                         │ |
|  │   ███                     │  │                                      │ |
|  └───────────────────────────┘  └──────────────────────────────────────┘ |
|                                                                          |
|  ┌─── Top Errors ────────────────────────────────────────────────────┐   |
|  │ Port              │ Error             │ Count │ Last Seen         │   |
|  │ ──────────────────│───────────────────│───────│───────────────    │   |
|  │ validateUser      │ ValidationError   │  23   │ 2 min ago        │   |
|  │ fetchPosts        │ NetworkError      │  18   │ 5 min ago        │   |
|  │ processPayment    │ TimeoutError      │  12   │ 12 min ago       │   |
|  └───────────────────────────────────────────────────────────────────┘   |
+--------------------------------------------------------------------------+
```

## 3.8 View: Async Waterfall

```
+--[Chain: fetchAndProcess]--[Execution: #42 v]--[Scale: Auto ▼]----------+
|                                                                          |
|  Time →  0ms     50ms    100ms    150ms    200ms    250ms               |
|  ├────────┼────────┼────────┼────────┼────────┼────────┤               |
|                                                                          |
|  fromPromise(fetch) ████████████████████░░░░░░  145ms   Ok              |
|    └─ andThen(parse) ░░░░░░░░░░░░░░░░░░█████   42ms    Ok              |
|       └─ asyncMap(transform)            ░░░░██  18ms    Ok              |
|  andThen(validate)                          ░██ 12ms    Err ⚡          |
|  orElse(fallback)                            █░  8ms    Ok  ⚡          |
|  match(...)                                   █  1ms    Ok              |
|                                                                          |
|  Total: 226ms  │  Ok path: 205ms  │  Recovery: 20ms                    |
|                                                                          |
+--------------------------------------------------------------------------+
```

See [08-async-waterfall.md](08-async-waterfall.md) for full specification.

## 3.9 View: Combinator Matrix

```
+--[Combinator: all ▼]--[Execution: #12 v]--------------------------------+
|                                                                          |
|  Inputs:                              Output:                            |
|  ┌──────────────┐                     ┌─────────────────┐               |
|  │ ● fetchUser  │ Ok({ id: 1 })  ──╲ │                 │               |
|  ├──────────────┤                    ═══ ● all(...)      │               |
|  │ ● fetchPosts │ Ok([...3])     ──╱  │   Ok([user,     │               |
|  ├──────────────┤                ──╱  │        posts,   │               |
|  │ ○ fetchTags  │ Err(Timeout)  ──╱   │        tags])   │               |
|  └──────────────┘      ▲              │                 │               |
|                        │              │ ○ Err(Timeout)  │               |
|                   SHORT-CIRCUIT       │   (from input 3) │               |
|                   Input 3 failed,     └─────────────────┘               |
|                   inputs 1-2 were Ok                                     |
|                                                                          |
|  all: short-circuits on first Err. Use allSettled to collect all errors. |
+--------------------------------------------------------------------------+
```

See [09-combinator-matrix.md](09-combinator-matrix.md) for full specification.

_Previous: [02-instrumentation.md](02-instrumentation.md) | Next: [04-railway-pipeline.md](04-railway-pipeline.md)_
