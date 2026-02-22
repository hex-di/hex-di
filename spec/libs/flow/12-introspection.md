# Specification: Flow Introspection & DevTools

## Goal

Provide runtime visibility into flow machine state, transitions, and activities through a FlowRegistry, FlowInspector, tracing span integration, and an MCP-compatible diagnostic surface that makes flow state queryable by both developers and AI agents.

## User Stories

- As a developer, I want to query the current state, context, and running activities of any active flow machine so that I can debug issues without adding custom logging
- As an AI agent (via MCP), I want to enumerate all running flow machines and inspect their state so that I can diagnose application behavior automatically

## Specific Requirements

**FlowRegistry for Machine Tracking (REQUIRED)**

- Implement `FlowRegistry` at `libs/flow/core/src/inspection/registry.ts` that tracks live FlowService instances within a single scope
- Implement `createFlowRegistry()` factory function that returns a `FlowRegistry` instance
- Internal data structure: `Map<portName, Map<instanceId, FlowRegistryEntry>>` where `FlowRegistryEntry` contains the `FlowServiceAny` instance plus scope metadata
- ```typescript
  interface FlowRegistryEntry {
    readonly service: FlowServiceAny;
    readonly portName: string;
    readonly instanceId: string;
    readonly scopeId: string;
    readonly scopeName?: string;
    readonly registeredAt: number;
  }
  ```
- `register(entry: FlowRegistryEntry)` called automatically by `createFlowAdapter`'s factory function after creating the FlowService. The factory generates a unique `instanceId` per service instance (e.g., `${portName}-${counter}`)
- `unregister(portName, instanceId)` called automatically in the FlowAdapter finalizer during scope disposal, before calling `service.dispose()`
- Expose read-only query methods:
  - `getAllMachines(portName)`: returns all entries for a port within this scope
  - `getMachine(portName, instanceId)`: returns a specific entry within this scope
  - `getAllPortNames()`: returns all registered port names within this scope
  - `getTotalMachineCount()`: returns total count across all ports within this scope
  - `getMachinesByState(stateName)`: queries all machines within this scope currently in the given state (enables "find all machines in error states" queries)
- **Scoping model**: FlowRegistry has `scoped` lifetime -- each container scope owns its own registry instance that tracks only the machines created within that scope. Child scopes never write into parent registries. Cross-scope aggregation (e.g., "list all machines across the entire scope tree") is handled by `FlowInspector` lazily traversing the scope tree at query time (pull model), following the same pattern as `buildScopeTreeNode` in `packages/runtime/src/inspection/creation.ts`. This avoids upward dependencies from child to parent and keeps each scope self-contained, consistent with the existing Container Inspector pattern (`packages/runtime/src/inspection/api.ts` -- WeakMap caching, per-container instances).
- `FlowRegistryPort` is defined at `libs/flow/core/src/inspection/registry-port.ts` and registered automatically by `createFlowAdapter` on first use (idempotent). The registry adapter has `scoped` lifetime and zero dependencies.
- The FlowRegistry emits events scoped to the local registry when machines are registered/unregistered: `'machine-registered'` and `'machine-unregistered'` events with the `FlowRegistryEntry` as payload. These events feed into the ContainerInspector event system for unified observability.

**FlowInspector for State Querying (REQUIRED)**

- Implement `FlowInspector` at `libs/flow/core/src/inspection/inspector.ts`
- Implement `createFlowInspector(registry: FlowRegistry, collector?: FlowCollector, config?: FlowInspectorConfig)` factory function
- `FlowInspector` wraps the `FlowRegistry` for read-only state queries and the optional `FlowCollector` for history queries
- Methods:
  - `getMachineState(portName, instanceId?)` returns a `MachineStateSnapshot` with state, context, validTransitions, runningActivities, pendingEvents, isDisposed, scopeId, and instanceId
  - `getValidTransitions(portName, instanceId?)` introspects the machine definition to return event types valid from the current state, including `{ event: string; target: string; guardResult?: boolean }` for each candidate transition
  - `getRunningActivities(portName, instanceId?)` delegates to `FlowService.getActivityStatus()` for each tracked activity
  - `getEventHistory(portName, options?)` returns chronological event log sourced from the FlowCollector transitions. Options: `{ limit?: number; since?: number; eventType?: string }`
  - `getStateHistory(portName, instanceId?)` returns the ordered state path from FlowCollector data
  - `getAllMachinesSnapshot()` aggregates all machines across all ports into a timestamped `AllMachinesSnapshot`
  - `getMachinesByState(stateName)` delegates to `FlowRegistry.getMachinesByState()` and returns full `MachineStateSnapshot` entries
  - `getEffectHistory(portName, options?)` returns effects executed for recent transitions, with port names, methods, durations, and success/failure
