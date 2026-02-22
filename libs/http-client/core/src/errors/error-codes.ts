/**
 * Error code mapping for HTTP client errors.
 * @packageDocumentation
 */

import type { HttpClientError } from "./index.js";

const ERROR_CODES: Readonly<Record<string, string>> = Object.freeze({
  "HttpRequestError:Transport": "HTTP001",
  "HttpRequestError:Timeout": "HTTP002",
  "HttpRequestError:Aborted": "HTTP003",
  "HttpRequestError:InvalidUrl": "HTTP004",
  "HttpResponseError:StatusCode": "HTTP010",
  "HttpResponseError:Decode": "HTTP011",
  "HttpResponseError:EmptyBody": "HTTP012",
  "HttpResponseError:BodyAlreadyConsumed": "HTTP013",
  "HttpBodyError:JsonSerialize": "HTTP020",
  "HttpBodyError:Encode": "HTTP021",
});

/** Get the error code for an HttpClientError. */
export function errorCode(error: HttpClientError): string {
  const key = `${error._tag}:${error.reason}`;
  return ERROR_CODES[key] ?? "HTTP000";
}
