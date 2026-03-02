/**
 * EventLogPanel — real-time event stream with filtering.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { InspectorEvent } from "@hex-di/core";
import type { PanelProps } from "./types.js";
import { EmptyState } from "../components/empty-state.js";
import { SearchInput } from "../components/search-input.js";

/**
 * Internal event record with a sequence number.
 */
interface EventRecord {
  readonly seq: number;
  readonly timestamp: number;
  readonly event: InspectorEvent;
}

const MAX_EVENTS = 1000;

/**
 * Returns a display color for an event type.
 */
function getEventColor(type: string): string {
  if (type === "resolution") return "var(--hex-info)";
  if (type === "result:ok") return "var(--hex-success)";
  if (type === "result:err") return "var(--hex-error)";
  if (type === "library") return "var(--hex-accent)";
  if (type === "phase-changed") return "var(--hex-warning)";
  if (type === "scope-created" || type === "scope-disposed") return "var(--hex-lifetime-scoped)";
  return "var(--hex-text-secondary)";
}

/**
 * Returns a single-line summary for an event.
 */
function getEventSummary(event: InspectorEvent): string {
  switch (event.type) {
    case "resolution":
      return `${event.portName} (${event.duration.toFixed(1)}ms)${event.isCacheHit ? " [cache]" : ""}`;
    case "result:ok":
      return event.portName;
    case "result:err":
      return `${event.portName} - ${event.errorCode}`;
    case "snapshot-changed":
      return "Snapshot updated";
    case "scope-created":
      return event.scope.scopeId;
    case "scope-disposed":
      return event.scopeId;
    case "phase-changed":
      return event.phase;
    case "library":
      return `${event.event.source}: ${event.event.type}`;
    case "library-registered":
      return event.name;
    case "library-unregistered":
      return event.name;
    case "init-progress":
      return `${event.portName} (${event.current}/${event.total})`;
    case "child-created":
      return `${event.childId} (${event.childKind})`;
    case "child-disposed":
      return event.childId;
    case "result:recovered":
      return `${event.portName} recovered from ${event.fromCode}`;
    case "chain-registered":
      return event.chainId;
    case "execution-added":
      return `${event.chainId}/${event.executionId}`;
    case "guard-descriptor-registered":
      return event.descriptorId;
    case "guard-execution-added":
      return `${event.portName}/${event.executionId}`;
    case "guard-role-hierarchy-updated":
      return "Role hierarchy updated";
  }
}

interface EventRowProps {
  readonly record: EventRecord;
  readonly isEven: boolean;
}

function EventRow({ record, isEven }: EventRowProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const timeStr = new Date(record.timestamp).toLocaleTimeString();
  const color = getEventColor(record.event.type);
  const summary = getEventSummary(record.event);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-md)",
        padding: "var(--hex-space-xs) var(--hex-space-md)",
        borderBottom: "1px solid var(--hex-border)",
        borderLeft: `3px solid ${color}`,
        backgroundColor: isHovered
          ? "var(--hex-bg-hover)"
          : isEven
            ? "var(--hex-bg-secondary)"
            : "transparent",
        transition: "background-color var(--hex-transition-fast)",
        minHeight: "28px",
      }}
    >
      <span
        style={{
          color: "var(--hex-text-muted)",
          width: "72px",
          flexShrink: 0,
          fontSize: "var(--hex-font-size-xs)",
          fontFamily: "var(--hex-font-mono)",
        }}
      >
        {timeStr}
      </span>
      <span
        style={{
          color,
          width: "130px",
          flexShrink: 0,
          fontSize: "var(--hex-font-size-xs)",
          fontWeight: "var(--hex-font-weight-medium)",
        }}
      >
        {record.event.type}
      </span>
      <span
        style={{
          color: "var(--hex-text-primary)",
          flex: 1,
          fontSize: "var(--hex-font-size-sm)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {summary}
      </span>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
}: {
  readonly onClick: () => void;
  readonly label: string;
}): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "var(--hex-space-xs) var(--hex-space-md)",
        border: "1px solid var(--hex-border)",
        borderRadius: "var(--hex-radius-md)",
        backgroundColor: isHovered ? "var(--hex-bg-hover)" : "var(--hex-bg-secondary)",
        color: "var(--hex-text-primary)",
        cursor: "pointer",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
        fontWeight: "var(--hex-font-weight-medium)",
        transition: "background-color var(--hex-transition-fast)",
      }}
    >
      {label}
    </button>
  );
}

/**
 * EventLogPanel displays a real-time feed of inspector events.
 */
function EventLogPanel({ dataSource }: PanelProps): React.ReactElement {
  const [events, setEvents] = useState<readonly EventRecord[]>([]);
  const [filter, setFilter] = useState("");
  const seqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    return dataSource.subscribe(event => {
      seqRef.current += 1;
      const record: EventRecord = {
        seq: seqRef.current,
        timestamp: Date.now(),
        event,
      };

      setEvents(prev => {
        const next = [...prev, record];
        if (next.length > MAX_EVENTS) {
          return next.slice(next.length - MAX_EVENTS);
        }
        return next;
      });

      // Auto-scroll
      if (autoScrollRef.current && containerRef.current) {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        });
      }
    });
  }, [dataSource]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    autoScrollRef.current = atBottom;
  }, []);

  const filteredEvents = filter
    ? events.filter(record => {
        const summary = getEventSummary(record.event);
        return (
          record.event.type.toLowerCase().includes(filter.toLowerCase()) ||
          summary.toLowerCase().includes(filter.toLowerCase())
        );
      })
    : events;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={"\uD83D\uDCE1"}
        message="No events yet"
        description="Events will appear as your code runs. Resolution, scope, and error events are captured here."
      />
    );
  }

  return (
    <div
      data-testid="event-log-panel"
      role="region"
      aria-label="Event Log Panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "var(--hex-space-sm) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          backgroundColor: "var(--hex-bg-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "var(--hex-space-sm)",
        }}
      >
        <div style={{ flex: 1 }}>
          <SearchInput placeholder="Filter events..." onChange={setFilter} />
        </div>
        <span
          style={{
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
            fontFamily: "var(--hex-font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          {filteredEvents.length}
          {filter ? ` / ${events.length}` : ""}
          {" events"}
        </span>
        <ToolbarButton onClick={() => setEvents([])} label="Clear" />
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        style={{
          flex: 1,
          overflow: "auto",
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-xs)",
        }}
      >
        {filteredEvents.map((record, index) => (
          <EventRow key={record.seq} record={record} isEven={index % 2 === 0} />
        ))}
      </div>
    </div>
  );
}

export { EventLogPanel };
