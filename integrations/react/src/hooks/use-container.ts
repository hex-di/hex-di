/**
 * useContainer hook for accessing the nearest DI container (root or child).
 *
 * This hook provides direct access to the Container or ChildContainer instance,
 * which is useful for advanced scenarios like creating manual scopes or accessing
 * container-level operations.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Port } from "@hex-di/core";
import { ContainerContext } from "../context/container-context.js";
import { MissingProviderError } from "../errors.js";
import type { Resolver } from "../types/core.js";
import { toTypedResolver } from "../internal/runtime-refs.js";

/**
 * Hook that returns the nearest Container or ChildContainer from the nearest ContainerProvider.
 *
 * Use this hook when you need direct access to the container for advanced
 * operations like creating manual scopes, accessing the dispose method,
 * or other container-level functionality.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @returns A Resolver interface for service resolution (may be Container or ChildContainer)
 *
 * @throws {MissingProviderError} If called outside a ContainerProvider.
 *   This indicates a programming error - components using useContainer
 *   must be descendants of a ContainerProvider.
 *
 * @remarks
 * - For service resolution, prefer `usePort` instead
 * - The returned container is the same reference across renders
 * - This is an escape hatch - most code should use `usePort`
 * - When nested inside a ContainerProvider with a ChildContainer,
 *   this returns the ChildContainer (nearest container in tree)
 * - Returns Resolver<TProvides> which provides resolve, resolveAsync,
 *   createScope, and dispose methods without conditional type complexity.
 *
 * @example Basic usage
 * ```tsx
 * function RequestHandler() {
 *   const container = useContainer();
 *   const [scope] = useState(() => container.createScope());
 *
 *   useEffect(() => {
 *     return () => { scope.dispose(); };
 *   }, [scope]);
 *
 *   return (
 *     <ScopeProvider scope={scope}>
 *       <RequestContent />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 */
export function useContainer<
  TProvides extends Port<string, unknown> = Port<string, unknown>,
>(): Resolver<TProvides> {
  const context = useContext(ContainerContext);

  if (context === null) {
    throw new MissingProviderError("useContainer", "ContainerProvider");
  }

  // Return the nearest container (may be root Container or ChildContainer)
  // Both Container and ChildContainer satisfy the Resolver interface.
  // toTypedResolver bridges RuntimeContainerRef to Resolver<TProvides>.
  return toTypedResolver<TProvides>(context.container);
}
