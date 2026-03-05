/**
 * Blame-aware error context types.
 *
 * Every container error can include a `BlameContext` identifying which adapter
 * violated which contract, the violation type, and the full resolution path.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/06-blame-aware-errors | BEH-CO-06}
 * @see {@link https://hex-di.dev/spec/core/decisions/002-blame-context-model | ADR-CO-002}
 *
 * @packageDocumentation
 */

import type { PortDirection } from "../ports/types.js";

// =============================================================================
// BlameViolationType — Discriminated Union
// =============================================================================

/**
 * Discriminated union classifying the type of contract violation.
 *
 * Each variant has a unique `_tag` for pattern matching via `switch`.
 */
export type BlameViolationType =
  | { readonly _tag: "FactoryError"; readonly error: unknown }
  | { readonly _tag: "LifetimeViolation"; readonly expected: string; readonly actual: string }
  | { readonly _tag: "MissingDependency"; readonly missingPort: string }
  | { readonly _tag: "DisposalError"; readonly error: unknown }
  | { readonly _tag: "ContractViolation"; readonly details: string };

// =============================================================================
// BlameContext
// =============================================================================

/**
 * Structured attribution information for container errors.
 *
 * Identifies which adapter violated which port contract,
 * the type of violation, and the full resolution path.
 */
export interface BlameContext {
  /** The adapter factory that violated the contract. */
  readonly adapterFactory: {
    readonly name: string;
    readonly sourceLocation?: string;
  };
  /** The port whose contract was violated. */
  readonly portContract: {
    readonly name: string;
    readonly direction: PortDirection;
  };
  /** Classification of the violation. */
  readonly violationType: BlameViolationType;
  /** Resolution path from initial resolve() to failure point. */
  readonly resolutionPath: ReadonlyArray<string>;
}

// =============================================================================
// Factory Helper
// =============================================================================

/**
 * Creates a frozen `BlameContext` instance.
 *
 * Deep-freezes the blame context including nested objects.
 *
 * @param context - The blame context data
 * @returns A deeply frozen `BlameContext`
 */
export function createBlameContext(context: BlameContext): BlameContext {
  return Object.freeze({
    adapterFactory: Object.freeze({ ...context.adapterFactory }),
    portContract: Object.freeze({ ...context.portContract }),
    violationType: Object.freeze({ ...context.violationType }),
    resolutionPath: Object.freeze([...context.resolutionPath]),
  });
}
