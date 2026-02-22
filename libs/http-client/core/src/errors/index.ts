export type { HttpBodyError } from "./http-body-error.js";
export { httpBodyError } from "./http-body-error.js";
export type { HttpRequestError } from "./http-request-error.js";
export { httpRequestError } from "./http-request-error.js";
export type { HttpResponseError } from "./http-response-error.js";
export { httpResponseError } from "./http-response-error.js";
export { errorCode } from "./error-codes.js";
export {
  isHttpClientError,
  isHttpRequestError,
  isHttpResponseError,
  isHttpBodyError,
  isTransientError,
  isRateLimitError,
} from "./guards.js";

export type HttpClientError =
  | import("./http-request-error.js").HttpRequestError
  | import("./http-response-error.js").HttpResponseError
  | import("./http-body-error.js").HttpBodyError;
