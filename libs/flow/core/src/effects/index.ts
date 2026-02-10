/**
 * Effects Module - Effect Descriptors and Constructors
 *
 * This module provides the effect system for the state machine:
 * - Effect types (InvokeEffect, SpawnEffect, EmitEffect, etc.)
 * - Effect constructors (Effect.invoke, Effect.spawn, etc.)
 * - Port method extraction utilities (MethodNames, MethodParams, MethodReturn)
 *
 * @packageDocumentation
 */

// =============================================================================
// Effect Types
// =============================================================================

export type {
  // Port method extraction utilities
  MethodNames,
  MethodParams,
  MethodReturn,

  // Effect descriptors
  InvokeEffect,
  SpawnEffect,
  StopEffect,
  EmitEffect,
  DelayEffect,
  ParallelEffect,
  SequenceEffect,
  NoneEffect,
  ChooseBranch,
  ChooseEffect,
  LogEffect,

  // Universal constraint type
  EffectAny,

  // Activity port structural type
  ActivityPortLike,
} from "./types.js";

// =============================================================================
// Effect Constructors
// =============================================================================

export { Effect } from "./constructors.js";
