import type { Port } from "@hex-di/ports";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { MiddlewareHandler } from "hono";
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
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
>(
  container: Container<TProvides, TAsyncPorts, TPhase>,
  options: ScopeMiddlewareOptions<ScopeKey, ContainerKey> = {}
): MiddlewareHandler<HexHonoEnv<TProvides, TAsyncPorts, TPhase, ScopeKey, ContainerKey>> {
  const scopeKey = (options.scopeKey ?? DEFAULT_SCOPE_KEY) as ScopeKey;
  const containerKey = (options.containerKey ?? DEFAULT_CONTAINER_KEY) as ContainerKey;
  type Variables = HexHonoEnv<TProvides, TAsyncPorts, TPhase, ScopeKey, ContainerKey>["Variables"];

  const middleware: MiddlewareHandler<HexHonoEnv<TProvides, TAsyncPorts, TPhase, ScopeKey, ContainerKey>> = async (
    context,
    next
  ) => {
    const scope = container.createScope();
    const set = (context as unknown as { set: (key: string, value: unknown) => void }).set.bind(context);
    set(containerKey, container);
    set(scopeKey, scope);

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
