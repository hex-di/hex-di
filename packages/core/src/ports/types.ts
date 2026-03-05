/**
 * Port Types Module
 *
 * Provides the foundational Port type and related type utilities
 * for typed, branded port tokens.
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of Port types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing,
 * ensuring that two ports with different names are type-incompatible
 * even if their service interfaces are structurally identical.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 */
declare const __brand: unique symbol;

// =============================================================================
// Port Type
// =============================================================================

/**
 * A branded port type that serves as a compile-time contract for a service interface.
 *
 * The Port type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two ports are only compatible if they have:
 * 1. The same service interface type `T`
 * 2. The same port name `TName`
 *
 * @typeParam TName - The literal string type for the port name (defaults to `string`)
 * @typeParam T - The service interface type (phantom type - exists only at compile time)
 *
 * @remarks
 * - The `__brand` property carries both the service type and name in a tuple
 * - The `__portName` property exposes the name for debugging and error messages
 * - Both properties are readonly to prevent modification
 * - The brand symbol value is `undefined` at runtime (zero overhead)
 *
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link InferService} - Utility to extract the service type from a port
 * @see {@link InferPortName} - Utility to extract the name type from a port
 *
 * @example Direct type usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create typed port tokens
 * type ConsoleLoggerPort = Port<'ConsoleLogger', Logger>;
 * type FileLoggerPort = Port<'FileLogger', Logger>;
 *
 * // These are type-incompatible despite same interface
 * declare const consolePort: ConsoleLoggerPort;
 * declare const filePort: FileLoggerPort;
 * // consolePort = filePort; // Type error!
 * ```
 *
 * @example With createPort (recommended)
 * ```typescript
 * // Use createPort for value + type duality
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerPortType = typeof LoggerPort;
 * ```
 */
export type Port<TName extends string, T> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [PortName, ServiceType] at the type level.
   * Value is undefined at runtime.
   */
  readonly [__brand]: [TName, T];

  /**
   * The port name, exposed for debugging and error messages.
   */
  readonly __portName: TName;
};

// =============================================================================
// Error Types for Type Utilities
// =============================================================================

/**
 * Error type returned when type inference utilities receive a non-Port type.
 *
 * This branded error provides actionable guidance in IDE tooltips when users
 * accidentally pass incorrect types to InferService or InferPortName.
 *
 * @typeParam T - The type that was passed (preserved for debugging)
 *
 * @remarks
 * Instead of returning opaque `never`, this error type provides:
 * - Clear error message explaining what was expected
 * - The actual type that was received (for debugging)
 * - A hint about common mistakes (e.g., forgetting `typeof`)
 *
 * @example IDE tooltip when misused
 * ```typescript
 * type Result = InferService<string>;
 * // Hovering shows:
 * // {
 * //   __errorBrand: "NotAPortError";
 * //   __message: "Expected a Port type created with createPort() or port()";
 * //   __received: string;
 * //   __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
 * // }
 * ```
 */
export type NotAPortError<T> = {
  readonly __errorBrand: "NotAPortError";
  readonly __message: "Expected a Port type created with createPort() or port()";
  readonly __received: T;
  readonly __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
};

// =============================================================================
// Type-Level Utilities
// =============================================================================

/**
 * Extracts the service interface type from a Port type.
 *
 * This utility type uses conditional type inference to extract the phantom
 * type parameter `T` from a `Port<TName, T>`. If the provided type is not
 * a valid Port, it returns a descriptive `NotAPortError` type.
 *
 * @typeParam P - The Port type to extract the service from
 * @returns The service interface type `T`, or `NotAPortError<P>` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferPortName} - Companion utility to extract the port name
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link NotAPortError} - The error type returned for invalid inputs
 *
 * @example Successful extraction
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerService = InferService<typeof LoggerPort>;
 * // LoggerService = Logger
 * ```
 *
 * @example Error case (descriptive error type)
 * ```typescript
 * type Invalid = InferService<string>;
 * // Invalid = NotAPortError<string>
 * // IDE shows: { __errorBrand: "NotAPortError", __message: "Expected a Port...", ... }
 * ```
 */
