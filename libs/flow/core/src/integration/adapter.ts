/**
 * Flow Adapter Factory
 *
 * This module provides the createFlowAdapter factory function that creates
 * HexDI adapters for state machines.
 *
 * @packageDocumentation
 */

import type { Port, InferService, Adapter, Lifetime, ResolvedDeps } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { getDescriptorValue } from "../utils/type-bridge.js";
import type { Machine } from "../machine/types.js";
import { createMachineRunner } from "../runner/create-runner.js";
import { createActivityManager } from "../activities/manager.js";
import { createDIEffectExecutor } from "./di-executor.js";
import type {
  FlowService,
  ScopeResolver,
  ActivityRegistry,
  ActivityDepsResolver,
} from "./types.js";
import type { FlowPort } from "./port.js";
import type { PortDeps } from "@hex-di/core";
import type { ConfiguredActivityAny } from "../activities/types.js";
import type { FlowAdapterCreationError } from "../errors/index.js";
import { DuplicateActivityPort, ActivityNotFrozen } from "../errors/index.js";
import type {
  FlowRegistry,
  FlowTracingHook,
  EffectResultRecord,
  TracerLike,
  HealthEvent,
} from "../introspection/types.js";
import type { FlowEventBus } from "../event-bus/index.js";
import { createFlowTracingHook } from "../introspection/flow-tracing-hook.js";

// =============================================================================
// Internal Type Utilities
// =============================================================================

/**
 * Converts a tuple/array type to a union of its element types.
 * @internal
 */
type TupleToUnion<T extends readonly Port<string, unknown>[]> = T extends readonly []
  ? never
  : T[number];

// =============================================================================
// Runtime Helpers
// =============================================================================

/**
 * Safely index into an unknown object by key.
 *
 * Performs runtime `typeof` checks to verify the value is a non-null object
 * before accessing the property, avoiding casts.
 *
 * @param obj - The value to index into
 * @param key - The property name to access
 * @returns The property value, or `undefined` if not accessible
 * @internal
 */
function indexObject(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (key in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    return descriptor !== undefined ? descriptor.value : undefined;
  }
  return undefined;
}

/**
 * Type guard for objects with a `dispose` method returning a thenable with
 * a `match` method (i.e., ResultAsync).
 *
 * Used at the finalizer boundary where the generic `InferService<TProvides>`
 * cannot be structurally narrowed by TypeScript.
 *
 * @internal
 */
function hasDispose(
  value: unknown
): value is { dispose(): { match(onOk: () => void, onErr: () => void): Promise<void> } } {
  if (typeof value !== "object" || value === null) return false;
  const disposeFn = indexObject(value, "dispose");
  return typeof disposeFn === "function";
}

/**
 * Extracts the `_sendInternal` non-enumerable method from a MachineRunner.
 *
 * This method is added by `createMachineRunner` to allow the adapter/executor
 * to tag re-entrant events with the correct source ("emit" or "delay").
 *
 * @internal
 */
type SendInternalFn = (
  event: { readonly type: string },
  source: "emit" | "delay" | "external"
) => unknown;

function getSendInternal(runner: unknown): SendInternalFn | undefined {
  if (typeof runner !== "object" || runner === null) return undefined;
  const value = getDescriptorValue(runner, "_sendInternal");
  if (typeof value !== "function") return undefined;
  // @ts-expect-error - value is narrowed to Function by typeof, but we know it's
  // SendInternalFn from createMachineRunner's Object.defineProperty. Same variance
  // bridge pattern used for state/context recovery in create-runner.ts.
  const fn: SendInternalFn = value;
  return fn;
}

/**
 * Type guard for TracerLike interface.
 *
 * Checks if a value has the `pushSpan` and `popSpan` methods
 * required by the TracerLike interface.
 *
 * @internal
 */
function isTracerLike(value: unknown): value is TracerLike {
  if (typeof value !== "object" || value === null) return false;
  const pushSpan = indexObject(value, "pushSpan");
  const popSpan = indexObject(value, "popSpan");
  return typeof pushSpan === "function" && typeof popSpan === "function";
}

