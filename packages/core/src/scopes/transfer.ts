/**
 * Explicit Scope Transfer — Cross-Scope Reference Re-Branding
 *
 * When a scoped reference must legitimately cross scope boundaries (e.g., passing
 * a database connection from a parent scope to a child scope), `transferRef`
 * re-brands the reference with the target scope identity.
 *
 * The three-argument signature (ref, source, target) makes cross-scope transfers
 * visible in code review. Inspired by Rust's explicit ownership transfer.
 *
 * Implements: BEH-CO-09-003
 *
 * @packageDocumentation
 */

import type { ScopedRef, ScopedContainer } from "./types.js";
import { ContainerError } from "../errors/base.js";

// =============================================================================
// TransferRecord
// =============================================================================

/**
 * Records a cross-scope reference transfer for disposal ordering.
 *
 * When scope A transfers a reference to scope B, the container must ensure
 * proper disposal ordering (B before A, or independent management).
 *
 * @typeParam TFrom - Source scope identity
 * @typeParam TTo - Target scope identity
 */
export interface TransferRecord<TFrom extends string = string, TTo extends string = string> {
  /** The source scope identity. */
  readonly fromScope: TFrom;

  /** The target scope identity. */
  readonly toScope: TTo;

  /** Timestamp when the transfer occurred. */
  readonly transferredAt: number;

  /** The port name of the transferred reference. */
  readonly portName: string;
}

// =============================================================================
// ScopeTransferError
// =============================================================================

/**
 * Error thrown when a scope transfer is attempted with an invalid scope state.
 *
 * This occurs when either the source or target scope is disposed at the time
 * of transfer.
 */
export class ScopeTransferError extends ContainerError {
  readonly _tag = "ScopeTransferError" as const;
  readonly code = "SCOPE_TRANSFER_FAILED" as const;
  readonly isProgrammingError = true as const;

  /** The source scope identity. */
  readonly fromScope: string;

  /** The target scope identity. */
  readonly toScope: string;

  /** Which scope was in an invalid state. */
  readonly invalidScope: "source" | "target";

  constructor(fromScope: string, toScope: string, invalidScope: "source" | "target") {
    const which = invalidScope === "source" ? "Source" : "Target";
    super(
      `Cannot transfer scoped reference: ${which} scope '${invalidScope === "source" ? fromScope : toScope}' is disposed. ` +
        `Both source and target scopes must be active for a transfer.`
    );
    this.fromScope = fromScope;
    this.toScope = toScope;
    this.invalidScope = invalidScope;
    Object.freeze(this);
  }
}

// =============================================================================
// TransferRefFn
// =============================================================================

/**
 * Type signature for the `transferRef` function.
 *
 * Re-brands a scoped reference from the source scope's identity to the target
 * scope's identity. At runtime, the underlying service instance is unchanged —
 * only the type-level brand is updated.
 *
 * @typeParam T - The service type
 * @typeParam TFrom - Source scope identity
 * @typeParam TTo - Target scope identity
 */
export type TransferRefFn = <T, TProvides, TFrom extends string, TTo extends string>(
  ref: ScopedRef<T, TFrom>,
  fromScope: ScopedContainer<TProvides, TFrom>,
  toScope: ScopedContainer<TProvides, TTo>
) => ScopedRef<T, TTo>;

// =============================================================================
// transferRef (runtime implementation)
// =============================================================================

/**
 * Re-brands a scoped reference from the source scope to the target scope.
 *
 * This is the escape hatch for the scope system. The three-argument signature
 * makes cross-scope transfers visible in code review.
 *
 * At runtime, the underlying service instance is returned unchanged — the brand
 * is a phantom type with no runtime representation.
 *
 * @param ref - The scoped reference to transfer
 * @param _fromScope - The source scope (used for type-level validation)
 * @param _toScope - The target scope (used for type-level validation)
 * @returns The same service instance branded with the target scope's identity
 *
 * @example
 * ```ts
 * const parentDb = parentScope.resolve(DBPort);
 * // Type: ScopedRef<Database, "parent">
 *
 * const childDb = transferRef(parentDb, parentScope, childScope);
 * // Type: ScopedRef<Database, "child">
 * ```
 */
export function transferRef<T, TProvides, TFrom extends string, TTo extends string>(
  ref: ScopedRef<T, TFrom>,
  _fromScope: ScopedContainer<TProvides, TFrom>,
  _toScope: ScopedContainer<TProvides, TTo>
): ScopedRef<T, TTo> {
  // At runtime, the brand is a phantom type — the underlying service instance is unchanged.
  // The type system enforces scope identity; at runtime we just pass through the value.
  // This uses the established pattern from handle.ts where phantom-branded objects
  // are constructed/returned with structural compatibility.
  return ref as unknown as ScopedRef<T, TTo>;
}

// =============================================================================
// createTransferRecord
// =============================================================================

/**
 * Creates a frozen transfer record for tracking cross-scope reference transfers.
 *
 * @param fromScope - The source scope identity
 * @param toScope - The target scope identity
 * @param portName - The port name of the transferred reference
 * @returns A frozen `TransferRecord`
 */
export function createTransferRecord<TFrom extends string, TTo extends string>(
  fromScope: TFrom,
  toScope: TTo,
  portName: string
): TransferRecord<TFrom, TTo> {
  return Object.freeze({
    fromScope,
    toScope,
    transferredAt: Date.now(),
    portName,
  });
}
