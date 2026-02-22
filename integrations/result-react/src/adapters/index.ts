/**
 * Adapter functions for integrating Result with third-party data fetching libraries.
 *
 * @packageDocumentation
 */

export { toQueryFn, toQueryOptions, toMutationFn, toMutationOptions } from "./tanstack-query.js";
export { toSwrFetcher } from "./swr.js";
