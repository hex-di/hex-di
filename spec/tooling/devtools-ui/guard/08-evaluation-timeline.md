_Previous: [07-access-flow-statistics.md](07-access-flow-statistics.md) | Next: [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md)_

# 8. Evaluation Timeline View

The Evaluation Timeline provides a temporal view of guard evaluations, showing the duration of each policy node's evaluation with special emphasis on async operations (attribute resolvers, relationship lookups). It answers: "Where is evaluation time being spent, and which async operations are the bottleneck?"

## 8.1 Core Metaphor

Each evaluation is a waterfall of policy node evaluations. Compound nodes span the duration of their children. Async operations (attribute resolution, relationship checks) show distinct waiting and execution phases. This makes it immediately visible whether a slow evaluation is caused by a complex policy tree or by slow external lookups.

## 8.2 Wireframe

```
+--[Port: UserService]--[Execution: #42 v]--[Scale: Auto v]--[Compare]------+
|                                                                              |
|  Time ->  0ms      1ms      2ms      3ms      4ms      5ms                  |
|  +--------+---------+---------+---------+---------+---------+                |
|                                                                              |
|  AllOf                   ████████████████████████████████████  4.5ms  Allow   |
|    HasRole "admin"       ██                                    0.1ms  Allow   |
|    AnyOf                 ░░████████████████████████████████████  4.3ms  Allow |
|      HasPerm "user:read" ░░██                                  0.1ms  Deny   |
|      HasAttr "dept"      ░░░░████████████████████████████████  3.9ms  Allow  |
|        [attr resolver]   ░░░░░░████████████████████████████    3.5ms         |
|      HasRelationship     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  --    Skip    |
|                                                                              |
|  ┌── Summary ────────────────────────────────────────────────────────────┐   |
|  │ Total: 4.5ms  |  Sync: 0.3ms (7%)  |  Async: 3.5ms (78%)           │   |
|  │ Short-circuited: 1 node  |  Critical path: HasAttr "dept" resolver  │   |
|  └───────────────────────────────────────────────────────────────────────┘   |
|                                                                              |
+------------------------------------------------------------------------------+
```

## 8.3 Timeline Rows

Each row represents a policy node from the evaluation tree, indented by tree depth:

### Row Structure

```
[indent][node label]  [░░waiting░░████executing████]  [duration]  [outcome]
```

| Segment | Color               | Meaning                                |
| ------- | ------------------- | -------------------------------------- |
| `████`  | Node outcome color  | Active evaluation time                 |
| `░░░░`  | Neutral gray at 20% | Waiting for parent/sibling to complete |
| `----`  | No bar              | Skipped (short-circuited)              |

### Row Height and Spacing

| Property         | Value                           |
| ---------------- | ------------------------------- |
| Row height       | 28px                            |
| Row spacing      | 4px                             |
| Indent per depth | 20px                            |
| Label width      | 200px (left-aligned, truncated) |
| Duration width   | 60px (right-aligned)            |

## 8.4 Async Resolution Detail

When a policy node triggers an async operation (attribute resolver, relationship check), the timeline shows a nested sub-row:

```
HasAttr "dept"      ░░░░████████████████████████████████  3.9ms  Allow
  [attr resolver]   ░░░░░░████████████████████████████    3.5ms
```

### Async Phases

| Phase      | Display                | Description                  |
| ---------- | ---------------------- | ---------------------------- |
| Queue      | Light gray bar         | Waiting for resolver slot    |
| Resolution | Blue bar               | Resolver executing           |
| Timeout    | Red bar (if timed out) | Exceeded `resolverTimeoutMs` |

### Resolver Tooltip

```
┌── Attribute Resolver ─────────────────┐
│ Attribute: "dept"                     │
│ Subject: alice                        │
│ Queue time: 0.4ms                     │
│ Resolution time: 3.5ms               │
│ Resolved value: "engineering"        │
│ Timeout limit: 5000ms               │
└───────────────────────────────────────┘
```

## 8.5 Time Scale

### Auto Scale

The time axis automatically adjusts to fit the execution duration:

| Duration Range | Scale              | Gridline Interval |
| -------------- | ------------------ | ----------------- |
| < 1ms          | 0.1ms per division | 0.1ms             |
| 1ms - 10ms     | 1ms per division   | 1ms               |
| 10ms - 100ms   | 10ms per division  | 10ms              |
| 100ms - 1s     | 100ms per division | 100ms             |
| > 1s           | 1s per division    | 1s                |

