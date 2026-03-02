/**
 * Playground Inspector Bridge
 *
 * Implements InspectorDataSource by caching data received from the Web Worker.
 * Sits on the main thread and provides data to visualization panels.
 *
 * @packageDocumentation
 */

import type { InspectorDataSource } from "@hex-di/devtools-ui";
import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
  InspectorEvent,
} from "@hex-di/core";
import type {
  WorkerToMainMessage,
  SerializedLibraryInspectors,
  SerializedResultStatistics,
} from "../sandbox/worker-protocol.js";
import {
  deserializeLibraryInspectors,
  deserializeResultStatistics,
} from "../sandbox/worker-protocol.js";
import type { ResultChainDescriptor, ResultChainExecution } from "../sandbox/traced-result.js";
import type {
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  SerializedRole,
} from "../sandbox/traced-guard.js";

// =============================================================================
// PlaygroundInspectorBridge
// =============================================================================

/**
 * Implements InspectorDataSource by maintaining a local cache of data
 * received from the Web Worker sandbox.
 *
 * Main thread only -- does not run inside the Worker.
 */
export class PlaygroundInspectorBridge implements InspectorDataSource {
  readonly displayName = "Playground Sandbox";
  readonly sourceType = "local" as const;

  private snapshot: ContainerSnapshot | undefined;
  private scopeTree: ScopeTree | undefined;
  private graphData: ContainerGraphData | undefined;
  private unifiedSnapshot: UnifiedSnapshot | undefined;
  private adapterInfo: readonly AdapterInfo[] | undefined;
  private libraryInspectors: ReadonlyMap<string, LibraryInspector> | undefined;
  private resultStatistics: ReadonlyMap<string, ResultStatistics> | undefined;
  private readonly resultChains = new Map<string, ResultChainDescriptor>();
  private readonly resultExecutions = new Map<string, ResultChainExecution[]>();
  private static readonly MAX_EXECUTIONS_PER_CHAIN = 100;
  private readonly guardDescriptors = new Map<string, GuardEvaluationDescriptor>();
  private readonly guardExecutions = new Map<string, GuardEvaluationExecution[]>();
  private guardRoleHierarchy: readonly SerializedRole[] = [];
  private static readonly MAX_EXECUTIONS_PER_PORT = 100;
  private readonly listeners = new Set<(event: InspectorEvent) => void>();

  // ===========================================================================
  // Pull-based queries -- return cached data
  // ===========================================================================

  getSnapshot(): ContainerSnapshot | undefined {
    return this.snapshot;
  }

  getScopeTree(): ScopeTree | undefined {
    return this.scopeTree;
  }

  getGraphData(): ContainerGraphData | undefined {
    return this.graphData;
  }

  getUnifiedSnapshot(): UnifiedSnapshot | undefined {
    return this.unifiedSnapshot;
  }

  getAdapterInfo(): readonly AdapterInfo[] | undefined {
    return this.adapterInfo;
  }

  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined {
    return this.libraryInspectors;
  }

  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined {
    return this.resultStatistics;
  }

  getResultChains(): ReadonlyMap<string, ResultChainDescriptor> | undefined {
    return this.resultChains.size > 0 ? this.resultChains : undefined;
  }

  getResultExecutions(chainId: string): readonly ResultChainExecution[] | undefined {
    return this.resultExecutions.get(chainId);
  }

  getGuardDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor> | undefined {
    return this.guardDescriptors.size > 0 ? this.guardDescriptors : undefined;
  }

  getGuardExecutions(portName: string): readonly GuardEvaluationExecution[] | undefined {
    return this.guardExecutions.get(portName);
  }

  getGuardRoleHierarchy(): readonly SerializedRole[] | undefined {
    return this.guardRoleHierarchy.length > 0 ? this.guardRoleHierarchy : undefined;
  }

  // ===========================================================================
  // Push-based subscription
  // ===========================================================================

