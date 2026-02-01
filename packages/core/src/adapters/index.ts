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
export { createAdapter, createAsyncAdapter } from "./factory.js";

// Service helpers
export { defineService, defineAsyncService, createClassAdapter } from "./service.js";

// Fluent builder
export { ServiceBuilder } from "./builder.js";

// Lazy port utilities
export type { LazyPort, IsLazyPort, UnwrapLazyPort } from "./lazy.js";
export { lazyPort, getOriginalPort, isLazyPort } from "./lazy.js";

// Type guards
export { isAdapter, isLifetime, isFactoryKind } from "./guards.js";
