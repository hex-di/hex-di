/**
 * FlowStateInspector Component
 *
 * DevTools component for inspecting the current state of flow machines.
 *
 * Features:
 * - Display current machine state path
 * - Show context values
 * - List available transitions
 * - Event history timeline
 *
 * Matches wireframe: `planning/visuals/layout-wireframes.md` Section 8.4
 *
 * @packageDocumentation
 */

import { useState, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Event entry in the event history.
 */
export interface EventHistoryEntry {
  /** Timestamp when the event occurred */
  readonly timestamp: number;
  /** Event type name */
  readonly type: string;
  /** Event payload data */
  readonly payload: Record<string, unknown>;
}

/**
 * Props for the FlowStateInspector component.
 */
export interface FlowStateInspectorProps {
  /** Name of the state machine */
  readonly machineName: string;
  /** Current state path (e.g., "dashboard.taskList.idle") */
  readonly currentState: string;
  /** Machine context values */
  readonly context: Record<string, unknown>;
  /** List of available transitions from current state */
  readonly availableTransitions: readonly string[];
  /** Event history timeline */
  readonly eventHistory: readonly EventHistoryEntry[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a timestamp as HH:MM:SS.mmm
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Format context value for display
 */
function formatContextValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

// =============================================================================
// Icons
// =============================================================================

function ChevronDownIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CircleIcon({
  className = "w-2 h-2",
  color = "currentColor",
}: {
  readonly className?: string;
  readonly color?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 8 8" fill={color}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface CollapsibleSectionProps {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-3 py-2 bg-white">{children}</div>}
    </div>
  );
}

// =============================================================================
// FlowStateInspector Component
// =============================================================================

/**
 * Flow state inspector for DevTools integration.
 *
 * Displays comprehensive information about the current state machine:
 * - Machine name and current state path
 * - Context values with JSON formatting
 * - Available transitions list
 * - Event history timeline with timestamps
 *
 * @example
 * ```tsx
 * <FlowStateInspector
 *   machineName="navigationMachine"
 *   currentState="dashboard.taskList.idle"
 *   context={{ currentRoute: "/", user: { id: "123" } }}
 *   availableTransitions={["NAVIGATE_TO_TASK", "CREATE_TASK"]}
 *   eventHistory={[
 *     { timestamp: Date.now(), type: "LOADED", payload: {} }
 *   ]}
 * />
 * ```
 */
export function FlowStateInspector({
  machineName,
  currentState,
  context,
  availableTransitions,
  eventHistory,
}: FlowStateInspectorProps) {
  // Sort events by timestamp (most recent first)
  const sortedEvents = useMemo(
    () => [...eventHistory].sort((a, b) => b.timestamp - a.timestamp),
    [eventHistory]
  );

  // Parse state path for visual display
  const statePath = useMemo(() => currentState.split("."), [currentState]);

  return (
    <div className="space-y-4" data-testid="flow-state-inspector">
      {/* Header with machine name and current state */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <CircleIcon className="w-2 h-2" color="#22c55e" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Machine</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{machineName}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">Current:</span>
          <span className="font-mono text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
            {currentState}
          </span>
        </div>
      </div>

      {/* State Path Visualization */}
      <CollapsibleSection title="State Path">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {statePath.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon className="w-3 h-3 text-gray-400" />}
              <span
                className={`px-2 py-0.5 rounded ${
                  index === statePath.length - 1
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {segment}
              </span>
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {/* Context Values */}
      <CollapsibleSection title="Context">
        <div className="space-y-2">
          {Object.entries(context).length === 0 ? (
            <p className="text-sm text-gray-400 italic">No context values</p>
          ) : (
            Object.entries(context).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">{key}</span>
                <pre className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded overflow-x-auto max-h-20">
                  {formatContextValue(value)}
                </pre>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Available Transitions */}
      <CollapsibleSection title="Available Transitions">
        <div className="flex flex-wrap gap-2">
          {availableTransitions.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No available transitions</p>
          ) : (
            availableTransitions.map(transition => (
              <span
                key={transition}
                className="inline-flex items-center px-2 py-1 text-xs font-mono bg-green-50 text-green-700 border border-green-200 rounded"
              >
                {transition}
              </span>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Event History Timeline */}
      <CollapsibleSection title="Event History">
        <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="event-history-list">
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No events recorded</p>
          ) : (
            sortedEvents.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                data-testid={`event-item-${index}`}
                className="flex items-start gap-3 text-xs border-l-2 border-gray-200 pl-3 py-1"
              >
                <span className="font-mono text-gray-400 whitespace-nowrap">
                  {formatTimestamp(event.timestamp)}
                </span>
                <span className="font-medium text-gray-700">{event.type}</span>
                {Object.keys(event.payload).length > 0 && (
                  <span className="text-gray-500 truncate">{JSON.stringify(event.payload)}</span>
                )}
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
