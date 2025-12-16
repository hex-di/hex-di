/**
 * User session feature bundle definition.
 *
 * @packageDocumentation
 */

import { createFeature } from "../../../plugins/types.js";
import { getUserSessionAdapter } from "./adapters/index.js";

/**
 * User session feature bundle.
 *
 * Provides: UserSessionPort
 * Requires: none
 *
 * This feature provides user identity for scoped sessions.
 *
 * @example
 * ```typescript
 * const graph = withFeature(
 *   withFeature(GraphBuilder.create(), coreFeature),
 *   userSessionFeature
 * ).build();
 * ```
 */
export const userSessionFeature = createFeature({
  name: "user-session",
  description: "User session management for scoped identity",
  adapters: [getUserSessionAdapter()],
  asyncAdapters: [],
});
