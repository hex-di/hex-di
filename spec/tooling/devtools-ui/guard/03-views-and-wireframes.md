_Previous: [02-instrumentation.md](02-instrumentation.md) | Next: [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md)_

# 3. Views & Wireframes

## 3.1 Panel Layout

The Guard Panel uses a master-detail layout with a view switcher toolbar.

```
+============================================================================+
| [Tree] [Log] [Paths] [Sankey] [Timeline] [Roles] [Overview]          [?]  |
+============================================================================+
|                                                                            |
|                         Active View Area                                   |
|                       (fills remaining space)                              |
|                                                                            |
|                                                                            |
+============================================================================+
| Port: UserService  |  Last: Allow  |  Allow: 847  Deny: 23  |  Rate: 97% |
+============================================================================+
```

### Toolbar Region

- 7 view toggle buttons (icon + label), mutually exclusive
- `[?]` opens educational sidebar overlay
- Active view button has accent underline

### Status Bar Region

- Shows context of the currently selected guarded port
- Last evaluation result (Allow/Deny badge)
- Aggregate counters
- Allow rate with color coding (green > 95%, amber 80-95%, red < 80%)

## 3.2 Component Tree

```
GuardPanel
  GuardPanelToolbar                -- View switcher + help toggle
  GuardPanelStatusBar              -- Port context + aggregate stats
  GuardPanelContent                -- Renders active view
    PolicyEvaluationTreeView       -- (Section 4)
      PolicyTreeCanvas             -- SVG/HTML tree with zoom/pan
        PolicyTreeNode[]           -- Policy nodes (compound + leaf)
        PolicyTreeEdge[]           -- Parent-child connections
        PolicyTreeBadge[]          -- Allow/deny outcome indicators
      PolicyTreeNodeDetail         -- Side panel for selected node
    DecisionLogView                -- (Section 5)
      DecisionLogList              -- Scrollable decision list
        DecisionLogEntry[]         -- Individual decision rows
      DecisionLogDetail            -- Evaluation trace + subject inspector
        JsonTree                   -- Reuse existing component
    PolicyPathExplorerView         -- (Section 6)
      PathExplorerPathTree         -- Branching path tree
        PathExplorerPathNode[]     -- Individual path nodes
      PathExplorerOverlay          -- Runtime frequency overlay
      PathExplorerSimulator        -- What-if subject simulation
      PathExplorerCoverage         -- Path coverage metrics
    AccessFlowStatisticsView       -- (Section 7)
      SankeyDiagram                -- SVG Sankey flow diagram
        SankeyColumn[]             -- Vertical node columns
        SankeyLink[]               -- Curved flow paths
      SankeyLegend                 -- Color/width legend
      SankeyHotspotList            -- Deny hotspot rankings
    EvaluationTimelineView         -- (Section 8)
      TimelineChart                -- Horizontal timeline with scale
        TimelineRow[]              -- Per-node duration bars
        TimelineAsyncMarker[]      -- Async resolution indicators
      TimelineSummary              -- Duration breakdown
    RoleHierarchyGraphView         -- (Section 9)
      RoleGraph                    -- SVG DAG layout
        RoleGraphNode[]            -- Role nodes with permission badges
        RoleGraphEdge[]            -- Inheritance edges
      RoleGraphDetail              -- Selected role detail
        PermissionList             -- Flattened permission list
    OverviewDashboardView          -- (Section 3.7)
      StatCardRow                  -- Top-level metric cards
      DenyDistributionChart        -- Pie/donut chart by reason
      AllowRateTimeline            -- Sparkline per port
      TopDenysList                 -- Most frequent deny reasons
  EducationalSidebar               -- (Section 12)
    PolicyKindGlossary             -- Policy kind reference
    WalkthroughPanel               -- Guided tours
    PatternCard                    -- RBAC/ABAC/ReBAC pattern cards
```

## 3.3 View: Policy Evaluation Tree (Primary)

```
+--[Port Selector: v UserService     ]--[Execution: #847 v]--[Play >>]-----+
|                                                                            |
|                        AllOf                                               |
|                    [allow] (0.15ms)                                        |
|                   /              \                                          |
|           HasRole               AnyOf                                      |
|          "admin"              [allow] (0.12ms)                             |
|        [allow](0.02ms)       /              \                              |
|                      HasPermission    HasAttribute                         |
|                     "user:read"      "dept" eq("eng")                      |
|                   [allow](0.05ms)   [skip](0ms)                           |
|                                                                            |
|  Legend: [allow] = green  [deny] = red  [skip] = gray dashed              |
+--------+------------------------------------------------------------------+
|        |  Selected: HasPermission "user:read"                              |
| Node   |  Kind: hasPermission (RBAC)                                      |
| Detail |  Result: allow                                                    |
| Panel  |  Duration: 0.05ms                                                 |
|        |  Subject has permission: user:read = true                         |
+--------+------------------------------------------------------------------+
```

