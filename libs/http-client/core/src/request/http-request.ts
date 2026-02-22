/**
 * HttpRequest - immutable frozen HTTP request value object.
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import {
  createHeaders,
  setHeader,
  mergeHeaders,
} from "../types/headers.js";
import type { Headers } from "../types/headers.js";
import {
  createUrlParams,
  appendParam,
  fromQueryString,
  toQueryString,
} from "../types/url-params.js";
import type { UrlParams, UrlParamsInput } from "../types/url-params.js";
import {
  emptyBody,
  textBody,
  jsonBody,
  uint8ArrayBody,
  urlEncodedBody,
  formDataBody,
  streamBody,
} from "../types/body.js";
import type { HttpBody } from "../types/body.js";
import type { HttpMethod } from "../types/http-method.js";
import { httpBodyError } from "../errors/http-body-error.js";
import type { HttpBodyError } from "../errors/http-body-error.js";

const HTTP_REQUEST_SYMBOL: unique symbol = Symbol("HttpRequest");

export interface HttpRequest {
  readonly [HTTP_REQUEST_SYMBOL]: true;
  readonly method: HttpMethod;
  readonly url: string;
  readonly urlParams: UrlParams;
  readonly headers: Headers;
  readonly body: HttpBody;
  readonly signal: AbortSignal | undefined;
  readonly timeoutMs: number | undefined;
}

function parseUrlAndParams(rawUrl: string | URL): { url: string; urlParams: UrlParams } {
  const urlStr = typeof rawUrl === "string" ? rawUrl : rawUrl.toString();
  const queryIdx = urlStr.indexOf("?");
  if (queryIdx === -1) {
    return { url: urlStr, urlParams: createUrlParams() };
  }
  const baseUrl = urlStr.slice(0, queryIdx);
  const queryString = urlStr.slice(queryIdx + 1);
  return { url: baseUrl, urlParams: fromQueryString(queryString) };
}

function makeRequest(method: HttpMethod, url: string | URL): HttpRequest {
  const { url: parsedUrl, urlParams } = parseUrlAndParams(url);
  return Object.freeze({
    [HTTP_REQUEST_SYMBOL]: true as const,
    method,
    url: parsedUrl,
    urlParams,
    headers: createHeaders(),
    body: emptyBody(),
    signal: undefined,
    timeoutMs: undefined,
  });
}

/** Generic request constructor. */
export function request(method: HttpMethod, url: string | URL): HttpRequest {
  return makeRequest(method, url);
}

export function get(url: string | URL): HttpRequest {
  return makeRequest("GET", url);
}

export function head(url: string | URL): HttpRequest {
  return makeRequest("HEAD", url);
}

export function post(url: string | URL): HttpRequest {
  return makeRequest("POST", url);
}

export function put(url: string | URL): HttpRequest {
  return makeRequest("PUT", url);
}

export function patch(url: string | URL): HttpRequest {
  return makeRequest("PATCH", url);
}

export function del(url: string | URL): HttpRequest {
  return makeRequest("DELETE", url);
}

export function options(url: string | URL): HttpRequest {
  return makeRequest("OPTIONS", url);
}

/** Get a display string for the request (method + URL). */
export function requestMethodAndUrl(req: HttpRequest): string {
  const queryString = toQueryString(req.urlParams);
  const fullUrl = queryString ? `${req.url}?${queryString}` : req.url;
  return `${req.method} ${fullUrl}`;
}

function withHeaders(req: HttpRequest, headers: Headers): HttpRequest {
  return Object.freeze({ ...req, headers });
}

function withUrlParams(req: HttpRequest, urlParams: UrlParams): HttpRequest {
  return Object.freeze({ ...req, urlParams });
}

function withBody(req: HttpRequest, body: HttpBody): HttpRequest {
  return Object.freeze({ ...req, body });
}

// ---- Header combinators ----

export function setRequestHeader(
  key: string,
  value: string,
): (req: HttpRequest) => HttpRequest {
  return (req) => withHeaders(req, setHeader(key, value)(req.headers));
}

export function setRequestHeaders(
  headers: Readonly<Record<string, string>>,
): (req: HttpRequest) => HttpRequest {
  return (req) => withHeaders(req, mergeHeaders(createHeaders(headers))(req.headers));
}

