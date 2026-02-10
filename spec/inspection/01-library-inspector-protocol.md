# Specification: Library Inspector Protocol

## Goal

Define an extensible inspection protocol in `@hex-di/core` and `@hex-di/runtime` that allows ecosystem libraries (Flow, Store, Query, Saga, Agent, Logger) to register domain-specific inspectors with the container. The container aggregates all library inspectors into a unified, queryable knowledge model -- transforming the DI container from plumbing into the application's nervous system.

This resolves the architectural gap: `InspectorAPI` and `InspectorEvent` are currently closed types that only report container-level information. Ecosystem libraries have their own inspectors (e.g., `FlowInspector`, `StoreInspectorAPI`, `LoggerInspector`) but the container cannot discover, aggregate, or expose them. The bridge ports exist (`FlowInspectorPort`, `FlowRegistryPort`), but the container-side extension is missing.

## User Stories

- As a developer, I want to query all library inspectors through a single `container.inspector` API so that I don't need to resolve individual library inspector ports manually.
- As a DevTools author, I want to subscribe to events from all libraries through one event stream so that I can build a unified dashboard without knowing which libraries are installed.
- As an AI agent (via MCP), I want to call `getUnifiedSnapshot()` and receive a complete picture of the application's state across all libraries so that I can diagnose issues without guessing.
- As a library author, I want a standard protocol for making my library's inspector discoverable by the container so that it participates in the unified knowledge model automatically.
- As a developer, I want zero overhead when no library inspectors are registered so that the protocol doesn't penalize applications that don't use it.

## Specific Requirements

### 1. LibraryInspector Protocol (`@hex-di/core`)

**`LibraryInspector` Interface**

- `LibraryInspector` is the protocol that all library inspectors implement to participate in the unified inspection system
- The interface is generic over its snapshot and event shapes but the container sees only the base type
- Defined in `packages/core/src/inspection/library-inspector-types.ts`

```
interface LibraryInspector {
  /** Unique library identifier. Must be lowercase kebab-case. */
  readonly name: string;

  /**
   * Returns a frozen snapshot of the library's current state.
   * The shape is library-specific but always a frozen record.
   */
  getSnapshot(): Readonly<Record<string, unknown>>;

  /**
   * Subscribe to library-specific events.
   * Returns an unsubscribe function.
   * Optional -- libraries without push-based events omit this.
   */
  subscribe?(listener: LibraryEventListener): () => void;

  /**
   * Dispose the library inspector and clean up resources.
   * Optional -- called when the container disposes.
   */
  dispose?(): void;
}
```

- `name` must be unique per container. Registering a second inspector with the same name replaces the first (last-write-wins).
- `getSnapshot()` must return a `Object.freeze()`-d record. Callers must not mutate the returned value.
- Libraries that only support pull-based queries (e.g., a simple cache inspector) omit `subscribe`.
- Libraries that hold no resources omit `dispose`.

**`LibraryEvent` Type**

- Events emitted by library inspectors, wrapped with source identification for the container's unified event stream:

```
interface LibraryEvent {
  /** Library name (matches LibraryInspector.name) */
  readonly source: string;
  /** Library-specific event type string */
  readonly type: string;
  /** Library-specific event payload */
  readonly payload: Readonly<Record<string, unknown>>;
  /** Event timestamp (Date.now()) */
  readonly timestamp: number;
}
```

- `source` must match the `name` of the `LibraryInspector` that emitted the event.
- `type` is library-defined (e.g., `"machine-registered"`, `"state-changed"`, `"cache-invalidated"`).
- `payload` is library-defined but must be a frozen record.
- `timestamp` is set by the library at emission time.

**`LibraryEventListener` Type**

```
type LibraryEventListener = (event: LibraryEvent) => void;
```

**Type Guard**

- `isLibraryInspector(value: unknown): value is LibraryInspector` -- runtime check for the protocol:
  1. `typeof value === "object" && value !== null`
  2. `typeof value.name === "string"` and `value.name.length > 0`
  3. `typeof value.getSnapshot === "function"`
  4. If `subscribe` exists, `typeof value.subscribe === "function"`
  5. If `dispose` exists, `typeof value.dispose === "function"`

### 2. Extended InspectorEvent (`@hex-di/core`)

**New Event Variant**

- Add a `"library"` variant to the existing `InspectorEvent` discriminated union:

