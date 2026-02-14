/**
 * Sandbox Executor
 *
 * Manages the Web Worker lifecycle for executing user code in an
 * isolated sandbox. Each execution creates a fresh Worker to prevent
 * state leakage between runs.
 *
 * @packageDocumentation
 */

import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  ConsoleEntry,
  SerializedError,
} from "./worker-protocol.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a sandbox execution.
 */
export interface ExecutionResult {
  readonly success: boolean;
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly error?: SerializedError | { readonly type: "timeout"; readonly message: string };
  readonly hasInspector: boolean;
}

/**
 * Callback for handling worker messages during execution.
 */
export type WorkerMessageHandler = (message: WorkerToMainMessage) => void;

/**
 * Factory for creating Worker instances.
 * Allows injection for testing.
 */
export type WorkerFactory = (url: string | URL) => Worker;

/**
 * Default timeout for code execution in milliseconds.
 */
export const DEFAULT_TIMEOUT_MS = 5000;

// =============================================================================
// SandboxExecutor
// =============================================================================

/**
 * Manages Web Worker lifecycle for isolated code execution.
 *
 * Each `execute()` call:
 * 1. Terminates any existing worker
 * 2. Creates a fresh Worker
 * 3. Sets up timeout enforcement
 * 4. Sends the compiled code for execution
 * 5. Collects console output and inspector data
 */
export class SandboxExecutor {
  private worker: Worker | undefined;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly workerEntryUrl: string | URL;
  private readonly createWorker: WorkerFactory;

  constructor(workerEntryUrl: string | URL, createWorker?: WorkerFactory) {
    this.workerEntryUrl = workerEntryUrl;
    this.createWorker = createWorker ?? defaultWorkerFactory;
  }

  /**
   * Execute compiled JavaScript code in a fresh Web Worker sandbox.
   *
   * @param code - The compiled JavaScript to execute
   * @param onMessage - Optional callback for handling worker messages (e.g., inspector data)
   * @param timeoutMs - Maximum execution time before termination
   * @returns ExecutionResult with success status, console entries, and error info
   */
  execute(
    code: string,
    onMessage?: WorkerMessageHandler,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<ExecutionResult> {
    // Terminate any existing worker
    this.terminate();

    return new Promise(resolve => {
      const consoleEntries: ConsoleEntry[] = [];
      let hasInspector = false;

      const worker = this.createWorker(this.workerEntryUrl);
      this.worker = worker;

      // Set up timeout
      this.timeoutId = setTimeout(() => {
        this.terminate();
        resolve({
          success: false,
          consoleEntries,
          error: {
            type: "timeout",
            message: `Execution timed out after ${timeoutMs}ms`,
          },
          hasInspector,
        });
      }, timeoutMs);

      let workerReady = false;

      // Handle messages from worker
      worker.addEventListener("message", (event: MessageEvent<WorkerToMainMessage>) => {
        const message = event.data;

        // Wait for the worker to signal readiness before processing.
        // The worker registers its message handler AFTER async module
        // initialization completes, then sends a "ready" console message.
        // We must wait for this before sending the execute command.
        if (!workerReady) {
          if (isReadySignal(message)) {
            workerReady = true;
            const executeMessage: MainToWorkerMessage = { type: "execute", code };
            worker.postMessage(executeMessage);
          }
          // Collect any pre-ready console entries (e.g., the ready signal itself)
          if (message.type === "console") {
            consoleEntries.push({
              type: "log",
              level: message.level,
              args: message.args,
              timestamp: message.timestamp,
            });
          }
          return;
        }

        switch (message.type) {
          case "console":
            consoleEntries.push({
              type: "log",
              level: message.level,
              args: message.args,
              timestamp: message.timestamp,
            });
            break;

          case "execution-complete":
            this.clearTimeout();
            resolve({
              success: true,
              consoleEntries,
              hasInspector,
            });
            return;

          case "execution-error":
            this.clearTimeout();
            resolve({
              success: false,
              consoleEntries,
              error: message.error,
              hasInspector,
            });
            return;

          case "inspector-data":
            hasInspector = true;
            break;

          case "no-inspector":
            hasInspector = false;
            break;

          case "worker-ready":
            // Already handled above; ignore duplicate signals
            break;

          default:
            // Other messages (inspector events, responses) are handled by the caller
            break;
        }

        // Forward all messages to the optional handler
        if (onMessage !== undefined) {
          onMessage(message);
        }
      });

      // Handle worker errors (e.g., import failures, syntax errors in worker entry)
      worker.addEventListener("error", event => {
        this.clearTimeout();
        resolve({
          success: false,
          consoleEntries,
          error: {
            name: "WorkerError",
            message: event.message || "Sandbox crashed unexpectedly",
            stack: undefined,
          },
          hasInspector,
        });
      });
    });
  }

  /**
   * Terminate the current worker immediately.
   * Clears any pending timeout.
   */
  terminate(): void {
    this.clearTimeout();
    if (this.worker !== undefined) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  /**
   * Whether a worker is currently running.
   */
  get isRunning(): boolean {
    return this.worker !== undefined;
  }

  private clearTimeout(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}

// =============================================================================
// Default Worker Factory
// =============================================================================

function defaultWorkerFactory(url: string | URL): Worker {
  return new Worker(url, { type: "module" });
}

/**
 * Check if a worker message is the "worker-ready" signal.
 * Sent by the worker after async initialization completes.
 */
function isReadySignal(message: WorkerToMainMessage): boolean {
  return message.type === "worker-ready";
}