See [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md) for full specification.

## 3.4 View: Decision Log

```
+--[Port: All v]--[Subject: All v]--[Decision: All v]--[Search]--[Export]---+
|                                                                            |
|  # | Timestamp   | Port          | Subject  | Decision | Policy    | Dur  |
|  --|-------------|---------------|----------|----------|-----------|------|
|  1 | 14:32:01.42 | UserService   | alice    | Allow    | allOf     |0.2ms |
|  2 | 14:32:01.38 | PaymentPort   | bob      | Deny     | hasRole   |0.1ms |
|  3 | 14:32:01.20 | ReportService | charlie  | Allow    | anyOf     |1.2ms |
|  4 | 14:32:00.98 | UserService   | eve      | Deny     | allOf     |0.3ms |
|  5 | 14:31:59.11 | AdminPort     | alice    | Allow    | hasRole   |0.1ms |
|                                                                            |
+---+------------------------------------------------------------------------+
|   |  Decision #2: PaymentPort / bob                                        |
|   |                                                                        |
|   |  Subject:                                                              |
|   |    id: "bob"  roles: ["viewer"]  auth: "jwt"                           |
|   |                                                                        |
|   |  Policy Tree Evaluation:                                               |
|   |    HasRole "payment-admin": DENY                                       |
| D |      reason: subject lacks role 'payment-admin'                        |
| e |                                                                        |
| t |  Audit Entry:                                                          |
| a |    evaluationId: "eval-847"                                            |
| i |    portName: "PaymentPort"                                             |
| l |    decision: "deny"                                                    |
|   |    reason: "subject lacks role 'payment-admin'"                        |
+---+------------------------------------------------------------------------+
```

See [05-decision-log.md](05-decision-log.md) for full specification.

## 3.5 View: Policy Path Explorer

```
+--[Port: UserService]--[Observed: 870 evals]--[Simulate >>]--[Reset]------+
|                                                                            |
|  Path Tree (all possible paths):                                           |
|                                                                            |
|  AllOf ─── HasRole: allow ─┬─ AnyOf: HasPerm: allow ── [ALLOW]           |
|                             |   72.3%  (629 evals)  ////////////////////   |
|                             |                                              |
|                             ├─ AnyOf: HasPerm: deny ── HasAttr: allow     |
|                             |   ── [ALLOW]                                 |
|                             |   20.1%  (175 evals)  //////////////         |
|                             |                                              |
|                             └─ AnyOf: HasPerm: deny ── HasAttr: deny      |
|                                 ── [DENY]                                  |
|                                 5.0%  (43 evals)  ///                      |
|                                                                            |
|  HasRole: deny ── [DENY] (short-circuit AllOf)                            |
|    2.6%  (23 evals)  //                                                    |
|                                                                            |
|  [What-if: Change subject to have role "admin" but no permissions v]      |
|                                                                            |
+---+------------------------------------------------------------------------+
|   |  Path: AllOf -> HasRole:allow -> AnyOf -> HasAttr:allow -> ALLOW      |
|   |  Frequency: 20.1% (175 / 870 evals)                                   |
|   |  Key node: HasAttribute "dept" eq("eng") = allow                      |
|   |  Description: "Permission denied but attribute match succeeds"        |
|   |  Last seen: 2 minutes ago                                              |
+---+------------------------------------------------------------------------+
```

See [06-policy-path-explorer.md](06-policy-path-explorer.md) for full specification.

## 3.6 View: Access Flow Statistics

```
+--[Port Filter: All v]--[Time Range: Last 1h v]--[Min Flow: 1% v]---------+
|                                                                            |
|  Subjects       Roles          Policies        Outcome                     |
|  +-------+    +-------+      +---------+      +-------+                   |
|  | alice |====| admin |======| allOf   |======| Allow |                   |
|  | 45%   |    | 52%   |      | 68%     |      | 95%   |                   |
|  +-------+    +-------+      +---------+      +-------+                   |
|  +-------+    +-------+      +---------+      +-------+                   |
|  | bob   |====|viewer |======|hasRole  |==+===| Deny  |                   |
|  | 30%   |    | 35%   |      | 25%     |  |   |  5%   |                   |
|  +-------+    +-------+      +---------+  |   +-------+                   |
|  +-------+    +-------+                   |                                |
|  | eve   |====| editor|===================+                                |
|  | 25%   |    | 13%   |                                                    |
|  +-------+    +-------+                                                    |
|                                                                            |
|  Hotspots:                                                                 |
|   1. PaymentPort hasRole — 28% deny rate  //////////                       |
|   2. AdminPort allOf — 15% deny rate  ///////                              |
|                                                                            |
+----------------------------------------------------------------------------+
```

