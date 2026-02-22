/**
 * HttpResponse - immutable frozen HTTP response value object with lazy body accessors.
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Headers } from "../types/headers.js";
import type { HttpRequest } from "../request/http-request.js";
import { httpResponseError } from "../errors/http-response-error.js";
import type { HttpResponseError } from "../errors/http-response-error.js";

const HTTP_RESPONSE_SYMBOL: unique symbol = Symbol("HttpResponse");

export interface HttpResponse {
  readonly [HTTP_RESPONSE_SYMBOL]: true;

  /** HTTP status code (e.g., 200, 404, 500) */
  readonly status: number;

  /** HTTP status text (e.g., "OK", "Not Found") */
  readonly statusText: string;

  /** Response headers */
  readonly headers: Headers;

  /** The originating request (back-reference for error context) */
  readonly request: HttpRequest;

  /** Parse body as JSON. Lazy -- consumes the body on first call. */
  readonly json: ResultAsync<unknown, HttpResponseError>;

  /** Read body as string. Lazy -- consumes the body on first call. */
  readonly text: ResultAsync<string, HttpResponseError>;

  /** Read body as ArrayBuffer. Lazy -- consumes the body on first call. */
  readonly arrayBuffer: ResultAsync<ArrayBuffer, HttpResponseError>;

  /** Read body as Blob. Lazy -- consumes the body on first call. */
  readonly blob: ResultAsync<Blob, HttpResponseError>;

  /** Parse body as FormData. Lazy -- consumes the body on first call. */
  readonly formData: ResultAsync<FormData, HttpResponseError>;

  /** Access the raw body as a ReadableStream. Non-lazy -- can only be read once. */
  readonly stream: ReadableStream<Uint8Array>;
}

/**
 * Internal options for creating an HttpResponse.
 * Transport adapters call createHttpResponse() with the pre-buffered body bytes or a stream.
 */
export interface CreateHttpResponseOptions {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly request: HttpRequest;
  /** Pre-buffered body bytes. If omitted or zero-length, the body is considered empty. */
  readonly rawBody?: Uint8Array | undefined;
  /** Raw ReadableStream for streaming access. */
  readonly rawStream?: ReadableStream<Uint8Array> | undefined;
}

type BodyAccessorKey = "json" | "text" | "arrayBuffer" | "blob" | "formData";

/**
 * Create an HttpResponse with lazy body accessors and body consumption tracking.
 *
 * INV-HC-5: response.request always references the originating request.
 * INV-HC-6: body parsed at most once per accessor type; cached after first access.
 *
 * Body consumption semantics:
 * - Accessing an accessor for the first time parses the body and caches the ResultAsync.
 * - Subsequent accesses to the SAME accessor return the cached ResultAsync (identity equal).
 * - Accessing a DIFFERENT accessor after body has been consumed returns a
 *   ResultAsync wrapping HttpResponseError{ reason: "BodyAlreadyConsumed" }.
 */
