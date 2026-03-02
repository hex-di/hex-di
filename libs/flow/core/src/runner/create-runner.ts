/**
 * Machine Runner Factory
 *
 * This module provides the factory function for creating MachineRunner instances.
 * The runner manages the state machine lifecycle:
 * - State transitions via interpreter (returning Result)
 * - Effect execution via executor (returning ResultAsync)
 * - Activity management
 * - Subscriptions
 * - Disposal
 *
 * @packageDocumentation
 */

import { ok, err, ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MachineAny } from "../machine/types.js";
import { getDescriptorValue } from "../utils/type-bridge.js";
import type { ActivityStatus } from "../activities/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { EffectAny } from "../effects/types.js";
import type { Clock } from "../clock/types.js";
import { SystemClock } from "../clock/index.js";
import { computeHash } from "../audit/hash-chain.js";
import { emitFlowAuditRecord } from "../audit/global-sink.js";
import type {
  MachineRunner,
  MachineSnapshot,
  EffectExecutor,
  StateValue,
  PendingEvent,
  HistoryConfig,
  TransitionHistoryEntry,
  EffectExecutionEntry,
} from "./types.js";
import type { TransitionError, EffectExecutionError, DisposeError } from "../errors/index.js";
import { CircularBuffer } from "../introspection/circular-buffer.js";
import { Disposed, QueueOverflow, EventValidationFailed } from "../errors/index.js";
import {
  transitionSafe,
  canTransition,
  computeInitialPathWithParallel,
  computeParallelRegionPaths,
  transitionParallelSafe,
  canTransitionParallel,
  collectRegionEntryEffects,
  isParallelState,
} from "./interpreter.js";
import type { ParallelRegionPaths, HistoryMap } from "./interpreter.js";
import type {
  FlowTracingHook,
  TracerLike,
  EffectResultRecord,
  HealthEvent,
} from "../introspection/types.js";
import { createFlowTracingHook } from "../introspection/flow-tracing-hook.js";

// =============================================================================
// Runner Options Type
// =============================================================================

/**
 * Options for creating a MachineRunner.
 */
export interface MachineRunnerOptions {
  /**
   * The effect executor for executing effect descriptors.
   */
  readonly executor: EffectExecutor;

  /**
   * The activity manager for tracking spawned activities.
   */
  readonly activityManager: ActivityManager;

  /**
   * Optional collector for tracing transitions (DevTools integration).
   * Will be implemented in the tracing module.
   */
  readonly collector?: {
    collect(event: unknown): void;
  };

  /**
   * Optional tracing hook for distributed tracing spans.
   * When provided, transitions and effects produce tracing spans.
   * Takes precedence over `tracer` if both are provided.
   */
  readonly tracingHook?: FlowTracingHook;

  /**
   * Shorthand: pass a TracerLike and a FlowTracingHook is auto-created.
   * Ignored when `tracingHook` is already provided.
   */
  readonly tracer?: TracerLike;

  /**
   * Optional callback for recording effect execution results.
   * Used by FlowInspector for effect statistics and health monitoring.
   */
  readonly onEffectResult?: (record: EffectResultRecord) => void;

  /**
   * Maximum number of events that can be queued during re-entrant processing.
   * @default 100
   */
  readonly maxQueueSize?: number;

  /**
   * Configuration for history recording.
   * When enabled, the runner records transitions and effect executions
   * in circular buffers for diagnostic/devtools purposes.
   * Disabled by default for zero overhead.
   */
  readonly history?: HistoryConfig;

  /**
   * Optional callback for emitting health events when a machine
   * transitions into or out of an error state.
   *
   * When provided, the runner detects error states by matching state names
   * against `errorStatePatterns` (defaults to `["error", "failed"]`).
   */
  readonly onHealthEvent?: (event: HealthEvent) => void;

  /**
   * Patterns to match against state names (case-insensitive) to detect error states.
   * A state is considered an error state if its lowercase name includes any pattern.
   *
   * Only used when `onHealthEvent` is provided.
   *
   * @default ["error", "failed"]
   */
  readonly errorStatePatterns?: readonly string[];

  /**
   * Pluggable clock for deterministic timestamps (GxP F12).
   * All Date.now() calls in the runner flow through this clock.
   * @default SystemClock (delegates to Date.now())
   */
  readonly clock?: Clock;

  /**
   * Optional global event validator (GxP F10).
   * When provided, every event is validated before processing.
   * Return false to reject the event.
   */
  readonly eventValidator?: (event: { readonly type: string }) => boolean;

  /**
   * When true, guard functions are run twice with frozen inputs
   * and the results compared to detect impure guards (GxP F7).
   * @default false
   */
  readonly enforcePureGuards?: boolean;