// =============================================================================
// Flow Adapter Configuration
// =============================================================================

/**
 * Configuration for creating a FlowAdapter.
 *
 * @typeParam TProvides - The FlowPort type this adapter provides
 * @typeParam TRequires - Tuple of Port types this adapter depends on
 * @typeParam TActivities - Tuple of ConfiguredActivity types
 * @typeParam TLifetime - The lifetime scope for the adapter
 */
export interface FlowAdapterConfig<
  TProvides extends FlowPort<string, string, unknown, string>,
  TRequires extends readonly Port<string, unknown>[],
  TActivities extends readonly ConfiguredActivityAny[] = readonly [],
  TLifetime extends Lifetime = "scoped",
> {
  /**
   * The FlowPort this adapter provides.
   */
  readonly provides: TProvides;

  /**
   * The ports this adapter depends on for effect execution.
   * These ports will be resolved from the scope when executing InvokeEffects.
   */
  readonly requires: TRequires;

  /**
   * The lifetime scope for this adapter.
   * Defaults to 'scoped' which creates a new machine per scope.
   */
  readonly lifetime?: TLifetime;

  /**
   * The machine definition to use for creating MachineRunner instances.
   */
  readonly machine: Machine<string, string, unknown>;

  /**
   * Activities that can be spawned by this FlowAdapter.
   *
   * Each activity's `requires` must be a subset of this FlowAdapter's `requires`.
   * Type-level validation ensures activities can only depend on ports that
   * the FlowAdapter has access to.
   *
   * @remarks
   * Activity port names must be unique within this array.
   * Activities are resolved lazily on first spawn, not at adapter creation.
   *
   * Type validation is done via ValidateActivities, but this is applied at
   * the function signature level, not in the interface, to avoid inference issues.
   */
  readonly activities?: TActivities;

  /**
   * Default timeout in milliseconds for activity execution.
   *
   * This is used when neither the spawn options nor the activity definition
   * specifies a timeout.
   *
   * @remarks
   * The timeout fallback chain is:
   * 1. SpawnOptions.timeout (highest precedence)
   * 2. Activity.timeout (activity definition)
   * 3. defaultActivityTimeout (lowest precedence)
   */
  readonly defaultActivityTimeout?: number;

  /**
   * Optional FlowRegistry for tracking live machine instances.
   * When provided, machines are registered on creation and unregistered on disposal.
   */
  readonly registry?: FlowRegistry;

  /**
   * Optional FlowEventBus for cross-machine event routing.
   * When provided, EmitEffect events are published to the bus in addition
   * to the local event sink, enabling inter-machine communication.
   */
  readonly eventBus?: FlowEventBus;

  /**
   * Optional FlowTracingHook for distributed tracing spans.
   * When provided, transitions and effects produce tracing spans.
   */
  readonly tracingHook?: FlowTracingHook;

  /**
   * Optional callback for recording effect execution results.
   * Used by FlowInspector for effect statistics and health monitoring.
   */
  readonly onEffectResult?: (record: EffectResultRecord) => void;

  /**
   * Optional callback for emitting health events (flow-error, flow-degraded, flow-recovered).
   * Used by FlowInspector for health monitoring.
   */
  readonly onHealthEvent?: (event: HealthEvent) => void;

  /**
   * Patterns to match against state names (case-insensitive) to detect error states.
   * When `onHealthEvent` is provided, the runner automatically emits health events
   * when the machine enters or leaves an error state matching these patterns.
   *
   * @default ["error", "failed"]
   */
  readonly errorStatePatterns?: readonly string[];

  /**
   * Optional TracerLike implementation for auto-creating a FlowTracingHook.
   * When provided and `tracingHook` is not set, a FlowTracingHook is created
   * automatically with the scopeId derived from the port name.
   */
  readonly tracer?: TracerLike;

  /**
   * Optional Port for auto-resolving a TracerLike from the DI container.
   *
   * When provided and neither `tracingHook` nor `tracer` is set, the adapter
   * resolves the service from this port and creates a FlowTracingHook if
   * the resolved value matches the TracerLike shape.
   *
   * The port must be included in the `requires` array for it to be resolved.
   */
  readonly tracerPort?: Port<string, unknown>;

  /**
   * Optional scope ID to associate machines with their creating scope.
   * When provided, this is stored in the FlowRegistry entry and can be
   * used for filtering, debugging, or tracing purposes.
   */
  readonly scopeId?: string;
}

