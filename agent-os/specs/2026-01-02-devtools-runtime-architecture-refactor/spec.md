# Specification: DevTools Runtime Architecture Refactor

## Goal

Refactor HexDI DevTools to invert the current architecture where:

- **Current (Wrong)**: `HexDiDevToolsFlow` is a React wrapper that owns container discovery via XState machines
- **Target (Correct)**: `DevToolsRuntime` owns all state including container discovery, React layer becomes thin UI bindings

The refactor simplifies the API from:

```tsx
<HexDiDevToolsFlow graph={graph} container={container} />
```

To:

```tsx
<HexDiDevTools container={container} />
```

## User Stories

- As a developer, I want to pass only my root container to DevTools and have it automatically discover all child containers
- As a developer, I want the graph to be obtained from the container automatically without passing it separately
- As a library consumer, I want a clear migration path from the old API to the new simplified API
- As a plugin author, I want a well-defined PluginProps contract that provides all data I need without direct inspector access

## Specific Requirements

### DevToolsRuntime State Management (Q1 Decision)

**Decision: Pure `transition()` + Map using @hex-di/flow**

- Runtime uses `transition()` from `@hex-di/flow` for pure state transitions
- Container FSMs stored in `Map<containerId, { state, context }>`
- Runtime owns `AbortController` per container for activity lifecycle
- React subscribes via `useSyncExternalStore` pattern
- No React hooks or state in runtime layer

```typescript
// Runtime owns container FSMs - no React dependencies
class ContainerLifecycleRuntime {
  private containers = new Map<
    string,
    {
      state: ContainerDiscoveryState;
      context: ContainerDiscoveryContext;
    }
  >();

  // Pure state transition
  transitionContainer(id: string, event: ContainerEvent): void {
    const instance = this.containers.get(id);
    const result = transition(instance.state, instance.context, event, containerDiscoveryMachine);
    if (result.transitioned) {
      instance.state = result.newState;
      instance.context = result.newContext;
      this.notify();
    }
  }

  // Activity management
  private abortControllers = new Map<string, AbortController>();
}
```

Container lifecycle states:

- `pending` - Discovered, awaiting subscription
- `subscribing` - Establishing inspector subscription
- `active` - Subscribed and monitoring
- `paused` - User-initiated pause
- `error` - Subscription failed (retryable)
- `disposing` - Container being disposed
- `disposed` - Terminal state

### Graph Access from Container (Q2a Decision)

**Decision: Store graph reference in Container internal state**

- Graph stored in `ContainerInternalState` during `createContainer()`
- Accessible via `INTERNAL_ACCESS` symbol for DevTools
- No public `getGraph()` method on Container API
- InspectorPlugin's `getGraphData()` method exposes visualization-ready data

```typescript
// ContainerInternalState addition
interface ContainerInternalState {
  readonly graph: Graph<TProvides, TAsyncPorts>;
  // ... existing state
}

// InspectorWithSubscription extension
interface InspectorWithSubscription {
  // Existing methods...

  /** Returns graph data for DevTools visualization */
  getGraphData(): ContainerGraphData;
}

interface ContainerGraphData {
  readonly adapters: readonly VisualizableAdapter[];
  readonly containerName: string;
  readonly kind: "root" | "child" | "lazy";
  readonly parentName: string | null;
}

interface VisualizableAdapter {
  readonly portName: string;
  readonly lifetime: "singleton" | "scoped" | "transient";
  readonly factoryKind: "sync" | "async";
  readonly dependencyNames: readonly string[];
  readonly origin: "local" | "inherited" | "override";
  readonly inheritanceMode?: "shared" | "forked" | "isolated";
}
```

### FlowPlugin Package Structure (Q2b Decision)

**Decision: Separate `@hex-di/devtools-flow` package**

- FlowPlugin is NOT bundled in `defaultPlugins()`
- Users explicitly install and import FlowPlugin
- Follows existing `@hex-di/devtools-network` pattern

```typescript
// Package: @hex-di/devtools-flow
{
  "peerDependencies": {
    "@hex-di/flow": ">=0.1.0",
    "@hex-di/devtools": ">=0.1.0",
    "react": ">=19.0.0"
  }
}

// Usage
import { HexDiDevTools, defaultPlugins } from '@hex-di/devtools/react';
import { FlowPlugin } from '@hex-di/devtools-flow';

<HexDiDevTools
  container={container}
  plugins={[...defaultPlugins(), FlowPlugin()]}
/>
```

