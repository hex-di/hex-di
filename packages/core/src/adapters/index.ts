/**
 * Adapters Module
 *
 * Provides the adapter system for implementing ports with concrete services.
 *
 * @packageDocumentation
 */

// Types
export type {
  Adapter,
  AdapterConstraint,
  FactoryKind,
  Lifetime,
  ResolvedDeps,
  PortDeps,
  EmptyDeps,
} from "./types.js";

// Inference types
export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferAdapterLifetime,
  InferClonable,
  IsClonableAdapter,
  InferFreeze,
  DebugInferAdapterProvides,
  DebugInferAdapterRequires,
  DebugInferAdapterLifetime,
  DebugInferManyProvides,
  DebugInferManyRequires,
} from "./inference.js";

// Constants
export {
  SYNC,
  ASYNC,
  SINGLETON,
  SCOPED,
  TRANSIENT,
  TRUE,
  FALSE,
  EMPTY_REQUIRES,
} from "./constants.js";

export type {
  Sync,
  Async,
  Singleton,
  Scoped,
  Transient,
  True,
  False,
  EmptyRequires,
} from "./constants.js";

// Factory functions
export {
  createAdapter,
  createAdapter as createUnifiedAdapter,
  type PortsToServices,
} from "./unified.js";

// Unified adapter types
export type {
  BaseUnifiedConfig,
  FactoryConfig,
  ClassConfig,
  BothFactoryAndClassError,
  NeitherFactoryNorClassError,
  AsyncLifetimeError,
} from "./unified-types.js";

// Operation completeness types
export type {
  VerifyOperationCompleteness,
  MissingOperationsError,
  IsMissingOperationsError,
  UnwrapFactoryOk,
  AdapterWithCompletenessCheck,
} from "./completeness.js";

// Lazy port utilities
export type { LazyPort, IsLazyPort, UnwrapLazyPort } from "./lazy.js";
export { lazyPort, getOriginalPort, isLazyPort } from "./lazy.js";

// Type guards
export { isAdapter, isLifetime, isFactoryKind, getAdapterFreezeConfig } from "./guards.js";

// Adapter lifecycle types
export type {
  AdapterLifecycleState,
  StateGuardedMethod,
  ValidTransition,
  CanTransition,
  AdapterHandle,
} from "./lifecycle.js";

// Adapter handle runtime implementation
export { createAdapterHandle, assertTransition, InvalidTransitionError } from "./handle.js";
export type { AdapterHandleConfig } from "./handle.js";
