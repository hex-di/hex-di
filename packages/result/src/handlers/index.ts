/**
 * Effect handler composition system.
 *
 * Provides composable handlers for processing tagged errors in Results.
 *
 * @packageDocumentation
 */

// Types
export type {
  EffectHandler,
  InputOf,
  OutputOf,
  ComposeHandlers,
  UnionOfOutputs,
  NarrowedError,
} from "./types.js";

// Runtime
export { composeHandlers, identityHandler } from "./compose.js";
export { transformEffects } from "./transform.js";
