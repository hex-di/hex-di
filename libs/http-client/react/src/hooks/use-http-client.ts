/**
 * useHttpClient - resolve HttpClient from nearest provider.
 * @packageDocumentation
 */

import { useContext } from "react";
import type { HttpClient } from "@hex-di/http-client";
import { HttpClientContext } from "../context.js";

/**
 * Resolves the `HttpClient` from the nearest `HttpClientProvider` ancestor.
 *
 * Throws a descriptive error if called outside an `HttpClientProvider` tree.
 * The returned instance is the same reference passed to the nearest provider's
 * `client` prop — no wrapping or copying is performed.
 *
 * @throws {Error} When called outside an `HttpClientProvider` tree.
 * @returns The `HttpClient` instance from the nearest provider.
 *
 * @see §13 of the hooks spec
 */
export function useHttpClient(): HttpClient {
  const client = useContext(HttpClientContext);
  if (client === null) {
    throw new Error("useHttpClient must be used within an HttpClientProvider");
  }
  return client;
}
