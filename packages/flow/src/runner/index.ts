/**
 * Runner Module - Machine Runner and Interpreter
 *
 * This module provides the runtime components for executing state machines:
 * - MachineRunner: Interface for running and interacting with machines
 * - MachineSnapshot: Immutable snapshot of machine state
 * - EffectExecutor: Interface for executing effect descriptors
 * - Interpreter: Pure transition logic
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Snapshot
  MachineSnapshot,

  // Runner interface
  MachineRunner,
  MachineRunnerAny,

  // Executor interface
  EffectExecutor,
} from "./types.js";

// =============================================================================
// Interpreter
// =============================================================================

export { transition, type TransitionResult } from "./interpreter.js";

// =============================================================================
// Executor
// =============================================================================

export { createBasicExecutor } from "./executor.js";

// =============================================================================
// Factory
// =============================================================================

export { createMachineRunner, type MachineRunnerOptions } from "./create-runner.js";
