/**
 * Query Adapter Factory
 *
 * Creates standard HexDI Adapter objects for query ports.
 * The adapter's factory returns a QueryFetcher — the service type
 * of the query port — making query adapters first-class participants
 * in the DI container.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Lifetime } from "@hex-di/core";
import type { Port, InferService } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type { AnyQueryPort } from "../ports/query-port.js";
import { bridgeCreateAdapter } from "./adapter-bridge.js";

// =============================================================================
// QueryAdapterConfig
// =============================================================================

/**
 * Configuration for creating a query adapter without dependencies.
 */
export interface QueryAdapterConfigNoDeps<TPort extends AnyQueryPort> {
  readonly factory: () => InferService<TPort>;
  readonly lifetime?: Lifetime;
  readonly requires?: undefined;
}

/**
 * Configuration for creating a query adapter with dependencies.
 */
export interface QueryAdapterConfigWithDeps<
  TPort extends AnyQueryPort,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
> {
  readonly requires: TRequires;
  readonly factory: (deps: PortDeps<TRequires>) => InferService<TPort>;
  readonly lifetime?: Lifetime;
}

// =============================================================================
// createQueryAdapter
// =============================================================================

/**
 * Creates a standard HexDI Adapter for a query port.
 *
 * The factory returns a `QueryFetcher<TData, TParams, TError>`, which is
 * the service type of the port (`InferService<QueryPort<...>>`).
 *
 * @example No dependencies
 * ```typescript
 * const UsersAdapter = createQueryAdapter(UsersPort, {
 *   factory: () =>
 *     (params, { signal }) =>
 *       ResultAsync.fromPromise(fetch("/api/users", { signal }), classifyError),
 * });
 * ```
 *
 * @example With dependencies
 * ```typescript
 * const UsersAdapter = createQueryAdapter(UsersPort, {
 *   requires: [HttpClientPort],
 *   factory: ({ HttpClient }) =>
 *     (params, { signal }) =>
 *       ResultAsync.fromPromise(HttpClient.get("/api/users"), classifyError),
 * });
 * ```
 */

// Overload: no requires
export function createQueryAdapter<TPort extends AnyQueryPort>(
  port: TPort,
  config: QueryAdapterConfigNoDeps<TPort>
): AdapterConstraint;

// Overload: with requires
export function createQueryAdapter<
  TPort extends AnyQueryPort,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
>(port: TPort, config: QueryAdapterConfigWithDeps<TPort, TRequires>): AdapterConstraint;

// Implementation
export function createQueryAdapter(
  port: AnyQueryPort,
  config:
    | QueryAdapterConfigNoDeps<AnyQueryPort>
    | QueryAdapterConfigWithDeps<AnyQueryPort, ReadonlyArray<Port<unknown, string>>>
): AdapterConstraint {
  if (config.requires !== undefined) {
    return bridgeCreateAdapter({
      provides: port,
      requires: config.requires,
      lifetime: config.lifetime ?? "singleton",
      factory: config.factory,
    });
  }
  return bridgeCreateAdapter({
    provides: port,
    lifetime: config.lifetime ?? "singleton",
    factory: config.factory,
  });
}