  subscribe(listener: (event: InspectorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ===========================================================================
  // Data ingestion from worker messages
  // ===========================================================================

  /**
   * Process inspector-data from the Web Worker.
   * Updates all caches and notifies subscribers.
   */
  handleInspectorData(data: {
    readonly snapshot: ContainerSnapshot;
    readonly scopeTree: ScopeTree;
    readonly graphData: ContainerGraphData;
    readonly unifiedSnapshot: UnifiedSnapshot;
    readonly adapterInfo: readonly AdapterInfo[];
    readonly libraryInspectors: SerializedLibraryInspectors;
    readonly resultStatistics: SerializedResultStatistics;
  }): void {
    this.snapshot = data.snapshot;
    this.scopeTree = data.scopeTree;
    this.graphData = data.graphData;
    this.unifiedSnapshot = data.unifiedSnapshot;
    this.adapterInfo = data.adapterInfo;
    this.libraryInspectors = deserializeLibraryInspectors(data.libraryInspectors);
    this.resultStatistics = deserializeResultStatistics(data.resultStatistics);

    this.notify({ type: "snapshot-changed" });
  }

  /**
   * Forward an inspector event from the Web Worker.
   */
  handleInspectorEvent(event: InspectorEvent): void {
    this.notify(event);
  }

  /**
   * Process a raw WorkerToMainMessage.
   * Delegates to the appropriate handler method.
   */
  handleWorkerMessage(message: WorkerToMainMessage): void {
    switch (message.type) {
      case "inspector-data":
        this.handleInspectorData(message);
        break;
      case "inspector-event":
        this.handleInspectorEvent(message.event);
        break;
      case "result-chain-registered":
        this.handleChainRegistered(message.chain);
        break;
      case "result-chain-executed":
        this.handleChainExecuted(message.execution);
        break;
      case "guard-descriptor-registered":
        this.handleGuardDescriptorRegistered(message.descriptor);
        break;
      case "guard-execution-added":
        this.handleGuardExecutionAdded(message.execution);
        break;
      case "guard-role-hierarchy-updated":
        this.handleGuardRoleHierarchyUpdated(message.roles);
        break;
      default:
        // Other message types are not handled by the bridge
        break;
    }
  }

  /**
   * Handle a chain descriptor registration from the instrumented Result module.
   */
  private handleChainRegistered(chain: ResultChainDescriptor): void {
    this.resultChains.set(chain.chainId, chain);
    this.notify({ type: "chain-registered", chainId: chain.chainId });
  }

  /**
   * Handle a chain execution from the instrumented Result module.
   */
  private handleChainExecuted(execution: ResultChainExecution): void {
    let list = this.resultExecutions.get(execution.chainId);
    if (!list) {
      list = [];
      this.resultExecutions.set(execution.chainId, list);
    }
    list.push(execution);

    // Ring buffer: discard oldest when exceeding max
    if (list.length > PlaygroundInspectorBridge.MAX_EXECUTIONS_PER_CHAIN) {
      list.shift();
    }

    this.notify({
      type: "execution-added",
      chainId: execution.chainId,
      executionId: execution.executionId,
    });
  }

  /**
   * Handle a guard descriptor registration from the instrumented Guard module.
   */
  private handleGuardDescriptorRegistered(descriptor: GuardEvaluationDescriptor): void {
    this.guardDescriptors.set(descriptor.descriptorId, descriptor);
    this.notify({ type: "guard-descriptor-registered", descriptorId: descriptor.descriptorId });
  }

  /**
   * Handle a guard execution from the instrumented Guard module.
   */
  private handleGuardExecutionAdded(execution: GuardEvaluationExecution): void {
    let list = this.guardExecutions.get(execution.portName);
    if (!list) {
      list = [];
      this.guardExecutions.set(execution.portName, list);
    }
    list.push(execution);

    // Ring buffer: discard oldest when exceeding max
    if (list.length > PlaygroundInspectorBridge.MAX_EXECUTIONS_PER_PORT) {
      list.shift();
    }

    this.notify({
      type: "guard-execution-added",
      portName: execution.portName,
      executionId: execution.executionId,
    });
  }

  /**
   * Handle a role hierarchy update from the instrumented Guard module.
   */
  private handleGuardRoleHierarchyUpdated(roles: readonly SerializedRole[]): void {
    this.guardRoleHierarchy = roles;
    this.notify({ type: "guard-role-hierarchy-updated" });
  }

  // ===========================================================================
  // Reset
  // ===========================================================================

  /**
   * Clear all cached data. Called when a new execution starts.
   */
  reset(): void {
    this.snapshot = undefined;
    this.scopeTree = undefined;
    this.graphData = undefined;
    this.unifiedSnapshot = undefined;
    this.adapterInfo = undefined;
    this.libraryInspectors = undefined;
    this.resultStatistics = undefined;
    this.resultChains.clear();
    this.resultExecutions.clear();
    this.guardDescriptors.clear();
    this.guardExecutions.clear();
    this.guardRoleHierarchy = [];

    this.notify({ type: "snapshot-changed" });
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private notify(event: InspectorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
