/**
 * Validation module - Compile-time graph validation utilities.
 *
 * This module re-exports types from src/types/validation/ for compile-time
 * validation of dependency graphs:
 *
 * - **Error types**: Branded error messages for duplicates, cycles, captive deps
 * - **Cycle detection**: Type-level cycle detection in dependency graphs
 * - **Captive detection**: Detection of lifetime scope violations
 * - **Lazy transforms**: Utilities for lazy port handling
 *
 * All validation happens at compile-time via TypeScript's type system.
 *
 * @packageDocumentation
 */
export * from "./types/index.js";
export { GraphErrorNumericCode, GraphErrorCode, isGraphError, parseGraphError, } from "./error-parsing.js";
export type { GraphErrorNumericCodeType, GraphErrorCodeType, ParsedGraphError, DuplicateAdapterDetails, CircularDependencyDetails, CaptiveDependencyDetails, ReverseCaptiveDependencyDetails, LifetimeInconsistencyDetails, SelfDependencyDetails, DepthLimitExceededDetails, MissingDependencyDetails, OverrideWithoutParentDetails, MissingProvidesDetails, InvalidProvidesDetails, InvalidRequiresTypeDetails, InvalidRequiresElementDetails, InvalidLifetimeTypeDetails, InvalidLifetimeValueDetails, InvalidFactoryDetails, DuplicateRequiresDetails, InvalidFinalizerDetails, InvalidLazyPortDetails, MultipleErrorsDetails, UnknownErrorDetails, ParsedDuplicateAdapterError, ParsedCircularDependencyError, ParsedCaptiveDependencyError, ParsedReverseCaptiveDependencyError, ParsedLifetimeInconsistencyError, ParsedSelfDependencyError, ParsedDepthLimitExceededError, ParsedMissingDependencyError, ParsedOverrideWithoutParentError, ParsedMissingProvidesError, ParsedInvalidProvidesError, ParsedInvalidRequiresTypeError, ParsedInvalidRequiresElementError, ParsedInvalidLifetimeTypeError, ParsedInvalidLifetimeValueError, ParsedInvalidFactoryError, ParsedDuplicateRequiresError, ParsedInvalidFinalizerError, ParsedInvalidLazyPortError, ParsedMultipleErrorsError, ParsedUnknownErrorError, } from "./error-parsing.js";
