/**
 * Central re-exports for all runtime type definitions.
 *
 * This module re-exports all types from the types/ subdirectory,
 * providing a single import point for type consumers.
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbols (value exports)
// =============================================================================

export { ContainerBrand, ScopeBrand } from "./brands.js";

// =============================================================================
// Container and Scope Types
// =============================================================================

export type { Container, ContainerMembers } from "./container.js";
export type { Scope, ScopeMembers } from "./scope.js";
export type { LazyContainer } from "./lazy-container.js";

// =============================================================================
// Options and Configuration Types
// =============================================================================

export type {
  ContainerPhase,
  ContainerKind,
  ContainerDevToolsOptions,
  CreateContainerOptions,
  CreateContainerConfig,
  CreateChildOptions,
  RuntimePerformanceOptions,
} from "./options.js";

// =============================================================================
// Inheritance Mode Types
// =============================================================================

export type {
  InheritanceMode,
  InheritanceModeMap,
  InheritanceModeConfig,
  ExtractPortNames,
} from "./inheritance.js";

// =============================================================================
// Type Inference Utilities
// =============================================================================

export type {
  InferContainerProvides,
  InferContainerEffectiveProvides,
  InferScopeProvides,
  IsResolvable,
  ServiceFromContainer,
  IsRootContainer,
  IsChildContainer,
} from "./inference.js";

// =============================================================================
// Override Builder Types
// =============================================================================

export type {
  ValidateOverrideAdapter,
  ValidateAdapterDependencies,
  OverrideBuilderState,
} from "./override-types.js";

export type { PortNotInGraphError, MissingDependenciesError } from "./validation-errors.js";
