
import type { Port, InferPortName } from "@hex-di/ports";

/**
 * Extracts port names from a union of Port types for readable error messages.
 *
 * @typeParam TPorts - Union of Port types
 *
 * @internal
 */
export type ExtractPortNames<TPorts> = [TPorts] extends [never]
  ? never
  : TPorts extends Port<unknown, infer Name>
    ? Name
    : never;

/**
 * A branded error type that produces a readable compile-time error message
 * when dependencies are missing in the graph.
 *
 * @typeParam MissingPorts - Union of Port types that are required but not provided
 *
 * @internal
 */
export type MissingDependencyError<MissingPorts> = [MissingPorts] extends [
  never,
]
  ? never
  : {
      readonly __valid: false;
      readonly __errorBrand: "MissingDependencyError";
      readonly __message: `Missing dependencies: ${ExtractPortNames<MissingPorts>}`;
      readonly __missing: MissingPorts;
    };

/**
 * A branded error type that produces a readable compile-time error message
 * when a duplicate provider is detected for a port.
 *
 * @typeParam DuplicatePort - The Port type that has a duplicate provider
 */
export type DuplicateProviderError<DuplicatePort> = {
  readonly __valid: false;
  readonly __errorBrand: "DuplicateProviderError";
  readonly __message: `Duplicate provider for: ${InferPortName<DuplicatePort>}`;
  readonly __duplicate: DuplicatePort;
};

/**
 * A branded error type that produces a readable compile-time error message
 * when a sync adapter depends on an async port.
 *
 * @typeParam TAsyncPort - The async Port type that is being depended upon
 */
export type AsyncDependencyError<TAsyncPort> = {
  readonly __valid: false;
  readonly __errorBrand: "AsyncDependencyError";
  readonly __message: `Sync adapter cannot depend on async port: ${InferPortName<TAsyncPort>}`;
  readonly __asyncPort: TAsyncPort;
};

/**
 * A branded error type that produces a readable compile-time error message
 * when attempting to override a port that does not exist in the parent container.
 *
 * @typeParam TPort - The Port type that is not found in the parent
 */
export type OverridePortNotFoundError<TPort> = {
  readonly __valid: false;
  readonly __errorBrand: "OverridePortNotFoundError";
  readonly __message: `Port not found in parent: ${InferPortName<TPort>}`;
  readonly __port: TPort;
};
