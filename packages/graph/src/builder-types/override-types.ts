/**
 * Override result types for GraphBuilder.
 *
 * This module contains all compile-time validation types for the override() method.
 *
 * @packageDocumentation
 */

import type { AdapterAny, InferAdapterProvides } from "../adapter/index.js";
import type { ProvideResult } from "./provide-types.js";
import type { DefaultMaxDepth } from "../validation/index.js";

// =============================================================================
// Override Validation Types
// =============================================================================

/**
 * Error message for override validation when port doesn't exist in parent.
 *
 * @typeParam TPortName - The port name that was attempted to be overridden
 * @internal
 */
export type InvalidOverrideErrorMessage<TPortName extends string> =
  `ERROR: Cannot override '${TPortName}' - port not provided by parent graph. Fix: Use .provide() to add new ports, or ensure parent provides '${TPortName}'.`;

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
 * @internal
 */
export type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TParentProvides,
  TAdapter extends AdapterAny,
  TParentProvidesToPass = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // If no parent specified (TParentProvides is exactly unknown), allow any override
  IsExactlyUnknown<TParentProvides> extends true
    ? ProvideResult<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides | InferAdapterProvides<TAdapter>,
        TAdapter,
        TParentProvidesToPass,
        TMaxDepth
      >
    : // Parent specified - validate that the adapter's port exists in parent
      ExtractPortNamesFromUnion<
          InferAdapterProvides<TAdapter>
        > extends ExtractPortNamesFromUnion<TParentProvides>
      ? ProvideResult<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides | InferAdapterProvides<TAdapter>,
          TAdapter,
          TParentProvides,
          TMaxDepth
        >
      : InvalidOverrideErrorMessage<
          ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> & string
        >;
