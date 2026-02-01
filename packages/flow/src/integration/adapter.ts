/**
 * Flow Adapter Factory
 *
 * This module provides the createFlowAdapter factory function that creates
 * HexDI adapters for state machines.
 *
 * @packageDocumentation
 */

import type { Port, InferService, Adapter, Lifetime, ResolvedDeps } from "@hex-di/core";
import type { Machine } from "../machine/types.js";
import { createMachineRunner } from "../runner/create-runner.js";
import { createActivityManager } from "../activities/manager.js";
import { createDIEffectExecutor, type ScopeResolver } from "./di-executor.js";
import type { FlowService } from "./types.js";
import type { FlowPort } from "./port.js";
import type { ConfiguredActivityAny, ResolvedActivityDeps } from "../activities/types.js";

// =============================================================================
// Internal Type Utilities
// =============================================================================

/**
 * Converts a tuple/array type to a union of its element types.
 * @internal
 */
type TupleToUnion<T extends readonly Port<unknown, string>[]> = T extends readonly []
  ? never
  : T[number];

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
  TRequires extends readonly Port<unknown, string>[],
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
}

// =============================================================================
// Flow Adapter Type
// =============================================================================

/**
 * A FlowAdapter is a standard HexDI Adapter that provides a FlowService.
 */
