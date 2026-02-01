/**
 * Utility exports for @hex-di/core.
 *
 * @packageDocumentation
 */

export type {
  IsNever,
  TupleToUnion,
  Prettify,
  InferenceError,
  IsInferenceError,
  IsInvalidOrError,
} from "./type-utilities.js";

export { generateCorrelationId } from "./correlation.js";
