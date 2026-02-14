_Previous: [08-async-waterfall.md](08-async-waterfall.md) | Next: [10-visual-encoding.md](10-visual-encoding.md)_

# 9. Combinator Matrix View

Specialized visualization for Result combinators (`all`, `allSettled`, `any`, `collect`) that merge multiple Result values into a single output. The matrix shows inputs, the combinator logic, and the merged output in a clear grid layout.

## 9.1 When to Show

This view is available when:

- The selected chain contains at least one combinator operation (`all`, `allSettled`, `any`, `collect`)
- The combinator step has been executed at least once with traced inputs

For chains without combinators, the view shows: "This chain has no combinator operations. The Combinator Matrix is available for chains using all, allSettled, any, or collect."

## 9.2 Combinator Semantics

| Combinator   | Logic                                | Short-Circuit     | Output on Success          | Output on Failure            |
| ------------ | ------------------------------------ | ----------------- | -------------------------- | ---------------------------- |
| `all`        | Every input must be Ok               | Yes, on first Err | `Ok([...values])`          | `Err(firstErr)`              |
| `allSettled` | Collects all results regardless      | No                | `Ok([...values])` (all Ok) | `Err([...errors])` (any Err) |
| `any`        | At least one input must be Ok        | Yes, on first Ok  | `Ok(firstOkValue)`         | `Err([...allErrors])`        |
| `collect`    | Named record; every field must be Ok | Yes, on first Err | `Ok({ ...record })`        | `Err(firstErr)`              |

## 9.3 Matrix Layout

The primary visualization is a grid showing all inputs and the combined output.

### 9.3.1 `all` / `allSettled` Layout

```
+==[Combinator: all]==[Execution: #12 v]===================================+
|                                                                           |
|  Inputs (3):                          Combinator:        Output:          |
|                                                                           |
|  ┌──────────────────┐                 ┌──────────┐      ┌─────────────┐  |
|  │ 1. fetchUser     │ ● Ok ─────────>│          │      │             │  |
|  │    { id: 1,      │                 │          │      │             │  |
|  │      name: "A" } │                 │   all    │=====>│ ○ Err       │  |
|  ├──────────────────┤                 │          │      │ Timeout     │  |
|  │ 2. fetchPosts    │ ● Ok ─────────>│          │      │ (input #3)  │  |
|  │    [...3 items]  │                 │          │      │             │  |
|  ├──────────────────┤                 │          │      └─────────────┘  |
|  │ 3. fetchTags     │ ○ Err ────────>│          │                       |
|  │    Timeout       │   ▲            └──────────┘                       |
|  └──────────────────┘   │                                                |
|                    SHORT-CIRCUIT                                          |
|                                                                           |
+==========================================================================+
```

### 9.3.2 `collect` Layout

```
+==[Combinator: collect]==[Execution: #7 v]================================+
|                                                                           |
|  Inputs (named):                      Combinator:        Output:          |
|                                                                           |
|  ┌──────────────────┐                 ┌──────────┐      ┌─────────────┐  |
|  │ user: fetchUser  │ ● Ok ─────────>│          │      │             │  |
|  │    { id: 1 }     │                 │ collect  │=====>│ ● Ok        │  |
|  ├──────────────────┤                 │          │      │ { user,     │  |
|  │ posts: getPosts  │ ● Ok ─────────>│          │      │   posts,    │  |
|  │    [...5]        │                 │          │      │   config }  │  |
|  ├──────────────────┤                 │          │      │             │  |
|  │ config: loadCfg  │ ● Ok ─────────>│          │      └─────────────┘  |
|  │    { theme: ..}  │                 └──────────┘                       |
|  └──────────────────┘                                                    |
|                                                                           |
+==========================================================================+
```

### 9.3.3 `any` Layout

```
+==[Combinator: any]==[Execution: #22 v]===================================+
|                                                                           |
|  Inputs (3):                          Combinator:        Output:          |
|                                                                           |
|  ┌──────────────────┐                 ┌──────────┐      ┌─────────────┐  |
|  │ 1. primaryDb     │ ○ Err ────────>│          │      │             │  |
|  │    ConnRefused   │                 │   any    │=====>│ ● Ok        │  |
|  ├──────────────────┤                 │          │      │ { source:   │  |
|  │ 2. replicaDb     │ ● Ok ────────>│          │      │   "replica" │  |
|  │    { data: .. }  │   ▲            │          │      │   data: ..} │  |
|  ├──────────────────┤   │            │          │      │             │  |
|  │ 3. cache         │ ○ Err ────────>│          │      └─────────────┘  |
|  │    CacheMiss     │                 └──────────┘                       |
|  └──────────────────┘   │                                                |
|                    FIRST OK (input #2)                                    |
|                                                                           |
+==========================================================================+
```

