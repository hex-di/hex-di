/**
 * Port Factory Module
 *
 * Provides the unified createPort factory function for creating typed port
 * tokens with direction and metadata support.
 *
 * @packageDocumentation
 */

import type { PortDirection, PortMetadata, DirectedPort, SuggestedCategory } from "./types.js";
import { DIRECTION_BRAND, METADATA_KEY, createDirectedPortImpl } from "./directed.js";
import type { DirectedPortRuntime } from "./directed.js";

// =============================================================================
// Config Types
// =============================================================================

/**
 * Configuration for createPort.
 * @internal
 */
interface PortConfig {
  readonly name: string;
  readonly direction?: PortDirection;
  readonly description?: string;
  readonly category?: SuggestedCategory;
  readonly tags?: readonly string[];
}

// =============================================================================
// createPort - Unified Port Factory
// =============================================================================

/**
 * Creates a typed port token with direction and optional metadata.
 *
 * This is the unified API for creating ports in hexagonal architecture.
 * Direction defaults to `'outbound'` if not specified, as most ports represent
 * infrastructure dependencies (driven adapters).
 *
 * ## Type Inference Patterns
 *
 * **Full inference (service type is unknown):**
 * ```typescript
 * const LoggerPort = createPort({ name: 'Logger' });
 * // Type: DirectedPort<unknown, 'Logger', 'outbound'>
 * ```
 *
 * **Service and name explicit (preserves literal name):**
 * ```typescript
 * const LoggerPort = createPort<'Logger', Logger>({ name: 'Logger' });
 * // Type: DirectedPort<Logger, 'Logger', 'outbound'>
 * ```
 *
 * **Using port() builder (recommended - preserves literal name):**
 * ```typescript
 * const LoggerPort = port<Logger>()({ name: 'Logger' });
 * // Type: DirectedPort<Logger, 'Logger', 'outbound'>
 * ```
 *
 * @typeParam TService - The service interface type (defaults to unknown)
 * @typeParam TName - The literal string type for the port name (inferred from config.name)
 * @typeParam TDirection - The direction type (defaults to 'outbound')
 *
 * @param config - Configuration object with name, optional direction, and metadata
 * @returns A frozen DirectedPort with the specified type parameters
 *
 * @remarks
 * - Direction defaults to 'outbound' at both runtime and type level
 * - `tags` returns `[]` when not specified (not undefined)
 * - `description` and `category` return `undefined` when not specified
 */

// Overload 1: All four explicit including direction and category
// createPort<'Logger', Logger, 'inbound', 'domain'>({ name: 'Logger', direction: 'inbound', category: 'domain' })
export function createPort<
  const TName extends string,
  TService,
  const TDirection extends PortDirection,
  const TCategory extends string = string,
>(
  config: PortConfig & { name: TName; direction: TDirection; category?: TCategory }
): DirectedPort<TName, TService, TDirection, TCategory>;

// Overload 2: Name and service explicit, direction defaults to outbound
// createPort<'Logger', Logger>({ name: 'Logger' })
export function createPort<
  const TName extends string,
  TService,
  const TCategory extends string = string,
>(
  config: PortConfig & { name: TName; category?: TCategory }
): DirectedPort<TName, TService, "outbound", TCategory>;

// Overload 3: Full inference - TService is unknown, TName inferred from config
// createPort({ name: 'Logger' })
export function createPort<const TConfig extends PortConfig>(
  config: TConfig
): DirectedPort<
  TConfig["name"],
  unknown,
  TConfig extends { direction: infer D extends PortDirection } ? D : "outbound",
  TConfig extends { category: infer C extends string } ? C : string
>;

// Implementation
export function createPort<
  const TName extends string,
  TService,
  TDirection extends PortDirection,
  TCategory extends string,
>(config: PortConfig & { name: TName }): DirectedPort<TName, TService, TDirection, TCategory> {
  const direction = (config.direction ?? "outbound") as TDirection;
  const metadata: PortMetadata = Object.freeze({
    description: config.description,
    category: config.category,
    tags: config.tags ?? [], // Return empty array when not specified
  });

  const runtime: DirectedPortRuntime<TName> = Object.freeze({
    __portName: config.name,
    [DIRECTION_BRAND]: direction,
    [METADATA_KEY]: metadata,
  });

  return createDirectedPortImpl<TName, TService, TDirection, TCategory>(runtime);
}

// =============================================================================
// port - Builder for Service-Typed Ports with Full Name Inference
// =============================================================================

/**
 * Builder function for creating ports with a specified service type
 * while preserving literal name inference from the config object.
 *
 * Use this when you need to specify the service type and want TypeScript
 * to infer the port name as a literal type from the config.
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Name "Logger" is inferred as literal type
 * const LoggerPort = port<Logger>()({ name: "Logger" });
 * // Type: DirectedPort<"Logger", Logger, "outbound">
 *
 * // With direction
 * const RequestPort = port<Request>()({ name: "Request", direction: "inbound" });
 * // Type: DirectedPort<"Request", Request, "inbound">
 * ```
 *
 * @typeParam TService - The service interface type
 * @returns A function that accepts a config and returns a DirectedPort
 */
export function port<TService>(): <const TConfig extends PortConfig>(
  config: TConfig
) => DirectedPort<
  TConfig["name"],
  TService,
  TConfig extends { direction: infer D extends PortDirection } ? D : "outbound",
  TConfig extends { category: infer C extends string } ? C : string
> {
  return <const TConfig extends PortConfig>(config: TConfig) => {
    return createPort(config) as DirectedPort<
      TConfig["name"],
      TService,
      TConfig extends { direction: infer D extends PortDirection } ? D : "outbound",
      TConfig extends { category: infer C extends string } ? C : string
    >;
  };
}
