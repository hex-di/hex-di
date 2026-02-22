/**
 * TracedResult — instrumented Result wrapper that captures chain operations.
 *
 * Wraps real ok()/err() from @hex-di/result and records every subsequent
 * method call to produce ResultChainDescriptor and ResultChainExecution
 * data for the Railway panel.
 *
 * @packageDocumentation
 * @internal
 */

import { RESULT_BRAND } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// =============================================================================
// Local Type Definitions
// =============================================================================
// These mirror the types in @hex-di/devtools-ui panels/result/types.ts.
// Defined locally because the devtools-ui package only exports from its root
// index and the worker cannot import sub-paths. The worker protocol
// serialization will convert these to structured-clone-safe format.

type ResultMethodName =
  | "map"
  | "mapErr"
  | "mapBoth"
  | "flatten"
  | "flip"
  | "andThen"
  | "orElse"
  | "andTee"
  | "orTee"
  | "andThrough"
  | "inspect"
  | "inspectErr"
  | "match"
  | "unwrapOr"
  | "unwrapOrElse"
  | "expect"
  | "expectErr"
  | "toNullable"
  | "toUndefined"
  | "intoTuple"
  | "merge"
  | "toJSON"
  | "toAsync"
  | "asyncMap"
  | "asyncAndThen"
  | "ok"
  | "err"
  | "fromThrowable"
  | "fromNullable"
  | "fromPredicate"
  | "tryCatch"
  | "fromPromise"
  | "fromSafePromise"
  | "fromAsyncThrowable"
  | "all"
  | "allSettled"
  | "any"
  | "collect"
  | "safeTry";

interface SerializedValue {
  readonly data: unknown;
  readonly typeName: string;
  readonly truncated: boolean;
}

interface ResultOperationDescriptor {
  readonly index: number;
  readonly method: ResultMethodName;
  readonly label: string;
  readonly inputTrack: "ok" | "err" | "both";
  readonly outputTracks: readonly ("ok" | "err")[];
  readonly canSwitch: boolean;
  readonly isTerminal: boolean;
  readonly callbackLocation: string | undefined;
}

interface ResultStepTrace {
  readonly operationIndex: number;
  readonly inputTrack: "ok" | "err";
  readonly outputTrack: "ok" | "err";
  readonly switched: boolean;
  readonly inputValue: SerializedValue | undefined;
  readonly outputValue: SerializedValue | undefined;
  readonly durationMicros: number;
  readonly callbackThrew: boolean;
  readonly timestamp: number;
}

interface ResultChainDescriptor {
  readonly chainId: string;
  readonly label: string;
  readonly portName: string | undefined;
  readonly operations: readonly ResultOperationDescriptor[];
  readonly isAsync: boolean;
  readonly sourceLocation: string | undefined;
}

interface ResultChainExecution {
  readonly executionId: string;
  readonly chainId: string;
  readonly entryMethod: ResultMethodName;
  readonly entryTrack: "ok" | "err";
  readonly entryValue: SerializedValue | undefined;
  readonly steps: readonly ResultStepTrace[];
  readonly finalTrack: "ok" | "err";
  readonly finalValue: SerializedValue | undefined;
  readonly totalDurationMicros: number;
  readonly startTimestamp: number;
  readonly scopeId: string | undefined;
}

// =============================================================================
// Value Serialization
// =============================================================================

const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 10;

