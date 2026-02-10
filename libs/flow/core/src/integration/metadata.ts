/**
 * Flow Adapter Metadata
 *
 * Provides functions to compute and inspect metadata from a machine definition.
 * Metadata includes state names, event names, final states, transitions per state,
 * and activity port names.
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MachineAny } from "../machine/types.js";
import type { StateNodeAny } from "../machine/state-node.js";
import { MetadataInvalid } from "../errors/index.js";
import type { FlowAdapterError } from "../errors/index.js";

// =============================================================================
// TransitionDetail Type
// =============================================================================

/**
 * Detail about a single outgoing transition from a state.
 *
 * Provides structured information about each transition for inspection
 * and DevTools without requiring access to the full machine config.
 */
export interface TransitionDetail {
  /** The event that triggers this transition. */
  readonly event: string;
  /** The target state name. */
  readonly target: string;
  /** Whether this transition has a guard function. */
  readonly hasGuard: boolean;
  /** Whether this transition has effects attached. */
  readonly hasEffects: boolean;
}

// =============================================================================
// FlowAdapterMetadata Type
// =============================================================================

/**
 * Metadata computed from a machine definition for inspection and DevTools.
 *
 * This data structure provides a summary of the machine's structure without
 * requiring access to the full machine config. It is computed once during
 * adapter creation and attached to the adapter object.
 */
export interface FlowAdapterMetadata {
  /** The machine's unique identifier. */
  readonly machineId: string;

  /** All state names defined in the machine. */
  readonly stateNames: readonly string[];

  /** All event names the machine can respond to. */
  readonly eventNames: readonly string[];

  /** State names that are final/terminal (no outgoing transitions). */
  readonly finalStates: readonly string[];

  /** Outgoing transition details per state. */
  readonly transitionsPerState: Readonly<Record<string, readonly TransitionDetail[]>>;

  /** Port names of activities registered with the flow adapter. */
  readonly activityPortNames: readonly string[];
}

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Type guard that narrows an unknown value to FlowAdapterMetadata.
 *
 * Checks for the presence and correct types of all required fields.
 */
export function isFlowMetadata(value: unknown): value is FlowAdapterMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const get = (key: string): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;

  const tps = get("transitionsPerState");

  return (
    typeof get("machineId") === "string" &&
    Array.isArray(get("stateNames")) &&
    Array.isArray(get("eventNames")) &&
    Array.isArray(get("finalStates")) &&
    typeof tps === "object" &&
    tps !== null &&
    Object.values(tps).every(v => Array.isArray(v)) &&
    Array.isArray(get("activityPortNames"))
  );
}

// =============================================================================
// Metadata Computation
// =============================================================================

/**
 * Computes metadata from a machine definition.
 *
 * Extracts structural information about the machine including state names,
 * event names, final states, and transition counts per state.
 *
 * @param machine - The machine definition to inspect
 * @param activityPortNames - Port names of registered activities (default: [])
 * @returns Result containing the computed metadata, or an error if the machine
 *   definition is invalid (missing states, etc.)
 */
export function computeFlowMetadata(
  machine: MachineAny,
  activityPortNames: readonly string[] = []
): Result<FlowAdapterMetadata, FlowAdapterError> {
  const statesRecord = machine.states;

  if (typeof statesRecord !== "object" || statesRecord === null) {
    return err(
      MetadataInvalid({
        field: "states",
        reason: "Machine has no states record",
      })
    );
  }

  const stateNames = Object.keys(statesRecord);
  if (stateNames.length === 0) {
    return err(
      MetadataInvalid({
        field: "states",
        reason: "Machine has no states defined",
      })
    );
  }

  const eventNameSet = new Set<string>();
  const finalStates: string[] = [];
  const transitionsPerState: Record<string, TransitionDetail[]> = {};

  for (const stateName of stateNames) {
    const descriptor = Object.getOwnPropertyDescriptor(statesRecord, stateName);
    const stateNode: unknown = descriptor !== undefined ? descriptor.value : undefined;

    if (!isStateNodeLike(stateNode)) {
      transitionsPerState[stateName] = [];
      finalStates.push(stateName);
      continue;
    }

    const typedNode = stateNode;

    // Check if this is a final state
    if (
      typedNode.type === "final" ||
      typedNode.on === undefined ||
      Object.keys(typedNode.on).length === 0
    ) {
      finalStates.push(stateName);
      transitionsPerState[stateName] = [];
      continue;
    }

    // Build transition details and collect event names
    const onKeys = Object.keys(typedNode.on);
    const details: TransitionDetail[] = [];

    for (const eventName of onKeys) {
      eventNameSet.add(eventName);

      const transConfig = Object.getOwnPropertyDescriptor(typedNode.on, eventName);
      const value: unknown = transConfig !== undefined ? transConfig.value : undefined;

      if (Array.isArray(value)) {
        for (const item of value) {
          details.push(extractTransitionDetail(eventName, item));
        }
      } else {
        details.push(extractTransitionDetail(eventName, value));
      }
    }

    transitionsPerState[stateName] = details;
  }

  const metadata: FlowAdapterMetadata = {
    machineId: machine.id,
    stateNames,
    eventNames: Array.from(eventNameSet).sort(),
    finalStates,
    transitionsPerState: Object.freeze(transitionsPerState),
    activityPortNames: [...activityPortNames],
  };

  return ok(Object.freeze(metadata));
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Extracts a TransitionDetail from an event name and its transition config value.
 * @internal
 */
function extractTransitionDetail(event: string, config: unknown): TransitionDetail {
  if (typeof config !== "object" || config === null) {
    return { event, target: "", hasGuard: false, hasEffects: false };
  }

  const targetDesc = Object.getOwnPropertyDescriptor(config, "target");
  const target = typeof targetDesc?.value === "string" ? targetDesc.value : "";

  const guardDesc = Object.getOwnPropertyDescriptor(config, "guard");
  const hasGuard = typeof guardDesc?.value === "function";

  const effectsDesc = Object.getOwnPropertyDescriptor(config, "effects");
  const hasEffects = Array.isArray(effectsDesc?.value) && effectsDesc.value.length > 0;

  return { event, target, hasGuard, hasEffects };
}

/**
 * Checks if a value looks like a StateNodeAny (has optional `on`, `type`, `entry`, `exit`).
 * @internal
 */
function isStateNodeLike(value: unknown): value is StateNodeAny {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  // A state node is any object - even an empty {} is valid
  return true;
}
