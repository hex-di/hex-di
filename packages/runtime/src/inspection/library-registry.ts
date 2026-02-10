/**
 * Library Inspector Registry
 *
 * Internal component of InspectorAPI that manages library inspector
 * registration, event forwarding, snapshot aggregation, and disposal.
 *
 * @packageDocumentation
 */

import type {
  LibraryInspector,
  InspectorEvent,
  LibraryQueryEntry,
  LibraryQueryResult,
  LibraryQueryPredicate,
} from "@hex-di/core";
import { isLibraryInspector } from "@hex-di/core";

// =============================================================================
// Library Registry Factory
// =============================================================================

/**
 * Callback type for emitting container-level events.
 * @internal
 */
type EmitContainerEvent = (event: InspectorEvent) => void;

/**
 * Library registry interface.
 * @internal
 */
export interface LibraryRegistry {
  registerLibrary(inspector: LibraryInspector, emitContainerEvent: EmitContainerEvent): () => void;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector>;
  getLibraryInspector(name: string): LibraryInspector | undefined;
  getLibrarySnapshots(): Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  queryLibraries(predicate: LibraryQueryPredicate): readonly LibraryQueryResult[];
  queryByLibrary(
    name: string,
    predicate?: (entry: LibraryQueryEntry) => boolean
  ): readonly LibraryQueryResult[];
  queryByKey(pattern: string | RegExp): readonly LibraryQueryResult[];
  dispose(): void;
}

/**
 * Creates a library registry that manages library inspector registration,
 * event forwarding, snapshot aggregation, and disposal.
 *
 * Follows the same factory pattern as createResultTracker in builtin-api.ts.
 *
 * @internal
 */
export function createLibraryRegistry(): LibraryRegistry {
  const inspectors = new Map<string, LibraryInspector>();
  const subscriptions = new Map<string, () => void>();

  function unregisterByName(name: string, emitContainerEvent: EmitContainerEvent): void {
    const existingUnsub = subscriptions.get(name);
    if (existingUnsub !== undefined) {
      try {
        existingUnsub();
      } catch {
        // Tolerate unsubscribe failures
      }
      subscriptions.delete(name);
    }

    const existingInspector = inspectors.get(name);
    if (existingInspector !== undefined) {
      try {
        existingInspector.dispose?.();
      } catch {
        // Tolerate dispose failures
      }
      inspectors.delete(name);
    }

    emitContainerEvent({ type: "library-unregistered", name });
  }

  return {
    registerLibrary(
      inspector: LibraryInspector,
      emitContainerEvent: EmitContainerEvent
    ): () => void {
      if (!isLibraryInspector(inspector)) {
        throw new TypeError("Invalid LibraryInspector: value does not satisfy the protocol");
      }

      // Last-write-wins: if name exists, unregister old first
      if (inspectors.has(inspector.name)) {
        unregisterByName(inspector.name, emitContainerEvent);
      }

      inspectors.set(inspector.name, inspector);

      // Subscribe to library events if subscribe is provided
      if (inspector.subscribe !== undefined) {
        const unsub = inspector.subscribe(event => {
          emitContainerEvent({ type: "library", event });
        });
        subscriptions.set(inspector.name, unsub);
      }

      emitContainerEvent({ type: "library-registered", name: inspector.name });

      let unregistered = false;
      return () => {
        if (unregistered) return;
        unregistered = true;
        // Only unregister if this inspector is still the one registered under that name
        // (a replacement may have already unregistered it)
        if (inspectors.get(inspector.name) === inspector) {
          unregisterByName(inspector.name, emitContainerEvent);
        }
      };
    },

    getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> {
      return new Map(inspectors);
    },

    getLibraryInspector(name: string): LibraryInspector | undefined {
      return inspectors.get(name);
    },

    getLibrarySnapshots(): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
      const result: Record<string, Readonly<Record<string, unknown>>> = {};
      for (const [name, inspector] of inspectors) {
        try {
          result[name] = inspector.getSnapshot();
        } catch {
          result[name] = Object.freeze({ error: "snapshot-failed" });
        }
      }
      return Object.freeze(result);
    },

    queryLibraries(predicate: LibraryQueryPredicate): readonly LibraryQueryResult[] {
      const results: LibraryQueryResult[] = [];
      for (const [name, inspector] of inspectors) {
        let snapshot: Readonly<Record<string, unknown>>;
        try {
          snapshot = inspector.getSnapshot();
        } catch {
          continue;
        }
        for (const key of Object.keys(snapshot)) {
          const entry: LibraryQueryEntry = Object.freeze({
            library: name,
            key,
            value: snapshot[key],
          });
          if (predicate(entry)) {
            results.push(entry);
          }
        }
      }
      return Object.freeze(results);
    },

    queryByLibrary(
      name: string,
      predicate?: (entry: LibraryQueryEntry) => boolean
    ): readonly LibraryQueryResult[] {
      const inspector = inspectors.get(name);
      if (inspector === undefined) return Object.freeze([]);

      let snapshot: Readonly<Record<string, unknown>>;
      try {
        snapshot = inspector.getSnapshot();
      } catch {
        return Object.freeze([]);
      }

      const results: LibraryQueryResult[] = [];
      for (const key of Object.keys(snapshot)) {
        const entry: LibraryQueryEntry = Object.freeze({
          library: name,
          key,
          value: snapshot[key],
        });
        if (predicate === undefined || predicate(entry)) {
          results.push(entry);
        }
      }
      return Object.freeze(results);
    },

    queryByKey(pattern: string | RegExp): readonly LibraryQueryResult[] {
      const results: LibraryQueryResult[] = [];
      for (const [name, inspector] of inspectors) {
        let snapshot: Readonly<Record<string, unknown>>;
        try {
          snapshot = inspector.getSnapshot();
        } catch {
          continue;
        }
        for (const key of Object.keys(snapshot)) {
          const matches = typeof pattern === "string" ? key === pattern : pattern.test(key);
          if (matches) {
            results.push(Object.freeze({ library: name, key, value: snapshot[key] }));
          }
        }
      }
      return Object.freeze(results);
    },

    dispose(): void {
      for (const [, unsub] of subscriptions) {
        try {
          unsub();
        } catch {
          // Tolerate individual unsubscribe failures
        }
      }
      for (const [, inspector] of inspectors) {
        try {
          inspector.dispose?.();
        } catch {
          // Tolerate individual dispose failures
        }
      }
      inspectors.clear();
      subscriptions.clear();
    },
  };
}