function serializeForTrace(value: unknown, depth: number = 0): SerializedValue {
  if (depth > MAX_DEPTH) {
    return { data: "[max depth]", typeName: typeof value, truncated: true };
  }

  if (value === null) {
    return { data: null, typeName: "null", truncated: false };
  }
  if (value === undefined) {
    return { data: null, typeName: "undefined", truncated: false };
  }
  if (typeof value === "string") {
    const truncated = value.length > MAX_STRING_LENGTH;
    return {
      data: truncated ? value.slice(0, MAX_STRING_LENGTH) + "…" : value,
      typeName: "String",
      truncated,
    };
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return {
      data: value,
      typeName: typeof value === "number" ? "Number" : "Boolean",
      truncated: false,
    };
  }
  if (typeof value === "bigint") {
    return { data: String(value) + "n", typeName: "BigInt", truncated: false };
  }
  if (typeof value === "symbol") {
    return { data: String(value), typeName: "Symbol", truncated: false };
  }
  if (typeof value === "function") {
    const name = value.name || "anonymous";
    return { data: `[Function: ${name}]`, typeName: "Function", truncated: false };
  }
  if (value instanceof Error) {
    return {
      data: { name: value.name, message: value.message },
      typeName: "Error",
      truncated: false,
    };
  }
  if (Array.isArray(value)) {
    const truncated = value.length > MAX_ARRAY_LENGTH;
    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => serializeForTrace(item, depth + 1).data);
    if (truncated) {
      items.push(`... +${value.length - MAX_ARRAY_LENGTH} more`);
    }
    return { data: items, typeName: "Array", truncated };
  }
  if (value instanceof Map) {
    const entries: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of value) {
      if (count >= MAX_ARRAY_LENGTH) break;
      entries[String(k)] = serializeForTrace(v, depth + 1).data;
      count++;
    }
    return { data: entries, typeName: "Map", truncated: value.size > MAX_ARRAY_LENGTH };
  }
  if (value instanceof Set) {
    const items: unknown[] = [];
    let count = 0;
    for (const v of value) {
      if (count >= MAX_ARRAY_LENGTH) break;
      items.push(serializeForTrace(v, depth + 1).data);
      count++;
    }
    return { data: items, typeName: "Set", truncated: value.size > MAX_ARRAY_LENGTH };
  }
  // Plain object
  try {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const truncated = keys.length > MAX_ARRAY_LENGTH;
    const result: Record<string, unknown> = {};
    const limit = Math.min(keys.length, MAX_ARRAY_LENGTH);
    for (let i = 0; i < limit; i++) {
      result[keys[i]] = serializeForTrace(record[keys[i]], depth + 1).data;
    }
    return { data: result, typeName: "Object", truncated };
  } catch {
    return { data: "[Object]", typeName: "Object", truncated: true };
  }
}

// =============================================================================
// Operation Metadata
// =============================================================================

type OperationBehavior = {
  readonly inputTrack: "ok" | "err" | "both";
  readonly outputTracks: readonly ("ok" | "err")[];
  readonly canSwitch: boolean;
  readonly isTerminal: boolean;
};

const OPERATION_BEHAVIOR: Record<string, OperationBehavior> = {
  // Constructors
  ok: { inputTrack: "both", outputTracks: ["ok"], canSwitch: false, isTerminal: false },
  err: { inputTrack: "both", outputTracks: ["err"], canSwitch: false, isTerminal: false },
  fromThrowable: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  fromNullable: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  fromPredicate: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  tryCatch: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  fromPromise: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  fromSafePromise: {
    inputTrack: "both",
    outputTracks: ["ok"],
    canSwitch: false,
    isTerminal: false,
  },
  fromAsyncThrowable: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  // Transformations
  map: { inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: false },
  mapErr: { inputTrack: "err", outputTracks: ["err"], canSwitch: false, isTerminal: false },
  mapBoth: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: false },
  flatten: { inputTrack: "ok", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: false },
  flip: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  // Chaining
  andThen: { inputTrack: "ok", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  orElse: { inputTrack: "err", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  andTee: { inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: false },
  orTee: { inputTrack: "err", outputTracks: ["err"], canSwitch: false, isTerminal: false },
  andThrough: { inputTrack: "ok", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  // Observation
  inspect: { inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: false },
  inspectErr: { inputTrack: "err", outputTracks: ["err"], canSwitch: false, isTerminal: false },
  // Extraction (terminal)
  match: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: true },
  unwrapOr: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: true },
  unwrapOrElse: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: false,
    isTerminal: true,
  },
  expect: { inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: true },
  expectErr: { inputTrack: "err", outputTracks: ["err"], canSwitch: false, isTerminal: true },
  // Conversion (terminal)
  toNullable: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: false,
    isTerminal: true,
  },
  toUndefined: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: false,
    isTerminal: true,
  },
  intoTuple: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: false,
    isTerminal: true,
  },
  merge: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: true },
  toJSON: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: true },
  // Async bridge
  toAsync: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: false, isTerminal: false },
  asyncMap: { inputTrack: "ok", outputTracks: ["ok"], canSwitch: false, isTerminal: false },
  asyncAndThen: {
    inputTrack: "ok",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  // Combinators
  all: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  allSettled: {
    inputTrack: "both",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
  },
  any: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
  collect: { inputTrack: "both", outputTracks: ["ok", "err"], canSwitch: true, isTerminal: false },
};

