/**
 * Type Bridge Utilities
 *
 * Encapsulates stdlib APIs that leak `any` into the type system
 * (PropertyDescriptor.value, Function.prototype.call). Returns `unknown`
 * so all consumer code is type-safe.
 *
 * @packageDocumentation
 */

/**
 * Extracts a property value via Object.getOwnPropertyDescriptor.
 * Returns `unknown` instead of the `any` from PropertyDescriptor.value.
 */
export function getDescriptorValue(obj: object, key: string): unknown {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return desc !== undefined ? desc.value : undefined;
}

/**
 * Invokes a type-erased function via Function.prototype.call.call.
 * Used for the variance bridge pattern (never-typed parameters).
 * Returns `unknown` instead of the `any` from Function.prototype.call.
 */
export function callErased(
  fn: (...args: never[]) => unknown,
  ...args: readonly unknown[]
): unknown {
  return Function.prototype.call.call(fn, undefined, ...args);
}