- **MachineStateSnapshot** includes `pendingEvents` from the machine's snapshot, exposing the event queue for diagnostic queries
- When `instanceId` is omitted from any query method and the port has a single registered machine, that machine is used. When multiple machines exist for the port, the method throws a descriptive error listing available instance IDs.

**ContainerInspector Integration (REQUIRED)**

- Register FlowInspector with the existing `ContainerInspector` at `packages/runtime/src/inspection/`
- The ContainerInspector must expose a `getFlowInspector(): FlowInspector | undefined` accessor
- FlowInspector is lazily created on first access to avoid overhead for containers that do not use Flow
- The unified `ContainerSnapshot` type must include an optional `flow?: FlowContainerSnapshot` section:
  ```typescript
  interface FlowContainerSnapshot {
    readonly totalMachines: number;
    readonly portNames: readonly string[];
    readonly machines: readonly MachineStateSnapshot[];
    readonly healthEvents: readonly FlowHealthEvent[];
  }
  ```
- When `containerInspector.snapshot()` is called, the flow section is populated by delegating to `flowInspector.getAllMachinesSnapshot()` and the health event buffer
- This ensures the container snapshot is the single source of truth for ALL self-knowledge, including flow state -- consistent with the VISION's "single convergence point" principle

**Tracing Integration for Flow Transitions (REQUIRED)**

- Implement `createFlowTracingHook(tracer, options?)` at `libs/flow/core/src/tracing/tracing-hook.ts` that bridges flow transitions to `@hex-di/tracing` spans
- This MUST follow the established pattern from `createTracingHook` in `packages/tracing/src/instrumentation/hooks.ts`: use the shared `pushSpan`/`popSpan` span stack from `packages/tracing/src/instrumentation/span-stack.ts` for parent-child span correlation

- **FlowTracingHook interface (Result-integrated):**
  ```typescript
  interface FlowTracingHook {
    onTransitionStart(machineId: string, event: EventAny, fromState: string): void;
    onTransitionEnd(
      machineId: string,
      toState: string,
      effects: readonly EffectAny[],
      result: Result<void, TransitionError>
    ): void;
    onEffectStart(machineId: string, effect: EffectAny): void;
    onEffectEnd(
      machineId: string,
      effect: EffectAny,
      result: Result<void, EffectExecutionError>
    ): void;
  }
  ```
- Uses `recordResult(span, result)` from spec/result §54 to automatically record Ok/Err status, error `_tag`, and error details as span attributes
- Cross-reference: `recordResult` from spec/result/12-hexdi-integration.md; `TransitionError` and `EffectExecutionError` from spec 05

- **Shared span stack integration:** Flow tracing uses the SAME `pushSpan`/`popSpan` stack as the container's resolution tracing. This is critical for unified trace trees:
  1. When the container resolves `OrderFlowPort`, `createTracingHook` pushes a `resolve:OrderFlowPort` span onto the stack
  2. When the machine transitions, `createFlowTracingHook` pushes a `flow:orderMachine/idle->validating` span -- this becomes a child of the resolution span because the resolution span is on the stack
  3. When an effect calls `Effect.invoke(ValidatorPort, 'validate')`, the DIEffectExecutor triggers the hook which pushes `flow:effect:invoke:ValidatorPort.validate` -- this becomes a child of the transition span
  4. The resolution of `ValidatorPort` within the effect triggers `createTracingHook` again, pushing `resolve:ValidatorPort` as a child of the effect span
  - Result: `resolve:OrderFlowPort -> flow:orderMachine/idle->validating -> flow:effect:invoke:ValidatorPort.validate -> resolve:ValidatorPort`

- **Transition spans:**
  - Span name: `flow:${machineId}/${fromState}->${toState}`
  - Attributes: `hex-di.flow.machine_id`, `hex-di.flow.prev_state`, `hex-di.flow.next_state`, `hex-di.flow.event_type`, `hex-di.flow.effect_count`, `hex-di.flow.pending_events_count`
  - `onTransitionStart` creates the span and pushes it onto the stack
  - `onTransitionEnd` pops the span, sets status (ok/error), records duration, and ends it

