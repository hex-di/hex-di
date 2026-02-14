/**
 * LocalInspectorAdapter — thin wrapper around InspectorAPI for local use.
 *
 * For testing or embedding scenarios where a local InspectorAPI is available
 * directly (no transport), this class adapts it to the InspectorDataSource
 * interface.
 *
 * @packageDocumentation
 */

import type {
  InspectorAPI,
  InspectorEvent,
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
} from "@hex-di/core";
import type { InspectorDataSource } from "./inspector-data-source.js";

/**
 * Adapts a local InspectorAPI to the InspectorDataSource interface.
 *
 * All get methods delegate directly to the underlying inspector.
 * subscribe delegates to inspector.subscribe.
 * sourceType is always "local".
 */
export class LocalInspectorAdapter implements InspectorDataSource {
  readonly sourceType = "local" as const;

  constructor(
    private readonly inspector: InspectorAPI,
    readonly displayName: string
  ) {}

  getSnapshot(): ContainerSnapshot | undefined {
    return this.inspector.getSnapshot();
  }

  getScopeTree(): ScopeTree | undefined {
    return this.inspector.getScopeTree();
  }

  getGraphData(): ContainerGraphData | undefined {
    return this.inspector.getGraphData();
  }

  getUnifiedSnapshot(): UnifiedSnapshot | undefined {
    return this.inspector.getUnifiedSnapshot();
  }

  getAdapterInfo(): readonly AdapterInfo[] | undefined {
    return this.inspector.getAdapterInfo();
  }

  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined {
    return this.inspector.getLibraryInspectors();
  }

  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined {
    return this.inspector.getAllResultStatistics();
  }

  subscribe(listener: (event: InspectorEvent) => void): () => void {
    return this.inspector.subscribe(listener);
  }
}
