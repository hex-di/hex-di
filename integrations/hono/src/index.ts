/**
 * @hex-di/hono - Hono Integration for HexDI
 *
 * Lightweight utilities for wiring HexDI containers into Hono applications:
 * - Per-request scopes via middleware
 * - Typed helpers to access the scope/container from handlers
 * - Utility types to merge HexDI variables into your Hono Env
 *
 * @packageDocumentation
 */

// =============================================================================
// Constants
// =============================================================================

/** Default context key for the per-request scope. */
export { DEFAULT_SCOPE_KEY, DEFAULT_CONTAINER_KEY } from "./constants.js";

// =============================================================================
// Middleware
// =============================================================================

export { createScopeMiddleware } from "./middleware.js";
export type { ScopeMiddlewareOptions } from "./middleware.js";

export { tracingMiddleware } from "./tracing-middleware.js";
export type { TracingMiddlewareOptions } from "./tracing-middleware.js";

// =============================================================================
// Helpers
// =============================================================================

export { getScope, getContainer, resolvePort, resolvePortAsync } from "./helpers.js";

// =============================================================================
// Inspection
// =============================================================================

export { getInspector, requestIdMiddleware, createDiagnosticRoutes } from "./inspection/index.js";
export type { RequestIdOptions, DiagnosticRoutesConfig } from "./inspection/index.js";

// =============================================================================
// Errors
// =============================================================================

export { MissingScopeError, MissingContainerError } from "./errors.js";

// =============================================================================
// Types
// =============================================================================

export type { HexHonoVariables, HexHonoEnv, WithHexDi } from "./types.js";

// =============================================================================
// Re-exports from @hex-di/core
// =============================================================================

export type { Port, InferService, InferPortName, InspectorAPI } from "@hex-di/core";

// =============================================================================
// Re-exports from @hex-di/runtime
// =============================================================================

export type { Container, Scope, ContainerPhase } from "@hex-di/runtime";