  /**
   * Suppress GxP compliance warnings (e.g. missing tracing).
   * @default false
   */
  readonly suppressGxpWarnings?: boolean;
}

// =============================================================================
// Subscription Manager
// =============================================================================

/**
 * Internal subscription manager.
 * @internal
 */
interface SubscriptionManager<TState extends string, TContext> {
  add(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;
  notify(snapshot: MachineSnapshot<TState, TContext>): void;
}

/**
 * Creates a subscription manager for handling state change listeners.
 * @internal
 */
function createSubscriptionManager<TState extends string, TContext>(): SubscriptionManager<
  TState,
  TContext
> {
  // Use a Set for efficient add/remove/iteration
  const subscribers = new Set<(snapshot: MachineSnapshot<TState, TContext>) => void>();

  return {
    add(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    notify(snapshot: MachineSnapshot<TState, TContext>): void {
      // Create a copy of subscribers to handle unsubscribe during iteration
      const currentSubscribers = Array.from(subscribers);
      for (const callback of currentSubscribers) {
        callback(snapshot);
      }
    },
  };
}

// =============================================================================
// Sequential Effect Execution
// =============================================================================

/**
 * Executes an array of effects sequentially, short-circuiting on first error.
 *
 * Uses an async loop with early return on error, wrapped in ResultAsync.fromResult.
 * This avoids both marker class throws and the andThen TS 5.9 `| null` inference bug.
 *
 * @internal
 */
function executeEffectsSequentially(
  executor: EffectExecutor,
  effects: readonly EffectAny[]
): ResultAsync<void, EffectExecutionError> {
  return ResultAsync.fromResult(
    (async (): Promise<Result<void, EffectExecutionError>> => {
      for (const effect of effects) {
        const result = await executor.execute(effect);
        if (result._tag === "Err") {
          return result;
        }
      }
      return ok(undefined);
    })()
  );
}

// =============================================================================
// Executor Hook Wrapper
// =============================================================================

/**
 * Derives an effect detail string from an effect descriptor for tracing.
 * @internal
 */
function deriveEffectDetail(effect: EffectAny): string {
  if (effect._tag === "Invoke") {
    // Access port and method via type-bridge (avoids PropertyDescriptor.value `any`)
    const port = getDescriptorValue(effect, "port");
    const method = getDescriptorValue(effect, "method");
    const portName =
      typeof port === "object" && port !== null
        ? (getDescriptorValue(port, "__portName") ?? "unknown")
        : "unknown";
    return `${String(portName)}.${String(method)}`;
  }
  if (effect._tag === "Spawn") {
    const activityId = getDescriptorValue(effect, "activityId");
    return String(activityId !== undefined ? activityId : "unknown");
  }
  return effect._tag;
}

/**
 * Wraps an EffectExecutor with optional tracing hook and effect result recording.
 * Returns the original executor if neither hook is provided (zero overhead).
 * @internal
 */
function wrapExecutorWithHooks(
  executor: EffectExecutor,
  tracingHook: FlowTracingHook | undefined,
  onEffectResult: ((record: EffectResultRecord) => void) | undefined,
  clockRef?: Clock
): EffectExecutor {
  if (tracingHook === undefined && onEffectResult === undefined) {
    return executor;
  }

  const effectClock = clockRef ?? SystemClock;

  return {
    execute(effect: EffectAny) {
      const detail = deriveEffectDetail(effect);
      tracingHook?.onEffectStart(effect._tag, detail);
      const startTime = performance.now();

      return executor
        .execute(effect)
        .map(() => {
          const duration = performance.now() - startTime;
          tracingHook?.onEffectEnd(true);
          if (onEffectResult !== undefined) {
            const dotIndex = detail.indexOf(".");
            const portName = dotIndex >= 0 ? detail.substring(0, dotIndex) : detail;
            const method = dotIndex >= 0 ? detail.substring(dotIndex + 1) : effect._tag;
            onEffectResult({ portName, method, ok: true, timestamp: effectClock.now(), duration });
          }
        })
        .mapErr(error => {
          const duration = performance.now() - startTime;
          tracingHook?.onEffectEnd(false);
          if (onEffectResult !== undefined) {
            const dotIndex = detail.indexOf(".");
            const portName = dotIndex >= 0 ? detail.substring(0, dotIndex) : detail;
            const method = dotIndex >= 0 ? detail.substring(dotIndex + 1) : effect._tag;
            onEffectResult({ portName, method, ok: false, timestamp: effectClock.now(), duration });
          }
          return error;
        });
    },
  };
}

// =============================================================================
// Error State Detection
// =============================================================================

const DEFAULT_ERROR_STATE_PATTERNS: readonly string[] = ["error", "failed"];

// =============================================================================
// GxP F13: Tracing Warning (warnOnce)
// =============================================================================

let gxpTracingWarned = false;

/**
 * Warns once if no tracing is configured and suppressGxpWarnings is not set.
 * @internal
 */
function warnIfNoTracing(
  tracingHook: FlowTracingHook | undefined,
  tracer: TracerLike | undefined,
  suppress: boolean | undefined
): void {
  if (gxpTracingWarned || suppress === true) return;
  if (tracingHook === undefined && tracer === undefined) {
    gxpTracingWarned = true;
    globalThis.console.warn(
      "[@hex-di/flow] GxP: No tracing configured. " +
        "Set tracingHook or tracer in MachineRunnerOptions for audit trail compliance. " +
        "Suppress with suppressGxpWarnings: true."
    );
  }
}

/**
 * Checks if a state name matches any error state pattern (case-insensitive substring).
 * @internal
 */
function isErrorState(state: string, patterns: readonly string[]): boolean {
  const lower = state.toLowerCase();
  for (const pattern of patterns) {
    if (lower.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// Machine Runner Factory
// =============================================================================

/**
 * Creates a MachineRunner instance for a given machine.
 *
 * The runner provides:
 * - Pure transitions via `send()` (returns Result with effects)
 * - Imperative transitions via `sendAndExecute()` (returns ResultAsync)
 * - Subscriptions for state change notifications
 * - Activity status tracking
 * - Disposal for cleanup
 *
 * @typeParam TStateNames - Union of state names
 * @typeParam TEventNames - Union of event type names
 * @typeParam TContext - Context type
 *
 * @param machine - The machine definition
 * @param options - Runner options (executor, activityManager, collector)
 *
 * @returns A MachineRunner instance
 */
export function createMachineRunner<
  TStateNames extends string,
  TEventNames extends string,
  TContext,
>(
  machine: {
    readonly id: string;
    readonly initial: TStateNames;
    readonly states: Record<string, unknown>;
    readonly context: TContext;
  },
  options: MachineRunnerOptions
): MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> {
  const { executor, activityManager, collector, onEffectResult, history, onHealthEvent } = options;

  // GxP F10: Global event validator
  const eventValidator = options.eventValidator;

  // GxP F7: Guard purity enforcement
  const enforcePureGuards = options.enforcePureGuards;

  // GxP F12: Pluggable clock — all timestamps flow through this
  const clock = options.clock ?? SystemClock;

  // GxP F13: Warn once if no tracing is configured
  warnIfNoTracing(options.tracingHook, options.tracer, options.suppressGxpWarnings);

  // Resolve tracing: explicit tracingHook takes precedence over tracer shorthand
  const tracingHook =
    options.tracingHook ??
    (options.tracer !== undefined ? createFlowTracingHook({ tracer: options.tracer }) : undefined);
  const errorPatterns =
    onHealthEvent !== undefined ? (options.errorStatePatterns ?? DEFAULT_ERROR_STATE_PATTERNS) : [];

  // Use machine as MachineAny via structural typing (no cast needed)
  const machineAny: MachineAny = machine;

  // History buffers (conditionally created for zero overhead when disabled)
  const transitionBuffer: CircularBuffer<TransitionHistoryEntry> | undefined = history?.enabled
    ? new CircularBuffer(history.transitionBufferSize ?? 50)
    : undefined;
  const effectBuffer: CircularBuffer<EffectExecutionEntry> | undefined = history?.enabled
    ? new CircularBuffer(history.effectBufferSize ?? 100)
    : undefined;

  // Internal state uses erased types (string, unknown) matching TransitionResult.
  // Type recovery happens at the public API boundary via the MachineRunner interface,
  // which guarantees TStateNames/TContext to callers through the machine definition.
  let currentState: string = machine.initial;
  let currentContext: unknown = machine.context;
  let disposed = false;

  // Track the full active state path for compound state support.
  // For flat machines this is simply `['idle']`. For compound machines
  // it auto-enters through initial children, e.g. `['active', 'idle']`.
  //
  // For parallel states, `activeParallelRegions` tracks the active paths
  // for each region. When non-null, the machine is in a parallel state
  // and events are dispatched to all regions.
  let activePath: readonly string[];
  let activeParallelRegions: ParallelRegionPaths | null = null;

  // Initialize: detect parallel states during initial path computation
  const initialResult = computeInitialPathWithParallel(machineAny);
  if (initialResult.parallel) {
    activePath = initialResult.path;
    activeParallelRegions = initialResult.regionPaths;
  } else {
    activePath = initialResult.path;
  }

  // History map: tracks the last active state path per compound state.
  // When a compound state is exited, its current active path is recorded here.
  // History pseudo-states use this to restore the previous child state.
  const stateHistoryMap = new Map<string, readonly string[]>();
  const historyMap: HistoryMap = { get: key => stateHistoryMap.get(key) };

  // Compose onEffectResult to also record into the effect history buffer
  const composedOnEffectResult: ((record: EffectResultRecord) => void) | undefined =
    effectBuffer !== undefined || onEffectResult !== undefined
      ? (record: EffectResultRecord) => {
          onEffectResult?.(record);
          if (effectBuffer !== undefined) {
            effectBuffer.push({
              effectTag: record.method,
              ok: record.ok,
              timestamp: record.timestamp,
              duration: record.duration,
            });
          }
        }
      : undefined;

  // Event queue for re-entrant send processing
  const maxQueueSize = options.maxQueueSize ?? 100;
  const pendingEvents: PendingEvent[] = [];
  let isProcessing = false;

  // Tracks the source for re-entrant enqueuing.
  // Set to "emit" or "delay" before calling runner.send() from the event sink
  // or delay executor, then reset to "external" after.
  let currentEnqueueSource: PendingEvent["source"] = "external";

  /**
   * Core send implementation that accepts `{ type: string }` (untyped).
   * Shared by both the public `send()` (typed) and `_sendInternal` (source tagging).
   */
  function sendCore(event: {
    readonly type: string;
  }): Result<readonly EffectAny[], TransitionError> {
    if (disposed) {
      return err(Disposed({ machineId: machine.id, operation: "send" }));
    }

    // Re-entrant: if already processing, enqueue the event
    if (isProcessing) {
      if (pendingEvents.length >= maxQueueSize) {
        return err(QueueOverflow({ machineId: machine.id, queueSize: maxQueueSize }));
      }
      pendingEvents.push({
        type: event.type,
        source: currentEnqueueSource,
        enqueuedAt: clock.now(),
      });
      return ok([]);
    }

    // GxP F10: Global event validation
    if (eventValidator !== undefined && !eventValidator(event)) {
      return err(
        EventValidationFailed({
          machineId: machine.id,
          eventType: event.type,
          message: `Global event validator rejected event '${event.type}'`,
        })
      );
    }

    isProcessing = true;
    anyTransitioned = false;

    // Process the initial event
    const initialResult = processEvent(event);
    if (initialResult._tag === "Err") {
      isProcessing = false;
      return err(initialResult.error);
    }

    const allEffects: EffectAny[] = [...initialResult.value];

    // Notify and drain loop
    let drainLoop = true;
    while (drainLoop) {
      drainLoop = false;

      if (anyTransitioned) {
        anyTransitioned = false;
        notifySubscribers();
      }

      while (pendingEvents.length > 0) {
        const queued = pendingEvents.shift();
        if (queued === undefined) break;

        const queuedResult = processEvent({ type: queued.type });
        if (queuedResult._tag === "Err") {
          isProcessing = false;
          return err(queuedResult.error);
        }
        allEffects.push(...queuedResult.value);
        if (anyTransitioned) {
          drainLoop = true;
        }
      }
    }

    isProcessing = false;

    return ok(allEffects);
  }

  // Subscription manager
  const subscriptions = createSubscriptionManager<TStateNames, TContext>();

  /**
   * Computes a StateValue from an active path (non-parallel).
   *
   * Path `['idle']` → `'idle'`
   * Path `['active', 'loading']` → `{ active: 'loading' }`
   * Path `['active', 'editing', 'unsaved']` → `{ active: { editing: 'unsaved' } }`
   */
  function computeLinearStateValue(path: readonly string[]): StateValue {
    if (path.length <= 1) {
      return path[0] ?? "";
    }
    // Build nested object from right to left
    let value: StateValue = path[path.length - 1];
    for (let i = path.length - 2; i >= 0; i--) {
      value = { [path[i]]: value };
    }
    return value;
  }

  /**
   * Computes a StateValue for the current state, including parallel regions.
   *
   * For parallel states, produces:
   * `{ parallelState: { region1: 'stateA', region2: 'stateB' } }`
   */
  function computeStateValue(): StateValue {
    if (activeParallelRegions === null) {
      return computeLinearStateValue(activePath);
    }

    // Build the parallel state value from region paths
    const parallelPath = activeParallelRegions.parallelPath;
    const regionValues: Record<string, StateValue> = {};

    for (const regionName of Object.keys(activeParallelRegions.regions).sort()) {
      const regionPath = activeParallelRegions.regions[regionName];
      if (regionPath === undefined) continue;
      // The region's state value is relative to the region root (skip parallel path + region name)
      const childPath = regionPath.slice(parallelPath.length + 1);
      regionValues[regionName] = computeLinearStateValue(childPath);
    }

    // Wrap in the parallel state's ancestor path
    let value: StateValue = regionValues;
    for (let i = parallelPath.length - 1; i >= 0; i--) {
      value = { [parallelPath[i]]: value };
    }
    return value;
  }

  /**
   * Checks if a dot-separated path matches the given active path and parallel state.
   *
   * For non-parallel states:
   * `matches('active')` → true if activePath starts with `['active', ...]`
   * `matches('active.loading')` → true if activePath starts with `['active', 'loading', ...]`
   *
   * For parallel states:
   * `matches('dashboard')` → true if in the dashboard parallel state
   * `matches('dashboard.panel1')` → true if panel1 is an active region
   * `matches('dashboard.panel1.idle')` → true if panel1's path includes idle
   *
   * This function is pure (takes explicit state) so snapshots can capture it.
   */
  function matchesPathSnapshot(
    dotPath: string,
    snapshotActivePath: readonly string[],
    snapshotParallel: ParallelRegionPaths | null
  ): boolean {
    const parts = dotPath.split(".");

    if (snapshotParallel === null) {
      // Non-parallel: simple prefix match
      if (parts.length > snapshotActivePath.length) {
        return false;
      }
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== snapshotActivePath[i]) {
          return false;
        }
      }
      return true;
    }

    // Parallel: check if the path matches any region
    const parallelPath = snapshotParallel.parallelPath;

    // First check if the path matches the parallel state itself
    for (let i = 0; i < Math.min(parts.length, parallelPath.length); i++) {
      if (parts[i] !== parallelPath[i]) {
        return false;
      }
    }

    // If the path only goes up to or before the parallel state, it's a match
    if (parts.length <= parallelPath.length) {
      return true;
    }

    // The path goes deeper — check if it matches a specific region
    const regionName = parts[parallelPath.length];
    if (regionName === undefined) {
      return true;
    }

    const regionPath = snapshotParallel.regions[regionName];
    if (regionPath === undefined) {
      return false;
    }

    // Check if the remaining parts match the region's path
    for (let i = parallelPath.length; i < parts.length; i++) {
      if (i >= regionPath.length || parts[i] !== regionPath[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Records history entries for compound state ancestors that are being exited.
   *
   * When transitioning from oldPath to newPath, any compound ancestor that is
   * present in oldPath but not in newPath (or differs) needs its active child
   * path recorded in the history map.
   *
   * For example, transitioning from ['parent', 'child', 'grandchild'] to ['other']:
   * Records 'parent' -> ['parent', 'child', 'grandchild']
   */
  function recordHistoryForTransition(
    oldPath: readonly string[],
    newPath: readonly string[]
  ): void {
    // Find the LCA depth: how many path segments are shared
    let lcaDepth = 0;
    const minLen = Math.min(oldPath.length, newPath.length);
    while (lcaDepth < minLen && oldPath[lcaDepth] === newPath[lcaDepth]) {
      lcaDepth++;
    }

    // Record history for every compound ancestor from LCA (exclusive) down to
    // just above the leaf. Each compound state gets the full oldPath recorded.
    for (let i = lcaDepth; i < oldPath.length; i++) {
      const ancestorPath = oldPath.slice(0, i);
      if (ancestorPath.length === 0) continue;
      const key = ancestorPath.join(".");
      // Record the full old active path for this ancestor
      stateHistoryMap.set(key, oldPath);
    }
  }

  /**
   * Creates an immutable snapshot of current state.
   * Type recovery: internal string/unknown -> public TStateNames/TContext.
   * This is safe because the machine definition constrains which states
   * and contexts are reachable, and the interpreter preserves those invariants.
   */
  function createSnapshot(): MachineSnapshot<TStateNames, TContext> {
    const activities = activityManager.getAll();
    const sv = computeStateValue();
    const currentPathSnapshot = activePath;
    const currentContextSnapshot = currentContext;
    const currentParallelSnapshot = activeParallelRegions;

    // The runner interface guarantees that currentState is always a valid TStateNames
    // and currentContext is always a valid TContext, as enforced by the machine definition.
    // We construct the snapshot to satisfy the public typed interface.
    const snapshot: MachineSnapshot<string, unknown> = {
      state: currentState,
      context: currentContext,
      activities,
      pendingEvents: Object.freeze([...pendingEvents]),
      stateValue: sv,
      matches(path: string): boolean {
        // Use snapshot-captured state for matches (not the live mutable references)
        return matchesPathSnapshot(path, currentPathSnapshot, currentParallelSnapshot);
      },
      can(event: { readonly type: string }): boolean {
        if (currentParallelSnapshot !== null) {
          return canTransitionParallel(
            currentParallelSnapshot,
            event,
            currentContextSnapshot,
            machineAny
          );
        }
        return canTransition(currentPathSnapshot, event, currentContextSnapshot, machineAny);
      },
    };
    // @ts-expect-error - MachineSnapshot<string, unknown> is structurally compatible with
    // MachineSnapshot<TStateNames, TContext> because TStateNames extends string and TContext
    // is covariant. TypeScript cannot narrow through the generic parameter.
    const typedSnapshot: MachineSnapshot<TStateNames, TContext> = Object.freeze(snapshot);
    return typedSnapshot;
  }

  /**
   * Notifies all subscribers of state change.
   */
  function notifySubscribers(): void {
    const snapshot = createSnapshot();
    subscriptions.notify(snapshot);
  }

  // GxP F9: Hash chain state for audit integrity
  let lastAuditHash = "";
  let auditSequence = 0;

  /**
   * Records a transition event if collector is provided.
   * Also computes hash chain and emits to audit sink (GxP F9).
   */
  function recordTransition(
    prevState: string,
    event: { readonly type: string },
    nextState: string,
    effects: readonly EffectAny[]
  ): void {
    const now = clock.now();

    if (collector) {
      collector.collect({
        machineId: machine.id,
        prevState,
        event,
        nextState,
        effects,
        timestamp: now,
      });
    }
    if (transitionBuffer !== undefined) {
      transitionBuffer.push({
        prevState,
        nextState,
        eventType: event.type,
        effectCount: effects.length,
        timestamp: now,
      });
    }

    // GxP F9: Compute hash chain and emit audit record
    const recordData = {
      machineId: machine.id,
      prevState,
      event,
      nextState,
      timestamp: now,
    };
    const hash = computeHash(recordData, lastAuditHash);
    const previousHash = lastAuditHash;
    lastAuditHash = hash;
    auditSequence++;

    emitFlowAuditRecord({
      id: `${machine.id}-${auditSequence}`,
      machineId: machine.id,
      prevState,
      event,
      nextState,
      effects,
      timestamp: now,
      hash,
      previousHash,
    });
  }

  /**
   * Processes a single event through the interpreter without subscriber notification.
   * Used by both send() and queue drain loop.
   */
  /**
   * Tracks whether any transition occurred during the current send() call.
   * Used to decide whether to notify subscribers.
   */
  let anyTransitioned = false;

  function processEvent(eventToProcess: {
    readonly type: string;
  }): Result<readonly EffectAny[], TransitionError> {
    const prevState = currentState;

    // Parallel state dispatch: route events to all regions
    if (activeParallelRegions !== null) {
      return processParallelEvent(eventToProcess, prevState);
    }

    const result = transitionSafe(
      activePath,
      currentContext,
      eventToProcess,
      machineAny,
      historyMap,
      enforcePureGuards
    );

    if (result._tag === "Err") {
      tracingHook?.onTransitionStart(machine.id, prevState, prevState, eventToProcess.type);
      tracingHook?.onTransitionEnd(machine.id, false);
      return err(result.error);
    }

    const transitionResult = result.value;

    if (!transitionResult.transitioned) {
      return ok([]);
    }

    anyTransitioned = true;

    if (transitionResult.newState !== undefined) {
      currentState = transitionResult.newState;
    }
    // Collect additional entry effects if transitioning into a parallel state
    let parallelEntryEffects: readonly EffectAny[] = [];

    if (transitionResult.newStatePath !== undefined) {
      // Record history for compound ancestors being exited before updating activePath
      recordHistoryForTransition(activePath, transitionResult.newStatePath);

      activePath = transitionResult.newStatePath;

      // Check if the new path enters a parallel state
      if (isParallelState(activePath, machineAny)) {
        activeParallelRegions = computeParallelRegionPaths(activePath, machineAny);
        // Collect entry effects for all regions. The parallel state's own entry
        // is already collected by transitionSafe, so we only add region entries.
        parallelEntryEffects = collectRegionEntryEffects(
          activePath,
          activeParallelRegions,
          machineAny
        );
      }
    }
    if (transitionResult.newContext !== undefined) {
      currentContext = transitionResult.newContext;
    }

    // Merge any parallel region entry effects with the transition effects
    const allEffects =
      parallelEntryEffects.length > 0
        ? [...transitionResult.effects, ...parallelEntryEffects]
        : transitionResult.effects;

    tracingHook?.onTransitionStart(machine.id, prevState, currentState, eventToProcess.type);
    tracingHook?.onTransitionEnd(machine.id, true);

    recordTransition(prevState, eventToProcess, currentState, allEffects);

    // Emit health events on error state entry/exit
    if (onHealthEvent !== undefined && prevState !== currentState) {
      const wasError = isErrorState(prevState, errorPatterns);
      const isNowError = isErrorState(currentState, errorPatterns);

      if (!wasError && isNowError) {
        onHealthEvent({
          type: "flow-error",
          machineId: machine.id,
          state: currentState,
          timestamp: clock.now(),
        });
      } else if (wasError && !isNowError) {
        onHealthEvent({
          type: "flow-recovered",
          machineId: machine.id,
          fromState: prevState,
          timestamp: clock.now(),
        });
      }
    }

    return ok(allEffects);
  }

  /**
   * Processes an event through parallel regions.
   * Dispatches the event to all active regions independently.
   */
  function processParallelEvent(
    eventToProcess: { readonly type: string },
    prevState: string
  ): Result<readonly EffectAny[], TransitionError> {
    if (activeParallelRegions === null) {
      return ok([]);
    }

    const result = transitionParallelSafe(
      activeParallelRegions,
      currentContext,
      eventToProcess,
      machineAny,
      historyMap,
      enforcePureGuards
    );

    if (result._tag === "Err") {
      tracingHook?.onTransitionStart(machine.id, prevState, prevState, eventToProcess.type);
      tracingHook?.onTransitionEnd(machine.id, false);
      return err(result.error);
    }

    const parallelResult = result.value;

    if (!parallelResult.transitioned) {
      return ok([]);
    }

    anyTransitioned = true;

    // Update context
    if (parallelResult.newContext !== undefined) {
      currentContext = parallelResult.newContext;
    }

    // Update region paths
    activeParallelRegions = {
      parallelPath: activeParallelRegions.parallelPath,
      regions: parallelResult.newRegions,
    };

    // Record history for region paths that changed
    if (activeParallelRegions !== null) {
      const oldRegions = activeParallelRegions.regions;
      for (const regionName of Object.keys(oldRegions).sort()) {
        const oldRegionPath = oldRegions[regionName];
        const newRegionPath = parallelResult.newRegions[regionName];
        if (
          oldRegionPath !== undefined &&
          newRegionPath !== undefined &&
          oldRegionPath !== newRegionPath
        ) {
          recordHistoryForTransition(oldRegionPath, newRegionPath);
        }
      }
    }

    // Check if onDone fired (all regions reached final)
    if (parallelResult.onDoneResult !== undefined) {
      const onDone = parallelResult.onDoneResult;

      // Record history for the parallel state being exited
      if (activeParallelRegions !== null) {
        // Record each region's final path as history for that region's compound ancestor
        for (const regionName of Object.keys(activeParallelRegions.regions).sort()) {
          const regionPath = parallelResult.newRegions[regionName];
          if (regionPath !== undefined) {
            const regionCompoundPath = [...activeParallelRegions.parallelPath, regionName];
            stateHistoryMap.set(regionCompoundPath.join("."), regionPath);
          }
        }
      }

      // The parallel state is done — switch back to linear path tracking
      activeParallelRegions = null;

      if (onDone.newState !== undefined) {
        currentState = onDone.newState;
      }
      if (onDone.newStatePath !== undefined) {
        activePath = onDone.newStatePath;

        // Check if the new path enters another parallel state
        if (isParallelState(activePath, machineAny)) {
          activeParallelRegions = computeParallelRegionPaths(activePath, machineAny);
        }
      }
      if (onDone.newContext !== undefined) {
        currentContext = onDone.newContext;
      }

      tracingHook?.onTransitionStart(machine.id, prevState, currentState, eventToProcess.type);
      tracingHook?.onTransitionEnd(machine.id, true);

      recordTransition(prevState, eventToProcess, currentState, onDone.effects);

      // Emit health events
      if (onHealthEvent !== undefined && prevState !== currentState) {
        const wasError = isErrorState(prevState, errorPatterns);
        const isNowError = isErrorState(currentState, errorPatterns);

        if (!wasError && isNowError) {
          onHealthEvent({
            type: "flow-error",
            machineId: machine.id,
            state: currentState,
            timestamp: clock.now(),
          });
        } else if (wasError && !isNowError) {
          onHealthEvent({
            type: "flow-recovered",
            machineId: machine.id,
            fromState: prevState,
            timestamp: clock.now(),
          });
        }
      }

      return ok(onDone.effects);
    }

    // No onDone — just record the region transition
    tracingHook?.onTransitionStart(machine.id, prevState, currentState, eventToProcess.type);
    tracingHook?.onTransitionEnd(machine.id, true);

    recordTransition(prevState, eventToProcess, currentState, parallelResult.effects);

    return ok(parallelResult.effects);
  }

  // ==========================================================================
  // MachineRunner Implementation
  // ==========================================================================

  const runner: MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> = {
    snapshot(): MachineSnapshot<TStateNames, TContext> {
      return createSnapshot();
    },

    state(): TStateNames {
      // @ts-expect-error - currentState is always a valid TStateNames: it starts as
      // machine.initial (TStateNames) and only transitions to targets defined in the
      // machine config (all TStateNames). TypeScript tracks it as `string` internally.
      const state: TStateNames = currentState;
      return state;
    },

    context(): TContext {
      // @ts-expect-error - currentContext is always a valid TContext: it starts as
      // machine.context (TContext) and actions return TContext in the machine definition.
      // TypeScript tracks it as `unknown` internally.
      const ctx: TContext = currentContext;
      return ctx;
    },

    stateValue(): StateValue {
      return computeStateValue();
    },

    send(event: { readonly type: TEventNames }): Result<readonly EffectAny[], TransitionError> {
      return sendCore(event);
    },

    sendBatch(
      events: readonly { readonly type: TEventNames }[]
    ): Result<readonly EffectAny[], TransitionError> {
      if (disposed) {
        return err(Disposed({ machineId: machine.id, operation: "sendBatch" }));
      }

      isProcessing = true;
      anyTransitioned = false;
      const allEffects: EffectAny[] = [];

      for (const event of events) {
        const result = processEvent(event);

        if (result._tag === "Err") {
          isProcessing = false;
          if (anyTransitioned) notifySubscribers();
          return err(result.error);
        }

        allEffects.push(...result.value);
      }

      // Notify and drain loop (same pattern as send)
      let batchDrain = true;
      while (batchDrain) {
        batchDrain = false;

        if (anyTransitioned) {
          anyTransitioned = false;
          notifySubscribers();
        }

        while (pendingEvents.length > 0) {
          const queued = pendingEvents.shift();
          if (queued === undefined) break;

          const queuedResult = processEvent({ type: queued.type });
          if (queuedResult._tag === "Err") {
            isProcessing = false;
            return err(queuedResult.error);
          }
          allEffects.push(...queuedResult.value);
          if (anyTransitioned) {
            batchDrain = true;
          }
        }
      }

      isProcessing = false;

      return ok(allEffects);
    },

    sendAndExecute(event: {
      readonly type: TEventNames;
    }): ResultAsync<void, TransitionError | EffectExecutionError> {
      const sendResult = this.send(event);

      if (sendResult._tag === "Err") {
        return ResultAsync.err(sendResult.error);
      }

      const effects = sendResult.value;

      if (effects.length === 0) {
        return ResultAsync.ok(undefined);
      }

      // Execute effects sequentially with optional tracing and result recording
      return executeEffectsSequentially(
        wrapExecutorWithHooks(executor, tracingHook, composedOnEffectResult, clock),
        effects
      );
    },

    subscribe(callback: (snapshot: MachineSnapshot<TStateNames, TContext>) => void): () => void {
      return subscriptions.add(callback);
    },

    getActivityStatus(id: string): ActivityStatus | undefined {
      return activityManager.getStatus(id);
    },

    dispose(): ResultAsync<void, DisposeError> {
      if (disposed) {
        // Already disposed - no-op, return ok
        return ResultAsync.ok(undefined);
      }

      disposed = true;

      // Dispose activity manager to stop all running activities
      return activityManager.dispose();
    },

    get isDisposed(): boolean {
      return disposed;
    },

    getTransitionHistory(): readonly TransitionHistoryEntry[] {
      return transitionBuffer !== undefined ? transitionBuffer.toArray() : [];
    },

    getEffectHistory(): readonly EffectExecutionEntry[] {
      return effectBuffer !== undefined ? effectBuffer.toArray() : [];
    },
  };

  // Expose internal send with source tagging for adapter/executor use.
  // This is non-enumerable so it doesn't appear in the public interface.
  // Uses sendCore which accepts { type: string } to avoid generic constraint issues.
  Object.defineProperty(runner, "_sendInternal", {
    value: (
      event: { readonly type: string },
      source: PendingEvent["source"]
    ): Result<readonly EffectAny[], TransitionError> => {
      currentEnqueueSource = source;
      const result = sendCore(event);
      currentEnqueueSource = "external";
      return result;
    },
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return runner;
}
