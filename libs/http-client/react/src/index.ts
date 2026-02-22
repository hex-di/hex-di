/**
 * @hex-di/http-client-react - React Integration for HTTP Client
 *
 * Provides context-based `HttpClient` propagation through the React component
 * tree with hooks for reactive queries and imperative mutations.
 *
 * @packageDocumentation
 */

// Provider
export { HttpClientProvider } from "./provider.js";
export type { HttpClientProviderProps } from "./provider.js";

// Hooks
export { useHttpClient } from "./hooks/use-http-client.js";
export { useHttpRequest } from "./hooks/use-http-request.js";
export type {
  UseHttpRequestState,
  UseHttpRequestOptions,
  UseHttpRequestStatus,
} from "./hooks/use-http-request.js";
export { useHttpMutation } from "./hooks/use-http-mutation.js";
export type { UseMutationState, UseMutationStatus } from "./hooks/use-http-mutation.js";