// =============================================================================
// Flow Adapter Type
// =============================================================================

/**
 * A FlowAdapter is a standard HexDI Adapter that provides a FlowService.
 */
export type FlowAdapter<
  TProvides extends FlowPort<string, string, unknown, string>,
  TRequires extends readonly Port<string, unknown>[],
  TLifetime extends Lifetime = "scoped",
> = Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", false, TRequires>;

// =============================================================================
// Flow Adapter Factory
// =============================================================================

/**
 * Creates a FlowAdapter that provides a FlowService for a state machine.
 *
 * The FlowAdapter follows the Adapter pattern from `@hex-di/graph` and creates
 * a FlowService that wraps a MachineRunner. The FlowService is configured with
 * a DIEffectExecutor that resolves ports from the container scope.
 *
 * @typeParam TProvides - The FlowPort type this adapter provides
 * @typeParam TRequires - Tuple of Port types this adapter depends on
 * @typeParam TLifetime - The lifetime scope for the adapter
 *
 * @param config - The adapter configuration
 * @returns Result containing a FlowAdapter on success, or FlowAdapterCreationError on failure
 *
 * @remarks
 * The default lifetime is 'scoped', which means each scope gets its own
 * machine instance. This matches React component lifecycles where each
 * component instance should have its own state machine.
 *
 * The adapter creates:
 * 1. An ActivityManager for tracking spawned activities
 * 2. A DIEffectExecutor that resolves ports from the scope
 * 3. A MachineRunner with the executor
 * 4. A FlowService wrapper that exposes the runner's API
 *
 * When the scope is disposed, the FlowService's dispose() method is called,
 * which stops all running activities and cleans up resources.
 *
 * @example
 * ```typescript
 * // Define the machine
 * const modalMachine = defineMachine({
 *   id: 'modal',
 *   initial: 'closed',
 *   context: { lastAction: 'none' },
 *   states: { ... }
 * });
 *
 * // Define the FlowPort
 * const ModalFlowPort = createFlowPort<...>('ModalFlow');
 *
 * // Create the adapter
 * const ModalFlowAdapter = createFlowAdapter({
 *   provides: ModalFlowPort,
 *   requires: [AnimationServicePort] as const,
 *   lifetime: 'scoped',
 *   machine: modalMachine,
 * });
 *
 * // Register in graph (unwrap the Result)
 * const graph = GraphBuilder.create()
 *   .provide(ModalFlowAdapter)
 *   .build();
 *
 * // Use from scope
 * const scope = container.createScope();
 * const modalFlow = scope.resolve(ModalFlowPort);
 * ```
 *
 * @example With activities
 * ```typescript
 * const TaskFlowAdapter = createFlowAdapter({
 *   provides: TaskFlowPort,
 *   requires: [ApiPort, LoggerPort],
 *   activities: [TaskActivity, PollingActivity],
 *   machine: taskMachine,
 *   defaultActivityTimeout: 60_000,
 * });
 * ```
 */
export function createFlowAdapter<
  TProvides extends FlowPort<string, string, unknown, string>,
  const TRequires extends readonly Port<string, unknown>[],
  const TActivities extends readonly ConfiguredActivityAny[] = readonly [],
  const TLifetime extends Lifetime = "scoped",
