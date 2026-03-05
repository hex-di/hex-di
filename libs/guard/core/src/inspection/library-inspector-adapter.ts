/**
 * Guard Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires GuardLibraryInspectorPort
 * to createGuardLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { GuardLibraryInspectorPort } from "./library-inspector-bridge.js";
import { createGuardLibraryInspector } from "./library-inspector-bridge.js";
import { GuardInspectorPort } from "./inspector-port.js";

/**
 * Pre-built frozen adapter for GuardLibraryInspectorPort.
 *
 * Depends on GuardInspectorPort and produces a LibraryInspector bridge
 * via createGuardLibraryInspector. Because GuardLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 */
export const GuardLibraryInspectorAdapter: Adapter<
  typeof GuardLibraryInspectorPort,
  typeof GuardInspectorPort,
  "singleton",
  "sync",
  false,
  readonly [typeof GuardInspectorPort]
> = Object.freeze({
  provides: GuardLibraryInspectorPort,
  requires: [GuardInspectorPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  freeze: true as const,
  factory: (deps: {
    GuardInspector: InferService<typeof GuardInspectorPort>;
  }): InferService<typeof GuardLibraryInspectorPort> =>
    createGuardLibraryInspector(deps.GuardInspector),
});
