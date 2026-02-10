/**
 * Directed Port Types and Utilities.
 *
 * Provides inbound/outbound port distinction for hexagonal architecture clarity.
 * Inbound ports represent use cases (driving adapters), outbound ports represent
 * infrastructure (driven adapters).
 *
 * @packageDocumentation
 */

import type {
  Port,
  PortDirection,
  PortMetadata,
  DirectedPort,
  InboundPort,
  OutboundPort,
} from "./types.js";

// =============================================================================
// Runtime Symbols
// =============================================================================

/**
 * Runtime symbol for direction branding.
 * Uses Symbol.for() to ensure consistent identity across module boundaries.
 */
export const DIRECTION_BRAND = Symbol.for("@hex-di/core/PortDirection");

/**
 * Runtime symbol for metadata storage.
 * Uses Symbol.for() to ensure consistent identity across module boundaries.
 */
export const METADATA_KEY = Symbol.for("@hex-di/core/PortMetadata");

// =============================================================================
// Runtime Interfaces
// =============================================================================

/**
 * Runtime representation of a DirectedPort.
 *
 * At runtime, DirectedPort objects contain:
 * - `__portName`: The port identifier
 * - `[DIRECTION_BRAND]`: The direction ('inbound' or 'outbound')
 * - `[METADATA_KEY]`: Metadata object
 */
export interface DirectedPortRuntime<TName extends string> {
  readonly __portName: TName;
  readonly [DIRECTION_BRAND]: PortDirection;
  readonly [METADATA_KEY]: PortMetadata;
}

// =============================================================================
// Options Interface
// =============================================================================

/**
 * Options for creating a directed port.
 *
 * @typeParam TName - The literal string type for the port name
 */
export interface CreateDirectedPortOptions<TName extends string> {
  /** The unique name for this port */
  readonly name: TName;
  /** Human-readable description of the port's purpose */
  readonly description?: string;
  /** Categorical grouping for organization */
  readonly category?: string;
  /** Searchable tags for filtering and discovery */
  readonly tags?: readonly string[];
}

// =============================================================================
// Internal Factory Helper
// =============================================================================

/**
 * Creates a DirectedPort value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The DirectedPort type has branded properties that exist at the type level
 * for nominal typing. This helper bridges the gap between the runtime
 * representation and the phantom-branded type.
 *
 * This is safe because:
 * 1. **Brands are for type discrimination**: The `__brand` symbol from Port
 *    is used exclusively for compile-time type discrimination.
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation.
 * 3. **Single creation point**: All directed ports flow through this helper.
 *
 * ## Type Safety via Overloads
 *
 * This function uses overloads to bridge the phantom type gap:
 * - The public signature returns `DirectedPort<TService, TName, TDirection>`
 * - The implementation signature returns `object` (the frozen runtime object)
 */
export function createDirectedPortImpl<
  TService,
  TName extends string,
  TDirection extends PortDirection,
  TCategory extends string = string,
>(runtime: DirectedPortRuntime<TName>): DirectedPort<TService, TName, TDirection, TCategory>;
export function createDirectedPortImpl<TName extends string>(
  runtime: DirectedPortRuntime<TName>
): object {
  return runtime;
}

// =============================================================================
// Internal Type Guard Helpers
// =============================================================================

/**
 * Checks if an object has the direction brand symbol.
 * @internal
 */
function hasDirectionBrand(obj: object): obj is { readonly [DIRECTION_BRAND]: PortDirection } {
  return DIRECTION_BRAND in obj;
}

/**
 * Checks if an object has the metadata key symbol.
 * @internal
 */
function hasMetadataKey(obj: object): obj is { readonly [METADATA_KEY]: PortMetadata } {
  return METADATA_KEY in obj;
}

// =============================================================================
// Public Type Guards
// =============================================================================

/**
 * Runtime type guard that checks if a port is a DirectedPort.
 *
 * @param port - The port to check
 * @returns `true` if the port has direction branding
 *
 * @example
 * ```typescript
 * const inbound = port<Logger>()({ name: 'Logger', direction: 'inbound' });
 *
 * isDirectedPort(inbound); // true
 *
 * if (isDirectedPort(port)) {
 *   // TypeScript narrows: port is DirectedPort<unknown, string, PortDirection>
 *   const direction = getPortDirection(port);
 * }
 * ```
 */
