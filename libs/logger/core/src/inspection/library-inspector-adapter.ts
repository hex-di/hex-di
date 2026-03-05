/**
 * Logger Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires LoggerLibraryInspectorPort
 * to createLoggerLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { LoggerLibraryInspectorPort } from "./library-inspector-bridge.js";
import { createLoggerLibraryInspector } from "./library-inspector-bridge.js";
import { LoggerInspectorPort } from "./inspector-port.js";

/**
 * Pre-built frozen adapter for LoggerLibraryInspectorPort.
 *
 * Depends on LoggerInspectorPort and produces a LibraryInspector bridge
 * via createLoggerLibraryInspector. Because LoggerLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 */
export const LoggerLibraryInspectorAdapter: Adapter<
  typeof LoggerLibraryInspectorPort,
  typeof LoggerInspectorPort,
  "singleton",
  "sync",
  false,
  readonly [typeof LoggerInspectorPort]
> = Object.freeze({
  provides: LoggerLibraryInspectorPort,
  requires: [LoggerInspectorPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  freeze: true as const,
  factory: (deps: {
    LoggerInspector: InferService<typeof LoggerInspectorPort>;
  }): InferService<typeof LoggerLibraryInspectorPort> =>
    createLoggerLibraryInspector(deps.LoggerInspector),
});
