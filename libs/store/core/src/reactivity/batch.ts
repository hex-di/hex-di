/**
 * Container-scoped batching.
 *
 * Groups multiple state changes into a single notification cycle.
 *
 * @packageDocumentation
 */

import { startBatch, endBatch } from "alien-signals";
import { tryCatch } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import { BatchExecutionFailed } from "../errors/tagged-errors.js";
import type { ReactiveSystemInstance } from "./system-factory.js";

// =============================================================================
// Per-target Batch Depth Tracking
// =============================================================================

/**
 * Tracks the current batch nesting depth per container/scope target.
 *
 * alien-signals only provides global `startBatch()`/`endBatch()` with no scoping API.
 * This WeakMap provides per-target depth tracking so callers can query whether
 * a specific container or scope is currently inside a batch, and at what depth.
 *
 * @internal
 */
const _batchDepths = new WeakMap<object, number>();

// =============================================================================
// Cross-container Batch Detection
// =============================================================================

/**
 * Tracks the target that initiated the outermost batch.
 *
 * When `batch()` is called with target A while target B is already in a batch,
 * this indicates accidental cross-container batching. The `_onCrossContainerBatch`
 * callback is invoked if configured.
 *
 * @internal
 */
let _activeBatchTarget: WeakRef<object> | null = null;

/**
 * Optional callback invoked when cross-container batching is detected.
 *
 * Set via `setBatchDiagnostics()`. Called with the new target that entered
 * a batch while a different target was already in a batch.
 *
 * @internal
 */
let _onCrossContainerBatch: ((newTarget: object, existingTarget: object) => void) | null = null;

/**
 * Configure a callback for cross-container batch detection.
 *
 * When `batch()` is called with target A while target B is already in a batch,
 * alien-signals cannot isolate the two batches. The callback receives both
 * targets so diagnostics or warnings can be emitted.
 *
 * Pass `null` to disable detection.
 *
 * @param callback - The diagnostic callback, or `null` to disable.
 */
export function setBatchDiagnostics(
  callback: ((newTarget: object, existingTarget: object) => void) | null
): void {
  _onCrossContainerBatch = callback;
}

// =============================================================================
// batch()
// =============================================================================

/**
 * Groups multiple state changes into a single notification cycle.
 *
 * Uses alien-signals batching primitives by default. When an explicit
 * `system` is provided, uses that system's isolated batching instead.
 *
 * When the batch function throws, deferred notifications are flushed
 * and a BatchExecutionError is returned as the Err variant of the Result.
 *
 * **Scope isolation:** When using an explicit `ReactiveSystemInstance`,
 * batching is fully isolated to that system's dependency graph.
 * Without a system, alien-signals' global batching is used and per-target
 * depth tracking via WeakMap provides diagnostic visibility.
 *
 * @param containerOrScope - The container or scope to associate batch depth with.
 *   Pass `null` for global-only mode (no per-target depth tracking).
 * @param fn - The function to execute within the batch.
 * @param system - Optional isolated reactive system to use for batching.
 */
export function batch(
  containerOrScope: object | null,
  fn: () => void,
  system?: ReactiveSystemInstance
): Result<void, BatchExecutionFailed> {
  if (containerOrScope !== null) {
    // Cross-container batch detection
    if (_onCrossContainerBatch !== null && _activeBatchTarget !== null) {
      const existing = _activeBatchTarget.deref();
      if (existing !== undefined && existing !== containerOrScope) {
        _onCrossContainerBatch(containerOrScope, existing);
      }
    }

    const current = _batchDepths.get(containerOrScope) ?? 0;
    _batchDepths.set(containerOrScope, current + 1);

    // Track outermost batch target
    if (_activeBatchTarget === null || _activeBatchTarget.deref() === undefined) {
      _activeBatchTarget = new WeakRef(containerOrScope);
    }
  }

  if (system !== undefined) {
    system.startBatch();
  } else {
    startBatch();
  }

  const result = tryCatch(fn, cause => BatchExecutionFailed({ cause }));

  if (system !== undefined) {
    system.endBatch();
  } else {
    endBatch();
  }

  if (containerOrScope !== null) {
    const depth = _batchDepths.get(containerOrScope) ?? 1;
    if (depth <= 1) {
      _batchDepths.delete(containerOrScope);
    } else {
      _batchDepths.set(containerOrScope, depth - 1);
    }

    // Clear outermost batch target if this was it and depth is now 0
    if (_activeBatchTarget !== null) {
      const ref = _activeBatchTarget.deref();
      if (ref === containerOrScope && (_batchDepths.get(containerOrScope) ?? 0) === 0) {
        _activeBatchTarget = null;
      }
    }
  }

  return result;
}

// =============================================================================
// Query Utilities
// =============================================================================

/**
 * Returns `true` if the given target is currently inside a `batch()` call.
 *
 * @param target - The container or scope object to check.
 */
export function isInBatch(target: object): boolean {
  return (_batchDepths.get(target) ?? 0) > 0;
}

/**
 * Returns the current batch nesting depth for the given target.
 *
 * Returns `0` when the target is not inside any batch.
 *
 * @param target - The container or scope object to check.
 */
export function getBatchDepth(target: object): number {
  return _batchDepths.get(target) ?? 0;
}

/**
 * Returns the set of targets currently in a batch.
 *
 * Useful for debugging and introspection. Since the internal tracking uses
 * a `WeakMap`, this function requires the caller to pass candidate targets
 * to check against.
 *
 * @param candidates - The targets to check for active batch membership.
 * @returns The subset of candidates that are currently inside a batch.
 */
export function batchTargets(candidates: readonly object[]): ReadonlySet<object> {
  const result = new Set<object>();
  for (const candidate of candidates) {
    if ((_batchDepths.get(candidate) ?? 0) > 0) {
      result.add(candidate);
    }
  }
  return result;
}
