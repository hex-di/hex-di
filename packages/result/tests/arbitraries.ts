/**
 * fast-check arbitrary generators for Result and Option types.
 *
 * These generators produce frozen Result/Option instances with correct brands,
 * suitable for property-based testing of algebraic laws.
 */

import * as fc from "fast-check";
import { ok, err, some, none } from "../src/index.js";
import type { Result, Ok, Err, Option, Some, None } from "../src/index.js";

/**
 * Generates `Ok<T, never>` values from an arbitrary of `T`.
 */
export function arbOk<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<Ok<T, never>> {
  return arb.map(v => ok(v));
}

/**
 * Generates `Err<never, E>` values from an arbitrary of `E`.
 */
export function arbErr<E>(arb: fc.Arbitrary<E>): fc.Arbitrary<Err<never, E>> {
  return arb.map(e => err(e));
}

/**
 * Generates `Result<T, E>` values (Ok or Err) with configurable ratio.
 *
 * @param arbT - Arbitrary for the Ok value type.
 * @param arbE - Arbitrary for the Err error type.
 * @param okWeight - Weight for Ok values (default 1).
 * @param errWeight - Weight for Err values (default 1).
 */
export function arbResult<T, E>(
  arbT: fc.Arbitrary<T>,
  arbE: fc.Arbitrary<E>,
  okWeight = 1,
  errWeight = 1
): fc.Arbitrary<Result<T, E>> {
  return fc.oneof(
    { weight: okWeight, arbitrary: arbOk(arbT) },
    { weight: errWeight, arbitrary: arbErr(arbE) }
  );
}

/**
 * Generates functions `(t: T) => Result<U, E>` that are deterministic and pure.
 * The generated function either wraps the transformed value in Ok or produces an Err.
 */
export function arbResultFn<U, E>(
  arbU: fc.Arbitrary<U>,
  arbE: fc.Arbitrary<E>
): fc.Arbitrary<(t: unknown) => Result<U, E>> {
  return fc.oneof(
    arbU.map(u => (_t: unknown) => ok(u) satisfies Result<U, E>),
    arbE.map(e => (_t: unknown) => err(e) satisfies Result<U, E>)
  );
}

/**
 * Generates `Option<T>` values (Some or None).
 */
export function arbOption<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<Option<T>> {
  return fc.oneof(
    arb.map(v => some(v) satisfies Option<T>),
    fc.constant(none() satisfies Option<T>)
  );
}

/**
 * Generates `Some<T>` values from an arbitrary of `T`.
 */
export function arbSome<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<Some<T>> {
  return arb.map(v => some(v));
}

/**
 * Generates `None` values (always the singleton).
 */
export function arbNone(): fc.Arbitrary<None> {
  return fc.constant(none());
}