See [07-access-flow-statistics.md](07-access-flow-statistics.md) for full specification.

## 3.7 View: Overview Dashboard

```
+----------------------------------------------------------------------------+
|  +----------+  +----------+  +----------+  +----------+                    |
|  | Total    |  | Allow    |  | Guarded  |  | Active   |                    |
|  | 12,847   |  | Rate     |  | Ports    |  | Subjects |                    |
|  | evals    |  | 96.3%    |  | 14       |  | 42       |                    |
|  | ▲ 12%    |  | ▲ 0.2%   |  | +2 new   |  | -3 idle  |                    |
|  +----------+  +----------+  +----------+  +----------+                    |
|                                                                            |
|  +--- Deny Distribution --------+  +--- Allow Rate Timeline -----------+  |
|  |                               |  |                                    |  |
|  |   Missing role     42%       |  |  ──────────╲    ╱──────────────   |  |
|  |   ██████████████             |  |             ╲──╱                  |  |
|  |   Missing perm     31%      |  |  100% ───────────────────── 97%   |  |
|  |   ██████████                 |  |                                    |  |
|  |   Attr mismatch    18%      |  |  ─── UserService  ─── PaymentPort |  |
|  |   ██████                     |  |                                    |  |
|  |   Relationship      9%      |  |  Last 1 hour                      |  |
|  |   ███                        |  |                                    |  |
|  +-------------------------------+  +------------------------------------+  |
|                                                                            |
|  +--- Top Denials --------------------------------------------------+     |
|  | Port            | Reason              | Count | Last Seen        |     |
|  | ────────────────│─────────────────────│───────│────────────────   |     |
|  | PaymentPort     | Missing role        |  23   | 2 min ago        |     |
|  | AdminPort       | Missing permission  |  18   | 5 min ago        |     |
|  | ReportService   | Attr mismatch       |  12   | 12 min ago       |     |
|  +---------------------------------------------------------------+       |
+----------------------------------------------------------------------------+
```

## 3.8 View: Evaluation Timeline

```
+--[Port: UserService]--[Execution: #42 v]--[Scale: Auto v]------------------+
|                                                                              |
|  Time ->  0ms     1ms      2ms      3ms      4ms      5ms                   |
|  +--------+--------+--------+--------+--------+--------+                    |
|                                                                              |
|  AllOf                 ████████████████████████████████  4.2ms  Allow        |
|    HasRole "admin"     ██                                0.1ms  Allow        |
|    AnyOf               ░░██████████████████████████████  4.0ms  Allow        |
|      HasPermission     ░░██                              0.1ms  Deny         |
|      HasAttribute      ░░░░████████████████████████████  3.8ms  Allow  [async]
|        [resolver]      ░░░░░░██████████████████████      3.2ms              |
|      HasRelationship   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   --    Skip         |
|                                                                              |
|  Total: 4.2ms  |  Sync: 0.3ms  |  Async resolver: 3.2ms                    |
|                                                                              |
+------------------------------------------------------------------------------+
```

See [08-evaluation-timeline.md](08-evaluation-timeline.md) for full specification.

## 3.9 View: Role Hierarchy Graph

```
+--[Search: ________]--[Show Permissions: On v]--[Detect Cycles: On v]-------+
|                                                                              |
|                         +--[superAdmin]--+                                   |
|                         | perms: *       |                                   |
|                         +-------+--------+                                   |
|                                 |                                            |
|                    +------------+------------+                               |
|                    |                         |                                |
|            +--[admin]--+           +--[auditor]--+                           |
|            | user:*    |           | report:read |                           |
|            | report:*  |           | audit:read  |                           |
|            +-----+-----+           +-------------+                           |
|                  |                                                            |
|        +---------+---------+                                                 |
|        |                   |                                                 |
|  +--[editor]--+     +--[viewer]--+                                          |
|  | doc:write  |     | doc:read   |                                          |
|  | doc:read   |     +------------+                                          |
|  +------------+                                                              |
|                                                                              |
|  Flattened permissions for [admin]:                                          |
|    user:read, user:write, user:delete, report:read, report:write,           |
|    doc:write, doc:read                                                       |
|                                                                              |
+------------------------------------------------------------------------------+
```

See [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md) for full specification.

_Previous: [02-instrumentation.md](02-instrumentation.md) | Next: [04-policy-evaluation-tree.md](04-policy-evaluation-tree.md)_
