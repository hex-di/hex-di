/**
 * Container Bridge -- InspectorAPI Extraction
 *
 * Extracts InspectorAPI data from user code execution results and
 * forwards it to the main thread via postMessage.
 *
 * Extraction strategies:
 * 1. Explicit export: user module exports `inspector` or `container`
 * 2. Runtime hook: last container created during execution
 *
 * @packageDocumentation
 */

import type { InspectorAPI, InspectorEvent } from "@hex-di/core";
import type { WorkerToMainMessage } from "./worker-protocol.js";
import { serializeLibraryInspectors, serializeResultStatistics } from "./worker-protocol.js";

// =============================================================================
// Last Created Inspector Tracking
// =============================================================================

/**
 * Holds a reference to the last InspectorAPI created during user code execution.
 * This is set by runtime instrumentation when available.
 */
let lastCreatedInspector: InspectorAPI | undefined;

/**
 * Register the last created inspector (called by runtime instrumentation).
 */
export function setLastCreatedInspector(inspector: InspectorAPI): void {
  lastCreatedInspector = inspector;
}

/**
 * Get the last created inspector.
 */
export function getLastCreatedInspector(): InspectorAPI | undefined {
  return lastCreatedInspector;
}

/**
 * Clear the last created inspector reference.
 */
export function clearLastCreatedInspector(): void {
  lastCreatedInspector = undefined;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a value looks like an InspectorAPI by checking for required methods.
 */
function isInspectorAPI(value: unknown): value is InspectorAPI {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (
    !("getSnapshot" in value) ||
    !("getScopeTree" in value) ||
    !("subscribe" in value) ||
    !("getGraphData" in value)
  ) {
    return false;
  }
  return (
    typeof value.getSnapshot === "function" &&
    typeof value.getScopeTree === "function" &&
    typeof value.subscribe === "function" &&
    typeof value.getGraphData === "function"
  );
}

/**
 * Check if a value is a container-like object with an inspector property.
 */
function hasInspector(value: unknown): value is { readonly inspector: InspectorAPI } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("inspector" in value)) {
    return false;
  }
  return isInspectorAPI(value.inspector);
}

// =============================================================================
// Inspector Data Extraction
// =============================================================================

/**
 * Extract InspectorAPI from a user module and send data to the main thread.
 *
 * Strategy 1: Check for explicit `inspector` or `container` exports
 * Strategy 2: Use the last created inspector from runtime hook
 *
 * @param userModule - The module object from dynamic import of user code
 * @param postMessage - Function to send messages to the main thread
 */
export function extractInspectorData(
  userModule: Record<string, unknown>,
  postMessage: (message: WorkerToMainMessage) => void
): void {
  let inspector: InspectorAPI | undefined;

  // Strategy 1: Explicit export
  if ("inspector" in userModule && isInspectorAPI(userModule["inspector"])) {
    inspector = userModule["inspector"];
  } else if ("container" in userModule && hasInspector(userModule["container"])) {
    inspector = userModule["container"].inspector;
  }

  // Strategy 2: Runtime hook (last created container)
  if (inspector === undefined) {
    inspector = getLastCreatedInspector();
  }

  if (inspector === undefined) {
    postMessage({ type: "no-inspector" });
    return;
  }

  // Send initial data
  sendInspectorSnapshot(inspector, postMessage);

  // Subscribe to changes and capture the inspector reference for the closure
  const subscribedInspector = inspector;
  subscribedInspector.subscribe((event: InspectorEvent) => {
    postMessage({ type: "inspector-event", event });
    // Re-send full snapshot on each event
    sendInspectorSnapshot(subscribedInspector, postMessage);
  });
}

/**
 * Send a complete inspector data snapshot to the main thread.
 */
export function sendInspectorSnapshot(
  inspector: InspectorAPI,
  postMessage: (message: WorkerToMainMessage) => void
): void {
  const message: WorkerToMainMessage = {
    type: "inspector-data",
    snapshot: inspector.getSnapshot(),
    scopeTree: inspector.getScopeTree(),
    graphData: inspector.getGraphData(),
    unifiedSnapshot: inspector.getUnifiedSnapshot(),
    adapterInfo: inspector.getAdapterInfo(),
    libraryInspectors: serializeLibraryInspectors(inspector.getLibraryInspectors()),
    resultStatistics: serializeResultStatistics(inspector.getAllResultStatistics()),
  };
  postMessage(message);
}
