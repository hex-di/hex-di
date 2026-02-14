/**
 * Core data models for the Result Panel.
 *
 * Spec: 01-overview.md Section 1.4, 14-integration.md Sections 14.2, 14.8
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// 1.4.3 ResultMethodName
// ---------------------------------------------------------------------------

/** Union of all recognized Result/ResultAsync method names. */
export type ResultMethodName =
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
  // Constructors
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

// ---------------------------------------------------------------------------
// 1.4.2 ResultOperationDescriptor
// ---------------------------------------------------------------------------

/** Describes a single operation (node) in a Result chain. */
export interface ResultOperationDescriptor {
  /** Zero-based index within the chain. */
  readonly index: number;

  /** Operation method name. */
  readonly method: ResultMethodName;

  /** Human-readable label for this specific call. */
  readonly label: string;

  /** Which tracks this operation processes. */
  readonly inputTrack: "ok" | "err" | "both";

  /** Which tracks this operation can output to. */
  readonly outputTracks: readonly ("ok" | "err")[];

  /** Whether this operation can switch tracks. */
  readonly canSwitch: boolean;

  /** Whether this operation is a terminal (match, unwrapOr, etc.). */
  readonly isTerminal: boolean;

  /** Source location of the callback function. */
  readonly callbackLocation: string | undefined;

  /**
   * When this operation is part of a merged (unified) chain, this label
   * identifies the original chain it came from.  Undefined for non-merged chains.
   */
  readonly chainLabel?: string | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.1 ResultChainDescriptor
// ---------------------------------------------------------------------------

/** Static description of a Result chain's structure. */
export interface ResultChainDescriptor {
  /** Unique identifier for this chain (hash of structure). */
  readonly chainId: string;

  /** Human-readable name. */
  readonly label: string;

  /** The port that produces this Result chain, if associated. */
  readonly portName: string | undefined;

  /** Ordered sequence of operations in the chain. */
  readonly operations: readonly ResultOperationDescriptor[];

  /** Whether the chain uses ResultAsync (async methods). */
  readonly isAsync: boolean;

  /** Source location where the chain is defined (file:line). */
  readonly sourceLocation: string | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.4 SerializedValue
// ---------------------------------------------------------------------------

/** Wrapper for serialized intermediate values captured during tracing. */
export interface SerializedValue {
  /** The serialized representation (JSON-safe). */
  readonly data: unknown;

  /** Original type name (e.g., "Object", "Array", "Map", "Error"). */
  readonly typeName: string;

  /** Whether the value was truncated due to depth or size limits. */
  readonly truncated: boolean;
}

// ---------------------------------------------------------------------------
// 1.4.5 ResultStepTrace
// ---------------------------------------------------------------------------

/** Runtime trace of a single operation's execution within a chain. */
export interface ResultStepTrace {
  /** Index of the operation in the chain. */
  readonly operationIndex: number;

  /** Track the result was on BEFORE this operation. */
  readonly inputTrack: "ok" | "err";

  /** Track the result is on AFTER this operation. */
  readonly outputTrack: "ok" | "err";

  /** Whether a track switch occurred at this step. */
  readonly switched: boolean;

  /** Serialized input value. undefined when captureValues is false. */
  readonly inputValue: SerializedValue | undefined;

  /** Serialized output value. undefined when captureValues is false. */
  readonly outputValue: SerializedValue | undefined;

  /** Duration of this operation in microseconds (0 for sync). */
  readonly durationMicros: number;

  /** Whether the callback threw an exception (caught by the operation). */
  readonly callbackThrew: boolean;

  /** Timestamp (monotonic, microseconds). */
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 1.4.6 ResultChainExecution
// ---------------------------------------------------------------------------

/** A complete execution trace of a Result chain. */
export interface ResultChainExecution {
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

  /** Final value after the last operation (serialized). */
  readonly finalValue: SerializedValue | undefined;

  /** Total duration of the entire chain in microseconds. */
  readonly totalDurationMicros: number;

  /** Timestamp when execution started. */
  readonly startTimestamp: number;

  /** Scope ID if resolved within a scope. */
  readonly scopeId: string | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.7 ResultPathDescriptor
// ---------------------------------------------------------------------------

/** A single possible path through a Result chain. */
export interface ResultPathDescriptor {
  /** Unique path ID (hash of the track sequence). */
  readonly pathId: string;

  /** The track at each operation index. */
  readonly trackSequence: readonly ("ok" | "err")[];

  /** Indices where track switches occur. */
  readonly switchPoints: readonly number[];

  /** Whether this path has been observed at runtime. */
  readonly observed: boolean;

  /** Number of times this path was observed. */
  readonly observedCount: number;

  /** Percentage of total executions that took this path. */
  readonly frequency: number;

  /** Human-readable description. */
  readonly description: string;
}

// ---------------------------------------------------------------------------
// 1.4.8 ResultPortStatistics
// ---------------------------------------------------------------------------

/** Per-port aggregate statistics. */
export interface ResultPortStatistics {
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

