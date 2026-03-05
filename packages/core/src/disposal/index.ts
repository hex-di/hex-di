/**
 * Formal disposal ordering module.
 *
 * @packageDocumentation
 */

export type {
  DisposalPhaseEntry,
  DisposalPhase,
  DisposalPlan,
  DisposalErrorEntry,
  DisposalResult,
  DependencyEntry,
} from "./types.js";

export { computeDisposalPlan, DisposalCycleInvariantError } from "./compute-plan.js";
export { executeDisposalPlan } from "./execute-plan.js";