>(
  config: FlowAdapterConfig<TProvides, TRequires, TActivities, TLifetime>
): Result<FlowAdapter<TProvides, TRequires, TLifetime>, FlowAdapterCreationError> {
  const {
    provides,
    requires,
    machine,
    activities,
    defaultActivityTimeout,
    registry,
    eventBus,
    tracingHook,
    onEffectResult,
    onHealthEvent,
    errorStatePatterns,
    scopeId,
  } = config;
  const lifetime = config.lifetime ?? "scoped";

  // Auto-create tracing hook from tracer if tracingHook is not explicitly provided
  let resolvedTracingHook = tracingHook;
  if (resolvedTracingHook === undefined && config.tracer !== undefined) {
    resolvedTracingHook = createFlowTracingHook({
      tracer: config.tracer,
      scopeId: `${provides.__portName}-scope`,
    });
  }

  // Counter-based instance ID generation (same pattern as transitionIdCounter in tracing-runner.ts)
  let instanceIdCounter = 0;

  // Map from service instance to registry info for finalizer lookup
  const instanceRegistryInfo = new WeakMap<object, { portName: string; instanceId: string }>();

  // Validate activities at runtime
  if (activities !== undefined && activities.length > 0) {
    const validationResult = validateActivitiesAtRuntime(activities);
    if (validationResult._tag === "Err") {
      return err(validationResult.error);
    }
  }

  // Build activity registry for quick lookup by port name
  const activityRegistry = buildActivityRegistry(activities);

  // Create the factory function
  // The factory receives resolved dependencies and should return the FlowService
  const factory = (deps: ResolvedDeps<TupleToUnion<TRequires>>): InferService<TProvides> => {
    // We need a way to resolve ports. Since we have the resolved deps,
    // we can create a map from port names to resolved services.
    // Use indexObject to safely access properties without casting deps.
    const portNameToService = new Map<string, unknown>();
    for (const port of requires) {
      const portName = port.__portName;
      portNameToService.set(portName, indexObject(deps, portName));
    }

    // Create a resolver that looks up ports by name.
    const scopeResolver: ScopeResolver = {
      resolve<P extends Port<string, unknown>>(port: P): InferService<P> {
        const service = portNameToService.get(port.__portName);
        if (service === undefined) {
          // This is a programming error: the port is not in the requires list.
          // At this point we are inside a factory call from the DI container,
          // so we cannot return a Result. The DI container's resolve guarantees
          // all required deps are provided, so this branch is unreachable in
          // correct usage. We return undefined and let the caller handle it.
          // @ts-expect-error - Unreachable in correct usage: DI container guarantees all required
          // deps are resolved. TypeScript cannot evaluate InferService<P> with generic P.
          const missing: InferService<P> = undefined;
          return missing;
        }
        // @ts-expect-error - Variance bridge: Map stores `unknown` but the stored value IS
        // InferService<P> because the DI container resolved it from the correct adapter.
        // TypeScript cannot prove this because InferService<P> is a conditional type
        // with a generic parameter.
        const resolved: InferService<P> = service;
        return resolved;
      },
    };

    // Create the activity manager with default timeout
    const activityManager = createActivityManager({
      defaultTimeout: defaultActivityTimeout,
    });

    // Create activity deps resolver for spawning activities
    const activityDepsResolver = createActivityDepsResolver(deps, requires);

    // Create the DI effect executor with our scope resolver
    const executor = createDIEffectExecutor({
      scope: scopeResolver,
      activityManager,
      activityRegistry,
      activityDepsResolver,
      eventBus,
      onHealthEvent,
      machineId: machine.id,
    });

    // Auto-resolve tracer from tracerPort if no tracing hook is set yet
    let factoryTracingHook = resolvedTracingHook;
    if (factoryTracingHook === undefined && config.tracerPort !== undefined) {
      const tracerService = portNameToService.get(config.tracerPort.__portName);
      if (isTracerLike(tracerService)) {
        factoryTracingHook = createFlowTracingHook({
          tracer: tracerService,
          scopeId: `${provides.__portName}-scope`,
        });
      }
    }

    // Create the machine runner with optional tracing hook, effect result callback, and health events
    const runner = createMachineRunner(machine, {
      executor,
      activityManager,
      tracingHook: factoryTracingHook,
      onEffectResult,
      onHealthEvent,
      errorStatePatterns,
    });

    // Set context provider for Choose/Log effects to access current machine context
    executor.setContextProvider(() => ({
      context: runner.context(),
      event: { type: "" },
    }));

    // Register in FlowRegistry if available
    const portName = provides.__portName;
    instanceIdCounter += 1;
    const instanceId = `${portName}-${instanceIdCounter}`;
    if (registry !== undefined) {
      // Compute valid events from machine definition's current state 'on' keys
      const getValidEvents = (): readonly string[] => {
        const currentState = runner.state();
        const statesRecord = machine.states;
        const descriptor = Object.getOwnPropertyDescriptor(statesRecord, currentState);
        const stateNode: unknown = descriptor !== undefined ? descriptor.value : undefined;
        if (typeof stateNode !== "object" || stateNode === null) return [];
        const onDescriptor = Object.getOwnPropertyDescriptor(stateNode, "on");
        const onMap: unknown = onDescriptor !== undefined ? onDescriptor.value : undefined;
        if (typeof onMap !== "object" || onMap === null) return [];
        return Object.keys(onMap);
      };

      registry.register({
        portName,
        instanceId,
        machineId: machine.id,
        state: () => runner.state(),
        snapshot: () => runner.snapshot(),
        createdAt: Date.now(),
        validEvents: getValidEvents,
        scopeId,
      });
    }

    // Create the FlowService wrapper
    const flowService: FlowService<string, string, unknown> = {
      snapshot: () => runner.snapshot(),
      state: () => runner.state(),
      context: () => runner.context(),
      send: event => runner.send(event),
      sendBatch: events => runner.sendBatch(events),
      sendAndExecute: event => runner.sendAndExecute(event),
      subscribe: callback => runner.subscribe(callback),
      getActivityStatus: id => runner.getActivityStatus(id),
      dispose: () => runner.dispose(),
      get isDisposed() {
        return runner.isDisposed;
      },
    };

    // Set up the event sink to route EmitEffects back to the runner.
    executor.setEventSink({
      emit: event => {
        runner.send(event);
      },
    });

    // Wire source-aware send for correct PendingEvent source tagging.
    // The executor uses this to tag emit events as "emit" and post-delay events as "delay".
    const sendInternal = getSendInternal(runner);
    if (sendInternal !== undefined) {
      executor.setSendInternal(sendInternal);
    }

    // Store registry info for the finalizer to look up
    if (registry !== undefined) {
      instanceRegistryInfo.set(flowService, { portName, instanceId });
    }

    // @ts-expect-error - Variance bridge: flowService is FlowService<string, string, unknown>
    // but InferService<TProvides> is FlowService<TState, TEvent, TContext>. At runtime the
    // object is correct; TypeScript cannot evaluate InferService with generic TProvides.
    const result: InferService<TProvides> = flowService;
    return result;
  };

  // Create and freeze the adapter.
  // @ts-expect-error - lifetime is `TLifetime | "scoped"`. When TLifetime is the default
  // ("scoped"), this is just "scoped". When TLifetime is explicitly provided, config.lifetime
  // is TLifetime (not undefined), so the ?? never fires. TypeScript cannot prove this because
  // TLifetime is a generic parameter.
  const resolvedLifetime: TLifetime = lifetime;

  const adapter = {
    provides,
    requires,
    lifetime: resolvedLifetime,
    factoryKind: "sync" as const,
    factory,
    clonable: false as const,
    freeze: true as const,
    // Add finalizer to dispose the FlowService when the scope is disposed
    finalizer: (instance: InferService<TProvides>): Promise<void> => {
      // Unregister from FlowRegistry before disposal
      if (registry !== undefined && typeof instance === "object" && instance !== null) {
        const info = instanceRegistryInfo.get(instance);
        if (info !== undefined) {
          registry.unregister(info.portName, info.instanceId);
          instanceRegistryInfo.delete(instance);
        }
      }

      // Use structural type guard to access dispose() without casting.
      // InferService<TProvides> is a conditional type that TypeScript cannot
      // evaluate with generic TProvides, so we verify the shape at runtime.
      if (hasDispose(instance)) {
        return instance.dispose().match(
          () => undefined,
          () => undefined
        );
      }
      return Promise.resolve();
    },
  };

  // Object.freeze returns Readonly<typeof adapter> which is structurally compatible
  // with FlowAdapter<TProvides, TRequires, TLifetime>.
  const frozenAdapter: FlowAdapter<TProvides, TRequires, TLifetime> = Object.freeze(adapter);
  return ok(frozenAdapter);
}

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Validates activities at runtime.
 *
 * Checks:
 * - No duplicate activity port names
 * - All activities are frozen (immutable)
 *
 * @returns Result<void, FlowAdapterCreationError> - Ok on success, Err with specific error on failure
 * @internal
 */
