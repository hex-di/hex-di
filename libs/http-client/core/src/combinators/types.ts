/**
 * Shared types for client combinators.
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClientError } from "../errors/index.js";

export type ExecuteResult = ResultAsync<HttpResponse, HttpRequestError>;

/** A function that wraps an HttpClient execute function. */
export type ClientWrapper = (
  execute: (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>,
) => (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>;

/** A combinator function that transforms one execute function to another. */
export type ExecuteTransform = (
  execute: (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>,
  req: HttpRequest,
) => ResultAsync<HttpResponse, HttpRequestError>;

/** Type alias for HttpClientError to avoid re-importing in combinator files. */
export type { HttpClientError };