## 9.4 Input Cell Anatomy

Each input cell in the matrix:

```
┌──────────────────────────┐
│ [index/name] [source]    │
│ [● Ok / ○ Err] badge     │
│ [value preview]           │
│ [duration] (async only)   │
└──────────────────────────┘
```

| Element       | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| Index/name    | Numeric index for `all`/`allSettled`/`any`, field name for `collect` |
| Source        | Label of the Result-producing operation or port name                 |
| Badge         | `● Ok` (green) or `○ Err` (red)                                      |
| Value preview | Truncated serialized value (max 60 chars)                            |
| Duration      | For async inputs, time from start to resolution                      |

### Input Cell States

| State                            | Visual                                                    |
| -------------------------------- | --------------------------------------------------------- |
| Ok                               | Green left border, green badge                            |
| Err                              | Red left border, red badge                                |
| Short-circuit cause              | Red left border, red badge, pulsing `SHORT-CIRCUIT` label |
| Short-circuit winner (any)       | Green left border, green badge, `FIRST OK` label          |
| Pending (async, during playback) | Gray border, spinner icon                                 |
| Skipped (after short-circuit)    | Dimmed at 40% opacity, dashed border, "skipped" label     |

## 9.5 Connector Lines

Lines connecting inputs to the combinator box:

| From                            | Color              | Style                     |
| ------------------------------- | ------------------ | ------------------------- |
| Ok input                        | `--hex-result-ok`  | Solid, 2px                |
| Err input                       | `--hex-result-err` | Solid, 2px                |
| Short-circuit Err (all/collect) | `--hex-result-err` | Solid, 3px, animated dash |
| First Ok (any)                  | `--hex-result-ok`  | Solid, 3px, animated dash |
| Skipped input                   | `--hex-text-muted` | Dotted, 1px               |

## 9.6 Combinator Box

The central combinator box shows:

```
┌──────────────┐
│  [combinator │
│   name]      │
│              │
│  Inputs: N   │
│  Ok: M       │
│  Err: K      │
└──────────────┘
```

The box border color reflects the output:

- Green border if output is Ok
- Red border if output is Err

## 9.7 Output Box

The output box on the right shows the combined result:

```
┌─────────────────┐
│ ● Ok / ○ Err    │
│                  │
│ [combined value] │
│                  │
│ [source note]    │
└─────────────────┘
```

Source note examples:

- `all`: "All 3 inputs Ok" or "Failed at input #3 (Timeout)"
- `allSettled`: "All 3 Ok" or "2 Ok, 1 Err"
- `any`: "First Ok: input #2 (replicaDb)" or "All 3 failed"
- `collect`: "All fields Ok" or "Failed at field 'config' (NotFound)"

## 9.8 Parallel Execution Timeline (Async)

For async combinators, an optional timeline shows when each input started and resolved:

```
+==[Parallel Timeline]==============================================+
|                                                                    |
|  Time →   0ms      50ms     100ms     150ms     200ms            |
|  ├─────────┼─────────┼─────────┼─────────┼─────────┤            |
|                                                                    |
|  fetchUser    ████████████████░░░  120ms  ● Ok                   |
|  fetchPosts   ████████████████████████░░  180ms  ● Ok            |
|  fetchTags    ██████████████████████████████████  200ms  ○ Err   |
|                                      ▲                            |
|                                 SHORT-CIRCUIT                     |
|                              (all stops here)                     |
|                                                                    |
|  Note: all waits for all promises despite short-circuit.          |
|  fetchUser/fetchPosts completed but result is Err from fetchTags. |
|                                                                    |
+====================================================================+
```

This reuses the duration bar style from the Async Waterfall view (Section 8).

## 9.9 allSettled Error Collection

`allSettled` uniquely collects all errors rather than short-circuiting. The visualization emphasizes this:

```
+==[allSettled: Error Collection]====================================+
|                                                                    |
|  Inputs:                      Output:                             |
|                                                                    |
|  1. validateEmail  ○ Err ──>  ┌──────────────────────────────┐   |
|     InvalidEmail              │ ○ Err (2 errors collected)    │   |
|  2. validateAge    ● Ok  ──>  │                               │   |
|     25                        │ Errors:                       │   |
|  3. validateName   ○ Err ──>  │   1. InvalidEmail             │   |
|     TooShort                  │   3. TooShort                 │   |
|                               │                               │   |
|  No short-circuit:            │ Ok values (discarded):        │   |
|  All inputs evaluated.        │   2. 25                       │   |
|                               └──────────────────────────────┘   |
|                                                                    |
+====================================================================+
```

The output box expands to show:

- All collected errors with their input indices
- Ok values that were discarded (dimmed text)