export function isDirectedPort(
  port: Port<unknown, string>
): port is DirectedPort<unknown, string, PortDirection> {
  return (
    hasDirectionBrand(port) &&
    (port[DIRECTION_BRAND] === "inbound" || port[DIRECTION_BRAND] === "outbound")
  );
}

/**
 * Runtime type guard that checks if a port is an InboundPort.
 *
 * @param port - The port to check
 * @returns `true` if the port is an inbound directed port
 *
 * @example
 * ```typescript
 * const inbound = port<UserService>()({ name: 'UserService', direction: 'inbound' });
 * const outbound = port<UserRepo>()({ name: 'UserRepo', direction: 'outbound' });
 *
 * isInboundPort(inbound); // true
 * isInboundPort(outbound); // false
 *
 * if (isInboundPort(port)) {
 *   // TypeScript narrows: port is InboundPort<unknown, string>
 * }
 * ```
 */
export function isInboundPort(port: Port<unknown, string>): port is InboundPort<unknown, string> {
  return hasDirectionBrand(port) && port[DIRECTION_BRAND] === "inbound";
}

/**
 * Runtime type guard that checks if a port is an OutboundPort.
 *
 * @param port - The port to check
 * @returns `true` if the port is an outbound directed port
 *
 * @example
 * ```typescript
 * const inbound = port<UserService>()({ name: 'UserService', direction: 'inbound' });
 * const outbound = port<UserRepo>()({ name: 'UserRepo', direction: 'outbound' });
 *
 * isOutboundPort(outbound); // true
 * isOutboundPort(inbound); // false
 *
 * if (isOutboundPort(port)) {
 *   // TypeScript narrows: port is OutboundPort<unknown, string>
 * }
 * ```
 */
export function isOutboundPort(port: Port<unknown, string>): port is OutboundPort<unknown, string> {
  return hasDirectionBrand(port) && port[DIRECTION_BRAND] === "outbound";
}

// =============================================================================
// Accessor Functions
// =============================================================================

/**
 * Gets the direction of a port, if it's a DirectedPort.
 *
 * @param port - The port to inspect
 * @returns The direction ('inbound' or 'outbound'), or `undefined` if not a DirectedPort
 *
 * @example
 * ```typescript
 * const inbound = port<Logger>()({ name: 'Logger', direction: 'inbound' });
 * const outbound = port<Logger>()({ name: 'Logger' }); // defaults to outbound
 *
 * getPortDirection(inbound); // 'inbound'
 * getPortDirection(outbound); // 'outbound'
 * ```
 */
export function getPortDirection(port: Port<unknown, string>): PortDirection | undefined {
  if (hasDirectionBrand(port)) {
    return port[DIRECTION_BRAND];
  }
  return undefined;
}

/**
 * Gets the metadata of a port, if it's a DirectedPort.
 *
 * @param port - The port to inspect
 * @returns The PortMetadata object, or `undefined` if not a DirectedPort
 *
 * @example
 * ```typescript
 * const port = port<Logger>()({
 *   name: 'Logger',
 *   direction: 'inbound',
 *   description: 'Application logging',
 *   category: 'infrastructure',
 * });
 *
 * const meta = getPortMetadata(port);
 * // { description: 'Application logging', category: 'infrastructure', tags: [] }
 * ```
 */
export function getPortMetadata(port: Port<unknown, string>): PortMetadata | undefined {
  if (hasMetadataKey(port)) {
    return port[METADATA_KEY];
  }
  return undefined;
}

// =============================================================================
// Re-exports for Convenience
// =============================================================================

export type {
  Port,
  PortDirection,
  PortMetadata,
  DirectedPort,
  InboundPort,
  OutboundPort,
  IsDirectedPort,
  InferPortDirection,
  InferPortMetadata,
  InferPortCategory,
} from "./types.js";