### Manual Scale

Users can override auto-scale with fixed ranges: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s, 5s.

## 8.6 Execution Selector

```
+--[ v Execution #42 ]----------------------------+
|  #42  ● Allow  alice   14:32:01  4.5ms          |
|  #41  ○ Deny   bob     14:32:00  0.2ms          |
|  #40  ● Allow  alice   14:31:59  3.8ms          |
|  #39  ◆ Error  eve     14:31:58  5.0ms [timeout]|
+--------------------------------------------------+
```

Entries with async operations are tagged with duration to help identify slow evaluations.

## 8.7 Compare Mode

The Compare button enables side-by-side comparison of two executions:

```
+--[Execution A: #42 v]--[Execution B: #41 v]--[Show Diff]------------------+
|                                                                              |
|  Execution #42 (alice, Allow, 4.5ms):                                        |
|  AllOf                   ████████████████████████████████████  4.5ms  Allow   |
|    HasRole "admin"       ██                                    0.1ms  Allow   |
|    AnyOf                 ░░████████████████████████████████████  4.3ms  Allow |
|      HasPerm "user:read" ░░██                                  0.1ms  Deny   |
|      HasAttr "dept"      ░░░░████████████████████████████████  3.9ms  Allow  |
|                                                                              |
|  ──────────────────────────────────────────────────────────────────────────── |
|                                                                              |
|  Execution #41 (bob, Deny, 0.2ms):                                           |
|  AllOf                   ████  0.2ms  Deny                                   |
|    HasRole "admin"       ████  0.2ms  Deny                                   |
|    AnyOf                 --    Skip                                           |
|                                                                              |
+------------------------------------------------------------------------------+
```

### Diff Indicators

| Indicator             | Meaning                               |
| --------------------- | ------------------------------------- |
| Green highlight       | Node allowed in A, denied in B        |
| Red highlight         | Node denied in A, allowed in B        |
| Duration delta        | "+3.7ms" or "-3.7ms" shown inline     |
| Path divergence arrow | Arrow at the node where paths diverge |

## 8.8 Summary Section

```
┌── Summary ────────────────────────────────────────────┐
│ Total duration: 4.5ms                                  │
│ Sync evaluation: 0.3ms (7%)                           │
│ Async resolution: 3.5ms (78%)                         │
│ Overhead: 0.7ms (15%)                                  │
│ Short-circuited nodes: 1 (HasRelationship)            │
│ Critical path: AllOf -> AnyOf -> HasAttr -> resolver  │
│ Bottleneck: attribute resolver for "dept" (3.5ms)     │
└────────────────────────────────────────────────────────┘
```

### Critical Path

The critical path is the sequence of nodes that determines the total duration. Highlighted with a bold left border in the timeline.

### Bottleneck Detection

A node is flagged as a bottleneck if it accounts for > 50% of total duration. Displayed with a warning badge.

## 8.9 Timeout Visualization

When an async operation times out:

```
HasAttr "clearance" ░░░░████████████████████████████████████████  5000ms  Error
  [attr resolver]   ░░░░░░████████████████████████████████████████████████████
                                                                    ^^^ TIMEOUT
```

- The resolver bar turns red at the timeout boundary
- A vertical dashed red line marks the timeout threshold
- Tooltip: "Attribute resolver timed out after 5000ms"

## 8.10 Edge Cases

| Case                           | Behavior                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| No async operations            | Simple bars only; async summary section hidden                 |
| All nodes skipped except one   | Single bar with "short-circuited" labels for others            |
| Very fast evaluation (< 0.1ms) | Auto-scale to 0.01ms divisions; message "Sub-millisecond"      |
| Very slow evaluation (> 5s)    | Auto-scale to 1s divisions; warning "Slow evaluation"          |
| Concurrent async operations    | Show overlapping bars (AnyOf may resolve children in parallel) |
| No executions available        | Message: "Select an execution from the Decision Log"           |
| Evaluation error mid-tree      | Error node in amber; remaining nodes shown as "interrupted"    |

## 8.11 Performance

| Metric           | Budget                      |
| ---------------- | --------------------------- |
| Initial render   | < 50ms for 50 rows          |
| Re-render        | < 30ms on execution change  |
| Scale adjustment | < 10ms (CSS transform only) |
| Compare mode     | < 100ms for two timelines   |

_Previous: [07-access-flow-statistics.md](07-access-flow-statistics.md) | Next: [09-role-hierarchy-graph.md](09-role-hierarchy-graph.md)_
