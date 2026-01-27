/**
 * @hex-di/graph/adapters - Adapter Creation Utilities
 *
 * This module exports all adapter creation functions and types.
 * Use this when you only need to create adapters without building graphs.
 *
 * @packageDocumentation
 */

// =============================================================================
// Adapter Factory Functions
// =============================================================================

export { createAdapter, createAsyncAdapter } from "./adapter/factory.js";
export { defineService, defineAsyncService, createClassAdapter } from "./adapter/service.js";

// =============================================================================
// Lazy Port Support
// =============================================================================

export { lazyPort, isLazyPort } from "./adapter/lazy.js";
export type { LazyPort } from "./adapter/lazy.js";

// =============================================================================
// Type Guards
// =============================================================================

export { isLifetime, isFactoryKind, isAdapter } from "./adapter/guards.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  Adapter,
  AdapterConstraint,
  Lifetime,
  FactoryKind,
  ResolvedDeps,
} from "./adapter/types/adapter-types.js";

// =============================================================================
// Adapter Inference Types
// =============================================================================

export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferClonable,
  IsClonableAdapter,
} from "./adapter/types/adapter-inference.js";
