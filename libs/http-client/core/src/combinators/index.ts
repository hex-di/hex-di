/**
 * Client combinators — functional wrappers that take an `HttpClient` and return
 * a new `HttpClient` with augmented behaviour.
 *
 * All combinators follow the same pattern:
 * ```typescript
 * type ClientCombinator = (client: HttpClient) => HttpClient;
 * ```
 *
 * Compose them with `pipe`:
 * ```typescript
 * const apiClient = pipe(
 *   baseClient,
 *   baseUrl("https://api.example.com"),
 *   bearerAuth(token),
 *   filterStatusOk,
 *   retryTransient({ times: 3 }),
 *   timeout(10_000),
 * );
 * ```
 *
 * @packageDocumentation
 */

// Shared types
export type { ExecuteResult, ClientWrapper } from "./types.js";

// Low-level helper
export { wrapClient } from "./wrap.js";

// Request transformation
export { mapRequest, mapRequestResult } from "./request.js";

// Response transformation
export { mapResponse, mapResponseResult } from "./response.js";

// Status filtering
export { filterStatusOk, filterStatus } from "./status.js";
export type { StatusFilterError } from "./status.js";

// Base URL & headers
export { baseUrl } from "./base-url.js";
export { defaultHeaders } from "./headers.js";

// Authentication — exported without basicAuth to avoid conflict with the
// request-level basicAuth from request/http-request.ts. The main package
// index re-exports basicAuth as clientBasicAuth explicitly.
export { bearerAuth, dynamicAuth } from "./auth.js";

// Side-effect tapping
export { tapRequest, tapResponse, tapError } from "./tap.js";

// Retry
export { retry, retryTransient } from "./retry.js";
export type { RetryOptions, RetryTransientOptions } from "./retry.js";

// Timeout
export { timeout } from "./timeout.js";

// Error recovery
export { catchError, catchAll } from "./error.js";

// Circuit breaker
export { circuitBreaker } from "./circuit-breaker.js";
export type {
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitState,
} from "./circuit-breaker.js";

// Rate limiting
export { rateLimit } from "./rate-limit.js";
export type { RateLimitConfig } from "./rate-limit.js";

// Response caching
export { responseCache } from "./cache.js";
export type { ResponseCacheConfig } from "./cache.js";

// Interceptor chains
export { interceptor, composeInterceptors } from "./interceptor.js";
export type { InterceptorConfig } from "./interceptor.js";

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
} from "./security/index.js";
export type {
  SsrfProtectionConfig,
  HstsConfig,
  CsrfConfig,
  PayloadIntegrityConfig,
  CredentialProtectionConfig,
  PayloadValidationConfig,
  TokenLifecycleConfig,
} from "./security/index.js";
