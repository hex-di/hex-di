/**
 * Streamed Query Adapter Factory
 *
 * Creates standard HexDI Adapter objects for query ports backed by
 * streaming data sources. The adapter wraps a StreamedFetcher — which
 * returns a stream, reducer, and initial value — into a standard
 * QueryFetcher that the QueryClient can resolve.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Lifetime } from "@hex-di/core";
import type { Port } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import { bridgeCreateAdapter } from "./adapter-bridge.js";
import { ResultAsync } from "@hex-di/result";
import type { AnyQueryPort } from "../ports/query-port.js";
import type { StreamedFetcher, FetchContext, QueryFetcher } from "../ports/types.js";

// =============================================================================
// Stream Consumption Helper
// =============================================================================

async function consumeStream<TData, TChunk>(
  stream: AsyncIterable<TChunk>,
  reducer: (acc: TData, chunk: TChunk) => TData,
  initialValue: TData,
  onProgress?: (intermediateData: TData) => void
): Promise<TData> {
  let acc = initialValue;
  for await (const chunk of stream) {
    acc = reducer(acc, chunk);
    onProgress?.(acc);
  }
  return acc;
}

// =============================================================================
// StreamedQueryAdapterConfig
// =============================================================================

/**
 * Configuration for creating a streamed query adapter without dependencies.
 */
export interface StreamedQueryAdapterConfigNoDeps<TData, TParams, TError, TChunk> {
  readonly factory: () => StreamedFetcher<TData, TParams, TError, TChunk>;
  readonly lifetime?: Lifetime;
  readonly requires?: undefined;
}

/**
 * Configuration for creating a streamed query adapter with dependencies.
 */
export interface StreamedQueryAdapterConfigWithDeps<
  TData,
  TParams,
  TError,
  TChunk,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
> {
  readonly requires: TRequires;
  readonly factory: (deps: PortDeps<TRequires>) => StreamedFetcher<TData, TParams, TError, TChunk>;
  readonly lifetime?: Lifetime;
}

// =============================================================================
// createStreamedQueryAdapter
// =============================================================================

/**
 * Creates a standard HexDI Adapter for a query port backed by a streaming
 * data source.
 *
 * The factory returns a `StreamedFetcher` which produces an async stream,
 * a reducer, and an initial value. The adapter wraps this into a standard
 * `QueryFetcher` that consumes the stream and returns the final reduced value.
 *
 * @example No dependencies
 * ```typescript
 * const EventsAdapter = createStreamedQueryAdapter(EventsPort, {
 *   factory: () =>
 *     (params, { signal }) =>
 *       ResultAsync.ok({
 *         stream: eventSource(params, signal),
 *         reducer: (acc, chunk) => [...acc, chunk],
 *         initialValue: [],
 *       }),
 * });
 * ```
 */

// Overload: no requires
export function createStreamedQueryAdapter<TData, TParams, TError, TChunk, TName extends string>(
  port: AnyQueryPort & { readonly __portName: TName },
  config: StreamedQueryAdapterConfigNoDeps<TData, TParams, TError, TChunk>
): AdapterConstraint;

// Overload: with requires
export function createStreamedQueryAdapter<
  TData,
  TParams,
  TError,
  TChunk,
  TName extends string,
  TRequires extends ReadonlyArray<Port<unknown, string>>,
>(
  port: AnyQueryPort & { readonly __portName: TName },
  config: StreamedQueryAdapterConfigWithDeps<TData, TParams, TError, TChunk, TRequires>
): AdapterConstraint;

// Implementation
export function createStreamedQueryAdapter(
  port: AnyQueryPort,
  config:
    | StreamedQueryAdapterConfigNoDeps<unknown, unknown, unknown, unknown>
    | StreamedQueryAdapterConfigWithDeps<
        unknown,
        unknown,
        unknown,
        unknown,
        ReadonlyArray<Port<unknown, string>>
      >
): AdapterConstraint {
  // Helper: wraps a StreamedFetcher into a QueryFetcher that consumes
  // the async stream and returns the final reduced value.
  function toQueryFetcher(
    streamedFetcher: StreamedFetcher<unknown, unknown, unknown, unknown>
  ): QueryFetcher<unknown, unknown, unknown> {
    return (params: unknown, context: FetchContext) =>
      streamedFetcher(params, context).andThen(streamConfig =>
        ResultAsync.fromPromise(
          consumeStream(
            streamConfig.stream,
            streamConfig.reducer,
            streamConfig.initialValue,
            context.onProgress
          ),
          (error: unknown) => error
        )
      );
  }

  if (config.requires !== undefined) {
    // With-deps: wrap the factory so it produces a QueryFetcher instead of StreamedFetcher
    const userFactory = config.factory;
    return bridgeCreateAdapter({
      provides: port,
      requires: config.requires,
      lifetime: config.lifetime ?? "singleton",
      factory: (deps: Record<string, unknown>) => toQueryFetcher(userFactory(deps)),
    });
  }

  // No-deps: wrap the factory so it produces a QueryFetcher instead of StreamedFetcher
  const userFactory = config.factory;
  return bridgeCreateAdapter({
    provides: port,
    lifetime: config.lifetime ?? "singleton",
    factory: () => toQueryFetcher(userFactory()),
  });
}