function getOperationBehavior(method: string): OperationBehavior {
  return (
    OPERATION_BEHAVIOR[method] ?? {
      inputTrack: "both",
      outputTracks: ["ok", "err"],
      canSwitch: false,
      isTerminal: false,
    }
  );
}

// =============================================================================
// Chain ID Generation
// =============================================================================

// =============================================================================
// ChainCollector
// =============================================================================

let executionCounter = 0;
let chainCounter = 0;

interface ChainCompleteCallback {
  (descriptor: ResultChainDescriptor, execution: ResultChainExecution): void;
}

class ChainCollector {
  private readonly chainId: string;
  private readonly operations: ResultOperationDescriptor[] = [];
  private readonly steps: ResultStepTrace[] = [];
  private readonly startTime: number;
  private readonly entryMethod: ResultMethodName;
  private readonly entryTrack: "ok" | "err";
  private readonly entryValue: SerializedValue | undefined;
  private readonly onComplete: ChainCompleteCallback;
  private completed = false;

  constructor(
    entryMethod: ResultMethodName,
    entryTrack: "ok" | "err",
    entryValue: unknown,
    onComplete: ChainCompleteCallback
  ) {
    chainCounter += 1;
    this.chainId = `chain:${chainCounter}`;
    this.startTime = performance.now();
    this.entryMethod = entryMethod;
    this.entryTrack = entryTrack;
    this.entryValue = serializeForTrace(entryValue);
    this.onComplete = onComplete;

    // Record the constructor as operation 0
    const behavior = getOperationBehavior(entryMethod);
    this.operations.push({
      index: 0,
      method: entryMethod,
      label: `${entryMethod}()`,
      inputTrack: behavior.inputTrack,
      outputTracks: behavior.outputTracks,
      canSwitch: behavior.canSwitch,
      isTerminal: behavior.isTerminal,
      callbackLocation: undefined,
    });

    // Record a step trace for the constructor (operation 0).
    // The constructor creates the initial Result — its "input" is the raw
    // value and its "output" is the same value on the entry track.
    this.steps.push({
      operationIndex: 0,
      inputTrack: entryTrack,
      outputTrack: entryTrack,
      switched: false,
      inputValue: this.entryValue,
      outputValue: this.entryValue,
      durationMicros: 0,
      callbackThrew: false,
      timestamp: 0,
    });

    // Emit immediately so the Result Panel has visibility into
    // constructor-only chains even when no terminal method is called.
    this.emitInitial(entryTrack, entryValue);
  }

  /**
   * Emit a constructor-only chain immediately at creation time.
   * This does NOT set completed — terminal methods can still emit
   * the full chain later.
   */
  private emitInitial(track: "ok" | "err", value: unknown): void {
    executionCounter += 1;

    const methods = this.operations.map(op => op.method);

    const descriptor: ResultChainDescriptor = {
      chainId: this.chainId,
      label: methods.join(" → "),
      portName: undefined,
      operations: [...this.operations],
      isAsync: false,
      sourceLocation: undefined,
    };

    const execution: ResultChainExecution = {
      executionId: `exec:${Date.now()}-${executionCounter}`,
      chainId: this.chainId,
      entryMethod: this.entryMethod,
      entryTrack: this.entryTrack,
      entryValue: this.entryValue,
      steps: [...this.steps],
      finalTrack: track,
      finalValue: serializeForTrace(value),
      totalDurationMicros: 0,
      startTimestamp: this.startTime,
      scopeId: undefined,
    };

    this.onComplete(descriptor, execution);
  }

