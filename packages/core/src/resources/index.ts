/**
 * Resource Polymorphism
 *
 * Type-level resource tracking via `Disposable<T>` and `NonDisposable<T>`
 * phantom brands, enabling the type system to distinguish between adapters
 * that own cleanup-requiring resources and those that don't.
 *
 * @packageDocumentation
 */

export type {
  ResourceKind,
  Disposable,
  NonDisposable,
  AnyResource,
  ResourceKindOf,
  IsDisposable,
  IsNonDisposable,
  InferResourceKind,
  AggregateDisposal,
  TrackedScope,
} from "./types.js";

export { isDisposableConfig, inferResourceKind } from "./guards.js";
