import type { Port, InferService } from "@hex-di/core";
import type { Container, ContainerPhase, Scope } from "@hex-di/runtime";
import type { Context } from "hono";
import { getContextVariable, createContextVariableKey } from "@hex-di/runtime";
import { DEFAULT_CONTAINER_KEY, DEFAULT_SCOPE_KEY } from "./constants.js";
import { MissingContainerError, MissingScopeError } from "./errors.js";
type GenericEnv = { Variables: object };

/**
 * Retrieve the HexDI scope from the Hono context.
 *
 * Throws {@link MissingScopeError} when the middleware was not registered.
 */
export function getScope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  _ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
  E extends GenericEnv = GenericEnv,
>(context: Context<E>, scopeKey?: ScopeKey): Scope<TProvides, TAsyncPorts, TPhase> {
  const key = (scopeKey ?? DEFAULT_SCOPE_KEY) as ScopeKey;
  const brandedKey = createContextVariableKey<Scope<TProvides, TAsyncPorts, TPhase>>(key);
  const scope = getContextVariable(context, brandedKey);

  if (scope === undefined) {
    throw new MissingScopeError(key);
  }

  return scope;
}

/**
 * Retrieve the HexDI container from the Hono context.
 *
 * Throws {@link MissingContainerError} when the middleware was not registered.
 */
export function getContainer<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  _ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
  E extends GenericEnv = GenericEnv,
>(
  context: Context<E>,
  containerKey?: ContainerKey
): Container<TProvides, TExtends, TAsyncPorts, TPhase> {
  const key = (containerKey ?? DEFAULT_CONTAINER_KEY) as ContainerKey;
  const brandedKey =
    createContextVariableKey<Container<TProvides, TExtends, TAsyncPorts, TPhase>>(key);
  const container = getContextVariable(context, brandedKey);

  if (container === undefined) {
    throw new MissingContainerError(key);
  }

  return container;
}

/**
 * Resolve a port from the per-request scope stored on the context.
 */
export function resolvePort<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
  P extends TProvides = TProvides,
  E extends GenericEnv = GenericEnv,
>(context: Context<E>, port: P, scopeKey?: ScopeKey): InferService<P> {
  const scope = getScope<TProvides, TAsyncPorts, TPhase, ScopeKey, ContainerKey, E>(
    context,
    scopeKey
  );
  const resolve = scope.resolve as (target: P) => InferService<P>;
  return resolve(port);
}

/**
 * Resolve a port from the per-request scope using async resolution.
 */
export function resolvePortAsync<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
  P extends TProvides = TProvides,
  E extends GenericEnv = GenericEnv,
>(context: Context<E>, port: P, scopeKey?: ScopeKey): Promise<InferService<P>> {
  const scope = getScope<TProvides, TAsyncPorts, TPhase, ScopeKey, ContainerKey, E>(
    context,
    scopeKey
  );
  return scope.resolveAsync(port);
}
