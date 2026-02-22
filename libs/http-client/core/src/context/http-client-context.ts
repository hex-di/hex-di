/**
 * Ambient HTTP client context variable.
 * @packageDocumentation
 */

import { createContextVariable } from "@hex-di/core";
import type { HttpClient } from "../ports/http-client-port.js";

/**
 * Ambient context variable for the current HTTP client scope.
 * Used for async context propagation (e.g., per-request auth, correlation IDs).
 */
export const HttpClientContextVar = createContextVariable<HttpClient | null>(
  "HttpClientContext",
  null,
);
