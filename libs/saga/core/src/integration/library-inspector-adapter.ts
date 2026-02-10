/**
 * Saga Library Inspector DI Adapter
 *
 * Provides a frozen singleton adapter that wires SagaLibraryInspectorPort
 * to createSagaLibraryInspector, enabling auto-registration via the
 * container's afterResolve hook for ports with category "library-inspector".
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { SagaInspectorPort } from "../ports/factory.js";
import { SagaLibraryInspectorPort } from "./library-inspector-port.js";
import { createSagaLibraryInspector } from "./library-inspector.js";

/**
 * Pre-built frozen adapter for SagaLibraryInspectorPort.
 *
 * Depends on SagaInspectorPort and produces a LibraryInspector bridge
 * via createSagaLibraryInspector. Because SagaLibraryInspectorPort
 * has `category: "library-inspector"`, the container's afterResolve hook
 * will auto-register it with the unified inspection protocol.
 */
type SagaLibraryInspectorAdapterType = Adapter<
  typeof SagaLibraryInspectorPort,
  typeof SagaInspectorPort,
  "singleton",
  "sync",
  false,
  readonly [typeof SagaInspectorPort]
>;

export const SagaLibraryInspectorAdapter: SagaLibraryInspectorAdapterType =
  Object.freeze<SagaLibraryInspectorAdapterType>({
    provides: SagaLibraryInspectorPort,
    requires: [SagaInspectorPort],
    lifetime: "singleton",
    factoryKind: "sync",
    clonable: false,
    factory: (deps: {
      SagaInspector: InferService<typeof SagaInspectorPort>;
    }): InferService<typeof SagaLibraryInspectorPort> =>
      createSagaLibraryInspector(deps.SagaInspector),
  });
