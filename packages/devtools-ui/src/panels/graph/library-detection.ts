/**
 * Library adapter kind detection.
 *
 * Detects which hex-di ecosystem library an adapter belongs to
 * based on metadata brand symbols and port naming patterns.
 *
 * @packageDocumentation
 */

import type { VisualizableAdapter } from "@hex-di/core";
import type { LibraryAdapterKind } from "./types.js";

// =============================================================================
// Valid kind values per library
// =============================================================================

const STORE_KINDS = new Set([
  "state",
  "atom",
  "derived",
  "async-derived",
  "linked-derived",
  "effect",
]);

const QUERY_KINDS = new Set(["query", "mutation", "streamed-query"]);

const SAGA_KINDS = new Set(["saga", "saga-management"]);

const FLOW_KINDS = new Set(["flow", "activity"]);

const LOGGER_KINDS = new Set(["logger", "handler", "formatter", "inspector"]);

const TRACING_KINDS = new Set(["tracer", "processor", "exporter", "bridge"]);

// =============================================================================
// Port name pattern fallbacks
// =============================================================================

const STORE_PATTERNS = [/Store$/i, /State$/i, /Atom$/i, /Derived$/i, /Effect$/i];
const QUERY_PATTERNS = [/Query$/i, /Mutation$/i];
const SAGA_PATTERNS = [/Saga$/i, /SagaManager$/i];
const FLOW_PATTERNS = [/Flow$/i, /Activity$/i];
const LOGGER_PATTERNS = [/Logger$/i, /Log$/i];
const TRACING_PATTERNS = [/Tracer$/i, /Tracing$/i, /Span$/i];

// =============================================================================
// Category → LibraryAdapterKind mapping
// =============================================================================

/**
 * Pre-built lookup from "library/kind" category strings to typed objects.
 * Each entry is a correctly-typed LibraryAdapterKind literal, avoiding
 * the need for a cast when returning from detectFromCategory.
 */
const KIND_LOOKUP: ReadonlyMap<string, LibraryAdapterKind> = new Map<string, LibraryAdapterKind>([
  // Store
  ["store/state", { library: "store", kind: "state" }],
  ["store/atom", { library: "store", kind: "atom" }],
  ["store/derived", { library: "store", kind: "derived" }],
  ["store/async-derived", { library: "store", kind: "async-derived" }],
  ["store/linked-derived", { library: "store", kind: "linked-derived" }],
  ["store/effect", { library: "store", kind: "effect" }],
  // Query
  ["query/query", { library: "query", kind: "query" }],
  ["query/mutation", { library: "query", kind: "mutation" }],
  ["query/streamed-query", { library: "query", kind: "streamed-query" }],
  // Saga
  ["saga/saga", { library: "saga", kind: "saga" }],
  ["saga/saga-management", { library: "saga", kind: "saga-management" }],
  // Flow
  ["flow/flow", { library: "flow", kind: "flow" }],
  ["flow/activity", { library: "flow", kind: "activity" }],
  // Logger
  ["logger/logger", { library: "logger", kind: "logger" }],
  ["logger/handler", { library: "logger", kind: "handler" }],
  ["logger/formatter", { library: "logger", kind: "formatter" }],
  ["logger/inspector", { library: "logger", kind: "inspector" }],
  // Tracing
  ["tracing/tracer", { library: "tracing", kind: "tracer" }],
  ["tracing/processor", { library: "tracing", kind: "processor" }],
  ["tracing/exporter", { library: "tracing", kind: "exporter" }],
  ["tracing/bridge", { library: "tracing", kind: "bridge" }],
]);

/**
 * Detect library adapter kind from metadata category.
 *
 * Category format: "library/kind" (e.g., "store/state", "query/mutation").
 * This is the primary detection mechanism — each library's port factory
 * sets the category field when creating ports.
 */
function detectFromCategory(
  metadata: Readonly<Record<string, unknown>> | undefined
): LibraryAdapterKind | undefined {
  if (metadata === undefined) return undefined;
  const category = metadata["category"];
  if (typeof category !== "string") return undefined;
  return KIND_LOOKUP.get(category);
}

/**
 * Detect library adapter kind from port naming patterns.
 * Fallback when metadata brands are not available.
 */
function detectFromPortName(portName: string): LibraryAdapterKind | undefined {
  if (STORE_PATTERNS.some(p => p.test(portName))) {
    return { library: "store", kind: "state" };
  }
  if (QUERY_PATTERNS.some(p => p.test(portName))) {
    if (/Mutation$/i.test(portName)) {
      return { library: "query", kind: "mutation" };
    }
    return { library: "query", kind: "query" };
  }
  if (SAGA_PATTERNS.some(p => p.test(portName))) {
    if (/Manager$/i.test(portName)) {
      return { library: "saga", kind: "saga-management" };
    }
    return { library: "saga", kind: "saga" };
  }
  if (FLOW_PATTERNS.some(p => p.test(portName))) {
    if (/Activity$/i.test(portName)) {
      return { library: "flow", kind: "activity" };
    }
    return { library: "flow", kind: "flow" };
  }
  if (LOGGER_PATTERNS.some(p => p.test(portName))) {
    return { library: "logger", kind: "logger" };
  }
  if (TRACING_PATTERNS.some(p => p.test(portName))) {
    return { library: "tracing", kind: "tracer" };
  }
  return undefined;
}

/**
 * Detect the library adapter kind for a VisualizableAdapter.
 *
 * Priority:
 * 1. Metadata category (definitive — "library/kind" format)
 * 2. Port name patterns (heuristic fallback)
 * 3. undefined (unrecognized, rendered as core/generic)
 */
function detectLibraryKind(adapter: VisualizableAdapter): LibraryAdapterKind | undefined {
  const fromCategory = detectFromCategory(adapter.metadata);
  if (fromCategory !== undefined) return fromCategory;
  return detectFromPortName(adapter.portName);
}

export { detectLibraryKind, detectFromCategory, detectFromPortName };
