/**
 * Port Factory Module
 *
 * Provides factory functions for creating typed port tokens with direction
 * and metadata support.
 *
 * @packageDocumentation
 */

import type {
  Port,
  PortDirection,
  PortMetadata,
  DirectedPort,
  CreatePortConfig,
  SuggestedCategory,
} from "./types.js";
import { DIRECTION_BRAND, METADATA_KEY, createDirectedPortImpl } from "./directed.js";
import type { DirectedPortRuntime } from "./directed.js";

// =============================================================================
// Internal Port Creation Helper (for legacy API)
// =============================================================================

/**
 * Runtime representation of a Port object.
 *
 * At runtime, Port objects only contain `__portName`. The `__brand` property
 * exists only at the type level for nominal typing (phantom type pattern).
 *
 * @internal
 */
interface PortRuntime<TName extends string> {
  readonly __portName: TName;
}

/**
 * Creates a Port value with phantom type parameters.
 *
 * @deprecated Use createPort() with object config instead.
 * @internal
 */
function unsafeCreatePort<TService, TName extends string>(name: TName): Port<TService, TName>;
function unsafeCreatePort<TName extends string>(name: TName): PortRuntime<TName> {
  return Object.freeze({ __portName: name });
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
 * **Best Practice:** Always specify direction explicitly for clarity:
 * ```typescript
 * // Explicit direction (recommended)
 * const LoggerPort = createPort<Logger>({ name: 'Logger', direction: 'outbound' });
 * const UserServicePort = createPort<UserService>({ name: 'UserService', direction: 'inbound' });
 * ```
 *
 * @typeParam TService - The service interface type (phantom type, explicitly provided)
 * @typeParam TName - The literal string type for the port name (inferred from config.name)
 *
 * @param config - Configuration object with name, optional direction, and metadata
 * @returns A frozen DirectedPort with the specified type parameters
 *
 * @remarks
 * - Direction defaults to 'outbound' at both runtime and type level
 * - Use the `const` modifier on TName for literal type inference
 * - Metadata is accessed via `getPortMetadata()` from directed.ts
 * - `tags` returns `[]` when not specified (not undefined)
 * - `description` and `category` return `undefined` when not specified
 *
 * @example Basic usage (defaults to outbound)
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Direction defaults to 'outbound'
 * const LoggerPort = createPort<Logger>({ name: 'Logger' });
 * // Type: DirectedPort<Logger, 'Logger', 'outbound'>
 *
 * getPortDirection(LoggerPort); // 'outbound'
 * ```
 *
 * @example Inbound port
 * ```typescript
 * interface UserService {
 *   createUser(data: UserData): Promise<User>;
 * }
 *
 * const UserServicePort = createPort<UserService>({
 *   name: 'UserService',
 *   direction: 'inbound',
 * });
 * // Type: DirectedPort<UserService, 'UserService', 'inbound'>
 * ```
 *
 * @example Full metadata
 * ```typescript
 * const UserRepoPort = createPort<UserRepository>({
 *   name: 'UserRepository',
 *   direction: 'outbound',
 *   description: 'User persistence operations',
 *   category: 'persistence',
 *   tags: ['user', 'database', 'core'],
 * });
 *
 * const meta = getPortMetadata(UserRepoPort);
 * // { description: 'User persistence...', category: 'persistence', tags: ['user', ...] }
 * ```
 */

/**
 * Configuration for createPort with inferred name type.
 * @internal
 */
interface CreatePortConfigWithName<TName extends string> {
  readonly name: TName;
  readonly direction?: PortDirection;
  readonly description?: string;
  readonly category?: SuggestedCategory;
  readonly tags?: readonly string[];
}

/**
 * Infers direction from config, defaulting to 'outbound'.
 * @internal
 */
type InferDirection<TConfig> = TConfig extends { direction: infer D extends PortDirection }
  ? D
  : "outbound";

// Overload 1: NEW API - Object config (name and direction inferred from config)
// Default for TConfig enables calling with single type param: createPort<Service>({ name: 'X' })
export function createPort<
  TService,
  const TConfig extends CreatePortConfigWithName<string> = CreatePortConfigWithName<string>,
>(config: TConfig): DirectedPort<TService, TConfig["name"], InferDirection<TConfig>>;

// Overload 2: LEGACY API - String-based (deprecated)
/**
 * @deprecated Use `createPort({ name: 'X' })` instead.
 */
export function createPort<const TName extends string, TService>(
  name: TName
): Port<TService, TName>;

// Implementation
export function createPort<TService>(
  configOrName: CreatePortConfigWithName<string> | string
): DirectedPort<TService, string, PortDirection> | Port<TService, string> {
  // Legacy string-based API
  if (typeof configOrName === "string") {
    return unsafeCreatePort<TService, string>(configOrName);
  }

  // New object config API
  const config = configOrName;
  const direction = config.direction ?? "outbound";
  const metadata: PortMetadata = Object.freeze({
    description: config.description,
    category: config.category,
    tags: config.tags ?? [], // Return empty array when not specified
  });

  const runtime: DirectedPortRuntime<string> = Object.freeze({
    __portName: config.name,
    [DIRECTION_BRAND]: direction,
    [METADATA_KEY]: metadata,
  });

  return createDirectedPortImpl<TService, string, PortDirection>(runtime);
}

// =============================================================================
// Legacy APIs (deprecated)
// =============================================================================

/**
 * Creates a typed port token with partial type inference.
 *
 * @deprecated Use `createPort({ name: 'X' })` instead.
 * This curried API will be removed in the next version.
 *
 * @example Migration
 * ```typescript
 * // Before (deprecated)
 * const LoggerPort = port<Logger>()('Logger');
 *
 * // After
 * const LoggerPort = createPort<Logger>({ name: 'Logger' });
 * ```
 */
export function port<TService>() {
  return <const TName extends string>(name: TName): Port<TService, TName> => {
    return unsafeCreatePort<TService, TName>(name);
  };
}
