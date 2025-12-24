import type { Port } from "@hex-di/ports";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { MiddlewareHandler } from "hono";
import { setContextVariable, createContextVariableKey } from "@hex-di/runtime";
import { DEFAULT_CONTAINER_KEY, DEFAULT_SCOPE_KEY } from "./constants.js";
import type { HexHonoEnv } from "./types.js";

/**
 * Options for customizing the context keys used by the middleware.
 */
export interface ScopeMiddlewareOptions<
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
> {
  /**
   * Context key used to store the per-request scope.
   * Defaults to `hexScope`.
   */
  scopeKey?: ScopeKey;

  /**
   * Context key used to store the root container.
   * Defaults to `hexContainer`.
   */
  containerKey?: ContainerKey;
}

/**
 * Create Hono middleware that attaches a HexDI scope to each request.
 *
 * The middleware:
 * - Creates a new scope for every request
 * - Exposes the scope and container on the Hono Context (customizable keys)
 * - Disposes the scope after the handler completes (even on errors)
 */
export function createScopeMiddleware<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>,
  options: ScopeMiddlewareOptions<ScopeKey, ContainerKey> = {}
): MiddlewareHandler<HexHonoEnv<TProvides, TExtends, TAsyncPorts, TPhase, ScopeKey, ContainerKey>> {
  const scopeKey = (options.scopeKey ?? DEFAULT_SCOPE_KEY) as ScopeKey;
  const containerKey = (options.containerKey ?? DEFAULT_CONTAINER_KEY) as ContainerKey;

  const middleware: MiddlewareHandler<
    HexHonoEnv<TProvides, TExtends, TAsyncPorts, TPhase, ScopeKey, ContainerKey>
  > = async (context, next) => {
    const scope = container.createScope();

    // Create branded keys for type-safe context access
    const scopeKey_branded = createContextVariableKey<typeof scope>(scopeKey);
    const containerKey_branded = createContextVariableKey<typeof container>(containerKey);

    // Use type-safe setters instead of unsafe casts
    setContextVariable(context, containerKey_branded, container);
    setContextVariable(context, scopeKey_branded, scope);

    let handlerError: unknown;
    let disposeError: unknown;

    try {
      await next();
    } catch (error) {
      handlerError = error;
    }

    try {
      await scope.dispose();
    } catch (error) {
      disposeError = error;
    }

    if (handlerError !== undefined && disposeError !== undefined) {
      throw new AggregateError(
        [handlerError, disposeError],
        "Hono handler failed and scope disposal also failed"
      );
    }

    if (handlerError !== undefined) {
      throw handlerError;
    }

    if (disposeError !== undefined) {
      throw disposeError;
    }
  };

  return middleware;
}