### FlowPlugin Visibility (Q2c Decision)

**Decision: Configurable visibility, default "user" only**

```typescript
interface FlowPluginOptions {
  /**
   * Filter for which FlowServices to display.
   * @default "user" - excludes DevTools internal machines
   */
  readonly visibility?: "user" | "all" | "custom";

  /** Custom filter when visibility is "custom" */
  readonly filter?: (service: FlowServiceSnapshot) => boolean;

  /** Prefixes to exclude for "user" mode */
  readonly internalPrefixes?: readonly string[];
}

// Defaults
const DEFAULT_INTERNAL_PREFIXES = ["__devtools", "__internal", "devtools."];

// Usage
FlowPlugin(); // Default: user machines only
FlowPlugin({ visibility: "all" }); // Include DevTools internals
FlowPlugin({
  visibility: "custom",
  filter: s => s.portName.startsWith("App"),
});
```

### Event Buffer Size (Q3 Decision)

**Decision: Per-container configurable ring buffer**

```typescript
interface DevToolsRuntimeConfig {
  /**
   * Maximum events to buffer per container.
   * @default 500
   */
  readonly maxEventsPerContainer?: number;

  /**
   * Maximum total events across all containers.
   * @default 5000
   */
  readonly maxTotalEvents?: number;

  /**
   * Event types to never evict.
   * @default ["error", "phase-changed"]
   */
  readonly protectedEventTypes?: readonly string[];
}
```

Memory estimation:
| Containers | Events/Container | Total Events | Est. Memory |
|------------|------------------|--------------|-------------|
| 1 | 500 | 500 | ~50KB |
| 5 | 500 | 2,500 | ~250KB |
| 10 | 500 | 5,000 (capped) | ~500KB |

### Plugin Data Access (Q4 Decision)

**Decision: Strict encapsulation - plugins only receive data via PluginProps**

- Plugins are pure renderers receiving data through props
- Runtime owns all inspector subscriptions internally
- Plugins dispatch commands through runtime, never call inspector directly

```typescript
interface PluginProps {
  /** Runtime snapshot - all container data pre-computed */
  readonly snapshot: DevToolsRuntimeSnapshot;

  /** Dispatch commands to runtime */
  readonly dispatch: (command: DevToolsCommand) => void;

  /** Pre-built graph for selected containers */
  readonly graph: ExportedGraph;

  /** Selected containers with full data */
  readonly containers: readonly ContainerEntry[];

  /** Tracing data (if enabled) */
  readonly tracingAPI?: TracingAPI;

  /** Flow data (if FlowPlugin enabled) */
  readonly flowTracingAPI?: FlowTracingAPI;
}
```

Data flow:

```
InspectorWithSubscription (per container)
         │
         ▼
DevToolsRuntime (aggregates, transforms)
         │
         ▼
DevToolsRuntimeSnapshot (immutable)
         │
         ▼ useSyncExternalStore
         │
PluginProps (derived from snapshot)
         │
         ▼
Plugin Components (pure renderers)
```

### Container Discovery Scope (Q5 Decision)

**Decision: Automatic full tree discovery with opt-out flag**

- Runtime automatically discovers ALL child containers from root
- Containers can opt-out via `devtools: { discoverable: false }`
- Lazy containers shown with status (pending → initializing → ready)

```typescript
interface ContainerOptions {
  readonly name?: string;
  readonly inheritanceModes?: Record<string, InheritanceMode>;

  readonly devtools?: {
    /** Whether discoverable by DevTools. @default true */
    readonly discoverable?: boolean;
    /** Custom label for DevTools display */
    readonly label?: string;
  };
}

// Discovery algorithm
function discoverContainers(root: InspectorWithSubscription): Map<string, ContainerNode> {
  const discovered = new Map();

  function visit(inspector: InspectorWithSubscription, path: string[]) {
    const snapshot = inspector.getSnapshot();

    // Skip if opted-out
    if (snapshot.devtoolsOptions?.discoverable === false) return;

    // Add to tree
    discovered.set(snapshot.containerId, createContainerNode(inspector, path));

    // Recurse to children
    for (const child of inspector.getChildContainers()) {
      visit(child, [...path, snapshot.containerId]);
    }
  }

  visit(root, []);
  return discovered;
}
```

