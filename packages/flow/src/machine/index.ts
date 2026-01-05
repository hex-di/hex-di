/**
 * Machine Module - State, Event, and Machine Types
 *
 * This module provides the core type system for the state machine:
 * - Branded State types with conditional context
 * - Branded Event types with conditional payload
 * - Machine configuration types
 * - Type inference utilities
 * - Factory functions for creating states, events, and machines
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbols (Type-Level Only)
// =============================================================================

export type { StateBrandSymbol, EventBrandSymbol, MachineBrandSymbol } from "./brands.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Utility types
  DeepReadonly,

  // State types
  State,
  StateAny,

  // Event types
  Event,
  EventAny,

  // Machine types
  Machine,
  MachineAny,

  // State inference utilities
  InferStateName,
  InferStateContext,

  // Event inference utilities
  InferEventName,
  InferEventPayload,
  StateUnion,
  EventUnion,

  // Machine inference utilities
  InferMachineStateNames,
  InferMachineEventNames,
  InferMachineContextType,
} from "./types.js";

// =============================================================================
// Machine Configuration Types
// =============================================================================

export type {
  // Transition configuration
  TransitionConfig,
  TransitionConfigAny,
  TransitionConfigOrArray,
} from "./transition.js";

export type {
  // State node configuration
  StateNode,
  StateNodeAny,
  StateNodeTransitions,
} from "./state-node.js";

export type {
  // Machine configuration
  MachineConfig,
  MachineConfigAny,
  MachineStatesRecord,
} from "./config.js";

// =============================================================================
// Machine Factory and Inference
// =============================================================================

export {
  createMachine,
  type InferMachineState,
  type InferMachineEvent,
  type InferMachineContext,
} from "./create-machine.js";

// =============================================================================
// Factory Functions
// =============================================================================

export { state, event } from "./factories.js";
