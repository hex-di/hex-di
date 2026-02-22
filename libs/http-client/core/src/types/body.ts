/**
 * HTTP request body discriminated union.
 * @packageDocumentation
 */

import type { UrlParams, UrlParamsInput } from "./url-params.js";
import { createUrlParams } from "./url-params.js";

export interface EmptyBody {
  readonly _tag: "EmptyBody";
}

export interface TextBody {
  readonly _tag: "TextBody";
  readonly value: string;
  readonly contentType: string;
}

export interface JsonBody {
  readonly _tag: "JsonBody";
  readonly value: unknown;
}

export interface Uint8ArrayBody {
  readonly _tag: "Uint8ArrayBody";
  readonly value: Uint8Array;
  readonly contentType: string;
}

export interface UrlEncodedBody {
  readonly _tag: "UrlEncodedBody";
  readonly value: UrlParams;
}

export interface FormDataBody {
  readonly _tag: "FormDataBody";
  readonly value: FormData;
}

export interface StreamBody {
  readonly _tag: "StreamBody";
  readonly value: ReadableStream<Uint8Array>;
  readonly contentType: string;
  readonly contentLength?: number;
}

export type HttpBody =
  | EmptyBody
  | TextBody
  | JsonBody
  | Uint8ArrayBody
  | UrlEncodedBody
  | FormDataBody
  | StreamBody;

export function emptyBody(): EmptyBody {
  return Object.freeze({ _tag: "EmptyBody" as const });
}

export function textBody(
  value: string,
  contentType = "text/plain; charset=utf-8",
): TextBody {
  return Object.freeze({ _tag: "TextBody" as const, value, contentType });
}

export function jsonBody(value: unknown): JsonBody {
  return Object.freeze({ _tag: "JsonBody" as const, value });
}

export function uint8ArrayBody(
  value: Uint8Array,
  contentType = "application/octet-stream",
): Uint8ArrayBody {
  return Object.freeze({ _tag: "Uint8ArrayBody" as const, value, contentType });
}

export function urlEncodedBody(value: UrlParamsInput): UrlEncodedBody {
  const params = createUrlParams(value);
  return Object.freeze({ _tag: "UrlEncodedBody" as const, value: params });
}

export function formDataBody(value: FormData): FormDataBody {
  return Object.freeze({ _tag: "FormDataBody" as const, value });
}

export function streamBody(
  value: ReadableStream<Uint8Array>,
  options?: { readonly contentType?: string; readonly contentLength?: number },
): StreamBody {
  return Object.freeze({
    _tag: "StreamBody" as const,
    value,
    contentType: options?.contentType ?? "application/octet-stream",
    contentLength: options?.contentLength,
  });
}

export function isEmptyBody(body: HttpBody): body is EmptyBody {
  return body._tag === "EmptyBody";
}

export function isTextBody(body: HttpBody): body is TextBody {
  return body._tag === "TextBody";
}

export function isJsonBody(body: HttpBody): body is JsonBody {
  return body._tag === "JsonBody";
}

export function isUint8ArrayBody(body: HttpBody): body is Uint8ArrayBody {
  return body._tag === "Uint8ArrayBody";
}

export function isUrlEncodedBody(body: HttpBody): body is UrlEncodedBody {
  return body._tag === "UrlEncodedBody";
}

export function isFormDataBody(body: HttpBody): body is FormDataBody {
  return body._tag === "FormDataBody";
}

export function isStreamBody(body: HttpBody): body is StreamBody {
  return body._tag === "StreamBody";
}