Discovery triggers:

- Runtime created with root → Discover full tree
- `child-created` event → Discover new child subtree
- `child-disposed` event → Remove child subtree
- Lazy container initializes → Discover when ready

### Event Aggregation Strategy (Q6 Decision)

**Decision: Centralized bounded stream with filtering**

```typescript
interface TaggedContainerEvent {
  readonly id: string;
  readonly containerId: string;
  readonly containerPath: readonly string[];
  readonly containerName: string;
  readonly event: InspectorEvent;
  readonly timestamp: number;
}

interface EventFilter {
  readonly containerIds?: readonly string[];
  readonly eventTypes?: readonly InspectorEventType[];
  readonly timeRange?: { start?: number; end?: number };
  readonly portName?: string;
  readonly slowThresholdMs?: number;
}

type InspectorEventType =
  | "resolution"
  | "scope-created"
  | "scope-disposed"
  | "child-created"
  | "child-disposed"
  | "phase-changed"
  | "snapshot-changed";

class EventAggregator {
  private readonly buffer: RingBuffer<TaggedContainerEvent>;

  pushEvent(containerId: string, containerPath: string[], event: InspectorEvent): void;
  getAllEvents(): readonly TaggedContainerEvent[];
  getFilteredEvents(filter: EventFilter): readonly TaggedContainerEvent[];
  subscribe(listener: (event: TaggedContainerEvent) => void): () => void;
}
```

### Migration Strategy (Q7 Decision)

**Decision: Phased deprecation with 4 phases**

#### Phase 1: Add New API (Non-breaking)

```typescript
// NEW: Simplified API
<HexDiDevTools container={container} plugins={defaultPlugins()} />

// OLD: Still works
<HexDiDevToolsFlow graph={graph} container={container} />
```

#### Phase 2: Deprecation Warnings

```typescript
export function HexDiDevToolsFlow(props) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[HexDI DevTools] HexDiDevToolsFlow is deprecated. " +
        "Use <HexDiDevTools container={container} /> instead."
    );
  }
  // ...
}
```

#### Phase 3: Internal Refactor

- `HexDiDevToolsFlow` internally uses new runtime
- Old API becomes adapter to new implementation
- No external behavior change

#### Phase 4: Remove Deprecated Code (v1.0.0)

- Remove `HexDiDevToolsFlow` export
- Remove `graph` prop from `HexDiDevTools`
- Remove `DevToolsFlowProvider`
- Clean up old machine files

Timeline:
| Phase | Version | Changes |
|-------|---------|---------|
| Phase 1 | v0.x.0 | Add new API |
| Phase 2 | v0.x.1 | Deprecation warnings |
| Phase 3 | v0.x.2 | Internal refactor |
| Phase 4 | v1.0.0 | Remove deprecated (breaking) |

## Existing Code to Leverage

**`packages/devtools/src/runtime/`**

- Existing `DevToolsRuntime` with command/event pattern
- Extend with container lifecycle management
- Keep plugin registration pattern

**`packages/devtools/src/machines/`**

- `container-discovery.machine.ts` - Move execution to runtime
- `devtools-ui.machine.ts` - Keep for UI state
- `tracing.machine.ts` - Keep for trace collection

**`packages/flow/src/machine/`**

- `transition()` function for pure state transitions
- `createMachine()` for machine definitions
- `defineEvents()` for type-safe events

**`packages/inspector/src/types.ts`**

- `InspectorWithSubscription` interface
- Extend with `getGraphData()` method

**`packages/devtools/src/react/utils/build-graph-from-container.ts`**

- Existing graph reconstruction utilities
- Adapt for new `ContainerGraphData` type

## Out of Scope

**Core Package Changes**

- No changes to `@hex-di/ports`
- No changes to `@hex-di/graph`
- `@hex-di/runtime` - Only add devtools options to ContainerOptions
- `@hex-di/inspector` - Only extend with `getGraphData()`

**Network/Remote**

- Remote DevTools protocol
- WebSocket server for remote inspection
- Browser extension communication
- Multi-tab synchronization

