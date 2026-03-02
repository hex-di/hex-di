/**
 * Worker Protocol Types
 *
 * Defines the message types exchanged between the main thread and the
 * Web Worker sandbox, along with serialization helpers for structured
 * clone compatibility.
 *
 * @packageDocumentation
 */

import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  InspectorEvent,
  LibraryInspector,
  ResultStatistics,
} from "@hex-di/core";
import type { ResultChainDescriptor, ResultChainExecution } from "./traced-result.js";
import type {
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  SerializedRole,
} from "./traced-guard.js";

// =============================================================================
// Serialized Value Types
// =============================================================================

/**
 * Type tag for serialized console argument values.
 */
export type SerializedValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "object"
  | "array"
  | "error"
  | "function"
  | "symbol";

/**
 * A console argument value serialized for structured clone transport.
 *
 * Non-cloneable values (functions, symbols, circular references) are
 * converted to string representations.
 */
export interface SerializedValue {
  readonly type: SerializedValueType;
  /** String representation for display */
  readonly value: string;
  /** Structured clone-safe preview (for objects/arrays) */
  readonly preview?: unknown;
}

/**
 * A serialized error with name, message, and optional stack trace.
 */
export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

// =============================================================================
// Compilation Types
// =============================================================================

/**
 * Result of compiling user code via esbuild-wasm.
 */
export interface CompilationResult {
  readonly success: boolean;
  readonly errors: readonly CompilationError[];
  /** Bundled JavaScript when success is true */
  readonly code: string | undefined;
}

/**
 * A compilation error with location information.
 */
export interface CompilationError {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

// =============================================================================
// Serialized Inspector Data Types
// =============================================================================

/**
 * Serialized form of a LibraryInspector for structured clone transport.
 */
export interface SerializedLibraryInspector {
  readonly name: string;
  readonly snapshot: Readonly<Record<string, unknown>>;
}

/**
 * Serialized form of LibraryInspectors map as tuple array.
 */
export type SerializedLibraryInspectors = readonly [string, SerializedLibraryInspector][];

/**
 * Serialized form of ResultStatistics map as tuple array.
 */
export type SerializedResultStatistics = readonly [string, ResultStatistics][];

// =============================================================================
// Main Thread -> Worker Messages
// =============================================================================

/**
 * Messages sent from the main thread to the Web Worker.
 *
 * Discriminated union on `type` field.
 */
export type MainToWorkerMessage =
  | { readonly type: "execute"; readonly code: string }
  | { readonly type: "request-snapshot" }
  | { readonly type: "request-scope-tree" }
  | { readonly type: "request-graph-data" }
  | { readonly type: "request-unified-snapshot" }
  | { readonly type: "request-adapter-info" }
  | { readonly type: "request-library-inspectors" }
  | { readonly type: "request-result-statistics" }
  | { readonly type: "terminate" };

// =============================================================================
// Worker -> Main Thread Messages
// =============================================================================

/**
 * Messages sent from the Web Worker to the main thread.
 *
 * Discriminated union on `type` field.
 */
export type WorkerToMainMessage =
  // Worker lifecycle
  | { readonly type: "worker-ready" }

  // Execution lifecycle
  | { readonly type: "execution-complete"; readonly success: true }
  | { readonly type: "execution-error"; readonly error: SerializedError }
  | { readonly type: "no-inspector" }

  // Console output
  | {
      readonly type: "console";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }

  // Inspector data (push -- sent after execution and on each event)
  | {
      readonly type: "inspector-data";
      readonly snapshot: ContainerSnapshot;
      readonly scopeTree: ScopeTree;
      readonly graphData: ContainerGraphData;
      readonly unifiedSnapshot: UnifiedSnapshot;
      readonly adapterInfo: readonly AdapterInfo[];
      readonly libraryInspectors: SerializedLibraryInspectors;
      readonly resultStatistics: SerializedResultStatistics;
    }

  // Inspector events (push -- forwarded from InspectorAPI subscription)
  | {
      readonly type: "inspector-event";
      readonly event: InspectorEvent;
    }

  // Result chain tracing (push -- sent by instrumented Result module)
  | {
      readonly type: "result-chain-registered";
      readonly chain: ResultChainDescriptor;
    }
  | {
      readonly type: "result-chain-executed";
      readonly execution: ResultChainExecution;
    }

  // Guard evaluation tracing (push -- sent by instrumented Guard module)
  | {
      readonly type: "guard-descriptor-registered";
      readonly descriptor: GuardEvaluationDescriptor;
    }
  | {
      readonly type: "guard-execution-added";
      readonly execution: GuardEvaluationExecution;
    }
  | {
      readonly type: "guard-role-hierarchy-updated";
      readonly roles: readonly SerializedRole[];
    }