function validateActivitiesAtRuntime(
  activities: readonly ConfiguredActivityAny[]
): Result<void, FlowAdapterCreationError> {
  const seenPortNames = new Set<string>();

  for (const act of activities) {
    const portName = act.port.__portName;

    // Check for duplicates
    if (seenPortNames.has(portName)) {
      return err(DuplicateActivityPort({ portName }));
    }
    seenPortNames.add(portName);

    // Check if frozen
    if (!Object.isFrozen(act)) {
      return err(ActivityNotFrozen({ portName }));
    }
  }

  return ok(undefined);
}

/**
 * Builds a registry mapping activity port names to activities.
 *
 * @param activities - The activities array from config
 * @returns A map from port name to activity, or empty map if no activities
 * @internal
 */
function buildActivityRegistry(
  activities: readonly ConfiguredActivityAny[] | undefined
): ActivityRegistry {
  const registry = new Map<string, ConfiguredActivityAny>();

  if (activities === undefined) {
    return registry;
  }

  for (const act of activities) {
    registry.set(act.port.__portName, act);
  }

  return registry;
}

/**
 * Creates a resolver function that extracts activity dependencies from
 * the FlowAdapter's resolved deps.
 *
 * @param allDeps - All resolved deps from the FlowAdapter (unknown shape, accessed via indexObject)
 * @param availablePorts - The ports available in the FlowAdapter
 * @returns A function that resolves activity deps from requires
 * @internal
 */