**FlowPlugin Implementation**

- Full visualizer implementation (separate spec)
- State graph rendering with react-flow/d3
- Time-travel debugging

**UI/UX Enhancements**

- Dark mode / theming
- Resizable panels
- Drag-and-drop tab reordering
- Custom keyboard shortcuts configuration

**Advanced Features**

- Event replay / time-travel
- State snapshots / export
- Performance profiling
- Memory leak detection

**Other**

- E2E test infrastructure
- Virtualized lists for large event counts
- Full WCAG accessibility audit
- Internationalization

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DevToolsRuntime                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Container Lifecycle Manager                                     │    │
│  │  - Map<containerId, { state, context }> (FSM per container)     │    │
│  │  - transition() from @hex-di/flow (pure)                        │    │
│  │  - AbortController per container (activity lifecycle)           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Event Aggregator                                                │    │
│  │  - RingBuffer<TaggedContainerEvent>                             │    │
│  │  - 500 events/container, 5000 total cap                         │    │
│  │  - Protected types: error, phase-changed                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Container Tree                                                  │    │
│  │  - Automatic discovery from root                                │    │
│  │  - Opt-out via devtools.discoverable: false                     │    │
│  │  - Lazy container status tracking                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    │ getSnapshot()                       │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  DevToolsRuntimeSnapshot (immutable)                             │    │
│  │  - containerTree, events, uiState, tracingState                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ useSyncExternalStore
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            React Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  DevToolsRuntimeProvider (context)                               │    │
│  │  useDevToolsSelector (memoized selectors)                       │    │
│  │  useDevToolsDispatch (command dispatch)                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  PluginProps (derived from snapshot)                             │    │
│  │  - snapshot, dispatch, graph, containers, tracingAPI            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│          ┌─────────────┬──────────┴───────────┬─────────────┐           │
│          ▼             ▼                      ▼             ▼           │
│    ┌──────────┐  ┌──────────┐          ┌──────────┐  ┌──────────┐       │
│    │  Graph   │  │ Services │          │ Tracing  │  │Inspector │       │
│    │  Plugin  │  │  Plugin  │          │  Plugin  │  │  Plugin  │       │
│    └──────────┘  └──────────┘          └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────────────┘

External (separate package):
┌─────────────────────────────────────────────────────────────────────────┐
│  @hex-di/devtools-flow                                                   │
│  ┌──────────┐                                                           │
│  │  Flow    │  - State graph visualization                              │
│  │  Plugin  │  - Transition timeline                                    │
│  │          │  - Context inspector                                      │
│  │          │  - Activity monitor                                       │
│  └──────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Summary

### New Public API

```typescript
// Main component - simplified
<HexDiDevTools
  container={container}           // Container with InspectorPlugin (required)
  plugins={defaultPlugins()}      // Optional, defaults to defaultPlugins()
  position="bottom-right"         // Optional position
/>

// Container requirements
const container = pipe(
  createContainer(graph, {
    name: "App",
    devtools: { discoverable: true }  // Optional, default true
  }),
  withInspector  // Required for DevTools
);

// FlowPlugin (separate package)
import { FlowPlugin } from '@hex-di/devtools-flow';
plugins={[...defaultPlugins(), FlowPlugin({ visibility: "user" })]}
```

### Runtime Configuration

```typescript
const runtime = createDevToolsRuntime({
  plugins: defaultPlugins(),
  maxEventsPerContainer: 500,
  maxTotalEvents: 5000,
  protectedEventTypes: ["error", "phase-changed"],
});
```

### Command Types

```typescript
type UICommand =
  | { type: "ui.open" }
  | { type: "ui.close" }
  | { type: "ui.toggle" }
  | { type: "ui.selectTab"; tabId: string }
  | { type: "ui.selectContainer"; containerId: string }
  | { type: "ui.toggleContainer"; containerId: string }
  | { type: "ui.expandContainer"; containerId: string }
  | { type: "ui.collapseContainer"; containerId: string };

type TracingCommand =
  | { type: "tracing.start" }
  | { type: "tracing.pause" }
  | { type: "tracing.resume" }
  | { type: "tracing.stop" }
  | { type: "tracing.clear" }
  | { type: "tracing.setFilter"; filter: EventFilter };
```
