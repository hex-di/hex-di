/**
 * Build an HttpResponse from a native Fetch API Response.
 * @packageDocumentation
 */

import { createHttpResponse, createHeaders } from "@hex-di/http-client";
import type { HttpResponse, HttpRequest } from "@hex-di/http-client";

/**
 * Convert a native `Response` to an `HttpResponse`.
 *
 * The body is buffered eagerly into a `Uint8Array` so that the native
 * `Response` can be garbage-collected immediately. Streaming responses
 * are also supported via `rawStream`.
 */
export async function buildResponse(
  nativeResponse: Response,
  request: HttpRequest,
): Promise<HttpResponse> {
  const headers = convertHeaders(nativeResponse.headers);

  // Buffer the entire body as Uint8Array for lazy accessor support.
  // For responses with no body (HEAD, 204, 304) arrayBuffer() returns
  // an empty buffer, which createHttpResponse handles correctly.
  const arrayBuffer = await nativeResponse.arrayBuffer();
  const rawBody = arrayBuffer.byteLength > 0 ? new Uint8Array(arrayBuffer) : undefined;

  return createHttpResponse({
    status: nativeResponse.status,
    statusText: nativeResponse.statusText,
    headers,
    request,
    rawBody,
  });
}

/**
 * Convert native `Headers` to the HexDI `Headers` type.
 * All header keys are lowercased by `createHeaders`.
 */
function convertHeaders(nativeHeaders: globalThis.Headers): ReturnType<typeof createHeaders> {
  const record: Record<string, string> = {};
  nativeHeaders.forEach((value, key) => {
    record[key] = value;
  });
  return createHeaders(record);
}
