/**
 * Introspection Types
 *
 * Type definitions for the Flow introspection & DevTools subsystem:
 * - FlowRegistry: Tracks live machine instances
 * - FlowInspector: Read-only query API over machine state/history
 * - FlowTracingHook: Distributed tracing spans for transitions and effects
 * - HealthEvent: Error/degraded/recovered signals
 *
 * @packageDocumentation
 */

import type { MachineSnapshot, PendingEvent } from "../runner/types.js";
import type { ActivityInstance } from "../activities/types.js";
import type { FlowTransitionEventAny } from "../tracing/types.js";

// =============================================================================
// Unsubscribe Type (reused from tracing)
// =============================================================================

/**
 * Function to unsubscribe from notifications.
 */
export type Unsubscribe = () => void;

// =============================================================================
// Registry Types
// =============================================================================

/**
 * Entry representing a live machine instance in the registry.
 */
export interface RegistryEntry {
  readonly portName: string;
  readonly instanceId: string;
  readonly machineId: string;
  readonly state: () => string;
  readonly snapshot: () => MachineSnapshot<string, unknown>;
  readonly createdAt: number;
  readonly validEvents: () => readonly string[];
  readonly scopeId?: string;
}

/**
 * Event emitted by the FlowRegistry when machines are registered/unregistered.
 */
export type RegistryEvent =
  | { readonly type: "machine-registered"; readonly entry: RegistryEntry }
  | {
      readonly type: "machine-unregistered";
      readonly portName: string;
      readonly instanceId: string;
    };

/**
 * Listener callback for registry events.
 */
export type RegistryListener = (event: RegistryEvent) => void;

/**
 * Registry for tracking live machine instances.
 */
export interface FlowRegistry {
  register(entry: RegistryEntry): void;
  unregister(portName: string, instanceId: string): void;
  getAllMachines(): readonly RegistryEntry[];
  getMachine(portName: string, instanceId: string): RegistryEntry | undefined;
  getMachinesByState(state: string): readonly RegistryEntry[];
  getAllPortNames(): readonly string[];
  getTotalMachineCount(): number;
  subscribe(listener: RegistryListener): Unsubscribe;
  dispose(): void;
}

// =============================================================================
// Health Event Types
// =============================================================================

/**
 * Health events emitted when machines enter error/degraded/recovered states.
 */
export type HealthEvent =
  | {
      readonly type: "flow-error";
      readonly machineId: string;
      readonly state: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "flow-degraded";
      readonly machineId: string;
      readonly failureCount: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "flow-recovered";
      readonly machineId: string;
      readonly fromState: string;
      readonly timestamp: number;
    };

// =============================================================================
// Effect Result Record
// =============================================================================

/**
 * Record of an effect execution result for statistics tracking.
 */
export interface EffectResultRecord {
  readonly portName: string;
  readonly method: string;
  readonly ok: boolean;
  readonly timestamp: number;
  readonly duration: number;
}

// =============================================================================
// FlowInspector Interface
// =============================================================================

/**
 * Configuration for creating a FlowInspector.
 */
export interface FlowInspectorConfig {
  readonly registry: FlowRegistry;
  readonly collector: {
    getTransitions(filter?: { machineId?: string }): readonly FlowTransitionEventAny[];
    subscribe(callback: (event: FlowTransitionEventAny) => void): Unsubscribe;
  };
  readonly healthBufferSize?: number;
  readonly effectBufferSize?: number;
  readonly cacheTtlMs?: number;
}

/**
 * Read-only query API for inspecting flow machine state and history.
 */
export interface FlowInspector {
  getMachineState(
    portName: string,
    instanceId: string
  ): MachineSnapshot<string, unknown> | undefined;
  getValidTransitions(portName: string, instanceId: string): readonly string[];
  getRunningActivities(portName: string, instanceId: string): readonly ActivityInstance[];
  getEventHistory(options?: { limit?: number; since?: number }): readonly FlowTransitionEventAny[];
  getStateHistory(portName: string, instanceId: string): readonly string[];
  getEffectHistory(options?: { limit?: number }): readonly EffectResultRecord[];
  getAllMachinesSnapshot(): readonly MachineSnapshot<string, unknown>[];
  getHealthEvents(options?: { limit?: number }): readonly HealthEvent[];
  getEffectResultStatistics(): ReadonlyMap<string, { ok: number; err: number }>;
  getHighErrorRatePorts(threshold: number): readonly string[];
  getPendingEvents(options?: { portName?: string; instanceId?: string }): readonly PendingEvent[];
  recordEffectResult(record: EffectResultRecord): void;
  recordHealthEvent(event: HealthEvent): void;
  subscribe(callback: () => void): Unsubscribe;
  dispose(): void;
}

// =============================================================================
// FlowTracingHook Types
// =============================================================================

/**
 * Minimal tracer interface for distributed tracing integration.
 *
 * Any tracing adapter (@hex-di/tracing-datadog, @hex-di/tracing-jaeger, etc.)
 * can provide a compatible object without @hex-di/flow depending on those packages.
 */
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

/**
 * Options for creating a FlowTracingHook.
 */
export interface FlowTracingHookOptions {
  readonly tracer: TracerLike;
  readonly filter?: (machineId: string) => boolean;
  /** Whether to trace effect-level spans. Defaults to true. */
  readonly traceEffects?: boolean;
  /** Optional scope ID to include in span attributes. */
  readonly scopeId?: string;
  /** Optional trace context entries to include in span attributes. */
  readonly traceContext?: Record<string, string>;
}

/**
 * Hook for creating distributed tracing spans for transitions and effects.
 */
export interface FlowTracingHook {
  onTransitionStart(machineId: string, from: string, to: string, eventType: string): void;
  onTransitionEnd(machineId: string, ok: boolean): void;
  onEffectStart(effectTag: string, detail: string): void;
  onEffectEnd(ok: boolean): void;
}
