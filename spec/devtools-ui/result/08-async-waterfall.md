_Previous: [07-sankey-statistics.md](07-sankey-statistics.md) | Next: [09-combinator-matrix.md](09-combinator-matrix.md)_

# 8. Async Waterfall View

Jaeger-inspired temporal visualization for `ResultAsync<T, E>` chains. Shows when each async operation starts, how long it takes, and where it sits in the chain's execution timeline.

## 8.1 When to Show

This view is available when:

- The selected chain has `isAsync: true`
- At least one step has `durationMicros > 0`

For purely synchronous chains, the view shows a message: "This chain is synchronous. Async Waterfall is available for ResultAsync chains."

## 8.2 Wireframe

```
+==[Chain: fetchAndProcess]==[Execution: #42 ▼]==[Scale: Auto ▼]==========+
|                                                                           |
|  Time →   0ms      50ms     100ms     150ms     200ms     250ms         |
|  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤         |
|                                                                           |
|  0 fromPromise(fetch)  ████████████████████████████░░░  145ms   ● Ok    |
|  1 └─ andThen(parse)   ░░░░░░░░░░░░░░░░░░░░░░░░░░░██   42ms   ● Ok    |
|  2    └─ asyncMap(tfm)                            ░░██  18ms   ● Ok    |
|  3 andThen(validate)                                ░██ 12ms   ○ Err ⚡ |
|  4 orElse(fallback)                                  █░  8ms   ● Ok  ⚡ |
|  5 match(...)                                         █  1ms   ● Ok    |
|                                                                           |
|  ────────────────────────────────────────────────────────────            |
|  Total: 226ms  │  Ok path: 205ms  │  Err path: 12ms  │  Recovery: 8ms  |
|                                                                           |
+==========================================================================+
```

## 8.3 Row Anatomy

Each row represents one operation:

```
[index] [indentation] [method(label)]  [████████░░░]  [duration]  [badge]
```

| Element       | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| Index         | Step number in the chain                                                |
| Indentation   | Tree-like nesting for chained async operations                          |
| Method label  | Operation name with optional user label                                 |
| Duration bar  | Horizontal bar starting at the operation's start time, width = duration |
| Wait gap      | Light-colored gap (`░`) showing time waiting for the previous step      |
| Duration text | Formatted duration (μs, ms, or s depending on magnitude)                |
| Track badge   | `● Ok` (green) or `○ Err` (red), with ⚡ for switch points              |

## 8.4 Duration Bar Colors

| Condition                   | Bar Color                                           |
| --------------------------- | --------------------------------------------------- |
| Ok output, < p50 duration   | `--hex-result-ok` (emerald) at 80% opacity          |
| Ok output, p50-p90 duration | `--hex-warning` (amber) at 80% opacity              |
| Ok output, > p90 duration   | `--hex-result-err` (red) at 60% opacity             |
| Err output                  | `--hex-result-err` at 80% opacity                   |
| Recovery step               | `--hex-result-ok` at 60% opacity with dashed border |

Duration percentiles are computed from all executions of this chain.

## 8.5 Nesting

Async chains often have nested async operations (e.g., `andThen` returning a `ResultAsync` that itself has steps):

```
0 fromPromise(fetch)      ████████████████████████████
1 └─ andThen(parse)       ░░░░░░░░░░░░░░░░░░░░░░░░░░░████
2    └─ asyncMap(tfm)                                ░░░████
3       └─ andThen(enrich)                              ░░████
```

Nesting is indicated by:

- Tree-style indentation (└─ prefix)
- Duration bars that start after the parent's bar begins
- A vertical connector line from parent to child

## 8.6 Summary Bar

Below the waterfall, a summary showing time breakdown:

```
+─── Duration Breakdown ─────────────────────────────────────+
│                                                             │
│  ██████████████████████  ████  ███  ██  █                   │
│  fromPromise  145ms     parse  tfm  val  │                  │
│  (64%)        42ms     18ms  12ms  └─ orElse 8ms           │
│               (19%)    (8%)  (5%)     match 1ms             │
│                                                             │
│  Critical path: fromPromise → parse → asyncMap (205ms, 91%) │
│  Overhead: 21ms (9%) — switching and recovery               │
│                                                             │
+─────────────────────────────────────────────────────────────+
```

## 8.7 Comparison Mode

Compare two executions side-by-side:

```
+==[Compare: #42 vs #38]================================================+
|                                                                         |
|  #42:  fromPromise ████████████████████░░  parse ████  match █         |
|        Total: 226ms   Ok                                               |
|                                                                         |
|  #38:  fromPromise ██████████████████████████████████░░  parse ██████   |
|        Total: 412ms   Err (timeout at parse)                           |
|                                                                         |
|  Diff:  fromPromise: +84ms (+58%)                                      |
|         parse: +68ms → TIMEOUT                                         |
|                                                                         |
+==========================================================================+
```

### Comparison Controls

- Select two executions from the dropdown
- Delta annotations on each bar showing +/- duration
- Highlight steps where behavior differed (switched vs didn't)

## 8.8 Scale Controls

| Scale    | Description                                    |
| -------- | ---------------------------------------------- |
| Auto     | Fits the entire waterfall in the visible width |
| 1ms/px   | Fixed scale for fine-grained inspection        |
| 10ms/px  | Medium scale                                   |
| 100ms/px | Coarse scale for long chains                   |
| Custom   | User-defined ms/px ratio                       |

Mouse wheel zooms horizontally. Shift+wheel zooms vertically.

## 8.9 Concurrent Operations

For combinators (`all`, `allSettled`, `any`) that execute multiple ResultAsync in parallel:

```
3 all(...)
  ├─ fetchUser     ████████████████
  ├─ fetchPosts    ████████████████████████
  └─ fetchTags     ██████████████████████████████  (longest)
  all resolved:    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
```

Parallel operations are shown on separate rows with the same indentation level and aligned start times.

_Previous: [07-sankey-statistics.md](07-sankey-statistics.md) | Next: [09-combinator-matrix.md](09-combinator-matrix.md)_
