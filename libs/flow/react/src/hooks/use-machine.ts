/**
 * useMachine Hook
 *
 * React hook for consuming a FlowService from the container.
 * Uses useSyncExternalStore for React 18 concurrent mode compatibility.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { usePort, type Port, type InferService } from "@hex-di/react";
import type { FlowService, MachineSnapshot, ActivityInstance } from "@hex-di/flow";

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Extracts the state type from a FlowService.
 * @internal
 */
type ExtractState<F> = F extends FlowService<infer S, infer _E, infer _C> ? S : never;

/**
 * Extracts the event type from a FlowService.
 * @internal
 */
type ExtractEvent<F> = F extends FlowService<infer _S, infer E, infer _C> ? E : never;

/**
 * Extracts the context type from a FlowService.
 * @internal
 */
type ExtractContext<F> = F extends FlowService<infer _S, infer _E, infer C> ? C : never;

// =============================================================================
// useMachine Hook Result
// =============================================================================

/**
 * Result type for the useMachine hook.
 *
 * @typeParam TState - The state name type
 * @typeParam TEvent - The event type name
 * @typeParam TContext - The context type
 */
export interface UseMachineResult<TState extends string, TEvent extends string, TContext> {
  /**
   * The current state name.
   */
  readonly state: TState;

  /**
   * The current context value.
   */
  readonly context: TContext;

  /**
   * Function to send an event to the machine.
   * This calls sendAndExecute on the FlowService.
   */
  readonly send: (event: { readonly type: TEvent }) => Promise<void>;

  /**
   * All activity instances tracked by the machine.
   */
  readonly activities: readonly ActivityInstance[];
}

// =============================================================================
// useMachine Hook
// =============================================================================

/**
 * React hook for consuming a FlowService state machine from the container.
 *
 * This hook:
 * - Resolves the FlowService from the nearest container/scope via usePort
 * - Subscribes to state changes using useSyncExternalStore for React 18 compatibility
 * - Returns current state, context, send function, and activities
 * - Automatically unsubscribes on unmount
 *
 * @typeParam P - The Port type providing a FlowService
 *
 * @param port - The port token for the FlowService to resolve
 * @returns An object containing state, context, send function, and activities
 *
 * @remarks
 * - The hook uses useSyncExternalStore for concurrent mode safety
 * - The send function calls sendAndExecute (executes effects)
 * - React does not own machine lifecycle - scopes do
 * - Unmounting only unsubscribes from the runner
 *
 * @example
 * ```tsx
 * import { useMachine } from '@hex-di/flow-react';
 * import { ModalFlowPort } from './ports';
 *
 * function Modal() {
 *   const { state, context, send, activities } = useMachine(ModalFlowPort);
 *
 *   if (state === 'closed') {
 *     return <button onClick={() => send({ type: 'OPEN' })}>Open</button>;
 *   }
 *
 *   return (
 *     <div className="modal">
 *       <p>{context.message}</p>
 *       <button onClick={() => send({ type: 'CLOSE' })}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMachine<P extends Port<FlowService<string, string, unknown>, string>>(
  port: P
): UseMachineResult<
  ExtractState<InferService<P>>,
  ExtractEvent<InferService<P>>,
  ExtractContext<InferService<P>>
> {
  // Resolve the FlowService from the container
  const flowService = usePort(port) as FlowService<
    ExtractState<InferService<P>>,
    ExtractEvent<InferService<P>>,
    ExtractContext<InferService<P>>
  >;

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return flowService.subscribe(onStoreChange);
    },
    [flowService]
  );

  // Get snapshot function for useSyncExternalStore
  const getSnapshot = useCallback((): MachineSnapshot<
    ExtractState<InferService<P>>,
    ExtractContext<InferService<P>>
  > => {
    return flowService.snapshot();
  }, [flowService]);

  // Use useSyncExternalStore for concurrent mode safety
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Create stable send function that calls sendAndExecute
  const send = useCallback(
    (event: { readonly type: ExtractEvent<InferService<P>> }): Promise<void> => {
      return flowService.sendAndExecute(event);
    },
    [flowService]
  );

  // Return memoized result object
  return useMemo(
    () => ({
      state: snapshot.state,
      context: snapshot.context,
      send,
      activities: snapshot.activities,
    }),
    [snapshot.state, snapshot.context, send, snapshot.activities]
  );
}