- **Effect child spans:**
  - For `Invoke`: span name `flow:effect:invoke:${portName}.${method}`, attributes for port name, method, args count, duration, success/failure
  - For `Spawn`: span name `flow:effect:spawn:${activityPortName}`, attributes for activity port name and input type
  - For `Parallel`/`Sequence`: span name `flow:effect:${tag.toLowerCase()}`, attributes for child effect count
  - `onEffectStart` creates the child span and pushes it; `onEffectEnd` pops and ends it
  - The DIEffectExecutor calls `tracingHook.onEffectStart`/`onEffectEnd` around each effect's execution (see spec 07 "Type-Safe Port Resolution" for executor config)

- **Wiring:** The tracing hook is wired automatically by `createFlowAdapter` when `TracerPort` is available in the adapter's `requires` ports or detectable via `graph.has(TracerPort)`. Detection happens at adapter creation time (not resolution time).
- **Zero-overhead opt-out:** When `TracerPort` is not available, zero overhead -- no hook is installed, no span objects are created, the DIEffectExecutor's `tracingHook` config is `undefined`
- **Options:**
  ```typescript
  interface FlowTracingHookOptions {
    readonly filter?: (machineId: string) => boolean;
    readonly traceEffects?: boolean; // default: true
    readonly minTransitionDurationMs?: number; // default: 0
  }
  ```

**FlowInspector Configuration (REQUIRED)**

- `createFlowInspector(registry: FlowRegistry, collector?: FlowCollector, config?: FlowInspectorConfig)` accepts an optional configuration object as its third parameter
- ```typescript
  interface FlowInspectorConfig {
    readonly eventHistoryBufferSize?: number; // default: 10,000
    readonly stateHistoryBufferSize?: number; // default: 1,000
    readonly effectHistoryBufferSize?: number; // default: 1,000
    readonly healthEventBufferSize?: number; // default: 100
    readonly crossScopeAggregationCacheTTLMs?: number; // default: 5,000
  }
  ```
- All history buffers use the **circular buffer pattern** established by `MemoryTracer` in `packages/tracing/src/adapters/memory/tracer.ts`: a pre-allocated array with head/tail/size pointers, FIFO eviction when full, O(1) insertion and eviction (no `Array.splice` or `Array.shift`)
- This replaces any previous `enforceFIFOLimit`-style splice-based eviction with the O(1) circular buffer data structure
- Defaults are chosen to match the `MemoryTracer` precedent (10,000 for event-level buffers) and scale down for coarser-grained data (1,000 for state/effect histories, 100 for health events)
- Cross-reference: Phase 2 AWARENESS Layer 3 Section 3.5

**Event Timeline for Debugging**

- Store a chronological log of all events and resulting state changes per machine instance in a **bounded circular buffer** (default capacity: 10,000, matching `MemoryTracer`)
- The buffer is a pre-allocated array with head/tail/size pointers implementing FIFO eviction when full -- entries are overwritten in-place, not spliced
- Buffer size is configurable via `FlowInspectorConfig.eventHistoryBufferSize`
- Reuse the existing `FlowMemoryCollector` and `FlowTransitionEvent` types as the storage backend
- Provide a `getTimeline(machineId, options?)` method on FlowInspector with limit and time-range filtering
- Each timeline entry includes: event type, payload, timestamp, previous state, next state, effects produced, and duration
- Note: this replaces the previous `enforceFIFOLimit` splice-based eviction with an O(1) circular buffer

**State History Tracking**

- Track all past states for each machine instance in a **bounded circular buffer** (default capacity: 1,000)
- Entry shape: `{ state: string; enteredAt: number; exitedAt: number | undefined }`
- Buffer size is configurable via `FlowInspectorConfig.stateHistoryBufferSize`
- Uses the same circular buffer data structure as the event history (pre-allocated array, head/tail/size pointers, FIFO eviction)
- Provide `getStateHistory(portName, instanceId?)` on FlowInspector that returns the ordered state path

**Cross-Scope Aggregation Caching (REQUIRED)**

- `getAllMachinesSnapshot()` lazily traverses the scope tree at query time (pull-model), following the same pattern as `buildScopeTreeNode` in `packages/runtime/src/inspection/creation.ts`
- The traversal result is cached with a configurable TTL (`FlowInspectorConfig.crossScopeAggregationCacheTTLMs`, default: 5,000ms)
- Cache is automatically invalidated when the local `FlowRegistry` emits `'machine-registered'` or `'machine-unregistered'` events, ensuring stale data is never served after topology changes
- Manual invalidation is available via `FlowInspector.invalidateAggregationCache()` for cases where consumers need a guaranteed-fresh snapshot
- Cross-reference: follows the `packages/runtime/src/inspection/api.ts` WeakMap caching pattern for per-container inspector instances
- The caching layer adds zero overhead to individual machine queries (`getMachineState`, `getValidTransitions`, etc.) -- it only applies to the aggregate `getAllMachinesSnapshot()` and `getMachinesByState()` cross-scope queries

