
import type { Port } from "@hex-di/ports";

/**
 * Calculates the set of missing dependencies by subtracting provided ports from required ports.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns Union of ports that are in TRequires but not in TProvides
 *
 * @internal
 */
export type UnsatisfiedDependencies<
  TProvides,
  TRequires,
> = Exclude<TRequires, TProvides>;

/**
 * Checks if all required dependencies are satisfied by the provided ports.
 *
 * @typeParam TProvides - Union of provided Port types
 * @typeParam TRequires - Union of required Port types
 *
 * @returns `true` if all requirements are met, `false` otherwise
 *
 * @internal
 */
export type IsSatisfied<
  TProvides,
  TRequires,
> = [UnsatisfiedDependencies<TProvides, TRequires>] extends [never] ? true : false;

/**
 * Finds the intersection (overlap) between two unions of Port types.
 *
 * @typeParam A - First union of Port types
 * @typeParam B - Second union of Port types
 *
 * @returns Union of ports present in both A and B
 *
 * @internal
 */
export type OverlappingPorts<
  A,
  B,
> = Extract<A, B>;

/**
 * Checks if two unions of Port types have any overlap.
 *
 * @typeParam A - First union of Port types
 * @typeParam B - Second union of Port types
 *
 * @returns `true` if there is overlap, `false` otherwise
 *
 * @internal
 */
export type HasOverlap<
  A,
  B,
> = [OverlappingPorts<A, B>] extends [never] ? false : true;

/**
 * Extracts the subset of ports from TRequires that overlap with TAsyncPorts.
 *
 * This utility type finds which required ports are async ports, used for
 * compile-time validation of sync adapters.
 *
 * @typeParam TRequires - Union of ports required by an adapter
 * @typeParam TAsyncPorts - Union of ports with async factories
 *
 * @returns The intersection of TRequires and TAsyncPorts
 *
 * @internal
 */
export type AsyncDependencies<
  TRequires,
  TAsyncPorts,
> = Extract<TRequires, TAsyncPorts>;

/**
 * Checks if an adapter requires any async ports.
 *
 * @typeParam TRequires - Union of ports required by an adapter
 * @typeParam TAsyncPorts - Union of ports with async factories
 *
 * @returns `true` if TRequires overlaps with TAsyncPorts, `false` otherwise
 *
 * @internal
 */
export type HasAsyncDependency<
  TRequires,
  TAsyncPorts,
> = [AsyncDependencies<TRequires, TAsyncPorts>] extends [never] ? false : true;
