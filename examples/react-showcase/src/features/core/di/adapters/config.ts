/**
 * Config adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { ConfigPort } from "../ports.js";

/**
 * Adapter for the application configuration service.
 *
 * Simulates loading configuration from an API endpoint.
 * This demonstrates async factory support - the config is loaded
 * asynchronously at container initialization time.
 *
 * @remarks
 * - Lifetime: singleton (async adapters are always singletons)
 * - Dependencies: none
 * - Async: Simulates API call with delay
 */
export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  // No lifetime - async adapters are always singletons
  factory: () =>
    ResultAsync.fromSafePromise(new Promise<void>(resolve => setTimeout(resolve, 10000))).map(
      () => ({
        notificationDuration: 3000,
        maxMessages: 100,
      })
    ),
});
