/**
 * Hooks module - React hooks for DevTools primitives.
 *
 * This module exports hooks for accessing render primitives in shared
 * headless components.
 *
 * @packageDocumentation
 */

// Context and Provider
export { PrimitivesContext, PrimitivesProvider } from "./primitives-context.js";
export type { PrimitivesProviderProps } from "./primitives-context.js";

// Hooks
export { usePrimitives } from "./use-primitives.js";
export { useSnapshotCapture } from "./use-snapshot-capture.js";
export type { SnapshotCaptureOptions, SnapshotCaptureResult } from "./use-snapshot-capture.js";
