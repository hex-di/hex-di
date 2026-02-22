/**
 * @hex-di/result-react - React bindings for @hex-di/result
 *
 * PUBLIC API CONTRACT
 * -------------------
 * Everything exported from this file constitutes the public API.
 * Internal modules are NOT part of the public API.
 * Breaking changes to exported symbols follow semver major version bumps.
 *
 * @packageDocumentation
 */

// =============================================================================
// Components
// =============================================================================

export { Match } from "./components/match.js";
export type { MatchProps } from "./components/match.js";

// =============================================================================
// Hooks
// =============================================================================

export { useResult } from "./hooks/use-result.js";
export { useResultAsync } from "./hooks/use-result-async.js";
export type { UseResultAsyncOptions, UseResultAsyncReturn } from "./hooks/use-result-async.js";
export { useResultAction } from "./hooks/use-result-action.js";
export type { UseResultActionReturn } from "./hooks/use-result-action.js";
export { useSafeTry } from "./hooks/use-safe-try.js";
export { useResultSuspense } from "./hooks/use-result-suspense.js";
export { createResultResource } from "./hooks/create-result-resource.js";
export type { ResultResource } from "./hooks/create-result-resource.js";
export { useOptimisticResult } from "./hooks/use-optimistic-result.js";
export { useResultTransition } from "./hooks/use-result-transition.js";

// =============================================================================
// Utilities
// =============================================================================

export { fromAction } from "./utilities/from-action.js";