**MCP Tool Surface for AI Agent Inspection**

- Define MCP tool schemas that map to FlowInspector methods. The full tool set:
  - `flow.list_machines` -- enumerate all active machines with port name, state, scope, and disposed status
  - `flow.get_state` -- get current state, context, valid transitions, and running activities for a machine
  - `flow.get_timeline` -- chronological event log with filtering by machine, state, event type, and time range
  - `flow.get_activities` -- list all activities (running, completed, failed) with status and timing
  - `flow.get_machine_definition` -- return the structural definition of a machine: states, events, transitions per state, guards, effects per state, and activity port names (Layer 1 structural query)
  - `flow.get_valid_transitions` -- return event types that would trigger a valid transition from the current state, including guard evaluation results
  - `flow.send_event` -- send an event to a running machine for AI-driven debugging and diagnosis (requires explicit opt-in via `allowRemoteEvents: true` on the FlowAdapter config)
  - `flow.get_effect_history` -- return effects executed for recent transitions, including port names, methods, durations, and success/failure status
  - `flow.get_state_history` -- return the ordered sequence of states a machine has visited with entry/exit timestamps
  - `flow.get_machines_by_state` -- filter all machines currently in a specific state (e.g., find all machines in error states)
- Tool responses must return structured JSON matching MachineStateSnapshot, AllMachinesSnapshot, and MachineDefinitionExport interfaces
- Integrate with the Phase 4 MCP server infrastructure from `@hex-di/mcp` (when it exists) by registering flow tools during container setup

**A2A Skill Definitions for Agent-to-Agent Collaboration**

- Define A2A skills that expose flow machine capabilities as agent skills, registered via the application's A2A Agent Card:
  - `flow.inspect-machines` -- skill for querying machine state, valid transitions, and activity status across the application
  - `flow.diagnose-flow` -- skill that combines timeline, effect history, and state history to provide diagnosis of flow failures or anomalies
  - `flow.replay-scenario` -- skill that accepts an event sequence and returns the resulting state path and effects without executing side effects (dry-run using the pure interpreter)
- Skill definitions follow the A2A Agent Card format with `id`, `name`, `description`, and `examples` fields
- Skills delegate to FlowInspector methods internally and return structured JSON responses
- Registration is opt-in: skills are only published when `@hex-di/a2a` is present in the container

**Dependency Graph Metadata Enrichment**

- When a FlowAdapter is registered in the dependency graph via `GraphBuilder.provide()`, attach machine structural metadata to the graph node
- The metadata should be stored via the existing `VisualizableAdapter.metadata` extension point and include:
  - `machineId`: the machine's `id` property
  - `stateNames`: array of all state name strings
  - `eventNames`: array of all event type strings
  - `initialState`: the machine's initial state name
  - `transitionsPerState`: record mapping state name to array of `{ event, target, hasGuard, hasEffects }` summaries
  - `activityPortNames`: array of activity port names declared in the adapter's activities
  - `finalStates`: array of state names with `type: 'final'`
- This metadata becomes part of the container's Layer 1 (Structure) self-knowledge, queryable via `graph.inspect()` without needing a running FlowInspector
- The metadata is computed once at adapter registration time (compile-time structural data, not runtime state)
- Enables the VISION's structural queries: "what state machines exist?", "what events does OrderFlow handle?", "what services would be affected if PaymentPort changed?" now includes flow-level detail

**Statechart Visualization Export**

- Implement `exportStatechart(machine)` that produces a JSON representation of the machine definition including states, transitions, guards, and effects
- Output format should be a flat JSON object with `states`, `transitions`, `events`, and `initial` fields (not SCXML, to keep it simple and parseable)
- Include metadata: state entry/exit effects, guard names, activity port names per state

**Flow Error Reporting to Container Health**

