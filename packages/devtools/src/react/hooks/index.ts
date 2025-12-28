/**
 * DevTools React hooks exports.
 *
 * @packageDocumentation
 */

export { useDevTools, useTracingAPI, useExportedGraph } from "./use-devtools.js";
export { useTraces, type UseTracesResult } from "./use-traces.js";
export { useTraceStats } from "./use-trace-stats.js";
export { useTracingControls, type UseTracingControlsResult } from "./use-tracing-controls.js";

// Multi-container inspector hooks
export {
  useRegisterContainer,
  type UseRegisterContainerOptions,
} from "./use-register-container.js";
export { useContainerList, type UseContainerListResult } from "./use-container-list.js";
export { useContainerInspector, useContainerInspectorStrict } from "./use-container-inspector.js";
export { useInspectorSnapshot, type UseInspectorSnapshotResult } from "./use-inspector-snapshot.js";
export { useContainerPhase, type UseContainerPhaseResult } from "./use-container-phase.js";