export function appendRequestHeader(
  key: string,
  value: string,
): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const k = key.toLowerCase();
    const existing = req.headers.entries[k];
    const newValue = existing !== undefined ? `${existing}, ${value}` : value;
    return withHeaders(req, setHeader(k, newValue)(req.headers));
  };
}

export function removeRequestHeader(key: string): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const k = key.toLowerCase();
    const { [k]: _removed, ...rest } = req.headers.entries;
    return withHeaders(req, createHeaders(rest));
  };
}

export function bearerToken(token: string): (req: HttpRequest) => HttpRequest {
  return setRequestHeader("authorization", `Bearer ${token}`);
}

export function basicAuth(
  username: string,
  password: string,
): (req: HttpRequest) => HttpRequest {
  const credentials = btoa(`${username}:${password}`);
  return setRequestHeader("authorization", `Basic ${credentials}`);
}

export function acceptJson(req: HttpRequest): HttpRequest {
  return setRequestHeader("accept", "application/json")(req);
}

export function accept(mediaType: string): (req: HttpRequest) => HttpRequest {
  return setRequestHeader("accept", mediaType);
}

export function contentType(mediaType: string): (req: HttpRequest) => HttpRequest {
  return setRequestHeader("content-type", mediaType);
}

// ---- URL combinators ----

export function prependUrl(baseUrl: string): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const path = req.url.startsWith("/") ? req.url : `/${req.url}`;
    return Object.freeze({ ...req, url: `${base}${path}` });
  };
}

export function appendUrl(path: string): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const base = req.url.endsWith("/") ? req.url.slice(0, -1) : req.url;
    const segment = path.startsWith("/") ? path : `/${path}`;
    return Object.freeze({ ...req, url: `${base}${segment}` });
  };
}

export function setUrlParams(params: UrlParamsInput): (req: HttpRequest) => HttpRequest {
  return (req) => withUrlParams(req, createUrlParams(params));
}

export function appendUrlParams(params: UrlParamsInput): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const additional = createUrlParams(params);
    return withUrlParams(req, {
      ...req.urlParams,
      entries: [...req.urlParams.entries, ...additional.entries],
    });
  };
}

export function setUrlParam(
  key: string,
  value: string | number | boolean,
): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const filtered = req.urlParams.entries.filter(([k]) => k !== key);
    return withUrlParams(req, appendParam(key, String(value))(createUrlParams(filtered)));
  };
}

// ---- Body combinators ----

export function bodyText(
  text: string,
  ct?: string,
): (req: HttpRequest) => HttpRequest {
  return (req) => withBody(req, textBody(text, ct));
}

export function bodyJson(
  value: unknown,
): (req: HttpRequest) => Result<HttpRequest, HttpBodyError> {
  return (req) => {
    try {
      const serialized = JSON.stringify(value);
      const parsed: unknown = JSON.parse(serialized);
      const body = jsonBody(parsed);
      const withBodyReq = withBody(req, body);
      const withContentTypeReq = setRequestHeader("content-type", "application/json")(withBodyReq);
      return ok(withContentTypeReq);
    } catch (cause) {
      return err(
        httpBodyError(
          "JsonSerialize",
          `Failed to serialize request body as JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
          cause,
        ),
      );
    }
  };
}

export function bodyUint8Array(
  data: Uint8Array,
  ct?: string,
): (req: HttpRequest) => HttpRequest {
  return (req) => withBody(req, uint8ArrayBody(data, ct));
}

export function bodyUrlEncoded(
  params: UrlParamsInput,
): (req: HttpRequest) => HttpRequest {
  return (req) => {
    const withBodyReq = withBody(req, urlEncodedBody(params));
    return setRequestHeader("content-type", "application/x-www-form-urlencoded")(withBodyReq);
  };
}

export function bodyFormData(data: FormData): (req: HttpRequest) => HttpRequest {
  return (req) => withBody(req, formDataBody(data));
}

export function bodyStream(
  stream: ReadableStream<Uint8Array>,
  streamOptions?: { readonly contentType?: string; readonly contentLength?: number },
): (req: HttpRequest) => HttpRequest {
  return (req) => withBody(req, streamBody(stream, streamOptions));
}

// ---- Signal & timeout combinators ----

export function withSignal(signal: AbortSignal): (req: HttpRequest) => HttpRequest {
  return (req) => Object.freeze({ ...req, signal });
}

export function withTimeout(ms: number): (req: HttpRequest) => HttpRequest {
  return (req) => Object.freeze({ ...req, timeoutMs: ms });
}
