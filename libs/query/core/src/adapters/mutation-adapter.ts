/**
 * Mutation Adapter Factory
 *
 * Creates standard HexDI Adapter objects for mutation ports.
 * The adapter's factory returns a MutationExecutor — the service type
 * of the mutation port — making mutation adapters first-class participants
 * in the DI container.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Lifetime } from "@hex-di/core";
import type { Port, InferService } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type { AnyMutationPort } from "../ports/mutation-port.js";
import { bridgeCreateAdapter } from "./adapter-bridge.js";

// =============================================================================
// MutationAdapterConfig
// =============================================================================

/**
 * Configuration for creating a mutation adapter without dependencies.
 */
export interface MutationAdapterConfigNoDeps<TPort extends AnyMutationPort> {
  readonly factory: () => InferService<TPort>;
  readonly lifetime?: Lifetime;
  readonly requires?: undefined;
}

/**
 * Configuration for creating a mutation adapter with dependencies.
 */
export interface MutationAdapterConfigWithDeps<
  TPort extends AnyMutationPort,
  TRequires extends ReadonlyArray<Port<string, unknown>>,
> {
  readonly requires: TRequires;
  readonly factory: (deps: PortDeps<TRequires>) => InferService<TPort>;
  readonly lifetime?: Lifetime;
}

// =============================================================================
// createMutationAdapter
// =============================================================================

/**
 * Creates a standard HexDI Adapter for a mutation port.
 *
 * The factory returns a `MutationExecutor<TData, TInput, TError>`, which is
 * the service type of the port (`InferService<MutationPort<...>>`).
 *
 * @example No dependencies
 * ```typescript
 * const CreateUserAdapter = createMutationAdapter(CreateUserPort, {
 *   factory: () =>
 *     (input, { signal }) =>
 *       ResultAsync.fromPromise(fetch("/api/users", { method: "POST", body: input, signal }), classifyError),
 * });
 * ```
 *
 * @example With dependencies
 * ```typescript
 * const CreateUserAdapter = createMutationAdapter(CreateUserPort, {
 *   requires: [HttpClientPort],
 *   factory: ({ HttpClient }) =>
 *     (input, { signal }) =>
 *       ResultAsync.fromPromise(HttpClient.post("/api/users", input, { signal }), classifyError),
 * });
 * ```
 */

// Overload: no requires
export function createMutationAdapter<TPort extends AnyMutationPort>(
  port: TPort,
  config: MutationAdapterConfigNoDeps<TPort>
): AdapterConstraint;

// Overload: with requires
export function createMutationAdapter<
  TPort extends AnyMutationPort,
  TRequires extends ReadonlyArray<Port<string, unknown>>,
>(port: TPort, config: MutationAdapterConfigWithDeps<TPort, TRequires>): AdapterConstraint;

// Implementation
export function createMutationAdapter(
  port: AnyMutationPort,
  config:
    | MutationAdapterConfigNoDeps<AnyMutationPort>
    | MutationAdapterConfigWithDeps<AnyMutationPort, ReadonlyArray<Port<string, unknown>>>
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
