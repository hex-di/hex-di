_Next: [02-instrumentation.md](02-instrumentation.md)_

# 1. Overview & Data Models

## 1.1 Motivation

The `@hex-di/result` library provides a comprehensive `Result<T, E>` type with 30+ chainable methods, async variants, combinators, and generator-based error handling. However, the internal mechanics of a Result chain are invisible at runtime:

- **Where did it go Err?** A chain like `ok(x).map(f).andThen(g).orElse(h)` may silently switch tracks at any junction. Without visibility, debugging requires inserting `inspect()` calls everywhere.
- **What are the possible paths?** A chain of 5 operations has up to 2^5 theoretical paths through Ok/Err tracks. Developers reason about these mentally, which is error-prone.
- **How often does it fail?** Aggregate statistics (ok rate, error distribution) are essential for production health but unavailable without custom instrumentation.
- **What does each operation do?** Newcomers struggle with the difference between `map` vs `andThen`, `orElse` vs `mapErr`, `andTee` vs `inspect`. Visual feedback makes these tangible.

The Result Panel addresses all four concerns through a multi-view visualization system.

## 1.2 Goals

| Goal          | Description                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------- |
| **Visualize** | Render Result chains as interactive railway diagrams with two-track Ok/Err flow                   |
| **Trace**     | Capture per-step intermediate values and track switches during execution                          |
| **Analyze**   | Compute all possible paths through a chain (static) and overlay observed execution data (runtime) |
| **Aggregate** | Display per-port and per-chain statistics: ok/err counts, error distribution, stability scores    |
| **Educate**   | Provide inline explanations, what-if simulation, and guided walkthroughs for every Result method  |
| **Integrate** | Work in both DevTools (remote inspector) and Playground (local execution) contexts                |

## 1.3 Non-Goals

- **Modifying Result values** -- The panel is read-only. It does not alter runtime behavior.
- **Replacing error monitoring** -- This is a development/debugging tool, not a production APM.
- **Supporting non-hex-di Result types** -- Only `@hex-di/result` is supported.

## 1.4 Core Data Models

### 1.4.1 ResultChainDescriptor

Static description of a Result chain's structure, derived from compile-time analysis or runtime registration.

```typescript
interface ResultChainDescriptor {
  /** Unique identifier for this chain (hash of structure). */
  readonly chainId: string;

  /** Human-readable name (e.g., port name or user-provided label). */
  readonly label: string;

  /** The port that produces this Result chain, if associated with a port. */
  readonly portName: string | undefined;

  /** Ordered sequence of operations in the chain. */
  readonly operations: readonly ResultOperationDescriptor[];

  /** Whether the chain uses ResultAsync (async methods). */
  readonly isAsync: boolean;

  /** Source location where the chain is defined (file:line). */
  readonly sourceLocation: string | undefined;
}
```

### 1.4.2 ResultOperationDescriptor

Describes a single operation (node) in a Result chain.

```typescript
interface ResultOperationDescriptor {
  /** Zero-based index within the chain. */
  readonly index: number;

  /** Operation method name. */
  readonly method: ResultMethodName;

  /** Human-readable label for this specific call (from source or auto-generated). */
  readonly label: string;

  /** Which tracks this operation processes. */
  readonly inputTrack: "ok" | "err" | "both";

  /** Which tracks this operation can output to. */
  readonly outputTracks: readonly ("ok" | "err")[];

  /** Whether this operation can switch tracks (Ok->Err or Err->Ok). */
  readonly canSwitch: boolean;

  /** Whether this operation is a terminal (match, unwrapOr, etc.). */
  readonly isTerminal: boolean;

  /** Source location of the callback function. */
  readonly callbackLocation: string | undefined;
}
```

### 1.4.3 ResultMethodName

Union of all recognized Result/ResultAsync method names.

```typescript
type ResultMethodName =
  // Transformations
  | "map"
  | "mapErr"
  | "mapBoth"
  | "flatten"
  | "flip"
  // Chaining
  | "andThen"
  | "orElse"
  | "andTee"
  | "orTee"
  | "andThrough"
  // Observation
  | "inspect"
  | "inspectErr"
  // Extraction
  | "match"
  | "unwrapOr"
  | "unwrapOrElse"
  | "expect"
  | "expectErr"
  // Conversion
  | "toNullable"
  | "toUndefined"
  | "intoTuple"
  | "merge"
  | "toJSON"
  | "toAsync"
  // Async bridges
  | "asyncMap"
  | "asyncAndThen"
  // Constructors (entry points)
  | "ok"
  | "err"
  | "fromThrowable"
  | "fromNullable"
  | "fromPredicate"
  | "tryCatch"
  | "fromPromise"
  | "fromSafePromise"
  | "fromAsyncThrowable"
  // Combinators
  | "all"
  | "allSettled"
  | "any"
  | "collect"
  // Generators
  | "safeTry";
```

