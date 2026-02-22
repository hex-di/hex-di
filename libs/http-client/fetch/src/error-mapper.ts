/**
 * Map native fetch errors to HttpRequestError reason strings.
 *
 * Mapping rules:
 * - `DOMException` with `name === "TimeoutError"` — timeout from `AbortSignal.timeout()`
 * - `DOMException` with `name === "AbortError"` — manual abort via user signal
 * - `TypeError` — network error (DNS failure, connection refused, CORS, etc.)
 * - Everything else — treated as transport error
 *
 * @packageDocumentation
 */

export type FetchErrorReason = "Transport" | "Timeout" | "Aborted";

/**
 * Map a native fetch rejection to an `HttpRequestError` reason.
 *
 * `AbortSignal.timeout(ms)` throws `DOMException{ name: "TimeoutError" }`.
 * A user-provided `AbortSignal` throws `DOMException{ name: "AbortError" }`.
 * Network-level failures (no connectivity, CORS, DNS) throw `TypeError`.
 */
export function mapFetchError(error: unknown): FetchErrorReason {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") {
      return "Timeout";
    }
    if (error.name === "AbortError") {
      return "Aborted";
    }
  }
  if (error instanceof TypeError) {
    // TypeError from fetch is always a network-level failure
    return "Transport";
  }
  return "Transport";
}
