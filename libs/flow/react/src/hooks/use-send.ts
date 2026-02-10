/**
 * useSend Hook
 *
 * React hook that returns a stable send function for a FlowService.
 * Useful for passing to child components without causing re-renders.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import type { Port } from "@hex-di/react";
import type { FlowService, TransitionError, EffectExecutionError } from "@hex-di/flow";
import { ResultAsync } from "@hex-di/flow";
import { useFlowPort } from "./use-flow-port.js";

// =============================================================================
// useSend Hook
// =============================================================================

export function useSend<TState extends string, TEvent extends string, TContext>(
  port: Port<FlowService<TState, TEvent, TContext>, string>
): (event: { readonly type: TEvent }) => ResultAsync<void, TransitionError | EffectExecutionError> {
  const flowService = useFlowPort<TState, TEvent, TContext>(port);

  const send = useCallback(
    (event: { readonly type: TEvent }): ResultAsync<void, TransitionError | EffectExecutionError> =>
      flowService.sendAndExecute(event),
    [flowService]
  );

  return send;
}
