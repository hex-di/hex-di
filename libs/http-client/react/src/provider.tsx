/**
 * HttpClientProvider - makes HttpClient available to the component tree.
 * @packageDocumentation
 */

import { useMemo, type ReactNode } from "react";
import type { HttpClient } from "@hex-di/http-client";
import { HttpClientContext } from "./context.js";

/**
 * Props for the HttpClientProvider component.
 *
 * @see §9 of the provider spec
 */
export interface HttpClientProviderProps {
  /** The HttpClient instance to provide. Required. */
  readonly client: HttpClient;
  /** Child components. */
  readonly children: ReactNode;
}

/**
 * Provides an `HttpClient` instance to all descendant components via React Context.
 *
 * Descendant components use `useHttpClient()` to access the instance.
 * When nested, the innermost provider takes precedence for its descendants.
 *
 * The context value is memoized by `client` reference to prevent unnecessary
 * re-renders in descendants when the parent re-renders without changing the client.
 *
 * @example
 * ```tsx
 * <HttpClientProvider client={httpClient}>
 *   <App />
 * </HttpClientProvider>
 * ```
 *
 * @see §9 of the provider spec
 */
export function HttpClientProvider({ client, children }: HttpClientProviderProps): ReactNode {
  // Memoize the context value to avoid unnecessary re-renders in descendants
  // when the parent re-renders with the same client reference. §12.1, §12.2
  const value = useMemo(() => client, [client]);

  return <HttpClientContext.Provider value={value}>{children}</HttpClientContext.Provider>;
}
