import { createPermission, PERMISSION_BRAND } from "./permission.js";
import type { Permission, PermissionConstraint, PermissionOptions } from "./permission.js";

/**
 * Maps a set of action names to Permission types for a given resource.
 */
export type PermissionGroupMap<
  TResource extends string,
  TActions extends readonly string[] | Record<string, PermissionOptions>,
> = {
  readonly [K in TActions extends readonly string[]
    ? TActions[number]
    : keyof TActions & string]: Permission<TResource, K & string>;
};

/**
 * Type guard that narrows readonly arrays (Array.isArray doesn't exclude readonly arrays in else branch).
 */
function isStringArray(
  value: readonly string[] | Record<string, PermissionOptions>,
): value is readonly string[] {
  return Array.isArray(value);
}

/**
 * Creates a permission group mapping action names to typed Permission tokens.
 *
 * Overload 1: Array of action names.
 * Overload 2: Object mapping action names to PermissionOptions.
 */
export function createPermissionGroup<
  const TResource extends string,
  const TActions extends readonly string[],
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;

export function createPermissionGroup<
  const TResource extends string,
  const TActions extends Record<string, PermissionOptions>,
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;

export function createPermissionGroup<const TResource extends string>(
  resource: TResource,
  actions: readonly string[] | Record<string, PermissionOptions>,
): Record<string, PermissionConstraint> {
  const result: Record<string, PermissionConstraint> = {};

  if (isStringArray(actions)) {
    for (const action of actions) {
      result[action] = createPermission({ resource, action });
    }
  } else {
    for (const action of Object.keys(actions)) {
      result[action] = createPermission({ resource, action, options: actions[action] });
    }
  }

  Object.freeze(result);
  return result;
}

export type { Permission, PermissionConstraint, PermissionOptions, PERMISSION_BRAND };
