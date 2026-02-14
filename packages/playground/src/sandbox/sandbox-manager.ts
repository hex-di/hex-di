/**
 * Sandbox Manager
 *
 * Orchestrates the compile + execute pipeline. Coordinates the compiler,
 * executor, and inspector bridge to provide a simple interface for
 * running user code.
 *
 * State machine: idle -> compiling -> executing -> complete/error
 *
 * @packageDocumentation
 */

import type { CompilationResult, ConsoleEntry, SerializedError } from "./worker-protocol.js";
import type { ExecutionResult, WorkerMessageHandler } from "./executor.js";
import { PlaygroundInspectorBridge } from "../adapter/playground-inspector-bridge.js";

// =============================================================================
// Types
// =============================================================================

/**
 * State machine for the sandbox lifecycle.
 */
export type SandboxState =
  | { readonly phase: "idle" }
  | { readonly phase: "compiling" }
  | { readonly phase: "executing" }
  | { readonly phase: "complete"; readonly result: SandboxExecutionResult }
  | { readonly phase: "error"; readonly error: SandboxError };

/**
 * Result of a complete sandbox execution (compile + run).
 */
export interface SandboxExecutionResult {
  readonly success: boolean;
  readonly compilationMs: number;
  readonly executionMs: number;
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly hasInspector: boolean;
}

/**
 * Error categories for sandbox execution failures.
 */
export type SandboxError =
  | { readonly type: "compilation"; readonly errors: CompilationResult["errors"] }
  | { readonly type: "runtime"; readonly error: SerializedError }
  | { readonly type: "timeout"; readonly timeoutMs: number }
  | { readonly type: "crash"; readonly message: string };

/**
 * Compiler function signature for dependency injection.
 */
export type CompileFn = (
  files: ReadonlyMap<string, string>,
  entryPoint: string
) => Promise<CompilationResult>;

/**
 * Executor function signature for dependency injection.
 */
export interface Executor {
  execute(
    code: string,
    onMessage?: WorkerMessageHandler,
    timeoutMs?: number
  ): Promise<ExecutionResult>;
  terminate(): void;
}

/**
 * Listener for sandbox state changes.
 */
export type SandboxStateListener = (state: SandboxState) => void;

// =============================================================================
// SandboxManager
// =============================================================================

/**
 * Orchestrates the compile -> execute pipeline.
 *
 * Provides:
 * - A state machine tracking the current phase
 * - Console output accumulation
 * - Inspector data forwarding to the PlaygroundInspectorBridge
 * - State change subscriptions
 */
export class SandboxManager {
  private currentState: SandboxState = { phase: "idle" };
  private readonly listeners = new Set<SandboxStateListener>();
  private readonly compileFn: CompileFn;
  private readonly executor: Executor;

  readonly bridge: PlaygroundInspectorBridge;

  constructor(compileFn: CompileFn, executor: Executor) {
    this.compileFn = compileFn;
    this.executor = executor;
    this.bridge = new PlaygroundInspectorBridge();
  }

  /**
   * Current sandbox state.
   */
  get state(): SandboxState {
    return this.currentState;
  }

  /**
   * Compile and execute the given files.
   *
   * @param files - Map of file paths to source content
   * @param entryPoint - Entry point file path (defaults to "main.ts")
   * @param timeoutMs - Maximum execution time
   * @returns The execution result
   */
  async execute(
    files: ReadonlyMap<string, string>,
    entryPoint = "main.ts",
    timeoutMs?: number
  ): Promise<SandboxExecutionResult> {
    // Reset the bridge for the new execution
    this.bridge.reset();

    // Phase: compiling
    this.setState({ phase: "compiling" });
    const compileStart = performance.now();

    let compilationResult: CompilationResult;
    try {
      compilationResult = await this.compileFn(files, entryPoint);
    } catch (error: unknown) {
      const sandboxError: SandboxError = {
        type: "crash",
        message: error instanceof Error ? error.message : String(error),
      };
      this.setState({ phase: "error", error: sandboxError });
      return {
        success: false,
        compilationMs: performance.now() - compileStart,
        executionMs: 0,
        consoleEntries: [],
        hasInspector: false,
      };
    }

    const compilationMs = performance.now() - compileStart;

    // Handle compilation failure
    if (!compilationResult.success || compilationResult.code === undefined) {
      const sandboxError: SandboxError = {
        type: "compilation",
        errors: compilationResult.errors,
      };
      this.setState({ phase: "error", error: sandboxError });
      const compilationEntries: ConsoleEntry[] = [
        {
          type: "compilation-error",
          errors: compilationResult.errors,
        },
      ];
      return {
        success: false,
        compilationMs,
        executionMs: 0,
        consoleEntries: compilationEntries,
        hasInspector: false,
      };
    }

    // Phase: executing
    this.setState({ phase: "executing" });
    const executeStart = performance.now();

    // Set up message handler for inspector data
    const workerMessageHandler: WorkerMessageHandler = message => {
      this.bridge.handleWorkerMessage(message);
    };

    let executionResult: ExecutionResult;
    try {
      executionResult = await this.executor.execute(
        compilationResult.code,
        workerMessageHandler,
        timeoutMs
      );
    } catch (error: unknown) {
      const sandboxError: SandboxError = {
        type: "crash",
        message: error instanceof Error ? error.message : String(error),
      };
      this.setState({ phase: "error", error: sandboxError });
      return {
        success: false,
        compilationMs,
        executionMs: performance.now() - executeStart,
        consoleEntries: [],
        hasInspector: false,
      };
    }

    const executionMs = performance.now() - executeStart;

    // Build the result
    const result: SandboxExecutionResult = {
      success: executionResult.success,
      compilationMs,
      executionMs,
      consoleEntries: buildConsoleEntries(executionResult),
      hasInspector: executionResult.hasInspector,
    };

    // Set final state
    if (executionResult.success) {
      this.setState({ phase: "complete", result });
    } else {
      const sandboxError = categorizeError(executionResult);
      this.setState({ phase: "error", error: sandboxError });
    }

    return result;
  }

  /**
   * Terminate the current execution if running.
   */
  terminate(): void {
    this.executor.terminate();
    if (this.currentState.phase === "executing") {
      this.setState({ phase: "idle" });
    }
  }

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: SandboxStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private setState(state: SandboxState): void {
    this.currentState = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build console entries from an execution result.
 */
function buildConsoleEntries(result: ExecutionResult): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [...result.consoleEntries];

  if (!result.success && result.error !== undefined) {
    if ("type" in result.error && result.error.type === "timeout") {
      entries.push({
        type: "timeout",
        timeoutMs: parseInt(result.error.message.replace(/\D/g, ""), 10) || 5000,
      });
    } else if ("name" in result.error) {
      entries.push({
        type: "runtime-error",
        error: result.error,
      });
    }
  }

  return entries;
}

/**
 * Categorize an execution error into a SandboxError.
 */
function categorizeError(result: ExecutionResult): SandboxError {
  if (result.error === undefined) {
    return { type: "crash", message: "Unknown error" };
  }
  if ("type" in result.error && result.error.type === "timeout") {
    const ms = parseInt(result.error.message.replace(/\D/g, ""), 10) || 5000;
    return { type: "timeout", timeoutMs: ms };
  }
  if ("name" in result.error) {
    return { type: "runtime", error: result.error };
  }
  return { type: "crash", message: "Unknown error" };
}
