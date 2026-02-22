/**
 * React context for HttpClient injection.
 * @packageDocumentation
 */

import { createContext } from "react";
import type { HttpClient } from "@hex-di/http-client";

/**
 * Internal React context for the HttpClient instance.
 *
 * Default value is `null` — hooks that read this context will throw
 * a descriptive error when no `HttpClientProvider` is present in the tree.
 *
 * This context is an implementation detail and is NOT part of the public API.
 *
 * @see §10 of the provider spec
 */
export const HttpClientContext = createContext<HttpClient | null>(null);
