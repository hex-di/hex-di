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

  // StateValue
  StateValue,

  // PendingEvent
  PendingEvent,

  // History types
  TransitionHistoryEntry,
  EffectExecutionEntry,
  HistoryConfig,

  // Runner interface
  MachineRunner,
  MachineRunnerAny,

  // Executor interface
  EffectExecutor,
} from "./types.js";

export { ResultAsync } from "./types.js";

// =============================================================================
// Interpreter
// =============================================================================

export {
  transition,
  transitionSafe,
  computeInitialPath,
  canTransition,
  computeInitialPathWithParallel,
  computeParallelRegionPaths,
  transitionParallelSafe,
  canTransitionParallel,
  collectParallelEntryEffects,
  collectRegionEntryEffects,
  collectParallelExitEffects,
  isParallelState,
  findParallelDepth,
  type TransitionResult,
  type ParallelRegionPaths,
  type ParallelTransitionResult,
  type HistoryMap,
} from "./interpreter.js";

// =============================================================================
// Executor
// =============================================================================

export { createBasicExecutor } from "./executor.js";

// =============================================================================
// Factory
// =============================================================================

export { createMachineRunner, type MachineRunnerOptions } from "./create-runner.js";