export type InferService<P> = P extends Port<infer _TName, infer T> ? T : NotAPortError<P>;

/**
 * Extracts the port name literal type from a Port type.
 *
 * This utility type uses conditional type inference to extract the name
 * type parameter `TName` from a `Port<TName, T>`. If the provided type is not
 * a valid Port, it returns a descriptive `NotAPortError` type.
 *
 * @typeParam P - The Port type to extract the name from
 * @returns The port name literal type `TName`, or `NotAPortError<P>` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferService} - Companion utility to extract the service type
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link NotAPortError} - The error type returned for invalid inputs
 *
 * @example Successful extraction
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type PortName = InferPortName<typeof LoggerPort>;
 * // PortName = 'Logger'
 * ```
 *
 * @example Error case (descriptive error type)
 * ```typescript
 * type Invalid = InferPortName<number>;
 * // Invalid = NotAPortError<number>
 * // IDE shows: { __errorBrand: "NotAPortError", __message: "Expected a Port...", ... }
 * ```
 */
export type InferPortName<P> = P extends Port<infer TName, infer _T> ? TName : NotAPortError<P>;

// =============================================================================
// Directed Port Brand Symbols
// =============================================================================

/**
 * Unique symbol used for type-level direction branding.
 *
 * This symbol enables compile-time discrimination between inbound and outbound
 * ports while having no runtime presence. Part of the phantom type pattern.
 *
 * @internal
 */
declare const __directionBrand: unique symbol;

/**
 * Unique symbol used for type-level metadata association.
 *
 * Associates PortMetadata with a port at the type level for IDE extraction.
 *
 * @internal
 */
declare const __metadataKey: unique symbol;

/**
 * Unique symbol used for type-level category branding.
 *
 * Enables compile-time discrimination of ports by category (e.g., "domain",
 * "library-inspector") while having no runtime presence. Part of the phantom type pattern.
 *
 * @internal
 */
declare const __categoryBrand: unique symbol;

// =============================================================================
// Port Direction and Metadata
// =============================================================================

/**
 * Discriminator for hexagonal architecture port types.
 *
 * - `'inbound'` - Driving ports (use cases, primary adapters)
 * - `'outbound'` - Driven ports (infrastructure, secondary adapters)
 *
 * @see {@link DirectedPort} - The port type that carries direction
 * @see {@link createInboundPort} - Factory for inbound ports
 * @see {@link createOutboundPort} - Factory for outbound ports
 */
export type PortDirection = "inbound" | "outbound";

/**
 * Optional metadata for documenting ports.
 *
 * Metadata provides human-readable documentation that can be used for:
 * - IDE tooltips and documentation
 * - Dependency graph visualization
 * - API documentation generation
 * - Runtime operation completeness verification (via `methods`)
 *
 * All properties are optional and readonly.
 *
 * @example
 * ```typescript
 * const UserServicePort = createInboundPort<'UserService', UserService>({
 *   name: 'UserService',
 *   description: 'Handles user CRUD operations',
 *   category: 'domain',
 *   tags: ['user', 'crud', 'core'],
 *   methods: ['getUser', 'createUser', 'deleteUser'],
 * });
 * ```
 */
export interface PortMetadata {
  /** Human-readable description of the port's purpose */
  readonly description?: string;
  /** Categorical grouping for organization */
  readonly category?: string;
  /** Searchable tags for filtering and discovery */
  readonly tags?: readonly string[];
  /**
   * Runtime method names for operation completeness verification.
   *
   * When provided, the build pipeline can verify at runtime that adapter
   * factories produce objects implementing all listed methods. This is
   * opt-in: ports without `methods` skip runtime completeness checks.
   */
  readonly methods?: readonly string[];
}

// =============================================================================
// DirectedPort Type
// =============================================================================

