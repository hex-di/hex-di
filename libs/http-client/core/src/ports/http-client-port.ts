/**
 * HttpClient port definition for DI registration.
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { DirectedPort, InferenceError } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpBody } from "../types/body.js";
import type { UrlParamsInput } from "../types/url-params.js";

// =============================================================================
// Request Option Types
// =============================================================================

/**
 * Options for convenience methods that do not accept a body (`get`, `del`, `head`).
 */
export interface RequestOptions {
  /** Headers to include in the request. */
  readonly headers?: Readonly<Record<string, string>>;

  /** URL search parameters to append. */
  readonly urlParams?: UrlParamsInput;

  /** AbortSignal for cancellation. */
  readonly signal?: AbortSignal;

  /** Timeout in milliseconds. */
  readonly timeout?: number;
}

/**
 * Options for convenience methods that accept a body (`post`, `put`, `patch`).
 */
export interface RequestOptionsWithBody extends RequestOptions {
  /** Request body (raw HttpBody). */
  readonly body?: HttpBody;

  /**
   * JSON body (convenience -- serialized via JSON.stringify).
   * If both `body` and `json` are provided, `json` takes precedence.
   *
   * Note: If JSON serialization fails, use `execute` with the `bodyJson`
   * combinator directly for proper error handling via the Result chain.
   */
  readonly json?: unknown;
}

// =============================================================================
// HttpClient Interface
// =============================================================================

/**
 * Core abstraction for making outbound HTTP requests.
 *
 * All methods return `ResultAsync<HttpResponse, HttpRequestError>` and never throw.
 * The `execute` method is the low-level entry point that all convenience methods
 * delegate to after constructing an `HttpRequest`.
 *
 * @see §25 of the http-client spec
 */
export interface HttpClient {
  /**
   * Execute an arbitrary pre-built `HttpRequest`.
   * This is the low-level method that all convenience methods delegate to.
   */
  readonly execute: (request: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a GET request. */
  readonly get: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a POST request. */
  readonly post: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a PUT request. */
  readonly put: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a PATCH request. */
  readonly patch: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a DELETE request. */
  readonly del: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a HEAD request. */
  readonly head: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;
}

// =============================================================================
// HttpClientPort — DI Port Token
// =============================================================================

/**
 * DI port token for the `HttpClient` service.
 *
 * Programs depend on this token — never on a concrete adapter implementation.
 * Register a transport adapter (fetch, axios, ky, …) against this port.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FetchHttpClientAdapter)   // Provides HttpClientPort
 *   .provide(UserServiceAdapter)       // Requires HttpClientPort
 *   .build();
 * ```
 *
 * @see §26 of the http-client spec
 */
export const HttpClientPort = port<HttpClient>()({
  name: "HttpClient",
  direction: "outbound",
  description: "Platform-agnostic HTTP client for making outbound requests",
  category: "infrastructure",
  tags: ["http", "network", "io"],
});

// =============================================================================
// Type Inference Utility
// =============================================================================

/**
 * Extracts the `HttpClient` service type from `HttpClientPort`.
 *
 * Follows the `InferenceError` pattern: returns a descriptive error type
 * instead of `never` when given an incompatible input.
 *
 * @example
 * ```typescript
 * type Client = InferHttpClient<typeof HttpClientPort>; // HttpClient
 *
 * // Error case — descriptive instead of silent never
 * type Bad = InferHttpClient<string>;
 * ```
 *
 * @see §28 of the http-client spec
 */
export type InferHttpClient<T> = [T] extends [DirectedPort<string, infer TService, "outbound">]
  ? TService extends HttpClient
    ? TService
    : InferenceError<"InferHttpClient", "Port service type does not extend HttpClient.", T>
  : InferenceError<
      "InferHttpClient",
      "Expected an outbound DirectedPort. Use InferHttpClient<typeof HttpClientPort>.",
      T
    >;
