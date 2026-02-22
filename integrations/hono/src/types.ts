import type { Port } from "@hex-di/core";
import type { Container, ContainerPhase, Scope } from "@hex-di/runtime";
import type { Bindings, Env, Variables } from "hono/types";
import { DEFAULT_CONTAINER_KEY, DEFAULT_SCOPE_KEY } from "./constants.js";

/**
 * Variables added to the Hono Context by the HexDI middleware.
 *
 * @typeParam TProvides - Ports available in the container/scope
 * @typeParam TExtends - Ports inherited from parent container
 * @typeParam TAsyncPorts - Ports with async factories (phantom type)
 * @typeParam TPhase - Container initialization phase
 * @typeParam ScopeKey - Context key used to store the scope
 * @typeParam ContainerKey - Context key used to store the container
 */
export type HexHonoVariables<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
> = Record<ContainerKey, Container<TProvides, TExtends, TAsyncPorts, TPhase>> &
  Record<ScopeKey, Scope<TProvides | TExtends, TAsyncPorts, TPhase>>;

/**
 * Minimal Env shape augmented with HexDI variables.
 *
 * Use this as the Env generic when constructing a Hono app:
 * `const app = new Hono<HexHonoEnv<AppPorts>>()`.
 */
export type HexHonoEnv<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
  TBindings extends Bindings = Bindings,
> = {
  Bindings?: TBindings;
  Variables: HexHonoVariables<TProvides, TExtends, TAsyncPorts, TPhase, ScopeKey, ContainerKey>;
};

/**
 * Utility type to merge HexDI variables into an existing Hono Env.
 *
 * @example
 * type AppEnv = WithHexDi<{ Variables: { requestId: string } }, AppPorts>;
 */
export type WithHexDi<
  E extends Env,
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "uninitialized",
  ScopeKey extends string = typeof DEFAULT_SCOPE_KEY,
  ContainerKey extends string = typeof DEFAULT_CONTAINER_KEY,
> = Omit<E, "Variables"> & {
  Variables: (E["Variables"] extends object ? E["Variables"] : Variables) &
    HexHonoVariables<TProvides, TExtends, TAsyncPorts, TPhase, ScopeKey, ContainerKey>;
};
