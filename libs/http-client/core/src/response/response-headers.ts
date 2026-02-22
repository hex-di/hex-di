/**
 * Header accessor utilities for HttpResponse.
 * @packageDocumentation
 */

import { getHeader } from "../types/headers.js";
import type { HttpResponse } from "./http-response.js";

/** Get a response header value by key (case-insensitive). Returns undefined if absent. */
export function getResponseHeader(key: string): (response: HttpResponse) => string | undefined {
  return (response) => getHeader(key)(response.headers);
}

/** Get the Content-Type header value. */
export function getContentType(response: HttpResponse): string | undefined {
  return getHeader("content-type")(response.headers);
}

/**
 * Get the Content-Length header value parsed as a number.
 * Returns undefined if the header is absent or not a valid integer.
 */
export function getContentLength(response: HttpResponse): number | undefined {
  const raw = getHeader("content-length")(response.headers);
  if (raw === undefined) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Returns a predicate that checks whether the Content-Type header contains
 * the given media type (case-insensitive prefix match before any ';' parameter).
 */
export function hasContentType(mediaType: string): (response: HttpResponse) => boolean {
  const lower = mediaType.toLowerCase();
  return (response) => {
    const ct = getContentType(response);
    if (ct === undefined) return false;
    return ct.toLowerCase().split(";")[0].trim() === lower;
  };
}

/** Get the Location header value (used for redirects). */
export function getLocation(response: HttpResponse): string | undefined {
  return getHeader("location")(response.headers);
}

/**
 * Get all Set-Cookie header values.
 * Per RFC 9110, multiple Set-Cookie headers are kept as separate entries.
 * This looks for all headers whose key starts with "set-cookie".
 */
export function getSetCookies(response: HttpResponse): readonly string[] {
  const entries = Object.entries(response.headers.entries);
  return entries
    .filter(([key]) => key === "set-cookie")
    .map(([, value]) => value);
}