### 1.4.4 SerializedValue

Wrapper for serialized intermediate values captured during tracing (see [Section 2.2.5](02-instrumentation.md) for serialization rules).

```typescript
interface SerializedValue {
  /** The serialized representation (JSON-safe). */
  readonly data: unknown;

  /** Original type name (e.g., "Object", "Array", "Map", "Error"). */
  readonly typeName: string;

  /** Whether the value was truncated due to depth or size limits. */
  readonly truncated: boolean;
}
```

### 1.4.5 ResultStepTrace

Runtime trace of a single operation's execution within a chain.

```typescript
interface ResultStepTrace {
  /** Index of the operation in the chain. */
  readonly operationIndex: number;

  /** Track the result was on BEFORE this operation. */
  readonly inputTrack: "ok" | "err";

  /** Track the result is on AFTER this operation. */
  readonly outputTrack: "ok" | "err";

  /** Whether a track switch occurred at this step. */
  readonly switched: boolean;

  /** Serialized input value (Ok value or Err error).
   *  undefined when captureValues is false. */
  readonly inputValue: SerializedValue | undefined;

  /** Serialized output value (Ok value or Err error).
   *  undefined when captureValues is false. */
  readonly outputValue: SerializedValue | undefined;

  /** Duration of this operation in microseconds (0 for sync). */
  readonly durationMicros: number;

  /** Whether the callback threw an exception (caught by the operation). */
  readonly callbackThrew: boolean;

  /** Timestamp (monotonic, microseconds). */
  readonly timestamp: number;
}
```

### 1.4.6 ResultChainExecution

A complete execution trace of a Result chain.

```typescript
interface ResultChainExecution {
  /** Unique execution ID. */
  readonly executionId: string;

  /** Reference to the chain descriptor. */
  readonly chainId: string;

  /** The constructor that produced the initial Result. */
  readonly entryMethod: ResultMethodName;

  /** The initial track (ok or err). */
  readonly entryTrack: "ok" | "err";

  /** The initial value (serialized). undefined when captureValues is false. */
  readonly entryValue: SerializedValue | undefined;

  /** Per-step traces, ordered by execution sequence. */
  readonly steps: readonly ResultStepTrace[];

  /** Final track after the last operation. */
  readonly finalTrack: "ok" | "err";

  /** Final value after the last operation (serialized). undefined when captureValues is false. */
  readonly finalValue: SerializedValue | undefined;

  /** Total duration of the entire chain in microseconds. */
  readonly totalDurationMicros: number;

  /** Timestamp when execution started. */
  readonly startTimestamp: number;

  /** Scope ID if resolved within a scope. */
  readonly scopeId: string | undefined;
}
```

### 1.4.7 ResultPathDescriptor

A single possible path through a Result chain (for the case explorer).

```typescript
interface ResultPathDescriptor {
  /** Unique path ID (hash of the track sequence). */
  readonly pathId: string;

  /** The track at each operation index: ordered array of "ok" | "err". */
  readonly trackSequence: readonly ("ok" | "err")[];

  /** Indices where track switches occur. */
  readonly switchPoints: readonly number[];

  /** Whether this path has been observed at runtime. */
  readonly observed: boolean;

  /** Number of times this path was observed. */
  readonly observedCount: number;

  /** Percentage of total executions that took this path. */
  readonly frequency: number;

  /** Human-readable description (e.g., "Ok through all steps" or "Err at step 3, recovered at step 5"). */
  readonly description: string;
}
```

### 1.4.8 ResultPortStatistics

Per-port aggregate statistics (extends existing `ResultStatistics` from `@hex-di/core`).

```typescript
interface ResultPortStatistics {
  /** Port name. */
  readonly portName: string;

  /** Total number of resolutions. */
  readonly totalCalls: number;

  /** Number of Ok results. */
  readonly okCount: number;

  /** Number of Err results. */
  readonly errCount: number;

  /** Error rate (errCount / totalCalls). */
  readonly errorRate: number;

  /** Distribution of error types/codes. */
  readonly errorsByCode: ReadonlyMap<string, number>;

  /** Last error value (serialized). */
  readonly lastError: unknown | undefined;

  /** Stability score: rolling ok rate over last N executions (0.0-1.0). */
  readonly stabilityScore: number;

  /** Associated chain descriptors (a port may produce multiple chain shapes). */
  readonly chainIds: readonly string[];

  /** Timestamp of last execution. */
  readonly lastExecutionTimestamp: number | undefined;
}
```

