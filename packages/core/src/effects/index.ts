/**
 * Effect-Capability Unification
 *
 * Type-level encoding of the duality between error channels (effects)
 * and capabilities. A service's error type IS its capability profile.
 *
 * @packageDocumentation
 */

export type {
  CapabilityError,
  MakeCapabilityError,
  CapabilitiesExercised,
  ErrorsByCapability,
  ExercisesCapability,
  IsPureComputation,
  CapabilityProfile,
  VerifyCapabilityUsage,
} from "./types.js";

export type { CapabilityProfileEntry } from "./analysis.js";
export { analyzeCapabilityProfile, verifyCapabilityUsage } from "./analysis.js";
