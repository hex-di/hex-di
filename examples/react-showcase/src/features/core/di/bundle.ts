/**
 * Core feature bundle definition.
 *
 * @packageDocumentation
 */

import { createFeature } from "../../../plugins/types.js";
import { ConfigAdapter, getLoggerAdapter } from "./adapters/index.js";

/**
 * Core infrastructure feature bundle.
 *
 * Provides: ConfigPort, LoggerPort
 * Requires: none
 *
 * This feature provides the foundational services that other features depend on:
 * - Configuration service (async, loaded from API)
 * - Logging service (profile-dependent variant)
 *
 * @example
 * ```typescript
 * const graph = withFeature(GraphBuilder.create(), coreFeature).build();
 * ```
 */
export const coreFeature = createFeature({
  name: "core",
  description: "Core infrastructure services (config, logging)",
  adapters: [getLoggerAdapter()],
  asyncAdapters: [ConfigAdapter],
});
