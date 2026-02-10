/**
 * Thought Process panel - State Machine Inspector.
 *
 * Inspects active Flow state machines via the library inspector protocol.
 * Shows machine list, state diagram, valid transitions, and state history.
 * Falls back to demo data when no flow inspector is registered.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback } from "react";
import { useInspector } from "@hex-di/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MachineInfo {
  readonly id: string;
  readonly name: string;
  readonly currentState: string;
  readonly states: readonly string[];
  readonly transitions: readonly TransitionInfo[];
  readonly history: readonly HistoryEntry[];
}

interface TransitionInfo {
  readonly from: string;
  readonly to: string;
  readonly event: string;
}

interface HistoryEntry {
  readonly state: string;
  readonly timestamp: number;
  readonly event: string;
}

// ---------------------------------------------------------------------------
// Demo data (used when flow inspector is not available)
// ---------------------------------------------------------------------------

const DEMO_MACHINES: readonly MachineInfo[] = [
  {
    id: "battle-fsm",
    name: "Battle State Machine",
    currentState: "selecting-move",
    states: ["idle", "selecting-move", "animating", "waiting-opponent", "victory", "defeat"],
    transitions: [
      { from: "idle", to: "selecting-move", event: "START_BATTLE" },
      { from: "selecting-move", to: "animating", event: "CONFIRM_MOVE" },
      { from: "animating", to: "waiting-opponent", event: "ANIMATION_DONE" },
      { from: "waiting-opponent", to: "selecting-move", event: "OPPONENT_DONE" },
      { from: "waiting-opponent", to: "victory", event: "WIN" },
      { from: "waiting-opponent", to: "defeat", event: "LOSE" },
    ],
    history: [
      { state: "idle", timestamp: Date.now() - 30000, event: "(initial)" },
      { state: "selecting-move", timestamp: Date.now() - 25000, event: "START_BATTLE" },
      { state: "animating", timestamp: Date.now() - 20000, event: "CONFIRM_MOVE" },
      { state: "waiting-opponent", timestamp: Date.now() - 15000, event: "ANIMATION_DONE" },
      { state: "selecting-move", timestamp: Date.now() - 10000, event: "OPPONENT_DONE" },
    ],
  },
  {
    id: "evolution-fsm",
    name: "Evolution Lab Machine",
    currentState: "ready",
    states: ["ready", "evolving", "confirming", "complete", "cancelled"],
    transitions: [
      { from: "ready", to: "evolving", event: "START_EVOLUTION" },
      { from: "evolving", to: "confirming", event: "EVOLUTION_DONE" },
      { from: "confirming", to: "complete", event: "CONFIRM" },
      { from: "confirming", to: "cancelled", event: "CANCEL" },
      { from: "complete", to: "ready", event: "RESET" },
      { from: "cancelled", to: "ready", event: "RESET" },
    ],
    history: [{ state: "ready", timestamp: Date.now() - 60000, event: "(initial)" }],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type guard for record-shaped objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractMachinesFromSnapshot(
  snapshot: Readonly<Record<string, unknown>>
): readonly MachineInfo[] {
  // The flow library inspector would expose machines in its snapshot
  const machinesRaw = snapshot["machines"];
  if (!Array.isArray(machinesRaw)) return [];

  const machines: MachineInfo[] = [];
  for (const raw of machinesRaw) {
    if (!isRecord(raw)) continue;
    if (typeof raw["id"] !== "string" || typeof raw["name"] !== "string") continue;

    const id = raw["id"];
    const name = raw["name"];
    const currentState = typeof raw["currentState"] === "string" ? raw["currentState"] : "unknown";
    const statesRaw = Array.isArray(raw["states"]) ? raw["states"] : [];
    const states = statesRaw.filter((s): s is string => typeof s === "string");

    machines.push({
      id,
      name,
      currentState,
      states,
      transitions: [],
      history: [],
    });
  }
  return machines;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StateDiagramProps {
  readonly machine: MachineInfo;
}

function StateDiagram({ machine }: StateDiagramProps): ReactNode {
  const validTransitions = machine.transitions.filter(t => t.from === machine.currentState);

  return (
    <div className="space-y-4">
      {/* State nodes */}
      <div className="flex flex-wrap gap-3">
        {machine.states.map(state => {
          const isCurrent = state === machine.currentState;
          const isTarget = validTransitions.some(t => t.to === state);

          return (
            <div
              key={state}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                isCurrent
                  ? "border-pink-400 bg-pink-500/20 text-pink-300 ring-1 ring-pink-400/50"
                  : isTarget
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-gray-700 bg-gray-800/50 text-gray-400"
              }`}
            >
              <div className="font-mono">{state}</div>
              {isCurrent && <div className="mt-0.5 text-xs text-pink-400">current</div>}
            </div>
          );
        })}
      </div>

      {/* Valid transitions from current state */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-gray-500">
          Valid Transitions from "{machine.currentState}"
        </h4>
        {validTransitions.length > 0 ? (
          <div className="space-y-1">
            {validTransitions.map(t => (
              <div key={`${t.from}-${t.event}-${t.to}`} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-pink-400">{t.from}</span>
                <span className="text-gray-600">--</span>
                <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-amber-400">
                  {t.event}
                </span>
                <span className="text-gray-600">--&gt;</span>
                <span className="font-mono text-blue-400">{t.to}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">No transitions available (terminal state)</p>
        )}
      </div>
    </div>
  );
}

interface StateHistoryProps {
  readonly history: readonly HistoryEntry[];
}

function StateHistory({ history }: StateHistoryProps): ReactNode {
  if (history.length === 0) {
    return <p className="text-xs text-gray-600">No state history available</p>;
  }

  return (
    <div className="space-y-1">
      {[...history].reverse().map((entry, idx) => (
        <div
          key={`${entry.state}-${String(entry.timestamp)}-${String(idx)}`}
          className={`flex items-center gap-3 text-xs ${idx === 0 ? "text-white" : "text-gray-500"}`}
        >
          <span className="w-20 shrink-0 text-gray-600">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-amber-400">
            {entry.event}
          </span>
          <span className="text-gray-600">-&gt;</span>
          <span className={`font-mono ${idx === 0 ? "text-pink-400" : "text-gray-400"}`}>
            {entry.state}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function ThoughtProcess(): ReactNode {
  const inspector = useInspector();
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // Try to get flow library inspector
  const machines = useMemo((): readonly MachineInfo[] => {
    const flowInspector = inspector.getLibraryInspector("flow");
    if (flowInspector) {
      const snapshot = flowInspector.getSnapshot();
      const extracted = extractMachinesFromSnapshot(snapshot);
      if (extracted.length > 0) return extracted;
    }
    // Fall back to demo data
    return DEMO_MACHINES;
  }, [inspector]);

  const isDemo = useMemo(() => {
    const flowInspector = inspector.getLibraryInspector("flow");
    return !flowInspector;
  }, [inspector]);

  const selectedMachine =
    selectedMachineId !== null
      ? (machines.find(m => m.id === selectedMachineId) ?? null)
      : machines.length > 0
        ? (machines[0] ?? null)
        : null;

  const handleSelectMachine = useCallback((id: string) => {
    setSelectedMachineId(id);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 px-4 py-2 text-xs">
        <span className="text-gray-500">
          Machines: <span className="text-white">{String(machines.length)}</span>
        </span>
        {isDemo && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
            Demo Mode - Flow inspector not registered
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Machine list sidebar */}
        <div className="w-56 shrink-0 overflow-auto border-r border-gray-800">
          {machines.map(machine => {
            const isSelected = selectedMachine?.id === machine.id;
            return (
              <button
                key={machine.id}
                type="button"
                onClick={() => handleSelectMachine(machine.id)}
                className={`flex w-full flex-col gap-0.5 border-b border-gray-800/50 px-3 py-2 text-left transition-colors hover:bg-gray-800/50 ${
                  isSelected ? "border-l-2 border-l-pink-400 bg-gray-800/70" : ""
                }`}
              >
                <span className="text-sm font-medium text-white">{machine.name}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400" />
                  <span className="font-mono text-pink-400">{machine.currentState}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Machine detail */}
        <div className="flex-1 overflow-auto p-4">
          {selectedMachine !== null ? (
            <div className="space-y-6">
              {/* Machine header */}
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedMachine.name}</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Current state:{" "}
                  <span className="font-mono text-pink-400">{selectedMachine.currentState}</span>
                  {" | "}
                  {String(selectedMachine.states.length)} states
                  {" | "}
                  {String(selectedMachine.transitions.length)} transitions
                </p>
              </div>

              {/* State diagram */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  State Diagram
                </h4>
                <StateDiagram machine={selectedMachine} />
              </div>

              {/* State history timeline */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  State History
                </h4>
                <StateHistory history={selectedMachine.history} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-600">
              Select a machine from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ThoughtProcess };