function createActivityDepsResolver(
  allDeps: unknown,
  availablePorts: readonly Port<string, unknown>[]
): ActivityDepsResolver {
  // Build a set of available port names for validation
  const availablePortNames = new Set<string>();
  for (const p of availablePorts) {
    availablePortNames.add(p.__portName);
  }

  return <TRequires extends readonly Port<string, unknown>[]>(
    requires: TRequires
  ): PortDeps<TRequires> => {
    const deps: Record<string, unknown> = {};

    for (const port of requires) {
      const portName = port.__portName;

      if (!availablePortNames.has(portName)) {
        // Port not available - this is a programming error caught at the type
        // level by ValidateActivities. At runtime, skip the missing dep
        // rather than throwing. The activity will receive undefined for this
        // dep, which will surface as a runtime error in the activity itself.
        continue;
      }

      deps[portName] = indexObject(allDeps, portName);
    }

    // @ts-expect-error - Variance bridge: deps is Record<string, unknown> but PortDeps<TRequires>
    // is a mapped type { [P in TRequires[number] as InferPortName<P>]: InferService<P> }.
    // At runtime the object has the correct keys and values (populated from the
    // DI-resolved deps above). TypeScript cannot prove the mapped type matches
    // because TRequires is generic.
    const resolvedDeps: PortDeps<TRequires> = deps;
    return resolvedDeps;
  };
}