- When a flow machine enters a state marked `type: 'final'` that represents an error (convention: state name contains 'error' or 'failed', or an explicit `errorState: true` flag in state config), emit a container-level health event
- Health events use a structured `FlowHealthEvent` type:

  ```typescript
  interface FlowHealthEvent {
    readonly type: "flow-error" | "flow-degraded" | "flow-recovered";
    readonly machineId: string;
    readonly portName: string;
    readonly instanceId: string;
    readonly scopeId: string;
    readonly timestamp: number;
    readonly detail: FlowErrorDetail | FlowDegradedDetail | FlowRecoveredDetail;
  }

  interface FlowErrorDetail {
    readonly errorState: string;
    readonly lastEventType: string;
    readonly context: unknown;
  }

  interface FlowDegradedDetail {
    readonly failingPort: string;
    readonly effectType: string;
    readonly failureCount: number;
    readonly windowMs: number;
    readonly errorsByTag?: Record<string, number>;
  }

  interface FlowRecoveredDetail {
    readonly previousErrorState: string;
    readonly recoveredToState: string;
  }
  ```

- This feeds into the VISION's MAPE-K loop: the Monitor phase captures flow errors, the Analyze phase can correlate them with tracing data, and the Plan phase can surface suggestions
- Health events are emitted via the existing ContainerInspector event system using `inspector.emit(healthEvent)`
- When effect execution fails repeatedly for the same port (configurable threshold, default 3 failures within 60 seconds), emit a `'flow-degraded'` health event identifying the failing port and effect type
- When a machine recovers from an error state (transitions from a state with `errorState: true` to a non-error state), emit a `'flow-recovered'` health event
- Health events are buffered in a ring buffer (configurable size, default 100) accessible via `FlowInspector.getHealthEvents(options?)` for retrospective diagnosis

**Effect Result Statistics (Result Integration)**

- `FlowInspector.getEffectResultStatistics(portName): ResultStatistics | undefined` — tracks per-port ok/err rates from effect execution results
- Reuses `ResultStatistics` interface from spec/result §55: `{ portName, totalCalls, okCount, errCount, errorRate, errorsByTag, lastError }`
- `FlowInspector.getHighErrorRatePorts(threshold): readonly ResultStatistics[]` — surfaces ports exceeding the given error rate threshold
- Replaces the heuristic "3 failures in 60 seconds" threshold for `flow-degraded` health events with data-driven thresholds based on `errorRate`
- Health events now carry `errorsByTag` breakdown: e.g., `{ InvokeError: 12, ResolutionError: 3 }`, enabling fine-grained diagnosis of failure causes
- The `flow-degraded` health event `FlowDegradedDetail` is extended to include `errorsByTag: Record<string, number>` alongside existing `failureCount` and `windowMs` fields

## Existing Code to Leverage

**FlowCollector and FlowMemoryCollector (`libs/flow/core/src/tracing/`)**

- Already implements transition event collection with filtering, FIFO eviction, pinning, time-based expiry, and subscription
- FlowInspector's event timeline and state history should read from FlowCollector rather than duplicating storage
- The `FlowTransitionFilter` interface already supports machineId, state, eventType, and duration filtering

**TracingRunner (`libs/flow/core/src/tracing/tracing-runner.ts`)**

- `createTracingRunnerWithDuration` already wraps MachineRunner to measure transition duration and collect events
- Tracing span integration should be added as a layer on top of this, emitting `@hex-di/tracing` spans in addition to FlowCollector events

**DevTools ActivityMetadata (`libs/flow/core/src/devtools/`)**

- `getActivityMetadata(activity)` already extracts portName, requires, emits, hasCleanup, and defaultTimeout from configured activities
- Reuse this for the statechart export to include activity metadata per state

**Container Inspector Pattern (`packages/runtime/src/inspection/`)**

- The runtime already has an inspection module with snapshot and API patterns
- FlowInspector registration should follow the same module structure and naming conventions

**Tracing Hooks (`packages/tracing/src/instrumentation/hooks.ts`)**

- `createTracingHook` demonstrates the pattern for opt-in span creation with filtering, attribute building, and parent-child span relationships via the shared span stack
- Flow tracing integration MUST use the same `pushSpan`/`popSpan` from `packages/tracing/src/instrumentation/span-stack.ts` to achieve unified trace trees across container resolution and flow transitions
- The shared stack ensures that when a flow effect triggers a port resolution, the resolution span appears as a child of the effect span, creating end-to-end traces

## Out of Scope

- Browser extension DevTools protocol implementation (future work; this spec covers the data layer only)
- Real-time WebSocket streaming of flow events to external consumers
- Persistence of flow inspection data across process restarts
- Custom visualization UI or dashboard rendering
- Performance profiling or flame graph generation from flow traces
- Cross-container machine coordination or discovery
- Flow-specific React DevTools integration hooks (covered in a separate React integration spec)
- Automatic anomaly detection on flow transitions
- GraphQL or REST API endpoints for flow inspection (MCP tools only)
- Machine definition hot-reloading or runtime modification
