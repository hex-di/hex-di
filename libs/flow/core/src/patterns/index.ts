/**
 * Patterns Module - Advanced Composition Patterns
 *
 * This module provides helper patterns for common machine compositions:
 * - Actor model: child machines as activities
 * - Subscriptions: external event source integration
 * - Retry: exponential backoff retry patterns
 * - Coordination: multi-machine synchronization guards
 *
 * @packageDocumentation
 */

// =============================================================================
// Actor Model
// =============================================================================

export { createMachineActivity, type MachineActivityConfig } from "./actor.js";

// =============================================================================
// Subscription
// =============================================================================

export {
  createSubscriptionActivity,
  type SubscribeFn,
  type SubscriptionActivityConfig,
} from "./subscription.js";

// =============================================================================
// Retry
// =============================================================================

export {
  retryConfig,
  type RetryPatternConfig,
  type RetryContext,
  type RetryPatternResult,
} from "./retry.js";

// =============================================================================
// Coordination
// =============================================================================

export { waitForAll, waitForAny, type CoordinationContext } from "./coordination.js";