export type FlowAdapter<
  TProvides extends FlowPort<string, string, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
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
 * @returns A FlowAdapter that can be registered with a HexDI graph
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
 * const modalMachine = createMachine({
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
 * // Register in graph
 * const graph = GraphBuilder.create()
 *   .provide(AnimationServiceAdapter)
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
  const TRequires extends readonly Port<unknown, string>[],
  const TActivities extends readonly ConfiguredActivityAny[] = readonly [],
  const TLifetime extends Lifetime = "scoped",
>(
  config: FlowAdapterConfig<TProvides, TRequires, TActivities, TLifetime>
): FlowAdapter<TProvides, TRequires, TLifetime> {
  const { provides, requires, machine, activities, defaultActivityTimeout } = config;
  const lifetime = config.lifetime ?? "scoped";

  // Validate activities at runtime
  if (activities !== undefined && activities.length > 0) {
    validateActivitiesAtRuntime(activities);
  }

  // Build activity registry for quick lookup by port name
  const activityRegistry = buildActivityRegistry(activities);

  // Create the factory function
  // The factory receives resolved dependencies and should return the FlowService
  const factory = (deps: ResolvedDeps<TupleToUnion<TRequires>>): InferService<TProvides> => {
    // Create a scope-like resolver from the resolved deps
    const depsRecord = deps as Record<string, unknown>;

    // We need a way to resolve ports. Since we have the resolved deps,
    // we can create a map from port names to resolved services
    const portNameToService = new Map<string, unknown>();
    for (const port of requires) {
      const portName = port.__portName;
      portNameToService.set(portName, depsRecord[portName]);
    }

    // Create a resolver that looks up ports by name
    const scopeResolver: ScopeResolver = {
      resolve<P extends Port<unknown, string>>(port: P): InferService<P> {
        const service = portNameToService.get(port.__portName);
        if (service === undefined) {
          throw new Error(
            `Port "${port.__portName}" is not in the requires list. ` +
              `Add it to the requires array in createFlowAdapter config.`
          );
        }
        return service as InferService<P>;
      },
    };

    // Create the activity manager with default timeout
    const activityManager = createActivityManager({
      defaultTimeout: defaultActivityTimeout,
    });

    // Create activity deps resolver for spawning activities
    const activityDepsResolver = createActivityDepsResolver(depsRecord, requires);

    // Create the DI effect executor with our scope resolver
    const executor = createDIEffectExecutor({
      scope: scopeResolver,
      activityManager,
      activityRegistry,
      activityDepsResolver,
    });

    // Create the machine runner
    const runner = createMachineRunner(machine, {
      executor,
      activityManager,
    });

    // Create the FlowService wrapper
    const flowService: FlowService<string, string, unknown> = {
      snapshot: () => runner.snapshot(),
      state: () => runner.state(),
      context: () => runner.context(),
      send: event => runner.send(event),
      sendAndExecute: event => runner.sendAndExecute(event),
      subscribe: callback => runner.subscribe(callback),
      getActivityStatus: id => runner.getActivityStatus(id),
      dispose: () => runner.dispose(),
      get isDisposed() {
        return runner.isDisposed;
      },
    };

    // Set up the event sink to route EmitEffects back to the runner
    executor.setEventSink({
      emit: event => {
        // Execute the event on the runner
        // Note: This is synchronous - if async handling is needed, use sendAndExecute
        runner.send(event as { readonly type: string });
      },
    });

    return flowService as InferService<TProvides>;
  };

  // Create and freeze the adapter
  const adapter = {
    provides,
    requires,
    lifetime: lifetime as TLifetime,
    factoryKind: "sync" as const,
    factory,
    clonable: false as const,
    // Add finalizer to dispose the FlowService when the scope is disposed
    finalizer: (instance: InferService<TProvides>) => {
      const service = instance as FlowService<string, string, unknown>;
      return service.dispose();
    },
  };

  return Object.freeze(adapter) as FlowAdapter<TProvides, TRequires, TLifetime>;
}

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Validates activities at runtime.
 *
 * Checks:
 * - All activities are frozen (immutable)
 * - No duplicate activity port names
 *
 * @throws Error if validation fails
 * @internal
 */
function validateActivitiesAtRuntime(activities: readonly ConfiguredActivityAny[]): void {
  const seenPortNames = new Set<string>();

  for (const act of activities) {
    const portName = act.port.__portName;

    // Check for duplicates
    if (seenPortNames.has(portName)) {
      throw new Error(
        `Duplicate activity port name: "${portName}". ` +
          `Each activity in the activities array must have a unique port.`
      );
    }
    seenPortNames.add(portName);

    // Check if frozen
    if (!Object.isFrozen(act)) {
      throw new Error(
        `Activity "${portName}" is not frozen. ` +
          `Activities must be created using the activity() factory which freezes them.`
      );
    }
  }
}

/**
 * Activity registry type for looking up activities by port name.
 * @internal
 */
export type ActivityRegistry = ReadonlyMap<string, ConfiguredActivityAny>;

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
 * Activity deps resolver function type.
 * @internal
 */
export type ActivityDepsResolver = <TRequires extends readonly Port<unknown, string>[]>(
  requires: TRequires
) => ResolvedActivityDeps<TRequires>;

/**
 * Creates a resolver function that extracts activity dependencies from
 * the FlowAdapter's resolved deps.
 *
 * @param allDeps - All resolved deps from the FlowAdapter
 * @param availablePorts - The ports available in the FlowAdapter
 * @returns A function that resolves activity deps from requires
 * @internal
 */
function createActivityDepsResolver(
  allDeps: Record<string, unknown>,
  availablePorts: readonly Port<unknown, string>[]
): ActivityDepsResolver {
  // Build a set of available port names for validation
  const availablePortNames = new Set<string>();
  for (const p of availablePorts) {
    availablePortNames.add(p.__portName);
  }

  return <TRequires extends readonly Port<unknown, string>[]>(
    requires: TRequires
  ): ResolvedActivityDeps<TRequires> => {
    const deps: Record<string, unknown> = {};

    for (const port of requires) {
      const portName = port.__portName;

      if (!availablePortNames.has(portName)) {
        throw new Error(
          `Activity requires port "${portName}" which is not available in FlowAdapter. ` +
            `Add it to the FlowAdapter's requires array.`
        );
      }

      deps[portName] = allDeps[portName];
    }

    return deps as ResolvedActivityDeps<TRequires>;
  };
}