  /** Associated chain descriptors. */
  readonly chainIds: readonly string[];

  /** Timestamp of last execution. */
  readonly lastExecutionTimestamp: number | undefined;
}

// ---------------------------------------------------------------------------
// 1.4.9 ResultPanelSnapshot
// ---------------------------------------------------------------------------

/** Complete snapshot of all Result data for the panel. */
export interface ResultPanelSnapshot {
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

// ---------------------------------------------------------------------------
// 1.4.10 ResultOperationCategory
// ---------------------------------------------------------------------------

/** Category type for visual grouping. */
export type ResultCategoryName =
  | "constructor"
  | "transformation"
  | "chaining"
  | "recovery"
  | "observation"
  | "extraction"
  | "conversion"
  | "combinator"
  | "generator";

/** Categorization of operations for visual encoding and educational content. */
export interface ResultOperationCategory {
  /** The method name. */
  readonly method: ResultMethodName;

  /** Category for visual grouping. */
  readonly category: ResultCategoryName;

  /** Which tracks this operation reads from. */
  readonly inputTrack: "ok" | "err" | "both";

  /** Whether the operation can switch tracks. */
  readonly canSwitch: boolean;

  /** Whether the operation is side-effect-only. */
  readonly sideEffectOnly: boolean;

  /** Whether the operation terminates the chain. */
  readonly isTerminal: boolean;

  /** Railway metaphor description. */
  readonly railwayDescription: string;

  /** One-sentence explanation for tooltips. */
  readonly shortDescription: string;

  /** Full educational description with examples. */
  readonly longDescription: string;
}

// ---------------------------------------------------------------------------
// 1.4.11 ResultFilterState
// ---------------------------------------------------------------------------

/** State of all active filters across the panel. */
export interface ResultFilterState {
  /** Chain name substring search. */
  readonly chainSearch: string;

  /** Filter to a specific port. undefined = all ports. */
  readonly portName: string | undefined;

  /** Filter by final result status. */
  readonly status: "all" | "ok" | "err" | "mixed";

  /** Filter to a specific error type/code. */
  readonly errorType: string | undefined;

  /** Temporal window for aggregate data. */
  readonly timeRange: "5m" | "1h" | "24h" | "all" | { readonly from: number; readonly to: number };
}

// ---------------------------------------------------------------------------
// 1.4.12 ResultViewId & ResultPanelNavigation
// ---------------------------------------------------------------------------

/** Identifiers for the 7 Result Panel views. */
export type ResultViewId =
  | "railway"
  | "log"
  | "cases"
  | "sankey"
  | "waterfall"
  | "combinator"
  | "overview";

/** Context passed when navigating to/from the Result Panel. */
export interface ResultPanelNavigation {
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

// ---------------------------------------------------------------------------
// 14.8 ResultPanelState
// ---------------------------------------------------------------------------

/** Internal state management for the Result Panel. */
export interface ResultPanelState {
  /** Currently selected chain. */
  readonly selectedChainId: string | undefined;

  /** Currently selected execution. */
  readonly selectedExecutionId: string | undefined;

  /** Currently selected step (for log and pipeline). */
  readonly selectedStepIndex: number | undefined;

  /** Currently active view. */
  readonly activeView: ResultViewId;

  /** Filter state. */
  readonly filter: ResultFilterState;

  /** Educational sidebar open/closed. */
  readonly educationalSidebarOpen: boolean;

  /** Live connection status. */
  readonly connectionStatus: "connected" | "disconnected";
}

// ---------------------------------------------------------------------------
// 14.2 ResultDataSource & ResultDataEvent
// ---------------------------------------------------------------------------

/** Events emitted by the Result data source. */
export type ResultDataEvent =
  | { readonly type: "chain-registered"; readonly chainId: string }
  | { readonly type: "execution-added"; readonly chainId: string; readonly executionId: string }
  | { readonly type: "statistics-updated"; readonly portName: string }
  | { readonly type: "snapshot-changed" }
  | { readonly type: "connection-lost" }
  | { readonly type: "connection-restored" };

/** Data source interface for the Result Panel. */
export interface ResultDataSource {
  /** Get all chain descriptors. */
  getChains(): ReadonlyMap<string, ResultChainDescriptor>;

  /** Get per-port statistics (Level 0 -- always available). */
  getPortStatistics(): ReadonlyMap<string, ResultPortStatistics>;

  /** Get recent executions for a chain (Level 1 -- requires tracing). */
  getExecutions(chainId: string): readonly ResultChainExecution[];

  /** Get computed paths for a chain. */
  getPaths(chainId: string): readonly ResultPathDescriptor[];

  /** Get the complete panel snapshot. */
  getSnapshot(): ResultPanelSnapshot;

  /** Subscribe to data changes. Returns unsubscribe function. */
  subscribe(listener: (event: ResultDataEvent) => void): () => void;
}
