/**
 * Shared types and utilities for the unified DevTools architecture.
 *
 * This module exports types and utilities used by both DOM and TUI
 * entry points.
 *
 * @packageDocumentation
 */

export type { RendererType } from "./renderer-type.js";

// =============================================================================
// Lifetime Colors
// =============================================================================

export {
  getLifetimeColor,
  getLifetimeIcon,
  getTrendColor,
} from "./lifetime-colors.js";

export type { Lifetime, Trend } from "./lifetime-colors.js";

// =============================================================================
// Trace Persistence
// =============================================================================

export {
  BrowserTracePersistence,
  TUITracePersistence,
  TracePersistenceService,
  createBrowserTracePersistence,
  createTUITracePersistence,
} from "./trace-persistence.js";

export type {
  TracePersistenceContract,
  TUITracePersistenceOptions,
} from "./trace-persistence.js";