export function createHttpResponse(options: CreateHttpResponseOptions): HttpResponse {
  const { status, statusText, headers, request, rawBody } = options;

  // Mutable closure state — lives outside any frozen object
  let consumedKey: BodyAccessorKey | null = null;

  // Per-accessor typed caches — avoids generic type erasure casts
  let jsonCache: ResultAsync<unknown, HttpResponseError> | null = null;
  let textCache: ResultAsync<string, HttpResponseError> | null = null;
  let arrayBufferCache: ResultAsync<ArrayBuffer, HttpResponseError> | null = null;
  let blobCache: ResultAsync<Blob, HttpResponseError> | null = null;
  let formDataCache: ResultAsync<FormData, HttpResponseError> | null = null;

  // Forward reference to response — needed for httpResponseError construction.
  // Populated immediately after response object is created below.
  let responseInstance: HttpResponse | null = null;

  function getResponse(): HttpResponse {
    if (responseInstance === null) {
      throw new Error("Internal error: HttpResponse reference not yet populated");
    }
    return responseInstance;
  }

  function consumedError(): HttpResponseError {
    return httpResponseError(
      "BodyAlreadyConsumed",
      request,
      getResponse(),
      `Response body was already consumed via '${consumedKey}': ${request.method} ${request.url}`,
    );
  }

  function emptyBodyError(): HttpResponseError {
    return httpResponseError(
      "EmptyBody",
      request,
      getResponse(),
      `Response body is empty: ${request.method} ${request.url} returned ${status}`,
    );
  }

  // ── Per-accessor consume functions ──────────────────────────────────────

  function consumeJson(): ResultAsync<unknown, HttpResponseError> {
    if (consumedKey !== null && consumedKey !== "json") return ResultAsync.err(consumedError());
    if (jsonCache !== null) return jsonCache;
    consumedKey = "json";
    if (rawBody === undefined || rawBody.byteLength === 0) {
      jsonCache = ResultAsync.err(emptyBodyError());
    } else {
      try {
        const text = new TextDecoder().decode(rawBody);
        const parsed: unknown = JSON.parse(text);
        jsonCache = ResultAsync.ok(parsed);
      } catch (cause) {
        jsonCache = ResultAsync.err(
          httpResponseError(
            "Decode",
            request,
            getResponse(),
            `Failed to parse response body as JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
            cause,
          ),
        );
      }
    }
    return jsonCache;
  }

  function consumeText(): ResultAsync<string, HttpResponseError> {
    if (consumedKey !== null && consumedKey !== "text") return ResultAsync.err(consumedError());
    if (textCache !== null) return textCache;
    consumedKey = "text";
    if (rawBody === undefined || rawBody.byteLength === 0) {
      textCache = ResultAsync.err(emptyBodyError());
    } else {
      textCache = ResultAsync.ok(new TextDecoder().decode(rawBody));
    }
    return textCache;
  }

  function consumeArrayBuffer(): ResultAsync<ArrayBuffer, HttpResponseError> {
    if (consumedKey !== null && consumedKey !== "arrayBuffer") return ResultAsync.err(consumedError());
    if (arrayBufferCache !== null) return arrayBufferCache;
    consumedKey = "arrayBuffer";
    if (rawBody === undefined || rawBody.byteLength === 0) {
      arrayBufferCache = ResultAsync.err(emptyBodyError());
    } else {
      // bytes.slice() always returns Uint8Array<ArrayBuffer> (an owned copy).
      // Using .slice() avoids SharedArrayBuffer ambiguity from bytes.buffer.
      arrayBufferCache = ResultAsync.ok(rawBody.slice().buffer);
    }
    return arrayBufferCache;
  }

  function consumeBlob(): ResultAsync<Blob, HttpResponseError> {
    if (consumedKey !== null && consumedKey !== "blob") return ResultAsync.err(consumedError());
    if (blobCache !== null) return blobCache;
    consumedKey = "blob";
    if (rawBody === undefined || rawBody.byteLength === 0) {
      blobCache = ResultAsync.err(emptyBodyError());
    } else {
      // bytes.slice() ensures the backing buffer is an ArrayBuffer (not SharedArrayBuffer),
      // which satisfies the Blob constructor's BlobPart type constraint.
      blobCache = ResultAsync.ok(new Blob([rawBody.slice()]));
    }
    return blobCache;
  }

  function consumeFormData(): ResultAsync<FormData, HttpResponseError> {
    if (consumedKey !== null && consumedKey !== "formData") return ResultAsync.err(consumedError());
    if (formDataCache !== null) return formDataCache;
    consumedKey = "formData";
    // FormData parsing not supported; always returns err
    formDataCache = ResultAsync.err(
      httpResponseError(
        "Decode",
        request,
        getResponse(),
        "FormData parsing is not supported; use a multipart-aware transport adapter",
      ),
    );
    return formDataCache;
  }

  // ── Stream construction ────────────────────────────────────────────────

  // Build the stream: prefer rawStream if provided, otherwise construct from rawBody.
  // The stream is created eagerly since it is not wrapped in ResultAsync.
  const stream: ReadableStream<Uint8Array> =
    options.rawStream ??
    (rawBody !== undefined && rawBody.byteLength > 0
      ? new ReadableStream<Uint8Array>({
          start(controller): void {
            controller.enqueue(rawBody);
            controller.close();
          },
        })
      : new ReadableStream<Uint8Array>({
          start(controller): void {
            controller.close();
          },
        }));

  // ── Build the response object ──────────────────────────────────────────

  // The response object. Getters delegate to per-accessor consume functions which
  // manage caching and consumption tracking. Object.freeze makes the shape immutable;
  // mutable state lives in the closure variables above (consumedKey, caches, responseInstance).
  const responseData = Object.freeze({
    [HTTP_RESPONSE_SYMBOL]: true as const,
    status,
    statusText,
    headers,
    request,

    get json(): ResultAsync<unknown, HttpResponseError> {
      return consumeJson();
    },

    get text(): ResultAsync<string, HttpResponseError> {
      return consumeText();
    },

    get arrayBuffer(): ResultAsync<ArrayBuffer, HttpResponseError> {
      return consumeArrayBuffer();
    },

    get blob(): ResultAsync<Blob, HttpResponseError> {
      return consumeBlob();
    },

    get formData(): ResultAsync<FormData, HttpResponseError> {
      return consumeFormData();
    },

    stream,
  });

  // The frozen object satisfies HttpResponse structurally. Assign via the interface
  // to confirm structural compatibility at this exact point.
  const response: HttpResponse = responseData;

  // Populate the forward reference so error construction can reference the response
  responseInstance = response;

  return response;
}
