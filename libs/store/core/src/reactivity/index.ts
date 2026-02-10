/**
 * Reactivity Module
 *
 * @packageDocumentation
 */

export { createSignal, createComputed, createEffect, untracked } from "./signals.js";
export type { Signal, Computed, ReactiveEffect } from "./signals.js";
export { shallowEqual } from "./shallow-equal.js";
export { batch, isInBatch, getBatchDepth, batchTargets, setBatchDiagnostics } from "./batch.js";
export { createIsolatedReactiveSystem } from "./system-factory.js";
export type { ReactiveSystemInstance } from "./system-factory.js";
export { createTrackingProxy, trackSelector, hasPathChanged } from "./path-tracking.js";
export type { TrackingResult } from "./path-tracking.js";
