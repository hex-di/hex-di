/**
 * Override result types for GraphBuilder.
 *
 * This module contains all compile-time validation types for the override() method.
 *
 * @packageDocumentation
 */

import type { AdapterAny, InferAdapterProvides } from "../adapter/index.js";
import type { ProvideResult } from "./provide-types.js";
import type { AnyBuilderInternals, GetParentProvides } from "./internals.js";
import type { JoinPortNames } from "../validation/index.js";

// =============================================================================
// Override Validation Types
// =============================================================================

/**
 * Error message for override validation when port doesn't exist in parent.
 *
 * This is the basic version without available ports listing.
 *
 * @typeParam TPortName - The port name that was attempted to be overridden
 * @internal
 */
export type InvalidOverrideErrorMessage<TPortName extends string> =
  `ERROR[HEX006]: Cannot override '${TPortName}' - port not provided by parent graph. Fix: Use .provide() to add new ports, or ensure parent provides '${TPortName}'.`;

/**
 * Enhanced error message for override validation that includes available parent ports.
 *
 * This provides more actionable feedback by showing what ports ARE available
 * for override in the parent graph.
 *
 * @typeParam TPortName - The port name that was attempted to be overridden
 * @typeParam TAvailablePorts - Union of ports that ARE available in the parent
 *
 * @example
 * ```
 * "ERROR[HEX006]: Cannot override 'Cache' - not in parent. Available: Logger, Database, UserService. Fix: Use .provide() for new ports."
 * ```
 *
 * @internal
 */
export type InvalidOverrideErrorWithAvailable<TPortName extends string, TAvailablePorts> =
  JoinPortNames<TAvailablePorts> extends infer TJoined extends string
    ? TJoined extends ""
      ? `ERROR[HEX006]: Cannot override '${TPortName}' - parent graph has no ports. Fix: Use .provide() to add new ports.`
      : `ERROR[HEX006]: Cannot override '${TPortName}' - not in parent. Available: ${TJoined}. Fix: Use .provide() for new ports.`
    : InvalidOverrideErrorMessage<TPortName>;

/**
 * Extracts port names from a union of Port types.
 * Used for parent provides validation.
 * @internal
 */
type ExtractPortNamesFromUnion<T> = T extends { readonly __portName: infer N } ? N : never;

/**
 * Checks if a type is exactly `unknown`.
 *
 * Uses bidirectional assignability check: T is unknown iff
 * [T] extends [unknown] AND [unknown] extends [T].
 *
 * @internal
 */
type IsExactlyUnknown<T> = [T] extends [unknown] ? ([unknown] extends [T] ? true : false) : false;

/**
 * The return type of `GraphBuilder.override()` with parent validation.
 *
 * When TParentProvides is `unknown` (no parent specified), this behaves like
 * the standard ProvideResult but tracks the adapter as an override.
 *
 * When TParentProvides is a Port union (parent specified via forParent()),
 * this validates that the adapter's port exists in the parent before allowing
 * the override.
 *
 * @typeParam TProvides - Current union of provided ports
 * @typeParam TRequires - Current union of required ports
 * @typeParam TAsyncPorts - Current union of async ports
 * @typeParam TOverrides - Current union of override ports
 * @typeParam TInternalState - Grouped internal parameters (contains parent provides, dep graph, etc.)
 * @typeParam TAdapter - The adapter being added as an override
 *
 * @internal
 */
export type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterAny,
> =
  // If no parent specified (TParentProvides is exactly unknown), allow any override
  IsExactlyUnknown<GetParentProvides<TInternalState>> extends true
    ? ProvideResult<
        TProvides,
        TRequires,
        TAsyncPorts,
        TOverrides | InferAdapterProvides<TAdapter>,
        TInternalState,
        TAdapter
      >
    : // Parent specified - validate that the adapter's port exists in parent
      ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> extends ExtractPortNamesFromUnion<
          GetParentProvides<TInternalState>
        >
      ? ProvideResult<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides | InferAdapterProvides<TAdapter>,
          TInternalState,
          TAdapter
        >
      : InvalidOverrideErrorWithAvailable<
          ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> & string,
          GetParentProvides<TInternalState>
        >;