```
type InspectorEvent =
  | { readonly type: "snapshot-changed" }
  | { readonly type: "scope-created"; readonly scope: ScopeEventInfo }
  | { readonly type: "scope-disposed"; readonly scopeId: string }
  | { readonly type: "resolution"; readonly portName: string; readonly duration: number; readonly isCacheHit: boolean }
  | { readonly type: "phase-changed"; readonly phase: ContainerPhase }
  | { readonly type: "init-progress"; readonly current: number; readonly total: number; readonly portName: string }
  | { readonly type: "child-created"; readonly childId: string; readonly childKind: "child" | "lazy" }
  | { readonly type: "child-disposed"; readonly childId: string }
  | { readonly type: "result:ok"; readonly portName: string; readonly timestamp: number }
  | { readonly type: "result:err"; readonly portName: string; readonly errorCode: string; readonly timestamp: number }
  | { readonly type: "result:recovered"; readonly portName: string; readonly fromCode: string; readonly timestamp: number }
  | { readonly type: "library"; readonly event: LibraryEvent }
  | { readonly type: "library-registered"; readonly name: string }
  | { readonly type: "library-unregistered"; readonly name: string };
```

- `"library"` wraps a `LibraryEvent` from any registered library inspector. Container subscribers receive all library events through this single variant.
- `"library-registered"` is emitted when a new library inspector is registered with the container.
- `"library-unregistered"` is emitted when a library inspector is unregistered (e.g., via the returned unsubscribe function or container disposal).

### 3. Extended InspectorAPI (`@hex-di/core`)

**New Methods on InspectorAPI**

Add the following methods to the existing `InspectorAPI` interface:

```
interface InspectorAPI {
  /* ... existing methods ... */

  // =========================================================================
  // Library Inspector Registry
  // =========================================================================

  /**
   * Registers a library inspector with the container.
   *
   * The inspector participates in unified snapshots and its events
   * are forwarded to container subscribers as `{ type: "library", event }`.
   *
   * If an inspector with the same name is already registered,
   * the previous one is unregistered first (last-write-wins).
   *
   * @param inspector - The library inspector to register
   * @returns Unsubscribe function that removes the inspector
   */
  registerLibrary(inspector: LibraryInspector): () => void;

  /**
   * Gets all registered library inspectors.
   *
   * @returns Frozen map of library name to inspector
   */
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector>;

  /**
   * Gets a specific library inspector by name.
   *
   * @param name - The library name (e.g., "flow", "store")
   * @returns The inspector, or undefined if not registered
   */
  getLibraryInspector(name: string): LibraryInspector | undefined;

  /**
   * Gets a unified snapshot combining container state and all
   * registered library snapshots.
   *
   * @returns Frozen unified snapshot
   */
  getUnifiedSnapshot(): UnifiedSnapshot;
}
```

**`UnifiedSnapshot` Type**

```
interface UnifiedSnapshot {
  /** Snapshot timestamp */
  readonly timestamp: number;
  /** Container state snapshot */
  readonly container: ContainerSnapshot;
  /** Library snapshots keyed by library name */
  readonly libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Names of registered libraries at snapshot time */
  readonly registeredLibraries: readonly string[];
}
```

- `container` is the existing `ContainerSnapshot` from `getSnapshot()`.
- `libraries` maps each registered library name to its `getSnapshot()` result.
- `registeredLibraries` lists library names sorted alphabetically for determinism.
- The entire `UnifiedSnapshot` is `Object.freeze()`-d (deep freeze on the `libraries` values).

### 4. Library Inspector Registry (`@hex-di/runtime`)

**Implementation in `packages/runtime/src/inspection/library-registry.ts`**

The registry is an internal component of the `InspectorAPI` implementation:

```
createLibraryRegistry():
  state:
    inspectors: Map<string, LibraryInspector>
    subscriptions: Map<string, () => void>   // per-library unsubscribe from library events

  registerLibrary(inspector, emitContainerEvent):
    1. VALIDATE: isLibraryInspector(inspector) — throw TypeError if invalid
    2. If inspectors.has(inspector.name):
       a. Call existing subscription unsubscribe
       b. Call existing inspector.dispose?.()
       c. Remove from maps
    3. inspectors.set(inspector.name, inspector)
    4. If inspector.subscribe is defined:
       a. unsub = inspector.subscribe((event) => {
            emitContainerEvent({ type: "library", event })
          })
       b. subscriptions.set(inspector.name, unsub)
    5. emitContainerEvent({ type: "library-registered", name: inspector.name })
    6. Return unregister function:
       a. Call subscription unsubscribe if exists
       b. Call inspector.dispose?.()
       c. Remove from maps
       d. emitContainerEvent({ type: "library-unregistered", name: inspector.name })

  unregisterLibrary(name, emitContainerEvent):
    1. If !inspectors.has(name): return
    2. Call subscription unsubscribe if exists
    3. Call inspector.dispose?.()
    4. Remove from maps
    5. emitContainerEvent({ type: "library-unregistered", name })

  getLibraryInspectors():
    Return new ReadonlyMap(inspectors)  // frozen copy

  getLibraryInspector(name):
    Return inspectors.get(name)

  getLibrarySnapshots():
    result = {}
    for [name, inspector] of inspectors:
      try:
        result[name] = inspector.getSnapshot()
      catch:
        result[name] = Object.freeze({ error: "snapshot-failed" })
    Return Object.freeze(result)

  dispose():
    for [name, unsub] of subscriptions:
      try: unsub()
      catch: /* ignore */
    for [, inspector] of inspectors:
      try: inspector.dispose?.()
      catch: /* ignore */
    inspectors.clear()
    subscriptions.clear()
```

**Integration with `createBuiltinInspectorAPI`**

In `packages/runtime/src/inspection/builtin-api.ts`:

1. Create a library registry instance alongside the event emitter and result tracker
2. Wire the registry's event emission through the existing event emitter
3. Add the new methods to the inspector object:
   - `registerLibrary` delegates to registry
   - `getLibraryInspectors` delegates to registry
   - `getLibraryInspector` delegates to registry
   - `getUnifiedSnapshot` aggregates container snapshot + library snapshots
4. On container disposal, call `registry.dispose()` to clean up all library inspectors

**`getUnifiedSnapshot` Algorithm**

```
getUnifiedSnapshot():
  1. containerSnapshot = getSnapshot()   // existing method
  2. librarySnapshots = registry.getLibrarySnapshots()
  3. registeredLibraries = Array.from(registry.inspectors.keys()).sort()
  4. Return Object.freeze({
       timestamp: Date.now(),
       container: containerSnapshot,
       libraries: librarySnapshots,
       registeredLibraries: Object.freeze(registeredLibraries),
     })
```

### 5. Auto-Registration via Adapter Hooks (`@hex-di/runtime`)

**Port Metadata Convention**

- Library inspectors can be auto-registered using port metadata. A port with `category: "library-inspector"` triggers automatic registration after resolution:

```
// In @hex-di/flow
export const FlowLibraryInspectorPort = port<LibraryInspector>()({
  name: "FlowLibraryInspector",
  category: "library-inspector",
  tags: ["flow", "inspector"],
});
```

- This is a CONVENTION, not a requirement. Libraries can also register inspectors imperatively via `container.inspector.registerLibrary(inspector)`.

**Auto-Discovery Hook**

- The container installs a built-in `afterResolve` hook that checks if the resolved port has `category: "library-inspector"` in its metadata:

```
container.addHook("afterResolve", (ctx) => {
  const portMeta = getPortMetadata(ctx.port);
  if (portMeta?.category === "library-inspector") {
    if (isLibraryInspector(ctx.result)) {
      container.inspector.registerLibrary(ctx.result);
    }
  }
});
```

- This hook is installed automatically by `createContainer` and `createChild`.
- The hook is lightweight: metadata lookup is O(1) via WeakMap, type guard is O(1) property checks.
- Libraries that prefer imperative registration skip the convention and call `registerLibrary` directly.

### 6. Library Inspector Bridge Pattern (Guidance for Libraries)

**Flow Library Bridge**

`@hex-di/flow` provides a bridge adapter that wraps `FlowInspector` + `FlowRegistry` into a `LibraryInspector`:

