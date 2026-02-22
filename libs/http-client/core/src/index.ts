/**
 * @hex-di/http-client — Platform-agnostic HTTP client for HexDI
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================
export * from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================
export * from "./types/index.js";

// =============================================================================
// Errors
// =============================================================================
export * from "./errors/index.js";

// =============================================================================
// Request
// =============================================================================
export * from "./request/index.js";

// =============================================================================
// Response
// =============================================================================
export * from "./response/index.js";

// =============================================================================
// Combinators
// =============================================================================
export type {
  ExecuteResult,
  ClientWrapper,
  StatusFilterError,
  RetryOptions,
  RetryTransientOptions,
} from "./combinators/index.js";

// Client combinators (functional wrappers that transform HttpClient).
// Note: `basicAuth` is intentionally not re-exported here to avoid ambiguity
// with the request-level `basicAuth` helper from request/http-request.ts.
// Import it directly: import { basicAuth } from "@hex-di/http-client/combinators"
export { wrapClient } from "./combinators/wrap.js";
export { mapRequest, mapRequestResult } from "./combinators/request.js";
export { mapResponse, mapResponseResult } from "./combinators/response.js";
export { filterStatusOk, filterStatus } from "./combinators/status.js";
export { baseUrl } from "./combinators/base-url.js";
export { defaultHeaders } from "./combinators/headers.js";
export { bearerAuth, dynamicAuth } from "./combinators/auth.js";
export { tapRequest, tapResponse, tapError } from "./combinators/tap.js";
export { retry, retryTransient } from "./combinators/retry.js";
export { timeout } from "./combinators/timeout.js";
export { catchError, catchAll } from "./combinators/error.js";

// Resilience combinators
export { circuitBreaker } from "./combinators/circuit-breaker.js";
export type { CircuitBreakerConfig, CircuitBreakerState, CircuitState } from "./combinators/circuit-breaker.js";
export { rateLimit } from "./combinators/rate-limit.js";
export type { RateLimitConfig } from "./combinators/rate-limit.js";
export { responseCache } from "./combinators/cache.js";
export type { ResponseCacheConfig } from "./combinators/cache.js";

// Interceptor chains
export { interceptor, composeInterceptors } from "./combinators/interceptor.js";
export type { InterceptorConfig } from "./combinators/interceptor.js";

// Transport security combinators
export {
  requireHttps,
  withSsrfProtection,
  withHstsEnforcement,
  withCsrfProtection,
  withPayloadIntegrity,
  withCredentialProtection,
  withPayloadValidation,
  withTokenLifecycle,
} from "./combinators/security/index.js";

// =============================================================================
// Context
// =============================================================================
export * from "./context/index.js";

// =============================================================================
// Inspection
// =============================================================================
export * from "./inspection/index.js";

// =============================================================================
// Audit Infrastructure
// =============================================================================
export * from "./audit/index.js";

// Health is re-exported via inspection barrel above (deriveHealth, HealthCheckResult, HealthStatus, etc.)

// =============================================================================
// MCP & A2A Integration
// =============================================================================
export * from "./mcp/index.js";

// =============================================================================
// Testing Utilities (no vitest peer dep required)
// =============================================================================
export * from "./testing/index.js";