/**
 * A port with hexagonal architecture direction and optional metadata.
 *
 * DirectedPort extends the base Port type with additional type-level branding:
 * - `TDirection` - Whether this is an inbound (driving) or outbound (driven) port
 * - Metadata association for documentation purposes
 *
 * DirectedPorts are structurally compatible with base Ports, enabling gradual
 * adoption without breaking existing code.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type (phantom type)
 * @typeParam TDirection - 'inbound' or 'outbound'
 *
 * @see {@link InboundPort} - Convenience alias for inbound directed ports
 * @see {@link OutboundPort} - Convenience alias for outbound directed ports
 * @see {@link createInboundPort} - Factory for creating inbound ports
 * @see {@link createOutboundPort} - Factory for creating outbound ports
 *
 * @example
 * ```typescript
 * // DirectedPort is assignable to Port (backward compatible)
 * const port: DirectedPort<'Logger', Logger, 'inbound'> = createInboundPort({
 *   name: 'Logger',
 * });
 * const basePort: Port<'Logger', Logger> = port; // OK
 * ```
 */
export type DirectedPort<
  TName extends string,
  TService,
  TDirection extends PortDirection,
  TCategory extends string = string,
> = Port<TName, TService> & {
  readonly [__directionBrand]: TDirection;
  readonly [__metadataKey]: PortMetadata;
  readonly [__categoryBrand]: TCategory;
};

// =============================================================================
// Convenience Aliases
// =============================================================================

/**
 * An inbound (driving) port for use case interfaces.
 *
 * Inbound ports define the application's primary API - what the outside world
 * can ask the application to do. They're implemented by use case handlers.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 *
 * @example
 * ```typescript
 * interface UserService {
 *   createUser(data: UserData): Promise<User>;
 *   getUser(id: string): Promise<User>;
 * }
 *
 * const UserServicePort = createInboundPort<'UserService', UserService>({
 *   name: 'UserService',
 *   description: 'User management use cases',
 *   category: 'domain',
 * });
 * ```
 */
export type InboundPort<
  TName extends string,
  TService,
  TCategory extends string = string,
> = DirectedPort<TName, TService, "inbound", TCategory>;

/**
 * An outbound (driven) port for infrastructure interfaces.
 *
 * Outbound ports define what the application needs from external systems.
 * They're implemented by infrastructure adapters (databases, APIs, etc.).
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TService - The service interface type
 *
 * @example
 * ```typescript
 * interface UserRepository {
 *   save(user: User): Promise<void>;
 *   findById(id: string): Promise<User | null>;
 * }
 *
 * const UserRepositoryPort = createOutboundPort<'UserRepository', UserRepository>({
 *   name: 'UserRepository',
 *   description: 'User persistence operations',
 *   category: 'infrastructure',
 * });
 * ```
 */
export type OutboundPort<
  TName extends string,
  TService,
  TCategory extends string = string,
> = DirectedPort<TName, TService, "outbound", TCategory>;

// =============================================================================
// Type Predicates for DirectedPort
// =============================================================================

/**
 * Checks if a type is a DirectedPort.
 *
 * @typeParam TPort - The type to check
 * @returns `true` if TPort is a DirectedPort, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsDirectedPort<InboundPort<'Logger', Logger>>; // true
 * type B = IsDirectedPort<Port<'Logger', Logger>>;        // false
 * ```
 */
export type IsDirectedPort<TPort> = TPort extends {
  readonly [__directionBrand]: PortDirection;
}
  ? true
  : false;

/**
 * Extracts the direction from a DirectedPort.
 *
 * @typeParam P - A DirectedPort type
 * @returns The direction literal ('inbound' or 'outbound'), or `never` if not a DirectedPort
 *
 * @example
 * ```typescript
 * type Dir = InferPortDirection<InboundPort<'Logger', Logger>>;
 * // Dir = 'inbound'
 * ```
 */
export type InferPortDirection<P> = P extends {
  readonly [__directionBrand]: infer D;
}
  ? D
  : never;

/**
 * Extracts the metadata type from a DirectedPort.
 *
 * @typeParam P - A DirectedPort type
 * @returns The PortMetadata type, or `never` if not a DirectedPort
 *
 * @example
 * ```typescript
 * type Meta = InferPortMetadata<InboundPort<'Logger', Logger>>;
 * // Meta = PortMetadata
 * ```
 */
export type InferPortMetadata<P> = P extends { readonly [__metadataKey]: infer M } ? M : never;

