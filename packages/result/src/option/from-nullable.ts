import type { Option } from "./types.js";
import { some, none } from "./option.js";

/**
 * Creates an Option from a nullable value.
 *
 * null or undefined produces None; anything else produces Some(value).
 */
export function fromNullable<T>(value: T | null | undefined): Option<NonNullable<T>> {
  if (value === null || value === undefined) {
    return none();
  }
  return some(value as NonNullable<T>);
}