  get operationCount(): number {
    return this.operations.length;
  }

  recordStep(
    method: ResultMethodName,
    label: string,
    inputTrack: "ok" | "err",
    outputTrack: "ok" | "err",
    inputValue: unknown,
    outputValue: unknown,
    callbackThrew: boolean
  ): void {
    if (this.completed) return;

    const now = performance.now();
    const prevTime =
      this.steps.length > 0
        ? this.startTime + this.steps[this.steps.length - 1].timestamp / 1000
        : this.startTime;
    const durationMicros = (now - prevTime) * 1000;
    const timestamp = (now - this.startTime) * 1000;

    const opIndex = this.operations.length;
    const behavior = getOperationBehavior(method);

    this.operations.push({
      index: opIndex,
      method,
      label,
      inputTrack: behavior.inputTrack,
      outputTracks: behavior.outputTracks,
      canSwitch: behavior.canSwitch,
      isTerminal: behavior.isTerminal,
      callbackLocation: undefined,
    });

    this.steps.push({
      operationIndex: opIndex,
      inputTrack,
      outputTrack,
      switched: inputTrack !== outputTrack,
      inputValue: serializeForTrace(inputValue),
      outputValue: serializeForTrace(outputValue),
      durationMicros,
      callbackThrew,
      timestamp,
    });
  }

  emitComplete(finalTrack: "ok" | "err", finalValue: unknown): void {
    if (this.completed) return;
    this.completed = true;

    const now = performance.now();
    const totalDurationMicros = (now - this.startTime) * 1000;
    const methods = this.operations.map(op => op.method);

    executionCounter += 1;

    const descriptor: ResultChainDescriptor = {
      chainId: this.chainId,
      label: methods.join(" → "),
      portName: undefined,
      operations: this.operations,
      isAsync: false,
      sourceLocation: undefined,
    };

    const execution: ResultChainExecution = {
      executionId: `exec:${Date.now()}-${executionCounter}`,
      chainId: this.chainId,
      entryMethod: this.entryMethod,
      entryTrack: this.entryTrack,
      entryValue: this.entryValue,
      steps: this.steps,
      finalTrack: finalTrack,
      finalValue: serializeForTrace(finalValue),
      totalDurationMicros,
      startTimestamp: this.startTime,
      scopeId: undefined,
    };

    this.onComplete(descriptor, execution);
  }
}

// =============================================================================
// TracedResult Factory
// =============================================================================

// Type guards are not traced (read-only inspection)
const NON_TRACED_METHODS = new Set(["isOk", "isErr", "isOkAnd", "isErrAnd"]);

// Methods that return a Result and should be wrapped
const RESULT_RETURNING_METHODS = new Set([
  "map",
  "mapErr",
  "mapBoth",
  "flatten",
  "flip",
  "andThen",
  "orElse",
  "andTee",
  "orTee",
  "andThrough",
  "inspect",
  "inspectErr",
]);

// Terminal methods that end the chain
const TERMINAL_METHODS = new Set([
  "match",
  "unwrapOr",
  "unwrapOrElse",
  "expect",
  "expectErr",
  "toNullable",
  "toUndefined",
  "intoTuple",
  "merge",
]);

// Async bridge methods
const ASYNC_METHODS = new Set(["toAsync", "asyncMap", "asyncAndThen"]);

