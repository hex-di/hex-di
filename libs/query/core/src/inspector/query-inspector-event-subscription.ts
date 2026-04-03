/**
 * Query Inspector — client event subscription
 *
 * Subscribes to {@link QueryClient} events to maintain fetch history, counters,
 * and runtime invalidation stats for the inspector.
 *
 * @packageDocumentation
 */

import type { QueryClient, QueryClientEvent, FetchTrigger } from "../client/query-client.js";
import type { FetchHistoryEntry } from "./query-inspector-types.js";

/** Ring-buffer API used by the inspector for fetch history. */
export interface QueryInspectorFetchHistoryBuffer {
  push(item: FetchHistoryEntry): void;
  toArray(): ReadonlyArray<FetchHistoryEntry>;
  readonly size: number;
}

/** Mutable inspector state updated by the client event stream. */
export interface QueryInspectorEventState {
  readonly fetchHistory: QueryInspectorFetchHistoryBuffer;
  readonly pendingFetches: Map<
    string,
    { timestamp: number; retryAttempt: number; trigger: FetchTrigger }
  >;
  readonly recentCacheHits: Set<string>;
  readonly recentDeduplicated: Set<string>;
  totalFetchRequests: number;
  totalCacheHits: number;
  totalDedupSavings: number;
  readonly errorCountsByTag: Map<string, number>;
  readonly runtimeInvalidations: Map<
    string,
    { count: number; lastTriggered: number; totalEntriesAffected: number }
  >;
}

function consumePendingState(
  state: QueryInspectorEventState,
  eventKey: string
): {
  pending: { timestamp: number; retryAttempt: number; trigger: FetchTrigger } | undefined;
  wasCacheHit: boolean;
  wasDeduplicated: boolean;
} {
  const pending = state.pendingFetches.get(eventKey);
  state.pendingFetches.delete(eventKey);
  const wasCacheHit = state.recentCacheHits.has(eventKey);
  const wasDeduplicated = state.recentDeduplicated.has(eventKey);
  state.recentCacheHits.delete(eventKey);
  state.recentDeduplicated.delete(eventKey);
  return { pending, wasCacheHit, wasDeduplicated };
}

function handleFetchStarted(
  state: QueryInspectorEventState,
  eventKey: string,
  event: Extract<QueryClientEvent, { type: "fetch-started" }>
): void {
  state.totalFetchRequests++;
  state.pendingFetches.set(eventKey, {
    timestamp: Date.now(),
    retryAttempt: 0,
    trigger: event.trigger,
  });
}

function handleFetchCompleted(
  state: QueryInspectorEventState,
  eventKey: string,
  event: Extract<QueryClientEvent, { type: "fetch-completed" }>
): void {
  const { pending, wasCacheHit, wasDeduplicated } = consumePendingState(state, eventKey);
  state.fetchHistory.push({
    portName: event.portName,
    params: event.params,
    cacheKey: eventKey,
    timestamp: pending?.timestamp ?? Date.now(),
    durationMs: event.durationMs,
    result: "ok",
    cacheHit: wasCacheHit,
    deduplicated: wasDeduplicated,
    retryAttempt: pending?.retryAttempt ?? 0,
    trigger: pending?.trigger ?? "refetch-manual",
  });
}

function handleFetchError(
  state: QueryInspectorEventState,
  eventKey: string,
  event: Extract<QueryClientEvent, { type: "fetch-error" }>
): void {
  const { pending, wasCacheHit, wasDeduplicated } = consumePendingState(state, eventKey);

  if (event.errorTag) {
    state.errorCountsByTag.set(
      event.errorTag,
      (state.errorCountsByTag.get(event.errorTag) ?? 0) + 1
    );
  }

  state.fetchHistory.push({
    portName: event.portName,
    params: event.params,
    cacheKey: eventKey,
    timestamp: pending?.timestamp ?? Date.now(),
    durationMs: event.durationMs,
    result: "error",
    errorTag: event.errorTag,
    cacheHit: wasCacheHit,
    deduplicated: wasDeduplicated,
    retryAttempt: pending?.retryAttempt ?? 0,
    trigger: pending?.trigger ?? "refetch-manual",
  });
}

function handleMutationEffectApplied(
  state: QueryInspectorEventState,
  event: Extract<QueryClientEvent, { type: "mutation-effect-applied" }>
): void {
  const runtimeKey = `${event.mutationPortName}→${event.targetPortName}→${event.effect}`;
  const existing = state.runtimeInvalidations.get(runtimeKey);
  if (existing) {
    existing.count++;
    existing.lastTriggered = Date.now();
    existing.totalEntriesAffected += event.entriesAffected;
  } else {
    state.runtimeInvalidations.set(runtimeKey, {
      count: 1,
      lastTriggered: Date.now(),
      totalEntriesAffected: event.entriesAffected,
    });
  }
}

function computeEventKey(event: QueryClientEvent): string {
  if (event.type === "mutation-effect-applied") return "";
  return `${event.portName}:${JSON.stringify("params" in event ? event.params : undefined)}`;
}

export function subscribeQueryInspectorToClientEvents(
  client: QueryClient,
  state: QueryInspectorEventState
): () => void {
  return client.subscribeToEvents((event: QueryClientEvent) => {
    const eventKey = computeEventKey(event);

    switch (event.type) {
      case "fetch-started":
        handleFetchStarted(state, eventKey, event);
        break;
      case "fetch-completed":
        handleFetchCompleted(state, eventKey, event);
        break;
      case "fetch-error":
        handleFetchError(state, eventKey, event);
        break;
      case "fetch-cancelled":
        state.pendingFetches.delete(eventKey);
        state.recentCacheHits.delete(eventKey);
        state.recentDeduplicated.delete(eventKey);
        break;
      case "cache-hit":
        state.totalCacheHits++;
        state.recentCacheHits.add(eventKey);
        break;
      case "deduplicated":
        state.totalDedupSavings++;
        state.recentDeduplicated.add(eventKey);
        break;
      case "retry": {
        const pending = state.pendingFetches.get(eventKey);
        if (pending) {
          pending.retryAttempt = event.attempt;
        }
        break;
      }
      case "mutation-effect-applied":
        handleMutationEffectApplied(state, event);
        break;
      case "invalidated":
      case "observer-added":
      case "observer-removed":
      case "mutation-started":
      case "mutation-completed":
        break;
    }
  });
}
