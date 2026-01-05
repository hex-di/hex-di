/**
 * useSend Hook
 *
 * React hook that returns a stable send function for a FlowService.
 * Useful for passing to child components without causing re-renders.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { usePort, type Port, type InferService } from "@hex-di/react";
import type { FlowService } from "@hex-di/flow";

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Extracts the event type from a FlowService.
 * @internal
 */
type ExtractEvent<F> = F extends FlowService<infer _S, infer E, infer _C> ? E : never;

// =============================================================================
// useSend Hook
// =============================================================================

/**
 * React hook that returns a stable send function for a FlowService.
 *
 * Unlike useMachine, this hook only returns the send function and does not
 * subscribe to state changes. This means:
 * - The returned function reference is stable across re-renders
 * - Components using only useSend won't re-render on state changes
 * - Ideal for passing send to child components via props
 *
 * @typeParam P - The Port type providing a FlowService
 *
 * @param port - The port token for the FlowService to resolve
 * @returns A stable send function that calls sendAndExecute on the FlowService
 *
 * @remarks
 * - The send function calls sendAndExecute (executes effects)
 * - The returned function reference is stable (same between renders)
 * - Does NOT subscribe to state changes - use useMachine or useSelector for that
 *
 * @example Basic usage
 * ```tsx
 * import { useSend } from '@hex-di/flow-react';
 * import { ModalFlowPort } from './ports';
 *
 * function CloseButton() {
 *   const send = useSend(ModalFlowPort);
 *
 *   return (
 *     <button onClick={() => send({ type: 'CLOSE' })}>
 *       Close
 *     </button>
 *   );
 * }
 * ```
 *
 * @example Passing to child components
 * ```tsx
 * import { useMachine, useSend } from '@hex-di/flow-react';
 * import { FormFlowPort } from './ports';
 *
 * function Form() {
 *   const { state, context } = useMachine(FormFlowPort);
 *   const send = useSend(FormFlowPort);
 *
 *   return (
 *     <form>
 *       <FormFields
 *         fields={context.fields}
 *         disabled={state === 'submitting'}
 *       />
 *       {/* SubmitButton won't re-render when state changes *\/}
 *       <SubmitButton onSubmit={() => send({ type: 'SUBMIT' })} />
 *     </form>
 *   );
 * }
 *
 * // This component receives a stable callback, avoiding re-renders
 * function SubmitButton({ onSubmit }: { onSubmit: () => void }) {
 *   return <button onClick={onSubmit}>Submit</button>;
 * }
 * ```
 */
export function useSend<P extends Port<FlowService<string, string, unknown>, string>>(
  port: P
): (event: { readonly type: ExtractEvent<InferService<P>> }) => Promise<void> {
  // Resolve the FlowService from the container
  const flowService = usePort(port) as FlowService<string, ExtractEvent<InferService<P>>, unknown>;

  // Create stable send function using useCallback
  // The flowService reference is stable (same instance from container),
  // so this callback reference will also be stable
  const send = useCallback(
    (event: { readonly type: ExtractEvent<InferService<P>> }): Promise<void> => {
      return flowService.sendAndExecute(event);
    },
    [flowService]
  );

  return send;
}