function createTracedResult(
  inner: Result<unknown, unknown>,
  collector: ChainCollector
): Record<string | symbol, unknown> {
  const currentTrack: "ok" | "err" = inner.isOk() ? "ok" : "err";
  const currentValue = inner.isOk() ? inner.value : inner.error;

  const traced: Record<string | symbol, unknown> = {
    _tag: inner.isOk() ? "Ok" : "Err",
    [RESULT_BRAND]: true,
  };

  if (inner.isOk()) {
    traced["value"] = inner.value;
  } else {
    traced["error"] = inner.error;
  }

  // Type guard methods — delegate directly, no tracing
  for (const method of NON_TRACED_METHODS) {
    traced[method] = (...args: unknown[]) => {
      return (inner as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args);
    };
  }

  // toJSON — transparent passthrough for serialization (console.log, JSON.stringify).
  // NOT traced as an operation: it's a serialization protocol, not user logic.
  traced["toJSON"] = () => {
    return (inner as unknown as Record<string, () => unknown>)["toJSON"]();
  };

  // Result-returning methods — trace and wrap result
  for (const method of RESULT_RETURNING_METHODS) {
    traced[method] = (...args: unknown[]) => {
      const startTime = performance.now();
      let callbackThrew = false;
      let result: unknown;

      try {
        result = (inner as unknown as Record<string, (...a: unknown[]) => unknown>)[method](
          ...args
        );
      } catch (e) {
        callbackThrew = true;
        throw e;
      }

      const resultAsResult = result as Result<unknown, unknown>;
      const outputTrack: "ok" | "err" = resultAsResult.isOk() ? "ok" : "err";
      const outputValue = resultAsResult.isOk() ? resultAsResult.value : resultAsResult.error;

      // Determine label from callback function name if available
      const callback = args[0];
      const fnName = typeof callback === "function" ? callback.name || "" : "";
      const label = fnName ? `${method}(${fnName})` : `${method}()`;

      collector.recordStep(
        method as ResultMethodName,
        label,
        currentTrack,
        outputTrack,
        currentValue,
        outputValue,
        callbackThrew
      );

      void startTime; // timing handled inside collector

      return createTracedResult(resultAsResult, collector);
    };
  }

  // Terminal methods — trace and emit complete chain
  for (const method of TERMINAL_METHODS) {
    traced[method] = (...args: unknown[]) => {
      let callbackThrew = false;
      let result: unknown;

      try {
        result = (inner as unknown as Record<string, (...a: unknown[]) => unknown>)[method](
          ...args
        );
      } catch (e) {
        callbackThrew = true;
        // Still emit chain data even on throw
        const callback = args[0];
        const fnName = typeof callback === "function" ? callback.name || "" : "";
        const label = fnName ? `${method}(${fnName})` : `${method}()`;

        collector.recordStep(
          method as ResultMethodName,
          label,
          currentTrack,
          currentTrack,
          currentValue,
          undefined,
          true
        );
        collector.emitComplete(currentTrack, undefined);
        throw e;
      }

      const callback = args[0];
      const fnName = typeof callback === "function" ? callback.name || "" : "";
      const label = fnName ? `${method}(${fnName})` : `${method}()`;

      collector.recordStep(
        method as ResultMethodName,
        label,
        currentTrack,
        currentTrack,
        currentValue,
        result,
        callbackThrew
      );
      collector.emitComplete(currentTrack, result);

      return result;
    };
  }

  // Async bridge methods — trace step, mark as continued async
  for (const method of ASYNC_METHODS) {
    traced[method] = (...args: unknown[]) => {
      const callback = args[0];
      const fnName = typeof callback === "function" ? callback.name || "" : "";
      const label = fnName ? `${method}(${fnName})` : `${method}()`;

      collector.recordStep(
        method as ResultMethodName,
        label,
        currentTrack,
        currentTrack,
        currentValue,
        undefined,
        false
      );
      // Emit chain as complete up to this point
      collector.emitComplete(currentTrack, currentValue);

      return (inner as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args);
    };
  }

  // Generator protocol — delegate to inner
  traced[Symbol.iterator] = () => {
    return (inner as unknown as Iterable<unknown>)[Symbol.iterator]();
  };

  return traced;
}

// =============================================================================
// Public API — createInstrumentedResultModule
// =============================================================================

interface ResultModule {
  readonly ok: (value: unknown) => Result<unknown, unknown>;
  readonly err: (error: unknown) => Result<unknown, unknown>;
  readonly fromThrowable: (...args: unknown[]) => unknown;
  readonly fromNullable: (...args: unknown[]) => unknown;
  readonly fromPredicate: (...args: unknown[]) => unknown;
  readonly tryCatch: (...args: unknown[]) => unknown;
  readonly fromPromise: (...args: unknown[]) => unknown;
  readonly fromSafePromise: (...args: unknown[]) => unknown;
  readonly fromAsyncThrowable: (...args: unknown[]) => unknown;
  readonly [key: string]: unknown;
}