## 9.10 Statistics Overlay

When multiple executions exist, the matrix shows aggregate statistics:

```
+==[Combinator Statistics: all (870 executions)]========================+
|                                                                        |
|  Input Success Rates:                                                  |
|  ┌───────────┬──────────┬──────────┬──────────┐                       |
|  │ fetchUser │ fetchPst │ fetchTag │ Output   │                       |
|  │ Ok: 99.1% │ Ok: 94.2%│ Ok: 87.3%│ Ok: 82.1%│                       |
|  │ ████████  │ ████████ │ ███████  │ ██████   │                       |
|  └───────────┴──────────┴──────────┴──────────┘                       |
|                                                                        |
|  Bottleneck: fetchTags (12.7% error rate → 17.9% of all failures)     |
|                                                                        |
|  Error Combinations (top 5):                                           |
|  1. Only fetchTags fails:     68.3%  (595 times)                      |
|  2. fetchPosts + fetchTags:   18.2%  (158 times)                      |
|  3. Only fetchPosts fails:    10.1%  ( 88 times)                      |
|  4. All three fail:            2.4%  ( 21 times)                      |
|  5. Only fetchUser fails:      1.0%  (  8 times)                      |
|                                                                        |
+=======================================================================+
```

### Statistics Metrics

| Metric              | Formula                                              | Description                             |
| ------------------- | ---------------------------------------------------- | --------------------------------------- |
| Input success rate  | ok_count / total_executions per input                | Individual input reliability            |
| Output success rate | all_ok_count / total_executions                      | Combined success rate                   |
| Bottleneck          | input with highest error rate                        | The weakest link                        |
| Error combinations  | frequency of each unique (input_index, ok/err) tuple | Which inputs tend to fail together      |
| Correlation matrix  | co-occurrence of failures across inputs              | Are failures independent or correlated? |

## 9.11 Correlation Heatmap

For combinators with 3+ inputs, a correlation heatmap shows which inputs tend to fail together:

```
+==[Failure Correlation]===================+
|                                           |
|           user   posts   tags            |
|  user     1.00   0.12    0.08           |
|  posts    0.12   1.00    0.67 ← HIGH    |
|  tags     0.08   0.67    1.00           |
|                                           |
|  posts and tags failures are correlated   |
|  (shared network dependency?)             |
|                                           |
+===========================================+
```

Cell colors:

- `< 0.2`: No tint (independent)
- `0.2 - 0.5`: `--hex-warning` at 30% opacity
- `> 0.5`: `--hex-result-err` at 50% opacity (correlated failures)

## 9.12 Playback Mode

The combinator matrix supports playback for async combinators:

1. All input cells start in "pending" state (gray, spinner)
2. As each input resolves, its cell transitions to Ok (green) or Err (red)
3. For `all`: when the first Err arrives, remaining pending cells show "skipped" and the output shows Err
4. For `any`: when the first Ok arrives, remaining pending cells show "skipped" and the output shows Ok
5. For `allSettled`: all inputs resolve before the output appears
6. The parallel timeline (Section 9.8) animates in sync with the cells

### Playback Controls

Same as Railway Pipeline playback (Section 4.5): Play, Pause, Step, Speed.

## 9.13 Nested Combinators

When a combinator input is itself a combinator (e.g., `all([all([a, b]), any([c, d])])`):

```
┌─────────────────────┐
│ Input 1: all(...)    │──>  ┌──────────┐
│  ┌─ a: Ok ──┐       │     │          │      ┌───────────┐
│  └─ b: Err ─┘ → Err │     │  outer   │=====>│  Output   │
├─────────────────────┤     │   all    │      └───────────┘
│ Input 2: any(...)    │──>  │          │
│  ┌─ c: Err ──┐       │     │          │
│  └─ d: Ok ──┘ → Ok  │     └──────────┘
└─────────────────────┘
```

Each nested combinator cell is expandable. Clicking it drills into its own combinator matrix view.

## 9.14 Educational Annotations

Each combinator type has a fixed educational note at the bottom of the matrix:

| Combinator   | Annotation                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `all`        | "all: Short-circuits on the first Err. Like Promise.all --- if one fails, the whole thing fails. Use allSettled to collect all errors." |
| `allSettled` | "allSettled: Evaluates every input regardless of failures. Collects all errors. Like Promise.allSettled."                               |
| `any`        | "any: Short-circuits on the first Ok. Like Promise.any --- succeeds as soon as one succeeds. Fails only if ALL inputs fail."            |
| `collect`    | "collect: Like all, but inputs are a named record. The output preserves field names. Short-circuits on first Err."                      |

_Previous: [08-async-waterfall.md](08-async-waterfall.md) | Next: [10-visual-encoding.md](10-visual-encoding.md)_
