/**
 * Synapse Activity panel - Trace Waterfall visualization.
 *
 * Displays a live waterfall of resolution events from the DI container.
 * Events are stored in a ring buffer and rendered as horizontal bars
 * proportional to their duration. Supports filtering and auto-scroll.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTracingSummary } from "@hex-di/react";
import { useBrainEvents } from "../BrainEventContext.js";
import type { ResolutionEvent } from "../BrainEventContext.js";
import { formatDuration, formatRelativeTime } from "../utils/relative-time.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "ok" | "error";

const VALID_STATUS_FILTERS = new Set<string>(["all", "ok", "error"]);

function isStatusFilter(value: string): value is StatusFilter {
  return VALID_STATUS_FILTERS.has(value);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_BAR_WIDTH_PX = 300;

function computeBarWidth(durationMs: number, maxDurationMs: number): number {
  if (maxDurationMs <= 0) return 20;
  return Math.max(8, Math.round((durationMs / maxDurationMs) * MAX_BAR_WIDTH_PX));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AggregateStatsProps {
  readonly totalSpans: number;
  readonly errorCount: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
}

function AggregateStats({
  totalSpans,
  errorCount,
  averageDuration,
  cacheHitRate,
}: AggregateStatsProps): ReactNode {
  return (
    <div className="flex items-center gap-6 text-xs">
      <span className="text-gray-500">
        Total Spans: <span className="text-white">{String(totalSpans)}</span>
      </span>
      <span className="text-gray-500">
        Errors: <span className="text-red-400">{String(errorCount)}</span>
      </span>
      <span className="text-gray-500">
        Avg Duration: <span className="text-white">{formatDuration(averageDuration)}</span>
      </span>
      <span className="text-gray-500">
        Cache Hit:{" "}
        <span className="text-emerald-400">{String(Math.round(cacheHitRate * 100))}%</span>
      </span>
    </div>
  );
}

interface EventRowProps {
  readonly event: ResolutionEvent;
  readonly maxDuration: number;
  readonly isSelected: boolean;
  readonly onSelect: (id: number) => void;
}

function EventRow({ event, maxDuration, isSelected, onSelect }: EventRowProps): ReactNode {
  const barWidth = computeBarWidth(event.duration, maxDuration);
  const isError = event.status === "error";
  const handleClick = useCallback(() => {
    onSelect(event.id);
  }, [onSelect, event.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-3 border-b border-gray-800/50 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-800/50 ${
        isSelected ? "bg-gray-800/70" : ""
      }`}
    >
      {/* Timestamp */}
      <span className="w-16 shrink-0 text-gray-600">{formatRelativeTime(event.timestamp)}</span>

      {/* Port name */}
      <span className={`w-40 shrink-0 truncate ${isError ? "text-red-400" : "text-white"}`}>
        {event.portName}
      </span>

      {/* Waterfall bar */}
      <div className="flex flex-1 items-center">
        <div
          className={`h-4 rounded-sm ${isError ? "bg-red-500/60" : "bg-blue-500/60"}`}
          style={{ width: `${String(barWidth)}px` }}
        />
      </div>

      {/* Duration */}
      <span className="w-16 shrink-0 text-right text-gray-400">
        {formatDuration(event.duration)}
      </span>

      {/* Cache indicator */}
      <span className="w-12 shrink-0 text-center">
        {event.isCacheHit ? (
          <span className="text-emerald-500">HIT</span>
        ) : (
          <span className="text-gray-600">MISS</span>
        )}
      </span>
    </button>
  );
}

interface EventDetailProps {
  readonly event: ResolutionEvent;
  readonly onClose: () => void;
}

function EventDetail({ event, onClose }: EventDetailProps): ReactNode {
  return (
    <div
      className="shrink-0 border-l border-gray-800 bg-gray-900/80 p-4"
      style={{ width: "260px" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Event Detail</h4>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
          x
        </button>
      </div>
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-gray-500">Port</span>
          <p className="text-white">{event.portName}</p>
        </div>
        <div>
          <span className="text-gray-500">Duration</span>
          <p className="text-white">{formatDuration(event.duration)}</p>
        </div>
        <div>
          <span className="text-gray-500">Status</span>
          <p className={event.status === "error" ? "text-red-400" : "text-emerald-400"}>
            {event.status === "error" ? "Error" : "OK"}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Cache Hit</span>
          <p className="text-white">{event.isCacheHit ? "Yes" : "No"}</p>
        </div>
        <div>
          <span className="text-gray-500">Timestamp</span>
          <p className="text-white">{new Date(event.timestamp).toISOString()}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function SynapseActivity(): ReactNode {
  const summary = useTracingSummary();
  const { recentResolutions } = useBrainEvents();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    let events = recentResolutions;

    if (nameFilter.length > 0) {
      const lower = nameFilter.toLowerCase();
      events = events.filter(e => e.portName.toLowerCase().includes(lower));
    }

    if (statusFilter !== "all") {
      events = events.filter(e => e.status === statusFilter);
    }

    return events;
  }, [recentResolutions, nameFilter, statusFilter]);

  // Compute max duration for bar scaling
  const maxDuration = useMemo(() => {
    let max = 1;
    for (const event of filteredEvents) {
      if (event.duration > max) {
        max = event.duration;
      }
    }
    return max;
  }, [filteredEvents]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, filteredEvents.length]);

  const selectedEvent =
    selectedId !== null ? (recentResolutions.find(e => e.id === selectedId) ?? null) : null;

  const handleNameFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNameFilter(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (isStatusFilter(val)) {
      setStatusFilter(val);
    }
  }, []);

  const handleToggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => !prev);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Controls bar */}
      <div className="flex items-center gap-4 border-b border-gray-800 px-4 py-2">
        {/* Aggregate stats */}
        {summary ? (
          <AggregateStats
            totalSpans={summary.totalSpans}
            errorCount={summary.errorCount}
            averageDuration={summary.averageDuration}
            cacheHitRate={summary.cacheHitRate}
          />
        ) : (
          <span className="text-xs text-gray-600">No tracing data</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Port name filter */}
          <input
            type="text"
            placeholder="Filter by port..."
            value={nameFilter}
            onChange={handleNameFilterChange}
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white placeholder-gray-600 focus:border-pink-500 focus:outline-none"
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white focus:border-pink-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="ok">OK</option>
            <option value="error">Error</option>
          </select>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={handleToggleAutoScroll}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              autoScroll
                ? "border-pink-500 bg-pink-500/20 text-pink-400"
                : "border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
          >
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Events list + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Waterfall list */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {/* Column headers */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-600">
            <span className="w-16 shrink-0">Time</span>
            <span className="w-40 shrink-0">Port</span>
            <span className="flex-1">Waterfall</span>
            <span className="w-16 shrink-0 text-right">Duration</span>
            <span className="w-12 shrink-0 text-center">Cache</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-600">
              {recentResolutions.length === 0
                ? "Waiting for resolution events..."
                : "No events match the current filters"}
            </div>
          ) : (
            filteredEvents.map(event => (
              <EventRow
                key={event.id}
                event={event}
                maxDuration={maxDuration}
                isSelected={selectedId === event.id}
                onSelect={setSelectedId}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedEvent !== null && (
          <EventDetail event={selectedEvent} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}

export { SynapseActivity };
