/**
 * Errors Module
 *
 * @packageDocumentation
 */

export {
  DisposedStateAccess,
  DerivedComputationFailed,
  AsyncDerivedExhausted,
  CircularDerivedDependency,
  BatchExecutionFailed,
  WaitForStateTimeout,
  InvalidComputedGetter,
  EffectFailedError,
  AsyncDerivedSelectError,
  HydrationError,
  EffectAdapterError,
  EffectErrorHandlerError,
  type StoreError,
  type StoreProgrammingError,
} from "./tagged-errors.js";
