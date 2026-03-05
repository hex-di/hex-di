/**
 * Protocol State Machines Module
 *
 * Exports all protocol-related types, factories, and utilities.
 *
 * @packageDocumentation
 */

// Types
export type {
  ProtocolPort,
  TransitionMap,
  Transition,
  AvailableMethods,
  ProtocolError,
  ProtocolMethod,
  ProtocolSpec,
  ValidateTransitionMap,
  IsValidProtocol,
} from "./types.js";

// Factory
export {
  defineProtocol,
  InvalidProtocolError,
  isMethodAvailable,
  getNextState,
  getAvailableMethodNames,
} from "./factory.js";
export type { DefineProtocolConfig } from "./factory.js";
