/**
 * FlowService Port Factory
 *
 * This module provides factory functions for creating Port tokens
 * that reference FlowService instances.
 *
 * @packageDocumentation
 */

import { createPort, type Port } from "@hex-di/core";
import type { FlowService } from "./types.js";

// =============================================================================
// FlowService Port Type
// =============================================================================

/**
 * A Port type that provides a FlowService.
 *
 * This is a convenience type alias for ports that resolve to FlowService instances.
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TEvent - The event type name (union of event type names)
 * @typeParam TContext - The context type
 * @typeParam TName - The port name literal type
 */
export type FlowPort<
  TState extends string,
  TEvent extends string,
  TContext,
  TName extends string = string,
> = Port<FlowService<TState, TEvent, TContext>, TName>;

// =============================================================================
// FlowService Port Factory
// =============================================================================

/**
 * Creates a typed Port token for a FlowService.
 *
 * This factory creates a Port that will resolve to a FlowService instance
 * when requested from a HexDI container scope.
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TEvent - The event type name (union of event type names)
 * @typeParam TContext - The context type
 * @typeParam TName - The port name literal type (inferred from the name argument)
 *
 * @param name - The unique name for this port
 * @returns A Port token for the FlowService
 *
 * @remarks
 * The port name should be unique within your application. A common convention
 * is to use descriptive names like "ModalFlow", "FormWizardFlow", etc.
 *
 * @example
 * ```typescript
 * // Define the FlowService port with full type parameters
 * const ModalFlowPort = createFlowPort<
 *   'closed' | 'open' | 'closing',
 *   'OPEN' | 'CLOSE' | 'ANIMATION_END',
 *   { lastAction: string }
 * >('ModalFlow');
 *
 * // Use in container resolution
 * const scope = container.createScope();
 * const modalFlow = scope.resolve(ModalFlowPort);
 *
 * // The resolved FlowService has full type safety
 * modalFlow.send({ type: 'OPEN' }); // OK
 * modalFlow.send({ type: 'INVALID' }); // Type error!
 * ```
 *
 * @example With machine type inference
 * ```typescript
 * // If you have a machine definition
 * const modalMachine = createMachine({ ... });
 *
 * // You can use InferMachine* utilities for type parameters
 * const ModalFlowPort = createFlowPort<
 *   InferMachineStateNames<typeof modalMachine>,
 *   InferMachineEventNames<typeof modalMachine>,
 *   InferMachineContext<typeof modalMachine>
 * >('ModalFlow');
 * ```
 */
export function createFlowPort<
  TState extends string,
  TEvent extends string,
  TContext,
  const TName extends string = string,
>(name: TName): FlowPort<TState, TEvent, TContext, TName> {
  return createPort<TName, FlowService<TState, TEvent, TContext>>(name);
}