/**
 * Extracts the category literal type from a DirectedPort.
 *
 * @typeParam P - A DirectedPort type
 * @returns The category literal (e.g., `"domain"`, `"library-inspector"`),
 *          `string` for uncategorized ports, or `never` if not a DirectedPort
 *
 * @example
 * ```typescript
 * const DomainPort = port<Logger>()({ name: 'Logger', category: 'domain' });
 * type Cat = InferPortCategory<typeof DomainPort>;
 * // Cat = 'domain'
 * ```
 */
export type InferPortCategory<P> = P extends { readonly [__categoryBrand]: infer C } ? C : never;

// =============================================================================
// Port Direction Filter Utilities
// =============================================================================

/**
 * Filters a union of ports to only those with 'inbound' direction.
 *
 * @typeParam P - A union of DirectedPort types
 * @returns Only the ports from the union that have direction 'inbound'
 *
 * @example
 * ```typescript
 * type AllPorts = LoggerPort | RequestPort | ResponsePort;
 * // Where RequestPort is inbound, others are outbound
 *
 * type Inbound = InboundPorts<AllPorts>;
 * // Inbound = RequestPort
 * ```
 */
export type InboundPorts<P> =
  P extends DirectedPort<infer N, infer S, "inbound", infer C>
    ? DirectedPort<N, S, "inbound", C>
    : never;

/**
 * Filters a union of ports to only those with 'outbound' direction.
 *
 * @typeParam P - A union of DirectedPort types
 * @returns Only the ports from the union that have direction 'outbound'
 *
 * @example
 * ```typescript
 * type AllPorts = LoggerPort | RequestPort | ResponsePort;
 * // Where LoggerPort and ResponsePort are outbound
 *
 * type Outbound = OutboundPorts<AllPorts>;
 * // Outbound = LoggerPort | ResponsePort
 * ```
 */
export type OutboundPorts<P> =
  P extends DirectedPort<infer N, infer S, "outbound", infer C>
    ? DirectedPort<N, S, "outbound", C>
    : never;

// =============================================================================
// createPort() Configuration Types
// =============================================================================

/**
 * Suggested category values for port organization with IDE autocomplete.
 *
 * Uses the `(string & {})` escape hatch pattern to preserve autocomplete
 * for suggested values while accepting any string value.
 *
 * @example
 * ```typescript
 * // IDE suggests: 'persistence', 'messaging', etc.
 * const category: SuggestedCategory = 'persistence';
 *
 * // But any string works
 * const custom: SuggestedCategory = 'my-custom-category';
 * ```
 */
export type SuggestedCategory =
  | "persistence"
  | "messaging"
  | "external-api"
  | "logging"
  | "configuration"
  | "domain"
  | "infrastructure"
  | "state"
  | "query"
  | "saga"
  | "flow"
  | "effect"
  | "library-inspector"
  | (string & {}); // Escape hatch - any string works with autocomplete

/**
 * Configuration object for creating a port with `createPort()`.
 *
 * @typeParam TName - The literal string type for the port name
 * @typeParam TDirection - The direction ('inbound' or 'outbound')
 *
 * @example
 * ```typescript
 * const config: CreatePortConfig<'Logger', 'outbound'> = {
 *   name: 'Logger',
 *   direction: 'outbound',
 *   description: 'Application logging',
 *   category: 'infrastructure',
 *   tags: ['logging', 'core'],
 * };
 * ```
 */
export interface CreatePortConfig<
  TName extends string,
  TDirection extends PortDirection,
  TCategory extends string = string,
> {
  /** The unique name for this port */
  readonly name: TName;
  /** The direction: 'inbound' (driving) or 'outbound' (driven). Defaults to 'outbound'. */
  readonly direction?: TDirection;
  /** Human-readable description of the port's purpose */
  readonly description?: string;
  /** Categorical grouping for organization */
  readonly category?: TCategory & SuggestedCategory;
  /** Searchable tags for filtering and discovery */
  readonly tags?: readonly string[];
  /** Runtime method names for operation completeness verification */
  readonly methods?: readonly string[];
}