### 1.4.9 ResultPanelSnapshot

Complete snapshot of all Result data for the panel.

```typescript
interface ResultPanelSnapshot {
  /** All registered chain descriptors. */
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;

  /** Per-port aggregate statistics. */
  readonly portStats: ReadonlyMap<string, ResultPortStatistics>;

  /** Recent chain executions (ring buffer, newest first). */
  readonly recentExecutions: readonly ResultChainExecution[];

  /** All discovered paths across all chains. */
  readonly paths: ReadonlyMap<string, readonly ResultPathDescriptor[]>;

  /** Total number of Result operations observed. */
  readonly totalOperationsObserved: number;

  /** Global ok rate across all ports. */
  readonly globalOkRate: number;

  /** Timestamp of this snapshot. */
  readonly snapshotTimestamp: number;
}
```

### 1.4.10 ResultOperationCategory

Categorization of operations for visual encoding and educational content.

```typescript
interface ResultOperationCategory {
  /** The method name. */
  readonly method: ResultMethodName;

  /** Category for visual grouping. */
  readonly category:
    | "constructor"
    | "transformation"
    | "chaining"
    | "recovery"
    | "observation"
    | "extraction"
    | "conversion"
    | "combinator"
    | "generator";

  /** Which tracks this operation reads from. */
  readonly inputTrack: "ok" | "err" | "both";

  /** Whether the operation can switch tracks. */
  readonly canSwitch: boolean;

  /** Whether the operation is side-effect-only (no value change). */
  readonly sideEffectOnly: boolean;

  /** Whether the operation terminates the chain (extracts the value). */
  readonly isTerminal: boolean;

  /** Railway metaphor description. */
  readonly railwayDescription: string;

  /** One-sentence explanation for tooltips. */
  readonly shortDescription: string;

  /** Full educational description with examples. */
  readonly longDescription: string;
}
```

### 1.4.11 ResultFilterState

State of all active filters across the panel.

```typescript
interface ResultFilterState {
  /** Chain name substring search. */
  readonly chainSearch: string;

  /** Filter to a specific port. undefined = all ports. */
  readonly portName: string | undefined;

  /** Filter by final result status. */
  readonly status: "all" | "ok" | "err" | "mixed";

  /** Filter to a specific error type/code. undefined = all errors. */
  readonly errorType: string | undefined;

  /** Temporal window for aggregate data. */
  readonly timeRange: "5m" | "1h" | "24h" | "all" | { readonly from: number; readonly to: number };
}
```

### 1.4.12 ResultPanelNavigation

Context passed when navigating to/from the Result Panel.

```typescript
interface ResultPanelNavigation {
  /** Chain to select on arrival. */
  readonly chainId: string | undefined;

  /** Execution to select on arrival. */
  readonly executionId: string | undefined;

  /** Step to highlight on arrival. */
  readonly stepIndex: number | undefined;

  /** View to activate on arrival. */
  readonly view: ResultViewId | undefined;

  /** Error type to filter to on arrival. */
  readonly errorType: string | undefined;

  /** Time range to set on arrival. */
  readonly timeRange: ResultFilterState["timeRange"] | undefined;
}

type ResultViewId =
  | "railway"
  | "log"
  | "cases"
  | "sankey"
  | "waterfall"
  | "combinator"
  | "overview";
```

## 1.5 Operation Classification Table

