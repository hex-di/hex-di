/**
 * Compile-Time Error Types for @hex-di/graph.
 *
 * This module re-exports all error-related types and utilities from their
 * focused submodules.
 *
 * ## Module Structure
 *
 * | File                | Contents                                              |
 * |---------------------|-------------------------------------------------------|
 * | `error-messages`    | Template literal error types, port name extraction    |
 * | `error-aggregation` | FilterNever, JoinErrors, MultiErrorMessage            |
 * | `error-parsing`     | Runtime error parsing, error codes, utilities         |
 *
 * ## Error Message Types
 *
 * The module provides two categories of error types:
 *
 * ### 1. Branded Error Objects (Legacy)
 *
 * Types like `MissingDependencyError` and `DuplicateProviderError` return
 * object types with branded properties (`__valid`, `__errorBrand`, etc.).
 * These are useful for programmatic type narrowing but produce verbose
 * TypeScript error messages.
 *
 * ### 2. Template Literal Error Messages (Preferred)
 *
 * Types like `DuplicateErrorMessage` and `CircularErrorMessage` return
 * plain string literals. When the return type of a method is a string
 * like `"ERROR: Circular dependency: A -> B -> A"`, the IDE displays
 * this message directly on hover, making debugging much easier.
 *
 * ## AI ROUTING
 *
 * - **Error message format**: See `error-messages.ts`
 * - **Multi-error handling**: See `error-aggregation.ts`
 * - **Runtime error parsing**: See `error-parsing.ts`
 *
 * @packageDocumentation
 */

// Re-export template literal error messages and port name utilities
export type {
  ExtractPortNames,
  JoinPortNames,
  MissingDependencyError,
  DuplicateProviderError,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  ReverseCaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
  SelfDependencyErrorMessage,
  DepthLimitWarning,
  DepthLimitError,
  DepthLimitExceededMarker,
  OverrideWithoutParentErrorMessage,
  InvalidLifetimeErrorMessage,
  MalformedAdapterErrorMessage,
  HandleForwardCaptiveResult,
  HandleReverseCaptiveResult,
} from "./error-messages.js";

// Re-export multi-error aggregation types
export type { FilterNever, JoinErrors, MultiErrorMessage } from "./error-aggregation.js";

// Note: Runtime error parsing utilities (isGraphError, parseGraphError) are in
// src/validation/error-parsing.ts - not in types/ since they have runtime code.
