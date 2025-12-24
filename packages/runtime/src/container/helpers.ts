/**
 * Helper functions for container implementation.
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { MemoMap } from "../common/memo-map.js";
import type { MemoMapSnapshot, MemoEntrySnapshot } from "../inspector/types.js";
import type { InheritanceMode } from "../types.js";
import type { DisposableChild, ParentContainerLike, RuntimeAdapter } from "./internal-types.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

// =============================================================================
// Type Guards
// =============================================================================

export function isDisposableChild(value: unknown): value is DisposableChild {
  return (
    value !== null &&
    typeof value === "object" &&
    "dispose" in value &&
    typeof (value as { dispose: unknown }).dispose === "function" &&
    "isDisposed" in value
  );
}

export function isInheritanceMode(value: unknown): value is InheritanceMode {
  return value === "shared" || value === "forked" || value === "isolated";
}

// =============================================================================
// Parent Container Checks
// =============================================================================

export function isAdapterProvidedByParent<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(parent: ParentContainerLike<TParentProvides, TAsyncPorts>, adapter: RuntimeAdapter): boolean {
  return parent[ADAPTER_ACCESS](adapter.provides) !== undefined;
}

export function isAdapterProvidedByParentOrExtensions<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  parent: ParentContainerLike<TParentProvides, TAsyncPorts>,
  extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
  adapter: RuntimeAdapter
): boolean {
  return parent[ADAPTER_ACCESS](adapter.provides) !== undefined || extensions.has(adapter.provides);
}

// =============================================================================
// Snapshot Creation
// =============================================================================

export function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  const entries: MemoEntrySnapshot[] = [];
  for (const [port, metadata] of memo.entries()) {
    entries.push(
      Object.freeze({
        port,
        portName: port.__portName,
        resolvedAt: metadata.resolvedAt,
        resolutionOrder: metadata.resolutionOrder,
      })
    );
  }
  return Object.freeze({
    size: entries.length,
    entries: Object.freeze(entries),
  });
}
