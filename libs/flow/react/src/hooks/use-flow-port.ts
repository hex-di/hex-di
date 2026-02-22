/**
 * useFlowPort Hook
 *
 * Internal helper that resolves a FlowService from the container
 * with proper typing. Centralizes the single unavoidable type gap
 * between usePort's return type and the specific FlowService generic.
 *
 * @packageDocumentation
 */

import { usePort, type Port } from "@hex-di/react";
import type { FlowService } from "@hex-di/flow";

/**
 * Resolves a FlowService from the container with proper generic typing.
 *
 * This centralizes the type recovery from usePort's `InferService<P>` to
 * the specific `FlowService<TState, TEvent, TContext>`. usePort returns the
 * correctly typed value at runtime, but TypeScript cannot evaluate
 * `InferService<Port<FlowService<S,E,C>, string>>` back to `FlowService<S,E,C>`.
 *
 * @internal
 */
export function useFlowPort<TState extends string, TEvent extends string, TContext>(
  port: Port<string, FlowService<TState, TEvent, TContext>>
): FlowService<TState, TEvent, TContext> {
  return usePort(port);
}
