/**
 * Symbol definitions for @hex-di/inspector.
 *
 * @packageDocumentation
 */

/**
 * Symbol for accessing InspectorAPI on containers.
 *
 * Uses `Symbol.for()` for cross-realm consistency, enabling DevTools
 * loaded in separate bundles to access the same API.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { InspectorPlugin, INSPECTOR } from '@hex-di/inspector';
 *
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * const inspector = container[INSPECTOR];
 * const snapshot = inspector.getSnapshot();
 * ```
 */
export const INSPECTOR = Symbol.for("hex-di/inspector");
