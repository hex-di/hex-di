/**
 * Disposal plan executor with parallel phase execution and blame context.
 *
 * Executes a `DisposalPlan` phase-by-phase, running independent adapters
 * in parallel via `Promise.allSettled`. Errors are collected with blame
 * context for diagnostics, but disposal always proceeds on a best-effort basis.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/14-formal-disposal-ordering | BEH-CO-14-002}
 * @see {@link https://hex-di.dev/spec/core/behaviors/14-formal-disposal-ordering | BEH-CO-14-003}
 *
 * @packageDocumentation
 */

import type { BlameContext } from "../errors/blame.js";
import { createBlameContext } from "../errors/blame.js";
import type { DisposalPlan, DisposalResult, DisposalErrorEntry, DisposalPhase } from "./types.js";

// =============================================================================
// Instance Lookup
// =============================================================================

/**
 * Provides instance and finalizer data for a given port name.
 */
export interface DisposalInstanceProvider {
  /**
   * Retrieves the cached instance and optional finalizer for a port name.
   * Returns `undefined` if no instance is cached for the port.
   */
  getInstanceForDisposal(portName: string):
    | {
        readonly instance: unknown;
        readonly finalizer?: ((instance: unknown) => void | Promise<void>) | undefined;
      }
    | undefined;
}

// =============================================================================
// Execution Options
// =============================================================================

/**
 * Options for controlling disposal execution behavior.
 */
export interface ExecuteDisposalOptions {
  /** Maximum time in ms to wait for each individual finalizer. Default: 30_000 */
  readonly finalizerTimeoutMs?: number;
}

// =============================================================================
// Timer and Performance Abstraction
// =============================================================================

/**
 * Access setTimeout/clearTimeout via globalThis to avoid requiring @types/node.
 */
const _timers = globalThis as unknown as {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

/**
 * High-resolution time source for measuring disposal duration.
 * Uses globalThis to avoid requiring DOM or Node.js type declarations.
 */
function now(): number {
  const g = globalThis as Record<string, unknown>;
  const perf = g.performance as { now?: () => number } | undefined;
  if (perf !== undefined && typeof perf.now === "function") {
    return perf.now();
  }
  return Date.now();
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Wraps a possibly-async finalizer result with a timeout.
 */
function withTimeout(
  maybePromise: void | Promise<void>,
  timeoutMs: number,
  portName: string
): Promise<void> {
  if (maybePromise === undefined || !(maybePromise instanceof Promise)) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const timer = _timers.setTimeout(() => {
      reject(
        Object.freeze({
          _tag: "FinalizerTimeout" as const,
          portName,
          timeoutMs,
          message: `Finalizer for port '${portName}' timed out after ${timeoutMs}ms`,
        })
      );
    }, timeoutMs);

    maybePromise.then(
      () => {
        _timers.clearTimeout(timer);
        resolve();
      },
      (err: unknown) => {
        _timers.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Creates a blame context for a disposal error.
 */
function createDisposalBlame(portName: string, error: unknown): BlameContext {
  return createBlameContext({
    adapterFactory: { name: portName },
    portContract: { name: portName, direction: "outbound" },
    violationType: { _tag: "DisposalError", error },
    resolutionPath: [portName],
  });
}

// =============================================================================
// executePhase
// =============================================================================

/**
 * Executes a single disposal phase, running all finalizers in parallel.
 *
 * Uses `Promise.allSettled` so a single failing finalizer does not
 * prevent others in the same phase from completing.
 *
 * @param phase - The disposal phase to execute
 * @param provider - Provides instance data for each adapter
 * @param timeoutMs - Per-finalizer timeout in milliseconds
 * @returns Arrays of disposed port names and error entries
 */
async function executePhase(
  phase: DisposalPhase,
  provider: DisposalInstanceProvider,
  timeoutMs: number
): Promise<{ disposed: string[]; errors: DisposalErrorEntry[] }> {
  const disposed: string[] = [];
  const errors: DisposalErrorEntry[] = [];

  // Collect finalizer promises for this phase
  const tasks: Array<{
    portName: string;
    promise: Promise<void>;
  }> = [];

  for (const entry of phase.adapters) {
    const data = provider.getInstanceForDisposal(entry.portName);

    if (data === undefined || data.finalizer === undefined) {
      // No finalizer — mark as disposed (no-op)
      disposed.push(entry.portName);
      continue;
    }

    const finalizer = data.finalizer;
    const instance = data.instance;
    const promise = (async () => {
      await withTimeout(finalizer(instance), timeoutMs, entry.portName);
    })();

    tasks.push({ portName: entry.portName, promise });
  }

  if (tasks.length === 0) {
    return { disposed, errors };
  }

  // Execute all finalizers in parallel
  const results = await Promise.allSettled(tasks.map(t => t.promise));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const task = tasks[i];
    if (result === undefined || task === undefined) continue;

    disposed.push(task.portName);

    if (result.status === "rejected") {
      const reason: unknown = result.reason;
      errors.push(
        Object.freeze({
          adapterName: task.portName,
          error: reason,
          blame: createDisposalBlame(task.portName, reason),
        })
      );
    }
  }

  return { disposed, errors };
}

// =============================================================================
// executeDisposalPlan
// =============================================================================

/**
 * Executes a disposal plan phase-by-phase.
 *
 * Phases are executed sequentially (phase 0 before phase 1, etc.)
 * but adapters within the same phase are disposed in parallel.
 *
 * Errors do not halt disposal — all phases are executed on a best-effort basis
 * and all errors are collected in the result.
 *
 * @param plan - The computed disposal plan
 * @param provider - Provides instance and finalizer data
 * @param options - Execution options (timeout, etc.)
 * @returns A frozen `DisposalResult` with all disposed adapters and errors
 */
export async function executeDisposalPlan(
  plan: DisposalPlan,
  provider: DisposalInstanceProvider,
  options?: ExecuteDisposalOptions
): Promise<DisposalResult> {
  const timeoutMs = options?.finalizerTimeoutMs ?? 30_000;
  const startTime = now();

  const allDisposed: string[] = [];
  const allErrors: DisposalErrorEntry[] = [];

  for (const phase of plan.phases) {
    const { disposed, errors } = await executePhase(phase, provider, timeoutMs);
    allDisposed.push(...disposed);
    allErrors.push(...errors);
  }

  const totalTime = now() - startTime;

  return Object.freeze({
    disposed: Object.freeze(allDisposed),
    errors: Object.freeze(allErrors),
    totalTime,
  });
}
