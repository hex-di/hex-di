/**
 * Standalone hook for resolving multiple ports at once.
 *
 * This hook provides a convenient way to resolve multiple dependencies
 * in a single call, returning a typed object with resolved services.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Port, InferService, InferPortName } from "@hex-di/core";
import { ResolverContext } from "../context/resolver-context.js";
import { MissingProviderError } from "../errors.js";

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Converts a readonly tuple of ports to a union type.
 *
 * @example
 * ```typescript
 * type Ports = TupleToUnion<readonly [typeof LoggerPort, typeof DbPort]>;
 * // typeof LoggerPort | typeof DbPort
 * ```
 */
type TupleToUnion<T extends readonly unknown[]> = T[number];

/**
 * Maps a union of Port types to an object type for dependency injection.
 *
 * @example
 * ```typescript
 * type Deps = DepsResult<typeof LoggerPort | typeof DbPort>;
 * // { Logger: LoggerService; Database: DatabaseService }
 * ```
 */
type DepsResult<TRequires> = [TRequires] extends [never]
  ? Record<string, never>
  : {
      [P in TRequires as InferPortName<P> & string]: InferService<P>;
    };

// =============================================================================
// useDeps Hook
// =============================================================================

/**
 * Hook that resolves multiple ports and returns a typed object.
 *
 * This hook provides a convenient alternative to calling `usePort` multiple
 * times. It resolves all requested ports and returns them in an object
 * keyed by port name.
 *
 * **Key Benefits:**
 * - Resolve multiple dependencies in one call
 * - Full type inference - deps object is correctly typed
 * - Clean destructuring syntax
 * - Uses `const` modifier for proper tuple inference
 *
 * @typeParam TRequires - Tuple of ports to resolve (inferred from arguments)
 *
 * @param requires - The ports to resolve (passed as separate arguments)
 * @returns Object with resolved services, keyed by port name
 *
 * @throws {MissingProviderError} If used outside ContainerProvider
 * @throws {DisposedScopeError} If the container or scope has been disposed
 * @throws {CircularDependencyError} If a circular dependency is detected
 * @throws {FactoryError} If an adapter's factory function throws
 *
 * @example Basic usage with destructuring
 * ```typescript
 * function MyComponent({ userId }: { userId: string }) {
 *   const { Logger, UserService } = useDeps(LoggerPort, UserServicePort);
 *
 *   const user = UserService.getUser(userId);
 *   Logger.info(`Rendering user: ${user.name}`);
 *
 *   return <div>{user.name}</div>;
 * }
 * ```
 *
 * @example Type safety
 * ```typescript
 * function MyComponent() {
 *   // TypeScript knows exactly what's in deps
 *   const deps = useDeps(LoggerPort, DatabasePort);
 *
 *   deps.Logger.info("hello");     // ✓ Logger is LoggerService
 *   deps.Database.query("...");    // ✓ Database is DatabaseService
 *   deps.Unknown.method();          // ✗ Type error - Unknown doesn't exist
 * }
 * ```
 *
 * @example Single dependency (still returns object)
 * ```typescript
 * function MyComponent() {
 *   const { Logger } = useDeps(LoggerPort);
 *   Logger.info("hello");
 * }
 * ```
 *
 * @example No dependencies (returns empty object)
 * ```typescript
 * function MyComponent() {
 *   const deps = useDeps(); // Record<string, never>
 *   return <div>No DI dependencies needed</div>;
 * }
 * ```
 */
export function useDeps<const TRequires extends readonly Port<unknown, string>[]>(
  ...requires: TRequires
): DepsResult<TupleToUnion<TRequires>> {
  // Get resolver context - throws if outside provider
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("useDeps", "ContainerProvider");
  }

  // Resolve all ports and build deps object
  const deps: Record<string, unknown> = {};
  for (const port of requires) {
    // Access port name via the __portName property (standard Port interface)
    const portName = port.__portName;
    deps[portName] = resolverContext.resolver.resolve(port);
  }

  return deps as DepsResult<TupleToUnion<TRequires>>;
}
