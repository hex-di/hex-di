/**
 * Status classification utilities for HttpResponse.
 * @packageDocumentation
 */

import type { HttpResponse } from "./http-response.js";

/** Returns true if the response status is 200–299 (successful). */
export function isOk(response: HttpResponse): boolean {
  return response.status >= 200 && response.status <= 299;
}

/** Returns true if the response status is 300–399 (redirect). */
export function isRedirect(response: HttpResponse): boolean {
  return response.status >= 300 && response.status <= 399;
}

/** Returns true if the response status is 400–499 (client error). */
export function isClientError(response: HttpResponse): boolean {
  return response.status >= 400 && response.status <= 499;
}

/** Returns true if the response status is 500–599 (server error). */
export function isServerError(response: HttpResponse): boolean {
  return response.status >= 500 && response.status <= 599;
}

/** Returns true if the response status is 100–199 (informational). */
export function isInformational(response: HttpResponse): boolean {
  return response.status >= 100 && response.status <= 199;
}

/** Returns a predicate that checks for a specific status code. */
export function hasStatus(status: number): (response: HttpResponse) => boolean {
  return (response) => response.status === status;
}

/** Returns a predicate that checks whether the status falls within [min, max] (inclusive). */
export function hasStatusInRange(min: number, max: number): (response: HttpResponse) => boolean {
  return (response) => response.status >= min && response.status <= max;
}
