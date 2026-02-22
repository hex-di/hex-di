/**
 * Serialize HttpBody to native Fetch API BodyInit.
 * @packageDocumentation
 */

import type { HttpBody } from "@hex-di/http-client";
import {
  isEmptyBody,
  isTextBody,
  isJsonBody,
  isUint8ArrayBody,
  isUrlEncodedBody,
  isFormDataBody,
  isStreamBody,
} from "@hex-di/http-client";

/**
 * The fetch-compatible body representation.
 * `body` is `null` for empty bodies, otherwise a fetch-compatible value.
 * `contentType` is set when the adapter must explicitly set `Content-Type`.
 */
export interface SerializedBody {
  readonly body: string | Blob | ArrayBuffer | FormData | URLSearchParams | ReadableStream<Uint8Array> | null;
  readonly contentType: string | undefined;
}

/**
 * Map an `HttpBody` variant to a native Fetch body and optional content-type.
 *
 * The content-type is only returned when the adapter must set it explicitly.
 * For `FormDataBody`, the browser sets the `Content-Type` with boundary automatically
 * so no content-type override is returned.
 */
export function serializeBody(httpBody: HttpBody): SerializedBody {
  if (isEmptyBody(httpBody)) {
    return { body: null, contentType: undefined };
  }
  if (isTextBody(httpBody)) {
    return { body: httpBody.value, contentType: httpBody.contentType };
  }
  if (isJsonBody(httpBody)) {
    return { body: JSON.stringify(httpBody.value), contentType: "application/json" };
  }
  if (isUint8ArrayBody(httpBody)) {
    // .slice() returns Uint8Array<ArrayBuffer> which is a valid ArrayBufferView / BodyInit
    return { body: httpBody.value.slice().buffer, contentType: httpBody.contentType };
  }
  if (isUrlEncodedBody(httpBody)) {
    // Convert UrlParams entries to URLSearchParams for proper encoding
    const params = new URLSearchParams();
    for (const [key, value] of httpBody.value.entries) {
      params.append(key, value);
    }
    return { body: params, contentType: "application/x-www-form-urlencoded" };
  }
  if (isFormDataBody(httpBody)) {
    // Browser sets Content-Type with boundary automatically
    return { body: httpBody.value, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    return { body: httpBody.value, contentType: httpBody.contentType };
  }

  // Exhaustive check — TypeScript should catch missing variants at compile time
  const _exhaustive: never = httpBody;
  return _exhaustive;
}