  // Response to pull requests
  | { readonly type: "response-snapshot"; readonly data: ContainerSnapshot | undefined }
  | { readonly type: "response-scope-tree"; readonly data: ScopeTree | undefined }
  | { readonly type: "response-graph-data"; readonly data: ContainerGraphData | undefined }
  | { readonly type: "response-unified-snapshot"; readonly data: UnifiedSnapshot | undefined }
  | { readonly type: "response-adapter-info"; readonly data: readonly AdapterInfo[] | undefined }
  | {
      readonly type: "response-library-inspectors";
      readonly data: SerializedLibraryInspectors | undefined;
    }
  | {
      readonly type: "response-result-statistics";
      readonly data: SerializedResultStatistics | undefined;
    };

// =============================================================================
// Console Entry Types
// =============================================================================

/**
 * Console entry types for the console output pane.
 */
export type ConsoleEntry =
  | {
      readonly type: "log";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }
  | {
      readonly type: "compilation-error";
      readonly errors: readonly CompilationError[];
    }
  | {
      readonly type: "runtime-error";
      readonly error: SerializedError;
    }
  | {
      readonly type: "timeout";
      readonly timeoutMs: number;
    }
  | {
      readonly type: "status";
      readonly message: string;
      readonly variant: "info" | "success" | "error";
    };

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Serialize a value for structured clone transport.
 *
 * Handles non-cloneable values (functions, symbols, circular references)
 * by converting them to string representations.
 */
export function serializeValue(value: unknown): SerializedValue {
  if (value === null) {
    return { type: "null", value: "null" };
  }
  if (value === undefined) {
    return { type: "undefined", value: "undefined" };
  }
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "number") {
    return { type: "number", value: String(value) };
  }
  if (typeof value === "boolean") {
    return { type: "boolean", value: String(value) };
  }
  if (typeof value === "symbol") {
    return { type: "symbol", value: String(value) };
  }
  if (typeof value === "function") {
    const name = value.name || "anonymous";
    return { type: "function", value: `[Function: ${name}]` };
  }
  if (value instanceof Error) {
    return {
      type: "error",
      value: `${value.name}: ${value.message}`,
      preview: { name: value.name, message: value.message, stack: value.stack },
    };
  }
  if (Array.isArray(value)) {
    try {
      const preview = safeDeepClone(value);
      return { type: "array", value: safeStringify(value), preview };
    } catch {
      return { type: "array", value: "[Array]" };
    }
  }
  // Object
  try {
    const preview = safeDeepClone(value);
    return { type: "object", value: safeStringify(value), preview };
  } catch {
    return { type: "object", value: "[Object]" };
  }
}

/**
 * Serialize an error into a transport-safe format.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    const record = error as Readonly<Record<string, unknown>>;
    return {
      name: typeof record["name"] === "string" ? record["name"] : "Error",
      message: typeof record["message"] === "string" ? record["message"] : String(error),
      stack: typeof record["stack"] === "string" ? record["stack"] : undefined,
    };
  }
  return {
    name: "Error",
    message: String(error),
  };
}

/**
 * Serialize library inspectors map to structured clone-safe tuple array.
 */
export function serializeLibraryInspectors(
  inspectors: ReadonlyMap<string, LibraryInspector>
): SerializedLibraryInspectors {
  const result: [string, SerializedLibraryInspector][] = [];
  for (const [name, inspector] of inspectors) {
    result.push([name, { name: inspector.name, snapshot: inspector.getSnapshot() }]);
  }
  return result;
}

/**
 * Serialize result statistics map to structured clone-safe tuple array.
 *
 * Converts the inner `errorsByCode` Map to a tuple array so it survives
 * structured clone transport across the worker boundary.
 */
export function serializeResultStatistics(
  stats: ReadonlyMap<string, ResultStatistics>
): SerializedResultStatistics {
  const result: [string, ResultStatistics][] = [];
  for (const [name, stat] of stats) {
    result.push([
      name,
      {
        ...stat,
        // Convert Map to array for structured clone compatibility
        errorsByCode: [...stat.errorsByCode] as unknown as ReadonlyMap<string, number>,
      },
    ]);
  }
  return result;
}

/**
 * Deserialize library inspectors from tuple array back to ReadonlyMap.
 */
export function deserializeLibraryInspectors(
  data: SerializedLibraryInspectors
): ReadonlyMap<string, LibraryInspector> {
  return new Map(
    data.map(([name, serialized]) => [
      name,
      {
        name: serialized.name,
        getSnapshot: () => serialized.snapshot,
      },
    ])
  );
}

/**
 * Deserialize result statistics from tuple array back to ReadonlyMap.
 *
 * Reconstructs the inner `errorsByCode` from a tuple array back to a Map,
 * handling both pre-serialized arrays and already-constructed Maps.
 */
export function deserializeResultStatistics(
  data: SerializedResultStatistics
): ReadonlyMap<string, ResultStatistics> {
  return new Map(
    data.map(([name, stat]) => [
      name,
      {
        ...stat,
        errorsByCode:
          stat.errorsByCode instanceof Map
            ? stat.errorsByCode
            : new Map(stat.errorsByCode as unknown as [string, number][]),
      },
    ])
  );
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely stringify a value, handling circular references.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val: unknown) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      if (typeof val === "function") {
        return `[Function: ${val.name || "anonymous"}]`;
      }
      if (typeof val === "symbol") {
        return String(val);
      }
      if (typeof val === "bigint") {
        return `${String(val)}n`;
      }
      return val;
    });
  } catch {
    return "[Object]";
  }
}

/**
 * Attempt a safe deep clone of a value for preview purposes.
 * Falls back by removing non-cloneable values.
 */
function safeDeepClone(value: unknown): unknown {
  try {
    return JSON.parse(safeStringify(value));
  } catch {
    return undefined;
  }
}