| Method          | Category       | Input | Can Switch | Side-Effect | Terminal | Railway Metaphor                                  |
| --------------- | -------------- | ----- | ---------- | ----------- | -------- | ------------------------------------------------- |
| `ok`            | constructor    | --    | --         | No          | No       | Places cargo on Ok track                          |
| `err`           | constructor    | --    | --         | No          | No       | Places cargo on Err track                         |
| `fromThrowable` | constructor    | --    | Yes        | No          | No       | Try-catch switch: Ok if no throw, Err if throw    |
| `fromNullable`  | constructor    | --    | Yes        | No          | No       | Null-check switch: Ok if value, Err if null       |
| `fromPredicate` | constructor    | --    | Yes        | No          | No       | Guard switch: Ok if predicate passes              |
| `tryCatch`      | constructor    | --    | Yes        | No          | No       | Immediate try-catch junction                      |
| `map`           | transformation | ok    | No         | No          | No       | Repaints cargo on Ok track                        |
| `mapErr`        | transformation | err   | No         | No          | No       | Repaints cargo on Err track                       |
| `mapBoth`       | transformation | both  | No         | No          | No       | Repaints cargo on whichever track                 |
| `flatten`       | transformation | ok    | No         | No          | No       | Unwraps nested container on Ok track              |
| `flip`          | transformation | both  | Yes        | No          | No       | Swaps tracks: Ok becomes Err, Err becomes Ok      |
| `andThen`       | chaining       | ok    | Yes        | No          | No       | Full switch: can divert Ok to Err                 |
| `orElse`        | recovery       | err   | Yes        | No          | No       | Recovery switch: can divert Err back to Ok        |
| `andTee`        | observation    | ok    | No         | Yes         | No       | Side siding off Ok track, returns to main line    |
| `orTee`         | observation    | err   | No         | Yes         | No       | Side siding off Err track, returns to main line   |
| `andThrough`    | chaining       | ok    | Yes        | No          | No       | Validation gate: checks without changing cargo    |
| `inspect`       | observation    | ok    | No         | Yes         | No       | Observation window on Ok track                    |
| `inspectErr`    | observation    | err   | No         | Yes         | No       | Observation window on Err track                   |
| `match`         | extraction     | both  | --         | No          | Yes      | Terminal junction: both tracks converge           |
| `unwrapOr`      | extraction     | both  | --         | No          | Yes      | Ok track passes, Err track gets default cargo     |
| `unwrapOrElse`  | extraction     | both  | --         | No          | Yes      | Ok track passes, Err track gets transformed cargo |
| `expect`        | extraction     | ok    | --         | No          | Yes      | Ok track passes, Err track derails (throws)       |
| `expectErr`     | extraction     | err   | --         | No          | Yes      | Err track passes, Ok track derails (throws)       |
| `toNullable`    | conversion     | both  | --         | No          | Yes      | Ok becomes value, Err becomes null                |
| `toUndefined`   | conversion     | both  | --         | No          | Yes      | Ok becomes value, Err becomes undefined           |
| `intoTuple`     | conversion     | both  | --         | No          | Yes      | Tracks merge into [error, value] tuple            |
| `merge`         | conversion     | both  | --         | No          | Yes      | Both tracks merge into single value               |
| `toAsync`       | conversion     | both  | No         | No          | No       | Lifts sync tracks into async tracks               |
| `asyncMap`      | transformation | ok    | No         | No          | No       | Async repaint on Ok track                         |
| `asyncAndThen`  | chaining       | ok    | Yes        | No          | No       | Async switch: can divert Ok to Err                |
| `all`           | combinator     | both  | Yes        | No          | No       | Parallel tracks merge: first Err short-circuits   |
| `allSettled`    | combinator     | both  | Yes        | No          | No       | Parallel tracks merge: collects all errors        |
| `any`           | combinator     | both  | Yes        | No          | No       | Parallel tracks merge: first Ok wins              |
| `collect`       | combinator     | both  | Yes        | No          | No       | Named parallel tracks merge into record           |
| `safeTry`       | generator      | both  | Yes        | No          | No       | Sequential yield gates with early-exit on Err     |

## 1.6 Views Summary

The Result Panel provides 7 coordinated views:

| #   | View                   | Purpose                                             | Primary Data                                     |
| --- | ---------------------- | --------------------------------------------------- | ------------------------------------------------ |
| 1   | **Railway Pipeline**   | Interactive two-track chain visualization           | `ResultChainDescriptor` + `ResultChainExecution` |
| 2   | **Operation Log**      | Step-by-step execution log with value inspection    | `ResultChainExecution`                           |
| 3   | **Case Explorer**      | All possible paths with runtime frequency overlay   | `ResultPathDescriptor[]`                         |
| 4   | **Sankey Statistics**  | Aggregate flow diagram with error hotspots          | `ResultPortStatistics` + path frequencies        |
| 5   | **Async Waterfall**    | Temporal execution with duration bars               | `ResultChainExecution` (async chains)            |
| 6   | **Combinator Matrix**  | Visual grid for `all`/`allSettled`/`any`/`collect`  | Combinator-specific execution traces             |
| 7   | **Overview Dashboard** | Summary stats, stability scores, error distribution | `ResultPanelSnapshot`                            |

_Next: [02-instrumentation.md](02-instrumentation.md)_
