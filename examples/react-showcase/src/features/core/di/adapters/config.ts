/**
 * Config adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ConfigPort } from "../ports.js";
import type { Config } from "../../../types.js";

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
  factory: async (): Promise<Config> => {
    // Simulate loading config from API
    await new Promise(resolve => setTimeout(resolve, 10000));
    return {
      notificationDuration: 3000,
      maxMessages: 100,
    };
  },
});
