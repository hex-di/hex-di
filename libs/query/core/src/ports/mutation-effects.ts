/**
 * Mutation Effects Type
 *
 * Extracted to break the circular dependency between types.ts and query-port.ts.
 *
 * @packageDocumentation
 */

import type { AnyQueryPort } from "./query-port.js";

// =============================================================================
// Mutation Effects
// =============================================================================

/**
 * Unvalidated effects -- used in createMutationPort config where graph
 * context is not yet available. Accepts any QueryPort.
 */
export interface MutationEffects {
  /** Query ports to mark stale and refetch. Active queries refetch immediately. */
  readonly invalidates?: ReadonlyArray<AnyQueryPort>;

  /** Query ports to remove from cache entirely. */
  readonly removes?: ReadonlyArray<AnyQueryPort>;
}
