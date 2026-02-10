/**
 * Type definitions for inspector module.
 *
 * Re-exports InspectorAPI types from @hex-di/core for consistency.
 *
 * @packageDocumentation
 */
// @ts-nocheck

// Re-export all inspector types from core
export type {
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
  ScopeEventInfo,
  AdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  InspectorEvent,
  InspectorListener,
  InspectorAPI,
  ResultStatistics,
  LibraryInspector,
  LibraryEvent,
  LibraryEventListener,
  UnifiedSnapshot,
} from "@hex-di/core";
