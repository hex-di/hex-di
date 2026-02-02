/**
 * Unified createAdapter API.
 *
 * This module will contain the unified `createAdapter()` function that accepts
 * both factory functions and class constructors through a single API. The actual
 * overloads and implementation will be added in Plan 09-02.
 *
 * @packageDocumentation
 */

import type { Port } from "../ports/types.js";
import type {
  BothFactoryAndClassError,
  NeitherFactoryNorClassError,
  BaseUnifiedConfig,
  FactoryConfig,
  ClassConfig,
} from "./unified-types.js";

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Maps a tuple of ports to a tuple of their service types.
 *
 * This helper is used to type constructor parameters for class-based adapters.
 * The order of service types matches the order of ports in the requires array.
 *
 * @typeParam T - Tuple of Port types
 *
 * @example
 * ```typescript
 * type Ports = [typeof LoggerPort, typeof DatabasePort];
 * type Services = PortsToServices<Ports>;
 * // [Logger, Database]
 * ```
 *
 * @internal
 */
export type PortsToServices<T extends readonly Port<unknown, string>[]> = {
  [K in keyof T]: T[K] extends Port<infer S, string> ? S : never;
};

// =============================================================================
// Placeholder
// =============================================================================

// createAdapter implementation will be added in 09-02