```
// libs/flow/core/src/integration/library-inspector-bridge.ts

function createFlowLibraryInspector(
  flowInspector: FlowInspector,
  registry: FlowRegistry,
): LibraryInspector {
  return {
    name: "flow",
    getSnapshot() {
      const machines = registry.getAllMachines();
      return Object.freeze({
        machineCount: machines.length,
        machines: Object.freeze(machines.map(entry => Object.freeze({
          portName: entry.portName,
          instanceId: entry.instanceId,
          machineId: entry.machineId,
          state: entry.state(),
          scopeId: entry.scopeId,
        }))),
        healthEvents: Object.freeze(flowInspector.getHealthEvents({ limit: 10 })),
        effectStatistics: Object.freeze(
          Object.fromEntries(flowInspector.getEffectResultStatistics())
        ),
      });
    },
    subscribe(listener) {
      return registry.subscribe((event) => {
        listener({
          source: "flow",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: Date.now(),
        });
      });
    },
    dispose() {
      flowInspector.dispose();
    },
  };
}
```

- The bridge adapter depends on `FlowInspectorPort` and `FlowRegistryPort` (both already exist).
- The bridge factory is provided as a standard adapter that `provides: FlowLibraryInspectorPort` with `requires: [FlowInspectorPort, FlowRegistryPort]`.
- The port has `category: "library-inspector"` for auto-discovery.

**Store Library Bridge (Pattern)**

```
function createStoreLibraryInspector(storeInspector: StoreInspectorAPI): LibraryInspector {
  return {
    name: "store",
    getSnapshot() {
      return storeInspector.getSnapshot();
    },
    subscribe(listener) {
      return storeInspector.subscribe((event) => {
        listener({
          source: "store",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: Date.now(),
        });
      });
    },
  };
}
```

**Logger Library Bridge**

`@hex-di/logger` provides a `LoggerInspector` with comprehensive pull-based queries (entry counts, error rate, handler info, sampling/redaction statistics, recent entries, context usage) and push-based subscriptions (8 event types including `"entry-logged"`, `"error-rate-threshold"`, `"handler-error"`, `"sampling-dropped"`, `"redaction-applied"`). The bridge wraps this into the `LibraryInspector` protocol:

```
// packages/logger/src/inspection/library-inspector-bridge.ts

function createLoggerLibraryInspector(
  loggerInspector: LoggerInspector,
): LibraryInspector {
  return {
    name: "logger",
    getSnapshot() {
      return loggerInspector.getSnapshot();
    },
    subscribe(listener) {
      return loggerInspector.subscribe((event) => {
        listener({
          source: "logger",
          type: event.type,
          payload: Object.freeze({ ...event }),
          timestamp: Date.now(),
        });
      });
    },
  };
}
```

- The `LoggerInspector.getSnapshot()` already returns a `LoggingSnapshot` with `timestamp`, `totalEntries`, `entriesByLevel`, `errorRate`, `handlers`, `samplingActive`, `redactionActive`, `contextDepth` -- all frozen.
- The bridge adapter `provides: LoggerLibraryInspectorPort` with `requires: [LoggerInspectorPort]`, `lifetime: "singleton"`, and port metadata `category: "library-inspector"` for auto-discovery.
- Logger events include: `"entry-logged"`, `"error-rate-threshold"`, `"handler-error"`, `"sampling-dropped"`, `"redaction-applied"`, `"handler-added"`, `"handler-removed"`, `"snapshot-changed"`.
- The logger is notable because it is already fully specced (see `spec/logger/13-Inspection.md`) with MCP resource contracts (`hexdi://logging/snapshot`, `hexdi://logging/entries`, `hexdi://logging/handlers`, `hexdi://logging/error-rate`, `hexdi://logging/sampling`).

**General Pattern**

Every library that wants to participate in the unified knowledge model:

1. Implements its domain-specific inspector (e.g., `FlowInspector`, `StoreInspectorAPI`)
2. Creates a bridge function that wraps it into a `LibraryInspector`
3. Provides the bridge as a standard adapter with `category: "library-inspector"` on its port
4. The container auto-discovers and registers it after resolution

### 7. Exports (`@hex-di/core`)

Add the following exports to `packages/core/src/index.ts`:

```
// Library inspector protocol
export type {
  LibraryInspector,
  LibraryEvent,
  LibraryEventListener,
  UnifiedSnapshot,
} from "./inspection/library-inspector-types.js";

export { isLibraryInspector } from "./inspection/library-inspector-types.js";
```

The extended `InspectorEvent` and `InspectorAPI` types are already exported -- the new variants are additions to the existing unions.

### 8. Exports (`@hex-di/runtime`)

No new public exports needed. The library registry is internal to the `InspectorAPI` implementation. The auto-discovery hook is installed automatically.

### 9. Error Handling