/**
 * Creates an instrumented version of the @hex-di/result module.
 *
 * Replaces ok(), err(), and constructor functions with traced versions.
 * All other exports (types, guards, combinators, generators) pass through.
 */
function createInstrumentedResultModule(
  realModule: ResultModule,
  onChainComplete: ChainCompleteCallback
): Record<string, unknown> {
  const instrumented: Record<string, unknown> = {};

  // Pass through all exports first
  for (const key of Object.keys(realModule)) {
    instrumented[key] = realModule[key];
  }

  // Replace ok() with traced version
  instrumented["ok"] = (value: unknown) => {
    const realResult = realModule.ok(value);
    const collector = new ChainCollector("ok", "ok", value, onChainComplete);
    return createTracedResult(realResult, collector);
  };

  // Replace err() with traced version
  instrumented["err"] = (error: unknown) => {
    const realResult = realModule.err(error);
    const collector = new ChainCollector("err", "err", error, onChainComplete);
    return createTracedResult(realResult, collector);
  };

  // Replace fromThrowable
  instrumented["fromThrowable"] = (...args: unknown[]) => {
    const result = (realModule.fromThrowable as (...a: unknown[]) => unknown)(...args);
    // fromThrowable returns a function, not a Result directly
    if (typeof result === "function") {
      return (...innerArgs: unknown[]) => {
        const innerResult = (result as (...a: unknown[]) => Result<unknown, unknown>)(...innerArgs);
        const track: "ok" | "err" = innerResult.isOk() ? "ok" : "err";
        const val = innerResult.isOk() ? innerResult.value : innerResult.error;
        const collector = new ChainCollector("fromThrowable", track, val, onChainComplete);
        return createTracedResult(innerResult, collector);
      };
    }
    return result;
  };

  // Replace tryCatch
  instrumented["tryCatch"] = (...args: unknown[]) => {
    const result = (realModule.tryCatch as (...a: unknown[]) => Result<unknown, unknown>)(...args);
    const track: "ok" | "err" = result.isOk() ? "ok" : "err";
    const val = result.isOk() ? result.value : result.error;
    const collector = new ChainCollector("tryCatch", track, val, onChainComplete);
    return createTracedResult(result, collector);
  };

  // Replace fromNullable
  instrumented["fromNullable"] = (...args: unknown[]) => {
    const result = (realModule.fromNullable as (...a: unknown[]) => Result<unknown, unknown>)(
      ...args
    );
    const track: "ok" | "err" = result.isOk() ? "ok" : "err";
    const val = result.isOk() ? result.value : result.error;
    const collector = new ChainCollector("fromNullable", track, val, onChainComplete);
    return createTracedResult(result, collector);
  };

  // Replace fromPredicate — always returns a Result directly (3-arg: value, predicate, onFalse)
  instrumented["fromPredicate"] = (...args: unknown[]) => {
    const result = (realModule.fromPredicate as (...a: unknown[]) => Result<unknown, unknown>)(
      ...args
    );
    const track: "ok" | "err" = result.isOk() ? "ok" : "err";
    const val = result.isOk() ? result.value : result.error;
    const collector = new ChainCollector("fromPredicate", track, val, onChainComplete);
    return createTracedResult(result, collector);
  };

  // Async constructors — wrap the returned ResultAsync
  // These return ResultAsync, not Result, so we don't wrap them in TracedResult
  // but we could mark them as entry points. For now, pass through.
  // The tracing for async chains would require TracedResultAsync (future work).

  // ── Combinator instrumentation ──────────────────────────────────────────
  // all, allSettled, any: variadic rest args of Results
  // collect: single record arg of Results

  function extractTrack(r: unknown): "ok" | "err" {
    const tagged = r as { _tag?: string };
    return tagged._tag === "Err" ? "err" : "ok";
  }

  function extractValue(r: unknown): unknown {
    const tagged = r as { _tag?: string; value?: unknown; error?: unknown };
    return tagged._tag === "Err" ? tagged.error : tagged.value;
  }

  function buildCombinatorInputData(
    results: readonly unknown[],
    names?: readonly string[]
  ): unknown[] {
    return results.map((r, i) => ({
      index: i,
      name: names ? names[i] : undefined,
      sourceLabel: names ? names[i] : `input-${i}`,
      track: extractTrack(r),
      valuePreview: String(extractValue(r) ?? "—").slice(0, 80),
      isShortCircuitCause: false,
      isSkipped: false,
    }));
  }

  function emitCombinatorChain(
    method: ResultMethodName,
    inputData: unknown[],
    outTrack: "ok" | "err",
    outValue: unknown
  ): void {
    chainCounter += 1;
    executionCounter += 1;
    const chainId = `chain:${chainCounter}`;
    const now = performance.now();
    const behavior = getOperationBehavior(method);

    const descriptor: ResultChainDescriptor = {
      chainId,
      label: `${method}()`,
      portName: undefined,
      operations: [
        {
          index: 0,
          method,
          label: `${method}()`,
          inputTrack: behavior.inputTrack,
          outputTracks: behavior.outputTracks,
          canSwitch: behavior.canSwitch,
          isTerminal: false,
          callbackLocation: undefined,
        },
      ],
      isAsync: false,
      sourceLocation: undefined,
    };

    const execution: ResultChainExecution = {
      executionId: `exec:${Date.now()}-${executionCounter}`,
      chainId,
      entryMethod: method,
      entryTrack: "ok",
      entryValue: serializeForTrace(inputData),
      steps: [
        {
          operationIndex: 0,
          inputTrack: "ok",
          outputTrack: outTrack,
          switched: outTrack !== "ok",
          inputValue: serializeForTrace(inputData),
          outputValue: serializeForTrace(outValue),
          durationMicros: 0,
          callbackThrew: false,
          timestamp: 0,
        },
      ],
      finalTrack: outTrack,
      finalValue: serializeForTrace(outValue),
      totalDurationMicros: (performance.now() - now) * 1000,
      startTimestamp: now,
      scopeId: undefined,
    };

    onChainComplete(descriptor, execution);
  }

  function instrumentVariadicCombinator(method: "all" | "allSettled" | "any"): void {
    const real = realModule[method] as (...args: unknown[]) => Result<unknown, unknown>;
    if (typeof real !== "function") return;

    instrumented[method] = (...args: unknown[]) => {
      const inputData = buildCombinatorInputData(args);
      const result = real(...args);
      const outTrack: "ok" | "err" = result.isOk() ? "ok" : "err";
      const outValue = result.isOk() ? result.value : result.error;

      emitCombinatorChain(method, inputData, outTrack, outValue);
      return result;
    };
  }

  instrumentVariadicCombinator("all");
  instrumentVariadicCombinator("allSettled");
  instrumentVariadicCombinator("any");

  // collect takes a single record argument
  if (typeof realModule["collect"] === "function") {
    const realCollect = realModule["collect"] as (
      record: Record<string, Result<unknown, unknown>>
    ) => Result<unknown, unknown>;

    instrumented["collect"] = (record: unknown) => {
      const rec = record as Record<string, unknown>;
      const keys = Object.keys(rec);
      const values = keys.map(k => rec[k]);
      const inputData = buildCombinatorInputData(values, keys);

      const result = realCollect(rec as Record<string, Result<unknown, unknown>>);
      const outTrack: "ok" | "err" = result.isOk() ? "ok" : "err";
      const outValue = result.isOk() ? result.value : result.error;

      emitCombinatorChain("collect", inputData, outTrack, outValue);
      return result;
    };
  }

  return instrumented;
}

export { ChainCollector, createTracedResult, createInstrumentedResultModule, serializeForTrace };
export type {
  ChainCompleteCallback,
  ResultModule,
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
  ResultMethodName,
  SerializedValue,
};
