/**
 * useSelector Hook
 *
 * React hook for deriving values from FlowService state/context.
 * Uses useSyncExternalStore with memoization and configurable equality.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import { usePort, type Port, type InferService } from "@hex-di/react";
import type { FlowService } from "@hex-di/flow";
import { shallowEqual } from "./shallow-equal.js";

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Extracts the state type from a FlowService.
 * @internal
 */
type ExtractState<F> = F extends FlowService<infer S, infer _E, infer _C> ? S : never;

/**
 * Extracts the context type from a FlowService.
 * @internal
 */
type ExtractContext<F> = F extends FlowService<infer _S, infer _E, infer C> ? C : never;

// =============================================================================
// Equality Function Type
// =============================================================================

/**
 * Function type for comparing two values for equality.
 *
 * @typeParam T - The type of values to compare
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

// =============================================================================
// useSelector Hook
// =============================================================================

/**
 * React hook for deriving values from FlowService state and context.
 *
 * This hook:
 * - Resolves the FlowService from the nearest container/scope via usePort
 * - Applies a selector function to derive a value from state and context
 * - Uses shallow equality by default to prevent unnecessary re-renders
 * - Supports custom equality functions
 * - Uses useSyncExternalStore for React 18 concurrent mode compatibility
 *
 * @typeParam P - The Port type providing a FlowService
 * @typeParam TSelected - The type of the derived value
 *
 * @param port - The port token for the FlowService to resolve
 * @param selector - Function that derives a value from state and context
 * @param equals - Optional equality function (default: shallow equality)
 * @returns The derived value
 *
 * @remarks
 * - The selector is called on every snapshot change
 * - The equality function determines if a re-render is needed
 * - Shallow equality compares object properties and array elements
 * - For primitive selections, strict equality works well
 *
 * @example Basic usage
 * ```tsx
 * import { useSelector } from '@hex-di/flow-react';
 * import { FormFlowPort } from './ports';
 *
 * function FormStatus() {
 *   const isSubmitting = useSelector(
 *     FormFlowPort,
 *     (state) => state === 'submitting'
 *   );
 *
 *   return <div>{isSubmitting ? 'Submitting...' : 'Ready'}</div>;
 * }
 * ```
 *
 * @example With context access
 * ```tsx
 * function FormErrors() {
 *   const errors = useSelector(
 *     FormFlowPort,
 *     (_state, context) => context.validationErrors
 *   );
 *
 *   return (
 *     <ul>
 *       {errors.map(e => <li key={e.field}>{e.message}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example Custom equality function
 * ```tsx
 * function FormFieldCount() {
 *   const fieldCount = useSelector(
 *     FormFlowPort,
 *     (_state, context) => context.fields.length,
 *     (a, b) => a === b // strict equality for numbers
 *   );
 *
 *   return <div>Fields: {fieldCount}</div>;
 * }
 * ```
 */
export function useSelector<
  P extends Port<FlowService<string, string, unknown>, string>,
  TSelected,
>(
  port: P,
  selector: (
    state: ExtractState<InferService<P>>,
    context: ExtractContext<InferService<P>>
  ) => TSelected,
  equals: EqualityFn<TSelected> = shallowEqual
): TSelected {
  // Resolve the FlowService from the container
  const flowService = usePort(port) as FlowService<
    ExtractState<InferService<P>>,
    string,
    ExtractContext<InferService<P>>
  >;

  // Track the last selected value for equality comparison
  const lastSelectedRef = useRef<{ value: TSelected; hasValue: boolean }>({
    value: undefined as TSelected,
    hasValue: false,
  });

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return flowService.subscribe(onStoreChange);
    },
    [flowService]
  );

  // Get snapshot function that returns the selected value
  // This function is called by useSyncExternalStore to get the current value
  const getSnapshot = useCallback((): TSelected => {
    const snapshot = flowService.snapshot();
    const newSelected = selector(snapshot.state, snapshot.context);

    // If we have a previous value, check equality
    if (lastSelectedRef.current.hasValue) {
      if (equals(lastSelectedRef.current.value, newSelected)) {
        // Return the cached value to maintain referential stability
        return lastSelectedRef.current.value;
      }
    }

    // Update the cached value
    lastSelectedRef.current = { value: newSelected, hasValue: true };
    return newSelected;
  }, [flowService, selector, equals]);

  // Use useSyncExternalStore for concurrent mode safety
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