- `registerLibrary` throws `TypeError` if the argument does not satisfy `isLibraryInspector`.
- `getSnapshot()` failures on individual library inspectors are caught and replaced with `{ error: "snapshot-failed" }` in the unified snapshot. The container does not crash because a library inspector throws.
- `subscribe` callback failures on individual library inspectors are caught silently (same pattern as existing `InspectorListener` error handling).
- `dispose` failures on library inspectors are caught silently during container disposal (same pattern as existing finalizer error handling).

### 10. Performance Characteristics

- **Zero overhead when unused**: If no library inspectors are registered, the registry is an empty Map. `getUnifiedSnapshot()` just wraps `getSnapshot()` with an empty `libraries` object.
- **O(1) registration/unregistration**: Map operations.
- **O(n) unified snapshot**: Where n is the number of registered library inspectors. Each calls `getSnapshot()` once.
- **O(1) event forwarding**: Library events are wrapped and forwarded to the existing emitter.
- **O(1) auto-discovery check**: Port metadata lookup via WeakMap + string comparison.

### 11. Backward Compatibility

- `InspectorEvent` gains new variants (`"library"`, `"library-registered"`, `"library-unregistered"`). Existing subscribers that switch on `event.type` will simply not handle these new types -- they fall through to default cases. No breaking change.
- `InspectorAPI` gains new methods (`registerLibrary`, `getLibraryInspectors`, `getLibraryInspector`, `getUnifiedSnapshot`). Existing consumers are unaffected. No breaking change.
- `UnifiedSnapshot` is a new type. No existing code references it.
- The auto-discovery hook is additive and only triggers on ports with `category: "library-inspector"`. No existing ports use this category.

## Existing Code to Leverage

**`packages/core/src/inspection/inspector-types.ts` - InspectorAPI & InspectorEvent**

- The existing `InspectorEvent` union and `InspectorAPI` interface. New variants and methods are added directly.

**`packages/runtime/src/inspection/builtin-api.ts` - createBuiltinInspectorAPI**

- The factory that creates `InspectorAPI` instances. The library registry is created here alongside the event emitter and result tracker.

**`packages/core/src/ports/directed.ts` - getPortMetadata**

- Used by the auto-discovery hook to check `category: "library-inspector"` on resolved ports.

**`libs/flow/core/src/introspection/types.ts` - FlowInspector, FlowRegistry**

- The domain-specific inspector interfaces. The bridge pattern wraps these into `LibraryInspector`.

**`libs/flow/core/src/integration/inspector-adapter.ts` - createFlowInspectorAdapter**

- Existing adapter factory. A parallel `createFlowLibraryInspectorAdapter` provides the bridge.

**`packages/runtime/src/container/factory.ts` - createContainer**

- Where the auto-discovery hook is installed.

**`packages/logger/src/inspection/` - LoggerInspector**

- The domain-specific inspector for the logger library. Has pull-based queries (`getSnapshot`, `getEntryCounts`, `getErrorRate`, `getHandlerInfo`, `getSamplingStatistics`, `getRedactionStatistics`, `getRecentEntries`, `getContextUsage`) and push-based subscriptions (8 event types). The bridge pattern wraps this into `LibraryInspector`.

**`packages/logger/src/ports/` - LoggerPort, LogHandlerPort, LogFormatterPort**

- The logger port system. `LoggerInspectorPort` will be the port for resolving the inspector from the container.

**`packages/logger-pino/`, `packages/logger-winston/`, `packages/logger-bunyan/` - Backend Adapters**

- Handler adapters for Pino, Winston, and Bunyan. The `LoggerInspector` works independently of which backend is wired -- it observes the `LogHandler` layer.

## Out of Scope

- Typed library snapshots at the container level (the container sees `Record<string, unknown>` -- type narrowing is the caller's responsibility via library-provided type guards)
- Cross-library event correlation (e.g., correlating a Flow transition with a Store state change -- this is Phase 3.9 Unified Knowledge Model work)
- Library inspector hot-reload (replacing a running inspector's implementation without disposing)
- Library inspector versioning or capability negotiation
- Persistence of unified snapshots to storage
- MCP/A2A protocol exposure of the unified snapshot (Phase 4 Communication)
- DevTools UI for the unified snapshot (Phase 4 Communication)
- Automatic library inspector creation (libraries must explicitly provide the bridge adapter)
- Tracing integration for library inspector operations (library inspectors are read-only query APIs, not resolution paths)
