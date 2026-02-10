/**
 * Subscriber Graph Builder
 *
 * Builds a SubscriberGraph from registered adapter metadata.
 * Uses brand-based port classification (O(1) per adapter).
 *
 * @packageDocumentation
 */

import type { SubscriberGraph, SubscriberNode, SubscriberEdge } from "../types/inspection.js";
import {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
} from "../adapters/brands.js";

// =============================================================================
// Adapter Registration Info
// =============================================================================

/**
 * Minimal metadata the inspector collects from each registered adapter.
 */
export interface AdapterRegistration {
  readonly portName: string;
  readonly adapter: object;
  readonly requires: readonly string[];
  readonly writesTo: readonly string[];
  readonly subscriberCount: number;
}

// =============================================================================
// Brand Classification
// =============================================================================

type PortKind = "state" | "atom" | "derived" | "async-derived";

/**
 * O(1) classification of adapter kind using brand symbols.
 */
function classifyAdapter(adapter: object): PortKind {
  if (__stateAdapterBrand in adapter) return "state";
  if (__atomAdapterBrand in adapter) return "atom";
  if (__asyncDerivedAdapterBrand in adapter) return "async-derived";
  if (__derivedAdapterBrand in adapter) return "derived";
  if (__linkedDerivedAdapterBrand in adapter) return "derived";
  // Default to state if no brand matches
  return "state";
}

// =============================================================================
// Graph Builder
// =============================================================================

let _correlationCounter = 0;

function generateCorrelationId(): string {
  _correlationCounter++;
  return `graph-${Date.now()}-${_correlationCounter}`;
}

/**
 * Builds a SubscriberGraph from adapter registrations.
 */
export function buildSubscriberGraph(
  registrations: readonly AdapterRegistration[]
): SubscriberGraph {
  const nodes: SubscriberNode[] = [];
  const edges: SubscriberEdge[] = [];
  const nodeIds = new Set<string>();

  for (const reg of registrations) {
    const kind = classifyAdapter(reg.adapter);

    // Add node
    if (!nodeIds.has(reg.portName)) {
      nodes.push({
        id: reg.portName,
        kind,
        subscriberCount: reg.subscriberCount,
      });
      nodeIds.add(reg.portName);
    }

    // Add derives-from edges (for derived/async-derived: source -> derived)
    if (kind === "derived" || kind === "async-derived") {
      for (const reqName of reg.requires) {
        edges.push({
          from: reqName,
          to: reg.portName,
          type: "derives-from",
        });
      }
    } else {
      // subscribes-to edges for non-derived adapters with requirements
      for (const reqName of reg.requires) {
        edges.push({
          from: reg.portName,
          to: reqName,
          type: "subscribes-to",
        });
      }
    }

    // writes-to edges (for linked derived)
    for (const writeName of reg.writesTo) {
      edges.push({
        from: reg.portName,
        to: writeName,
        type: "writes-to",
      });
    }
  }

  return {
    correlationId: generateCorrelationId(),
    nodes,
    edges,
  };
}
